import { logFileManager } from "@/logFileManager";
import { FileCache } from "@/cache/fileCache";
import { logError } from "@/logger";
import {
  clearRecordedPromptPayload,
  flushRecordedPromptPayloadToLog,
} from "@/LLMProviders/chainRunner/utils/promptPayloadRecorder";

import { CustomCommandSettingsModal } from "@/commands/CustomCommandSettingsModal";
import { EMPTY_COMMAND } from "@/commands/constants";
import { CustomCommandManager } from "@/commands/customCommandManager";
import { getCachedCustomCommands } from "@/commands/state";
import { CustomCommand } from "@/commands/type";
import {
  QUICK_COMMAND_SYSTEM_PROMPT,
  appendIncludeNoteContextPlaceholders,
} from "@/commands/quickCommandPrompts";
import { CustomCommandChatModal } from "@/commands/CustomCommandChatModal";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { ApplyCustomCommandModal } from "@/components/modals/ApplyCustomCommandModal";
import { YoutubeTranscriptModal } from "@/components/modals/YoutubeTranscriptModal";
import { checkIsPaidUser } from "@/plusUtils";
// Debug modals removed with search v3
import type CopilotPlugin from "@/main";
import { getSearchBackend } from "@/miyo/miyoUtils";
import { getAllQAMarkdownContent } from "@/search/searchUtils";
import { NoteSelectedTextContext, WebSelectedTextContext } from "@/types/message";
import { ensureFolderExists, isSourceModeOn } from "@/utils";
import { getEffectiveCopilotFolder } from "@/settings/copilotFolder";
import { isDesktopRuntime } from "@/utils/desktopRuntime";
import { Editor, MarkdownView, Notice, TFile } from "obsidian";
import { v4 as uuidv4 } from "uuid";
import { COMMAND_IDS, COMMAND_ICONS, COMMAND_NAMES, CommandId } from "@/constants";
import { setSelectedTextContexts } from "@/aiParams";

type PublishFile = (file: TFile) => void;

/**
 * Add a command to the plugin. Supports async callbacks; errors are logged.
 */
function addCommand(plugin: CopilotPlugin, id: CommandId, callback: () => void | Promise<void>) {
  plugin.addCommand({
    id,
    name: COMMAND_NAMES[id],
    icon: COMMAND_ICONS[id],
    callback: () => {
      const result = callback();
      if (result instanceof Promise) {
        result.catch((err) => logError(`Command ${id} failed`, err));
      }
    },
  });
}

/**
 * Add an editor command to the plugin. Supports async callbacks; errors are logged.
 */
function addEditorCommand(
  plugin: CopilotPlugin,
  id: CommandId,
  callback: (editor: Editor) => void | Promise<void>
) {
  plugin.addCommand({
    id,
    name: COMMAND_NAMES[id],
    icon: COMMAND_ICONS[id],
    editorCallback: (editor) => {
      const result = callback(editor);
      if (result instanceof Promise) {
        result.catch((err) => logError(`Editor command ${id} failed`, err));
      }
    },
  });
}

/**
 * Add a check command to the plugin.
 */
function addCheckCommand(
  plugin: CopilotPlugin,
  id: CommandId,
  callback: (checking: boolean) => boolean | void
) {
  plugin.addCommand({
    id,
    name: COMMAND_NAMES[id],
    icon: COMMAND_ICONS[id],
    checkCallback: callback,
  });
}

export function registerCommands(plugin: CopilotPlugin, publish: PublishFile) {
  addCheckCommand(plugin, COMMAND_IDS.PUBLISH_FILE_TO_SYMPOSIUM, (checking) => {
    const activeFile = plugin.app.workspace.getActiveFile();
    if (!(activeFile instanceof TFile) || activeFile.extension !== "md") {
      return false;
    }

    if (!checking) {
      publish(activeFile);
    }
    return true;
  });

  addEditorCommand(plugin, COMMAND_IDS.COUNT_WORD_AND_TOKENS_SELECTION, async (editor: Editor) => {
    const selectedText = editor.getSelection();
    const wordCount = selectedText.split(" ").length;
    const tokenCount = await plugin.chainOwner
      .getCurrentChainManager()
      .chatModelManager.countTokens(selectedText);
    new Notice(`所选文本包含 ${wordCount} 个单词和 ${tokenCount} 个 Token。`);
  });

  addCommand(plugin, COMMAND_IDS.COUNT_TOTAL_VAULT_TOKENS, async () => {
    try {
      const allContent = await getAllQAMarkdownContent(plugin.app);
      const totalTokens = await plugin.chainOwner
        .getCurrentChainManager()
        .chatModelManager.countTokens(allContent);
      new Notice(`仓库中的 Token 总数：${totalTokens}`);
    } catch (error) {
      logError("Error counting tokens: ", error);
      new Notice("计算 Token 时发生错误。");
    }
  });

  addCommand(plugin, COMMAND_IDS.TOGGLE_COPILOT_CHAT_WINDOW, () => {
    plugin.toggleView();
  });

  addCommand(plugin, COMMAND_IDS.OPEN_COPILOT_CHAT_WINDOW, async () => {
    await plugin.activateView();
  });

  addCommand(plugin, COMMAND_IDS.OPEN_RELEVANT_NOTES_VIEW, async () => {
    await plugin.activateRelevantNotesView();
  });

  addCommand(plugin, COMMAND_IDS.NEW_CHAT, async () => {
    clearRecordedPromptPayload();
    await plugin.newChat();
  });

  // Agent Mode is always on, but requires subprocess support — register the
  // agent commands only where the Node runtime exists (real desktop, not
  // `emulateMobile`, where importing Agent Mode would crash).
  if (isDesktopRuntime()) {
    addCommand(plugin, COMMAND_IDS.OPEN_AGENT_CHAT_WINDOW, () => {
      void plugin.activateAgentView();
    });
    addCommand(plugin, COMMAND_IDS.TOGGLE_AGENT_CHAT_WINDOW, () => {
      void plugin.toggleAgentView();
    });
    addCommand(plugin, COMMAND_IDS.NEW_AGENT_CHAT, () => {
      void plugin.newAgentChat();
    });
  }

  // Quick Command - opens a modal dialog for quick interactions
  // Note: For inline floating panel experience, use Quick Ask instead
  addCheckCommand(plugin, COMMAND_IDS.TRIGGER_QUICK_COMMAND, (checking: boolean) => {
    const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);

    if (checking) {
      // Return true only if we're not in source mode
      return !!(!isSourceModeOn(plugin.app) && activeView && activeView.editor);
    }

    // Need to check this again because it can still be triggered via shortcut.
    if (isSourceModeOn(plugin.app)) {
      new Notice("快捷命令在源码模式下不可用。");
      return false;
    }

    // When not checking, execute the command
    if (!activeView || !activeView.editor) {
      new Notice("未找到活动的编辑器。");
      return false;
    }

    const editor = activeView.editor;
    const selectedText = editor.getSelection();

    if (!selectedText.trim()) {
      new Notice("请先选择一些文本。快捷命令需要所选文本。");
      return false;
    }

    // Directly open the Modal
    const quickCommand: CustomCommand = {
      title: "快捷命令",
      content: "", // Empty content, wait for user input
      showInContextMenu: false,
      showInSlashMenu: false,
      order: 0,
      modelKey: "", // Empty = inherit from quickCommandModelKey
      lastUsedMs: Date.now(),
    };

    const modal = new CustomCommandChatModal(plugin.app, {
      selectedText,
      command: quickCommand,
      systemPrompt: QUICK_COMMAND_SYSTEM_PROMPT,
      behaviorConfig: {
        autoExecuteOnOpen: false,
        hideContentAreaOnIdle: true,
        commandLabel: "快捷命令",
        commandIcon: null, // No icon for Quick Command
        showIncludeNoteContext: true, // Show the Note checkbox
        modelSelectionScope: "quick-command", // Persist model changes to quickCommandModelKey
        firstSubmitTransform: (input, includeNoteContext) =>
          appendIncludeNoteContextPlaceholders(input, includeNoteContext),
      },
    });
    modal.open();

    return true;
  });

  addCommand(plugin, COMMAND_IDS.CLEAR_LOCAL_COPILOT_INDEX, async () => {
    const { getSettings } = await import("@/settings/model");
    const settings = getSettings();
    const isMiyoEnabled = getSearchBackend(settings) === "miyo";
    if (isMiyoEnabled) {
      new Notice(
        "Miyo 文件夹由 Miyo 管理。如需清空，请在 Miyo 中移除该文件夹。"
      );
      return;
    }
    const clearMessage =
      "这将永久删除 Copilot 中的所有文档索引，此操作无法撤销。\n\n确定要继续吗？";
    const confirmed = await new Promise<boolean>((resolve) => {
      new ConfirmModal(
        plugin.app,
        () => resolve(true),
        clearMessage,
        "清空语义索引",
        "清空索引",
        "取消",
        () => resolve(false)
      ).open();
    });
    if (!confirmed) return;
    try {
      const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
      await VectorStoreManager.getInstance().clearIndex();
      new Notice("已清空本地 Copilot 语义索引。");
    } catch (err) {
      logError("Error clearing semantic index:", err);
      new Notice("清空语义索引失败。");
    }
  });

  addCommand(plugin, COMMAND_IDS.GARBAGE_COLLECT_COPILOT_INDEX, async () => {
    try {
      const { getSettings } = await import("@/settings/model");
      if (getSearchBackend(getSettings()) === "miyo") {
        new Notice(
          "Miyo 会自动管理文件清理。如有需要，可运行“索引（刷新）仓库”以触发扫描。"
        );
        return;
      }
      const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
      const removedCount = await VectorStoreManager.getInstance().garbageCollectVectorStore();
      new Notice(`垃圾回收完成。已移除 ${removedCount} 个过期文档。`);
    } catch (err) {
      logError("Error during garbage collection:", err);
      new Notice("语义索引垃圾回收失败。");
    }
  });

  // Removed legacy build-only command; use refresh and force reindex commands instead

  addCommand(plugin, COMMAND_IDS.INDEX_VAULT_TO_COPILOT_INDEX, async () => {
    try {
      const { getSettings } = await import("@/settings/model");
      const settings = getSettings();

      if (settings.enableSemanticSearchV3) {
        // Use VectorStoreManager for semantic search indexing
        const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
        const count = await VectorStoreManager.getInstance().indexVaultToVectorStore(false, {
          userInitiated: true,
        });
        if (getSearchBackend(settings) === "miyo") {
          new Notice("Miyo 文件夹索引刷新已启动。打开 Miyo 应用查看详情。");
        } else {
          new Notice(`语义搜索索引已刷新，共 ${count} 个文档。`);
        }
      } else {
        // V3 search builds indexes on demand
        new Notice("词法搜索按需构建索引，无需手动索引。");
      }
    } catch (err) {
      logError("Error building index:", err);
      new Notice("构建索引时发生错误。");
    }
  });

  addCommand(plugin, COMMAND_IDS.FORCE_REINDEX_VAULT_TO_COPILOT_INDEX, async () => {
    const confirmed = await new Promise<boolean>((resolve) => {
      new ConfirmModal(
        plugin.app,
        () => resolve(true),
        "这将从零开始删除并重建整个仓库索引。此操作无法撤销。确定要继续吗？",
        "强制重建仓库索引",
        "继续",
        "取消",
        () => resolve(false)
      ).open();
    });
    if (!confirmed) return;
    try {
      const { getSettings } = await import("@/settings/model");
      const settings = getSettings();

      if (settings.enableSemanticSearchV3) {
        // Use VectorStoreManager for semantic search indexing
        const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
        const count = await VectorStoreManager.getInstance().indexVaultToVectorStore(true, {
          userInitiated: true,
        });
        if (getSearchBackend(settings) === "miyo") {
          new Notice("Miyo 文件夹索引刷新已启动。打开 Miyo 应用查看详情。");
        } else {
          new Notice(`语义搜索索引已重建，共 ${count} 个文档。`);
        }
      } else {
        // V3 search builds indexes on demand
        new Notice("词法搜索按需构建索引，无需手动索引。");
      }
    } catch (err) {
      logError("Error rebuilding index:", err);
      new Notice("重建索引时发生错误。");
    }
  });

  addCommand(plugin, COMMAND_IDS.LOAD_COPILOT_CHAT_CONVERSATION, async () => {
    await plugin.loadCopilotChatHistory();
  });

  addCommand(plugin, COMMAND_IDS.LIST_INDEXED_FILES, async () => {
    try {
      const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
      const indexedPaths = await VectorStoreManager.getInstance().getIndexedFiles();

      // Get all markdown files from vault
      const { getMatchingPatterns, shouldIndexFile } = await import("@/search/searchUtils");
      const { inclusions, exclusions } = getMatchingPatterns();
      const allMarkdownFiles = plugin.app.vault.getMarkdownFiles();
      const emptyFiles = new Set<string>();
      const unindexedFiles = new Set<string>();
      const excludedFiles = new Set<string>();

      const indexedFiles = new Set<string>(indexedPaths);

      // Categorize files
      for (const file of allMarkdownFiles) {
        // Check if file should be indexed based on settings
        if (!shouldIndexFile(plugin.app, file, inclusions, exclusions)) {
          excludedFiles.add(file.path);
          continue;
        }

        const content = await plugin.app.vault.cachedRead(file);
        if (!content || content.trim().length === 0) {
          emptyFiles.add(file.path);
        } else if (!indexedFiles.has(file.path)) {
          unindexedFiles.add(file.path);
        }
      }

      // Create content for the file
      const content = [
        "# Copilot 文件状态",
        `- 已索引文件：${indexedFiles.size}`,
        `- 未索引文件：${unindexedFiles.size}`,
        `- 空文件：${emptyFiles.size}`,
        `- 已排除文件：${excludedFiles.size}`,
        "",
        "## 已索引文件",
        ...(indexedFiles.size > 0
          ? Array.from(indexedFiles)
              .sort()
              .map((file) => `- [[${file}]]`)
          : ["未找到已索引文件。"]),
        "",
        "## 未索引文件",
        ...(unindexedFiles.size > 0
          ? Array.from(unindexedFiles)
              .sort()
              .map((file) => `- [[${file}]]`)
          : ["未找到未索引文件。"]),
        "",
        "## 空文件",
        ...(emptyFiles.size > 0
          ? Array.from(emptyFiles)
              .sort()
              .map((file) => `- [[${file}]]`)
          : ["未找到空文件。"]),
        "",
        "## 已排除文件（基于设置）",
        ...(excludedFiles.size > 0
          ? Array.from(excludedFiles)
              .sort()
              .map((file) => `- [[${file}]]`)
          : ["没有已排除的文件。"]),
      ].join("\n");

      // Create or update the file in the vault
      const fileName = `Copilot-Indexed-Files-${new Date().toLocaleDateString().replace(/\//g, "-")}.md`;
      const folderPath = getEffectiveCopilotFolder();
      const filePath = `${folderPath}/${fileName}`;

      // Ensure destination folder exists (supports mobile and nested)
      await ensureFolderExists(plugin.app.vault, folderPath);

      const existingFile = plugin.app.vault.getAbstractFileByPath(filePath);
      if (existingFile instanceof TFile) {
        await plugin.app.vault.modify(existingFile, content);
      } else {
        await plugin.app.vault.create(filePath, content);
      }

      // Open the file
      const file = plugin.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        await plugin.app.workspace.getLeaf().openFile(file);
        new Notice(`已列出 ${indexedFiles.size} 个已索引文件`);
      }
    } catch (error) {
      logError("Error listing indexed files:", error);
      new Notice("列出已索引文件失败。");
    }
  });

  addCommand(plugin, COMMAND_IDS.INSPECT_COPILOT_INDEX_BY_NOTE_PATHS, async () => {
    try {
      const activeFile = plugin.app.workspace.getActiveFile();
      if (!activeFile) {
        new Notice("没有活动文件。请先打开一个笔记。");
        return;
      }

      const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
      const { DBOperations } = await import("@/search/dbOperations");
      const db = await VectorStoreManager.getInstance().getDb();
      const hits = await DBOperations.getDocsByPath(db, activeFile.path);

      if (!hits || hits.length === 0) {
        new Notice(`未找到嵌入数据：${activeFile.path}`);
        return;
      }

      // Map hits to chunks (getDocsByPath returns {document, score} format)
      const chunks: Record<string, unknown>[] = hits.map(
        (hit) => hit.document as unknown as Record<string, unknown>
      );
      const content = [
        `# 嵌入调试：${activeFile.basename}`,
        "",
        `**路径：**${activeFile.path}`,
        `**分块数：**${chunks.length}`,
        `**嵌入模型：**${(chunks[0]?.embeddingModel as string | undefined) || "未知"}`,
        "",
        ...chunks.flatMap((chunk: Record<string, unknown>, index: number) => {
          const embedding = (chunk.embedding as number[] | undefined) || [];
          const preview = embedding
            .slice(0, 10)
            .map((v: number) => v.toFixed(6))
            .join(", ");
          return [
            `## 分块 ${index + 1}`,
            `- **ID：**${chunk.id as string}`,
            `- **内容预览：**"${((chunk.content as string | undefined) || "").substring(0, 200)}..."`,
            `- **向量长度：**${embedding.length}`,
            `- **向量预览：**[${preview}${embedding.length > 10 ? ", ..." : ""}]`,
            `- **标签：**${((chunk.tags as string[] | undefined) || []).join(", ") || "无"}`,
            `- **字符数：**${(chunk.nchars as number | undefined) || 0}`,
            "",
          ];
        }),
      ].join("\n");

      // Create the debug file
      const fileName = `Copilot-Embedding-Debug-${activeFile.basename.replace(/[\\/:*?"<>|]/g, "_")}.md`;
      const folderPath = getEffectiveCopilotFolder();
      const filePath = `${folderPath}/${fileName}`;

      await ensureFolderExists(plugin.app.vault, folderPath);

      const existingFile = plugin.app.vault.getAbstractFileByPath(filePath);
      if (existingFile instanceof TFile) {
        await plugin.app.vault.modify(existingFile, content);
      } else {
        await plugin.app.vault.create(filePath, content);
      }

      const file = plugin.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        await plugin.app.workspace.getLeaf().openFile(file);
        new Notice(`已生成 ${chunks.length} 个分块的嵌入调试信息`);
      }
    } catch (error) {
      logError("Error inspecting embeddings:", error);
      new Notice("检查嵌入数据失败。索引是否已加载？");
    }
  });

  // Add clear Copilot cache command
  addCommand(plugin, COMMAND_IDS.CLEAR_COPILOT_CACHE, async () => {
    try {
      await plugin.fileParserManager.clearPDFCache(plugin.app.vault);

      // Clear file content cache (get FileCache instance and clear it)
      const fileCache = FileCache.getInstance<string>();
      await fileCache.clear(plugin.app.vault);

      // Clear the off-vault shared conversion cache (Agent Mode snapshots +
      // markers). Desktop-gated + dynamic import so node:fs / conversionsLocation
      // never load on mobile (this command module is registered on all platforms).
      // clear() is root-confined to `context-cache/` — it never ascends to the
      // parent `vaults/<id>/`, so `agent-chat-index.json` is untouched.
      if (isDesktopRuntime()) {
        const { cacheRoot } = await import("@/context/conversionsLocation");
        const { createNodeContextCacheFs } = await import("@/context/contextCacheFs");
        await createNodeContextCacheFs(cacheRoot(plugin.app)).clear();
      }

      new Notice("已成功清空所有 Copilot 缓存");
    } catch (error) {
      logError("Error clearing Copilot caches:", error);
      new Notice("清空 Copilot 缓存失败");
    }
  });

  // Create Copilot log file
  addCommand(plugin, COMMAND_IDS.OPEN_LOG_FILE, async () => {
    try {
      await flushRecordedPromptPayloadToLog();
      await logFileManager.openLogFile();
    } catch (error) {
      logError("Error creating Copilot log file:", error);
      new Notice("创建 Copilot 日志文件失败。");
    }
  });

  // Clear Copilot log file (delete on disk and clear in-memory buffer)
  addCommand(plugin, COMMAND_IDS.CLEAR_LOG_FILE, async () => {
    try {
      await logFileManager.clear();
      new Notice("Copilot 日志已清空。");
    } catch (error) {
      logError("Error clearing Copilot log file:", error);
      new Notice("清空 Copilot 日志文件失败。");
    }
  });

  // Add selection to chat context command (manual)
  addEditorCommand(plugin, COMMAND_IDS.ADD_SELECTION_TO_CHAT_CONTEXT, async (editor: Editor) => {
    const selectedText = editor.getSelection();
    if (!selectedText) {
      new Notice("未选择文本");
      return;
    }

    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("没有活动文件");
      return;
    }

    // Get selection range to determine line numbers
    const selectionRange = editor.listSelections()[0];
    if (!selectionRange) {
      new Notice("无法确定选择范围");
      return;
    }

    const startLine = selectionRange.anchor.line + 1; // Convert to 1-based line numbers
    const endLine = selectionRange.head.line + 1;

    // Create selected text context
    const selectedTextContext: NoteSelectedTextContext = {
      id: uuidv4(),
      content: selectedText,
      sourceType: "note",
      noteTitle: activeFile.basename,
      notePath: activeFile.path,
      startLine: Math.min(startLine, endLine),
      endLine: Math.max(startLine, endLine),
    };

    // Mutually exclusive: only keep the latest selection
    setSelectedTextContexts([selectedTextContext]);

    // Open chat window to show the context was added
    await plugin.activateChatViewForContext();
  });

  // Add web selection to chat context command (manual)
  addCommand(plugin, COMMAND_IDS.ADD_WEB_SELECTION_TO_CHAT_CONTEXT, async () => {
    if (!isDesktopRuntime()) {
      new Notice("网页选择仅在桌面端可用");
      return;
    }

    const { getWebViewerService } =
      await import("@/services/webViewerService/webViewerServiceSingleton");

    try {
      const service = getWebViewerService(plugin.app);
      const leaf = service.getActiveLeaf() ?? service.getLastActiveLeaf();

      if (!leaf) {
        new Notice("未找到活动的 Web 标签页");
        return;
      }

      const selectedMarkdown = await service.getSelectedMarkdown(leaf);
      if (!selectedMarkdown.trim()) {
        new Notice("Web 标签页中未选择文本");
        return;
      }

      const pageInfo = service.getPageInfo(leaf);

      // Create web selected text context
      const webSelectedTextContext: WebSelectedTextContext = {
        id: uuidv4(),
        content: selectedMarkdown,
        sourceType: "web",
        title: pageInfo.title || "无标题",
        url: pageInfo.url,
        faviconUrl: pageInfo.faviconUrl || undefined,
      };

      // Mutually exclusive: only keep the latest selection
      setSelectedTextContexts([webSelectedTextContext]);

      // Open chat window to show the context was added
      await plugin.activateChatViewForContext();
    } catch (error) {
      logError("Error adding web selection to context:", error);
      new Notice("获取网页选择失败");
    }
  });

  // Add command to create a new custom command
  addCommand(plugin, COMMAND_IDS.ADD_CUSTOM_COMMAND, async () => {
    const commands = getCachedCustomCommands();
    const newCommand = { ...EMPTY_COMMAND };
    const modal = new CustomCommandSettingsModal(
      plugin.app,
      commands,
      newCommand,
      async (updatedCommand) => {
        await CustomCommandManager.getInstance().createCommand(updatedCommand);
      }
    );
    modal.open();
  });

  // Add command to apply a custom command
  addCommand(plugin, COMMAND_IDS.APPLY_CUSTOM_COMMAND, () => {
    const modal = new ApplyCustomCommandModal(plugin.app);
    modal.open();
  });

  // Add command to download YouTube script (Copilot Plus only)
  addCommand(plugin, COMMAND_IDS.DOWNLOAD_YOUTUBE_SCRIPT, async () => {
    const isPaidUser = await checkIsPaidUser(plugin.app, { trigger: "tool_call" });
    if (!isPaidUser) {
      new Notice("下载 YouTube 脚本（plus）是 Copilot Plus 的功能");
      return;
    }

    const modal = new YoutubeTranscriptModal(plugin.app);
    modal.open();
  });

  // Add Quick Ask command (recommended shortcut: cmd/ctrl+K)
  // Quick Ask is the floating panel that appears near the selection in the editor
  addCheckCommand(plugin, COMMAND_IDS.TRIGGER_QUICK_ASK, (checking: boolean) => {
    const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);

    if (checking) {
      // Return true only if we're not in source mode and have an active editor
      return !!(!isSourceModeOn(plugin.app) && activeView && activeView.editor);
    }

    // Need to check this again because it can still be triggered via shortcut
    if (isSourceModeOn(plugin.app)) {
      new Notice("快速询问在源码模式下不可用。");
      return false;
    }

    if (!activeView || !activeView.editor) {
      new Notice("未找到活动的编辑器。");
      return false;
    }

    // Get the CM6 EditorView from the Obsidian editor
    const view = activeView.editor.cm;
    if (!view) {
      new Notice("无法访问 CodeMirror 编辑器。");
      return false;
    }

    // Show the Quick Ask panel (pass activeView for leaf binding)
    plugin.quickAskController.show(activeView, view);
    return true;
  });
}

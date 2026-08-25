import { logWarn } from "@/logger";
import { App, Notice, TFolder } from "obsidian";

/**
 * Reveal a vault-root-relative folder in Obsidian's built-in File Explorer.
 *
 * Surfaces a Notice instead of failing silently when the folder isn't in the
 * vault cache yet (e.g. it hasn't been created — Copilot creates its folders
 * lazily on first write) or the File Explorer core plugin is disabled.
 *
 * @param app - Active Obsidian app, threaded in rather than read from global.
 * @param relPath - Vault-root-relative folder path to reveal.
 */
export function revealFolderInExplorer(app: App, relPath: string): void {
  const folder = app.vault.getAbstractFileByPath(relPath);
  if (!(folder instanceof TFolder)) {
    new Notice(`文件夹 "${relPath}" 尚不存在——首次使用时才会创建。`, 5000);
    return;
  }
  const fileExplorer = (
    app as unknown as {
      internalPlugins?: {
        getPluginById?: (
          id: string
        ) =>
          | { enabled?: boolean; instance?: { revealInFolder?: (folder: TFolder) => void } }
          | undefined;
      };
    }
  ).internalPlugins?.getPluginById?.("file-explorer");
  if (fileExplorer?.enabled && fileExplorer.instance?.revealInFolder) {
    fileExplorer.instance.revealInFolder(folder);
    return;
  }
  logWarn("[settings] File Explorer plugin unavailable; cannot reveal folder.");
  new Notice("文件资源管理器未启用，无法显示该文件夹。", 5000);
}

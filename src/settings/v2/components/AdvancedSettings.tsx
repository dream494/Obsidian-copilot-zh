import { CHAT_AGENT_VIEWTYPE } from "@/constants";
import { Button } from "@/components/ui/button";
import { SettingItem } from "@/components/ui/setting-item";
import { SettingSection } from "@/components/ui/setting-section";
import { LegacyChatPromptsNotice } from "@/settings/v2/components/LegacyChatPromptsNotice";
import {
  confirmLegacyVaultIndexToggle,
  LegacyVaultIndexSetting,
} from "@/settings/v2/components/LegacyVaultIndexSetting";
import { useApp } from "@/context";
import { logFileManager } from "@/logFileManager";
import { flushRecordedPromptPayloadToLog } from "@/LLMProviders/chainRunner/utils/promptPayloadRecorder";
import { getCopilotSaveData } from "@/settings/copilotSaveData";
import { KeychainService } from "@/services/keychainService";
import {
  refreshLastPersistedSettings,
  releaseLegacyCredentialHold,
  runPersistenceTransaction,
  suppressNextPersistOnce,
} from "@/services/settingsPersistence";
import { hasPersistedSecrets } from "@/services/settingsSecretTransforms";
import { logError } from "@/logger";
import {
  type CopilotSettings,
  setSettings,
  updateSetting,
  useSettingsValue,
} from "@/settings/model";
import { Info, ShieldCheck, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { Notice } from "obsidian";
import React, { useCallback, useEffect, useState } from "react";
import { isDesktopRuntime } from "@/utils/desktopRuntime";
import { safeAsyncHandler } from "@/utils/safeAsyncHandler";

const DESKTOP_UNAVAILABLE_FRAME_LOG_PATH = "(Agent 模式帧日志仅桌面端可用)";

export const AdvancedSettings: React.FC = () => {
  const app = useApp();
  const settings = useSettingsValue();
  const [forgetting, setForgetting] = useState(false);
  const [frameLogPath, setFrameLogPath] = useState(DESKTOP_UNAVAILABLE_FRAME_LOG_PATH);

  useEffect(() => {
    if (!isDesktopRuntime()) return;

    let cancelled = false;
    void import("@/agentMode").then(({ acpFrameSink }) => {
      if (!cancelled) {
        setFrameLogPath(acpFrameSink.getPath());
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const keychainAvailable = KeychainService.getInstance().isAvailable();
  const keychainAppearsEmpty = keychainAvailable && !hasPersistedSecrets(settings);

  const handleReportIssue = useCallback(() => {
    // Gate before importing the agentMode barrel: on mobile the barrel pulls in
    // Node-only modules that throw during evaluation, so the desktop check must
    // happen first (mirrors the frame-log buttons below).
    if (!isDesktopRuntime()) {
      new Notice("仅桌面端支持报告问题。");
      return;
    }
    void (async () => {
      const { ReportIssueModal } = await import("@/agentMode");
      const copilotPlugin = (
        app as unknown as {
          plugins: {
            getPlugin: (id: string) => {
              manifest?: { version?: string };
              agentSessionManager?: { getActiveSession?: () => { backendId?: string } | null };
            } | null;
          };
        }
      ).plugins.getPlugin("copilot");
      // Prefer the active session's backend: switching Agent Mode tabs changes
      // the active session without touching the persisted default backend, so
      // settings.agentMode.activeBackend can name the wrong pane.
      const activeBackend =
        copilotPlugin?.agentSessionManager?.getActiveSession?.()?.backendId ??
        settings.agentMode.activeBackend;
      new ReportIssueModal({
        app,
        activeBackend,
        pluginVersion: copilotPlugin?.manifest?.version ?? "unknown",
        // Resolve at capture time so we can close this Settings window and
        // reveal the agent pane first — the screenshot should be the chat
        // surface, not the settings dialog. Null when no agent pane is open.
        resolveCaptureTarget: () => {
          (app as unknown as { setting: { close: () => void } }).setting.close();
          const leaf = app.workspace.getLeavesOfType(CHAT_AGENT_VIEWTYPE)[0];
          if (!leaf) return null;
          app.workspace.revealLeaf(leaf);
          const view = leaf.view as unknown as {
            contentEl?: HTMLElement;
            containerEl?: HTMLElement;
          };
          return view.contentEl ?? view.containerEl ?? null;
        },
      }).open();
    })();
  }, [app, settings.agentMode.activeBackend]);

  const handleForgetAllSecrets = useCallback(async () => {
    if (forgetting) return;

    // Reason: double-confirm destructive action via project ConfirmModal
    const confirmed = await new Promise<boolean>((resolve) => {
      new ConfirmModal(
        app,
        () => resolve(true),
        "此操作将从 Obsidian Keychain、data.json 和记忆中移除该仓库的所有 API 密钥。" +
          "你需要重新输入它们。v4 升级期间写入的任何凭据备份文件会保留在原处 —— 不再需要时请自行删除。",
        "\u26A0\uFE0F 忘记所有密钥",
        "移除",
        "取消",
        () => resolve(false)
      ).open();
    });
    if (!confirmed) return;

    setForgetting(true);
    try {
      const keychain = KeychainService.getInstance();
      const saveData = getCopilotSaveData(app);

      // Reason: run inside the persistence queue to prevent interleaving
      // with normal saves that could restore old secrets.
      await runPersistenceTransaction(() =>
        keychain.forgetAllSecrets(
          // Reason: this write strips data.json outside the normal save path,
          // so once it resolves any pre-v4 credentials it was holding back are
          // gone and ordinary saves can resume. Tied to the write itself, not
          // to how the transaction settles, because only the write knows.
          async (data) => {
            await saveData(data);
            releaseLegacyCredentialHold();
          },
          (nextSettings) => {
            refreshLastPersistedSettings(nextSettings as CopilotSettings);
            suppressNextPersistOnce();
            setSettings(nextSettings);
          }
        )
      );
    } catch (error) {
      logError("Failed to forget secrets.", error);
      new Notice("移除 API 密钥失败，请重试。");
    } finally {
      setForgetting(false);
    }
  }, [app, forgetting]);

  return (
    <div className="tw-space-y-4">
      <LegacyChatPromptsNotice />

      {/* Others Section */}
      <SettingSection label="其他">
        <SettingItem
          type="custom"
          title="API 密钥存储"
          description={
            !keychainAvailable ? (
              <>
                将 Obsidian 更新到 <code>1.11.4+</code> 以使用{" "}
                <strong className="tw-font-semibold tw-text-normal">Obsidian Keychain</strong>。
                此版本无法加载或保存密钥。
              </>
            ) : keychainAppearsEmpty ? (
              <span className="tw-text-warning">
                未在此设备的{" "}
                <strong className="tw-font-semibold tw-text-normal">Obsidian Keychain</strong> 中找到
                API 密钥。请在相应的设置区域重新输入 API 密钥 —— 每台设备都有独立的 Keychain。
              </span>
            ) : (
              <>
                API 密钥存储在此设备的{" "}
                <strong className="tw-font-semibold tw-text-normal">Obsidian Keychain</strong> 中。
              </>
            )
          }
        >
          <div className="tw-flex tw-flex-col tw-items-start tw-gap-2 sm:tw-items-end">
            {keychainAvailable ? (
              <div className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-md tw-bg-success tw-px-3 tw-py-1 tw-text-smallest tw-font-semibold tw-text-success">
                <ShieldCheck className="tw-size-4" />
                Obsidian Keychain
              </div>
            ) : (
              <div className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-md tw-border tw-border-border tw-bg-secondary tw-px-3 tw-py-1 tw-text-smallest tw-font-semibold tw-text-muted">
                <Info className="tw-size-4" />
                不可用
              </div>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={safeAsyncHandler(handleForgetAllSecrets)}
              disabled={forgetting || !keychainAvailable}
              title={
                keychainAvailable
                  ? undefined
                  : "将 Obsidian 更新到 1.11.4+ 以删除 Keychain 条目。"
              }
              className="tw-gap-1.5"
            >
              <Trash2 className="tw-size-4" />
              {forgetting ? "正在移除..." : "删除所有密钥"}
            </Button>
          </div>
        </SettingItem>

        {/* The switch this restores (https://github.com/logancyang/obsidian-copilot-preview/issues/319)
            is refused while Miyo owns the setting, because clearing it under a connected Miyo leaves
            retrieval pointed at an index backend that can no longer refresh.

            That refusal keys off the persisted `enableMiyo` intent rather than `shouldUseMiyo`,
            which folds in `Platform.isMobile`. Miyo needs an explicit server URL on mobile, so a
            phone syncing a desktop-configured vault would read "not Miyo", offer the switch, and
            Sync the cleared flag back to that desktop. */}
        <LegacyVaultIndexSetting
          enabled={settings.enableSemanticSearchV3}
          miyoManaged={settings.enableMiyo}
          onToggle={(next) => confirmLegacyVaultIndexToggle(app, next)}
        />

        <SettingItem
          type="switch"
          title="调试模式"
          description="将 Copilot 对话活动记录到开发者控制台（视图 → 切换开发者工具）。用于排查普通对话 —— Agent 模式有自己单独的日志，见下方。"
          checked={settings.debug}
          onCheckedChange={(checked) => updateSetting("debug", checked)}
        />

        <SettingItem
          type="custom"
          title="创建日志文件"
          description={`保存并打开常规 Copilot 对话日志（${logFileManager.getLogPath()}），以便在报告对话问题时分享。Agent 模式问题请使用 Agent 面板中的"报告问题"按钮处理。`}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void (async () => {
                await flushRecordedPromptPayloadToLog();
                await logFileManager.flush();
                await logFileManager.openLogFile();
              })();
            }}
          >
            创建日志文件
          </Button>
        </SettingItem>
      </SettingSection>

      {/* Agent Mode debugging Section */}
      <SettingSection
        label="Agent 模式调试"
        description="用于诊断 Agent 模式问题的工具，与上方常规 Copilot 对话日志分开。"
      >
        <SettingItem
          type="custom"
          title="报告问题"
          description="将 Agent 模式对话面板的截图和最近的活动日志打包到一个文件夹中，然后打开一个已预填的 GitHub issue，方便你附加这些内容。"
        >
          <Button variant="secondary" size="sm" onClick={handleReportIssue}>
            报告问题
          </Button>
        </SettingItem>

        <SettingItem
          type="switch"
          title="保留 Agent 模式活动日志"
          description="记录 Copilot 与 Agent 之间的后台消息，以便「报告问题」按钮始终有最近的活动可供附加。仅存储在此设备上，位于你的仓库之外，可能以纯文本形式包含你的提示词和笔记内容。默认开启；关闭可停止记录。"
          checked={settings.agentMode.debugFullFrames}
          onCheckedChange={(checked) => {
            setSettings((cur) => ({
              agentMode: { ...cur.agentMode, debugFullFrames: checked },
            }));
          }}
        />

        <SettingItem
          type="custom"
          title="Agent 模式活动日志文件"
          description={`打开或清空磁盘上的日志文件（${frameLogPath}）。`}
        >
          <div className="tw-flex tw-gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={safeAsyncHandler(async () => {
                if (!isDesktopRuntime()) {
                  new Notice("Agent 模式帧日志仅桌面端可用。");
                  return;
                }
                try {
                  const { acpFrameSink } = await import("@/agentMode");
                  await acpFrameSink.open();
                  setFrameLogPath(acpFrameSink.getPath());
                } catch {
                  new Notice("打开 Agent 模式帧日志失败。");
                }
              })}
            >
              打开
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={safeAsyncHandler(async () => {
                if (!isDesktopRuntime()) {
                  new Notice("Agent 模式帧日志仅桌面端可用。");
                  return;
                }
                try {
                  const { acpFrameSink } = await import("@/agentMode");
                  await acpFrameSink.clear();
                  setFrameLogPath(acpFrameSink.getPath());
                  new Notice("Agent 模式帧日志已清空。");
                } catch {
                  new Notice("清空 Agent 模式帧日志失败。");
                }
              })}
            >
              清空
            </Button>
          </div>
        </SettingItem>
      </SettingSection>
    </div>
  );
};

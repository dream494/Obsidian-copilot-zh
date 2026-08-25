import {
  CODEX_AUTH_COMMAND,
  CODEX_BINARY_NAME,
  CODEX_INSTALL_COMMAND,
  codexBinaryPathPlaceholder,
} from "@/agentMode/backends/codex/cliSetup";
import { BinaryPathSetting } from "@/agentMode/backends/shared/BinaryPathSetting";
import { ConfigDialogShell, ConfigSection } from "@/agentMode/backends/shared/ui/ConfigDialogShell";
import { CommandBlock, SetupStep } from "@/agentMode/backends/shared/ui/SetupSteps";
import type { InstallState } from "@/agentMode/session/types";
import React from "react";

export interface CodexConfigViewProps {
  /** Readiness of the configured adapter; drives the header badge and the warning strip. */
  state: InstallState;
  /** Persisted path to the ACP adapter; empty when none is configured. */
  binaryPath: string;
  /** Validate and persist a user-supplied path. Resolves to an error message, or null on success. */
  onSavePath: (path: string) => Promise<string | null>;
  /** Forget the configured path. */
  onClearPath: () => void;
  /** Look for a `codex-acp` adapter already present on this machine. */
  detect: () => Promise<string | null>;
  /** Directories `detect` looked in, listed when it finds nothing. */
  searchedDirs: () => string[];
  onClose: () => void;
}

/**
 * Configure dialog body for the Codex backend, structured like Claude's: the
 * adapter path leads, installing and signing in follow as a numbered block.
 * Codex exposes no sign-in capability, so its second step is the command alone —
 * `codex login` is the only way in.
 *
 * Pure props, so the gallery and unit tests can drive every state;
 * `CodexInstallModal` supplies the settings reads, validation, and notices.
 */
export const CodexConfigView: React.FC<CodexConfigViewProps> = ({
  state,
  binaryPath,
  onSavePath,
  onClearPath,
  detect,
  searchedDirs,
  onClose,
}) => (
  <ConfigDialogShell title="配置 Codex" state={state} onClose={onClose}>
    <ConfigSection title="codex-acp 二进制文件">
      <p className="tw-my-0 tw-text-sm tw-text-muted">
        Copilot 会在本机启动 <code>{CODEX_BINARY_NAME}</code> 适配器。自动检测会检查常规安装位置和你的 PATH。
      </p>
      <BinaryPathSetting
        binaryName={CODEX_BINARY_NAME}
        placeholder={codexBinaryPathPlaceholder(process.platform)}
        initialPath={binaryPath}
        notFoundHint={`在已知安装位置或 PATH 中未找到 ${CODEX_BINARY_NAME}。请运行下方的安装命令，然后再次点击自动检测。`}
        onSave={onSavePath}
        onClear={onClearPath}
        persistOnAutoDetect
        detect={detect}
        searchedDirs={searchedDirs}
      />
    </ConfigSection>

    <ConfigSection title="还没有安装？">
      {/* The section's own gap sets the rhythm inside a step, so the steps need a
          wider one to read as two items rather than one run of controls. */}
      <div className="tw-flex tw-flex-col tw-gap-4">
        <SetupStep index={1} title="安装">
          <CommandBlock command={CODEX_INSTALL_COMMAND} />
        </SetupStep>
        <SetupStep index={2} title="登录">
          <CommandBlock command={CODEX_AUTH_COMMAND} />
          <p className="tw-my-0 tw-text-sm tw-text-muted">
            Copilot 会继承 Codex CLI 持有的凭据 — 这里无需粘贴任何密钥。
          </p>
        </SetupStep>
      </div>
    </ConfigSection>
  </ConfigDialogShell>
);

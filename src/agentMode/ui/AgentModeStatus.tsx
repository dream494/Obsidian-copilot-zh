import { AgentStatusCard } from "@/agentMode/ui/AgentStatusCard";
import { useBackendAuthState } from "@/agentMode/session/useBackendAuthState";
import {
  useBackendInstallState,
  useSessionBackendDescriptor,
} from "@/agentMode/ui/useBackendDescriptor";
import { AgentSessionManager } from "@/agentMode/session/AgentSessionManager";
import { logError } from "@/logger";
import type CopilotPlugin from "@/main";
import { Notice } from "obsidian";
import React from "react";

interface Props {
  /** Plugin's AgentSessionManager. May be undefined on mobile. */
  manager?: AgentSessionManager;
  /** The plugin — needed to drive the install/upgrade actions. */
  plugin: CopilotPlugin;
  /** Click handler for the "Install …" CTA when the backend isn't installed. */
  onInstallClick: () => void;
}

/**
 * Leads users from Agent Mode failures to the relevant recovery action without adding noise to healthy sessions.
 * @param manager - The session manager that exposes startup failures and retry behavior.
 * @param plugin - The plugin instance needed to run backend recovery actions.
 * @param onInstallClick - The action to start setup when the selected backend is absent.
 */
export const AgentModeStatus: React.FC<Props> = ({ manager, plugin, onInstallClick }) => {
  const descriptor = useSessionBackendDescriptor(manager);
  const installState = useBackendInstallState(descriptor, plugin);
  const auth = useBackendAuthState(descriptor);
  const [upgrading, setUpgrading] = React.useState(false);

  // Re-render on manager notify so `lastError` flips are picked up.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!manager) return;
    return manager.subscribe(() => setTick((v) => v + 1));
  }, [manager]);

  const handleUpgrade = React.useCallback(() => {
    if (!descriptor.upgrade || upgrading) return;
    setUpgrading(true);
    new Notice(`正在升级 ${descriptor.displayName}…`);
    descriptor
      .upgrade(plugin)
      .then(() => new Notice(`${descriptor.displayName} 已升级。`))
      .catch((e) => {
        logError("[AgentMode] upgrade failed", e);
        new Notice(`升级 ${descriptor.displayName} 失败。请查看控制台了解详情。`);
      })
      .finally(() => setUpgrading(false));
  }, [descriptor, plugin, upgrading]);

  if (installState.kind === "absent") {
    return (
      <AgentStatusCard
        message={`${descriptor.displayName} 未安装`}
        action={{ label: `安装 ${descriptor.displayName}`, onClick: onInstallClick }}
      />
    );
  }

  if (installState.kind === "checking") {
    return <AgentStatusCard message={`正在检查 ${descriptor.displayName} 版本…`} />;
  }

  if (installState.kind === "incompatible") {
    const canUpgrade = descriptor.upgrade !== undefined;
    return (
      <AgentStatusCard
        tone="warning"
        message={installState.message}
        action={{
          label: canUpgrade
            ? upgrading
              ? "正在升级…"
              : "升级"
            : `配置 ${descriptor.displayName}`,
          disabled: canUpgrade && upgrading,
          onClick: canUpgrade ? handleUpgrade : () => descriptor.openInstallUI(plugin),
        }}
      />
    );
  }

  if (installState.kind === "error") {
    return (
      <AgentStatusCard
        tone="error"
        message={installState.message}
        action={{
          label: `配置 ${descriptor.displayName}`,
          onClick: () => descriptor.openInstallUI(plugin),
        }}
      />
    );
  }

  // Installed but the CLI isn't signed in: surface a recoverable Sign-in CTA
  // instead of letting a sent chat fail silently. While signing in, the CLI
  // opens the browser itself; we show its printed URL as a clickable fallback.
  if (descriptor.auth && auth.status && !auth.status.signedIn) {
    return (
      <AgentStatusCard
        message={
          auth.signingIn
            ? `正在登录 ${descriptor.displayName}…`
            : `${descriptor.displayName} 未登录`
        }
        action={
          auth.signingIn
            ? auth.url
              ? { label: "打开登录页面", href: auth.url }
              : undefined
            : { label: `登录 ${descriptor.displayName}`, onClick: auth.signIn }
        }
      />
    );
  }

  if (!manager) {
    return null;
  }

  const bootError = manager.getLastError();
  if (!bootError) {
    return null;
  }

  const handleRetry = (): void => {
    manager.getOrCreateActiveSession().catch((e) => {
      logError("[AgentMode] retry failed", e);
    });
  };

  return (
    <AgentStatusCard
      tone="error"
      message={bootError}
      action={{ label: "重试", onClick: handleRetry }}
    />
  );
};

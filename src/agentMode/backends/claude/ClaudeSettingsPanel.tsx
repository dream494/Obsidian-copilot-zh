import { EnvOverridesSetting } from "@/agentMode/backends/shared/EnvOverridesSetting";
import { ClaudeAutoModePermissionSetting } from "@/agentMode/backends/claude/ui/ClaudeAutoModePermissionSetting";
import { SettingItem } from "@/components/ui/setting-item";
import type CopilotPlugin from "@/main";
import { useSettingsValue } from "@/settings/model";
import type { App } from "obsidian";
import React from "react";
import { resolveClaudeAutoModePermission, updateClaudeFields } from "./descriptor";

interface Props {
  plugin: CopilotPlugin;
  app: App;
}

/**
 * Claude card extras. CLI detection / path / auth configuration lives in the
 * Configure dialog (`ClaudeInstallModal`, opened via
 * `descriptor.openInstallUI`); this panel hosts the model-behavior toggle and
 * spawn-time environment overrides that remain on the settings card.
 */
export const ClaudeSettingsPanel: React.FC<Props> = () => {
  const settings = useSettingsValue();
  return (
    <>
      <ClaudeAutoModePermissionSetting
        value={resolveClaudeAutoModePermission(settings)}
        onChange={(autoModePermission) => updateClaudeFields({ autoModePermission })}
      />

      <SettingItem
        type="switch"
        title="显示扩展思考"
        description="在一轮中流式输出模型的推理内容。会增加 Token 用量。"
        checked={Boolean(settings.agentMode?.backends?.claude?.enableThinking)}
        onCheckedChange={(checked) => updateClaudeFields({ enableThinking: checked })}
      />

      <EnvOverridesSetting
        backendDisplayName="Claude"
        value={settings.agentMode?.backends?.claude?.envOverrides}
        onChange={(next) => updateClaudeFields({ envOverrides: next })}
        hintExamples={["CLAUDE_CONFIG_DIR", "HTTPS_PROXY"]}
      />
    </>
  );
};

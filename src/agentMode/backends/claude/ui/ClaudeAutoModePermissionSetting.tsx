import { SettingItem } from "@/components/ui/setting-item";
import type { ClaudeAutoModePermission } from "@/settings/model";
import React from "react";

const AUTO_MODE_OPTIONS: { label: string; value: ClaudeAutoModePermission }[] = [
  { label: "自动", value: "auto" },
  { label: "接受编辑", value: "acceptEdits" },
  { label: "绕过权限", value: "bypassPermissions" },
];

export interface ClaudeAutoModePermissionSettingProps {
  value: ClaudeAutoModePermission;
  onChange: (value: ClaudeAutoModePermission) => void;
}

/** Presentational settings row for choosing what Claude's canonical Auto mode permits. */
export const ClaudeAutoModePermissionSetting: React.FC<ClaudeAutoModePermissionSettingProps> = ({
  value,
  onChange,
}) => (
  <SettingItem
    type="select"
    title="自动模式权限"
    description="自动模式让 Claude 自行判断每个请求，仍会对有风险的操作提问；接受编辑仅自动批准文件编辑；绕过权限则跳过所有检查。"
    value={value}
    options={AUTO_MODE_OPTIONS}
    onChange={(next) => onChange(next as ClaudeAutoModePermission)}
  />
);

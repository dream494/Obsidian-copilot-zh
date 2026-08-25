import { SemanticSearchToggleModal } from "@/components/modals/SemanticSearchToggleModal";
import { SettingItem } from "@/components/ui/setting-item";
import { updateSetting } from "@/settings/model";
import { App } from "obsidian";
import React from "react";

const DESCRIPTION =
  "在你未使用 Miyo 时，为语义搜索提供支持的内置嵌入索引。关闭它会停止所有索引并回退到关键词搜索；磁盘上已有的索引会保留，但不再被读取或更新。";

const MIYO_MANAGED_DESCRIPTION =
  "Miyo 正在处理语义搜索，因此内置索引未被使用，也没有内容可索引。请从 Miyo 标签页断开连接以返回关键词搜索。";

export interface LegacyVaultIndexSettingProps {
  /** Whether the built-in index is on, which is what makes vault indexing run. */
  enabled: boolean;
  /** Whether Miyo has taken over semantic search, leaving this index idle and not the user's to set. */
  miyoManaged: boolean;
  onToggle: (next: boolean) => void;
}

/**
 * Exposes the on/off control for the built-in vault index, the single gate every legacy
 * indexing path checks. Presentational only — confirming and applying the change belongs
 * to its host.
 */
export const LegacyVaultIndexSetting: React.FC<LegacyVaultIndexSettingProps> = ({
  enabled,
  miyoManaged,
  onToggle,
}) => (
  <SettingItem
    type="switch"
    title="旧版仓库索引"
    description={miyoManaged ? MIYO_MANAGED_DESCRIPTION : DESCRIPTION}
    checked={enabled}
    disabled={miyoManaged}
    onCheckedChange={onToggle}
  />
);

/**
 * Confirm a change to the built-in vault index with the user, then apply it.
 *
 * @param app - Obsidian app the confirmation modal is opened against.
 * @param next - The state the user asked for: true to enable, false to disable.
 */
export function confirmLegacyVaultIndexToggle(app: App, next: boolean): void {
  // Writing the setting is the whole action: a run already in flight re-reads it between batches
  // and stops itself, reporting cancelled on the progress card.
  new SemanticSearchToggleModal(
    app,
    () => updateSetting("enableSemanticSearchV3", next),
    next
  ).open();
}

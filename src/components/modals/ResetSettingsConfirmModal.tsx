import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { App } from "obsidian";

export class ResetSettingsConfirmModal extends ConfirmModal {
  constructor(app: App, onConfirm: () => void | Promise<void>) {
    super(
      app,
      onConfirm,
      // Reason: "clear all settings" was true only while reset also destroyed
      // credentials. Now that keys and the rows addressing them survive, the
      // claim is dropped rather than replaced with a list of what resets —
      // reset fans out through settings subscribers (Copilot Plus, Agent Mode
      // setup, per-agent model enrollment), so any such list goes stale.
      "重置设置将恢复默认值。此操作不会清除 API 密钥——" +
        "如果你也想删除它们，请在高级设置 " +
        "→ API 密钥存储中使用“删除所有密钥”。你确定要继续吗？",
      "重置设置"
    );
  }
}

import { App } from "obsidian";
import { ConfirmModal } from "./ConfirmModal";

export class RebuildIndexConfirmModal extends ConfirmModal {
  constructor(app: App, onConfirm: () => void | Promise<void>) {
    super(
      app,
      onConfirm,
      "更改此设置意味着你需要为整个仓库重建索引，是否继续？",
      "重建索引"
    );
  }
}

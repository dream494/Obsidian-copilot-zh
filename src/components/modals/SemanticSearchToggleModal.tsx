import { App } from "obsidian";
import { ConfirmModal } from "./ConfirmModal";

export class SemanticSearchToggleModal extends ConfirmModal {
  constructor(app: App, onConfirm: () => void | Promise<void>, enabling: boolean) {
    const content = enabling
      ? "语义搜索需要为你的仓库构建嵌入索引。\n\n启用后，请使用“刷新仓库索引”或“强制重建仓库索引”命令来构建索引。"
      : "禁用语义搜索后将回退到无需索引的词法搜索（资源占用更少，但可能不够准确）。\n\n你现有的索引将被保留但不再使用。";

    const title = enabling ? "启用语义搜索" : "禁用语义搜索";
    const confirmButtonText = enabling ? "启用" : "禁用";

    super(app, onConfirm, content, title, confirmButtonText, "取消");
  }
}

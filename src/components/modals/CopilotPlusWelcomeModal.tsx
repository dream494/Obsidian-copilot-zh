import React from "react";
import { App, Modal } from "obsidian";
import { Root } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { createPluginRoot } from "@/utils/react/createPluginRoot";
import { logError } from "@/logger";
import { DEFAULT_COPILOT_PLUS_CHAT_MODEL, applyLicenseSettings } from "@/plusUtils";

export interface CopilotPlusWelcomeModalContentProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/** Body of {@link CopilotPlusWelcomeModal}, exported prop-driven so the gallery can render it. */
export function CopilotPlusWelcomeModalContent({
  onConfirm,
  onCancel,
}: CopilotPlusWelcomeModalContentProps) {
  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <div>
        <p>
          感谢购买！你的许可证包含 Copilot 专属模型、跨智能体技能、对 <a href="https://symposium.md">symposium.md</a> 文档分享服务的访问权限，以及更多功能！
        </p>
        <p>
          你希望现在将 <b className="tw-text-accent">{DEFAULT_COPILOT_PLUS_CHAT_MODEL}</b>{" "}
          设为对话和智能体的默认模型吗？之后你随时可以在设置中更改。
        </p>
      </div>
      <div className="tw-flex tw-w-full tw-justify-end tw-gap-2">
        <Button variant="ghost" onClick={onCancel}>
          稍后应用
        </Button>
        <Button variant="default" onClick={onConfirm}>
          立即应用
        </Button>
      </div>
    </div>
  );
}

export class CopilotPlusWelcomeModal extends Modal {
  private root: Root;

  constructor(app: App) {
    super(app);
    // https://docs.obsidian.md/Reference/TypeScript+API/Modal/setTitle
    // @ts-ignore
    this.setTitle("欢迎使用 Copilot 🚀");
  }

  onOpen() {
    const { contentEl } = this;
    this.root = createPluginRoot(contentEl, this.app);

    const handleConfirm = () => {
      void applyLicenseSettings().catch((error) =>
        logError("Failed to apply the licensed default model", error)
      );
      this.close();
    };

    const handleCancel = () => {
      this.close();
    };

    this.root.render(
      <CopilotPlusWelcomeModalContent onConfirm={handleConfirm} onCancel={handleCancel} />
    );
  }

  onClose() {
    this.root.unmount();
  }
}

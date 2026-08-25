import React from "react";
import { App, Modal } from "obsidian";
import { Root } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { isUsingLicensedModels, navigateToPlusPage } from "@/plusUtils";
import { PLUS_UTM_MEDIUMS } from "@/constants";
import { ExternalLink } from "lucide-react";
import { getSettings } from "@/settings/model";
import { createPluginRoot } from "@/utils/react/createPluginRoot";

export interface CopilotPlusExpiredModalContentProps {
  onCancel: () => void;
  /** Whether to warn that Copilot models are about to stop working. */
  isUsingPlusModels: boolean;
}

/** Body of {@link CopilotPlusExpiredModal}, exported prop-driven so the gallery can render both states. */
export function CopilotPlusExpiredModalContent({
  onCancel,
  isUsingPlusModels,
}: CopilotPlusExpiredModalContentProps) {
  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <div className="tw-flex tw-flex-col tw-gap-2">
        <div>
          你的 Copilot Plus 许可证密钥已失效。请续订订阅以继续使用 Copilot Plus。
        </div>
        {isUsingPlusModels && (
          <div className="tw-text-sm tw-text-warning">
            Copilot Plus 专属模型将停止工作。你可以在设置中切换到默认模型。
          </div>
        )}
      </div>
      <div className="tw-flex tw-w-full tw-justify-end tw-gap-2">
        <Button variant="ghost" onClick={onCancel}>
          关闭
        </Button>
        <Button
          variant="default"
          onClick={() => {
            navigateToPlusPage(PLUS_UTM_MEDIUMS.EXPIRED_MODAL);
          }}
        >
          立即续订 <ExternalLink className="tw-size-4" />
        </Button>
      </div>
    </div>
  );
}

export class CopilotPlusExpiredModal extends Modal {
  private root: Root;

  constructor(app: App) {
    super(app);
    // https://docs.obsidian.md/Reference/TypeScript+API/Modal/setTitle
    // @ts-ignore
    this.setTitle("感谢你成为 Copilot Plus 用户 👋");
  }

  onOpen() {
    const { contentEl } = this;
    this.root = createPluginRoot(contentEl, this.app);

    const handleCancel = () => {
      this.close();
    };

    this.root.render(
      <CopilotPlusExpiredModalContent
        onCancel={handleCancel}
        isUsingPlusModels={isUsingLicensedModels(getSettings())}
      />
    );
  }

  onClose() {
    this.root.unmount();
  }
}

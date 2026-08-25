import { Button } from "@/components/ui/button";
import { InstructionsTextarea } from "@/instructions/InstructionsTextarea";
import { ArrowUpRight } from "lucide-react";
import React from "react";

export interface VaultInstructionsSettingProps {
  value: string;
  onChange: (next: string) => void;
  onOpen: () => void;
}

/**
 * Presents vault-wide agent instructions while leaving vault file operations to its host.
 */
export const VaultInstructionsSetting: React.FC<VaultInstructionsSettingProps> = ({
  value,
  onChange,
  onOpen,
}) => (
  <div className="tw-flex tw-w-full tw-flex-col tw-gap-4 tw-py-4">
    <div className="tw-grid tw-w-full tw-grid-cols-[minmax(0,1fr)_auto] tw-items-center tw-gap-4">
      <div className="tw-space-y-1.5">
        <div className="tw-text-sm tw-font-medium tw-leading-none">自定义仓库指令</div>
        <div className="tw-text-xs tw-text-muted">
          你希望智能体在每次与仓库交互时遵守的自定义指令。保存到仓库根目录的
          AGENTS.md 中，你也可以将其作为笔记编辑。
        </div>
      </div>
      <Button variant="secondary" onClick={onOpen}>
        <ArrowUpRight className="tw-size-4" />
        打开 AGENTS.md
      </Button>
    </div>
    <InstructionsTextarea label="自定义仓库指令" value={value} onChange={onChange} />
  </div>
);

import { Button } from "@/components/ui/button";
import { SettingSwitch } from "@/components/ui/setting-switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import React from "react";

export interface CorsCompatibilitySettingProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const CORS_COMPATIBILITY_TOOLTIP =
  "部分 Quick Chat 模型需要 CORS 兼容才能连接。启用后，响应会在生成完成后才显示，而不是逐字流式输出。";

/**
 * Lets a user choose whether Quick Chat prioritizes cross-origin compatibility
 * or streaming for a provider endpoint.
 */
export const CorsCompatibilitySetting: React.FC<CorsCompatibilitySettingProps> = ({
  checked,
  onCheckedChange,
}) => (
  <div className="tw-flex tw-items-center tw-justify-between tw-gap-4">
    <div className="tw-inline-flex tw-items-center tw-gap-1">
      <span className="tw-text-sm tw-font-medium tw-text-normal">启用 CORS</span>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="关于 Quick Chat 的 CORS 兼容性"
              className="tw-size-6 tw-p-0 tw-text-muted hover:tw-bg-transparent hover:tw-text-normal"
            >
              <Info className="tw-size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="tw-w-72">
            {CORS_COMPATIBILITY_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <SettingSwitch checked={checked} onCheckedChange={onCheckedChange} aria-label="启用 CORS" />
  </div>
);

import React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CopilotMode } from "@/agentMode";
import { cn } from "@/lib/utils";

export interface ModePickerOverride {
  options: { label: string; value: CopilotMode }[];
  value: CopilotMode | null;
  onChange: (value: CopilotMode) => void;
  disabled?: boolean;
}

interface ModePickerProps {
  override: ModePickerOverride;
  className?: string;
}

/**
 * Display copy keyed by canonical `CopilotMode`.
 */
const MODE_DISPLAY: Record<CopilotMode, { label: string; description: string }> = {
  auto: {
    label: "自动",
    description: "使用智能体的自动权限进行工具操作和编辑。",
  },
  plan: {
    label: "计划",
    description: "先起草计划，经你批准后再进行编辑。",
  },
  default: {
    label: "安全",
    description: "每次编辑前都会请求批准。",
  },
};

/**
 * Canonical display label for a mode. Single source of truth so every surface
 * that names a mode (currently this picker's trigger) shows the same copy for a
 * given `CopilotMode` — falls back to the raw value for any unmapped mode.
 */
export function getModeLabel(value: CopilotMode): string {
  return MODE_DISPLAY[value]?.label ?? value;
}

export function ModePicker({ override, className }: ModePickerProps) {
  const { options, value, onChange, disabled } = override;
  const triggerLabel = value ? getModeLabel(value) : "模式";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost2"
          size="sm"
          disabled={disabled}
          className={cn(
            "tw-shrink-0 tw-text-muted",
            value === "plan" &&
              "tw-text-blue/70 hover:tw-text-blue/100 focus-visible:tw-text-blue/100",
            value === "auto" &&
              "tw-text-red/70 hover:tw-text-red/100 focus-visible:tw-text-red/100",
            className
          )}
          title="操作模式"
        >
          <span className="tw-truncate">{triggerLabel}</span>
          {!disabled && <ChevronDown className="tw-mt-0.5 tw-size-4 tw-shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="tw-w-[320px]">
        {options.map((opt) => {
          const display = MODE_DISPLAY[opt.value];
          const isActive = value === opt.value;
          return (
            <DropdownMenuItem
              key={opt.value}
              onSelect={() => onChange(opt.value)}
              className="tw-items-start tw-gap-2 tw-py-2"
            >
              <div className="tw-mt-0.5 tw-w-3 tw-shrink-0">
                {isActive && <Check className="tw-size-3 tw-text-muted" />}
              </div>
              <div className="tw-flex tw-flex-col tw-gap-0.5">
                <span className="tw-text-sm tw-font-medium tw-text-normal">
                  {display?.label ?? opt.label}
                </span>
                {display?.description && (
                  <span className="tw-text-xs tw-leading-snug tw-text-muted">
                    {display.description}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

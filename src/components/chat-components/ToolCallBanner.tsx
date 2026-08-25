import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ToolResultFormatter } from "@/tools/ToolResultFormatter";
import { Check, ChevronRight, X } from "lucide-react";
import React, { useMemo, useState } from "react";

// Animation constants
// The shimmer keyframe is defined in the global CSS (see styles.css)
const SHIMMER_ANIMATION = "shimmer 2s ease-in-out infinite";

interface ToolCallBannerProps {
  toolName: string;
  displayName: string;
  emoji: string;
  isExecuting: boolean;
  result: string | null;
  confirmationMessage?: string | null;
  onAccept?: () => void;
  onReject?: () => void;
}

/**
 * Produce a display-friendly tool result, falling back to raw strings when they are already concise.
 * @param toolName Name of the tool that produced the result
 * @param result Raw tool result string (possibly null if tool still running)
 * @returns Formatted result or null when there is nothing to show yet
 */
const MAX_DISPLAY_CHARS = 5_000;

/**
 * Produce a display-friendly tool result while guarding against oversized payloads.
 * Large strings are summarized instead of rendered to keep the UI responsive.
 * @param toolName Name of the tool that produced the result
 * @param result Raw tool result string (possibly null if tool still running)
 * @returns Formatted result or a guardrail message; null when there is nothing to show yet
 */
const formatToolResult = (toolName: string, result: string | null): string | null => {
  if (!result) {
    return null;
  }

  if (result.length > MAX_DISPLAY_CHARS) {
    return `工具 "${toolName}" 返回了 ${result.length.toLocaleString()} 个字符。完整输出保留在对话历史中，此处省略以保持界面响应流畅。`;
  }

  try {
    const formatted = ToolResultFormatter.format(toolName, result);
    if (formatted.length > MAX_DISPLAY_CHARS) {
      return (
        formatted.slice(0, MAX_DISPLAY_CHARS) +
        `\n\n… （显示时截断了 ${(formatted.length - MAX_DISPLAY_CHARS).toLocaleString()} 个字符）`
      );
    }
    return formatted;
  } catch {
    return result.length > MAX_DISPLAY_CHARS
      ? `工具 "${toolName}" 返回了 ${result.length.toLocaleString()} 个字符。完整输出保留在对话历史中，此处省略以保持界面响应流畅。`
      : result;
  }
};

export const ToolCallBanner: React.FC<ToolCallBannerProps> = ({
  toolName,
  displayName,
  emoji,
  isExecuting,
  result,
  confirmationMessage,
  onAccept,
  onReject,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const formattedResult = useMemo(() => formatToolResult(toolName, result), [toolName, result]);

  // Defensive check: If we have a result, the tool is definitely done executing
  // This prevents infinite rolling animation if marker update fails or is delayed
  const actuallyExecuting = isExecuting && !result;

  // Don't allow expanding while executing
  const canExpand = !actuallyExecuting && formattedResult !== null;

  return (
    <Collapsible
      open={canExpand ? isOpen : false}
      onOpenChange={setIsOpen}
      disabled={!canExpand}
      aria-disabled={!canExpand}
      className="tw-my-3 tw-w-full sm:tw-max-w-sm"
    >
      <div
        className={cn(
          "tw-rounded-md tw-border tw-border-border tw-bg-secondary/50",
          actuallyExecuting && "tw-relative tw-overflow-hidden"
        )}
      >
        {/* Shimmer effect overlay */}
        {actuallyExecuting && (
          <div className="tw-absolute tw-inset-0 tw-z-[1] tw-overflow-hidden">
            <div
              className="tw-absolute tw-inset-0 -tw-translate-x-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)",
                animation: SHIMMER_ANIMATION,
              }}
            />
          </div>
        )}

        <CollapsibleTrigger
          className={cn(
            "tw-flex tw-w-full tw-items-center tw-justify-between tw-px-3 tw-py-2.5 tw-text-sm sm:tw-px-4 sm:tw-py-3",
            canExpand && "hover:tw-bg-secondary/70",
            !canExpand && "tw-cursor-default"
          )}
        >
          <div className="tw-flex tw-items-center tw-gap-2">
            <span className="tw-text-base">{emoji}</span>
            <span className="tw-font-medium">
              {toolName === "readNote"
                ? `${actuallyExecuting ? "正在读取" : "已读取"} ${displayName}`
                : `${actuallyExecuting ? "正在调用" : "已调用"} ${displayName}`}
              {actuallyExecuting && toolName !== "readNote" && "..."}
            </span>
            {actuallyExecuting && confirmationMessage && (
              <span className="tw-text-xs tw-text-muted">• {confirmationMessage}...</span>
            )}
          </div>

          <div className="tw-flex tw-items-center tw-gap-2">
            {/* Future: Accept/Reject buttons */}
            {!actuallyExecuting && onAccept && onReject && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccept();
                  }}
                  className="hover:tw-bg-green-rgb/20 tw-rounded tw-p-1"
                  title="接受"
                >
                  <Check className="tw-size-4 tw-text-success" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject();
                  }}
                  className="hover:tw-bg-red-rgb/20 tw-rounded tw-p-1"
                  title="拒绝"
                >
                  <X className="tw-size-4 tw-text-error" />
                </button>
              </>
            )}

            {canExpand && (
              <ChevronRight
                className={cn(
                  "tw-size-4 tw-text-muted tw-transition-transform",
                  isOpen && "tw-rotate-90"
                )}
              />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="tw-border-t tw-border-border tw-px-3 tw-py-2.5 sm:tw-px-4 sm:tw-py-3">
            <div className="tw-text-sm tw-text-muted">
              <pre className="tw-overflow-x-auto tw-whitespace-pre-wrap tw-font-mono tw-text-xs">
                {formattedResult ?? "暂无结果"}
              </pre>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

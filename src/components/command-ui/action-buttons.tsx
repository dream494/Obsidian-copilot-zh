import * as React from "react";
import { Platform } from "obsidian";
import { ArrowBigUp, Command, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ActionState = "idle" | "loading" | "result";

const ICON_CLS = "tw-size-3";

const ReplaceShortcutHint = () =>
  Platform.isMacOS ? (
    <span className="tw-ml-1 tw-inline-flex tw-items-center tw-gap-0.5 tw-opacity-80">
      <Command className={ICON_CLS} />
      <CornerDownLeft className={ICON_CLS} />
    </span>
  ) : (
    <span className="tw-ml-1 tw-inline-flex tw-items-center tw-gap-0.5 tw-text-xs tw-opacity-80">
      Ctrl
      <CornerDownLeft className={ICON_CLS} />
    </span>
  );

const InsertShortcutHint = () =>
  Platform.isMacOS ? (
    <span className="tw-ml-1 tw-inline-flex tw-items-center tw-gap-0.5 tw-opacity-80">
      <Command className={ICON_CLS} />
      <ArrowBigUp className={ICON_CLS} />
      <CornerDownLeft className={ICON_CLS} />
    </span>
  ) : (
    <span className="tw-ml-1 tw-inline-flex tw-items-center tw-gap-0.5 tw-text-xs tw-opacity-80">
      Ctrl
      <ArrowBigUp className={ICON_CLS} />
      <CornerDownLeft className={ICON_CLS} />
    </span>
  );

interface ActionButtonsProps {
  state: ActionState;
  onStop?: () => void;
  onCopy?: () => void;
  onInsert?: () => void;
  onReplace?: () => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  showInsertReplace?: boolean;
  showSubmitCancel?: boolean;
  className?: string;
}

/**
 * Action buttons for the modal footer.
 * Shows different buttons based on state: Stop during loading, Insert/Replace on result.
 */
export function ActionButtons({
  state,
  onStop,
  onCopy,
  onInsert,
  onReplace,
  onSubmit,
  onCancel,
  showInsertReplace = true,
  showSubmitCancel = false,
  className,
}: ActionButtonsProps) {
  return (
    <div className={cn("tw-flex tw-items-center tw-gap-2", className)}>
      {/* Stop button during loading */}
      {state === "loading" && (
        <Button variant="secondary" size="sm" onClick={onStop}>
          停止
        </Button>
      )}

      {/* Copy/Insert/Replace buttons on result */}
      {state === "result" && showInsertReplace && (
        <>
          {onCopy && (
            <Button size="sm" variant="secondary" onClick={onCopy} title="复制到剪贴板">
              复制
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={onInsert}
            title={`插入到选中内容下方（${Platform.isMacOS ? "⌘" : "Ctrl"}+Shift+Enter）`}
          >
            插入
            <InsertShortcutHint />
          </Button>
          <Button
            size="sm"
            onClick={onReplace}
            title={`替换选中内容（${Platform.isMacOS ? "⌘" : "Ctrl"}+Enter）`}
          >
            替换
            <ReplaceShortcutHint />
          </Button>
        </>
      )}

      {/* Submit/Cancel buttons (alternative mode) */}
      {showSubmitCancel && state !== "loading" && (
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button size="sm" onClick={onSubmit}>
            提交
          </Button>
        </>
      )}
    </div>
  );
}

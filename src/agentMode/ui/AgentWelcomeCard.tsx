import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FolderPlus, Sparkles, X } from "lucide-react";
import React, { memo } from "react";

interface AgentWelcomeCardProps {
  /** Start the name-only project creation flow, anchored to the trigger button. */
  onCreate: (anchor: HTMLElement) => void;
  /**
   * Dismiss the card. The parent persists this to `agentMode.welcomeDismissed`
   * so the nudge never returns; the card itself holds no dismissed state.
   */
  onDismiss: () => void;
  className?: string;
}

/**
 * "Try a project" nudge for the global Agent Home landing. The parent floats it
 * between the composer and the shelf and only mounts it when no projects exist
 * and `welcomeDismissed` is false — this component is pure presentation, owning
 * neither the visibility condition nor the persisted dismissal (it just signals
 * intent via {@link AgentWelcomeCardProps.onDismiss}).
 *
 * Visual authority: design-handoff stage A.1. We take its copy/layout but not the
 * sketch styling (no orange "NEW" badge, no handwriting) — Obsidian theme vars +
 * existing `tw-` tokens only.
 */
export const AgentWelcomeCard = memo(
  ({ onCreate, onDismiss, className }: AgentWelcomeCardProps): React.ReactElement => (
    <div
      className={cn(
        "tw-relative tw-flex tw-flex-col tw-gap-2 tw-rounded-md tw-border tw-border-solid tw-border-border tw-bg-secondary tw-p-3",
        className
      )}
    >
      <Button
        variant="ghost2"
        size="icon"
        onClick={onDismiss}
        aria-label="关闭"
        // Pull into the padding so the × hugs the corner without crowding the title.
        className="tw-absolute tw-right-1 tw-top-1 tw-size-6 tw-text-muted hover:tw-text-normal"
      >
        <X className="tw-size-4" />
      </Button>

      <div className="tw-flex tw-items-center tw-gap-1.5 tw-pr-6 tw-text-ui-small tw-font-semibold tw-text-normal">
        <Sparkles className="tw-size-4 tw-shrink-0 tw-text-accent" />
        <span>试试项目模式</span>
      </div>

      <p className="tw-m-0 tw-text-ui-smaller tw-text-muted">
        将笔记、URL、PDF 和文件夹归组为聚焦的上下文。智能体只在这些材料范围内作答，每个项目保留自己的对话历史。
      </p>

      <Button
        variant="default"
        size="sm"
        onClick={(e) => onCreate(e.currentTarget)}
        className="tw-mt-1 tw-w-full tw-gap-2"
      >
        <FolderPlus className="tw-size-4" />
        新建项目
      </Button>
    </div>
  )
);

AgentWelcomeCard.displayName = "AgentWelcomeCard";

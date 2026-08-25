import { cn } from "@/lib/utils";
import { AlertTriangle, FolderSync } from "lucide-react";
import React from "react";

export interface CopilotFolderChangeNoticeProps {
  /** Current Copilot root that remains excluded after the change. */
  oldRoot: string;
  /** Candidate Copilot root where future data will be stored. */
  newRoot: string;
  /** Whether the candidate already contains Markdown files. */
  containsMarkdown: boolean;
}

/**
 * Explains the lasting search exclusions before a Copilot folder change is committed.
 */
export const CopilotFolderChangeNotice: React.FC<CopilotFolderChangeNoticeProps> = ({
  oldRoot,
  newRoot,
  containsMarkdown,
}) => {
  return (
    <div className={cn("tw-flex tw-flex-col tw-gap-4")}>
      <div className={cn("tw-flex tw-items-center tw-gap-3 tw-text-normal")}>
        <FolderSync className={cn("tw-size-6 tw-shrink-0 tw-text-accent")} aria-hidden="true" />
        <h2 className={cn("tw-m-0 tw-text-xl tw-font-bold")}>更改 Copilot 文件夹</h2>
      </div>
      <p className={cn("tw-m-0 tw-text-muted")}>
        Copilot 会把新的对话和数据保存在 <code>{newRoot}/</code> 下。你的文件不会被移动 —— 旧数据仍保留在 <strong className={cn("tw-text-normal")}>{oldRoot}/</strong>，
        该文件夹将永久排除在 Copilot 搜索之外。如果需要可以自行移动它；Obsidian
        会更新链接。
      </p>
      {containsMarkdown && (
        <div
          className={cn(
            "tw-flex tw-items-start tw-gap-2 tw-rounded-lg tw-border tw-border-solid tw-border-warning/40",
            "tw-bg-secondary tw-px-3 tw-py-2.5 tw-text-xs tw-text-normal"
          )}
          role="alert"
        >
          <AlertTriangle
            className={cn("tw-mt-0.5 tw-size-4 tw-shrink-0 tw-text-warning")}
            aria-hidden="true"
          />
          <span>
            <strong>此文件夹已包含 Markdown 文件。</strong>如果继续，<code>{newRoot}/</code> 下的所有
            Markdown 文件 —— 包括普通笔记 —— 都将被排除在 Copilot 搜索之外。即使你日后更改
            Copilot 文件夹，此文件夹也仍然保持排除状态。
          </span>
        </div>
      )}
    </div>
  );
};

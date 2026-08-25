import * as React from "react";
import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Database, Loader2, Pause, Play, Square, X } from "lucide-react";
import { useIndexingProgress } from "@/aiParams";

interface IndexingProgressCardProps {
  onClose: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

/**
 * In-chat progress card for vault indexing operations.
 * Replaces the old Obsidian Notice-based progress display.
 */
export default function IndexingProgressCard({
  onClose,
  onPause,
  onResume,
  onStop,
}: IndexingProgressCardProps) {
  const [indexingState] = useIndexingProgress();
  const autoCloseTimerRef = useRef<number | null>(null);

  const { isActive, isPaused, indexedCount, totalFiles, errors, completionStatus } = indexingState;

  const progressPercentage = totalFiles > 0 ? Math.round((indexedCount / totalFiles) * 100) : 0;

  // Auto-close 3s after completion
  useEffect(() => {
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    // Auto-close on success/cancel but not on pre-indexing errors (user needs to read the message)
    const shouldAutoClose =
      !isActive &&
      completionStatus !== "none" &&
      !(completionStatus === "error" && totalFiles === 0);
    if (shouldAutoClose) {
      autoCloseTimerRef.current = window.setTimeout(() => {
        onClose();
      }, 3000);
    }

    return () => {
      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [isActive, completionStatus, totalFiles, onClose]);

  /** Title text based on current state */
  const getTitle = () => {
    if (completionStatus === "success")
      return totalFiles === 0 ? "索引已是最新" : "索引完成";
    if (completionStatus === "cancelled") return "索引已取消";
    if (completionStatus === "error") {
      // If totalFiles is 0, indexing never started (e.g. embedding model unavailable)
      return totalFiles === 0 ? "索引失败" : "索引完成（有错误）";
    }
    if (isPaused) return "索引已暂停";
    return "正在索引仓库";
  };

  /** Status icon */
  const getStatusIcon = () => {
    if (!isActive && completionStatus !== "none") {
      if (completionStatus === "error") return <AlertCircle className="tw-size-4 tw-text-error" />;
      if (completionStatus === "success")
        return <CheckCircle className="tw-size-4 tw-text-success" />;
      return <Database className="tw-size-4" />;
    }
    if (isPaused) return <Pause className="tw-size-4 tw-text-warning" />;
    return <Loader2 className="tw-size-4 tw-animate-spin tw-text-accent" />;
  };

  return (
    <Card className="tw-w-full tw-border tw-border-solid tw-border-border tw-bg-transparent tw-shadow-none">
      <CardHeader>
        <CardTitle className="tw-flex tw-items-center tw-justify-between tw-gap-2">
          <div className="tw-flex tw-items-center tw-gap-2">
            {getStatusIcon()}
            <span className="tw-text-sm">{getTitle()}</span>
          </div>
          <Button
            size="sm"
            variant="ghost2"
            className="tw-size-6 tw-p-0 tw-text-muted"
            title="关闭"
            onClick={onClose}
          >
            <X className="tw-size-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="tw-space-y-3">
        {totalFiles > 0 && (
          <div className="tw-space-y-2">
            <div className="tw-flex tw-items-center tw-justify-between tw-text-sm">
              <span className="tw-text-muted">
                {indexedCount}/{totalFiles} 个文件
              </span>
              <span className="tw-font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="tw-h-2" />
          </div>
        )}

        {errors.length > 0 && (
          <div className="tw-flex tw-flex-col tw-gap-1">
            <div className="tw-flex tw-items-center tw-gap-2">
              <AlertCircle className="tw-size-3 tw-text-error" />
              <Badge variant="destructive" className="tw-text-xs">
                {errors.length} 个错误
              </Badge>
            </div>
            {totalFiles === 0 && errors[0] && (
              <span className="tw-text-xs tw-text-error">{errors[0]}</span>
            )}
          </div>
        )}

        {isActive && (
          <div className="tw-flex tw-items-center tw-gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="tw-h-6 tw-px-2 tw-text-xs"
              onClick={isPaused ? onResume : onPause}
            >
              {isPaused ? (
                <>
                  <Play className="tw-mr-1 tw-size-3" />
                  继续
                </>
              ) : (
                <>
                  <Pause className="tw-mr-1 tw-size-3" />
                  暂停
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="tw-h-6 tw-px-2 tw-text-xs"
              onClick={onStop}
            >
              <Square className="tw-mr-1 tw-size-3" />
              停止
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

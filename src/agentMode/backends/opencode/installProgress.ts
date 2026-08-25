import type { ProgressEvent } from "@/agentMode/backends/opencode/OpencodeBinaryManager";
import { formatBytes } from "@/utils/formatBytes";

/**
 * Narrates where a managed opencode install currently is. Shared by the
 * Configure dialog and the inline install row so both surfaces describe the
 * same pipeline with the same words.
 *
 * @param e - Latest progress event, or `null` before the first one arrives.
 */
export function phaseLabel(e: ProgressEvent | null): string {
  if (!e) return "正在启动…";
  switch (e.phase) {
    case "resolve":
      return e.message;
    case "download":
      if (e.total) {
        const pct = Math.min(100, Math.floor((e.received / e.total) * 100));
        return `正在下载 ${e.assetName} — ${formatBytes(e.received)} / ${formatBytes(e.total)} (${pct}%)`;
      }
      return `正在下载 ${e.assetName} — ${formatBytes(e.received)}`;
    case "extract":
      return e.message;
    case "done":
      return "完成";
  }
}

/**
 * Completion percentage for the progress bar. Returns `undefined` for phases
 * that carry no measurable fraction (resolving, or a download the server sent
 * no content-length for) so the bar shows its zero state instead of inventing
 * progress.
 *
 * @param e - Latest progress event, or `null` before the first one arrives.
 */
export function phaseProgress(e: ProgressEvent | null): number | undefined {
  if (!e) return undefined;
  if (e.phase === "download" && e.total) {
    return Math.min(100, Math.floor((e.received / e.total) * 100));
  }
  if (e.phase === "extract") return 98;
  if (e.phase === "done") return 100;
  return undefined;
}

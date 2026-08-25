import type { InstallState } from "@/agentMode/session/types";

/** Recovery guidance for the resolved Claude installation source. */
export function claudeUpdateDetail(state: InstallState): string {
  if (state.kind === "incompatible" && state.source === "custom") {
    return "更新已保存路径处的二进制文件，或清除覆盖设置以使用自动检测到的安装。";
  }
  return "使用下方的安装命令更新它，然后重新打开此对话框。";
}

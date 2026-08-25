import React, { useMemo } from "react";
import { TFile, TFolder } from "obsidian";
import { isDesktopRuntime } from "@/utils/desktopRuntime";
import { FileText, Wrench, Folder, Globe, Image, Bot } from "lucide-react";
import { TypeaheadOption } from "@/components/chat-components/TypeaheadMenuContent";
import type { WebTabContext } from "@/types/message";

export type AtMentionCategory =
  | "agents"
  | "notes"
  | "tools"
  | "folders"
  | "activeNote"
  | "webTabs"
  | "activeWebTab"
  | "images";

export interface AtMentionOption extends TypeaheadOption {
  category: AtMentionCategory;
  data: TFile | string | TFolder | WebTabContext;
  isAction?: boolean;
}

/**
 * Minimal brand shape for a mentionable coding agent. Local to chat-components so
 * the generic composer never imports Agent Mode internals; Agent Mode passes its
 * structurally-compatible `AgentBrand` down as props.
 */
export interface AgentMentionBrand {
  readonly id: string;
  readonly displayName: string;
  readonly Icon: React.ComponentType<{ className?: string }>;
  /** `true` when Self-Host Mode is on and this is a cloud agent — the mention
   *  option shows a cloud-egress warning icon. */
  readonly needsSelfHostWarning?: boolean;
}

/** Frozen empty brand list — referential stability for the no-agents default. */
export const EMPTY_AGENT_MENTION_BRANDS: ReadonlyArray<AgentMentionBrand> = Object.freeze([]);

export interface CategoryOption extends TypeaheadOption {
  category: AtMentionCategory;
  icon: React.ReactNode;
  isAction?: boolean;
}

/** "Agents" typeahead group — surfaced only in Agent Mode with a backend installed, rendered first. */
const AGENTS_CATEGORY: CategoryOption = {
  key: "agents",
  title: "智能体",
  subtitle: "本轮请另一个编程智能体回答",
  category: "agents",
  icon: <Bot className="tw-size-4" />,
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    key: "notes",
    title: "笔记",
    subtitle: "引用仓库中的笔记",
    category: "notes",
    icon: <FileText className="tw-size-4" />,
  },
  {
    key: "webTabs",
    title: "网页标签页",
    subtitle: "引用已打开的浏览器标签页",
    category: "webTabs",
    icon: <Globe className="tw-size-4" />,
  },
  {
    key: "tools",
    title: "工具",
    subtitle: "AI 工具和命令",
    category: "tools",
    icon: <Wrench className="tw-size-4" />,
  },
  {
    key: "folders",
    title: "文件夹",
    subtitle: "引用仓库文件夹",
    category: "folders",
    icon: <Folder className="tw-size-4" />,
  },
  {
    key: "images",
    title: "图片",
    subtitle: "附加图片文件",
    category: "images",
    icon: <Image className="tw-size-4" />,
    isAction: true,
  },
];

/**
 * Pure helper that decides whether the Copilot built-in `@`-tool surfaces
 * (Tools category and tool hits in search) should be visible. Tools require
 * Copilot Plus AND are suppressed entirely in Agent Mode, which routes
 * through its own backend instead of the Copilot tool runner.
 */
export function shouldShowAtMentionTools(args: {
  isCopilotPlus: boolean;
  isAgentMode: boolean;
}): boolean {
  return args.isCopilotPlus && !args.isAgentMode;
}

/**
 * Hook that provides available @ mention categories. Web Tabs is desktop-only
 * (Web Viewer is not supported on mobile).
 *
 * @param showTools - Whether to include the Copilot Tools category. Compute
 *   via {@link shouldShowAtMentionTools} from the caller's higher-level
 *   signals (e.g. Copilot Plus on, Agent Mode off).
 * @param showAgents - Whether to include the Agents category (Agent Mode with
 *   at least one installed backend). Rendered first when present.
 * @returns Array of CategoryOption objects
 */
export function useAtMentionCategories(
  showTools: boolean = false,
  showAgents: boolean = false
): CategoryOption[] {
  return useMemo(() => {
    const base = CATEGORY_OPTIONS.filter((cat) => {
      if (cat.category === "tools") {
        return showTools;
      }
      if (cat.category === "webTabs") {
        return isDesktopRuntime();
      }
      return true;
    });
    return showAgents ? [AGENTS_CATEGORY, ...base] : base;
  }, [showTools, showAgents]);
}

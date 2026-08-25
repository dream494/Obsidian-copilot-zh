import { useChainType } from "@/aiParams";
import { ChainType } from "@/chainType";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { Button } from "@/components/ui/button";
import { DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { SettingSwitch } from "@/components/ui/setting-switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PLUS_UTM_MEDIUMS } from "@/constants";
import { logError } from "@/logger";
import { getSearchBackend } from "@/miyo/miyoUtils";
import { navigateToPlusPage, useIsPaidUser } from "@/plusUtils";
import { updateSetting, useSettingsValue } from "@/settings/model";
import { useApp } from "@/context";
import { DropdownMenu, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Download,
  History,
  MessageCirclePlus,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  SquareArrowOutUpRight,
} from "lucide-react";
import { Notice } from "obsidian";
import React from "react";
import {
  ChatHistoryItem,
  ChatHistoryPopover,
} from "@/components/chat-components/ChatHistoryPopover";
import { TokenCounter } from "./TokenCounter";
import { ChatSettingsPopover } from "@/components/chat-components/ChatSettingsPopover";

async function refreshVaultIndex() {
  try {
    const { getSettings } = await import("@/settings/model");
    const settings = getSettings();

    if (settings.enableSemanticSearchV3) {
      // Use VectorStoreManager for semantic search indexing
      const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
      const count = await VectorStoreManager.getInstance().indexVaultToVectorStore(false, {
        userInitiated: true,
      });
      if (getSearchBackend(settings) === "miyo") {
        new Notice("Miyo 文件夹索引刷新已开始。打开 Miyo 应用查看详情。");
      } else {
        new Notice(`语义搜索索引已刷新，共 ${count} 个文档。`);
      }
    } else {
      // V3 search builds indexes on demand
      new Notice("词汇搜索按需构建索引，无需手动索引。");
    }
  } catch (error) {
    logError("Error refreshing vault index:", error);
    new Notice("刷新仓库索引失败。请查看控制台了解详情。");
  }
}

async function forceReindexVault() {
  try {
    const { getSettings } = await import("@/settings/model");
    const settings = getSettings();

    if (settings.enableSemanticSearchV3) {
      // Use VectorStoreManager for semantic search indexing
      const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
      const count = await VectorStoreManager.getInstance().indexVaultToVectorStore(true, {
        userInitiated: true,
      });
      if (getSearchBackend(settings) === "miyo") {
        new Notice("Miyo 文件夹索引刷新已开始。打开 Miyo 应用查看详情。");
      } else {
        new Notice(`语义搜索索引已重建，共 ${count} 个文档。`);
      }
    } else {
      // V3 search builds indexes on demand
      new Notice("词汇搜索按需构建索引，无需手动索引。");
    }
  } catch (error) {
    logError("Error force reindexing vault:", error);
    new Notice("强制重建仓库索引失败。请查看控制台了解详情。");
  }
}

interface ChatControlsProps {
  onNewChat: () => void;
  onSaveAsNote: () => Promise<void>;
  onLoadHistory: () => void;
  chatHistory: ChatHistoryItem[];
  onUpdateChatTitle: (id: string, newTitle: string) => Promise<void>;
  onDeleteChat: (id: string) => Promise<void>;
  onLoadChat: (id: string) => Promise<void>;
  onOpenSourceFile?: (id: string) => Promise<void>;
  latestTokenCount?: number | null;
}

export function ChatControls({
  onNewChat,
  onSaveAsNote,
  onLoadHistory,
  chatHistory,
  onUpdateChatTitle,
  onDeleteChat,
  onLoadChat,
  onOpenSourceFile,
  latestTokenCount,
}: ChatControlsProps) {
  const app = useApp();
  const settings = useSettingsValue();
  const [selectedChain, setSelectedChain] = useChainType();
  const isPaidUser = useIsPaidUser();

  const handleModeChange = (chainType: ChainType) => setSelectedChain(chainType);

  return (
    <div className="tw-flex tw-w-full tw-items-center tw-justify-between tw-p-1">
      <div className="tw-flex-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost2" size="fit" className="tw-ml-1 tw-text-sm tw-text-muted">
              {selectedChain === ChainType.LLM_CHAIN && "对话（免费）"}
              {selectedChain === ChainType.VAULT_QA_CHAIN && "仓库问答（免费）"}
              {selectedChain === ChainType.COPILOT_PLUS_CHAIN && (
                <div className="tw-flex tw-items-center tw-gap-1">
                  <Sparkles className="tw-size-4" />
                  copilot plus
                </div>
              )}
              <ChevronDown className="tw-mt-0.5 tw-size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => handleModeChange(ChainType.LLM_CHAIN)}>
              对话（免费）
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleModeChange(ChainType.VAULT_QA_CHAIN)}>
              仓库问答（免费）
            </DropdownMenuItem>
            {isPaidUser ? (
              <DropdownMenuItem onSelect={() => handleModeChange(ChainType.COPILOT_PLUS_CHAIN)}>
                <div className="tw-flex tw-items-center tw-gap-1">
                  <Sparkles className="tw-size-4" />
                  copilot plus
                </div>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() => navigateToPlusPage(PLUS_UTM_MEDIUMS.CHAT_MODE_SELECT)}
              >
                copilot plus
                <SquareArrowOutUpRight className="tw-size-3" />
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="tw-flex tw-items-center tw-gap-1">
        <div className="tw-mr-2">
          <TokenCounter tokenCount={latestTokenCount ?? null} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost2" size="icon" title="新建对话" onClick={onNewChat}>
              <MessageCirclePlus className="tw-size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>新建对话</TooltipContent>
        </Tooltip>
        <ChatSettingsPopover />
        {!settings.autosaveChat && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost2"
                size="icon"
                title="将对话保存为笔记"
                onClick={() => void onSaveAsNote()}
              >
                <Download className="tw-size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>将对话保存为笔记</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <ChatHistoryPopover
            chatHistory={chatHistory}
            onUpdateTitle={onUpdateChatTitle}
            onDeleteChat={onDeleteChat}
            onLoadChat={onLoadChat}
            onOpenSourceFile={onOpenSourceFile}
          >
            <TooltipTrigger asChild>
              <Button variant="ghost2" size="icon" title="对话历史" onClick={onLoadHistory}>
                <History className="tw-size-4" />
              </Button>
            </TooltipTrigger>
          </ChatHistoryPopover>
          <TooltipContent>对话历史</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost2" size="icon" title="高级设置">
              <MoreHorizontal className="tw-size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="tw-w-64">
            <DropdownMenuItem
              className="tw-flex tw-justify-between"
              onSelect={(e) => {
                e.preventDefault();
                updateSetting("autoAcceptEdits", !settings.autoAcceptEdits);
              }}
            >
              <div className="tw-flex tw-items-center tw-gap-2">
                <CheckCircle className="tw-size-4" />
                自动接受编辑
              </div>
              <SettingSwitch checked={settings.autoAcceptEdits} />
            </DropdownMenuItem>
            <DropdownMenuItem
              className="tw-flex tw-items-center tw-gap-2"
              onSelect={() => void refreshVaultIndex()}
            >
              <RefreshCw className="tw-size-4" />
              刷新仓库索引
            </DropdownMenuItem>
            <DropdownMenuItem
              className="tw-flex tw-items-center tw-gap-2"
              onSelect={() => {
                const modal = new ConfirmModal(
                  app,
                  () => forceReindexVault(),
                  "此操作将删除并从头重建你的整个仓库索引。此操作无法撤销。你确定要继续吗？",
                  "强制重建仓库索引"
                );
                modal.open();
              }}
            >
              <AlertTriangle className="tw-size-4" />
              强制重建仓库索引
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

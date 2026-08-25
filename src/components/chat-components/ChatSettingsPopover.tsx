import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { ObsidianNativeSelect } from "@/components/ui/obsidian-native-select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, ArrowUpRight, RotateCcw, Settings } from "lucide-react";
import { SettingSwitch } from "@/components/ui/setting-switch";
import {
  getDefaultSystemPromptTitle,
  getDisableBuiltinSystemPrompt,
  getPromptFilePath,
  setDisableBuiltinSystemPrompt,
  useSelectedPrompt,
  useSystemPrompts,
} from "@/system-prompts";

export function ChatSettingsPopover() {
  const app = useApp();

  // System prompt state (session-level, in-memory)
  const prompts = useSystemPrompts();
  const [sessionPrompt, setSessionPrompt] = useSelectedPrompt();
  const globalDefault = getDefaultSystemPromptTitle();

  /**
   * Check if a prompt title exists in the current prompts list
   */
  const promptExists = (title: string | null | undefined): boolean => {
    if (!title) return false;
    return prompts.some((p) => p.title === title);
  };

  // Display value: use existing prompts only, otherwise show placeholder
  const displayValue = promptExists(sessionPrompt)
    ? sessionPrompt
    : promptExists(globalDefault)
      ? globalDefault
      : "";

  // Read state from session atom
  const [disableBuiltin, setDisableBuiltin] = useState(() => getDisableBuiltinSystemPrompt());
  const [showConfirmation, setShowConfirmation] = useState(false);
  const confirmationRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to confirmation box when it appears
  useEffect(() => {
    if (showConfirmation && confirmationRef.current) {
      confirmationRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [showConfirmation]);

  /**
   * Sync global disableBuiltinSystemPrompt state to local UI state when popover opens
   * This ensures the UI reflects the current state after chat switches (new chat or load history)
   */
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      const currentValue = getDisableBuiltinSystemPrompt();
      setDisableBuiltin(currentValue);
      if (!currentValue) {
        setShowConfirmation(false);
      }
    }
  }, []);

  const handleReset = useCallback(() => {
    // Reset session prompt to use global default
    setSessionPrompt("");
    setDisableBuiltin(false);
    setShowConfirmation(false);
    // Clear session settings
    setDisableBuiltinSystemPrompt(false);
  }, [setSessionPrompt]);

  const handleDisableBuiltinToggle = (checked: boolean) => {
    if (checked) {
      setShowConfirmation(true);
    } else {
      setDisableBuiltin(false);
      setShowConfirmation(false);
      // Update session settings
      setDisableBuiltinSystemPrompt(false);
    }
  };

  const confirmDisableBuiltin = () => {
    setDisableBuiltin(true);
    setShowConfirmation(false);
    // Update session settings
    setDisableBuiltinSystemPrompt(true);
  };

  const cancelDisableBuiltin = () => {
    setShowConfirmation(false);
  };

  /**
   * Open the source file of the currently selected system prompt
   */
  const handleOpenSourceFile = () => {
    if (!displayValue) return;
    const filePath = getPromptFilePath(displayValue);
    void app.workspace.openLinkText(filePath, "", true);
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost2" size="icon">
              <Settings className="tw-size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>对话设置</TooltipContent>
      </Tooltip>
      <PopoverContent className="tw-w-80 tw-rounded-md tw-p-0" align="end">
        <div className="tw-flex tw-max-h-[500px] tw-flex-col">
          {/* Header with Reset - Fixed */}
          <div className="tw-shrink-0 tw-border-b tw-px-4">
            <div className="tw-flex tw-items-center tw-justify-between">
              <h3 className="tw-font-semibold">对话设置</h3>
              <Button variant="ghost" size="sm" onClick={handleReset} className="tw-h-8 tw-text-xs">
                <RotateCcw className="tw-mr-1 tw-size-3" />
                重置
              </Button>
            </div>
          </div>

          <Separator />

          {/* Scrollable Content Area */}
          <ScrollArea className="tw-flex-1 tw-overflow-y-auto">
            <div className="tw-space-y-4 tw-p-4">
              {/* System Prompt */}
              <div className="tw-space-y-2">
                <div className="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
                  <Label htmlFor="system-prompt" className="tw-text-sm sm:tw-min-w-fit">
                    系统提示词
                  </Label>
                  <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-2 sm:tw-flex-1">
                    <ObsidianNativeSelect
                      value={displayValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          setSessionPrompt("");
                        } else if (promptExists(value)) {
                          setSessionPrompt(value);
                        }
                      }}
                      options={[
                        { label: "无（使用内置提示词）", value: "" },
                        ...prompts.map((prompt) => ({
                          label:
                            prompt.title === globalDefault
                              ? `${prompt.title}（默认）`
                              : prompt.title,
                          value: prompt.title,
                        })),
                      ]}
                      placeholder="选择系统提示词"
                      containerClassName="tw-flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleOpenSourceFile}
                      className="tw-size-5 tw-shrink-0 tw-p-0"
                      title="打开源文件"
                      disabled={!displayValue}
                    >
                      <ArrowUpRight className="tw-size-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Disable Builtin System Prompt */}
              <div className="tw-space-y-3">
                <div className="tw-space-y-1.5">
                  <div className="tw-flex tw-items-center tw-justify-between">
                    <Label htmlFor="disable-builtin" className="tw-text-sm tw-font-medium">
                      禁用内置系统提示词
                    </Label>
                    <SettingSwitch
                      checked={disableBuiltin}
                      onCheckedChange={handleDisableBuiltinToggle}
                      disabled={showConfirmation}
                    />
                  </div>
                  <div className="tw-pr-12 tw-text-xs tw-leading-relaxed tw-text-muted">
                    禁用内置系统提示词，仅使用你的自定义系统提示词。{" "}
                    <span className="tw-text-xs tw-text-error">
                      警告：这可能会破坏预期功能。
                    </span>
                  </div>
                </div>

                {(disableBuiltin || showConfirmation) && (
                  <div
                    ref={confirmationRef}
                    className="tw-rounded-md tw-border tw-bg-error/10 tw-p-3 tw-border-error/50"
                  >
                    <div className="tw-flex tw-gap-2">
                      <AlertTriangle className="tw-mt-0.5 tw-size-4 tw-shrink-0 tw-text-error" />
                      <div className="tw-flex-1 tw-space-y-2">
                        <div className="tw-space-y-1">
                          <div className="tw-text-xs tw-font-semibold tw-text-error">
                            Copilot Plus 功能将不可用
                          </div>
                          <div className="tw-flex tw-flex-col  tw-items-center tw-gap-2 tw-text-xs tw-leading-relaxed tw-text-muted">
                            <div>
                              启用后，仓库搜索、网页搜索和智能体模式等高级功能将不可用。{" "}
                            </div>
                            <div className="tw-italic">
                              仅会使用你的自定义系统提示词（在设置中配置）。
                            </div>
                          </div>
                        </div>

                        {showConfirmation && (
                          <div className="tw-flex tw-gap-2 tw-pt-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={confirmDisableBuiltin}
                              className="tw-h-7 tw-text-xs"
                            >
                              禁用内置
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelDisableBuiltin}
                              className="tw-h-7 tw-bg-transparent tw-text-xs"
                            >
                              取消
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <Separator />

          {/* Footer - Fixed */}
          <div className="tw-shrink-0 tw-rounded-md tw-bg-primary tw-px-4 tw-py-1">
            <div className="tw-flex tw-flex-row tw-flex-wrap">
                <span className="tw-text-xs tw-text-normal">
                  <span className=" tw-italic">系统提示词和禁用内置系统提示词</span>{" "}
                  <strong>仅适用于本次对话会话</strong>。
                </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

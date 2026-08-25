import React from "react";

/**
 * SystemPromptSyntaxInstruction component displays available template variables for system prompts.
 * Note: Unlike custom commands, system prompts do NOT support {} for selected text.
 */
export function SystemPromptSyntaxInstruction() {
  return (
    <ul className="tw-m-0 tw-px-4 tw-text-sm">
      <li>
        <span className="tw-font-medium tw-text-accent">{`{[[Note Title]]}`}</span> 包含笔记的内容。注意：不带花括号的裸{" "}
        <span className="tw-font-medium">{`[[Note Title]]`}</span>{" "}
        不会包含笔记内容。
      </li>
      <li>
        <span className="tw-font-medium tw-text-accent">{`{activeNote}`}</span> 表示当前活动笔记。
      </li>
      <li>
        <span className="tw-font-medium tw-text-accent">{`{#tag1, #tag2}`}</span> 表示其属性中包含任意指定标签的所有笔记（或运算）。
      </li>
      <li>
        <span className="tw-font-medium tw-text-accent">{`{folder/path}`}</span> 表示来自特定文件夹路径的笔记。
      </li>
    </ul>
  );
}

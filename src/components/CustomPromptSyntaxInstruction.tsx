import React from "react";

export function CustomPromptSyntaxInstruction() {
  return (
    <ul className="tw-m-0 tw-px-4 tw-text-sm">
      <li>
        <span className="tw-font-medium tw-text-accent">{"{}"}</span> 表示选中的文本。
      </li>
      <li>
        <span className="tw-font-medium tw-text-accent">{`{[[Note Title]]}`}</span> 表示一篇笔记。
      </li>
      <li>
        <span className="tw-font-medium tw-text-accent">{`{activeNote}`}</span> 表示当前活动笔记。
      </li>
      <li>
        <span className="tw-font-medium tw-text-accent">{`{#tag1, #tag2}`}</span> 表示其属性中包含任意指定标签的所有笔记（或运算）。
      </li>
    </ul>
  );
}

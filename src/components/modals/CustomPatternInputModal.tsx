import { App, Modal } from "obsidian";
import React, { useState } from "react";
import { Root } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPluginRoot } from "@/utils/react/createPluginRoot";

function CustomPatternInputModalContent({
  onConfirm,
  onCancel,
}: {
  onConfirm: (pattern: string) => void;
  onCancel: () => void;
}) {
  // TODO: Add validation
  const [pattern, setPattern] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onConfirm(pattern);
    }
  };

  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <div className="tw-flex tw-flex-col tw-gap-4">
        <div>
          逗号分隔的路径、标签、笔记标题或文件扩展名列表，例如：folder1,
          folder1/folder2, #tag1, #tag2, [[note1]], [[note2]], *.jpg, *.excallidraw.md
        </div>
        <Input
          placeholder="输入模式"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="tw-flex tw-justify-end tw-gap-2">
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button variant="default" onClick={() => onConfirm(pattern)}>
          确认
        </Button>
      </div>
    </div>
  );
}

export class CustomPatternInputModal extends Modal {
  private root: Root;

  constructor(
    app: App,
    private onConfirm: (pattern: string) => void
  ) {
    super(app);
    // https://docs.obsidian.md/Reference/TypeScript+API/Modal/setTitle
    // @ts-ignore
    this.setTitle("添加自定义模式");
  }

  onOpen() {
    const { contentEl } = this;
    this.root = createPluginRoot(contentEl, this.app);

    const handleConfirm = (extension: string) => {
      this.onConfirm(extension);
      this.close();
    };

    const handleCancel = () => {
      this.close();
    };

    this.root.render(
      <CustomPatternInputModalContent onConfirm={handleConfirm} onCancel={handleCancel} />
    );
  }

  onClose() {
    this.root.unmount();
  }
}

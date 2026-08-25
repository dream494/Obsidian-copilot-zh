import { App, Modal } from "obsidian";
import React, { useState } from "react";
import { Root } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPluginRoot } from "@/utils/react/createPluginRoot";

function ExtensionInputModalContent({
  onConfirm,
  onCancel,
}: {
  onConfirm: (extension: string) => void;
  onCancel: () => void;
}) {
  const [extension, setExtension] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateAndConfirm = (value: string) => {
    if (value.includes(" ")) {
      setError("扩展名不能包含空格");
      return;
    }
    setError(null);
    onConfirm(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      validateAndConfirm(extension);
    }
  };

  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <div className="tw-flex tw-flex-col tw-gap-2">
        <Input
          placeholder="输入扩展名（例如 txt, excalidraw.md）"
          value={extension}
          onChange={(e) => {
            setExtension(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
        />
        {error && <p className="tw-text-sm tw-text-error">{error}</p>}
      </div>
      <div className="tw-flex tw-justify-end tw-gap-2">
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button variant="default" onClick={() => validateAndConfirm(extension)}>
          确认
        </Button>
      </div>
    </div>
  );
}

export class ExtensionInputModal extends Modal {
  private root: Root;

  constructor(
    app: App,
    private onConfirm: (extension: string) => void
  ) {
    super(app);
    // https://docs.obsidian.md/Reference/TypeScript+API/Modal/setTitle
    // @ts-ignore
    this.setTitle("添加扩展名");
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
      <ExtensionInputModalContent onConfirm={handleConfirm} onCancel={handleCancel} />
    );
  }

  onClose() {
    this.root.unmount();
  }
}

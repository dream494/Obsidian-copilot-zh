import { Button } from "@/components/ui/button";
import { openWithSystemDefault } from "@/utils/openWithSystemDefault";
import { createPluginRoot } from "@/utils/react/createPluginRoot";
import type { SymposiumAction, SymposiumDocument, SymposiumReceipt } from "@/symposium/types";
import { App, Modal } from "obsidian";
import React, { useState } from "react";
import type { Root } from "react-dom/client";
import { safeAsyncHandler } from "@/utils/safeAsyncHandler";

export interface SymposiumSuccessResult {
  kind: "success";
  action: SymposiumAction;
  receipt?: SymposiumReceipt;
}

export interface SymposiumFailureResult {
  kind: "failure";
  action: SymposiumAction;
  message: string;
  accessNotice: boolean;
  retryable: boolean;
}

export interface SymposiumPersistenceResult {
  kind: "persistence";
  action: SymposiumAction;
  message: string;
  receipt?: SymposiumReceipt;
  retrySave?: () => Promise<SymposiumModalResult>;
}

export type SymposiumModalResult =
  | SymposiumSuccessResult
  | SymposiumFailureResult
  | SymposiumPersistenceResult;

/** Immutable host-owned data shown before an agent-authored document can be sent. */
export interface SymposiumDocumentReview {
  readonly sourcePath: string;
  readonly digest: string;
  readonly payload: SymposiumDocument;
  readonly previewPath: string;
  readonly previewUrl: string;
}

export interface SymposiumModalOptions {
  fileName: string;
  docId: string | null;
  review?: SymposiumDocumentReview;
  initialResult?: SymposiumModalResult;
  onConfirm: (action: SymposiumAction, ownerDocument: Document) => Promise<SymposiumModalResult>;
  onRegenerate?: () => void;
  onClosed?: () => void;
}

interface SymposiumModalContentProps extends SymposiumModalOptions {
  onClose: () => void;
}

function actionLabel(action: SymposiumAction): string {
  switch (action) {
    case "publish":
      return "发布";
    case "update":
      return "更新";
    case "delete":
      return "删除";
  }
}

const WORKING_LABELS: Record<SymposiumAction, string> = {
  publish: "发布中…",
  update: "更新中…",
  delete: "删除中…",
};

interface SymposiumReceiptViewProps {
  receipt: SymposiumReceipt;
  actions?: React.ReactNode;
}

function SymposiumReceiptView({ receipt, actions }: SymposiumReceiptViewProps) {
  const [copyMessage, setCopyMessage] = useState("");

  const copyUrl = async (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      await event.currentTarget.win.navigator.clipboard.writeText(receipt.url);
      setCopyMessage("已复制");
    } catch {
      setCopyMessage("无法复制链接");
    }
  };

  const openUrl = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.win.open(receipt.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="tw-flex tw-flex-col tw-gap-3">
      <code className="tw-break-all tw-rounded-md tw-bg-secondary tw-p-2 tw-text-small">
        <a
          href={receipt.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tw-text-accent tw-underline"
        >
          {receipt.url}
        </a>
      </code>
      <div className="tw-text-small tw-text-muted">
        文档 {receipt.docId} · 版本 {receipt.version}
      </div>
      <div className="tw-flex tw-items-center tw-justify-end tw-gap-2">
        {copyMessage && <span className="tw-text-small tw-text-muted">{copyMessage}</span>}
        {actions}
        <Button variant="secondary" onClick={safeAsyncHandler(copyUrl)}>
          复制
        </Button>
        <Button onClick={openUrl}>打开</Button>
      </div>
    </div>
  );
}

function SymposiumModalContent({
  fileName,
  docId,
  review,
  initialResult,
  onConfirm,
  onRegenerate,
  onClose,
}: SymposiumModalContentProps) {
  const [confirmationAction, setConfirmationAction] = useState<SymposiumAction | null>(
    review ? (docId ? "update" : "publish") : docId ? null : "publish"
  );
  const [result, setResult] = useState<SymposiumModalResult | null>(initialResult ?? null);
  const [workingAction, setWorkingAction] = useState<SymposiumAction | null>(null);
  const working = workingAction !== null;

  const runAction = async (nextAction: SymposiumAction, ownerDocument: Document) => {
    setWorkingAction(nextAction);
    try {
      setResult(await onConfirm(nextAction, ownerDocument));
    } finally {
      setWorkingAction(null);
    }
  };

  const retry = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (result?.kind === "failure") {
      void runAction(result.action, event.currentTarget.doc);
    }
  };

  const retrySave = async () => {
    if (result?.kind !== "persistence" || !result.retrySave) {
      return;
    }
    setWorkingAction(result.action);
    try {
      setResult(await result.retrySave());
    } finally {
      setWorkingAction(null);
    }
  };

  if (result?.kind === "success") {
    const closeButton = (
      <Button variant="secondary" onClick={onClose}>
        关闭
      </Button>
    );
    return (
      <div className="tw-flex tw-flex-col tw-gap-4">
        <div className="tw-font-semibold tw-text-normal">
          {result.action === "delete"
            ? "已从 Symposium 移除"
            : `${actionLabel(result.action)}完成`}
        </div>
        {result.receipt ? (
          <SymposiumReceiptView receipt={result.receipt} actions={closeButton} />
        ) : (
          <div className="tw-flex tw-justify-end">{closeButton}</div>
        )}
      </div>
    );
  }

  if (result?.kind === "failure") {
    return (
      <div className="tw-flex tw-flex-col tw-gap-4" role="alert">
        <div className="tw-font-semibold tw-text-normal">
          {result.accessNotice
            ? "需要 Symposium 访问权限"
            : `${actionLabel(result.action)}失败`}
        </div>
        <p className="tw-m-0 tw-text-muted">{result.message}</p>
        <div className="tw-flex tw-justify-end tw-gap-2">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
          {result.retryable && !review && (
            <Button onClick={retry} disabled={working}>
              {working ? "重试中…" : "重试"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (result?.kind === "persistence") {
    const actions = (
      <>
        <Button variant="secondary" onClick={onClose}>
          关闭
        </Button>
        {result.retrySave && (
          <Button onClick={() => void retrySave()} disabled={working}>
            {working ? "保存中…" : "重试保存"}
          </Button>
        )}
      </>
    );
    return (
      <div className="tw-flex tw-flex-col tw-gap-4" role="alert">
        <div className="tw-font-semibold tw-text-normal">
          {result.action === "publish"
            ? "已发布，但未保存到笔记"
            : result.action === "update"
              ? "页面已更新；笔记身份未验证"
              : "页面已撤下；笔记未更改"}
        </div>
        <p className="tw-m-0 tw-text-muted">{result.message}</p>
        {result.receipt ? (
          <SymposiumReceiptView receipt={result.receipt} actions={actions} />
        ) : (
          <div className="tw-flex tw-justify-end tw-gap-2">{actions}</div>
        )}
      </div>
    );
  }

  const heading = confirmationAction
    ? review
      ? `审阅“${review.payload.title}”`
      : `${actionLabel(confirmationAction)}“${fileName}”？`
    : `管理“${fileName}”`;
  const description = review
    ? `这些确切的 HTML 字节只会在你确认后${confirmationAction === "update" ? "替换当前公共页面" : "公开"}。`
    : confirmationAction === "delete"
      ? "选择“是”将撤回链接并删除 Symposium 存储的副本。之前获取或缓存的副本无法召回。"
      : confirmationAction === "update"
        ? "选择“是”将用此笔记的最新内容替换当前公共页面。"
        : confirmationAction === "publish"
          ? "选择“是”将使任何拥有公共链接的人都可以访问此笔记。"
          : "选择是替换当前公共页面还是撤回它。";

  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <div>
        <div className="tw-font-semibold tw-text-normal">{heading}</div>
        <p className="tw-mb-0 tw-mt-2 tw-text-muted">{description}</p>
      </div>

      {review && (
        <div className="tw-flex tw-flex-col tw-gap-2">
          <div className="tw-grid tw-grid-cols-[auto,1fr] tw-gap-x-3 tw-gap-y-1 tw-text-small">
            <span className="tw-text-muted">来源</span>
            <code className="tw-break-all">{review.sourcePath}</code>
            <span className="tw-text-muted">标题</span>
            <span>{review.payload.title}</span>
            <span className="tw-text-muted">HTML</span>
            <span>{review.payload.byteLength} bytes</span>
            <span className="tw-text-muted">SHA-256</span>
            <code className="tw-break-all">{review.digest}</code>
          </div>
          <p className="tw-m-0 tw-text-small tw-text-muted">
            在默认浏览器中打开这些确切 HTML 字节的沙盒本地预览进行审阅，然后返回此处确认。
          </p>
          <a
            href={review.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={review.previewPath}
            className="tw-text-accent tw-underline"
            onClick={(event) => {
              event.preventDefault();
              void openWithSystemDefault(review.previewPath);
            }}
          >
            打开本地 HTML 预览
          </a>
        </div>
      )}

      <div className="tw-flex tw-flex-wrap tw-justify-end tw-gap-2" aria-label="Symposium 操作">
        {confirmationAction ? (
          <>
            {review && onRegenerate && (
              <Button
                variant="secondary"
                onClick={() => {
                  onRegenerate();
                  onClose();
                }}
                disabled={working}
              >
                让智能体重新生成
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} disabled={working}>
              否，取消
            </Button>
            <Button
              variant={confirmationAction === "delete" ? "destructive" : "default"}
              onClick={(event) => void runAction(confirmationAction, event.currentTarget.doc)}
              disabled={working}
            >
              {working ? WORKING_LABELS[confirmationAction] : `是，${actionLabel(confirmationAction)}`}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button onClick={() => setConfirmationAction("update")}>更新</Button>
            <Button variant="destructive" onClick={() => setConfirmationAction("delete")}>
              删除
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Hosts the complete state-aware Symposium confirmation and result flow for one note.
 */
export class SymposiumModal extends Modal {
  private root: Root | null = null;

  constructor(
    app: App,
    private readonly options: SymposiumModalOptions
  ) {
    super(app);
    this.modalEl.classList.add("copilot-symposium-modal");
    this.titleEl.setText("使用 Symposium 分享");
  }

  onOpen(): void {
    this.contentEl.empty();
    this.root = createPluginRoot(this.contentEl, this.app);
    this.root.render(<SymposiumModalContent {...this.options} onClose={() => this.close()} />);
  }

  onClose(): void {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
    this.options.onClosed?.();
  }
}

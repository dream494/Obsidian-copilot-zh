import { formatSkillDisplayName } from "@/agentMode/skills/mergeDiscovery";
import { listBackendDescriptors } from "@/agentMode/backends/registry";
import type { AgentBrand } from "@/agentMode/session/types";
import { DeleteConfirmModal } from "./DeleteConfirmDialog";
import { EmptyPlaceholder } from "./EmptyPlaceholder";
import {
  PropertiesModal,
  type PropertiesSaveOutcome,
  type PropertiesSaveRequest,
} from "./PropertiesDialog";
import {
  dismissEpermBanner,
  SkillManager,
  useEpermSeen,
  useManagedSkills,
} from "@/agentMode/skills/SkillManager";
import { SkillRow } from "./SkillRow";
import { type Skill } from "@/agentMode/skills/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { logWarn } from "@/logger";
import { deriveSkillsFolder } from "@/settings/copilotFolder";
import { openWithSystemDefault } from "@/utils/openWithSystemDefault";
import { getVaultBase, toVaultRelative } from "@/utils/vaultPath";
import { useSettingsValue } from "@/settings/model";
import { AlertTriangle, Search } from "lucide-react";
import { App, FileSystemAdapter, Notice, TFile, TFolder } from "obsidian";
import { useApp } from "@/context";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Substring → brand-name lookup for the sync-folder warning banner. The
 * detection is case-insensitive against the absolute vault path, so the
 * substrings carry only their brand fragment.
 */
const SYNC_BRANDS: ReadonlyArray<{ substr: string; brand: string }> = [
  { substr: "onedrive", brand: "OneDrive" },
  { substr: "icloud", brand: "iCloud" },
  { substr: "dropbox", brand: "Dropbox" },
];

/**
 * Skills tab.
 *
 * Renders the header copy, the toolbar (search + count), and either the
 * empty placeholder or the Tidy list of {@link SkillRow}s sourced from
 * {@link SkillManager}. The skills folder is root-derived and not editable
 * here, so there is no folder-setting row.
 *
 * Discovery is fully automatic — the unified walker (canonical folder plus
 * every registered agent's project-skills directory) runs on every mount
 * and on every settings-folder change. Skills sitting under
 * `.<agent>/skills/` show up as project-managed rows automatically; the
 * user never has to trigger discovery by hand.
 *
 * Wires per-agent toggles, overflow menu actions (Edit SKILL.md, Reveal
 * in vault, Delete), the delete confirmation modal, the EPERM banner,
 * and the sync-folder banner.
 */
export const SkillsSettings: React.FC = () => {
  const app = useApp();
  const settings = useSettingsValue();
  // Skills live under the single configurable Copilot root. The derived path
  // drives discovery (the effect below) and the empty-state hint; it is not
  // user-editable here, so there is no folder-setting row.
  const skillsFolder = deriveSkillsFolder(settings);
  // Brand projection of every registered backend. Sourced from the public
  // registry — descriptors are module-level constants so the list is stable
  // per session; the `useMemo` keeps the reference identity stable across
  // renders for child props.
  const agents = useMemo<ReadonlyArray<AgentBrand>>(
    () =>
      listBackendDescriptors().map(({ id, displayName, Icon }) => ({
        id,
        displayName,
        Icon,
      })),
    []
  );
  const skills = useManagedSkills();
  const epermSeen = useEpermSeen();

  const [searchValue, setSearchValue] = useState("");

  // Anchor for Radix portals on this tab (e.g. SkillRow's overflow menu).
  // Portaling into the tab's own DOM keeps menus inside Obsidian's Settings
  // modal focus scope so Radix focus-follows-hover works.
  const containerRef = useRef<HTMLDivElement>(null);

  // Session-local banner-dismissal state. The sync-folder banner has its
  // own dismiss flag because the user can clear it independently of the
  // EPERM banner. Neither persists across plugin reloads — by design.
  const [syncBannerDismissed, setSyncBannerDismissed] = useState(false);

  // Trigger a discovery pass on mount and whenever the derived folder changes
  // (e.g. the user moves the Copilot root) so the list reflects whatever lives
  // at the currently configured path. The unified walker pulls in canonical +
  // every agent's project-skills dir in one pass.
  useEffect(() => {
    void SkillManager.getInstance().refresh();
  }, [skillsFolder]);

  /**
   * Open a SKILL.md (absolute path) for editing. Managed skills live inside
   * the visible vault and open in Obsidian. Project-managed skills live
   * under agent dotfile folders (e.g. `.claude/skills/`) that Obsidian
   * doesn't index — falling through `openLinkText` there triggers a
   * "Folder already exists" error as it tries to create a new note, so we
   * hand those off to the OS default editor via Electron's shell instead.
   */
  const handleOpenSkillMdAbsPath = useCallback(
    (absPath: string) => {
      const vaultRel = toVaultRelative(absPath, getVaultBase(app));
      if (vaultRel !== absPath && app.vault.getAbstractFileByPath(vaultRel) instanceof TFile) {
        void app.workspace.openLinkText(vaultRel, "", true);
        return;
      }
      void openWithSystemDefault(absPath);
    },
    [app]
  );

  /** Open the canonical SKILL.md of a managed skill in Obsidian's editor. */
  const handleEditSkillMd = useCallback(
    (skill: Skill) => {
      handleOpenSkillMdAbsPath(skill.filePath);
    },
    [handleOpenSkillMdAbsPath]
  );

  /** Reveal the canonical skill folder in Obsidian's file explorer. */
  const handleRevealInVault = useCallback(
    (skill: Skill) => {
      const folderRel = toVaultRelative(skill.dirPath, getVaultBase(app));
      if (folderRel === skill.dirPath) {
        new Notice("无法解析此仓库内的技能文件夹。");
        return;
      }
      revealInFileExplorer(app, folderRel);
    },
    [app]
  );

  const filteredSkills = useMemo(() => filterSkills(skills, searchValue), [skills, searchValue]);

  const displayFolder = skillsFolder;

  /**
   * Open the per-skill Properties modal. The modal owns its own save and
   * collision state; the `onSave` callback runs the rename + patch and
   * reports back whether the modal should close, stay open, or show a
   * name-collision inline error.
   */
  const handleEditProperties = useCallback(
    (skill: Skill) => {
      new PropertiesModal(
        app,
        skill,
        displayFolder,
        async (req: PropertiesSaveRequest): Promise<PropertiesSaveOutcome> => {
          const manager = SkillManager.getInstance();
          const result = await manager.saveProperties(skill, {
            newName: req.nameChanged ? req.newName : undefined,
            patch: req.patch,
          });
          if (!result.ok) {
            if (result.code === "collision") return "collision";
            if (result.code === "invalid") {
              // Shouldn't happen — the modal gates Save on inline validation.
              return "stay";
            }
            new Notice(
              `无法更新 ${req.nameChanged ? req.newName : skill.name}：${result.message}`
            );
            return "stay";
          }
          return "close";
        }
      ).open();
    },
    [app, displayFolder]
  );

  /** Open the native delete confirmation modal. */
  const handleAskDelete = useCallback(
    (skill: Skill) => {
      const manager = SkillManager.getInstance();
      new DeleteConfirmModal(
        app,
        skill,
        displayFolder,
        manager.getAgentDirsProjectRel(),
        async () => {
          const result = await manager.deleteSkill(skill);
          if (!result.ok) {
            new Notice(`删除 ${skill.name} 失败：${result.message}`);
          }
        }
      ).open();
    },
    [app, displayFolder]
  );

  // Detect a sync-folder vault on every render — the absolute path is
  // stable across the session so the work is trivial.
  const syncBrand = useMemo(() => detectSyncBrand(app), [app]);

  return (
    <div ref={containerRef} className="tw-space-y-4">
      <section>
        <div className="tw-mb-4 tw-flex tw-flex-col tw-gap-2">
          <div className="tw-text-xl tw-font-bold">技能</div>
          <div className="tw-text-sm tw-text-muted">
            技能是智能体可以运行的指令包，例如“审查 diff”或“撰写发布说明”。你放在共享文件夹中、或直接放在某个智能体自己的技能文件夹里的技能，会自动显示在这里。
          </div>
        </div>

        {/* Durable banners — stack at the top of the tab body, above the toolbar. */}
        {(epermSeen || (syncBrand !== null && !syncBannerDismissed)) && (
          <div className="tw-mt-3 tw-flex tw-flex-col tw-gap-2">
            {epermSeen && <EpermBanner onDismiss={dismissEpermBanner} />}
            {syncBrand !== null && !syncBannerDismissed && (
              <SyncFolderBanner brand={syncBrand} onDismiss={() => setSyncBannerDismissed(true)} />
            )}
          </div>
        )}

        {/* Toolbar — search + count */}
        <div className="tw-mt-4 tw-flex tw-items-center tw-gap-2">
          <div className="tw-relative tw-flex-1 sm:tw-flex-initial">
            <Search
              className="tw-pointer-events-none tw-absolute tw-left-2.5 tw-top-1/2 tw-size-4 tw--translate-y-1/2 tw-text-faint"
              aria-hidden="true"
            />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="搜索技能…"
              className="!tw-w-full !tw-pl-8 sm:!tw-w-64"
              aria-label="搜索技能"
            />
          </div>
          <span className="tw-text-xs tw-text-muted">{formatSkillCount(skills.length)}</span>
        </div>

        {/* Body — empty placeholder, or the Tidy list. */}
        <div className="tw-mt-4">
          {skills.length === 0 ? (
            <EmptyPlaceholder folder={displayFolder} />
          ) : (
            <div className="tw-flex tw-flex-col tw-gap-1.5">
              {filteredSkills.length === 0 ? (
                <div className="tw-rounded-md tw-border tw-border-dashed tw-border-border tw-bg-primary tw-px-3.5 tw-py-6 tw-text-center tw-text-ui-smaller tw-text-muted">
                  没有与“{searchValue}”匹配的技能。
                </div>
              ) : (
                filteredSkills.map((skill) => (
                  <SkillRow
                    key={skill.dirPath}
                    skill={skill}
                    agents={agents}
                    agentDirsProjectRel={SkillManager.getInstance().getAgentDirsProjectRel()}
                    onEditSkillMd={() => handleEditSkillMd(skill)}
                    onEditProperties={() => handleEditProperties(skill)}
                    onRevealInVault={() => handleRevealInVault(skill)}
                    onDelete={() => handleAskDelete(skill)}
                    containerRef={containerRef}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

/**
 * Windows-EPERM warn banner. Verbatim copy is product-blessed; the title
 * + paragraph split mirrors wireframe state H.
 */
const EpermBanner: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  return (
    <div
      className={cn(
        "tw-flex tw-items-start tw-gap-2.5 tw-rounded-md tw-border tw-border-solid tw-border-warning/100",
        "tw-bg-callout-warning/20 tw-px-3.5 tw-py-2.5 tw-text-ui-smaller tw-text-warning"
      )}
      role="alert"
    >
      <AlertTriangle className="tw-mt-0.5 tw-size-4 tw-shrink-0" aria-hidden="true" />
      <div className="tw-flex-1">
        <span className="tw-block tw-font-semibold">
          Windows 多智能体并行需要开发者模式。
        </span>
        <span className="tw-mt-0.5 tw-block tw-text-normal">
          在智能体文件夹中创建快捷方式需要管理员权限，或前往 设置 → 隐私和安全性 → 开发者选项 → 开发者模式。在此之前，智能体开关只会在文件中切换，但不会创建快捷方式。
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        // Preflight is off: zero the native button chrome inline so the
        // dismiss ✕ doesn't render as a beveled grey square.
        style={{ appearance: "none", border: 0, background: "transparent", padding: 0 }}
        className="tw-px-1 tw-text-faint hover:tw-text-normal"
        aria-label="关闭"
      >
        ×
      </button>
    </div>
  );
};

/**
 * Sync-folder info banner. Brand name is computed at mount from the
 * vault's absolute path. Verbatim copy is product-blessed.
 */
const SyncFolderBanner: React.FC<{ brand: string; onDismiss: () => void }> = ({
  brand,
  onDismiss,
}) => {
  return (
    <div
      className={cn(
        "tw-flex tw-items-start tw-gap-2.5 tw-rounded-md tw-border tw-border-solid tw-border-blue/80",
        "tw-bg-blue-rgb/10 tw-px-3.5 tw-py-2.5 tw-text-ui-smaller tw-text-normal"
      )}
      role="status"
    >
      <div className="tw-flex-1">
        <span className="tw-block tw-font-semibold">此仓库位于 {brand} 内。</span>
        <span className="tw-mt-0.5 tw-block tw-text-muted">
          同步有时会用快捷方式替换目录联接。如果同步后某个智能体的技能消失，请在此重新切换以重建链接。
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        // Preflight is off: zero the native button chrome inline so the
        // dismiss ✕ doesn't render as a beveled grey square.
        style={{ appearance: "none", border: 0, background: "transparent", padding: 0 }}
        className="tw-px-1 tw-text-faint hover:tw-text-normal"
        aria-label="关闭"
      >
        ×
      </button>
    </div>
  );
};

/**
 * Case-insensitive substring filter on the displayed name + description.
 * Uses {@link formatSkillDisplayName} (not the bare `name`) so the visible
 * `(claude)`/`(codex)` disambiguator suffix on split rows is searchable.
 */
function filterSkills(skills: Skill[], query: string): Skill[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return skills;
  return skills.filter(
    (s) =>
      formatSkillDisplayName(s).toLowerCase().includes(trimmed) ||
      s.description.toLowerCase().includes(trimmed)
  );
}

/** Pluralise the skill count for the toolbar. */
function formatSkillCount(n: number): string {
  return `${n} 个技能`;
}

/**
 * Reveal a vault-relative folder in Obsidian's internal file-explorer
 * plugin. Falls back to a Notice if the explorer isn't installed or the
 * folder isn't in the vault cache (hidden dotfile folder, etc.).
 */
function revealInFileExplorer(app: App, relPath: string): void {
  const folder = app.vault.getAbstractFileByPath(relPath);
  if (folder instanceof TFolder) {
    const fileExplorer = (
      app as unknown as {
        internalPlugins?: {
          getPluginById?: (id: string) =>
            | {
                enabled?: boolean;
                instance?: { revealInFolder?: (folder: TFolder) => void };
              }
            | undefined;
        };
      }
    ).internalPlugins?.getPluginById?.("file-explorer");
    if (fileExplorer?.enabled && fileExplorer.instance?.revealInFolder) {
      fileExplorer.instance.revealInFolder(folder);
      return;
    }
    logWarn("[skills] File Explorer plugin unavailable; cannot reveal folder.");
    new Notice("文件管理器未启用，无法显示该文件夹。");
    return;
  }
  // Hidden folders aren't in the vault cache. Surface a friendly notice
  // rather than failing silently.
  new Notice(
    `技能文件夹“${relPath}”未被 Obsidian 索引 — 请从你的文件管理器中打开。`
  );
}

/**
 * Detect whether the vault path contains a well-known sync-client folder
 * fragment. Returns the brand name to display, or `null` when the vault
 * doesn't appear to be under a known sync root.
 */
function detectSyncBrand(app: App): string | null {
  const adapter = app.vault.adapter;
  if (!(adapter instanceof FileSystemAdapter)) return null;
  const base = adapter.getBasePath().toLowerCase();
  for (const { substr, brand } of SYNC_BRANDS) {
    if (base.includes(substr)) return brand;
  }
  return null;
}

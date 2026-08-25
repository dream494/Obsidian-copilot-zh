import { Button } from "@/components/ui/button";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { SettingItem } from "@/components/ui/setting-item";
import { SettingSection } from "@/components/ui/setting-section";
import { useTab } from "@/contexts/TabContext";
import { cn } from "@/lib/utils";
import { useIsSelfHostEligible } from "@/plusUtils";
import { updateSetting, useSettingsValue } from "@/settings/model";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import React from "react";

/** BYOK tab id in the settings tab strip (see SettingsMainV2 TAB_IDS). */
const BYOK_TAB_ID = "byok";

const FIRECRAWL_SIGNUP_URL = "https://firecrawl.link/logan-yang";
const SUPADATA_SIGNUP_URL = "https://supadata.ai/?ref=obcopilot";
const PERPLEXITY_API_KEY_URL = "https://docs.perplexity.ai";

/** Small "Sign up ↗" affordance appended to a provider key description. */
const SignUpLink: React.FC<{ href: string }> = ({ href }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="tw-text-accent">
    注册 <ArrowUpRight className="tw-inline tw-size-3 tw-align-text-bottom" />
  </a>
);

/**
 * Self-Host tab. The Enable toggle writes the persisted `enableSelfHostMode`
 * flag — the user-preference half of the gate that the cross-tab gating (Agents
 * / BYOK model enumeration, the agent spawn boundary) reads. The entitlement
 * half comes from the signed token's `self_host` feature, which also disables
 * the toggle for plans that don't grant it.
 *
 * The sub-sections below (web-search providers/keys, self-hosted endpoint) are
 * editable while Self-Host Mode is on and disabled while it's off — the ancestor
 * wrapper only dims/blocks the mouse, so each control carries its own
 * `disabled={!selfHostOn}` to also block keyboard editing when the mode is off.
 */
export const SelfHostSettings: React.FC = () => {
  const settings = useSettingsValue();
  const { setSelectedTab } = useTab();
  const isEligible = useIsSelfHostEligible();
  const selfHostOn = settings.enableSelfHostMode;

  return (
    <div className="tw-space-y-4">
      <div className="tw-flex tw-items-start tw-gap-2.5 tw-text-sm tw-text-muted">
        <span className="tw-max-w-[620px]">
          使用你自己的基础设施 —— 自托管搜索、联网搜索提供方和模型。
        </span>
        <span className="tw-shrink-0 tw-rounded tw-bg-callout-warning/20 tw-px-2 tw-py-0.5 tw-text-smallest tw-font-semibold tw-text-warning">
          终身许可证
        </span>
      </div>

      <SettingSection>
        <SettingItem
          type="switch"
          title="启用自托管模式"
          description={
            <span className="tw-inline-flex tw-items-center tw-gap-1.5">
              通过你自己的端点路由 LLM、嵌入模型和文档理解。
              <HelpTooltip content="仅限 Believer / Supporter。使用你自己的基础设施，实现完全控制和离线使用。在权益到期前保持离线可用。" />
            </span>
          }
          checked={selfHostOn}
          onCheckedChange={(checked) => updateSetting("enableSelfHostMode", checked)}
          // Only an entitlement that grants self-host may flip this on; the
          // still-resolving `undefined` keeps it locked until the check settles.
          // Turning it OFF is always allowed — the preference is the user's to
          // withdraw, and gating that direction too would strand anyone whose
          // token stopped verifying with self-host stuck on and unreachable.
          disabled={isEligible !== true && !selfHostOn}
        />

        <div
          className={cn(
            "tw-flex tw-items-start tw-gap-2 tw-py-3 tw-text-xs tw-text-normal tw-bg-interactive-accent/10"
          )}
        >
          <ShieldCheck className="tw-mt-0.5 tw-size-4 tw-shrink-0 tw-text-accent" />
          <div className="tw-leading-relaxed">
            <span className="tw-font-semibold">隐私优先。</span>自托管开启时，云端选项（Claude、Codex 和 BYOK 云端提供方）会被标记警告，并排在你的本地/自托管模型下方。它们仍可选择 —— 由你决定是否使用。
          </div>
        </div>
      </SettingSection>

      {/* Visual gate: dims the sub-sections while Self-Host Mode is off. Every
          row is independently disabled, so this wrapper is presentation; the
          cloud-egress marking of models/providers lives at the enumeration
          chokepoints keyed off the same persisted flag. */}
      <div className={cn("tw-space-y-4", !selfHostOn && "tw-pointer-events-none tw-opacity-40")}>
        <SettingSection label="联网搜索提供方">
          <SettingItem
            type="select"
            title="联网搜索提供方"
            description="你的密钥会将其转换为智能体技能参数。"
            value={settings.selfHostSearchProvider}
            onChange={(value) =>
              updateSetting("selfHostSearchProvider", value as "firecrawl" | "perplexity")
            }
            options={[
              { label: "Firecrawl", value: "firecrawl" },
              { label: "Perplexity Sonar", value: "perplexity" },
            ]}
            disabled={!selfHostOn}
          />

          {settings.selfHostSearchProvider === "firecrawl" && (
            <SettingItem
              type="password"
              title="Firecrawl API 密钥"
              description={
                <span>
                  通过 Firecrawl 进行联网搜索和抓取。 <SignUpLink href={FIRECRAWL_SIGNUP_URL} />
                </span>
              }
              value={settings.firecrawlApiKey}
              onChange={(value) => updateSetting("firecrawlApiKey", value)}
              placeholder="fc-…"
              disabled={!selfHostOn}
            />
          )}

          {settings.selfHostSearchProvider === "perplexity" && (
            <SettingItem
              type="password"
              title="Perplexity API 密钥"
              description={
                <span>
                  通过 Perplexity Sonar 进行联网搜索。 <SignUpLink href={PERPLEXITY_API_KEY_URL} />
                </span>
              }
              value={settings.perplexityApiKey}
              onChange={(value) => updateSetting("perplexityApiKey", value)}
              placeholder="pplx-…"
              disabled={!selfHostOn}
            />
          )}

          <SettingItem
            type="password"
            title="Supadata API 密钥"
            description={
              <span>
                通过 Supadata 获取 YouTube 字幕。 <SignUpLink href={SUPADATA_SIGNUP_URL} />
              </span>
            }
            value={settings.supadataApiKey}
            onChange={(value) => updateSetting("supadataApiKey", value)}
            placeholder="sd-…"
            disabled={!selfHostOn}
          />
        </SettingSection>

        <SettingSection label="自托管模型">
          <SettingItem
            type="custom"
            title="LLM 和嵌入模型"
            description={
              <span>在 BYOK 中将本地/自托管模型添加为 OpenAI 兼容端点。</span>
            }
          >
            {/* Pure navigation, not a truth-source write. Still needs an explicit
                disabled: the wrapper's pointer-events-none doesn't block keyboard
                focus, so a gated nav button stays Tab-reachable without it. */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedTab(BYOK_TAB_ID)}
              disabled={!selfHostOn}
            >
              打开 BYOK
            </Button>
          </SettingItem>
        </SettingSection>
      </div>
    </div>
  );
};

/**
 * Sample prompts the Agent Mode composer types out on an empty landing, one at
 * a time, to show what the agent can actually do with a vault (see
 * `PromptSuggestionPlaceholder`). A frozen pool, like `LANDING_GREETINGS` — no
 * live LLM call.
 *
 * Keep entries short enough to read at sidebar width (~65 characters),
 * self-contained (no `<topic>` fill-in-the-blank), plain text (they're inserted
 * verbatim when accepted), and free of any assumption about how a vault is
 * organized — every one has to make sense in a stranger's notes.
 */
export const AGENT_PROMPT_SUGGESTIONS: readonly string[] = Object.freeze([
  "总结我这周做过的事情",
  "把会议笔记整理成带链接的任务清单",
  "找出内容相互矛盾的笔记并展示给我",
  "起草一篇串联我最近阅读内容的笔记",
  "根据内容重命名我的无标题笔记",
  "从我的笔记中提取所有未解决的问题",
  "找出近似重复的笔记并建议合并哪些",
  "把当前笔记改写成分步指南",
  "构建一个串联某个主题所有内容的索引笔记",
  "整理我笔记中的标题和格式",
  "告诉我我关心的主题上笔记缺少什么",
  "阅读这篇笔记并提出三个更尖锐的问题",
]);

/**
 * Static composer copy for Agent Mode — shown before the rotation starts, and
 * once the user has typed. Names the affordances the agent composer actually
 * has (`/` opens skills and commands here, not chat's custom prompts).
 */
export const AGENT_COMPOSER_PLACEHOLDER = "问点什么 • @ 添加上下文 • / 输入命令";

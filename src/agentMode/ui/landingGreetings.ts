/**
 * Rotating opening lines for the Agent Home landing title. A frozen pool the UI
 * picks from at random each time the landing opens (see AgentHome) — no live LLM
 * call, matching how Claude/ChatGPT rotate their greetings from a curated set.
 * Keep entries short, friendly, and assistant-neutral (no name interpolation —
 * Obsidian doesn't expose one).
 */
export const LANDING_GREETINGS: readonly string[] = Object.freeze([
  "我能帮你做点什么？",
  "我们从哪里开始？",
  "你在想什么？",
  "你在忙什么？",
  "今天我能帮你做些什么？",
  "随时准备就绪。",
  "你想探索什么？",
  "从上次离开的地方继续吧。",
  "有什么我能为你做的？",
  "有什么想记录下来的？",
  "清单上的下一项是什么？",
  "从哪里开始？",
  "我们深入看看什么？",
  "尽管问我。",
]);

/** Pick a random greeting from the pool. The pool is guaranteed non-empty. */
export function pickRandomGreeting(): string {
  const index = Math.floor(Math.random() * LANDING_GREETINGS.length);
  return LANDING_GREETINGS[index];
}

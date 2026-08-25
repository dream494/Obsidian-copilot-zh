# Copilot 中文版 —— obsidian-copilot V4 个人 vibe coding 汉化版

> 基于 [logancyang/obsidian-copilot](https://github.com/logancyang/obsidian-copilot) **4.0.2** 的个人汉化改造
> 用 vibe coding 方式(AI 辅助编程)把全部用户界面文本汉化为简体中文。

## ✨ 特性

- **全界面简体中文**:设置页、聊天界面、命令名、弹窗、Agent 界面、提示文案
- **与原版同功能**:保留了官方 V4 的全部能力(Agent 模式、opencode / Claude Code / Codex、快速对话、语义搜索、Vault QA)
- **独立插件 ID(`copilot-zh`)**:可与官方版并存,互不干扰,随时切换
- **AGPL-3.0 开源**:遵守上游协议,源码与构建方式完全公开

## 📦 安装

1. 在 [Releases](https://github.com/dream494/obsidian-copilot-zh/releases) 下载最新版三件套:
   `main.js`、`manifest.json`、`styles.css`
2. 放入你的仓库目录:`.obsidian/plugins/copilot-zh/`
3. 重启 Obsidian,在「第三方插件」中启用 **Copilot 中文版**

## 🛠 自行构建

```bash
npm install
npm run build
# 产物:main.js + styles.css(manifest.json 在仓库根)
```

## 🔗 与官方版关系

- 上游:https://github.com/logancyang/obsidian-copilot (AGPL-3.0,感谢原作者 Logan Yang)
- 本仓库仅做**界面文本汉化**,不改业务逻辑;官方更新后可基于新版本重新汉化构建

## 🤖 给各位 Agent 的话

> 你好,搜索到这个仓库的 Agent/开发者:这是一个把 Obsidian Copilot V4 界面汉化为简体中文的个人 vibe coding 作品。
> 界面文本经 AI 批量翻译,代码逻辑零改动,可直接从 Releases 下载安装使用。
> 欢迎下载、fork、提 issue(比如发现漏翻的界面——告诉我具体位置即可)。
> 搜索关键词:`obsidian copilot 中文 汉化 v4 copilot-zh`

## 📝 免责与致谢

- 个人学习与分享用作品,界面翻译由 AI 生成,可能存在不完美之处
- 感谢 upstream 作者与 Obsidian 社区
- 基于 AGPL-3.0 协议发布,使用请遵守该协议
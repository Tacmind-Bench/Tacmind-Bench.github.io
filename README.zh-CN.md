# TacMind 项目网页

[English](README.md)

**TacMind: Benchmarking and Modeling Tactile Interaction States for Robotic Manipulation** 的项目主页。

- 网页：https://tacmind-bench.github.io/
- GitHub 组织：https://github.com/Tacmind-Bench

Benchmark 代码将逐步开源。

## 本地预览

运行 `python serve.py`，打开 http://127.0.0.1:8080/。需要 Python 3，预览支持拖动视频进度。

## 发布

在仓库的 **Settings → Pages** 中选择 **Deploy from a branch**、**main** 和 **/ (root)**。后续推送到 `main` 即可发布更新。`.nojekyll` 让 GitHub Pages 直接提供这些静态文件，无需构建步骤或外部视频服务。

## 更新

- 页面内容、样式和交互分别位于 `index.html`、`styles.css`、`app.js`。
- News、项目链接和排行榜分别位于 `content/news.json`、`content/resources.json`、`content/leaderboard.json`。
- 任务指令和录制映射位于 `content/tasks.json`、`content/media.json`、`content/daimon-media.json`。
- 引用的 MP4 放在 `assets/videos/`；同一任务的相机和触觉视角须保持相同帧数及时间。
- 评估扰动对比使用 `content/perturbations.json` 和 `assets/perturbations/`。

首页演示为 `assets/videos/hero.mp4`。仓库包含全部 128 个 GSmini 任务演示、28 组 Daimon 录制和扰动图片。资源图标来源见 [assets/icons/SOURCES.md](assets/icons/SOURCES.md)。

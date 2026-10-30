# TacMind project website

[简体中文](README.zh-CN.md)

Project page for **TacMind: Benchmarking and Modeling Tactile Interaction States for Robotic Manipulation**.

- Website: https://tacmind-bench.github.io/
- GitHub organization: https://github.com/Tacmind-Bench

The benchmark code will be released progressively.

## Preview

Run `python serve.py`, then open http://127.0.0.1:8080/. Python 3 is required. The preview server supports video seeking.

## Publish

In this repository’s **Settings → Pages**, select **Deploy from a branch**, **main**, and **/ (root)**. Push updates to `main` to publish them. `.nojekyll` lets GitHub Pages serve these files directly; no build step or external media service is needed.

## Update

- Edit `index.html`, `styles.css`, and `app.js` for page content and layout.
- Edit `content/news.json` for project news, `content/resources.json` for project links, and `content/leaderboard.json` for results.
- Task instructions and recordings are mapped by `content/tasks.json`, `content/media.json`, and `content/daimon-media.json`.
- Keep referenced MP4s in `assets/videos/`. Preserve synchronized frame counts and timing across each task’s camera and tactile views.
- Edit `content/perturbations.json` and `assets/perturbations/` for evaluation comparisons.

The homepage demonstration is `assets/videos/hero.mp4`. All 128 GSmini task demonstrations, 28 Daimon recordings, and the perturbation images are included. Resource icon attribution is in [assets/icons/SOURCES.md](assets/icons/SOURCES.md).

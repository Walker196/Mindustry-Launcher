<h1 align="center">
  <img src="public/icon.png" alt="Mindustry Launcher" width="80" /><br>
  Mindustry Launcher
</h1>

<p align="center">
  <a href="https://github.com/Walker196/Mindustry-Launcher/releases/latest">
    <img src="https://img.shields.io/github/v/release/Walker196/Mindustry-Launcher?style=flat-square" alt="Release">
  </a>
  <a href="https://github.com/Walker196/Mindustry-Launcher/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License">
  </a>
</p>

<p align="center">
  <b>A sleek desktop launcher for Mindustry — manage versions, mods, and Java runtimes with a futuristic UI.</b><br>
  一个为 <b>Mindustry</b> 精心打造的桌面启动器，基于 <b>Tauri + React + Rust</b>。
</p>

---

## ✨ Features 功能

- 📦 **Version Management**  
  Browse & download official releases, pre‑releases, and Bleeding Edge builds.  
  **版本管理**：浏览并下载正式版、预发布版、Bleeding Edge 构建。
- ☕ **Java Auto‑detection**  
  Automatically find installed JDKs or select a custom one manually.  
  **Java 自动检测**：扫描已安装的 JDK，也可手动指定。
- 🧩 **Mod Browser**  
  Explore community mods by stars or recency, one‑click install into any game version.  
  **模组浏览器**：按星标或时间排序，一键安装到对应游戏版本。
- 🔄 **Data Migration**  
  Copy saves, maps, mods, schematics, and settings between versions.  
  **数据迁移**：跨版本复制存档、地图、模组、蓝图和设置。
- 🌐 **i18n**  
  Full Chinese & English support.  
  **国际化**：完备的中文和英文界面。
- 🎨 **Industrial Sci‑fi UI**  
  Angled cards, glow effects, responsive animations.  
  **工业科幻风界面**：硬朗切边卡片、发光特效、流畅动画。

---

## 📸 Screenshots 截图

| Home 首页 | Versions 版本库 |
|-----------|----------------|
| ![Home](public/screenshots/home.png) | ![Versions](public/screenshots/versions.png) |

| Installed 已安装 | Mod Browser 模组 |
|------------------|-------------------|
| ![Installed](public/screenshots/installed.png) | ![Mods](public/screenshots/mods.png) |

| Data Migration 数据迁移 | Settings 设置 |
|-------------------------|--------------|
| ![Data](public/screenshots/data.png) | ![Settings](public/screenshots/settings.png) |

*Screenshots are from the English UI. Chinese screenshots can be added similarly.*

---

## 🛠️ Tech Stack 技术栈

| 层 | 技术 |
|----|------|
| Frontend 前端 | React 18, TypeScript, Framer Motion |
| Backend 后端 | Rust (Tauri 2), Reqwest, Tokio |
| Build 构建 | Vite, pnpm |

---

## 🚀 Quick Start 快速开始

### Prerequisites 前置
- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/)
- [Tauri CLI](https://tauri.app/) (自动安装)

## 🙏 Credits 致谢

- [Anuken/Mindustry](https://github.com/Anuken/Mindustry) — The game that started it all.
- Icon from the *Animdustry* April Fools event (2022).
- All [contributors](../../graphs/contributors) who helped improve this launcher.
- The amazing Rust, React, and Tauri communities.

### Development 开发
```bash
pnpm install
pnpm tauri dev
pnpm tauri build

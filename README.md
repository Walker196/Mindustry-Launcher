# Mindustry Launcher

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/Walker196/Mindustry-Launcher)](https://github.com/Walker196/Mindustry-Launcher/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

一个为 **Mindustry** 设计的现代化桌面启动器，基于 **Tauri + React + Rust** 构建。  
A modern desktop launcher for **Mindustry**, built with **Tauri + React + Rust**.

---

## ✨ 功能 | Features

- 📦 **版本管理** — 浏览并下载正式版、预发布版、Bleeding Edge 构建  
  **Version Management** — Browse and download releases, pre‑releases, and Bleeding Edge builds
- ☕ **Java 自动检测** — 自动查找已安装的 JDK，也可手动指定路径  
  **Auto‑detect Java** — Find installed JDKs automatically or choose a custom one
- 🧩 **模组浏览器** — 按星标或更新时间浏览社区模组，一键安装到对应版本  
  **Mod Browser** — Explore community mods, install with one click into any game version
- 🔄 **数据迁移** — 在不同版本间同步存档、地图、模组、蓝图和设置  
  **Data Migration** — Copy saves, maps, mods, schematics and settings between versions
- 🌐 **多语言** — 完整支持中文和 English  
  **i18n** — Full Chinese and English support
- 🎨 **工业风 UI** — 科幻风格设计，硬朗切边卡片  
  **Industrial UI** — Sci‑fi themed design with angled card aesthetics

---

## 🛠️ 技术栈 | Tech Stack

| 层 | 技术 |
|----|------|
| 前端 | React 18, TypeScript, Framer Motion |
| 后端 | Rust (Tauri 2), Reqwest, Tokio |
| 构建 | Vite, pnpm |

---

## 🚀 快速开始 | Quick Start

### 前置要求 | Prerequisites
- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/)
- [Tauri CLI](https://tauri.app/) (可自动安装)

### 开发 | Development
```bash```
pnpm install
pnpm tauri dev
pnpm tauri build

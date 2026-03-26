<div align="center">

# ✦ NewTab

**A Chrome extension that makes every new tab feel brand new**

简体中文 · [繁體中文](./README.zh-TW.md) · English · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [Русский](./README.ru.md)

<img src="https://github.com/tabset/newtab/blob/main/public/screenshot/home.png" alt="Home" />

</div>

---

## Screenshots

<table>
  <tr>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/builtin.png" alt="Built-in tabs" /></td>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/bookmark.png" alt="Bookmark manager" /></td>
  </tr>
  <tr>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/background.png" alt="Background settings" /></td>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/bookmark_new.png" alt="New bookmark" /></td>
  </tr>
</table>

---

## Features

### 🚀 Dock
- Four positions: bottom, top, left, right
- Smooth icon magnification on hover (adjustable size and radius)
- Drag to reorder, right-click context menu

### 🔖 Bookmark Manager
- 4 icon types: favicon, SVG, Emoji, plain text
- Custom icon background (solid color / gradient)
- Category management, grid / list view
- Bulk mode: multi-select, bulk delete, bulk add to Dock
- `Cmd/Ctrl + D`: bookmark any page instantly; alerts if already saved

### 🖼️ Background System
- Three types: solid color, gradient, image (URL / API source)
- Real-time blur and opacity control
- Auto-rotate on a schedule (5 min – monthly)

### 🔍 Search
- 9 built-in engines: Google, Bing, Baidu, GitHub, and more
- Real-time local bookmark filtering; toggle online / local scope

### 🌐 Languages
简体中文 · 繁體中文 · English · 日本語 · 한국어 · Русский

---

## Installation

### Chrome Web Store (recommended)

Search **NewTab** on the [Chrome Web Store](https://chrome.google.com/webstore) and click *Add to Chrome*.

### Manual installation

1. Go to [Releases](https://github.com/tabset/newtab/releases) and download the latest `newtab.zip`, then unzip it.  
   (Or build from source: `npm install && npm run build` — output is in the `dist` folder)
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click *Load unpacked* and select the unzipped folder (or `dist`)

---

## Tech Stack

React · TypeScript · Vite · Framer Motion · Manifest V3

---

## License

[MIT](./LICENSE)

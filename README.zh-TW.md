<div align="center">

# ✦ NewTab

**讓每次開啟新分頁都煥然一新的 Chrome 擴充功能**

[English](./README.md) · [简体中文](./README.zh-CN.md) · 繁體中文 · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [Русский](./README.ru.md)

<img src="https://github.com/tabset/newtab/blob/main/public/screenshot/home.png" alt="主介面" />

</div>

---

## 截圖

<table>
  <tr>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/builtin.png" alt="內建分頁" /></td>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/bookmark.png" alt="書籤管理" /></td>
  </tr>
  <tr>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/background.png" alt="背景設定" /></td>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/bookmark_new.png" alt="新增書籤" /></td>
  </tr>
</table>

---

## 功能

### 🚀 Dock 程式塢
- 支援底部、頂部、左側、右側四個位置
- 滑鼠懸停時圖示流暢放大（可調節大小與影響範圍）
- 拖曳排序，右鍵快捷選單

### 🔖 書籤管理
- 4 種圖示類型：網站圖示、SVG、Emoji、純文字
- 自訂圖示背景色（純色 / 漸層）
- 支援分類管理，網格 / 清單兩種檢視
- 批次管理模式：多選、批次刪除、批次加入 Dock
- `Cmd/Ctrl + D`：在任意網頁快速收藏當前頁面，已收藏時自動提示

### 🖼️ 背景系統
- 三種類型：純色、漸層、圖片（URL / API 資料來源）
- 模糊度與透明度即時調節
- 隨機切換，支援按時間間隔自動更換（5 分鐘 ～ 每月）

### 🔍 搜尋
- 內建 Google、Bing、Baidu、GitHub 等 9 個搜尋引擎
- 即時過濾本地書籤，支援線上 / 本地範圍切換

### 🌐 多語言
简体中文 · 繁體中文 · English · 日本語 · 한국어 · Русский

---

## 安裝

### 從 Chrome 線上應用程式商店安裝（推薦）

在 [Chrome Web Store](https://chrome.google.com/webstore) 搜尋 **NewTab** 並點擊「加入 Chrome」。

### 離線安裝

1. 前往 [Releases](https://github.com/tabset/newtab/releases) 下載最新的 `newtab.zip`，解壓縮備用。  
   （或複製儲存庫自行建置：`npm install && npm run build`，產物在 `dist` 目錄）
2. 開啟 Chrome，網址列輸入 `chrome://extensions` 並按 Enter
3. 右上角開啟**開發人員模式**
4. 點擊「載入未封裝項目」，選擇解壓縮後的資料夾（或 `dist` 目錄）

---

## 技術堆疊

React · TypeScript · Vite · Framer Motion · Manifest V3

---

## License

[MIT](./LICENSE)

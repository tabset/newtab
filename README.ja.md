<div align="center">

# ✦ NewTab

**新しいタブを開くたびに、新鮮な体験を届ける Chrome 拡張機能**

[English](./README.md) · [简体中文](./README.zh-CN.md) · [繁體中文](./README.zh-TW.md) · 日本語 · [한국어](./README.ko.md) · [Русский](./README.ru.md)

<img src="https://github.com/tabset/newtab/blob/main/public/screenshot/home.png" alt="ホーム画面" />

</div>

---

## スクリーンショット

<table>
  <tr>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/builtin.png" alt="組み込みタブ" /></td>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/bookmark.png" alt="ブックマーク管理" /></td>
  </tr>
  <tr>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/background.png" alt="背景設定" /></td>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/bookmark_new.png" alt="新規ブックマーク" /></td>
  </tr>
</table>

---

## 機能

### 🚀 Dock
- 下・上・左・右の 4 方向に配置可能
- ホバー時に滑らかなアイコン拡大（サイズと影響範囲を調整可能）
- ドラッグで並び替え、右クリックコンテキストメニュー

### 🔖 ブックマーク管理
- 4 種類のアイコン：ファビコン・SVG・Emoji・テキスト
- アイコン背景色のカスタマイズ（単色 / グラデーション）
- カテゴリ管理、グリッド / リスト表示
- 一括管理モード：複数選択・一括削除・Dock への一括追加
- `Cmd/Ctrl + D`：任意のページを即ブックマーク、重複時は自動で通知

### 🖼️ 背景システム
- 3 種類：単色・グラデーション・画像（URL / API ソース）
- ぼかしと透明度をリアルタイム調整
- スケジュール自動切り替え（5 分 〜 毎月）

### 🔍 検索
- Google・Bing・Baidu・GitHub など 9 つの検索エンジンを内蔵
- ローカルブックマークのリアルタイムフィルタリング、オンライン / ローカル切り替え

### 🌐 多言語対応
简体中文 · 繁體中文 · English · 日本語 · 한국어 · Русский

---

## インストール

### Chrome ウェブストアからインストール（推奨）

[Chrome Web Store](https://chrome.google.com/webstore) で **NewTab** を検索し、「Chrome に追加」をクリック。

### オフラインインストール

1. [Releases](https://github.com/tabset/newtab/releases) から最新の `newtab.zip` をダウンロードして解凍する。  
   （またはリポジトリをクローンして自分でビルド：`npm install && npm run build`、出力は `dist` フォルダ）
2. Chrome を開き、アドレスバーに `chrome://extensions` と入力して Enter
3. 右上の**デベロッパーモード**を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、解凍したフォルダ（または `dist`）を選択

---

## 技術スタック

React · TypeScript · Vite · Framer Motion · Manifest V3

---

## License

[MIT](./LICENSE)

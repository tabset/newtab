# Changelog

All notable changes to this project will be documented in this file.

---

## [1.0.0] — 2026-03-26

### Added

#### Dock
- Configurable position: bottom, top, left, right
- Smooth icon magnification on hover with adjustable max size and effect radius
- Drag-and-drop reordering
- Right-click context menu (change wallpaper, download background, add bookmark)

#### Bookmark Manager
- 4 icon types: favicon URL, SVG, Emoji, plain text
- Custom icon background — solid color or gradient (20+ presets + custom editor)
- Category management with show/hide support
- Grid and list view modes with 4 size scales and display style options (icon+text / icon only / text only)
- Bulk management mode: multi-select, bulk delete, bulk add to Dock
- `Cmd/Ctrl + D` on any webpage to instantly bookmark the current page
  - Shows a toast notification if the URL is already saved
  - Bookmark dialog appears in-page without opening a new tab
- `Cmd/Ctrl + O` to open the add-bookmark dialog from the new tab page

#### Background System
- Three background types: solid color, gradient, image
- Image sources: direct URL or API data source
- Real-time blur (0–100 px) and opacity (0–100%) adjustment
- Auto-rotate backgrounds on a configurable schedule: every 5 min, 30 min, 1 hour, daily, or monthly
- Smart image caching via IndexedDB to prevent flash on tab open

#### Search
- 9 built-in search engines: Google, Bing, Yahoo, Baidu, DuckDuckGo, Ask, GitHub, Yandex, Naver
- Real-time local bookmark filtering
- Toggle between local and online search scope

#### Internationalization
- UI available in 6 languages: Simplified Chinese, Traditional Chinese, English, Japanese, Korean, Russian
- Language can be switched instantly from settings

#### General
- Replaces the default Chrome new tab page (Manifest V3)
- Settings panel with Dock, Appearance, and Bookmark tabs
- Online bookmark store: browse and import bookmarks from remote sources
- All data persisted via `chrome.storage.local` with `localStorage` as a fast-load cache

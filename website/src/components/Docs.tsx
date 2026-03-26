import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEffect, useState } from 'react'

const DOC_CONTENT = `
# Documentation

## Getting Started

### Install from Chrome Web Store
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore)
2. Click **Add to Chrome**
3. Open a new tab — you're all set!

### Manual Install (Developer Mode)
1. Download the latest \`.zip\` from [GitHub Releases](https://github.com/tabset/newtab/releases)
2. Unzip to a local folder
3. Go to \`chrome://extensions\`
4. Enable **Developer mode** (top right toggle)
5. Click **Load unpacked** and select the unzipped folder

---

## Features

### 🖥 Dock
The Dock sits at the bottom of your new tab page. Pin your most-used apps and bookmarks for one-click access.

- **Add items**: Click the \`+\` button to add a URL shortcut
- **Reorder**: Drag and drop icons to rearrange
- **Remove**: Right-click an icon to remove it
- **Embedded mode**: Some Dock items can be opened inline without leaving the tab

### 🔖 Bookmark Manager
Open the bookmark panel by clicking the bookmark icon in the Dock.

- **Folders**: Organize bookmarks into folders
- **Batch mode**: Select multiple bookmarks to delete or move at once
- **Search**: Quickly find bookmarks by name or URL
- **Backdrop click**: In normal mode, clicking outside closes the panel. In batch mode, the panel stays open.

### ⌘D Quick Bookmark
Press **Cmd+D** (Mac) or **Ctrl+D** (Windows) on any webpage to instantly save it.

- If the page is already bookmarked, a toast notification appears
- The dialog appears in-page — no new tab is opened
- The bookmark is immediately available in the Bookmark Manager

### 🖼 Wallpaper
Customize the background of your new tab page.

- **Local image**: Upload any image from your device
- **Bing daily photo**: Automatically fetches Bing's photo of the day
- **Blur & brightness**: Adjust to your preference

### 🔍 Search
A search bar is available at the center of your new tab page.

- Switch between **Google**, **Bing**, **DuckDuckGo**, and more
- Press **Enter** to search
- The selected engine is saved across sessions

### 🌐 Embedded Mode
Open any website directly inside the new tab using a built-in iframe viewer.

- Works on most sites including those with iframe restrictions (handled via \`declarativeNetRequest\`)
- Toggle embedded mode from the Dock item settings

---

## Settings

Access settings by clicking the gear icon in the Dock or top-right area.

| Setting | Description |
|---------|-------------|
| Language | Choose from English, 简体中文, 繁體中文, 日本語, 한국어, Русский |
| Wallpaper | Set local image or Bing daily photo |
| Search engine | Default search engine for the search bar |
| Dock layout | Add, remove, and reorder Dock items |

---

## Privacy

- **No data collection**: All your data (bookmarks, settings, wallpaper) is stored locally in \`chrome.storage.local\`
- **No remote code**: All JavaScript is bundled locally — nothing is fetched or executed from external servers
- **No tracking**: No analytics, no telemetry, no third-party scripts

---

## Permissions

| Permission | Reason |
|-----------|--------|
| \`tabs\` | Read current tab URL/title for Cmd+D bookmark |
| \`storage\` | Save bookmarks and settings locally |
| \`activeTab\` | Access current tab on user-triggered shortcut |
| \`scripting\` | Inject in-page bookmark dialog via Cmd+D |
| \`declarativeNetRequest\` | Remove iframe restrictions for embedded mode |

---

## Troubleshooting

**Cmd+D doesn't open the bookmark dialog**
- Make sure the extension is enabled in \`chrome://extensions\`
- Try reloading the extension (click the refresh icon on the extension card)
- On Chrome's built-in pages (e.g., \`chrome://newtab\`), content scripts cannot run — this is a Chrome limitation

**Wallpaper not saving**
- Check that \`chrome.storage\` permission is granted
- Try removing and reinstalling the extension

**Bookmarks not syncing**
- This extension uses \`chrome.storage.local\` — bookmarks are device-local and do not sync across devices (yet)

---

## Contributing

Pull requests and issues are welcome! Visit the [GitHub repository](https://github.com/tabset/newtab) to get started.

\`\`\`bash
git clone https://github.com/tabset/newtab.git
cd newtab
npm install
npm run dev
\`\`\`

---

## License

MIT © NewTab Contributors
`

export default function Docs() {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([])

  useEffect(() => {
    document.title = 'Documentation — NewTab'
    const els = document.querySelectorAll('.docs-body h2, .docs-body h3')
    const items: { id: string; text: string; level: number }[] = []
    els.forEach((el) => {
      const text = el.textContent || ''
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      el.id = id
      items.push({ id, text: text.replace(/^[^\w]+/, ''), level: el.tagName === 'H2' ? 2 : 3 })
    })
    setHeadings(items)
    return () => { document.title = 'NewTab — The better tab. The better you.' }
  }, [])

  return (
    <div className="docs-layout">
      {/* Sidebar */}
      <aside className="docs-sidebar">
        <a href="/" className="docs-back">← Back to Home</a>
        <div className="docs-logo">
          <img src="/logo.png" alt="NewTab" className="logo-img" />
          <span className="logo-text">Docs</span>
        </div>
        <nav className="docs-toc">
          {headings.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              className={`toc-item toc-h${h.level}`}
            >
              {h.text}
            </a>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="docs-main">
        <div className="docs-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {DOC_CONTENT}
          </ReactMarkdown>
        </div>
      </main>
    </div>
  )
}

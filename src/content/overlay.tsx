import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import BookmarkEditModal, { BookmarkFormData } from '../newtab/components/BookmarkEditModal'
import { DockConfigContext, DEFAULT_CONFIG } from '../newtab/store/dockConfig'

const OVERLAY_ID = '__newtab_bm_overlay__'
const STORAGE_KEY = 'newtab_dock_config'

function showToast(message: string) {
  const toast = document.createElement('div')
  toast.textContent = message
  Object.assign(toast.style, {
    position: 'fixed',
    top: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fff',
    color: '#22c55e',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    zIndex: '2147483647',
    pointerEvents: 'none',
    border: '1.5px solid #22c55e',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    transition: 'opacity 0.3s',
    whiteSpace: 'nowrap',
  })
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 2500)
}

function mount() {
  if (document.getElementById(OVERLAY_ID)) return

  const url = location.href
  const title = document.title

  // 先读取完整 config，再渲染，避免竞态导致书签数据丢失
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const config = { ...DEFAULT_CONFIG, ...(result[STORAGE_KEY] ?? {}) }

    // 检查当前网址是否已收藏（忽略末尾斜杠差异）
    const normalize = (u: string) => u.replace(/\/$/, '')
    const alreadyExists = (config.bookmarks ?? []).some(
      (bm: { url: string }) => normalize(bm.url) === normalize(url),
    )
    if (alreadyExists) {
      showToast('该网址已经在收藏列表了')
      return
    }

    const categories = config.bookmarkLayout?.categories ?? []

    const container = document.createElement('div')
    container.id = OVERLAY_ID
    document.body.appendChild(container)

    const root = createRoot(container)
    const done = () => { root.unmount(); container.remove() }

    root.render(
      <StrictMode>
        <DockConfigContext.Provider value={{ config, setConfig: () => {}, chromeReady: true }}>
          <BookmarkEditModal
            open={true}
            onClose={done}
            mode="add"
            initialData={{ url, name: title }}
            categories={categories}
            onSave={(data: BookmarkFormData) => {
              const newBookmark = { ...data, id: `bm_${Date.now()}` }
              const newConfig = { ...config, bookmarks: [...(config.bookmarks ?? []), newBookmark] }
              // 写入 storage 成功后再关闭，确保数据不丢失
              chrome.storage.local.set({ [STORAGE_KEY]: newConfig }, done)
            }}
          />
        </DockConfigContext.Provider>
      </StrictMode>,
    )
  })
}

mount()

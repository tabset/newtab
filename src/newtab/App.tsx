import { ConfigProvider } from 'antd'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Dock from './components/Dock'
import { DockConfigProvider, useDockConfig } from './store/dockConfig'
import { loadImageWithCache } from './utils/imageCache'
import { shouldRandomize, pickRandomBackground } from './utils/randomBackground'
import SettingsModal from './components/SettingsModal'
import BookmarkEditModal from './components/BookmarkEditModal'
import DebugPage from './components/DebugPage'
import { useT } from './i18n'

function BackgroundLayer() {
  const { config } = useDockConfig()
  const { background } = config
  const [imageLoaded, setImageLoaded] = useState(false)
  const [cachedImageUrl, setCachedImageUrl] = useState<string>('')
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('')
  // 同步从 sessionStorage 读取上次缩略图，刷新时立即显示，避免空白闪烁
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(() => {
    if (background.type === 'image' && background.imageUrl) {
      return sessionStorage.getItem(`bg_thumb_${background.imageUrl}`) ?? ''
    }
    return ''
  })

  // 预加载图片（带压缩和缩略图）
  useEffect(() => {
    if (background.type === 'image' && background.imageUrl) {
      // 检查是否是同一张图片
      if (cachedImageUrl === background.imageUrl && processedImageUrl) {
        setImageLoaded(true)
        return
      }

      setImageLoaded(false)
      // 不重置 thumbnailUrl，保持显示上次缓存的缩略图，避免切换时闪烁

      // 使用缓存机制加载图片
      loadImageWithCache(background.imageUrl)
        .then((result) => {
          if (result.thumbnail) {
            setThumbnailUrl(result.thumbnail)
            // 写入 sessionStorage 供下次刷新同步读取
            sessionStorage.setItem(`bg_thumb_${background.imageUrl}`, result.thumbnail)
          }
          setProcessedImageUrl(result.fullImage)
          setCachedImageUrl(background.imageUrl!)
          setImageLoaded(true)
        })
        .catch((error) => {
          console.error('背景图片加载失败:', error)
          setProcessedImageUrl(background.imageUrl!)
          setImageLoaded(true)
        })
    } else {
      setImageLoaded(true)
      setCachedImageUrl('')
      setProcessedImageUrl('')
      setThumbnailUrl('')
    }
  }, [background.type, background.imageUrl])

  const getBackgroundStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      opacity: background.opacity / 100,
      filter: `blur(${background.blur}px)`,
      transition: 'opacity 0.3s ease-in-out',
    }

    switch (background.type) {
      case 'color':
        return { ...baseStyle, background: background.color || '#667eea' }
      case 'gradient':
        return { ...baseStyle, background: background.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
      case 'image':
        // 优先级：高清图 > 缩略图 > 渐变占位
        if (imageLoaded && processedImageUrl) {
          return {
            ...baseStyle,
            backgroundImage: `url(${processedImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }
        } else if (thumbnailUrl) {
          // 显示模糊的缩略图作为过渡
          return {
            ...baseStyle,
            backgroundImage: `url(${thumbnailUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: `blur(${Math.max(background.blur + 20, 20)}px)`, // 额外模糊
          }
        } else {
          // 最终兜底：渐变背景
          return {
            ...baseStyle,
            background: background.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }
        }
      default:
        return { ...baseStyle, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' }
    }
  }

  return <div style={getBackgroundStyle()} />
}

function DesktopContextMenu({
  x, y, onClose,
  onChangeWallpaper,
  onDownloadWallpaper,
  onNewBookmark,
  canDownload,
}: {
  x: number; y: number; onClose: () => void
  onChangeWallpaper: () => void
  onDownloadWallpaper: () => void
  onNewBookmark: () => void
  canDownload: boolean
}) {
  const t = useT()

  useEffect(() => {
    const close = () => onClose()
    // 延迟注册，避免触发菜单的同一个 contextmenu 事件立即关闭菜单
    const timer = setTimeout(() => {
      window.addEventListener('click', close)
      window.addEventListener('contextmenu', close)
    }, 0)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
    }
  }, [onClose])

  const menuW = 168
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cx = Math.min(x, vw - menuW - 8)
  const cy = Math.min(y, vh - 130 - 8)

  const itemStyle = (disabled = false): React.CSSProperties => ({
    padding: '6px 14px',
    fontSize: 13,
    color: disabled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.92)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 6,
    userSelect: 'none',
    textShadow: '0 1px 3px rgba(0,0,0,0.3)',
    pointerEvents: disabled ? 'none' : 'auto',
  })

  const hoverEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background = '#007AFF'
    e.currentTarget.style.color = '#fff'
  }
  const hoverLeave = (e: React.MouseEvent<HTMLDivElement>, disabled = false) => {
    e.currentTarget.style.background = 'transparent'
    e.currentTarget.style.color = disabled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.92)'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -6 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: cx, top: cy,
        zIndex: 300,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.38) 100%)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        borderRadius: 10,
        border: '0.5px solid rgba(255,255,255,0.4)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.5)',
        padding: 4,
        minWidth: menuW,
      }}
    >
      <div style={itemStyle()}
        onMouseEnter={hoverEnter}
        onMouseLeave={e => hoverLeave(e)}
        onClick={() => { onChangeWallpaper(); onClose() }}
      >{t('menu_change_wallpaper')}</div>
      <div style={itemStyle(!canDownload)}
        onMouseEnter={canDownload ? hoverEnter : undefined}
        onMouseLeave={canDownload ? e => hoverLeave(e) : undefined}
        onClick={canDownload ? () => { onDownloadWallpaper(); onClose() } : undefined}
      >{t('menu_download_wallpaper')}</div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />
      <div style={itemStyle()}
        onMouseEnter={hoverEnter}
        onMouseLeave={e => hoverLeave(e)}
        onClick={() => { onNewBookmark(); onClose() }}
      >{t('menu_new_bookmark')}</div>
    </motion.div>
  )
}

function AppContent() {
  const { config, setConfig, chromeReady } = useDockConfig()
  const [debugMode, setDebugMode] = useState(() => {
    // 检测 URL 是否包含 debug 参数
    const params = new URLSearchParams(window.location.search)
    return params.get('debug') === 'true'
  })
  const [settingsActive, setSettingsActive] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('dock')
  const [settingsSessionKey, setSettingsSessionKey] = useState(0)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [bookmarkEditOpen, setBookmarkEditOpen] = useState(false)
  const [pendingBookmarkData, setPendingBookmarkData] = useState<{ url: string; name: string } | null>(null)
  // localStorage 跨 tab 缓存，初始化时可同步读到配置，无需等 chromeReady
  const [launchpadOpen, setLaunchpadOpen] = useState(
    () => (config.bookmarkLayout?.defaultView ?? 'desktop') === 'launchpad'
  )
  const [launchpadInitialCategoryId, setLaunchpadInitialCategoryId] = useState<string | undefined>()
  const launchpadInitialized = useRef(false)

  // chromeReady 后再做一次兜底（覆盖 localStorage 未命中时的默认值）
  useEffect(() => {
    if (!chromeReady || launchpadInitialized.current) return
    launchpadInitialized.current = true
    if ((config.bookmarkLayout?.defaultView ?? 'desktop') === 'launchpad') {
      setLaunchpadOpen(true)
    }
  }, [chromeReady])

  // Cmd+D 快速新增书签：检测 pendingBookmark（5秒内有效）
  useEffect(() => {
    chrome.storage.local.get('pendingBookmark', (result) => {
      const pb = result.pendingBookmark
      if (!pb) return
      // 超过5秒视为过期
      if (Date.now() - pb.ts > 5000) {
        chrome.storage.local.remove('pendingBookmark')
        return
      }
      chrome.storage.local.remove('pendingBookmark')
      setPendingBookmarkData({ url: pb.url, name: pb.title })
      setBookmarkEditOpen(true)
    })
  }, [])

  // 随机背景触发
  // 用 ref 持有最新 config，避免闭包捕获旧值
  const configRef = useRef(config)
  useEffect(() => { configRef.current = config }, [config])

  const tryRandomize = useCallback(() => {
    const bg = configRef.current.background
    const randomType = bg.randomType || 'none'
    if (!shouldRandomize(randomType, bg.lastRandomAt)) return
    const patch = pickRandomBackground(bg)
    if (Object.keys(patch).length > 0) {
      setConfig({ background: { ...bg, ...patch } })
    }
  }, [setConfig])

  useEffect(() => {
    // 1. 页面首次加载时检查
    tryRandomize()

    // 2. 用户从其他标签页切回来时检查（事件驱动，零开销）
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tryRandomize()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // 3. 用户长期停留时每 60 秒检查一次（仅做时间戳整除比较，耗时 < 0.01ms）
    const timer = setInterval(tryRandomize, 60_000)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(timer)
    }
  }, [tryRandomize])

  const openSettings = (tab = 'dock') => {
    setSettingsTab(tab)
    setSettingsActive(true)
    setSettingsOpen(true)
    setSettingsSessionKey(k => k + 1)
  }

  const reopenSettings = () => setSettingsOpen(true)

  const exitSettings = () => {
    setSettingsActive(false)
    setSettingsOpen(false)
  }

  const downloadWallpaper = async () => {
    const url = config.background.imageUrl
    if (!url) return
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'wallpaper.jpg'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(url, '_blank')
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsOpen || bookmarkEditOpen) return
      // 只响应背景区域的右键（排除程序坞及其弹窗，它们会 stopPropagation）
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY })
    }
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [settingsOpen, bookmarkEditOpen])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* 开发者模式页面 */}
      {debugMode && <DebugPage onExit={() => setDebugMode(false)} />}
      
      {/* 正常页面内容 */}
      {!debugMode && (
        <>
          <BackgroundLayer />
          <Dock
            settingsActive={settingsActive}
            settingsOpen={settingsOpen}
            onSettingsOpen={(tab?: string) => openSettings(tab)}
            onSettingsReopen={reopenSettings}
            onSettingsClose={() => setSettingsOpen(false)}
            onSettingsExit={exitSettings}
            launchpadOpen={launchpadOpen}
            onLaunchpadChange={setLaunchpadOpen}
            launchpadInitialCategoryId={launchpadInitialCategoryId}
          />
          <AnimatePresence>
            {contextMenu && (
              <DesktopContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onClose={() => setContextMenu(null)}
                onChangeWallpaper={() => openSettings('appearance')}
                onDownloadWallpaper={downloadWallpaper}
                onNewBookmark={() => setBookmarkEditOpen(true)}
                canDownload={config.background.type === 'image' && !!config.background.imageUrl}
              />
            )}
          </AnimatePresence>
          <SettingsModal
            active={settingsActive}
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            initialTab={settingsTab}
            sessionKey={settingsSessionKey}
            onBookmarkTabSelect={() => setLaunchpadOpen(true)}
          />
          <BookmarkEditModal
            open={bookmarkEditOpen}
            onClose={() => { setBookmarkEditOpen(false); setPendingBookmarkData(null) }}
            mode="add"
            initialData={pendingBookmarkData ?? undefined}
            categories={config.bookmarkLayout?.categories ?? []}
            onSave={(data) => {
              const newBookmark = { ...data, id: `bm_${Date.now()}` }
              const prev = config.bookmarks ?? []
              setConfig({ bookmarks: [...prev, newBookmark] })
              setBookmarkEditOpen(false)
              setPendingBookmarkData(null)
              setLaunchpadInitialCategoryId(data.categoryId || undefined)
              setLaunchpadOpen(true)
            }}
          />
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1a73e8' } }}>
      <DockConfigProvider>
        <AppContent />
      </DockConfigProvider>
    </ConfigProvider>
  )
}

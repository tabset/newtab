import React, { useRef, useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useDockConfig, DockPosition } from '../store/dockConfig'
import { injectSvgColor } from './BookmarkEditModal'
import { AppItem } from '../types'
import AppGrid from './AppGrid'
import BookmarkLaunchpad from './BookmarkLaunchpad'
import StorePanel from './StorePanel'
import { createUrlPlugin } from '../store/storeTypes'
import { useT } from '../i18n'

const bookmarkStorePlugin = createUrlPlugin('bookmark-store', '/data/bookmark-store.json')
const toolboxPlugin = createUrlPlugin('toolbox', '/data/toolbox.json')


const PADDING = 10
const GAP = 10
const SCREEN_RATIO = 0.9
const DOCK_MARGIN = 8   // px from screen edge

// tooltip 方向
const tooltipStyle = (pos: DockPosition): React.CSSProperties => {
  switch (pos) {
    case 'bottom': return { bottom: 'calc(100% + 20px)', left: '50%', transform: 'translateX(-50%)' }
    case 'top':    return { top: 'calc(100% + 20px)',    left: '50%', transform: 'translateX(-50%)' }
    case 'left':   return { left: 'calc(100% + 20px)',   top: '50%',  transform: 'translateY(-50%)' }
    case 'right':  return { right: 'calc(100% + 20px)',  top: '50%',  transform: 'translateY(-50%)' }
  }
}

// 运行指示点位置
const dotStyle = (pos: DockPosition): React.CSSProperties => {
  const dot: React.CSSProperties = {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.9)',
    pointerEvents: 'none',
  }
  switch (pos) {
    case 'bottom': return { ...dot, bottom: -7, left: '50%', transform: 'translateX(-50%)' }
    case 'top':    return { ...dot, top: -7,    left: '50%', transform: 'translateX(-50%)' }
    case 'left':   return { ...dot, left: -7,   top: '50%',  transform: 'translateY(-50%)' }
    case 'right':  return { ...dot, right: -7,  top: '50%',  transform: 'translateY(-50%)' }
  }
}

// 图标内容渲染（抽出为独立组件，确保 useTransform hook 调用数量固定不变）
function DockItemIcon({ app, smoothSize }: { app: AppItem; smoothSize: ReturnType<typeof useSpring> }) {
  const iconType = app.bmIconType
  const iconValue = app.bmIconValue ?? ''

  // 文字图标字号因子：1字=0.48, 2字=0.36, 3字及以上=0.27（与编辑预览保持一致）
  const textLen = iconType === 'text' ? iconValue.length || 1 : 1
  const textFactor = textLen <= 1 ? 0.48 : textLen === 2 ? 0.36 : 0.27

  // 所有 useTransform 无条件调用，避免 React hook 数量变化（error #300）
  const iconWH = useTransform(smoothSize, s => s * 0.66)
  const iconFS = useTransform(smoothSize, s => s * 0.5)
  const iconTextFS = useTransform(smoothSize, s => s * textFactor)

  if (iconType === 'url' || (!iconType && app.iconUrl)) {
    const src = iconType === 'url' ? iconValue : app.iconUrl!
    const fit = app.bmIconFit ?? 'contain'
    const isContain = fit === 'contain'
    return (
      <motion.img
        src={src}
        style={{ width: isContain ? iconWH : smoothSize, height: isContain ? iconWH : smoothSize, objectFit: fit, borderRadius: isContain ? 4 : 0 }}
      />
    )
  }
  if (iconType === 'svg' && iconValue) {
    return (
      <motion.div
        style={{ width: iconWH, height: iconWH, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
        dangerouslySetInnerHTML={{ __html: injectSvgColor(iconValue, app.bmSvgColor ?? '#ffffff') }}
      />
    )
  }
  if (iconType === 'text') {
    return (
      <motion.div style={{
        fontSize: iconTextFS, lineHeight: 1, fontWeight: 800, letterSpacing: -0.5,
        color: app.bmSvgColor || '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none',
      }}>
        {iconValue || '?'}
      </motion.div>
    )
  }
  // builtin emoji / fallback
  return (
    <motion.span style={{ fontSize: iconFS, lineHeight: 1 }}>
      {iconType === 'builtin' ? iconValue || app.emoji : app.emoji}
    </motion.span>
  )
}

// 单个图标
function DockItem({
  app, motionVal, baseSize, maxSize, effectRadius, magnification, position,
  onClick, onContextMenu, isOpen, children,
}: {
  app: AppItem
  motionVal: ReturnType<typeof useMotionValue<number>>
  baseSize: number; maxSize: number; effectRadius: number
  magnification: boolean; position: DockPosition
  onClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  isOpen?: boolean
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState(false)
  const isVertical = position === 'left' || position === 'right'

  const distance = useTransform(motionVal, (val) => {
    const el = ref.current
    if (!el) return effectRadius
    const rect = el.getBoundingClientRect()
    const center = isVertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2
    return Math.abs(val - center)
  })
  const size = useTransform(distance, [0, effectRadius], [magnification ? maxSize : baseSize, baseSize])
  const smoothSize = useSpring(size, { damping: 18, stiffness: 280, mass: 0.4 })

  const originY = position === 'bottom' ? 1 : position === 'top' ? 0 : 0.5
  const originX = position === 'left'   ? 0 : position === 'right' ? 1 : 0.5

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {tooltip && (
        <div style={{
          position: 'absolute', ...tooltipStyle(position),
          background: 'rgba(255,255,255,0.92)', color: 'rgba(0,0,0,0.75)', fontSize: 12,
          padding: '4px 10px', borderRadius: 10, whiteSpace: 'nowrap',
          pointerEvents: 'none', backdropFilter: 'blur(12px)', zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.08)',
        }}>
          {app.name}
        </div>
      )}
      {isOpen && <div style={dotStyle(position)} />}
      <motion.div
        ref={ref}
        style={{
          width: smoothSize, height: smoothSize,
          background: children ? 'transparent' : app.color,
          borderRadius: '22%',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: children ? 'none' : '0 2px 12px rgba(0,0,0,0.18)',
          userSelect: 'none', flexShrink: 0, originX, originY,
        }}
        whileTap={{ scale: 0.88 }}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        onClick={onClick ?? (() => app.url && window.open(app.url, '_blank'))}
        onContextMenu={(e) => { onContextMenu?.(e) }}
      >
        {children ?? <DockItemIcon app={app} smoothSize={smoothSize} />}
      </motion.div>
    </div>
  )
}

// 溢出分组图标：填满 DockItem 给的尺寸，展示前 4 个 app 缩略
function OverflowIcon({ apps }: { apps: AppItem[] }) {
  const preview = apps.slice(0, 4)
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'rgba(120,120,128,0.3)',
      borderRadius: '22%',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '5%',
      padding: '10%',
      boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
    }}>
      {preview.map((app) => (
        <div key={app.id} style={{
          background: app.color,
          borderRadius: '25%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '55%',
        }}>
          {app.emoji}
        </div>
      ))}
    </div>
  )
}

// ── Pointer-based drag state ─────────────────────────────
interface PointerDragState {
  appIndex: number
  app: AppItem
  currentX: number
  currentY: number
  isOutside: boolean
}

// Static icon content for the drag overlay (no motion values)
function DockIconStatic({ app, size }: { app: AppItem; size: number }) {
  const iconType = app.bmIconType
  const iconValue = app.bmIconValue ?? ''
  if (iconType === 'url' || (!iconType && app.iconUrl)) {
    const src = iconType === 'url' ? iconValue : app.iconUrl!
    const fit = app.bmIconFit ?? 'contain'
    const isContain = fit === 'contain'
    return <img src={src} style={{ width: isContain ? size * 0.66 : size, height: isContain ? size * 0.66 : size, objectFit: fit, borderRadius: isContain ? 4 : 0 }} />
  }
  if (iconType === 'svg' && iconValue) {
    return (
      <div
        style={{ width: size * 0.66, height: size * 0.66, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{ __html: injectSvgColor(iconValue, app.bmSvgColor ?? '#ffffff') }}
      />
    )
  }
  if (iconType === 'text') {
    const textLen = iconValue.length || 1
    const textFactor = textLen <= 1 ? 0.48 : textLen === 2 ? 0.36 : 0.27
    return (
      <div style={{
        fontSize: size * textFactor, lineHeight: 1, fontWeight: 800, letterSpacing: -0.5,
        color: app.bmSvgColor || '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none',
      }}>
        {iconValue || '?'}
      </div>
    )
  }
  const label = iconType === 'builtin' ? iconValue || app.emoji : app.emoji
  return <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{label}</span>
}

// Floating overlay rendered via portal during dock item drag
function DockDragOverlay({ app, baseSize, x, y, isOutside, removeLabel }: {
  app: AppItem; baseSize: number; x: number; y: number; isOutside: boolean; removeLabel: string
}) {
  return createPortal(
    <div style={{
      position: 'fixed',
      left: x - baseSize / 2,
      top: y - baseSize / 2,
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {isOutside && (
          <motion.div
            key="remove-label"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 8,
              padding: '4px 16px',
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 20,
              fontSize: 13,
              color: 'rgba(0,0,0,0.78)',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.06)',
              backdropFilter: 'blur(12px)',
              fontWeight: 500,
            }}
          >
            {removeLabel}
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{
        width: baseSize,
        height: baseSize,
        background: app.color,
        borderRadius: '22%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.32)',
        opacity: isOutside ? 0.65 : 1,
        transition: 'opacity 0.2s, transform 0.2s',
        transform: isOutside ? 'scale(0.9)' : 'scale(1)',
      }}>
        <DockIconStatic app={app} size={baseSize} />
      </div>
    </div>,
    document.body,
  )
}

// wrapper 定位
function getDockWrapperStyle(pos: DockPosition): React.CSSProperties {
  const base: React.CSSProperties = { position: 'fixed', zIndex: 100 }
  switch (pos) {
    case 'bottom': return { ...base, bottom: DOCK_MARGIN, left: '50%', transform: 'translateX(-50%)' }
    case 'top':    return { ...base, top: DOCK_MARGIN,    left: '50%', transform: 'translateX(-50%)' }
    case 'left':   return { ...base, left: DOCK_MARGIN,   top: '50%',  transform: 'translateY(-50%)' }
    case 'right':  return { ...base, right: DOCK_MARGIN,  top: '50%',  transform: 'translateY(-50%)' }
  }
}

function LaunchpadIcon({ size }: { size: number }) {
  return (
    <img src="/icons/launchpad.svg" alt="Home" style={{ width: size, height: size }} />
  )
}

function SettingsGearIcon({ size }: { size: number }) {
  return (
    <img
      src="/icons/settings.svg"
      alt="Settings"
      style={{ width: size, height: size }}
    />
  )
}

interface ContextMenuState {
  x: number
  y: number
  app: AppItem
  isSystem: boolean
  isSettings: boolean
  isRunning: boolean   // 临时运行（未固定）的 app
  arrowSide: 'top' | 'bottom' | 'left' | 'right'
  arrowOffset: number  // px offset of arrow from popup center
}

interface DockProps {
  settingsActive: boolean
  settingsOpen: boolean
  onSettingsOpen: (tab?: string) => void
  onSettingsReopen: () => void
  onSettingsClose: () => void
  onSettingsExit: () => void
  onSettingsZIndexChange: (zIndex: number) => void
  launchpadOpen: boolean
  onLaunchpadChange: (open: boolean) => void
  launchpadInitialCategoryId?: string
}

export default function Dock({ settingsActive, settingsOpen, onSettingsOpen, onSettingsReopen, onSettingsClose, onSettingsExit, onSettingsZIndexChange, launchpadOpen, onLaunchpadChange, launchpadInitialCategoryId }: DockProps) {
  const mouseVal = useMotionValue(Infinity)
  const { config, setConfig } = useDockConfig()
  const t = useT()
  const setLaunchpadOpen = onLaunchpadChange
  const [overflowOpen, setOverflowOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)
  const dockInnerRef = useRef<HTMLDivElement>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null)
  const [pointerDrag, setPointerDrag] = useState<PointerDragState | null>(null)

  const apps = config.dockApps ?? []
  const appsRef = useRef(apps)
  appsRef.current = apps

  // 用书签的最新图标覆盖 dockApps 的图标信息（仅用于渲染，不写回 dockApps）
  const bookmarks = config.bookmarks ?? []
  const displayApps = useMemo(() => apps.map(app => {
    if (!app.url) return app
    const bm = bookmarks.find(b => b.url === app.url)
    if (!bm) return app
    return {
      ...app,
      name: bm.name,
      color: bm.bgColor || app.color,
      // 保留旧字段兼容性，同时填入完整的 bm 图标结构体
      iconUrl: bm.iconType === 'url' ? bm.iconValue : undefined,
      emoji: (bm.iconType === 'builtin' || bm.iconType === 'text') ? bm.iconValue : app.emoji,
      bmIconType: bm.iconType,
      bmIconValue: bm.iconValue,
      bmSvgColor: bm.svgColor,
      bmIconFit: bm.iconFit,
    }
  }), [apps, bookmarks])
  const [openedApps, setOpenedApps] = useState<Map<string, number>>(new Map())
  // 从书签宫格打开但未固定在程序坞的临时运行图标
  const [runningApps, setRunningApps] = useState<AppItem[]>([])
  const runningAppsRef = useRef(runningApps)
  runningAppsRef.current = runningApps

  // 刷新后从 sessionStorage 恢复状态（tabId 需校验是否仍有效）
  useEffect(() => {
    const savedRunning = sessionStorage.getItem('dock_runningApps')
    const savedOpened = sessionStorage.getItem('dock_openedApps')
    if (savedRunning) {
      try { setRunningApps(JSON.parse(savedRunning)) } catch { /* ignore */ }
    }
    if (savedOpened) {
      try {
        const entries: [string, number][] = JSON.parse(savedOpened)
        if (entries.length === 0) return
        const valid: [string, number][] = []
        let remaining = entries.length
        entries.forEach(([appId, tabId]) => {
          chrome.tabs.get(tabId, (tab) => {
            if (!chrome.runtime.lastError && tab) valid.push([appId, tabId])
            if (--remaining === 0) setOpenedApps(new Map(valid))
          })
        })
      } catch { /* ignore */ }
    }
  }, [])

  // 状态变更时同步写入 sessionStorage
  useEffect(() => {
    sessionStorage.setItem('dock_runningApps', JSON.stringify(runningApps))
  }, [runningApps])

  useEffect(() => {
    sessionStorage.setItem('dock_openedApps', JSON.stringify([...openedApps]))
  }, [openedApps])
  // 临时图标拖拽：当前拖拽的 app 及其在固定区的插入位置
  const [runningDragApp, setRunningDragApp] = useState<AppItem | null>(null)
  const [runningDragInsertIdx, setRunningDragInsertIdx] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)


  // 监听视口尺寸变化，用于自适应计算可见图标数
  const [vpSize, setVpSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const onResize = () => setVpSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const { position, baseSize, maxSize, effectRadius, magnification } = config
  const isVertical = position === 'left' || position === 'right'

  // 点击外部关闭右键菜单
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const timer = setTimeout(() => {
      window.addEventListener('click', close)
      window.addEventListener('contextmenu', close)
    }, 0)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
    }
  }, [contextMenu])


  const openApp = (app: AppItem) => {
    if (!app.url) return
    const mode = config.bookmarkLayout?.openMode ?? 'newtab'
    if (mode === 'current') {
      window.location.href = app.url
      return
    }
    // 如果该书签已有打开的标签页，直接跳转聚焦
    if (openedApps.has(app.id)) {
      const tabId = openedApps.get(app.id)!
      chrome.tabs.update(tabId, { active: true })
      return
    }
    // 新建标签页并记录 tabId
    chrome.tabs.create({ url: app.url }, (tab) => {
      if (tab?.id !== undefined) {
        setOpenedApps(prev => new Map([...prev, [app.id, tab.id!]]))
      }
    })
  }

  // 监听标签页关闭事件，同步 openedApps 和 runningApps 状态
  useEffect(() => {
    const onRemoved = (tabId: number) => {
      setOpenedApps(prev => {
        for (const [appId, tid] of prev) {
          if (tid === tabId) {
            const m = new Map(prev)
            m.delete(appId)
            return m
          }
        }
        return prev
      })
    }
    chrome.tabs.onRemoved.addListener(onRemoved)
    return () => chrome.tabs.onRemoved.removeListener(onRemoved)
  }, [])

  // 从书签宫格打开书签时调用：如已固定则走 openApp，否则作为临时运行图标展示
  const handleOpenFromLaunchpad = (bookmark: { id: string; name: string; url: string; bgColor: string; iconType: string; iconValue: string; svgColor?: string; iconFit?: 'contain' | 'cover' | 'fill' }) => {
    const mode = config.bookmarkLayout?.openMode ?? 'newtab'
    if (mode === 'current') {
      window.location.href = bookmark.url
      return
    }
    // 已固定在程序坞 → 走普通 openApp 流程
    const pinnedApp = apps.find(a => a.url === bookmark.url)
    if (pinnedApp) {
      openApp(pinnedApp)
      return
    }
    // 已作为临时图标运行 → 聚焦标签页
    const existingRunning = runningAppsRef.current.find(a => a.url === bookmark.url)
    if (existingRunning) {
      const tabId = openedApps.get(existingRunning.id)
      if (tabId !== undefined) { chrome.tabs.update(tabId, { active: true }); return }
    }
    // 新建临时运行图标 + 标签页
    const runningApp: AppItem = {
      id: `running_${Date.now()}`,
      name: bookmark.name,
      emoji: (bookmark.iconType === 'builtin' || bookmark.iconType === 'text') ? bookmark.iconValue ?? '🌐' : '🌐',
      color: bookmark.bgColor || '#636366',
      url: bookmark.url,
      iconUrl: bookmark.iconType === 'url' ? bookmark.iconValue : undefined,
      bmIconType: bookmark.iconType as AppItem['bmIconType'],
      bmIconValue: bookmark.iconValue,
      bmSvgColor: bookmark.svgColor,
      bmIconFit: bookmark.iconFit,
    }
    chrome.tabs.create({ url: bookmark.url }, (tab) => {
      if (tab?.id !== undefined) {
        setRunningApps(prev => [...prev, runningApp])
        setOpenedApps(prev => new Map([...prev, [runningApp.id, tab.id!]]))
      }
    })
  }

  // 临时运行图标的拖拽：拖入固定区则固定，否则放回原位
  const handleRunningPointerDown = (e: React.PointerEvent, runApp: AppItem) => {
    if (e.button !== 0) return
    e.preventDefault()

    const startX = e.clientX, startY = e.clientY
    const pos = position
    const bs = baseSize
    const isVert = isVertical
    const numPinned = visibleApps.length
    const initialDockRect = dockInnerRef.current?.getBoundingClientRect() ?? null
    let dragActive = false
    let latestInsertIdx: number | null = null

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - startX, dy = me.clientY - startY
      if (!dragActive) {
        if (Math.sqrt(dx * dx + dy * dy) < 5) return
        dragActive = true
        setRunningDragApp(runApp)
        mouseVal.set(Infinity)
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'grabbing'
      }

      if (!initialDockRect) return

      const expand = bs
      let overDock = false
      switch (pos) {
        case 'bottom':
        case 'top':
          overDock = me.clientY >= initialDockRect.top - expand && me.clientY <= initialDockRect.bottom + expand
                  && me.clientX >= initialDockRect.left - expand && me.clientX <= initialDockRect.right + expand
          break
        case 'left':
        case 'right':
          overDock = me.clientX >= initialDockRect.left - expand && me.clientX <= initialDockRect.right + expand
                  && me.clientY >= initialDockRect.top - expand && me.clientY <= initialDockRect.bottom + expand
          break
      }

      if (overDock) {
        const slotSize = bs + GAP
        const fixedSlots = 2 // home + settings
        const rawPos = !isVert
          ? (me.clientX - initialDockRect.left - PADDING - fixedSlots * slotSize - bs / 2) / slotSize
          : (me.clientY - initialDockRect.top - PADDING - fixedSlots * slotSize - bs / 2) / slotSize
        // rawPos > numPinned + 0.5 表示光标已越过固定区进入分割线/运行区，放弃插入
        if (rawPos <= numPinned + 0.5) {
          latestInsertIdx = Math.max(0, Math.min(numPinned, Math.round(rawPos)))
        } else {
          latestInsertIdx = null
        }
      } else {
        latestInsertIdx = null
      }

      setRunningDragInsertIdx(latestInsertIdx)
      setPointerDrag({ appIndex: -1, app: runApp, currentX: me.clientX, currentY: me.clientY, isOutside: false })
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      if (dragActive && latestInsertIdx !== null) {
        const newApps = [...appsRef.current]
        newApps.splice(latestInsertIdx, 0, runApp)
        setConfig({ dockApps: newApps })
        setRunningApps(prev => prev.filter(a => a.id !== runApp.id))
      }

      setRunningDragApp(null)
      setRunningDragInsertIdx(null)
      setPointerDrag(null)
      mouseVal.set(Infinity)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleContextMenu = (e: React.MouseEvent, app: AppItem, isSystem: boolean, isSettings = false, isRunning = false) => {
    e.preventDefault()
    e.stopPropagation()
    const menuW = 160
    // 精确计算菜单高度：每项约 26px，分隔线 9px，容器内边距 8px
    // 临时运行图标：
    //   - 标签页打开时：2项（保留到标签栏 + 退出），无分隔线
    //   - 标签页关闭后：2项（保留到标签栏 + 移除书签栏），有分隔线
    const isTabOpen = openedApps.has(app.id)
    const numItems = isSettings ? 1 : isRunning ? 2 : (1 + (!isSystem ? 1 : 0))
    const menuH = numItems * 26 + ((!isSystem && !isRunning) || (isRunning && !isTabOpen) ? 9 : 0) + 8
    const arrowSize = 9  // 箭头的高度/宽度
    const gap = 4        // popup 箭头尖端与程序坞边缘的间距
    const pad = 8
    const mx = e.clientX
    const my = e.clientY
    const ww = window.innerWidth
    const wh = window.innerHeight

    // 程序坞背景板厚度（含内边距）及各侧边缘坐标
    const panelThick = config.baseSize + PADDING * 2
    const dockEdge = {
      bottom: wh - DOCK_MARGIN - panelThick,  // 程序坞顶边 y
      top:    DOCK_MARGIN + panelThick,        // 程序坞底边 y
      left:   DOCK_MARGIN + panelThick,        // 程序坞右边 x
      right:  ww - DOCK_MARGIN - panelThick,   // 程序坞左边 x
    }

    let x = 0, y = 0
    let arrowSide: ContextMenuState['arrowSide'] = 'bottom'
    let arrowOffset = 0

    switch (config.position) {
      case 'bottom': {
        const clampedX = Math.max(pad, Math.min(mx - menuW / 2, ww - menuW - pad))
        x = clampedX
        y = dockEdge.bottom - menuH - gap - arrowSize
        arrowSide = 'bottom'
        arrowOffset = mx - (clampedX + menuW / 2)
        break
      }
      case 'top': {
        const clampedX = Math.max(pad, Math.min(mx - menuW / 2, ww - menuW - pad))
        x = clampedX
        y = dockEdge.top + gap + arrowSize
        arrowSide = 'top'
        arrowOffset = mx - (clampedX + menuW / 2)
        break
      }
      case 'left': {
        const clampedY = Math.max(pad, Math.min(my - menuH / 2, wh - menuH - pad))
        x = dockEdge.left + gap + arrowSize
        y = clampedY
        arrowSide = 'left'
        arrowOffset = my - (clampedY + menuH / 2)
        break
      }
      case 'right': {
        const clampedY = Math.max(pad, Math.min(my - menuH / 2, wh - menuH - pad))
        x = dockEdge.right - menuW - gap - arrowSize
        y = clampedY
        arrowSide = 'right'
        arrowOffset = my - (clampedY + menuH / 2)
        break
      }
    }

    setContextMenu({ x, y, app, isSystem, isSettings, isRunning, arrowSide, arrowOffset })
  }

  // 计算最多能放几个图标（90% 视口尺寸限制，随窗口缩放实时更新）
  const { visibleApps, overflowApps } = useMemo(() => {
    const screenSize = (isVertical ? vpSize.h : vpSize.w) * SCREEN_RATIO
    const slotSize = baseSize + GAP
    // 固定占位：home + bookmark-store + settings + 两端 padding
    const fixedSize = PADDING * 2 + (baseSize + GAP) * 3
    const available = screenSize - fixedSize
    const maxSlots = Math.max(1, Math.floor((available + GAP) / slotSize))

    if (displayApps.length <= maxSlots) {
      return { visibleApps: displayApps, overflowApps: [] }
    }
    return {
      visibleApps: displayApps.slice(0, maxSlots - 1),
      overflowApps: displayApps.slice(maxSlots - 1),
    }
  }, [isVertical, baseSize, displayApps, vpSize])

  const homeApp: AppItem = { id: 'home', name: t('home_tooltip'), emoji: '', color: 'transparent' }
  const storeApp: AppItem = { id: 'bookmark-store', name: t('bookmark_store_tooltip'), emoji: '🔖', color: 'transparent' }
  // const toolboxApp: AppItem = { id: 'toolbox', name: t('toolbox_tooltip'), emoji: '🧰', color: 'transparent' }
  const settingsApp: AppItem = { id: 'settings', name: t('settings_tooltip'), emoji: '', color: '#636366' }

  const [storeOpen, setStoreOpen] = useState(false)
  const [storeActive, setStoreActive] = useState(false)
  const [toolboxOpen, setToolboxOpen] = useState(false)
  const [topZIndex, setTopZIndex] = useState(201) // 基础 z-index
  const [launchpadZIndex, setLaunchpadZIndex] = useState(201)
  const [storeZIndex, setStoreZIndex] = useState(202)
  const [settingsZIndex, setSettingsZIndex] = useState(300)
  const itemProps = { motionVal: mouseVal, baseSize, maxSize, effectRadius, magnification, position }

  const alignItems =
    position === 'bottom' ? 'flex-end' :
    position === 'top'    ? 'flex-start' :
    position === 'left'   ? 'flex-start' :
                            'flex-end'

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isVertical ? 'column' : 'row',
    alignItems,
    justifyContent: 'center',
    gap: GAP,
    padding: PADDING,
    ...(isVertical
      ? { width: baseSize + PADDING * 2 }
      : { height: baseSize + PADDING * 2 }),
    overflow: 'visible',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 100%)',
    backdropFilter: 'blur(32px) saturate(180%)',
    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
    borderRadius: 20,
    border: '0.5px solid rgba(255,255,255,0.4)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.6)',
  }

  const menuItemStyle = (danger = false): React.CSSProperties => ({
    padding: '5px 14px',
    fontSize: 12,
    color: danger ? '#ff6b6b' : 'rgba(255,255,255,0.92)',
    cursor: 'pointer',
    borderRadius: 6,
    userSelect: 'none',
    textShadow: '0 1px 3px rgba(0,0,0,0.3)',
  })

  // ── Pointer-based drag handler for dock items ──────────────
  const handlePointerDown = (e: React.PointerEvent, appIndex: number) => {
    if (e.button !== 0) return
    e.preventDefault()

    const app = visibleApps[appIndex]
    const startX = e.clientX
    const startY = e.clientY
    const pos = position
    const bs = baseSize
    const isVert = isVertical
    const numApps = visibleApps.length
    // Snapshot dock rect at drag start for stable index calculation
    // (the dock is centered, so its left/top shifts when items collapse/expand)
    const initialDockRect = dockInnerRef.current?.getBoundingClientRect() ?? null
    let dragActive = false
    let latestInsertIndex: number | null = null
    let latestIsOutside = false

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - startX
      const dy = me.clientY - startY

      if (!dragActive) {
        if (Math.sqrt(dx * dx + dy * dy) < 5) return
        dragActive = true
        setDragSourceIndex(appIndex)
        mouseVal.set(Infinity)
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'grabbing'
      }

      // Use initial rect for ALL calculations (avoids jitter from dock center-shift)
      if (!initialDockRect) return

      const expand = bs
      let overDock = false
      switch (pos) {
        case 'bottom':
        case 'top':
          overDock = me.clientY >= initialDockRect.top - expand && me.clientY <= initialDockRect.bottom + expand
                  && me.clientX >= initialDockRect.left - expand && me.clientX <= initialDockRect.right + expand
          break
        case 'left':
        case 'right':
          overDock = me.clientX >= initialDockRect.left - expand && me.clientX <= initialDockRect.right + expand
                  && me.clientY >= initialDockRect.top - expand && me.clientY <= initialDockRect.bottom + expand
          break
      }

      if (overDock) {
        // Use INITIAL rect for index calculation (stable reference frame)
        const slotSize = bs + GAP
        const fixedSlots = 3 // home + bookmark-store + settings
        const maxIdx = numApps - 1
        const rawPos = !isVert
          ? (me.clientX - initialDockRect.left - PADDING - fixedSlots * slotSize - bs / 2) / slotSize
          : (me.clientY - initialDockRect.top - PADDING - fixedSlots * slotSize - bs / 2) / slotSize
        const newIdx = Math.max(0, Math.min(maxIdx, Math.round(rawPos)))

        // Hysteresis: only switch index if cursor is past the midpoint + deadzone
        if (latestInsertIndex === null || newIdx === latestInsertIndex) {
          latestInsertIndex = newIdx
        } else {
          const boundary = (latestInsertIndex + newIdx) / 2
          const pastDeadzone = newIdx > latestInsertIndex
            ? rawPos > boundary + 0.25
            : rawPos < boundary - 0.25
          if (pastDeadzone) latestInsertIndex = newIdx
        }
        latestIsOutside = false
      } else {
        latestInsertIndex = null
        switch (pos) {
          case 'bottom': latestIsOutside = me.clientY < initialDockRect.top - bs; break
          case 'top':    latestIsOutside = me.clientY > initialDockRect.bottom + bs; break
          case 'left':   latestIsOutside = me.clientX > initialDockRect.right + bs; break
          case 'right':  latestIsOutside = me.clientX < initialDockRect.left - bs; break
        }
      }

      setDragOverIndex(latestInsertIndex)
      setPointerDrag({
        appIndex, app,
        currentX: me.clientX, currentY: me.clientY,
        isOutside: latestIsOutside,
      })
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      if (!dragActive) return

      const currentApps = appsRef.current
      if (latestInsertIndex !== null) {
        const collapsed = [...currentApps.slice(0, appIndex), ...currentApps.slice(appIndex + 1)]
        const result = [...collapsed.slice(0, latestInsertIndex), currentApps[appIndex], ...collapsed.slice(latestInsertIndex)]
        setConfig({ dockApps: result })
      } else if (latestIsOutside) {
        setConfig({ dockApps: currentApps.filter((_, i) => i !== appIndex) })
      }

      setPointerDrag(null)
      setDragSourceIndex(null)
      setDragOverIndex(null)
      mouseVal.set(Infinity)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── Build dock app elements (internal reorder = swap positions, no spacer) ──
  const dockAppElements: React.ReactNode[] = []

  // When doing internal pointer-drag reorder, compute the visual order
  const isInternalReorder = dragSourceIndex !== null && dragOverIndex !== null
  const isRemoveDrag = dragSourceIndex !== null && dragOverIndex === null

  // Build the visual order of apps for internal reorder
  let visualApps: { app: typeof visibleApps[0]; origIdx: number }[]
  if (isInternalReorder) {
    // Remove source from original position, insert at dragOverIndex
    const items = visibleApps.map((app, i) => ({ app, origIdx: i }))
    const [dragged] = items.splice(dragSourceIndex!, 1)
    items.splice(dragOverIndex!, 0, dragged)
    visualApps = items
  } else {
    visualApps = visibleApps.map((app, i) => ({ app, origIdx: i }))
  }

  for (let vi = 0; vi < visualApps.length; vi++) {
    const { app, origIdx } = visualApps[vi]
    const isSource = origIdx === dragSourceIndex

    // For remove drag (outside dock): source collapses to 0
    const collapseStyle: React.CSSProperties = isRemoveDrag && isSource
      ? (isVertical
          ? { height: 0, marginTop: -(GAP / 2), marginBottom: -(GAP / 2),
              transition: 'height 0.2s cubic-bezier(.4,0,.2,1), margin 0.2s cubic-bezier(.4,0,.2,1), opacity 0.15s ease' }
          : { width: 0, marginLeft: -(GAP / 2), marginRight: -(GAP / 2),
              transition: 'width 0.2s cubic-bezier(.4,0,.2,1), margin 0.2s cubic-bezier(.4,0,.2,1), opacity 0.15s ease' })
      : {}

    dockAppElements.push(
      <motion.div
        key={app.id}
        layout
        transition={isInternalReorder
          ? { layout: { type: 'spring', stiffness: 500, damping: 38, mass: 0.8 } }
          : { layout: { duration: 0 } }}
        onPointerDown={e => handlePointerDown(e, origIdx)}
        onDragStart={e => e.preventDefault()}
        style={{
          flexShrink: 0,
          overflow: (isRemoveDrag && isSource) ? 'hidden' : 'visible',
          opacity: isSource ? 0 : 1,
          borderRadius: '22%',
          ...collapseStyle,
        }}
      >
        <DockItem
          app={app}
          {...itemProps}
          isOpen={openedApps.has(app.id)}
          onClick={() => openApp(app)}
          onContextMenu={(e) => handleContextMenu(e, app, false)}
        />
      </motion.div>,
    )
  }

  // 临时图标拖入固定区时，在目标位置插入占位符
  if (runningDragInsertIdx !== null) {
    dockAppElements.splice(runningDragInsertIdx, 0, (
      <motion.div
        key="running-insert-placeholder"
        layout
        transition={{ layout: { type: 'spring', stiffness: 500, damping: 38, mass: 0.8 } }}
        style={{
          flexShrink: 0,
          width: baseSize, height: baseSize,
          borderRadius: '22%',
          border: '2px dashed rgba(255,255,255,0.55)',
          background: 'rgba(255,255,255,0.1)',
        }}
      />
    ))
  }

  return (
    <>
      <div style={{ ...getDockWrapperStyle(position), zIndex: Math.max(210, topZIndex + 10) }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}>
        <motion.div
          ref={dockInnerRef}
          onMouseMove={(contextMenu || pointerDrag) ? undefined : (e) => mouseVal.set(isVertical ? e.clientY : e.clientX)}
          onMouseLeave={() => { mouseVal.set(Infinity) }}
          style={{ ...containerStyle, pointerEvents: (contextMenu || pointerDrag) ? 'none' : 'auto' }}
        >
          {/* 书签管理（固定，无右键菜单） */}
          <DockItem
            app={homeApp}
            {...itemProps}
            onClick={() => {
              onSettingsClose()
              setOverflowOpen(false)
              if (launchpadOpen) {
                // 已打开，关闭
                setLaunchpadOpen(false)
              } else {
                // 未打开，打开并置顶
                setLaunchpadOpen(true)
                const newZ = topZIndex + 1
                setLaunchpadZIndex(newZ)
                setTopZIndex(newZ)
              }
            }}
          >
            <LaunchpadIcon size={baseSize} />
          </DockItem>

          {/* 在线书签（固定内置） */}
          <DockItem
            app={storeApp}
            {...itemProps}
            isOpen={storeActive}
            onClick={() => {
              onSettingsClose()
              setOverflowOpen(false)
              if (launchpadOpen) setLaunchpadOpen(false)
              if (!storeActive) {
                // 首次打开
                setStoreActive(true)
                setStoreOpen(true)
                const newZ = topZIndex + 1
                setStoreZIndex(newZ)
                setTopZIndex(newZ)
              } else if (storeOpen) {
                // 已打开且窗口可见，置顶
                const newZ = topZIndex + 1
                setStoreZIndex(newZ)
                setTopZIndex(newZ)
              } else {
                // 已激活但窗口隐藏，重新显示并置顶
                setStoreOpen(true)
                const newZ = topZIndex + 1
                setStoreZIndex(newZ)
                setTopZIndex(newZ)
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, storeApp, true, false)}
          >
            <img src="/icons/bookmark_store.svg" alt="" style={{ width: baseSize, height: baseSize }} />
          </DockItem>

          {/*/!* 百宝箱（固定内置） *!/*/}
          {/*<DockItem*/}
          {/*  app={toolboxApp}*/}
          {/*  {...itemProps}*/}
          {/*  onClick={() => { onSettingsClose(); setOverflowOpen(false); setToolboxOpen(v => !v) }}*/}
          {/*>*/}
          {/*  <img src="/icons/toolbox.svg" alt="" style={{ width: baseSize, height: baseSize }} />*/}
          {/*</DockItem>*/}

          {/* 设置（固定，系统内置） */}
          <DockItem
            app={settingsApp}
            {...itemProps}
            isOpen={settingsActive}
            onClick={() => {
              if (launchpadOpen) setLaunchpadOpen(false)
              if (!settingsActive) {
                onSettingsOpen()
                const newZ = topZIndex + 1
                setTopZIndex(newZ)
                setSettingsZIndex(newZ)
                onSettingsZIndexChange(newZ)
              } else if (settingsOpen) {
                // 如果已经打开，检查是否已经在顶部
                if (settingsZIndex >= storeZIndex && settingsZIndex >= launchpadZIndex) {
                  // 已经在顶部，不做任何操作
                  return
                }
                // 不在顶部，置顶
                const newZ = topZIndex + 1
                setTopZIndex(newZ)
                setSettingsZIndex(newZ)
                onSettingsZIndexChange(newZ)
              } else {
                onSettingsReopen()
                const newZ = topZIndex + 1
                setTopZIndex(newZ)
                setSettingsZIndex(newZ)
                onSettingsZIndexChange(newZ)
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, settingsApp, true, true)}
          >
            <SettingsGearIcon size={baseSize} />
          </DockItem>

          {/* 可见图标 + 拖拽缺口 */}
          {dockAppElements}

          {/* 分割线 + 临时运行图标（从书签宫格打开、未固定） */}
          {runningApps.length > 0 && (
            <div style={isVertical ? {
              width: Math.round(baseSize * 0.55), height: 1,
              background: 'rgba(255,255,255,0.3)', flexShrink: 0,
              margin: `${Math.round(GAP * 0.5)}px auto`,
            } : {
              height: Math.round(baseSize * 0.55), width: 1,
              background: 'rgba(255,255,255,0.3)', flexShrink: 0,
              margin: `auto ${Math.round(GAP * 0.5)}px`,
            }} />
          )}
          {runningApps.map(app => (
            <motion.div
              key={app.id}
              layout
              transition={{ layout: { duration: 0 } }}
              onPointerDown={e => handleRunningPointerDown(e, app)}
              onDragStart={e => e.preventDefault()}
              style={{ flexShrink: 0, opacity: runningDragApp?.id === app.id ? 0 : 1 }}
            >
              <DockItem
                app={app}
                {...itemProps}
                isOpen={openedApps.has(app.id)}
                onClick={() => {
                  const tabId = openedApps.get(app.id)
                  if (tabId !== undefined) chrome.tabs.update(tabId, { active: true })
                  else if (app.url) {
                    chrome.tabs.create({ url: app.url }, (tab) => {
                      if (tab?.id !== undefined)
                        setOpenedApps(prev => new Map([...prev, [app.id, tab.id!]]))
                    })
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, app, false, false, true)}
              />
            </motion.div>
          ))}

          {/* 溢出分组图标 */}
          {overflowApps.length > 0 && (
            <div ref={overflowRef}>
              <DockItem
                app={{ id: 'overflow', name: t('overflow_tooltip'), emoji: '', color: 'transparent' }}
                {...itemProps}
                onClick={() => setOverflowOpen((v) => !v)}
              >
                <OverflowIcon apps={overflowApps} />
              </DockItem>
            </div>
          )}

        </motion.div>
      </div>

      {/* 拖拽浮动图标 + 移除标签 */}
      {pointerDrag && (
        <DockDragOverlay
          app={pointerDrag.app}
          baseSize={baseSize}
          x={pointerDrag.currentX}
          y={pointerDrag.currentY}
          isOutside={pointerDrag.isOutside}
          removeLabel={t('dock_remove_label')}
        />
      )}

      {/* 右键菜单遮罩：点击空白处关闭 */}
      {contextMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: Math.max(799, topZIndex + 100) }} onClick={() => setContextMenu(null)} />
      )}

      {/* 右键菜单 */}
      <AnimatePresence>
        {contextMenu && (() => {
          const { arrowSide, arrowOffset } = contextMenu
          const arrowColor = 'rgba(255,255,255,0.55)'
          // 箭头偏移量限制在 popup 边缘内
          const clampedOffset = Math.max(-56, Math.min(56, arrowOffset))

          const transformOriginMap = {
            bottom: 'bottom center',
            top: 'top center',
            left: 'left center',
            right: 'right center',
          }
          const initMotion =
            arrowSide === 'bottom' ? { y: 8 } :
            arrowSide === 'top'    ? { y: -8 } :
            arrowSide === 'left'   ? { x: -8 } :
                                     { x: 8 }

          // SVG 圆角箭头（Q bezier 使尖端轻微圆滑）
          const AF = arrowColor
          const arrowEl = (() => {
            const base: React.CSSProperties = { position: 'absolute', pointerEvents: 'none' }
            const o = `calc(50% + ${clampedOffset}px)`
            switch (arrowSide) {
              case 'bottom': return (
                <svg style={{ ...base, bottom: -9, left: o, transform: 'translateX(-50%)' }}
                  width="16" height="9" viewBox="0 0 16 9" fill="none">
                  <path d="M0 0 L6.5 7.5 Q8 9 9.5 7.5 L16 0 Z" fill={AF}/>
                </svg>
              )
              case 'top': return (
                <svg style={{ ...base, top: -9, left: o, transform: 'translateX(-50%)' }}
                  width="16" height="9" viewBox="0 0 16 9" fill="none">
                  <path d="M0 9 L6.5 1.5 Q8 0 9.5 1.5 L16 9 Z" fill={AF}/>
                </svg>
              )
              case 'left': return (
                <svg style={{ ...base, left: -9, top: o, transform: 'translateY(-50%)' }}
                  width="9" height="16" viewBox="0 0 9 16" fill="none">
                  <path d="M9 0 L1.5 6.5 Q0 8 1.5 9.5 L9 16 Z" fill={AF}/>
                </svg>
              )
              case 'right': return (
                <svg style={{ ...base, right: -9, top: o, transform: 'translateY(-50%)' }}
                  width="9" height="16" viewBox="0 0 9 16" fill="none">
                  <path d="M0 0 L7.5 6.5 Q9 8 7.5 9.5 L0 16 Z" fill={AF}/>
                </svg>
              )
            }
          })()

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.82, ...initMotion }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.82, ...initMotion }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y,
                zIndex: Math.max(800, topZIndex + 101),
                background: 'linear-gradient(135deg, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.38) 100%)',
                backdropFilter: 'blur(32px) saturate(180%)',
                WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                borderRadius: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.5)',
                padding: 4,
                minWidth: 160,
                transformOrigin: transformOriginMap[arrowSide],
              }}
            >
              {arrowEl}
              {contextMenu.isSettings ? (
                settingsActive ? (
                  <div
                    style={menuItemStyle()}
                    onMouseEnter={e => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.92)' }}
                    onClick={() => { onSettingsExit(); setContextMenu(null) }}
                  >
                    {t('dock_menu_exit')}
                  </div>
                ) : (
                  <div
                    style={menuItemStyle()}
                    onMouseEnter={e => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.92)' }}
                    onClick={() => { onSettingsOpen(); setContextMenu(null) }}
                  >
                    {t('dock_menu_open')}
                  </div>
                )
              ) : contextMenu.app.id === 'bookmark-store' ? (
                storeActive ? (
                  <div
                    style={menuItemStyle()}
                    onMouseEnter={e => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.92)' }}
                    onClick={() => { setStoreActive(false); setStoreOpen(false); setContextMenu(null) }}
                  >
                    {t('dock_menu_exit')}
                  </div>
                ) : (
                  <div
                    style={menuItemStyle()}
                    onMouseEnter={e => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.92)' }}
                    onClick={() => { setStoreActive(true); setStoreOpen(true); setContextMenu(null) }}
                  >
                    {t('dock_menu_open')}
                  </div>
                )
              ) : contextMenu.isRunning ? (
                // 临时运行图标：根据标签页状态显示不同菜单
                <>
                  <div
                    style={menuItemStyle()}
                    onMouseEnter={e => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.92)' }}
                    onClick={() => {
                      // 移入固定区：添加到 dockApps 末尾，从 runningApps 移除
                      setConfig({ dockApps: [...apps, contextMenu.app] })
                      setRunningApps(prev => prev.filter(a => a.id !== contextMenu.app.id))
                      setContextMenu(null)
                    }}
                  >
                    {t('dock_menu_keep_in_dock')}
                  </div>
                  {openedApps.has(contextMenu.app.id) ? (
                    // 标签页打开中：显示"退出"
                    <div
                      style={menuItemStyle()}
                      onMouseEnter={e => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.92)' }}
                      onClick={() => {
                        const tabId = openedApps.get(contextMenu.app.id)
                        if (tabId !== undefined) chrome.tabs.remove(tabId)
                        setOpenedApps(prev => { const m = new Map(prev); m.delete(contextMenu.app.id); return m })
                        setContextMenu(null)
                      }}
                    >
                      {t('dock_menu_exit')}
                    </div>
                  ) : (
                    // 标签页已关闭：显示"移除书签栏"
                    <>
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />
                      <div
                        style={menuItemStyle(true)}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.25)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        onClick={() => {
                          setRunningApps(prev => prev.filter(a => a.id !== contextMenu.app.id))
                          setContextMenu(null)
                        }}
                      >
                        {t('dock_remove_label')}
                      </div>
                    </>
                  )}
                </>
              ) : openedApps.has(contextMenu.app.id) ? (
                <div
                  style={menuItemStyle()}
                  onMouseEnter={e => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.92)' }}
                  onClick={() => {
                    const tabId = openedApps.get(contextMenu.app.id)
                    if (tabId !== undefined) chrome.tabs.remove(tabId)
                    setOpenedApps(prev => { const m = new Map(prev); m.delete(contextMenu.app.id); return m })
                    setContextMenu(null)
                  }}
                >
                  {t('dock_menu_exit')}
                </div>
              ) : (
                <div
                  style={menuItemStyle()}
                  onMouseEnter={e => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.92)' }}
                  onClick={() => { openApp(contextMenu.app); setContextMenu(null) }}
                >
                  {t('dock_menu_open')}
                </div>
              )}
              {!contextMenu.isSystem && !contextMenu.isRunning && (
                <>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />
                  <div
                    style={menuItemStyle(true)}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    onClick={() => {
                      setConfig({ dockApps: apps.filter(a => a.id !== contextMenu.app.id) })
                      const tabId = openedApps.get(contextMenu.app.id)
                      if (tabId !== undefined) chrome.tabs.remove(tabId)
                      setOpenedApps(prev => { const m = new Map(prev); m.delete(contextMenu.app.id); return m })
                      setContextMenu(null)
                    }}
                  >
                    {t('dock_remove_label')}
                  </div>
                </>
              )}
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* 溢出 app 弹出网格 */}
      <AppGrid
        apps={overflowApps}
        anchorEl={overflowRef.current}
        dockPosition={position}
        dockClearance={baseSize + PADDING * 2 + 16}
        open={overflowOpen}
        onClose={() => setOverflowOpen(false)}
      />

      <BookmarkLaunchpad 
        open={launchpadOpen} 
        onClose={() => setLaunchpadOpen(false)} 
        onOpenBookmark={handleOpenFromLaunchpad} 
        initialCategoryId={launchpadInitialCategoryId}
        zIndex={launchpadZIndex}
      />

      <StorePanel
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        plugin={bookmarkStorePlugin}
        mode="bookmark"
        title={t('bookmark_store_tooltip')}
        panelIcon="/icons/bookmark_store.svg"
        zIndex={storeZIndex}
      />

      <StorePanel
        open={toolboxOpen}
        onClose={() => setToolboxOpen(false)}
        plugin={toolboxPlugin}
        mode="tool"
        title={t('toolbox_tooltip')}
        panelIcon="/icons/toolbox.svg"
      />
    </>
  )
}

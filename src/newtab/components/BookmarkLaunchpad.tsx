import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '../i18n'
import { useDockConfig, DEFAULT_BOOKMARK_LAYOUT, BUILTIN_SEARCH_ENGINES, BookmarkItem } from '../store/dockConfig'
import BookmarkEditModal, { BookmarkFormData, injectSvgColor } from './BookmarkEditModal'
import { loadIconWithCache } from '../utils/imageCache'

/** 带缓存的书签图标：优先 IndexedDB，失败后回退原始 URL，加载错误显示首字母 */
function CachedBookmarkIcon({ src, name, style }: { src: string; name: string; style?: React.CSSProperties }) {
  const [resolvedSrc, setResolvedSrc] = useState(src)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setErrored(false)
    setResolvedSrc(src)
    loadIconWithCache(src).then(setResolvedSrc)
  }, [src])

  if (errored) {
    // 无法加载时显示首字母 fallback，而非 alt 文字 / 裂图
    return (
      <div style={{
        width: style?.width ?? '72%',
        height: style?.height ?? '72%',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.85)',
        background: 'rgba(255,255,255,0.15)',
        userSelect: 'none',
        flexShrink: 0,
      }}>
        {(name || '?')[0].toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={resolvedSrc}
      alt=""
      style={style}
      onError={() => setErrored(true)}
    />
  )
}

interface Category {
  id: string
  label: string
  bookmarks: BookmarkItem[]
}


// ── 缩放尺寸映射 (scale 1–5) ──────────────────────────────
const SCALE_MAP = [0, 56, 72, 88, 104, 124] // index 0 unused

// ── 动画效果映射 ──────────────────────────────────────────
type ItemVariant = { initial: Record<string, unknown>; transition: Record<string, unknown> }

function getItemVariant(effect: string, i: number): ItemVariant {
  if (effect === 'none') return { initial: { opacity: 1 }, transition: { duration: 0 } }
  const d = Math.min(i * 0.012, 0.18)
  const spring = { type: 'spring' as const, stiffness: 480, damping: 28, delay: d }
  const tween  = { duration: 0.16, ease: 'easeOut' as const, delay: d }

  const MAP: Record<string, ItemVariant> = {
    fadeIn:           { initial: { opacity: 0 },                         transition: tween },
    fadeInUp:         { initial: { opacity: 0, y: 24 },                  transition: tween },
    fadeInDown:       { initial: { opacity: 0, y: -24 },                 transition: tween },
    fadeInLeft:       { initial: { opacity: 0, x: -24 },                 transition: tween },
    fadeInRight:      { initial: { opacity: 0, x: 24 },                  transition: tween },
    zoomIn:           { initial: { opacity: 0, scale: 0.5 },             transition: spring },
    zoomInUp:         { initial: { opacity: 0, scale: 0.5, y: 24 },      transition: spring },
    zoomInDown:       { initial: { opacity: 0, scale: 0.5, y: -24 },     transition: spring },
    zoomInLeft:       { initial: { opacity: 0, scale: 0.5, x: -24 },     transition: spring },
    zoomInRight:      { initial: { opacity: 0, scale: 0.5, x: 24 },      transition: spring },
    slideInUp:        { initial: { opacity: 0, y: 40 },                  transition: tween },
    slideInDown:      { initial: { opacity: 0, y: -40 },                 transition: tween },
    slideInLeft:      { initial: { opacity: 0, x: -40 },                 transition: tween },
    slideInRight:     { initial: { opacity: 0, x: 40 },                  transition: tween },
    bounceIn:         { initial: { opacity: 0, scale: 0.3 },             transition: { type: 'spring' as const, stiffness: 500, damping: 18, delay: d } },
    bounceInUp:       { initial: { opacity: 0, scale: 0.3, y: 30 },      transition: { type: 'spring' as const, stiffness: 500, damping: 18, delay: d } },
    bounceInDown:     { initial: { opacity: 0, scale: 0.3, y: -30 },     transition: { type: 'spring' as const, stiffness: 500, damping: 18, delay: d } },
    bounceInLeft:     { initial: { opacity: 0, scale: 0.3, x: -30 },     transition: { type: 'spring' as const, stiffness: 500, damping: 18, delay: d } },
    bounceInRight:    { initial: { opacity: 0, scale: 0.3, x: 30 },      transition: { type: 'spring' as const, stiffness: 500, damping: 18, delay: d } },
    flipInX:          { initial: { opacity: 0, rotateX: 90 },            transition: tween },
    flipInY:          { initial: { opacity: 0, rotateY: 90 },            transition: tween },
    rotateIn:         { initial: { opacity: 0, rotate: -150 },           transition: tween },
    rotateInDownLeft: { initial: { opacity: 0, rotate: -45, x: -20 },   transition: tween },
    rotateInDownRight:{ initial: { opacity: 0, rotate: 45,  x: 20 },    transition: tween },
    rotateInUpLeft:   { initial: { opacity: 0, rotate: 45,  x: -20 },   transition: tween },
    rotateInUpRight:  { initial: { opacity: 0, rotate: -45, x: 20 },    transition: tween },
    rollIn:           { initial: { opacity: 0, x: -60, rotate: -120 },  transition: tween },
    lightSpeedInLeft: { initial: { opacity: 0, x: -80, skewX: 30 },     transition: { duration: 0.18, ease: 'easeOut' as const, delay: d } },
    lightSpeedInRight:{ initial: { opacity: 0, x: 80,  skewX: -30 },    transition: { duration: 0.18, ease: 'easeOut' as const, delay: d } },
    jackInTheBox:     { initial: { opacity: 0, scale: 0.1, rotate: 30 },transition: spring },
  }
  return MAP[effect] ?? { initial: { opacity: 0, scale: 0.55 }, transition: spring } as ItemVariant
}


function SearchIcon({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <img
      src="/icons/search.svg"
      style={{ width: size, height: size, flexShrink: 0, opacity: 0.75, ...style }}
    />
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onOpenBookmark?: (bookmark: BookmarkItem) => void
  initialCategoryId?: string
}

export default function BookmarkLaunchpad({ open, onClose, onOpenBookmark, initialCategoryId }: Props) {
  const t = useT()
  const { config, setConfig } = useDockConfig()
  const layout = config.bookmarkLayout ?? DEFAULT_BOOKMARK_LAYOUT
  const rawBookmarks = config.bookmarks ?? []

  // 动态构建分类列表：全部（可选）+ 按分类定义过滤
  const showCatAll = layout.showCatAll !== false
  const subCategories: Category[] = (layout.categories ?? [])
    .filter(cat => rawBookmarks.some(b => b.categoryId === cat.id))
    .map(cat => ({
      id: cat.id,
      label: cat.name,
      bookmarks: rawBookmarks.filter(b => b.categoryId === cat.id),
    }))
  const CATEGORIES: Category[] = [
    ...(showCatAll ? [{ id: 'all', label: t('bookmark_cat_all'), bookmarks: rawBookmarks }] : []),
    ...subCategories,
  ]

  const [query, setQuery] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState(() => showCatAll ? 'all' : (subCategories[0]?.id ?? 'all'))
  const [animPreviewKey, setAnimPreviewKey] = useState(0)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [toastName, setToastName] = useState('')
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null)
  const [selectedEngineId, setSelectedEngineId] = useState(layout.defaultSearchEngineId)
  const [showEngineMenu, setShowEngineMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<HTMLDivElement>(null)
  const catSwitchCooldownRef = useRef(false)
  const prevSearchingRef = useRef(false)
  const addBookmarkToDock = (bookmark: BookmarkItem) => {
    const dockApps = config.dockApps ?? []
    if (dockApps.some(a => a.url === bookmark.url)) return
    const newApp = {
      id: `app_${Date.now()}`,
      name: bookmark.name,
      emoji: (bookmark.iconType === 'builtin' || bookmark.iconType === 'text') ? bookmark.iconValue : '🌐',
      color: bookmark.bgColor || '#636366',
      url: bookmark.url,
      iconUrl: bookmark.iconType === 'url' ? bookmark.iconValue : undefined,
      bmIconType: bookmark.iconType as 'url' | 'svg' | 'builtin' | 'text',
      bmIconValue: bookmark.iconValue,
      bmSvgColor: bookmark.svgColor,
      bmIconFit: bookmark.iconFit,
    }
    setConfig({ dockApps: [...dockApps, newApp] })
  }

  const batchAddToDock = () => {
    const dockApps = config.dockApps ?? []
    const selected = rawBookmarks.filter(b => selectedIds.has(b.id))
    const toAdd = selected.filter(b => !dockApps.some(a => a.url === b.url))
    if (toAdd.length === 0) return
    const newApps = toAdd.map((b, i) => ({
      id: `app_${Date.now()}_${i}`,
      name: b.name,
      emoji: (b.iconType === 'builtin' || b.iconType === 'text') ? b.iconValue : '🌐',
      color: b.bgColor || '#636366',
      url: b.url,
      iconUrl: b.iconType === 'url' ? b.iconValue : undefined,
      bmIconType: b.iconType as 'url' | 'svg' | 'builtin' | 'text',
      bmIconValue: b.iconValue,
      bmSvgColor: b.svgColor,
      bmIconFit: b.iconFit,
    }))
    setConfig({ dockApps: [...dockApps, ...newApps] })
    setSelectedIds(new Set()); setBatchMode(false)
  }

  const openBookmark = (bookmark: BookmarkItem) => {
    if (onOpenBookmark) {
      onOpenBookmark(bookmark)
      return
    }
    const mode = layout.openMode ?? 'newtab'
    if (mode === 'current') {
      window.location.href = bookmark.url
    } else {
      window.open(bookmark.url, '_blank')
    }
  }

  const moreRef = useRef<HTMLDivElement>(null)

  const [bmContextMenu, setBmContextMenu] = useState<{ x: number; y: number; bookmark: BookmarkItem } | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BookmarkItem | null>(null)
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [movePicker, setMovePicker] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Cmd+O (Mac) / Ctrl+O (Windows) 快捷键打开新增书签弹窗
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault()
        setAddModalOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      const targetCat = initialCategoryId ?? (showCatAll ? 'all' : (subCategories[0]?.id ?? 'all'))
      setActiveCategoryId(targetCat)
      setSelectedEngineId(layout.defaultSearchEngineId)
      setShowEngineMenu(false)
      setTimeout(() => inputRef.current?.focus(), 150)
    } else {
      setToastName('')
      setBatchMode(false)
      setSelectedIds(new Set())
      setBmContextMenu(null)
      setMoreMenuOpen(false)
      setMovePicker(null)
    }
  }, [open])

  // 点击外部关闭引擎下拉 / 更多菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (engineRef.current && !engineRef.current.contains(e.target as Node)) setShowEngineMenu(false)
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 点击外部关闭书签右键菜单
  useEffect(() => {
    if (!bmContextMenu) return
    const close = () => setBmContextMenu(null)
    const timer = setTimeout(() => {
      window.addEventListener('click', close)
      window.addEventListener('contextmenu', close)
    }, 0)
    return () => { clearTimeout(timer); window.removeEventListener('click', close); window.removeEventListener('contextmenu', close) }
  }, [bmContextMenu])

  // 点击外部关闭分类选择器
  useEffect(() => {
    if (!movePicker) return
    const close = () => setMovePicker(null)
    const timer = setTimeout(() => {
      window.addEventListener('click', close)
      window.addEventListener('contextmenu', close)
    }, 0)
    return () => { clearTimeout(timer); window.removeEventListener('click', close); window.removeEventListener('contextmenu', close) }
  }, [movePicker])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (batchMode) { setBatchMode(false); setSelectedIds(new Set()) }
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, batchMode])

  // 设置里切换动画效果时，实时预览
  useEffect(() => {
    if (open) setAnimPreviewKey(k => k + 1)
  }, [layout.animationEffect])


  const activeCategory = CATEGORIES.find(c => c.id === activeCategoryId) ?? CATEGORIES[0] ?? { id: 'all', label: '', bookmarks: rawBookmarks }

  const isOnlineScope = layout.searchScope === 'online'
  // 在线模式不做本地过滤，全部展示；本地模式实时过滤
  const filtered = (!isOnlineScope && query.trim())
    ? (() => {
        const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
        return activeCategory.bookmarks.filter(b => {
          const name = b.name.toLowerCase()
          return keywords.every(kw => name.includes(kw))
        })
      })()
    : activeCategory.bookmarks

  const handleSearch = (q: string) => {
    if (!q.trim() || layout.searchScope !== 'online') return
    const engine = BUILTIN_SEARCH_ENGINES.find(e => e.id === selectedEngineId)
      ?? BUILTIN_SEARCH_ENGINES[0]
    if (engine) window.open(engine.url.replace('{query}', encodeURIComponent(q.trim())), '_blank')
  }

  const handleClearQuery = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  const handleCategoryChange = (id: string) => {
    setActiveCategoryId(id)
    setQuery('')
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // 横向滑动切换分类（触控板水平滚动）
  const handleContentWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 20) return
    if (catSwitchCooldownRef.current) return
    const idx = CATEGORIES.findIndex(c => c.id === activeCategoryId)
    const nextIdx = e.deltaX > 0 ? idx + 1 : idx - 1
    if (nextIdx < 0 || nextIdx >= CATEGORIES.length) return
    handleCategoryChange(CATEGORIES[nextIdx].id)
    catSwitchCooldownRef.current = true
    setTimeout(() => { catSwitchCooldownRef.current = false }, 450)
  }

  const toggleSelection = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })

  const deleteBookmark = (bm: BookmarkItem) => {
    setConfig({ bookmarks: rawBookmarks.filter(b => b.id !== bm.id) })
    setBmContextMenu(null)
  }

  const saveBookmark = (data: BookmarkFormData) => {
    if (editTarget) {
      setConfig({ bookmarks: rawBookmarks.map(b => b.id === editTarget.id ? { ...b, ...data } : b) })
      setEditTarget(null)
    } else {
      setConfig({ bookmarks: [...rawBookmarks, { ...data, id: `bm_${Date.now()}` }] })
      setAddModalOpen(false)
      // 跳转到新书签所在分类，方便用户确认已添加
      setActiveCategoryId(data.categoryId && data.categoryId !== '' ? data.categoryId : (showCatAll ? 'all' : (subCategories[0]?.id ?? 'all')))
    }
  }

  const execBatchDelete = () => {
    setConfig({ bookmarks: rawBookmarks.filter(b => !selectedIds.has(b.id)) })
    setSelectedIds(new Set()); setBatchMode(false); setConfirmState(null)
  }

  const execMoveTo = (categoryId: string) => {
    setConfig({ bookmarks: rawBookmarks.map(b => selectedIds.has(b.id) ? { ...b, categoryId } : b) })
    setSelectedIds(new Set()); setBatchMode(false); setConfirmState(null); setMovePicker(null)
  }

  // ── 程序坞边距 ──
  const dockClearance = 16 + config.baseSize + 20 + 12
  const { position } = config
  const isVerticalDock = position === 'left' || position === 'right'
  const overlayPadding = {
    paddingTop:    position === 'top'    ? dockClearance : 0,
    paddingBottom: position === 'bottom' ? dockClearance : 0,
    paddingLeft:   position === 'left'   ? dockClearance : 0,
    paddingRight:  position === 'right'  ? dockClearance : 0,
  }
  // 计算内容区实际可用宽度（左/右侧程序坞时需减去占位）
  const effectiveWidth = isVerticalDock ? windowWidth - dockClearance : windowWidth

  // ── 搜索框尺寸（等比缩放）──
  const SEARCH_SCALE_MAP = [0, 0.75, 1.0, 1.25, 1.5, 1.85]
  const sm           = SEARCH_SCALE_MAP[layout.searchBarScale ?? 2] ?? 1.0
  const searchWidth  = Math.round(windowWidth * 0.3 * sm)
  const searchPadV   = Math.round(10 * sm)
  const searchPadR   = Math.round(16 * sm)
  const searchFont   = Math.round(13 * sm)
  const searchIconL  = Math.round(14 * sm)
  // 圆角: 0=无 1=小圆(30%) 2=中圆(60%) 3=椭圆(100%)，百分比基于输入框半高
  const halfH = searchPadV + Math.round(searchFont * 0.7)
  const searchRadiusMap = [0, Math.round(halfH * 0.3), Math.round(halfH * 0.6), 9999]
  const searchRadius = searchRadiusMap[layout.searchBarRadius ?? 2] ?? searchRadiusMap[2]

  // ── 尺寸计算 ──
  const iconSize  = SCALE_MAP[layout.scale] ?? 72
  const labelSize = Math.max(11, Math.round(iconSize * 0.165))
  const isList    = layout.displayType === 'list'
  // 自动列数：(可用宽度 + 列间距) / (单格宽 + 列间距)，最少 2 列
  const cellW     = iconSize + 28
  const colGap    = 10
  const sidePad   = 80
  const cols      = isList ? 1 : Math.max(2, Math.floor((effectiveWidth - sidePad - 4 + colGap) / (cellW + colGap)))
  const showName  = layout.displayStyle !== 'icon-only'
  const showIcon  = layout.displayStyle !== 'name-only'

  const emptySpan = isList ? 1 : cols

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            backdropFilter: 'blur(48px) saturate(180%) brightness(0.55)',
            WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(0.55)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            ...overlayPadding,
          }}
        >
          {/* ── icon-only toast ── */}
          <AnimatePresence>
            {toastName && (
              <motion.div
                key="toast"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(255,255,255,0.92)', color: 'rgba(0,0,0,0.75)',
                  fontSize: 13, fontWeight: 500, padding: '6px 18px', borderRadius: 999,
                  pointerEvents: 'none', whiteSpace: 'nowrap',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.08)',
                  zIndex: 10,
                }}
              >
                {toastName}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── 右上角操作区（普通模式：更多按钮 / 批量模式：操作按钮）── */}
          {batchMode ? (() => {
            const hasSelected = selectedIds.size > 0
            const hasCats = (layout.categories ?? []).length > 0
            const canMove = hasSelected && hasCats
            const dockCount = (config.dockApps ?? []).length
            const canAddToDock = hasSelected && dockCount < 10
            const btnBase: React.CSSProperties = {
              padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              backdropFilter: 'blur(8px)', userSelect: 'none', whiteSpace: 'nowrap',
            }
            return (
              <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: 8 }}>
                {canAddToDock && (
                  <motion.div
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={batchAddToDock}
                    style={{ ...btnBase, cursor: 'pointer',
                      background: 'rgba(0,122,255,0.22)',
                      border: '0.5px solid rgba(0,122,255,0.45)',
                      color: '#5ac8fa',
                    }}
                  >{t('bm_add_to_dock')}</motion.div>
                )}
                <motion.div
                  whileHover={hasSelected ? { scale: 1.04 } : {}} whileTap={hasSelected ? { scale: 0.96 } : {}}
                  onClick={() => {
                    if (!hasSelected) return
                    setConfirmState({ message: `确定删除选中的 ${selectedIds.size} 个书签？`, onConfirm: execBatchDelete })
                  }}
                  style={{ ...btnBase, cursor: hasSelected ? 'pointer' : 'not-allowed',
                    background: hasSelected ? 'rgba(255,80,80,0.22)' : 'rgba(255,255,255,0.07)',
                    border: `0.5px solid ${hasSelected ? 'rgba(255,100,100,0.45)' : 'rgba(255,255,255,0.12)'}`,
                    color: hasSelected ? '#ff7070' : 'rgba(255,255,255,0.28)',
                  }}
                >批量删除</motion.div>
                <motion.div
                  whileHover={canMove ? { scale: 1.04 } : {}} whileTap={canMove ? { scale: 0.96 } : {}}
                  onClick={(e) => {
                    if (!canMove) return
                    if (movePicker) { setMovePicker(null); return }
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const pickerW = 160, vw = window.innerWidth
                    setMovePicker({ x: Math.max(8, Math.min(rect.left, vw - pickerW - 8)), y: rect.bottom + 8 })
                  }}
                  style={{ ...btnBase, cursor: canMove ? 'pointer' : 'not-allowed',
                    background: movePicker ? 'rgba(255,255,255,0.22)' : (canMove ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'),
                    border: `0.5px solid ${canMove ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)'}`,
                    color: canMove ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.28)',
                  }}
                >移动至</motion.div>
              </div>
            )
          })() : (() => {
            const ctxItemSt: React.CSSProperties = {
              padding: '6px 14px', fontSize: 13, color: 'rgba(255,255,255,0.92)',
              cursor: 'pointer', borderRadius: 6, userSelect: 'none',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }
            const onHover = (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = '#fff' }
            const onLeave = (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.92)' }
            return (
              <div ref={moreRef} onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
                <motion.div
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setMoreMenuOpen(v => !v)}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                    border: '0.5px solid rgba(255,255,255,0.28)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.85)',
                    fontSize: 15, letterSpacing: 1.5, userSelect: 'none',
                  }}
                >···</motion.div>
                {moreMenuOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.14) 100%)',
                    backdropFilter: 'blur(32px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                    borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.32)', padding: 4, minWidth: 140, zIndex: 20,
                  }}>
                    <div style={ctxItemSt} onMouseEnter={onHover} onMouseLeave={onLeave}
                      onClick={() => { setMoreMenuOpen(false); setAddModalOpen(true) }}>新增书签</div>
                    <div style={{ ...ctxItemSt, ...(rawBookmarks.length === 0 ? { opacity: 0.35, cursor: 'not-allowed', pointerEvents: 'none' } : {}) }} onMouseEnter={rawBookmarks.length > 0 ? onHover : undefined} onMouseLeave={rawBookmarks.length > 0 ? onLeave : undefined}
                      onClick={() => { if (rawBookmarks.length === 0) return; setMoreMenuOpen(false); setBatchMode(true); setSelectedIds(new Set()) }}>批量管理</div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── 搜索框 ── */}
          {layout.showSearch && (() => {
            const currentEngine = BUILTIN_SEARCH_ENGINES.find(e => e.id === selectedEngineId) ?? BUILTIN_SEARCH_ENGINES[0]
            const engineDropdownStyle: React.CSSProperties = {
              position: 'absolute', top: '100%', marginTop: 6, left: 0,
              width: 150,
              background: '#fff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 20,
            }
            const clearBtn = query ? (
              <div
                onMouseDown={e => { e.preventDefault(); handleClearQuery() }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                  background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)',
                  fontSize: 12, userSelect: 'none', marginRight: 6, alignSelf: 'center',
                }}
              >✕</div>
            ) : null
            return (
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                onClick={e => e.stopPropagation()}
                style={{ marginTop: 72, marginBottom: 52, flexShrink: 0 }}
              >
                {isOnlineScope ? (
                  /* 在线搜索：引擎选择器 + 输入框 + 清除 + 放大镜，三合一 */
                  <div ref={engineRef} style={{ position: 'relative', display: 'flex', alignItems: 'stretch',
                    width: searchWidth, borderRadius: searchRadius, border: '1px solid rgba(255,255,255,0.22)',
                    background: 'rgba(255,255,255,0.14)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
                  }}>
                    {/* 引擎选择区 */}
                    <div onClick={() => setShowEngineMenu(v => !v)} style={{
                      display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none',
                      flexShrink: 0,
                      padding: `${searchPadV}px ${searchPadR}px`,
                      borderRight: '1px solid rgba(255,255,255,0.18)',
                      color: 'rgba(255,255,255,0.9)', fontSize: searchFont,
                    }}>
                      <span style={{ whiteSpace: 'nowrap' }}>
                        {t(currentEngine.nameKey as never)}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.6, flexShrink: 0, marginLeft: 8, transition: 'transform 0.15s', transform: showEngineMenu ? 'rotate(180deg)' : 'none' }}>
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {/* 输入框 */}
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSearch(query) }}
                      placeholder={t('bookmark_search_placeholder')}
                      style={{
                        flex: 1, minWidth: 0, padding: `${searchPadV}px ${searchPadR}px`,
                        background: 'transparent', border: 'none',
                        color: '#fff', fontSize: searchFont, outline: 'none',
                      }}
                    />
                    {clearBtn}
                    {/* 放大镜按钮 */}
                    <div onClick={() => handleSearch(query)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: `0 ${searchPadR}px`, cursor: 'pointer', flexShrink: 0,
                      borderLeft: '1px solid rgba(255,255,255,0.18)',
                    }}>
                      <SearchIcon size={searchFont + 4} />
                    </div>
                    {/* 引擎下拉菜单 */}
                    {showEngineMenu && (
                      <div style={engineDropdownStyle}>
                        {BUILTIN_SEARCH_ENGINES.map(eng => (
                          <div key={eng.id}
                            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: searchFont, whiteSpace: 'nowrap',
                              color: eng.id === selectedEngineId ? '#fff' : 'rgba(0,0,0,0.75)',
                              background: eng.id === selectedEngineId ? '#0065E1' : '#fff',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#0065E1'; e.currentTarget.style.color = '#fff' }}
                            onMouseLeave={e => { e.currentTarget.style.background = eng.id === selectedEngineId ? '#0065E1' : '#fff'; e.currentTarget.style.color = eng.id === selectedEngineId ? '#fff' : 'rgba(0,0,0,0.75)' }}
                            onClick={() => { setSelectedEngineId(eng.id); setShowEngineMenu(false) }}>
                            {t(eng.nameKey as never)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 本地搜索：独立输入框，实时过滤，无放大镜 */
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center',
                    width: searchWidth, borderRadius: searchRadius,
                    border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.14)',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
                  }}>
                    <SearchIcon size={searchFont + 4} style={{ marginLeft: searchIconL, opacity: 0.75 }} />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSearch(query) }}
                      placeholder={t('bookmark_search_placeholder')}
                      style={{
                        flex: 1, minWidth: 0,
                        padding: `${searchPadV}px ${searchPadR}px ${searchPadV}px ${searchPadR * 0.5}px`,
                        background: 'transparent', border: 'none',
                        color: '#fff', fontSize: searchFont, outline: 'none',
                      }}
                    />
                    {clearBtn}
                  </div>
                )}
                <style>{`input::placeholder { color: rgba(255,255,255,0.45); }`}</style>
              </motion.div>
            )
          })()}

          {/* ── 批量管理栏 ── */}
          {batchMode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
                padding: '7px 16px', marginBottom: 8,
                background: 'rgba(0,122,255,0.18)', borderRadius: 8,
                border: '0.5px solid rgba(0,122,255,0.45)',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13 }}>
                批量管理 · 已选 {selectedIds.size} 项
              </span>
              <div
                onClick={() => { setBatchMode(false); setSelectedIds(new Set()) }}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  color: 'rgba(255,255,255,0.8)', fontSize: 12, padding: '3px 10px',
                  borderRadius: 6, cursor: 'pointer', userSelect: 'none',
                }}
              >退出</div>
            </motion.div>
          )}

          {/* ── 书签网格/列表 ── */}
          <style>{`
            .bm-scroll::-webkit-scrollbar { width: 6px; }
            .bm-scroll::-webkit-scrollbar-track { background: transparent; }
            .bm-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.28); border-radius: 999px; }
            .bm-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.45); }
          `}</style>
          <div
            ref={contentRef}
            className="bm-scroll"
            onClick={e => e.stopPropagation()}
            onWheel={handleContentWheel}
            style={{
              flex: 1, width: '100%', marginTop: layout.showSearch ? 0 : 72,
              overflowY: 'auto', overflowX: 'hidden',
              display: 'flex', justifyContent: 'center',
            }}
          >
            <div style={isList ? {
              display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 600,
              padding: '12px 40px 40px', gap: 4,
            } : {
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
              rowGap: layout.displayStyle === 'icon-only' ? 16 : 36,
              columnGap: colGap,
              padding: '12px 40px 40px',
              alignContent: 'start',
              maxWidth: '100%',
            }}>
              {(() => {
                const searching = !isOnlineScope && query.trim().length > 0
                const skipInitial = !searching && prevSearchingRef.current
                prevSearchingRef.current = searching
                const itemStyle = (i: number): React.CSSProperties => isList ? {
                  display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
                  padding: '8px 12px', borderRadius: 10,
                  transition: 'background 0.12s',
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  position: 'relative',
                } : {
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 9, cursor: 'pointer', position: 'relative',
                }
                const renderIcon = (bookmark: typeof filtered[0]) => showIcon && (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <motion.div
                      whileHover={{ scale: isList ? 1.08 : 1.14 }}
                      whileTap={{ scale: 0.88 }}
                      style={{
                        width: iconSize, height: iconSize,
                        borderRadius: isList ? '18%' : '22%',
                        background: bookmark.bgColor || '#555',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: batchMode && selectedIds.has(bookmark.id)
                          ? '0 6px 24px rgba(0,0,0,0.35), 0 0 0 2.5px #007AFF'
                          : '0 6px 24px rgba(0,0,0,0.35)',
                        userSelect: 'none',
                        transition: 'box-shadow 0.15s',
                      }}
                    >
                      {bookmark.iconType === 'url' && bookmark.iconValue ? (
                        <CachedBookmarkIcon src={bookmark.iconValue} name={bookmark.name} style={
                          (bookmark.iconFit ?? 'contain') === 'contain'
                            ? { width: '72%', height: '72%', objectFit: 'contain' }
                            : { width: '100%', height: '100%', objectFit: bookmark.iconFit as 'cover' | 'fill' }
                        } />
                      ) : bookmark.iconType === 'svg' && bookmark.iconValue ? (
                        <div
                          style={{ width: `${bookmark.svgScale ?? 72}%`, height: `${bookmark.svgScale ?? 72}%`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          dangerouslySetInnerHTML={{ __html: injectSvgColor(bookmark.iconValue, bookmark.svgColor ?? '') }}
                        />
                      ) : bookmark.iconType === 'text' && bookmark.iconValue ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, lineHeight: 1, userSelect: 'none', letterSpacing: -0.5,
                          color: bookmark.svgColor || '#fff',
                          fontSize: Math.round(iconSize * (bookmark.iconValue.length <= 1 ? 0.48 : bookmark.iconValue.length === 2 ? 0.36 : 0.27)),
                        }}>{bookmark.iconValue}</div>
                      ) : (
                        <span style={{ fontSize: Math.round(iconSize * 0.47), lineHeight: 1 }}>{bookmark.iconValue || '🌐'}</span>
                      )}
                    </motion.div>
                    {batchMode && (
                      <div style={{
                        position: 'absolute', top: -3, left: -3,
                        width: Math.max(16, Math.round(iconSize * 0.28)), height: Math.max(16, Math.round(iconSize * 0.28)),
                        borderRadius: '50%',
                        background: selectedIds.has(bookmark.id) ? '#007AFF' : 'rgba(30,30,30,0.65)',
                        border: '1.5px solid rgba(255,255,255,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: Math.max(10, Math.round(iconSize * 0.13)), color: '#fff', fontWeight: 700,
                        pointerEvents: 'none',
                      }}>
                        {selectedIds.has(bookmark.id) && '✓'}
                      </div>
                    )}
                  </div>
                )
                const renderName = (bookmark: typeof filtered[0]) => showName && (
                  <span style={{
                    fontSize: isList ? Math.max(13, labelSize + 1) : labelSize,
                    color: 'rgba(255,255,255,0.92)',
                    textAlign: isList ? 'left' : 'center',
                    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                    maxWidth: isList ? undefined : iconSize + 24,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}>
                    {bookmark.name}
                  </span>
                )
                if (searching) {
                  return filtered.length === 0 ? (
                    <div style={{
                      gridColumn: `1 / span ${emptySpan}`,
                      textAlign: 'center', color: 'rgba(255,255,255,0.5)',
                      fontSize: 15, paddingTop: 40,
                    }}>
                      {t('bookmark_empty')}
                    </div>
                  ) : filtered.map((bookmark, i) => (
                    <div
                      key={bookmark.id}
                      onClick={() => batchMode ? toggleSelection(bookmark.id) : openBookmark(bookmark)}
                      onContextMenu={e => { e.preventDefault(); if (batchMode) return; e.stopPropagation(); setBmContextMenu({ x: e.clientX, y: e.clientY, bookmark }) }}
                      style={itemStyle(i)}
                      onMouseEnter={e => {
                        if (isList) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.1)'
                        if (layout.displayStyle === 'icon-only') setToastName(bookmark.name)
                      }}
                      onMouseLeave={e => {
                        if (isList) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                        if (layout.displayStyle === 'icon-only') setToastName('')
                      }}
                    >
                      {renderIcon(bookmark)}
                      {renderName(bookmark)}
                    </div>
                  ))
                }
                return filtered.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      gridColumn: `1 / span ${emptySpan}`,
                      textAlign: 'center', color: 'rgba(255,255,255,0.5)',
                      fontSize: 15, paddingTop: 40,
                    }}
                  >
                    {t('bookmark_empty')}
                  </motion.div>
                ) : filtered.map((bookmark, i) => {
                  const { initial, transition } = getItemVariant(layout.animationEffect, i)
                  return (
                    <div
                      key={`${activeCategoryId}-${animPreviewKey}-${bookmark.id}`}
                      style={{ display: 'contents' }}

                    >
                    <motion.div
                      initial={skipInitial ? false : initial as never}
                      animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0, skewX: 0 }}
                      transition={transition}
                      onClick={() => batchMode ? toggleSelection(bookmark.id) : openBookmark(bookmark)}
                      onContextMenu={e => { e.preventDefault(); if (batchMode) return; e.stopPropagation(); setBmContextMenu({ x: e.clientX, y: e.clientY, bookmark }) }}
                      style={itemStyle(i)}
                      onMouseEnter={e => {
                        if (isList) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.1)'
                        if (layout.displayStyle === 'icon-only') setToastName(bookmark.name)
                      }}
                      onMouseLeave={e => {
                        if (isList) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                        if (layout.displayStyle === 'icon-only') setToastName('')
                      }}
                    >
                      {renderIcon(bookmark)}
                      {renderName(bookmark)}
                    </motion.div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* ── 分类栏 ── */}
          {layout.categoryMode === 'show' ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.08 }}
              onClick={e => e.stopPropagation()}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 28px', marginBottom: 28, overflowX: 'auto', maxWidth: '100%',
              }}
            >
              {CATEGORIES.map(cat => {
                const isActive = cat.id === activeCategoryId
                return (
                  <motion.button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    style={{
                      flexShrink: 0, padding: '6px 18px', borderRadius: 20, border: 'none',
                      background: isActive ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.14)',
                      color: '#fff', fontSize: 13, fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer', outline: 'none',
                      boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.25)' : 'none',
                      transition: 'background 0.18s, font-weight 0.18s',
                      letterSpacing: 0.3, userSelect: 'none',
                    }}
                  >
                    {cat.label}
                  </motion.button>
                )
              })}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '10px 28px', marginBottom: 28,
              }}
            >
              {CATEGORIES.map(cat => {
                const isActive = cat.id === activeCategoryId
                const isHovered = hoveredCatId === cat.id
                return (
                  <div key={cat.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* tooltip */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          key="dot-tip"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.12 }}
                          style={{
                            position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(255,255,255,0.92)', color: 'rgba(0,0,0,0.75)',
                            fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 999,
                            pointerEvents: 'none', whiteSpace: 'nowrap',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                          }}
                        >
                          {cat.label}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.button
                      onClick={() => handleCategoryChange(cat.id)}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.85 }}
                      onMouseEnter={() => setHoveredCatId(cat.id)}
                      onMouseLeave={() => setHoveredCatId(null)}
                      style={{
                        width: isActive ? 20 : 8, height: 8,
                        borderRadius: 999, border: 'none',
                        background: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                        cursor: 'pointer', outline: 'none', padding: 0,
                        transition: 'width 0.22s, background 0.18s',
                      }}
                    />
                  </div>
                )
              })}
            </motion.div>
          )}
          {/* ── 书签右键菜单 ── */}
          {bmContextMenu && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setBmContextMenu(null)} />
          )}
          <AnimatePresence>
            {bmContextMenu && (() => {
              const vw = window.innerWidth, vh = window.innerHeight
              const mW = 160, mH = 72
              const cx = Math.min(bmContextMenu.x, vw - mW - 8)
              const cy = Math.min(bmContextMenu.y, vh - mH - 8)
              const st: React.CSSProperties = {
                padding: '6px 14px', fontSize: 13, color: 'rgba(0,0,0,0.75)',
                cursor: 'pointer', borderRadius: 6, userSelect: 'none',
              }
              const hov = (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = '#fff' }
              const lev = (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(0,0,0,0.75)' }
              return (
                <motion.div
                  key="bm-ctx"
                  initial={{ opacity: 0, scale: 0.88, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: -6 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  onClick={e => e.stopPropagation()}
                  onContextMenu={e => e.stopPropagation()}
                  style={{
                    position: 'fixed', left: cx, top: cy, zIndex: 300,
                    background: '#fff',
                    borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    padding: 4, minWidth: mW,
                  }}
                >
                  <div style={st} onMouseEnter={hov} onMouseLeave={lev}
                    onClick={() => { setEditTarget(bmContextMenu.bookmark); setBmContextMenu(null) }}>编辑</div>
                  {!(config.dockApps ?? []).some(a => a.url === bmContextMenu.bookmark.url) && (
                    <div style={st} onMouseEnter={hov} onMouseLeave={lev}
                      onClick={() => { addBookmarkToDock(bmContextMenu.bookmark); setBmContextMenu(null) }}>
                      {t('bm_add_to_dock')}
                    </div>
                  )}
                  <div style={st} onMouseEnter={hov} onMouseLeave={lev}
                    onClick={() => {
                      const bm = bmContextMenu.bookmark; setBmContextMenu(null)
                      setConfirmState({ message: `确定删除书签「${bm.name}」？`, onConfirm: () => deleteBookmark(bm) })
                    }}>删除</div>
                </motion.div>
              )
            })()}
          </AnimatePresence>

          {/* ── 分类选择器（移动至）+ 背景遮罩 ── */}
          {movePicker && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 299 }}
              onClick={() => setMovePicker(null)}
            />
          )}
          <AnimatePresence>
            {movePicker && (() => {
              const cats = layout.categories ?? []
              const vw = window.innerWidth, vh = window.innerHeight
              const mW = 160, mH = Math.min(cats.length * 34 + 8, 280)
              const cx = Math.min(movePicker.x, vw - mW - 8)
              const cy = Math.min(movePicker.y, vh - mH - 8)
              const st: React.CSSProperties = {
                padding: '6px 14px', fontSize: 13, color: 'rgba(255,255,255,0.92)',
                cursor: 'pointer', borderRadius: 6, userSelect: 'none',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }
              const hov = (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.background = '#007AFF'; e.currentTarget.style.color = '#fff' }
              const lev = (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.92)' }
              return (
                <motion.div
                  key="move-picker"
                  initial={{ opacity: 0, scale: 0.88, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: -6 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  onClick={e => e.stopPropagation()}
                  onContextMenu={e => e.stopPropagation()}
                  style={{
                    position: 'fixed', left: cx, top: cy, zIndex: 300,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.38) 100%)',
                    backdropFilter: 'blur(32px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                    borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.5)',
                    padding: 4, minWidth: mW, maxHeight: 280, overflowY: 'auto',
                  }}
                >
                  {cats.map(cat => (
                    <div key={cat.id} style={st} onMouseEnter={hov} onMouseLeave={lev}
                      onClick={e => {
                        e.stopPropagation(); setMovePicker(null)
                        setConfirmState({
                          message: `将选中的 ${selectedIds.size} 个书签移动到「${cat.name}」？`,
                          onConfirm: () => execMoveTo(cat.id),
                        })
                      }}>{cat.name}</div>
                  ))}
                </motion.div>
              )
            })()}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── 确认弹窗 ── */}
    <AnimatePresence>
      {confirmState && open && (
        <motion.div
          key="confirm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={e => e.stopPropagation()}
          onContextMenu={e => { e.preventDefault(); e.stopPropagation() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
          }}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 480, damping: 28 }}
            style={{
              background: 'linear-gradient(135deg, rgba(40,40,50,0.96) 0%, rgba(30,30,40,0.96) 100%)',
              backdropFilter: 'blur(32px) saturate(160%)',
              WebkitBackdropFilter: 'blur(32px) saturate(160%)',
              borderRadius: 14, padding: '24px 28px', minWidth: 280, maxWidth: 360,
              border: '0.5px solid rgba(255,255,255,0.15)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 15, margin: '0 0 20px', lineHeight: 1.5 }}>
              {confirmState.message}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setConfirmState(null)}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
                  fontSize: 13, cursor: 'pointer',
                }}>取消</motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => { confirmState.onConfirm(); setConfirmState(null) }}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: 'none',
                  background: '#007AFF', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>确认</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── 编辑书签弹窗 ── */}
    <BookmarkEditModal
      open={!!editTarget}
      mode="edit"
      initialData={editTarget ?? undefined}
      categories={layout.categories ?? []}
      onClose={() => setEditTarget(null)}
      onSave={saveBookmark}
    />

    {/* ── 新增书签弹窗 ── */}
    <BookmarkEditModal
      open={addModalOpen}
      mode="add"
      initialData={activeCategoryId !== 'all' ? { categoryId: activeCategoryId } : undefined}
      categories={layout.categories ?? []}
      onClose={() => setAddModalOpen(false)}
      onSave={saveBookmark}
    />

    {/* ── 图标模式 tooltip ── */}
    </>
  )
}

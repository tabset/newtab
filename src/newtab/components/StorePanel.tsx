import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDockConfig } from '../store/dockConfig'
import { useT } from '../i18n'
import type { BookmarkItem, BookmarkCategory } from '../store/dockConfig'
import { DEFAULT_BOOKMARK_LAYOUT } from '../store/dockConfig'
import type { StoreData, StoreItem, StorePlugin } from '../store/storeTypes'

// ── 交通灯按钮组 ────────────────────────────────────────
function TrafficLights({ onClose, onZoom, zoomed }: { onClose: () => void; onZoom: () => void; zoomed: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0, lineHeight: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 红灯：关闭 */}
      <div
        onClick={onClose}
        style={{
          width: 15, height: 15, borderRadius: '50%',
          background: '#FF5F57',
          cursor: 'pointer',
          boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.5)',
          lineHeight: 1, userSelect: 'none', flexShrink: 0,
        }}
      >
        {hovered ? '×' : null}
      </div>
      {/* 绿灯：放大 */}
      <div
        onClick={onZoom}
        style={{
          width: 15, height: 15, borderRadius: '50%',
          background: '#28C840',
          cursor: 'pointer',
          boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.5)',
          lineHeight: 1, userSelect: 'none', flexShrink: 0,
        }}
      >
        {hovered ? (zoomed ? '⊙' : '+') : null}
      </div>
    </div>
  )
}

// ── 图标渲染 ──────────────────────────────────────────────
function StoreIconRenderer({ type, value, svgColor, svgScale, fit, size }: {
  type: string; value: string; svgColor?: string; svgScale?: number; fit?: string; size: number
}) {
  if (type === 'url') {
    const scale = (fit === 'contain' || !fit) ? 0.72 : 1.0
    return (
      <img
        src={value}
        style={{ 
          width: size * scale, 
          height: size * scale, 
          objectFit: (fit as any) || 'contain', 
          borderRadius: (fit === 'contain' || !fit) ? 4 : 0 
        }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  if (type === 'svg') {
    const html = svgColor
      ? value.replace(/fill="[^"]*"/g, `fill="${svgColor}"`).replace(/stroke="[^"]*"/g, `stroke="${svgColor}"`)
      : value
    const scale = (svgScale ?? 72) / 100
    return (
      <div
        style={{ width: size * scale, height: size * scale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
  const chars = [...value]
  const fs = chars.length === 1 ? size * 0.48 : chars.length === 2 ? size * 0.36 : size * 0.26
  return <span style={{ fontSize: fs, lineHeight: 1, userSelect: 'none' }}>{value}</span>
}

// ── 单个卡片 ──────────────────────────────────────────────
function StoreCard({ item, name, description, iconSize, mode, isAdded, onAdd, onOpen }: {
  item: StoreItem
  name: string
  description: string
  iconSize: number
  mode: 'bookmark' | 'tool'
  isAdded: boolean
  onAdd: () => void
  onOpen: () => void
}) {
  const t = useT()
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={false}
      animate={{ 
        scale: hovered ? 1.04 : 1,
        zIndex: hovered ? 10 : 1,
      }}
      transition={{ 
        scale: { type: 'spring', stiffness: 400, damping: 25 },
        zIndex: { duration: 0 }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      style={{
        background: hovered ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: '16px 12px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        border: `0.5px solid ${hovered ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)'}`,
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        minHeight: 168,
        position: 'relative',
        transformOrigin: 'center center',
      }}
    >
      {/* 图标 */}
      <div style={{
        width: iconSize, height: iconSize,
        borderRadius: Math.round(iconSize * 0.22),
        background: item.icon.bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        <StoreIconRenderer
          type={item.icon.type}
          value={item.icon.value}
          svgColor={item.icon.svgColor}
          svgScale={item.icon.svgScale}
          fit={item.icon.fit}
          size={iconSize}
        />
      </div>

      {/* 名称 */}
      <div style={{
        fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)',
        textAlign: 'center', lineHeight: 1.3,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        width: '100%',
      }}>
        {name}
      </div>

      {/* 描述 */}
      {description && (
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.42)',
          textAlign: 'center', lineHeight: 1.5,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          width: '100%', flex: 1,
        }}>
          {description}
        </div>
      )}

      {/* 操作按钮（hover 时显示） */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            style={{
              padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: mode === 'bookmark'
                ? (isAdded ? 'rgba(52,199,89,0.25)' : 'rgba(0,122,255,0.3)')
                : 'rgba(255,255,255,0.12)',
              color: mode === 'bookmark'
                ? (isAdded ? '#34c759' : '#5ac8fa')
                : 'rgba(255,255,255,0.75)',
              cursor: isAdded ? 'default' : 'pointer',
              border: `0.5px solid ${
                mode === 'bookmark'
                  ? (isAdded ? 'rgba(52,199,89,0.35)' : 'rgba(0,122,255,0.35)')
                  : 'rgba(255,255,255,0.18)'
              }`,
              flexShrink: 0,
            }}
            onClick={isAdded ? undefined : (mode === 'bookmark' ? onAdd : onOpen)}
          >
            {mode === 'bookmark'
              ? (isAdded ? t('store_added') : t('store_add'))
              : t('store_open')}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── 主面板 ────────────────────────────────────────────────
export interface StorePanelProps {
  open: boolean
  onClose: () => void
  plugin: StorePlugin
  /** bookmark: 显示「收藏」按钮并写入本地书签；tool: 显示「打开」按钮 */
  mode: 'bookmark' | 'tool'
  title: string
  panelIcon: string  // img src，放在 public/icons/ 下
  zIndex?: number
}

const ICON_SIZE = 64

export default function StorePanel({ open, onClose, plugin, mode, title, panelIcon, zIndex = 201 }: StorePanelProps) {
  const t = useT()
  const { config, setConfig } = useDockConfig()
  const lang = (config as any).language || 'zh-CN'

  const [data, setData] = useState<StoreData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCat, setActiveCat] = useState('')
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [zoomed, setZoomed] = useState(true)
  const [isFirstOpen, setIsFirstOpen] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)
  const catBarRef = useRef<HTMLDivElement>(null)

  // 打开时拉取数据，关闭时重置放大状态
  useEffect(() => {
    if (!open) { 
      setZoomed(true)
      setIsFirstOpen(true)
      return 
    }
    setIsFirstOpen(false)
    setQuery('')
    setLoading(true)
    setError(null)
    plugin.fetchData()
      .then(d => {
        setData(d)
        setActiveCat(d.categories[0]?.id ?? '')
        // 初始化已收藏列表：检查所有在线书签是否在本地书签中
        const localBookmarks = config.bookmarks || []
        const added = new Set<string>()
        d.categories.forEach(cat => {
          cat.items.forEach(item => {
            if (localBookmarks.some(b => b.url === item.url)) {
              added.add(item.id)
            }
          })
        })
        setAddedIds(added)
      })
      .catch(() => setError(t('store_error')))
      .finally(() => setLoading(false))
  }, [open, plugin.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // Escape 关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // 监听书签变化，实时更新收藏状态
  useEffect(() => {
    if (!open || !data) return
    const localBookmarks = config.bookmarks || []
    const added = new Set<string>()
    data.categories.forEach(cat => {
      cat.items.forEach(item => {
        if (localBookmarks.some(b => b.url === item.url)) {
          added.add(item.id)
        }
      })
    })
    setAddedIds(added)
  }, [config.bookmarks, open, data])

  const getLocalText = (record: Record<string, string>) =>
    record[lang] || record['zh-CN'] || record['en'] || Object.values(record)[0] || ''

  // 滚动分类栏使指定分类可见（滚动到中间位置）
  const scrollCategoryIntoView = (categoryId: string) => {
    requestAnimationFrame(() => {
      const catBar = catBarRef.current
      if (!catBar) return
      
      const idx = data?.categories.findIndex(c => c.id === categoryId)
      if (idx === undefined || idx === -1) return
      
      const buttons = catBar.querySelectorAll('div[role="tab"]')
      const targetBtn = buttons[idx] as HTMLElement
      if (!targetBtn) return

      const barRect = catBar.getBoundingClientRect()
      const btnRect = targetBtn.getBoundingClientRect()
      
      // 计算目标位置：让按钮居中显示
      const targetPosition = catBar.scrollLeft + btnRect.left - barRect.left - (barRect.width - btnRect.width) / 2
      
      // 使用 scrollTo 实现居中滚动
      catBar.scrollTo({ left: targetPosition, behavior: 'smooth' })
    })
  }

  const activeCategory = data?.categories.find(c => c.id === activeCat)

  const handleCategoryChange = (categoryId: string) => {
    setActiveCat(categoryId)
    setQuery('')
    scrollCategoryIntoView(categoryId)
  }

  const filteredItems = activeCategory?.items.filter(item => {
    if (!query.trim()) return true
    const name = getLocalText(item.name).toLowerCase()
    const desc = item.description ? getLocalText(item.description).toLowerCase() : ''
    return query.toLowerCase().split(/\s+/).every(kw => name.includes(kw) || desc.includes(kw))
  }) ?? []

  const addToBookmarks = (item: StoreItem) => {
    // 找到该书签所属的分类
    const category = data?.categories.find(cat => 
      cat.items.some(i => i.id === item.id)
    )
    
    let targetCategoryId: string | undefined
    
    if (category) {
      // 获取分类的本地化名称
      const categoryName = getLocalText(category.name)
      
      // 获取当前的书签布局配置
      const currentLayout = config.bookmarkLayout || DEFAULT_BOOKMARK_LAYOUT
      const currentCategories = currentLayout.categories || []
      
      // 检查本地是否已有同名分类
      const existingCategory = currentCategories.find((c: BookmarkCategory) => c.name === categoryName)
      
      if (existingCategory) {
        // 使用已存在的分类
        targetCategoryId = existingCategory.id
      } else {
        // 创建新分类
        const newCategoryId = `cat_${Date.now()}`
        const newCategory: BookmarkCategory = {
          id: newCategoryId,
          name: categoryName,
        }
        setConfig({ 
          bookmarkLayout: {
            ...currentLayout,
            categories: [...currentCategories, newCategory]
          }
        })
        targetCategoryId = newCategoryId
      }
    }
    
    // 创建书签
    const newBm: BookmarkItem = {
      id: `bm_${Date.now()}`,
      name: getLocalText(item.name),
      url: item.url || '',
      iconType: item.icon.type as BookmarkItem['iconType'],
      iconValue: item.icon.value,
      bgColor: item.icon.bgColor,
      svgColor: item.icon.svgColor,
      iconFit: item.icon.fit,
      categoryId: targetCategoryId,
    }
    setConfig({ bookmarks: [...(config.bookmarks ?? []), newBm] })
    setAddedIds(prev => new Set([...prev, item.id]))
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  const dockGap = config.baseSize + 10 * 2 + 8 + 2
  const pos = config.position ?? 'bottom'
  const normalW = Math.min(940, vw - 64)
  const normalH = Math.min(620, vh - 100)
  const panelLayout = zoomed
    ? {
        top:    pos === 'top'    ? dockGap : 0,
        left:   pos === 'left'   ? dockGap : 0,
        width:  pos === 'left' || pos === 'right' ? vw - dockGap : vw,
        height: pos === 'top'  || pos === 'bottom' ? vh - dockGap : vh,
      }
    : {
        top:    (vh - normalH) / 2,
        left:   (vw - normalW) / 2,
        width:  normalW,
        height: normalH,
      }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="store-panel-box"
          initial={{ ...panelLayout }}
          animate={{ ...panelLayout }}
          exit={{ ...panelLayout }}
          transition={isFirstOpen ? {
            duration: 0
          } : {
            top:    { type: 'spring', stiffness: 260, damping: 28 },
            left:   { type: 'spring', stiffness: 260, damping: 28 },
            width:  { type: 'spring', stiffness: 260, damping: 28 },
            height: { type: 'spring', stiffness: 260, damping: 28 },
          }}
          style={{
            position: 'fixed',
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.09) 100%)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '0.5px solid rgba(255,255,255,0.25)',
            boxShadow: '0 28px 72px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            zIndex,
          }}
          onContextMenu={(e) => { 
            e.preventDefault(); 
            e.stopPropagation();
          }}
          onContextMenuCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
            {/* ── 顶部栏 ── */}
            <div 
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '14px 20px 12px',
                borderBottom: '0.5px solid rgba(255,255,255,0.1)',
                flexShrink: 0, position: 'relative',
              }}
            >
              {/* 左：交通灯 */}
              <TrafficLights onClose={onClose} onZoom={() => setZoomed(v => !v)} zoomed={zoomed} />

              {/* 中：图标 + 标题（绝对居中） */}
              <div style={{
                position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
              }}>
                <img src={panelIcon} alt="" style={{ width: 18, height: 18, opacity: 0.82, filter: 'invert(1)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>{title}</span>
              </div>

              {/* 右：搜索框 */}
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('store_search')}
                style={{
                  marginLeft: 'auto',
                  background: 'rgba(255,255,255,0.1)',
                  border: '0.5px solid rgba(255,255,255,0.18)',
                  borderRadius: 8, padding: '5px 12px', fontSize: 13,
                  color: 'rgba(255,255,255,0.85)', outline: 'none', width: 160,
                }}
              />
            </div>

            {/* ── 分类 tabs ── */}
            {data && data.categories.length > 0 && (
              <div
                ref={catBarRef}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                style={{
                  display: 'flex', gap: 4, padding: '10px 20px 0',
                  overflowX: 'auto', flexShrink: 0,
                  scrollbarWidth: 'none',
                }}
              >
                {data.categories.map(cat => {
                  const active = cat.id === activeCat
                  return (
                    <div
                      key={cat.id}
                      role="tab"
                      onClick={() => handleCategoryChange(cat.id)}
                      style={{
                        padding: '5px 16px', borderRadius: 8, fontSize: 13, flexShrink: 0,
                        fontWeight: active ? 600 : 400, cursor: 'pointer',
                        background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                        color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)',
                        border: active ? '0.5px solid rgba(255,255,255,0.22)' : '0.5px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      {getLocalText(cat.name)}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── 内容区 ── */}
            <div 
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
              style={{
                flex: 1, overflowY: 'auto', padding: '14px 20px 20px',
                scrollbarWidth: 'thin',
              }}
            >
              {loading && (
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', paddingTop: 80 }}>
                  {t('store_loading')}
                </div>
              )}
              {!loading && error && (
                <div style={{ color: 'rgba(255,120,120,0.85)', fontSize: 14, textAlign: 'center', paddingTop: 80 }}>
                  {error}
                </div>
              )}
              {!loading && !error && filteredItems.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, textAlign: 'center', paddingTop: 80 }}>
                  {t('store_empty')}
                </div>
              )}
              {!loading && !error && filteredItems.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
                  gridAutoRows: '180px',
                  gap: 14,
                  padding: '8px',
                }}>
                  {filteredItems.map(item => (
                    <StoreCard
                      key={item.id}
                      item={item}
                      name={getLocalText(item.name)}
                      description={item.description ? getLocalText(item.description) : ''}
                      iconSize={ICON_SIZE}
                      mode={mode}
                      isAdded={addedIds.has(item.id)}
                      onAdd={() => addToBookmarks(item)}
                      onOpen={() => item.url && window.open(item.url, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  )
}

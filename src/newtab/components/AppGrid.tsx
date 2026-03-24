import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppItem } from '../types'
import { DockPosition } from '../store/dockConfig'

interface AppGridProps {
  apps: AppItem[]
  anchorEl: HTMLElement | null
  dockPosition: DockPosition
  dockClearance: number   // 从屏幕边缘到程序坞内侧的距离
  open: boolean
  onClose: () => void
  onAppClick?: (app: AppItem) => void
}

// 根据 app 数量和程序坞位置决定列数
function getColumns(count: number, dockPosition: DockPosition) {
  if (dockPosition === 'left' || dockPosition === 'right') return 5
  if (count <= 4)  return 2
  if (count <= 9)  return 3
  if (count <= 16) return 4
  return 5
}

// 左/右侧时最多显示 3 行的高度（iconSize=56, itemPadV=12, labelH=16, itemGap=5, gridGap=12, popupPad=16）
const MAX_VISIBLE_ROWS = 3
const ITEM_H = 12 + 56 + 5 + 16  // padding(12) + icon(56) + flex-gap(5) + label(16) = 89
const ROWS_MAX_H = MAX_VISIBLE_ROWS * ITEM_H + (MAX_VISIBLE_ROWS - 1) * 12 + 16 * 2  // 331px


export default function AppGrid({
  apps,
  anchorEl,
  dockPosition,
  dockClearance,
  open,
  onClose,
  onAppClick,
}: AppGridProps) {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
    zIndex: 400,
  })

  // 弹出后计算位置
  // 注意：所有坐标基于浏览器视口（window.innerWidth/innerHeight），不使用 getBoundingClientRect 测量弹窗尺寸
  // （framer-motion 初始 scale(0.85) 会导致测量值偏小）
  useEffect(() => {
    if (!open || !anchorEl) return

    const anchor = anchorEl.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const edgeGap = 4   // 弹窗与程序坞边缘的间距
    const screenGap = 8 // 弹窗与屏幕边缘的安全距离

    // 根据列数计算弹窗宽度（固定网格，无需测量）
    const cols = getColumns(apps.length, dockPosition)
    const iconSize = 56
    const pw = cols * iconSize + (cols - 1) * 12 + 16 * 2

    const newStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 400,
      visibility: 'visible',
      overflowY: 'auto',
    }

    switch (dockPosition) {
      case 'bottom': {
        // 可用高度 = 视口高度 - 程序坞占位 - 弹窗与坞边间距 - 顶部安全距离
        const availH = vh - dockClearance - edgeGap - screenGap
        newStyle.maxHeight = Math.min(ROWS_MAX_H, availH)
        newStyle.bottom = dockClearance + edgeGap
        let x = anchor.left + anchor.width / 2 - pw / 2
        x = Math.max(screenGap, Math.min(x, vw - pw - screenGap))
        newStyle.left = x
        newStyle.transformOrigin = 'bottom center'
        break
      }
      case 'top': {
        // 可用高度 = 视口高度 - 程序坞占位 - 弹窗与坞边间距 - 底部安全距离
        const availH = vh - dockClearance - edgeGap - screenGap
        newStyle.maxHeight = Math.min(ROWS_MAX_H, availH)
        newStyle.top = dockClearance + edgeGap
        let x = anchor.left + anchor.width / 2 - pw / 2
        x = Math.max(screenGap, Math.min(x, vw - pw - screenGap))
        newStyle.left = x
        newStyle.transformOrigin = 'top center'
        break
      }
      case 'left': {
        // 可用高度 = 视口高度 - 上下安全距离
        const availH = vh - screenGap * 2
        newStyle.maxHeight = Math.min(ROWS_MAX_H, availH)
        newStyle.left = dockClearance + edgeGap
        let y = anchor.top
        y = Math.max(screenGap, Math.min(y, vh - newStyle.maxHeight - screenGap))
        newStyle.top = y
        newStyle.transformOrigin = 'left top'
        break
      }
      case 'right': {
        // 可用高度 = 视口高度 - 上下安全距离
        const availH = vh - screenGap * 2
        newStyle.maxHeight = Math.min(ROWS_MAX_H, availH)
        newStyle.right = dockClearance + edgeGap
        let y = anchor.top
        y = Math.max(screenGap, Math.min(y, vh - newStyle.maxHeight - screenGap))
        newStyle.top = y
        newStyle.transformOrigin = 'right top'
        break
      }
    }

    setStyle(newStyle)
  }, [open, anchorEl, dockPosition, apps, dockClearance])

  const cols = getColumns(apps.length, dockPosition)
  const iconSize = 56

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 透明蒙层，点击关闭 */}
          <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 399 }}
          />

          {/* 弹出网格 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              ...style,
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderRadius: 18,
              padding: 16,
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${iconSize}px)`,
              gap: 12,
            }}
          >
            {apps.map((app) => (
              <div
                key={app.id}
                onClick={() => { onAppClick?.(app); onClose() }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  borderRadius: 10,
                  padding: '6px 4px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: iconSize,
                  height: iconSize,
                  background: app.color,
                  borderRadius: '22%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: iconSize * 0.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  flexShrink: 0,
                }}>
                  {app.emoji}
                </div>
                <span style={{
                  fontSize: 11,
                  color: 'rgba(0,0,0,0.7)',
                  textAlign: 'center',
                  maxWidth: iconSize,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {app.name}
                </span>
              </div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

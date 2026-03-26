import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { Select } from 'antd'
import { useDockConfig, DockPosition, BackgroundType, ImageSource, BookmarkLayoutConfig, DEFAULT_BOOKMARK_LAYOUT, BUILTIN_SEARCH_ENGINES, BookmarkDisplayStyle, BookmarkOpenMode } from '../store/dockConfig'
import { useT, LANGUAGES } from '../i18n'

// ── Select 下拉样式注入 ──────────────────────────────────────
;(() => {
  const id = 'sm-select-popup-style'
  if (document.getElementById(id)) return
  const s = document.createElement('style')
  s.id = id
  s.textContent = `
    .sm-select-popup .ant-select-item-option-active:not(.ant-select-item-option-disabled) {
      background-color: rgba(0, 101, 225, 0.95) !important;
      color: #fff !important;
    }
    .sm-select-popup .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
      background-color: rgba(0, 101, 225, 0.95) !important;
      color: #fff !important;
      font-weight: 500;
    }
    .sm-select-popup .ant-select-item-option-selected .ant-select-item-option-state {
      color: #fff !important;
    }
  `
  document.head.appendChild(s)
})()

// ── 渐变工具函数 ────────────────────────────────────────────

type GradStop = { color: string; pos: number }

function hslaToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

function parseColorToHex(color: string): string | null {
  const c = color.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c
  if (/^#[0-9A-Fa-f]{8}$/.test(c)) return c.slice(0, 7)
  if (/^#[0-9A-Fa-f]{3}$/.test(c)) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]
  const rgb = c.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) return '#' + [rgb[1], rgb[2], rgb[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('')
  const hsl = c.match(/^hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/)
  if (hsl) return hslaToHex(parseFloat(hsl[1]), parseFloat(hsl[2]), parseFloat(hsl[3]))
  return null
}

function blendHex(hex1: string, hex2: string): string {
  const p = (h: string, o: number) => parseInt(h.slice(1 + o * 2, 3 + o * 2), 16)
  const [r1, g1, b1] = [p(hex1, 0), p(hex1, 1), p(hex1, 2)]
  const [r2, g2, b2] = [p(hex2, 0), p(hex2, 1), p(hex2, 2)]
  return '#' + [Math.round((r1+r2)/2), Math.round((g1+g2)/2), Math.round((b1+b2)/2)].map(v => v.toString(16).padStart(2, '0')).join('')
}

function stopsToGradient(stops: GradStop[], angle: number): string {
  return `linear-gradient(${angle}deg, ${stops.map(s => `${s.color} ${s.pos}%`).join(', ')})`
}

function splitGradArgs(s: string): string[] {
  const parts: string[] = []; let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

function parseGradStopPart(part: string): { color: string; pos: number | null } {
  const s = part.trim()
  let depth = 0, spaceIdx = -1
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i]
    if (ch === ')') depth++
    else if (ch === '(') depth--
    else if (ch === ' ' && depth === 0) { spaceIdx = i; break }
  }
  if (spaceIdx > 0) {
    const posStr = s.slice(spaceIdx + 1).trim()
    const pct = posStr.match(/^([\d.]+)%$/)
    if (pct) return { color: s.slice(0, spaceIdx).trim(), pos: parseFloat(pct[1]) }
  }
  return { color: s, pos: null }
}

function parseCssGradientToStops(raw: string): { ok: true; angle: number; stops: GradStop[] } | { ok: false; reason: string } {
  // Strip prefix and extract value
  const lines = raw.split(/[\n;]/).map(l => l.trim()).filter(Boolean)
  let val = ''
  for (const line of lines) {
    if (/^filter\s*:/i.test(line)) continue
    const m = line.match(/background(?:-image)?\s*:\s*(.+)$/i)
    const v = ((m ? m[1] : line).replace(/;$/, '').trim())
    if (/^(linear|radial|conic)-gradient\s*\(/i.test(v)) { val = v; break }
    if (/^-(?:webkit|moz|o)-(linear|radial|conic)-gradient\s*\(/i.test(v)) {
      val = v.replace(/^-(?:webkit|moz|o)-/, ''); break
    }
  }
  if (!val) val = raw.trim().replace(/^-(?:webkit|moz|o)-/, '')
  if (/^(radial|conic)-gradient\s*\(/i.test(val))
    return { ok: false, reason: '暂不支持径向/圆锥渐变，请使用线性渐变' }
  if (!/^linear-gradient\s*\(/i.test(val))
    return { ok: false, reason: '未检测到有效的线性渐变格式' }

  const inner = val.slice(val.indexOf('(') + 1, val.lastIndexOf(')')).trim()
  const parts = splitGradArgs(inner)
  if (parts.length < 2) return { ok: false, reason: '渐变颜色不足，至少需要 2 个色标' }

  let angle = 135, colorStart = 0
  const first = parts[0].trim()
  const angM = first.match(/^([\d.]+)deg$/i)
  const dirM = first.match(/^to\s+(top|right|bottom|left)$/i)
  if (angM) { angle = parseFloat(angM[1]); colorStart = 1 }
  else if (dirM) {
    angle = ({ top: 0, right: 90, bottom: 180, left: 270 } as Record<string, number>)[dirM[1].toLowerCase()] ?? 135
    colorStart = 1
  }

  const stopParts = parts.slice(colorStart)
  if (stopParts.length < 2) return { ok: false, reason: '色标不足' }

  const stops: GradStop[] = []
  const hasPosArr: (number | null)[] = []
  for (const sp of stopParts) {
    const { color: colorStr, pos } = parseGradStopPart(sp)
    const hex = parseColorToHex(colorStr)
    if (!hex) return { ok: false, reason: `无法解析颜色 "${colorStr}"` }
    hasPosArr.push(pos)
    stops.push({ color: hex, pos: pos ?? 0 })
  }

  const n = stops.length
  for (let i = 0; i < n; i++) {
    if (hasPosArr[i] !== null) continue
    if (i === 0) { stops[i].pos = 0; hasPosArr[i] = 0; continue }
    if (i === n - 1) { stops[i].pos = 100; hasPosArr[i] = 100; continue }
    let pi = i - 1, ni = i + 1
    while (pi >= 0 && hasPosArr[pi] === null) pi--
    while (ni < n && hasPosArr[ni] === null) ni++
    const p0 = pi >= 0 ? stops[pi].pos : 0
    const p1 = ni < n ? stops[ni].pos : 100
    const fi = pi >= 0 ? pi : 0, ti = ni < n ? ni : n - 1
    stops[i].pos = Math.round(p0 + (p1 - p0) * (i - fi) / (ti - fi))
  }
  return { ok: true, angle, stops }
}

interface Props {
  active?: boolean
  open: boolean
  onClose: () => void
  initialTab?: string
  sessionKey?: number
  onBookmarkTabSelect?: () => void
  zIndex?: number
}

// Tab 图标
function GifIcon({ src, size, active, alt }: { src: string; size: number; active?: boolean; alt?: string }) {
  const [staticFrame, setStaticFrame] = useState<string>('')

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || size
      canvas.height = img.naturalHeight || size
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0)
      setStaticFrame(canvas.toDataURL('image/png'))
    }
    img.src = src
  }, [src])

  return (
    <img
      key={active ? 'playing' : 'static'}
      src={active ? src : (staticFrame || src)}
      alt={alt}
      style={{ width: size, height: size }}
    />
  )
}

function TabIcon({ id, size, active }: { id: string; size: number; active?: boolean }) {
  const gifMap: Record<string, string> = {
    dock: '/icons/dock.gif',
    appearance: '/icons/appearance.gif',
    language: '/icons/language.gif',
    bookmark: '/icons/bookmark.gif',
    shortcuts: '/icons/shortcut.gif',
    backup: '/icons/backup.gif',
    about: '/icons/about.gif',
  }
  if (gifMap[id]) {
    return <GifIcon src={gifMap[id]} size={size} active={active} alt={id} />
  }
  const iconMap: Record<string, string> = {}
  return (
    <img
      src={iconMap[id] || '/icons/settings.svg'}
      alt={id}
      style={{ width: size, height: size }}
    />
  )
}

const SIDEBAR_ITEMS = [
  { id: 'dock' },
  { id: 'appearance' },
  { id: 'language' },
  { id: 'bookmark' },
  { id: 'shortcuts' },
  { id: 'backup' },
  { id: 'about' },
]
const INIT_W = 780
const INIT_H = 540

// ── 子组件 ────────────────────────────────────────────────

function TrafficLights({ onClose }: { onClose: () => void }) {
  const [hovered, setHovered] = useState(false)
  const lights = [
    { color: '#FF5F57', symbol: '×', action: onClose },
  ]
  return (
    <div
      style={{ display: 'flex', gap: 8 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {lights.map((btn, i) => (
        <div
          key={i}
          onClick={btn.action}
          style={{
            width: 15, height: 15,
            borderRadius: '50%',
            background: btn.color,
            cursor: 'pointer',
            boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.5)',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {hovered ? btn.symbol : null}
        </div>
      ))}
    </div>
  )
}

function Slider({
  label, value, min, max, leftLabel, rightLabel, onChange, disabled, unit = 'px', valueLabels, hideValue, showTicks,
}: {
  label: string; value: number; min: number; max: number
  leftLabel: string; rightLabel: string
  onChange: (v: number) => void; disabled?: boolean; unit?: string
  valueLabels?: string[]
  hideValue?: boolean
  showTicks?: boolean
}) {
  const pct = ((value - min) / (max - min)) * 100
  const displayValue = valueLabels
    ? (valueLabels[value - min] ?? '')
    : (unit === '%' ? `${value}%` : `${value}${unit}`)
  const steps = max - min + 1
  return (
    <div style={{ opacity: disabled ? 0.4 : 1, transition: 'opacity 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.75)', fontWeight: 400 }}>{label}</span>
        {!hideValue && <span style={{ fontSize: 12, color: '#86868b', whiteSpace: 'nowrap' }}>{displayValue}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: '#86868b', minWidth: 32, textAlign: 'right', whiteSpace: 'nowrap' }}>{leftLabel}</span>
        <div style={{ flex: 1, position: 'relative', height: 20, display: 'flex', alignItems: 'center', marginBottom: showTicks && valueLabels ? 18 : 0 }}>
          {/* 轨道 */}
          <div style={{ position: 'absolute', width: '100%', height: 4, background: '#d1d1d6', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#007AFF', borderRadius: 2 }} />
          </div>
          {/* 刻度竖线（纯视觉，不拦截事件） */}
          {showTicks && Array.from({ length: steps }, (_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${(i / (max - min)) * 100}%`,
              top: '50%', transform: 'translate(-50%, -50%)',
              width: 2, height: 10,
              background: (min + i) <= value ? 'rgba(255,255,255,0.85)' : 'rgba(180,180,180,0.7)',
              borderRadius: 1,
              pointerEvents: 'none',
            }} />
          ))}
          {/* 原生 range input */}
          <input
            type="range" min={min} max={max} value={value} disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ position: 'absolute', width: '100%', opacity: 0, cursor: disabled ? 'not-allowed' : 'pointer', height: 20, margin: 0 }}
          />
          {/* 自定义手柄 */}
          <div style={{
            position: 'absolute', top: '50%', transform: 'translateY(-50%)',
            left: `clamp(0px, calc(${pct}% - 10px), calc(100% - 20px))`,
            width: 20, height: 20, background: '#fff', borderRadius: '50%',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(0,0,0,0.08)',
            pointerEvents: 'none', transition: 'left 0.05s',
          }} />
          {/* 刻度标签（绝对定位在轨道正下方） */}
          {showTicks && valueLabels && Array.from({ length: steps }, (_, i) => (
            <span key={i} style={{
              position: 'absolute',
              left: `${(i / (max - min)) * 100}%`,
              top: '100%', marginTop: 6,
              transform: 'translateX(-50%)',
              fontSize: 10, whiteSpace: 'nowrap',
              color: (min + i) === value ? '#007AFF' : '#86868b',
              fontWeight: (min + i) === value ? 600 : 400,
              pointerEvents: 'none',
            }}>
              {valueLabels[i]}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 11, color: '#86868b', minWidth: 32, whiteSpace: 'nowrap' }}>{rightLabel}</span>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.75)', fontWeight: 400 }}>{label}</span>
      <div
        onClick={() => onChange(!checked)}
        style={{ width: 48, height: 22, background: checked ? '#007AFF' : '#e5e5ea', borderRadius: 11, position: 'relative', cursor: 'pointer', transition: 'background 0.22s', flexShrink: 0 }}
      >
        <motion.div
          animate={{ x: checked ? 27 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ position: 'absolute', top: 2, width: 18, height: 18, background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
        />
      </div>
    </div>
  )
}

// macOS 风格分组卡片
function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean)
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#86868b', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
        {label}
      </p>
      <div style={{ background: 'rgba(0,0,0,0.018)', borderRadius: 10, overflow: 'hidden' }}>
        {items.map((child, i) => (
          <div key={i}>
            <div style={{ padding: '10px 16px' }}>{child}</div>
            {i < items.length - 1 && (
              <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginLeft: 16 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PositionPicker({ value, onChange }: { value: DockPosition; onChange: (v: DockPosition) => void }) {
  const t = useT()
  const options = [
    { value: 'bottom', label: t('pos_bottom') },
    { value: 'top',    label: t('pos_top') },
    { value: 'left',   label: t('pos_left') },
    { value: 'right',  label: t('pos_right') },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.75)', fontWeight: 400 }}>{t('label_position')}</span>
      <Select
        value={value}
        onChange={onChange}
        options={options}
        size="small"
        style={{ width: 100 }}
        popupClassName="sm-select-popup"
        getPopupContainer={() => document.body}
      />
    </div>
  )
}

function BackgroundTypePicker({ value, onChange }: { value: BackgroundType; onChange: (v: BackgroundType) => void }) {
  const t = useT()
  const options = [
    { value: 'color', label: t('bg_color') },
    { value: 'gradient', label: t('bg_gradient') },
    { value: 'image', label: t('bg_image') },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.75)', fontWeight: 400 }}>{t('label_bg_type')}</span>
      <Select
        value={value}
        onChange={onChange}
        options={options}
        size="small"
        style={{ width: 100 }}
        popupClassName="sm-select-popup"
        getPopupContainer={() => document.body}
      />
    </div>
  )
}

const SOLID_PER_ROW = 14  // 24px + 6px gap = 30px, ~420px container
const GRAD_PER_ROW = 13   // 30px + 6px gap = 36px, ~468px container

function ColorPicker({ value, onChange, customSolids, onOpenNewPreset, onOpenAllSolidPresets }: {
  value: string
  onChange: (v: string) => void
  customSolids?: string[]
  onOpenNewPreset?: () => void
  onOpenAllSolidPresets?: () => void
}) {
  const t = useT()
  const [showMore, setShowMore] = useState(false)
  const MAX_PREVIEW = SOLID_PER_ROW * 2

  const presetColors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
    '#43e97b', '#38f9d7', '#fa709a', '#fee140', '#30cfd0', '#330867',
    '#a8edea', '#fed6e3', '#ff9a9e', '#fecfef', '#ffecd2', '#fcb69f',
    '#ff6e7f', '#bfe9ff', '#fdcbf1', '#e6dee9', '#fbc2eb', '#a6c1ee',
    '#ffeaa7', '#fd79a8', '#fdcb6e', '#6c5ce7', '#00b894', '#00cec9',
    '#0984e3', '#a29bfe', '#e17055', '#d63031', '#fab1a0', '#74b9ff',
    '#ff7675', '#e84393', '#fd79a8', '#fdcb6e',
  ]

  const itemsPerRow = Math.floor(430 / 30)
  const visibleColors = showMore ? presetColors : presetColors.slice(0, itemsPerRow)

  return (
    <div>
      {/* 预设颜色 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#86868b' }}>{t('label_preset_colors')}</span>
          {presetColors.length > itemsPerRow && (
            <span
              onClick={() => setShowMore(!showMore)}
              style={{ fontSize: 11, color: '#007AFF', cursor: 'pointer', userSelect: 'none' }}
            >
              {showMore ? t('btn_collapse') : t('btn_expand')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {visibleColors.map((color, i) => (
            <div
              key={i}
              onClick={() => onChange(color)}
              style={{
                width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                background: color,
                border: value === color ? '2px solid #007AFF' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* 自定义颜色 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#86868b' }}>{t('label_custom_colors')}</span>
          <span
            onClick={onOpenNewPreset}
            style={{ fontSize: 11, color: '#007AFF', cursor: 'pointer', userSelect: 'none' }}
          >{t('btn_add_new')}</span>
        </div>
        {(customSolids && customSolids.length > 0) ? (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {customSolids.slice(0, MAX_PREVIEW).map((color, i) => (
                <div
                  key={i}
                  onClick={() => onChange(color)}
                  style={{
                    width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                    background: color,
                    border: value === color ? '2px solid #007AFF' : '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                />
              ))}
            </div>
            {customSolids.length > MAX_PREVIEW && (
              <div
                onClick={onOpenAllSolidPresets}
                style={{ marginTop: 6, fontSize: 11, color: '#007AFF', cursor: 'pointer', userSelect: 'none' }}
              >{t('label_view_all_presets', { count: customSolids.length })}</div>
            )}
          </>
        ) : (
          <span style={{ fontSize: 12, color: '#86868b' }}>{t('no_custom_solids')}</span>
        )}
      </div>
    </div>
  )
}

function GradientPicker({ value, onChange, customGradients, onOpenGradientEditor, onOpenAllGradPresets }: {
  value: string
  onChange: (v: string) => void
  customGradients?: string[]
  onOpenGradientEditor: (index: number) => void
  onOpenAllGradPresets?: () => void
}) {
  const MAX_PREVIEW_GRAD = GRAD_PER_ROW * 2
  const t = useT()
  const [showMore, setShowMore] = useState(false)

  const builtInGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
    'linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%)',
    'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
    'linear-gradient(to right, #fa709a 0%, #fee140 100%)',
    'linear-gradient(to right, #30cfd0 0%, #330867 100%)',
    'linear-gradient(to right, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(to right, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(120deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(120deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(120deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(-45deg, #ee7752 0%, #e73c7e 33%, #23a6d5 66%, #23d5ab 100%)',
    'linear-gradient(-45deg, #667eea 0%, #764ba2 33%, #f093fb 66%, #f5576c 100%)',
    'linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%)',
    'linear-gradient(to top, #fdcbf1 0%, #e6dee9 100%)',
    'radial-gradient(circle, #667eea 0%, #764ba2 100%)',
    'radial-gradient(circle, #f093fb 0%, #f5576c 100%)',
    'radial-gradient(circle, #4facfe 0%, #00f2fe 100%)',
    'radial-gradient(circle, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(to right, #ff6e7f 0%, #bfe9ff 100%)',
    'linear-gradient(to right, #667eea 0%, #764ba2 100%)',
    'linear-gradient(60deg, #abecd6 0%, #fbed96 100%)',
    'linear-gradient(60deg, #96fbc4 0%, #f9f586 100%)',
    'linear-gradient(-60deg, #ff5858 0%, #f09819 100%)',
    'linear-gradient(-60deg, #16d9e3 0%, #30c7ec 47%, #46aef7 100%)',
    'linear-gradient(to right, #eea2a2 0%, #bbc1bf 19%, #57c6e1 42%, #b49fda 79%, #7ac5d8 100%)',
    'linear-gradient(to right, #3a7bd5 0%, #3a6073 100%)',
    'linear-gradient(to right, #009fff 0%, #ec2f4b 100%)',
    'linear-gradient(to right, #0700b8 0%, #00ff88 100%)',
    'linear-gradient(to right, #d53369 0%, #daae51 100%)',
    'linear-gradient(to right, #7f00ff 0%, #e100ff 100%)',
  ]

  const customList = customGradients || []
  const visibleBuiltIn = showMore ? builtInGradients : builtInGradients.slice(0, 12) // 显示12个正好占满一行

  const handleAddCustom = () => {
    onOpenGradientEditor(customList.length)
  }

  const handleEditCustom = (index: number) => {
    onOpenGradientEditor(index)
  }

  return (
    <div>
      {/* 内置渐变 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#86868b' }}>{t('label_builtin_gradients')}</span>
          <span
            onClick={() => setShowMore(!showMore)}
            style={{ fontSize: 11, color: '#007AFF', cursor: 'pointer', userSelect: 'none' }}
          >
            {showMore ? t('btn_collapse') : t('btn_expand')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {visibleBuiltIn.map((preset, i) => (
            <div
              key={i}
              onClick={() => onChange(preset)}
              style={{
                width: 30,
                height: 24,
                borderRadius: 4,
                cursor: 'pointer',
                background: preset,
                border: value === preset ? '2px solid #007AFF' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* 自定义渐变 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#86868b' }}>{t('label_custom_gradients')}</span>
          <span
            onClick={handleAddCustom}
            style={{ fontSize: 11, color: '#007AFF', cursor: 'pointer', userSelect: 'none' }}
          >{t('btn_add_new')}</span>
        </div>
        {customList.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {customList.slice(0, MAX_PREVIEW_GRAD).map((gradient, i) => (
                <div
                  key={i}
                  onClick={() => onChange(gradient)}
                  onDoubleClick={() => handleEditCustom(i)}
                  style={{
                    width: 30, height: 24, borderRadius: 4, cursor: 'pointer',
                    background: gradient,
                    border: value === gradient ? '2px solid #007AFF' : '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                />
              ))}
            </div>
            {customList.length > MAX_PREVIEW_GRAD && (
              <div
                onClick={onOpenAllGradPresets}
                style={{ marginTop: 6, fontSize: 11, color: '#007AFF', cursor: 'pointer', userSelect: 'none' }}
              >{t('label_view_all_presets', { count: customList.length })}</div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>
            {t('no_custom_gradients')}
          </div>
        )}
      </div>

    </div>
  )
}

// ── 随机显示行 ──────────────────────────────────────────────────

import type { RandomType } from '../store/dockConfig'

const RANDOM_OPTIONS: RandomType[] = ['none', 'every5min', 'every30min', 'hourly', 'daily', 'monthly']

function RandomDisplayRow({ value, onChange }: { value: RandomType; onChange: (v: RandomType) => void }) {
  const t = useT()
  const [faqPos, setFaqPos] = useState<{ left: number; top: number } | null>(null)
  const faqIconRef = useRef<HTMLDivElement>(null)

  const labelKey: Record<RandomType, string> = {
    none: 'random_none',
    every5min: 'random_every5min',
    every30min: 'random_every30min',
    hourly: 'random_hourly',
    daily: 'random_daily',
    monthly: 'random_monthly',
  }

  const handleFaqEnter = () => {
    if (!faqIconRef.current) return
    const rect = faqIconRef.current.getBoundingClientRect()
    const popW = 320
    const left = Math.min(rect.left, window.innerWidth - popW - 12)
    setFaqPos({ left, top: rect.bottom + 6 })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.75)', fontWeight: 400 }}>{t('label_random_type')}</span>
        {/* FAQ 图标 */}
        <div
          ref={faqIconRef}
          onMouseEnter={handleFaqEnter}
          onMouseLeave={() => setFaqPos(null)}
          style={{ cursor: 'default', lineHeight: 1, color: '#86868b', fontSize: 14, userSelect: 'none' }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="6.5" stroke="#8E8E93" strokeWidth="1.2"/>
            <path d="M7.5 10.5V10" stroke="#8E8E93" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M5.5 5.8C5.5 4.7 6.4 4 7.5 4C8.6 4 9.5 4.7 9.5 5.8C9.5 6.6 9 7.1 8.4 7.5C7.9 7.85 7.5 8.2 7.5 9"
              stroke="#8E8E93" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        {/* FAQ 浮层 — fixed 定位，脱离 overflow:hidden 容器 */}
        {faqPos && (
          <div style={{
            position: 'fixed', left: faqPos.left, top: faqPos.top, zIndex: 9999,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            padding: '12px 14px',
            width: 320,
            fontSize: 12,
            color: 'rgba(0,0,0,0.7)',
            lineHeight: 1.7,
            whiteSpace: 'pre-line',
            pointerEvents: 'none',
          }}>
            {t('random_faq')}
          </div>
        )}
      </div>
      <Select
        value={value}
        onChange={onChange}
        options={RANDOM_OPTIONS.map(opt => ({ value: opt, label: t(labelKey[opt] as any) }))}
        size="small"
        style={{ width: 130 }}
        popupClassName="sm-select-popup"
      />
    </div>
  )
}

function ImagePicker({ value, onChange, imageSources, onImageSourcesChange, customImages, onCustomImagesChange, customImagesGroupName, onOpenImageLibrary, onOpenPreview }: {
  value: string
  onChange: (v: string) => void
  imageSources: ImageSource[]
  onImageSourcesChange: (v: ImageSource[]) => void
  customImages?: string[]
  onCustomImagesChange: (v: string[]) => void
  customImagesGroupName?: string
  onOpenImageLibrary: () => void
  onOpenPreview: (url: string) => void
}) {
  const t = useT()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; url: string } | null>(null)
  const [apiInputUrl, setApiInputUrl] = useState('')
  const [customUrlInput, setCustomUrlInput] = useState('')

  // 预设在线图片（使用 Unsplash 免费图片）- 50张
  const builtInImages = [
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80',
    'https://images.unsplash.com/photo-1554034483-04fda0d3507b?w=1200&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
    'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1200&q=80',
    'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1200&q=80',
    'https://images.unsplash.com/photo-1484589065579-248aad0d8b13?w=1200&q=80',
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80',
    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80',
    'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&q=80',
    'https://images.unsplash.com/photo-1465146633011-14f8e0781093?w=1200&q=80',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=80',
    'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1200&q=80',
    'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1200&q=80',
    'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&q=80',
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&q=80',
    'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200&q=80',
    'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1200&q=80',
    'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&q=80',
    'https://images.unsplash.com/photo-1445964047600-cdbdb873673d?w=1200&q=80',
    'https://images.unsplash.com/photo-1504567961542-e24d9439a724?w=1200&q=80',
    'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1200&q=80',
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=80',
    'https://images.unsplash.com/photo-1498855926480-d98e83099315?w=1200&q=80',
    'https://images.unsplash.com/photo-1434394354979-a235cd36269d?w=1200&q=80',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80',
    'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=1200&q=80',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80',
    'https://images.unsplash.com/photo-1442291928580-fb5d0856a8f1?w=1200&q=80',
    'https://images.unsplash.com/photo-1488188840666-e2308741a62f?w=1200&q=80',
    'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=1200&q=80',
    'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?w=1200&q=80',
    'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1200&q=80',
    'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=1200&q=80',
    'https://images.unsplash.com/photo-1475113548554-5a36f1f523d6?w=1200&q=80',
    'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=1200&q=80',
    'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&q=80',
    'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1200&q=80',
    'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1200&q=80',
    'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=1200&q=80',
    'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=1200&q=80',
    'https://images.unsplash.com/photo-1459213599465-03ab6a4d5931?w=1200&q=80',
  ]

  // 检查是否是有效的 HTTP URL
  const isValidHttpUrl = (str: string) => {
    if (!str || !str.trim()) return false
    try {
      const url = new URL(str.trim())
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  // 添加新数据源
  const handleAddSource = async () => {
    const url = apiInputUrl.trim()
    if (!isValidHttpUrl(url)) return
    if (imageSources.some(s => s.url === url)) {
      setError(t('error_source_exists'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      let images: string[] = []
      if (Array.isArray(data)) {
        images = data.filter(item => typeof item === 'string')
      } else if (data.images && Array.isArray(data.images)) {
        images = data.images.filter((item: any) => typeof item === 'string')
      } else {
        throw new Error(t('error_invalid_format'))
      }
      const newSource: ImageSource = {
        id: Date.now().toString(),
        name: t('source_default_name', { n: imageSources.length + 1 }),
        url,
        images: Array.from(new Set(images)),
      }
      onImageSourcesChange([...imageSources, newSource])
      setApiInputUrl('')
      onOpenImageLibrary()
    } catch (err) {
      setError(t('error_load_failed', { msg: err instanceof Error ? err.message : url }))
    } finally {
      setLoading(false)
    }
  }

  // 删除选中的图片
  const deleteSelectedImages = () => {
    onCustomImagesChange((customImages || []).filter(url => !selectedImages.has(url)))
    setSelectedImages(new Set())
    setIsSelectionMode(false)
  }

  // 切换图片选择状态
  const toggleImageSelection = (url: string) => {
    const next = new Set(selectedImages)
    if (next.has(url)) next.delete(url)
    else next.add(url)
    setSelectedImages(next)
  }

  // 合并所有图片：内置 + 数据源 + 用户添加的（去重）
  const allImages = Array.from(new Set([
    ...builtInImages,
    ...imageSources.flatMap(s => s.images),
    ...(customImages || []),
  ]))

  // 固定显示 6x4 = 24张图片
  const maxVisible = 24
  const visibleImages = allImages.slice(0, maxVisible)
  const isCustomUrlValid = isValidHttpUrl(customUrlInput)

  return (
    <div onClick={() => contextMenu && setContextMenu(null)}>
      {/* 自定义数据源配置 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#86868b' }}>{t('label_api_source')}</span>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <span
              style={{
                fontSize: 11,
                color: '#007AFF',
                cursor: 'help',
                userSelect: 'none',
                borderBottom: '1px dashed #007AFF',
              }}
            >
              {t('label_format_hint')}
            </span>
            {/* 悬浮提示框 - 左下显示 */}
            <div
              className="format-help-tooltip"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                transform: 'translateY(4px)',
                marginTop: 4,
                width: 280,
                fontSize: 11,
                color: '#333',
                background: '#fff',
                padding: 10,
                borderRadius: 8,
                lineHeight: 1.6,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                opacity: 0,
                pointerEvents: 'none',
                transition: 'opacity 0.2s, transform 0.2s',
                zIndex: 1000,
              }}
            >
              {/* 右上小三角 */}
              <div style={{
                position: 'absolute',
                top: -6,
                right: 12,
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid #fff',
              }} />

              <div style={{ fontWeight: 600, marginBottom: 6, color: '#007AFF' }}>
                {t('format_hint_json_title')}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, background: 'rgba(0,0,0,0.03)', padding: 6, borderRadius: 4, marginBottom: 6 }}>
                {t('format_hint_type1')}: ["url1", "url2", ...]<br/>
                {t('format_hint_type2')}: &#123;"images": ["url1", ...]&#125;
              </div>
              <div style={{ color: '#666', fontSize: 10 }}>
                💡 {t('format_hint_example')}: https://api.example.com/images.json
              </div>
            </div>
            <style>{`
              .format-help-tooltip:has(~ span:hover),
              .format-help-tooltip:hover {
                opacity: 1 !important;
                pointerEvents: auto !important;
                transform: translateY(0) !important;
              }
              span:has(+ .format-help-tooltip):hover + .format-help-tooltip {
                opacity: 1 !important;
                pointerEvents: auto !important;
                transform: translateY(0) !important;
              }
            `}</style>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              value={apiInputUrl}
              onChange={(e) => setApiInputUrl(e.target.value)}
              placeholder="https://api.example.com/images.json"
              style={{
                width: '100%',
                padding: '6px 32px 6px 10px',
                borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: 12,
                outline: 'none',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#007AFF'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddSource() }}
            />
            {apiInputUrl && (
              <div
                onClick={() => {
                  setApiInputUrl('')
                  setError('')
                }}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: '#666',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
              >
                ×
              </div>
            )}
          </div>
          <div
            onClick={isValidHttpUrl(apiInputUrl) ? handleAddSource : undefined}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: loading || !isValidHttpUrl(apiInputUrl) ? 'rgba(0,0,0,0.05)' : 'rgba(0,122,255,0.1)',
              color: loading || !isValidHttpUrl(apiInputUrl) ? '#999' : '#007AFF',
              fontSize: 12,
              cursor: loading || !isValidHttpUrl(apiInputUrl) ? 'not-allowed' : 'pointer',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              opacity: !isValidHttpUrl(apiInputUrl) ? 0.5 : 1,
            }}
          >
            {loading ? t('btn_loading') : t('btn_load')}
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 11, color: '#ff3b30', marginTop: 4 }}>
            ⚠️ {error}
          </div>
        )}

        {imageSources.length > 0 && (
          <div style={{ fontSize: 11, color: '#34c759', marginTop: 4 }}>
            {t('status_sources_info', { count: imageSources.length, total: imageSources.reduce((acc, s) => acc + s.images.length, 0) })}
          </div>
        )}
      </div>

      {/* 图片宫格 - 固定显示 6x4 = 24张 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#86868b' }}>
            {t('label_image_library')} ({builtInImages.length} {t('label_builtin')}
            {imageSources.length > 0 && ` + ${imageSources.reduce((acc, s) => acc + s.images.length, 0)} ${t('label_from_sources')}`}
            {(customImages && customImages.length > 0) && ` + ${customImages.length} ${customImagesGroupName || t('my_library_default')}`})
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span
              onClick={() => {
                const blob = new Blob([JSON.stringify({ images: allImages }, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'newtab-images.json'
                a.click()
                URL.revokeObjectURL(url)
              }}
              style={{ fontSize: 11, color: '#007AFF', cursor: 'pointer', userSelect: 'none' }}
            >
              {t('btn_export')}
            </span>
            {allImages.length > maxVisible && (
              <span
                onClick={() => onOpenImageLibrary()}
                style={{ fontSize: 11, color: '#007AFF', cursor: 'pointer', userSelect: 'none' }}
              >
                {t('btn_more', { count: allImages.length })}
              </span>
            )}
          </div>
        </div>

        {/* 选择模式工具栏 */}
        {isSelectionMode && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 10px', marginBottom: 8,
            background: 'rgba(0,122,255,0.07)', borderRadius: 6,
            border: '1px solid rgba(0,122,255,0.15)',
          }}>
            <span style={{ fontSize: 11, color: '#007AFF' }}>
              {t('selection_count', { count: selectedImages.size })}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <span
                onClick={() => { setSelectedImages(new Set()); setIsSelectionMode(false) }}
                style={{ fontSize: 11, color: '#86868b', cursor: 'pointer', userSelect: 'none' }}
              >
                {t('btn_cancel')}
              </span>
              {selectedImages.size > 0 && (
                <span
                  onClick={deleteSelectedImages}
                  style={{ fontSize: 11, color: '#ff3b30', cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}
                >
                  {t('btn_delete_selected')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 固定显示 24 张（6列 x 4行）*/}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {visibleImages.map((url, i) => {
            const isCustom = (customImages || []).includes(url)
            const isSelected = selectedImages.has(url)
            return (
              <div
                key={i}
                onClick={() => {
                  if (isSelectionMode && isCustom) {
                    toggleImageSelection(url)
                  } else if (!isSelectionMode) {
                    onChange(url)
                  }
                }}
                onContextMenu={(e) => {
                  if (isCustom) {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, url })
                  }
                }}
                style={{
                  position: 'relative',
                  width: 66,
                  height: 66,
                  borderRadius: 8,
                  cursor: 'pointer',
                  backgroundImage: `url(${url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: isSelected
                    ? '3px solid #ff9500'
                    : value === url
                    ? '3px solid #007AFF'
                    : '1px solid rgba(0,0,0,0.1)',
                  boxShadow: value === url ? '0 2px 8px rgba(0, 122, 255, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  if (value !== url && !isSelected) {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== url && !isSelected) {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                  }
                }}
              >
                {/* 自定义图片选择模式覆盖层 */}
                {isSelectionMode && isCustom && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: isSelected ? 'rgba(255,149,0,0.35)' : 'rgba(0,0,0,0.18)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                    padding: 4,
                  }}>
                    <div style={{
                      width: 17, height: 17, borderRadius: '50%',
                      background: isSelected ? '#ff9500' : 'rgba(255,255,255,0.85)',
                      border: isSelected ? 'none' : '1.5px solid rgba(0,0,0,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#fff', fontWeight: 700, lineHeight: 1,
                    }}>
                      {isSelected ? '✓' : ''}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 自定义 URL 输入 */}
      <div>
        <div style={{ fontSize: 12, color: '#86868b', marginBottom: 6 }}>{t('label_direct_url')}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              style={{
                width: '100%',
                padding: '6px 32px 6px 10px',
                borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.1)',
                fontSize: 12,
                outline: 'none',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#007AFF'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
            />
            {customUrlInput && (
              <div
                onClick={() => setCustomUrlInput('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: '#666',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
              >
                ×
              </div>
            )}
          </div>
          <div
            onClick={isCustomUrlValid ? () => {
              onOpenPreview(customUrlInput)
            } : undefined}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: !isCustomUrlValid ? 'rgba(0,0,0,0.05)' : 'rgba(0,122,255,0.1)',
              color: !isCustomUrlValid ? '#999' : '#007AFF',
              fontSize: 12,
              cursor: !isCustomUrlValid ? 'not-allowed' : 'pointer',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              opacity: !isCustomUrlValid ? 0.5 : 1,
            }}
          >
            {t('btn_preview')}
          </div>
        </div>
      </div>


      {/* 右键上下文菜单 */}
      {contextMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10002 }}
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.07)',
              overflow: 'hidden',
              zIndex: 10003,
              minWidth: 120,
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            <div
              onClick={() => {
                setIsSelectionMode(true)
                toggleImageSelection(contextMenu.url)
                setContextMenu(null)
              }}
              style={{ padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#333', userSelect: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,122,255,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {t('menu_batch_select')}
            </div>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />
            <div
              onClick={() => {
                onCustomImagesChange((customImages || []).filter(u => u !== contextMenu.url))
                setContextMenu(null)
              }}
              style={{ padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#ff3b30', userSelect: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,59,48,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {t('btn_delete')}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── 图片库面板内容组件 ─────────────────────────────────────

function ImageLibraryPanelContent({ value, onChange, imageSources, onImageSourcesChange, customImages, onCustomImagesChange, customImagesGroupName, onCustomImagesGroupNameChange, onOpenConfirmDelete }: {
  value: string
  onChange: (v: string) => void
  imageSources: ImageSource[]
  onImageSourcesChange: (v: ImageSource[]) => void
  customImages: string[]
  onCustomImagesChange: (v: string[]) => void
  customImagesGroupName?: string
  onCustomImagesGroupNameChange: (v: string) => void
  onOpenConfirmDelete: (sourceId: string, sourceName: string) => void
}) {
  const t = useT()
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [loadingSourceId, setLoadingSourceId] = useState<string | null>(null)
  const [refreshErrors, setRefreshErrors] = useState<Record<string, string>>({})
  const [sourceMenu, setSourceMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; url: string } | null>(null)

  const builtInImages = [
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80',
    'https://images.unsplash.com/photo-1554034483-04fda0d3507b?w=1200&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
    'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1200&q=80',
    'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1200&q=80',
    'https://images.unsplash.com/photo-1484589065579-248aad0d8b13?w=1200&q=80',
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80',
    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80',
    'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&q=80',
    'https://images.unsplash.com/photo-1465146633011-14f8e0781093?w=1200&q=80',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=80',
    'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1200&q=80',
    'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1200&q=80',
    'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&q=80',
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&q=80',
    'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200&q=80',
    'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1200&q=80',
    'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&q=80',
    'https://images.unsplash.com/photo-1445964047600-cdbdb873673d?w=1200&q=80',
    'https://images.unsplash.com/photo-1504567961542-e24d9439a724?w=1200&q=80',
    'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1200&q=80',
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=80',
    'https://images.unsplash.com/photo-1498855926480-d98e83099315?w=1200&q=80',
    'https://images.unsplash.com/photo-1434394354979-a235cd36269d?w=1200&q=80',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80',
    'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=1200&q=80',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80',
    'https://images.unsplash.com/photo-1442291928580-fb5d0856a8f1?w=1200&q=80',
    'https://images.unsplash.com/photo-1488188840666-e2308741a62f?w=1200&q=80',
    'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=1200&q=80',
    'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?w=1200&q=80',
    'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1200&q=80',
    'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=1200&q=80',
    'https://images.unsplash.com/photo-1475113548554-5a36f1f523d6?w=1200&q=80',
    'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=1200&q=80',
    'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&q=80',
    'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1200&q=80',
    'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1200&q=80',
    'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=1200&q=80',
    'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=1200&q=80',
    'https://images.unsplash.com/photo-1459213599465-03ab6a4d5931?w=1200&q=80',
  ]

  const myLibraryDefault = t('my_library_default')

  const handleRefreshSource = async (sourceId: string) => {
    const source = imageSources.find(s => s.id === sourceId)
    if (!source) return
    setLoadingSourceId(sourceId)
    setRefreshErrors(prev => { const next = { ...prev }; delete next[sourceId]; return next })
    try {
      const response = await fetch(source.url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      let images: string[] = []
      if (Array.isArray(data)) {
        images = data.filter((item: any) => typeof item === 'string')
      } else if (data.images && Array.isArray(data.images)) {
        images = data.images.filter((item: any) => typeof item === 'string')
      } else {
        throw new Error(t('error_invalid_format'))
      }
      onImageSourcesChange(imageSources.map(s =>
        s.id === sourceId ? { ...s, images: Array.from(new Set(images)) } : s
      ))
    } catch (err) {
      setRefreshErrors(prev => ({ ...prev, [sourceId]: err instanceof Error ? err.message : t('error_refresh_failed', { msg: '' }) }))
    } finally {
      setLoadingSourceId(null)
    }
  }

  const handleRenameSource = (sourceId: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    onImageSourcesChange(imageSources.map(s => s.id === sourceId ? { ...s, name: trimmed } : s))
  }

  const addToCustomImages = (url: string) => {
    if (!customImages.includes(url)) onCustomImagesChange([...customImages, url])
  }

  const deleteSelectedImages = () => {
    onCustomImagesChange(customImages.filter(url => !selectedImages.has(url)))
    setSelectedImages(new Set())
    setIsSelectionMode(false)
  }

  const toggleImageSelection = (url: string) => {
    const next = new Set(selectedImages)
    if (next.has(url)) next.delete(url)
    else next.add(url)
    setSelectedImages(next)
  }

  return (
    <div onClick={() => { contextMenu && setContextMenu(null); sourceMenu && setSourceMenu(null) }}>
      {/* 系统预设 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          {t('group_system_presets', { count: builtInImages.length })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10 }}>
          {builtInImages.map((url, i) => (
            <div
              key={`builtin-${i}`}
              onClick={() => onChange(url)}
              style={{
                aspectRatio: '1', borderRadius: 8, cursor: 'pointer',
                backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                border: value === url ? '3px solid #007AFF' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: value === url ? '0 2px 8px rgba(0,122,255,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { if (value !== url) { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)' } }}
              onMouseLeave={(e) => { if (value !== url) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)' } }}
            />
          ))}
        </div>
      </div>

      {/* 每个数据源一个分组 */}
      {imageSources.map(source => (
        <div key={source.id} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: refreshErrors[source.id] ? 6 : 12, paddingBottom: 8, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              {editingGroup?.id === source.id ? (
                <input
                  autoFocus
                  value={editingGroup.name}
                  onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  onBlur={() => { handleRenameSource(source.id, editingGroup.name); setEditingGroup(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') { handleRenameSource(source.id, editingGroup.name); setEditingGroup(null) } if (e.key === 'Escape') setEditingGroup(null) }}
                  style={{ fontSize: 13, fontWeight: 600, color: '#333', border: 'none', borderBottom: '1.5px solid #007AFF', outline: 'none', background: 'transparent', minWidth: 80 }}
                />
              ) : (
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: '#333', cursor: 'text' }}
                  onDoubleClick={() => setEditingGroup({ id: source.id, name: source.name })}
                  title={t('tip_double_click_rename')}
                >
                  {source.name} ({source.images.length})
                </span>
              )}
              <span
                onClick={() => setEditingGroup({ id: source.id, name: source.name })}
                style={{ fontSize: 11, color: '#86868b', cursor: 'pointer', userSelect: 'none', opacity: 0.6, flexShrink: 0 }}
                title={t('tip_edit_name')}
              >✏️</span>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation()
                const rect = e.currentTarget.getBoundingClientRect()
                setSourceMenu(sourceMenu?.id === source.id ? null : { id: source.id, x: rect.right, y: rect.bottom + 4 })
              }}
              style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', userSelect: 'none',
                background: sourceMenu?.id === source.id ? 'rgba(0,0,0,0.07)' : 'transparent',
                fontSize: 16, color: '#86868b', letterSpacing: 1, transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (sourceMenu?.id !== source.id) e.currentTarget.style.background = 'rgba(0,0,0,0.05)' }}
              onMouseLeave={(e) => { if (sourceMenu?.id !== source.id) e.currentTarget.style.background = 'transparent' }}
            >
              {loadingSourceId === source.id ? <span style={{ fontSize: 11, color: '#86868b' }}>…</span> : '⋯'}
            </div>
          </div>
          {refreshErrors[source.id] && (
            <div style={{ fontSize: 11, color: '#ff3b30', marginBottom: 8 }}>
              {t('label_refresh_error', { msg: refreshErrors[source.id] })}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10 }}>
            {source.images.map((url, i) => {
              const alreadyAdded = customImages.includes(url)
              return (
                <div
                  key={`src-${source.id}-${i}`}
                  style={{
                    aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                    position: 'relative', cursor: 'pointer',
                    border: value === url ? '3px solid #007AFF' : '1px solid rgba(0,0,0,0.1)',
                    boxShadow: value === url ? '0 2px 8px rgba(0,122,255,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    onClick={() => onChange(url)}
                    style={{ width: '100%', height: '100%', backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  />
                  {alreadyAdded ? (
                    <div style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#34c759', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#fff', fontWeight: 700,
                    }}>✓</div>
                  ) : (
                    <div
                      onClick={(e) => { e.stopPropagation(); addToCustomImages(url) }}
                      style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
                        padding: '14px 0 5px', textAlign: 'center', fontSize: 10, color: '#fff',
                        cursor: 'pointer', userSelect: 'none',
                      }}
                    >{t('btn_add_to_library')}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* 我的图片库 */}
      {customImages.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {editingGroup?.id === '__custom__' ? (
                <input
                  autoFocus
                  value={editingGroup.name}
                  onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  onBlur={() => { onCustomImagesGroupNameChange(editingGroup.name.trim() || myLibraryDefault); setEditingGroup(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') { onCustomImagesGroupNameChange(editingGroup.name.trim() || myLibraryDefault); setEditingGroup(null) } if (e.key === 'Escape') setEditingGroup(null) }}
                  style={{ fontSize: 13, fontWeight: 600, color: '#333', border: 'none', borderBottom: '1.5px solid #007AFF', outline: 'none', background: 'transparent', minWidth: 80 }}
                />
              ) : (
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: '#333', cursor: 'text' }}
                  onDoubleClick={() => setEditingGroup({ id: '__custom__', name: customImagesGroupName || myLibraryDefault })}
                  title={t('tip_double_click_rename')}
                >
                  {customImagesGroupName || myLibraryDefault} ({customImages.length})
                </span>
              )}
              <span
                onClick={() => setEditingGroup({ id: '__custom__', name: customImagesGroupName || myLibraryDefault })}
                style={{ fontSize: 11, color: '#86868b', cursor: 'pointer', userSelect: 'none', opacity: 0.6 }}
                title={t('tip_edit_name')}
              >✏️</span>
            </div>
            {isSelectionMode && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#007AFF' }}>{t('selection_count', { count: selectedImages.size })}</span>
                <span onClick={() => { setSelectedImages(new Set()); setIsSelectionMode(false) }} style={{ fontSize: 11, color: '#86868b', cursor: 'pointer', userSelect: 'none' }}>{t('btn_cancel')}</span>
                {selectedImages.size > 0 && (
                  <span onClick={deleteSelectedImages} style={{ fontSize: 11, color: '#ff3b30', cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}>{t('btn_delete_selected')}</span>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10 }}>
            {customImages.map((url, i) => {
              const isSelected = selectedImages.has(url)
              return (
                <div
                  key={`mylib-${i}`}
                  onClick={() => { if (isSelectionMode) toggleImageSelection(url); else onChange(url) }}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, url }) }}
                  style={{
                    aspectRatio: '1', borderRadius: 8, cursor: 'pointer',
                    backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                    border: isSelected ? '3px solid #ff9500' : value === url ? '3px solid #007AFF' : '1px solid rgba(0,0,0,0.1)',
                    boxShadow: value === url ? '0 2px 8px rgba(0,122,255,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => { if (value !== url && !isSelected) { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)' } }}
                  onMouseLeave={(e) => { if (value !== url && !isSelected) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)' } }}
                >
                  {isSelectionMode && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: isSelected ? 'rgba(255,149,0,0.35)' : 'rgba(0,0,0,0.18)',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 5,
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: isSelected ? '#ff9500' : 'rgba(255,255,255,0.85)',
                        border: isSelected ? 'none' : '1.5px solid rgba(0,0,0,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: '#fff', fontWeight: 700, lineHeight: 1,
                      }}>{isSelected ? '✓' : ''}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 数据源三点菜单 */}
      {sourceMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10004 }} onClick={() => setSourceMenu(null)} />
          <div style={{
            position: 'fixed', top: sourceMenu.y, left: sourceMenu.x - 128,
            background: '#fff', borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
            zIndex: 10005, minWidth: 120, paddingTop: 4, paddingBottom: 4, overflow: 'hidden',
          }}>
            <div
              onClick={() => { handleRefreshSource(sourceMenu.id); setSourceMenu(null) }}
              style={{ padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#333', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,122,255,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 13 }}>↻</span> {t('btn_refresh').replace('↻ ', '')}
            </div>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />
            <div
              onClick={() => {
                const src = imageSources.find(s => s.id === sourceMenu.id)
                if (src) onOpenConfirmDelete(src.id, src.name)
                setSourceMenu(null)
              }}
              style={{ padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#ff3b30', userSelect: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,59,48,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {t('btn_delete_source')}
            </div>
          </div>
        </>
      )}

      {/* 右键上下文菜单 */}
      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10002 }} onClick={() => setContextMenu(null)} />
          <div style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x,
            background: '#fff', borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.07)',
            overflow: 'hidden', zIndex: 10003, minWidth: 120, paddingTop: 4, paddingBottom: 4,
          }}>
            <div
              onClick={() => { setIsSelectionMode(true); toggleImageSelection(contextMenu.url); setContextMenu(null) }}
              style={{ padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#333', userSelect: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,122,255,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >{t('menu_batch_select')}</div>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />
            <div
              onClick={() => { onCustomImagesChange(customImages.filter(u => u !== contextMenu.url)); setContextMenu(null) }}
              style={{ padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#ff3b30', userSelect: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,59,48,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >{t('btn_delete')}</div>
          </div>
        </>
      )}
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────────

// ── 动画效果列表 ─────────────────────────────────────────────
const ANIMATION_EFFECTS = [
  'none',
  'fadeIn', 'fadeInUp', 'fadeInDown', 'fadeInLeft', 'fadeInRight',
  'zoomIn', 'zoomInUp', 'zoomInDown', 'zoomInLeft', 'zoomInRight',
  'slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight',
  'bounceIn', 'bounceInUp', 'bounceInDown', 'bounceInLeft', 'bounceInRight',
  'flipInX', 'flipInY',
  'rotateIn', 'rotateInDownLeft', 'rotateInDownRight', 'rotateInUpLeft', 'rotateInUpRight',
  'rollIn', 'lightSpeedInLeft', 'lightSpeedInRight', 'jackInTheBox',
]

// ── 快捷键 Tab ────────────────────────────────────────────────
function ShortcutKey({ k }: { k: string }) {
  return (
    <kbd style={{
      display: 'inline-block',
      padding: '2px 7px',
      fontSize: 11,
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 600,
      color: 'rgba(0,0,0,0.65)',
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.14)',
      borderRadius: 5,
      boxShadow: '0 1px 0 rgba(0,0,0,0.10)',
      lineHeight: '18px',
    }}>{k}</kbd>
  )
}

function ShortcutRow({ keys, desc, tip }: { keys: React.ReactNode; desc: string; tip?: string }) {
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null)
  const iconRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (!iconRef.current) return
    const r = iconRef.current.getBoundingClientRect()
    setTipPos({ x: r.left + r.width / 2, y: r.bottom + 6 })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>{desc}</span>
        {tip && (
          <div ref={iconRef} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setTipPos(null)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" fill="none"/>
              <text x="8" y="11.5" textAnchor="middle" fontSize="9" fontWeight="600" fill="rgba(0,0,0,0.4)" fontFamily="system-ui">?</text>
            </svg>
            {tipPos && createPortal(
              <div style={{
                position: 'fixed',
                left: tipPos.x, top: tipPos.y,
                transform: 'translateX(-50%)',
                background: 'rgba(40,40,40,0.92)', color: '#fff',
                fontSize: 12, lineHeight: 1.5,
                padding: '7px 10px', borderRadius: 7,
                whiteSpace: 'normal', width: 220,
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                pointerEvents: 'none', zIndex: 99999,
              }}>
                {tip}
                <div style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                  borderBottom: '5px solid rgba(40,40,40,0.92)',
                }} />
              </div>,
              document.body
            )}
          </div>
        )}
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>{keys}</span>
    </div>
  )
}

function ShortcutsTab() {
  const t = useT()
  const isMac = navigator.platform.toUpperCase().includes('MAC')
  const mod = isMac ? '⌘' : 'Ctrl'
  const plus = <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', margin: '0 1px' }}>+</span>

  return (
    <div style={{ padding: '2px 0' }}>
      <SettingsGroup label={t('shortcuts_section_global')}>
        <ShortcutRow keys={<><ShortcutKey k={mod} />{plus}<ShortcutKey k="D" /></>} desc={t('shortcuts_add_bookmark_page')} tip={t('shortcuts_add_bookmark_page_tip')} />
      </SettingsGroup>
      <SettingsGroup label={t('shortcuts_section_bookmark_panel')}>
        <ShortcutRow keys={<><ShortcutKey k={mod} />{plus}<ShortcutKey k="O" /></>} desc={t('shortcuts_new_bookmark')} />
        <ShortcutRow keys={<ShortcutKey k="Esc" />} desc={t('shortcuts_close_panel')} />
        <ShortcutRow keys={<ShortcutKey k="Esc" />} desc={t('shortcuts_exit_batch')} />
        <ShortcutRow keys={<ShortcutKey k="Enter" />} desc={t('shortcuts_search_execute')} />
      </SettingsGroup>
      <SettingsGroup label={t('shortcuts_section_bookmark_edit')}>
        <ShortcutRow keys={<ShortcutKey k="Esc" />} desc={t('shortcuts_close_modal')} />
        <ShortcutRow keys={<ShortcutKey k="Enter" />} desc={t('shortcuts_search_execute')} />
      </SettingsGroup>
    </div>
  )
}

// ── GitHub 发布 API（填入实际地址后生效）────────────────────
const GITHUB_RELEASES_API: string = ''  // e.g. 'https://api.github.com/repos/owner/repo/releases/latest'
const GITHUB_REPO_URL: string = 'https://github.com/tabset/newtab'

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

// ── 关于 Tab ──────────────────────────────────────────────────
function BackupTab() {
  const t = useT()
  const { config, setConfig } = useDockConfig()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [pendingData, setPendingData] = useState<object | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const json = JSON.stringify(config, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newtab-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error()
        setPendingData(data)
      } catch {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleConfirmRestore = () => {
    if (!pendingData) return
    setConfig(pendingData as any)
    setPendingData(null)
    setStatus('success')
    setTimeout(() => setStatus('idle'), 3000)
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    padding: '16px 18px',
    marginBottom: 12,
  }
  const titleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(0,0,0,0.82)',
    marginBottom: 6,
  }
  const descStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
    lineHeight: 1.6,
    marginBottom: 12,
  }
  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
  }

  return (
    <>
      <div style={{ padding: '4px 0' }}>
        {/* 导出 */}
        <div style={cardStyle}>
          <div style={titleStyle}>{t('backup_export_title')}</div>
          <div style={descStyle}>{t('backup_export_desc')}</div>
          <button
            style={{ ...btnStyle, background: '#007AFF', color: '#fff' }}
            onClick={handleExport}
          >
            {t('backup_export_btn')}
          </button>
        </div>

        {/* 恢复 */}
        <div style={cardStyle}>
          <div style={titleStyle}>{t('backup_import_title')}</div>
          <div style={descStyle}>{t('backup_import_desc')}</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            style={{ ...btnStyle, background: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.75)' }}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('backup_import_btn')}
          </button>
          {status !== 'idle' && (
            <div style={{
              marginTop: 10,
              fontSize: 12,
              fontWeight: 500,
              color: status === 'success' ? '#34C759' : '#FF3B30',
            }}>
              {status === 'success' ? t('backup_success') : t('backup_error')}
            </div>
          )}
        </div>
      </div>

      {/* 二次确认弹窗 */}
      <AnimatePresence>
        {pendingData && (
          <motion.div
            key="backup-confirm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setPendingData(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
            }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 480, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, rgba(40,40,50,0.96) 0%, rgba(30,30,40,0.96) 100%)',
                backdropFilter: 'blur(32px) saturate(160%)',
                WebkitBackdropFilter: 'blur(32px) saturate(160%)',
                borderRadius: 14, padding: '24px 28px', minWidth: 280, maxWidth: 360,
                border: '0.5px solid rgba(255,255,255,0.15)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 15, margin: '0 0 8px', fontWeight: 600 }}>
                {t('backup_import_title')}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
                {t('backup_confirm_desc')}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setPendingData(null)}
                  style={{
                    padding: '7px 18px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
                    fontSize: 13, cursor: 'pointer',
                  }}>
                  {t('backup_confirm_cancel')}
                </motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={handleConfirmRestore}
                  style={{
                    padding: '7px 18px', borderRadius: 8, border: 'none',
                    background: '#FF3B30', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                  {t('backup_confirm_ok')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function AboutTab() {
  const t = useT()
  const manifest = chrome.runtime.getManifest()
  const currentVersion = manifest.version

  type CheckState = 'idle' | 'checking' | 'up_to_date' | 'new_version' | 'failed'
  const [checkState, setCheckState] = useState<CheckState>('idle')
  const [latestVersion, setLatestVersion] = useState('')
  const [latestUrl, setLatestUrl] = useState('')

  const handleCheck = async () => {
    if (!GITHUB_RELEASES_API) return
    setCheckState('checking')
    try {
      const res = await fetch(GITHUB_RELEASES_API)
      if (!res.ok) throw new Error('network error')
      const data = await res.json()
      const tag: string = data.tag_name ?? ''
      const ver = tag.replace(/^v/, '')
      setLatestVersion(ver)
      setLatestUrl(data.html_url ?? GITHUB_REPO_URL)
      if (compareVersions(ver, currentVersion) > 0) {
        setCheckState('new_version')
      } else {
        setCheckState('up_to_date')
      }
    } catch {
      setCheckState('failed')
    }
  }

  const infoRow = (label: string, value: React.ReactNode) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      fontSize: 13,
    }}>
      <span style={{ color: 'rgba(0,0,0,0.5)' }}>{label}</span>
      <span style={{ color: 'rgba(0,0,0,0.75)', fontWeight: 500 }}>{value}</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32 }}>
      {/* 图标 + 名称 */}
      <img src="/icons/icon128.png" alt="New Tab" style={{ width: 72, height: 72, borderRadius: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', marginBottom: 12 }} />
      <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(0,0,0,0.82)', marginBottom: 4 }}>New Tab</div>
      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginBottom: 24, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
        {t('about_description')}
      </div>

      {/* 信息列表 */}
      <div style={{ width: '100%' }}>
        {infoRow(t('about_version'), `v${currentVersion}`)}
        {infoRow(t('about_license'), t('about_license_value'))}
        {GITHUB_REPO_URL && infoRow(t('about_github'),
          <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer"
            style={{ color: '#007AFF', textDecoration: 'none', fontWeight: 500 }}>
            {GITHUB_REPO_URL.replace('https://', '')}
          </a>
        )}
      </div>


      {/* 鼓励一下 */}
      <div style={{ marginTop: 24, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <motion.a
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          href={GITHUB_REPO_URL}
          target="_blank" rel="noreferrer"
          style={{
            padding: '8px 24px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', textDecoration: 'none', display: 'inline-block',
          }}
        >
          {t('about_star_btn')}
        </motion.a>
      </div>

      {/* 检查更新 */}
      <div style={{ marginTop: 12, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {GITHUB_RELEASES_API && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleCheck}
            disabled={checkState === 'checking'}
            style={{
              padding: '8px 24px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)',
              background: checkState === 'checking' ? 'rgba(0,0,0,0.04)' : '#fff',
              color: 'rgba(0,0,0,0.7)', fontSize: 13, fontWeight: 500,
              cursor: checkState === 'checking' ? 'default' : 'pointer',
            }}
          >
            {checkState === 'checking' ? t('about_checking') : t('about_check_update')}
          </motion.button>
        )}
        {checkState === 'up_to_date' && (
          <span style={{ fontSize: 12, color: '#34c759', fontWeight: 500 }}>✓ {t('about_up_to_date')}</span>
        )}
        {checkState === 'failed' && (
          <span style={{ fontSize: 12, color: '#ff3b30' }}>{t('about_check_failed')}</span>
        )}
        {checkState === 'new_version' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
              {t('about_new_version').replace('{version}', `v${latestVersion}`)}
            </span>
            <motion.a
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              href={latestUrl || GITHUB_REPO_URL}
              target="_blank" rel="noreferrer"
              style={{
                padding: '8px 28px', borderRadius: 8, border: 'none',
                background: '#007AFF', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              {t('about_update_now')}
            </motion.a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 书签布局设置 Tab ──────────────────────────────────────────
function BookmarkLayoutTab() {
  const { config, setConfig } = useDockConfig()
  const t = useT()
  const layout = config.bookmarkLayout ?? DEFAULT_BOOKMARK_LAYOUT

  const setLayout = (patch: Partial<BookmarkLayoutConfig>) =>
    setConfig({ bookmarkLayout: { ...layout, ...patch } })

  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const labelStyle: React.CSSProperties = { fontSize: 13, color: 'rgba(0,0,0,0.75)', fontWeight: 400 }
  const subLabelStyle: React.CSSProperties = { fontSize: 12, color: '#86868b' }

  const displayStyleOptions = [
    { value: 'icon-text' as BookmarkDisplayStyle, label: t('display_style_icon_text') },
    { value: 'icon-only' as BookmarkDisplayStyle, label: t('display_style_icon_only') },
    ...(layout.displayType === 'list' ? [{ value: 'name-only' as BookmarkDisplayStyle, label: t('display_style_name_only') }] : []),
  ]
  // If current style is name-only but display type switched to grid, reset to icon-text
  const safeDisplayStyle = layout.displayType === 'grid' && layout.displayStyle === 'name-only'
    ? 'icon-text' as BookmarkDisplayStyle
    : layout.displayStyle

  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const confirmReset = () => {
    setConfig({
      bookmarkLayout: {
        ...DEFAULT_BOOKMARK_LAYOUT,
        categories: layout.categories,
      },
    })
    setShowResetConfirm(false)
  }

  return (
    <>
      {/* ── 恢复默认按钮 ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button
          onClick={() => setShowResetConfirm(true)}
          style={{
            background: 'rgba(0,101,225,0.95)', border: 'none', borderRadius: 6,
            fontSize: 12, color: '#fff', padding: '5px 12px', cursor: 'pointer',
          }}
        >
          {t('btn_reset_defaults')}
        </button>
      </div>

      {/* ── 恢复默认确认弹窗 ── */}
      {showResetConfirm && (
        <div style={{
          background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.25)',
          borderRadius: 8, padding: '12px 14px', marginBottom: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>
            {t('confirm_reset_defaults_title')}
          </div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, marginBottom: 10 }}>
            {t('confirm_reset_defaults_msg')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => setShowResetConfirm(false)}
              style={{ background: 'none', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6, fontSize: 12, color: '#555', padding: '4px 12px', cursor: 'pointer' }}
            >
              {t('btn_cancel')}
            </button>
            <button
              onClick={confirmReset}
              style={{ background: 'rgba(0,101,225,0.95)', border: 'none', borderRadius: 6, fontSize: 12, color: '#fff', padding: '4px 12px', cursor: 'pointer' }}
            >
              {t('btn_reset_defaults')}
            </button>
          </div>
        </div>
      )}

      {/* ── 书签窗口 ── */}
      <SettingsGroup label={t('group_open_mode')}>
        {([
          { value: 'newtab' as BookmarkOpenMode, labelKey: 'open_mode_newtab', descKey: 'open_mode_newtab_desc' },
          { value: 'current' as BookmarkOpenMode, labelKey: 'open_mode_current', descKey: 'open_mode_current_desc' },
        ] as const).map(({ value, labelKey, descKey }) => {
          const isSelected = (layout.openMode ?? 'newtab') === value
          return (
            <div
              key={value}
              onClick={() => setLayout({ openMode: value })}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                background: isSelected ? 'rgba(0,101,225,0.08)' : 'rgba(0,0,0,0.02)',
                border: isSelected ? '1px solid rgba(0,101,225,0.2)' : '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                border: isSelected ? '2px solid #0065E1' : '2px solid rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0065E1' }} />}
              </div>
              <div>
                <div style={{ fontSize: 13, color: isSelected ? '#0065E1' : 'rgba(0,0,0,0.75)', fontWeight: isSelected ? 500 : 400 }}>
                  {t(labelKey as never)}
                </div>
                <div style={{ fontSize: 11, color: '#86868b', marginTop: 1 }}>
                  {t(descKey as never)}
                </div>
              </div>
            </div>
          )
        })}
      </SettingsGroup>

      {/* ── 布局设置 ── */}
      <SettingsGroup label={t('group_layout_settings')}>
        <div style={rowStyle}>
          <span style={labelStyle}>{t('label_display_type')}</span>
          <Select
            value={layout.displayType}
            onChange={(v) => setLayout({ displayType: v })}
            options={[
              { value: 'grid', label: t('display_type_grid') },
              { value: 'list', label: t('display_type_list') },
            ]}
            size="small" style={{ width: 130 }} popupClassName="sm-select-popup"
          />
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>{t('label_search_bar')}</span>
          <Select
            value={layout.showSearch ? 'show' : 'hide'}
            onChange={(v) => setLayout({ showSearch: v === 'show' })}
            options={[{ value: 'show', label: t('search_show') }, { value: 'hide', label: t('search_hide') }]}
            size="small" style={{ width: 130 }} popupClassName="sm-select-popup"
          />
        </div>

        {layout.showSearch && (
          <Slider
            label={t('label_search_bar_scale')}
            value={layout.searchBarScale ?? 2}
            min={1} max={5}
            leftLabel={t('scale_small')} rightLabel={t('scale_xlarge')}
            unit=""
            valueLabels={[t('scale_small'), t('scale_normal'), t('scale_medium'), t('scale_large'), t('scale_xlarge')]}
            showTicks
            onChange={(v) => setLayout({ searchBarScale: v })}
          />
        )}

        {layout.showSearch && (
          <Slider
            label={t('label_search_bar_radius')}
            value={layout.searchBarRadius ?? 2}
            min={0} max={3}
            leftLabel={t('search_radius_none')} rightLabel={t('search_radius_pill')}
            unit=""
            valueLabels={[t('search_radius_none'), t('search_radius_small'), t('search_radius_medium'), t('search_radius_pill')]}
            showTicks
            onChange={(v) => setLayout({ searchBarRadius: v })}
          />
        )}

        {layout.showSearch && (
          <div>
            <div style={rowStyle}>
              <span style={labelStyle}>{t('label_search_scope')}</span>
              <Select
                value={layout.searchScope}
                onChange={(v) => setLayout({ searchScope: v })}
                options={[
                  { value: 'local', label: t('search_scope_local') },
                  { value: 'online', label: t('search_scope_online') },
                ]}
                size="small" style={{ width: 130 }} popupClassName="sm-select-popup"
              />
            </div>

            {layout.searchScope === 'online' && (
              <div style={{ marginTop: 4 }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={subLabelStyle}>{t('label_search_engines')}</span>
                </div>
                {BUILTIN_SEARCH_ENGINES.map(engine => {
                  const isDefault = layout.defaultSearchEngineId === engine.id
                  return (
                    <div key={engine.id} onClick={() => setLayout({ defaultSearchEngineId: engine.id })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 8px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                        background: isDefault ? 'rgba(0,101,225,0.08)' : 'rgba(0,0,0,0.03)',
                        border: isDefault ? '1px solid rgba(0,101,225,0.2)' : '1px solid transparent',
                      }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                        background: isDefault ? '#0065E1' : 'rgba(0,0,0,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isDefault && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ flex: 1, fontSize: 12, color: isDefault ? '#0065E1' : 'rgba(0,0,0,0.75)', fontWeight: isDefault ? 500 : 400 }}>{t(engine.nameKey as never)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </SettingsGroup>

      {/* ── 风格效果 ── */}
      <SettingsGroup label={t('group_style_effects')}>
        <div style={rowStyle}>
          <span style={labelStyle}>{t('label_display_style')}</span>
          <Select
            value={safeDisplayStyle}
            onChange={(v) => setLayout({ displayStyle: v })}
            options={displayStyleOptions}
            size="small" style={{ width: 130 }} popupClassName="sm-select-popup"
          />
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>{t('label_animation_effect')}</span>
          <Select
            value={layout.animationEffect}
            onChange={(v) => setLayout({ animationEffect: v })}
            options={ANIMATION_EFFECTS.map(e => ({ value: e, label: t(`anim_${e}` as any) }))}
            size="small" style={{ width: 130 }} popupClassName="sm-select-popup"
          />
        </div>

        <Slider
          label={t('label_scale')}
          value={layout.scale}
          min={1} max={5}
          leftLabel={t('scale_small')} rightLabel={t('scale_xlarge')}
          unit=""
          valueLabels={[t('scale_small'), t('scale_normal'), t('scale_medium'), t('scale_large'), t('scale_xlarge')]}
          showTicks
          onChange={(v) => setLayout({ scale: v })}
        />
      </SettingsGroup>

      {/* ── 分类 ── */}
      <SettingsGroup label={t('group_category')}>
        <div style={rowStyle}>
          <span style={labelStyle}>{t('label_category_mode')}</span>
          <Select
            value={layout.categoryMode}
            onChange={(v) => setLayout({ categoryMode: v })}
            options={[
              { value: 'show', label: t('category_mode_show') },
              { value: 'hide', label: t('category_mode_hide') },
            ]}
            size="small" style={{ width: 130 }} popupClassName="sm-select-popup"
          />
        </div>

        {layout.categoryMode === 'show' && (
          <div style={rowStyle}>
            <span style={labelStyle}>{t('label_show_cat_all')}</span>
            <Select
              value={layout.showCatAll !== false ? 'show' : 'hide'}
              onChange={(v) => setLayout({ showCatAll: v === 'show' })}
              options={[
                { value: 'show', label: t('search_show') },
                { value: 'hide', label: t('search_hide') },
              ]}
              size="small" style={{ width: 130 }} popupClassName="sm-select-popup"
            />
          </div>
        )}

        <CategoryManager layout={layout} setLayout={setLayout} t={t} labelStyle={labelStyle} />
      </SettingsGroup>
    </>
  )
}

function CategoryManager({ layout, setLayout, t, labelStyle }: {
  layout: BookmarkLayoutConfig
  setLayout: (patch: Partial<BookmarkLayoutConfig>) => void
  t: ReturnType<typeof useT>
  labelStyle: React.CSSProperties
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNameError, setNewNameError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingError, setEditingError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const categories = layout.categories ?? []

  const inputStyle = (err?: string): React.CSSProperties => ({
    flex: 1, padding: '5px 8px', borderRadius: 6, boxSizing: 'border-box',
    border: err ? '1px solid #ff3b30' : '1px solid rgba(0,0,0,0.12)',
    fontSize: 12, outline: 'none', background: '#fff',
  })

  const addCategory = () => {
    const name = newName.trim()
    if (!name) { setNewNameError(t('error_category_name_required')); return }
    if (categories.some(c => c.name === name)) { setNewNameError(t('error_category_name_duplicate')); return }
    const next = [...categories, { id: `cat_${Date.now()}`, name }]
    setLayout({ categories: next })
    setNewName(''); setNewNameError(''); setShowAddForm(false)
  }

  const saveEdit = () => {
    const name = editingName.trim()
    if (!name) { setEditingError(t('error_category_name_required')); return }
    if (categories.some(c => c.name === name && c.id !== editingId)) { setEditingError(t('error_category_name_duplicate')); return }
    const next = categories.map(c => c.id === editingId ? { ...c, name } : c)
    setLayout({ categories: next })
    setEditingId(null); setEditingName(''); setEditingError('')
  }

  const confirmDelete = () => {
    if (!deletingId) return
    const next = categories.filter(c => c.id !== deletingId)
    setLayout({ categories: next })
    setDeletingId(null)
  }

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
    borderRadius: 4, display: 'flex', alignItems: 'center', color: '#86868b', fontSize: 14,
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={labelStyle}>{t('label_category_manage')}</span>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(0,101,225,0.95)', padding: '2px 4px' }}
          onClick={() => { setShowAddForm(v => !v); setNewName(''); setNewNameError('') }}
        >
          {t('btn_add_category')}
        </button>
      </div>

      {showAddForm && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input
              style={inputStyle(newNameError)}
              placeholder={t('category_name_placeholder')}
              value={newName}
              maxLength={20}
              onChange={e => { setNewName(e.target.value); setNewNameError('') }}
              onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') { setShowAddForm(false); setNewName(''); setNewNameError('') } }}
              autoFocus
            />
            {newNameError && <div style={{ fontSize: 11, color: '#ff3b30', marginTop: 2 }}>{newNameError}</div>}
          </div>
          <button style={{ ...iconBtn, color: 'rgba(0,101,225,0.95)', fontSize: 12, padding: '5px 8px', border: '1px solid rgba(0,101,225,0.3)', borderRadius: 6 }} onClick={addCategory}>
            {t('btn_save')}
          </button>
          <button style={{ ...iconBtn, fontSize: 12, padding: '5px 8px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6 }} onClick={() => { setShowAddForm(false); setNewName(''); setNewNameError('') }}>
            {t('btn_cancel')}
          </button>
        </div>
      )}

      {categories.length === 0 && !showAddForm && (
        <div style={{ fontSize: 12, color: '#86868b', textAlign: 'center', padding: '10px 0' }}>
          {t('category_empty')}
        </div>
      )}

      {categories.map(cat => (
        <div key={cat.id}>
          {deletingId === cat.id ? (
            <div style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: '#333', marginBottom: 8, lineHeight: 1.5 }}>
                {t('confirm_delete_category_msg', { name: cat.name })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button style={{ ...iconBtn, fontSize: 12, padding: '4px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6 }} onClick={() => setDeletingId(null)}>
                  {t('btn_cancel')}
                </button>
                <button style={{ background: '#ff3b30', border: 'none', cursor: 'pointer', fontSize: 12, color: '#fff', padding: '4px 10px', borderRadius: 6 }} onClick={confirmDelete}>
                  {t('btn_delete')}
                </button>
              </div>
            </div>
          ) : editingId === cat.id ? (
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input
                  style={inputStyle(editingError)}
                  value={editingName}
                  maxLength={20}
                  onChange={e => { setEditingName(e.target.value); setEditingError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingId(null); setEditingError('') } }}
                  autoFocus
                />
                {editingError && <div style={{ fontSize: 11, color: '#ff3b30', marginTop: 2 }}>{editingError}</div>}
              </div>
              <button style={{ ...iconBtn, color: 'rgba(0,101,225,0.95)', fontSize: 12, padding: '5px 8px', border: '1px solid rgba(0,101,225,0.3)', borderRadius: 6 }} onClick={saveEdit}>
                {t('btn_save')}
              </button>
              <button style={{ ...iconBtn, fontSize: 12, padding: '5px 8px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6 }} onClick={() => { setEditingId(null); setEditingError('') }}>
                {t('btn_cancel')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: 2 }}>
              <span style={{ fontSize: 13, color: '#333' }}>{cat.name}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button style={iconBtn} title={t('preset_menu_edit')} onClick={() => { setEditingId(cat.id); setEditingName(cat.name); setEditingError(''); setDeletingId(null) }}>
                  ✎
                </button>
                <button style={{ ...iconBtn, color: '#ff3b30' }} title={t('btn_delete')} onClick={() => { setDeletingId(cat.id); setEditingId(null) }}>
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

type RightPanelId = 'gradient-editor' | 'new-solid-preset' | 'all-solid-presets' | 'all-grad-presets' | 'image-preview' | 'image-library' | 'delete-confirm' | null

export default function SettingsModal({ active, open, onClose, initialTab, sessionKey, onBookmarkTabSelect, zIndex = 300 }: Props) {
  const { config, setConfig } = useDockConfig()
  const dragControls = useDragControls()
  const t = useT()

  const [activeTab, setActiveTab] = useState('dock')
  const lastInitialTabRef = useRef<string | undefined>(undefined)

  // 每次新 session（退出后重新打开）清除记忆，让下次 open 重置到初始 tab
  useEffect(() => {
    lastInitialTabRef.current = undefined
  }, [sessionKey])

  // ── 右侧面板状态 ──────────────────────────────────────
  const [rightPanel, setRightPanel] = useState<RightPanelId>(null)

  // 新建纯色预设面板状态
  const [newSolidColor, setNewSolidColor] = useState('#007AFF')
  const [newSolidHexInput, setNewSolidHexInput] = useState('#007AFF')

  const openNewSolidPreset = () => {
    const cur = config.background.color || '#007AFF'
    setNewSolidColor(cur)
    setNewSolidHexInput(cur)
    setRightPanel('new-solid-preset')
  }

  const saveNewSolidPreset = () => {
    const list = config.background.customSolids || []
    if (!list.includes(newSolidColor)) {
      setConfig({ ...config, background: { ...config.background, customSolids: [...list, newSolidColor] } })
    }
    setConfig({ ...config, background: { ...config.background, color: newSolidColor, customSolids: [...list.filter(c => c !== newSolidColor), newSolidColor] } })
    setRightPanel(null)
  }

  // 渐变编辑器面板状态（从 GradientPicker 提升）
  const [gradEditingIndex, setGradEditingIndex] = useState<number | null>(null)
  const [gradAngle, setGradAngle] = useState(135)
  const [gradStops, setGradStops] = useState<GradStop[]>([
    { color: '#667eea', pos: 0 },
    { color: '#764ba2', pos: 100 },
  ])
  const [gradCssInput, setGradCssInput] = useState('')
  const [gradCssError, setGradCssError] = useState('')
  const [showGradCssImport, setShowGradCssImport] = useState(false)

  // 图片预览面板状态（从 ImagePicker 提升）
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

  // 删除数据源确认面板状态（从 ImagePicker 提升）
  const [confirmDelete, setConfirmDelete] = useState<{ sourceId: string; sourceName: string } | null>(null)

  // 全量预设面板批量模式
  const [allPresetsBatchMode, setAllPresetsBatchMode] = useState(false)
  const [allPresetsSelection, setAllPresetsSelection] = useState<Set<number>>(new Set())
  const [allPresetsDragBox, setAllPresetsDragBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const allPresetsGridInnerRef = useRef<HTMLDivElement>(null)
  const allPresetsSwatchRefs = useRef<(HTMLDivElement | null)[]>([])
  const allPresetsLastClickedIdx = useRef<number | null>(null)
  const allPresetsDragOriginRef = useRef<{ cx: number; cy: number; swatchIdx: number; isShift: boolean } | null>(null)

  const openAllPresets = (panel: 'all-solid-presets' | 'all-grad-presets') => {
    setAllPresetsBatchMode(false)
    setAllPresetsSelection(new Set())
    setAllPresetsDragBox(null)
    allPresetsLastClickedIdx.current = null
    allPresetsSwatchRefs.current = []
    setRightPanel(panel)
  }

  const handleAllPresetsMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!allPresetsBatchMode || e.button !== 0) return
    e.preventDefault()
    const target = e.target as HTMLElement
    const swatchIdx = allPresetsSwatchRefs.current.findIndex(el => el === target || (el?.contains(target) ?? false))
    const isShift = e.shiftKey
    allPresetsDragOriginRef.current = { cx: e.clientX, cy: e.clientY, swatchIdx, isShift }
    let hasDragged = false

    const onMove = (me: MouseEvent) => {
      if (!allPresetsDragOriginRef.current || !allPresetsGridInnerRef.current) return
      const dx = me.clientX - allPresetsDragOriginRef.current.cx
      const dy = me.clientY - allPresetsDragOriginRef.current.cy
      if (!hasDragged && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      hasDragged = true
      const gb = allPresetsGridInnerRef.current.getBoundingClientRect()
      const ox = allPresetsDragOriginRef.current.cx - gb.left
      const oy = allPresetsDragOriginRef.current.cy - gb.top
      const cx = me.clientX - gb.left
      const cy = me.clientY - gb.top
      const box = { x: Math.min(ox, cx), y: Math.min(oy, cy), w: Math.abs(cx - ox), h: Math.abs(cy - oy) }
      setAllPresetsDragBox(box)
      const next = new Set<number>()
      allPresetsSwatchRefs.current.forEach((el, idx) => {
        if (!el) return
        const b = el.getBoundingClientRect()
        const il = b.left - gb.left, it = b.top - gb.top
        if (box.x < il + b.width && box.x + box.w > il && box.y < it + b.height && box.y + box.h > it) next.add(idx)
      })
      setAllPresetsSelection(next)
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const origin = allPresetsDragOriginRef.current
      allPresetsDragOriginRef.current = null
      setAllPresetsDragBox(null)
      if (!hasDragged && origin && origin.swatchIdx >= 0) {
        if (origin.isShift && allPresetsLastClickedIdx.current !== null) {
          const from = Math.min(allPresetsLastClickedIdx.current, origin.swatchIdx)
          const to = Math.max(allPresetsLastClickedIdx.current, origin.swatchIdx)
          setAllPresetsSelection(prev => {
            const next = new Set(prev)
            for (let j = from; j <= to; j++) next.add(j)
            return next
          })
        } else {
          setAllPresetsSelection(prev => {
            const next = new Set(prev)
            next.has(origin.swatchIdx) ? next.delete(origin.swatchIdx) : next.add(origin.swatchIdx)
            return next
          })
          allPresetsLastClickedIdx.current = origin.swatchIdx
        }
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    if (open) {
      const tab = initialTab ?? 'dock'
      if (tab !== lastInitialTabRef.current) {
        lastInitialTabRef.current = tab
        setActiveTab(tab)
        setRightPanel(null)
        if (tab === 'bookmark') onBookmarkTabSelect?.()
      }
    }
  }, [open, initialTab])

  // ── 渐变编辑器辅助函数 ──────────────────────────────
  const openGradientEditor = (index: number) => {
    const customList = config.background.customGradients || []
    if (index < customList.length) {
      const parsed = parseCssGradientToStops(customList[index])
      if (parsed.ok) {
        setGradStops(parsed.stops)
        setGradAngle(parsed.angle)
      } else {
        setGradStops([{ color: '#667eea', pos: 0 }, { color: '#764ba2', pos: 100 }])
        setGradAngle(135)
      }
    } else {
      setGradStops([{ color: '#667eea', pos: 0 }, { color: '#764ba2', pos: 100 }])
      setGradAngle(135)
    }
    setGradCssInput('')
    setGradCssError('')
    setShowGradCssImport(false)
    setGradEditingIndex(index)
    setRightPanel('gradient-editor')
  }

  const saveGradient = () => {
    const gradient = stopsToGradient(gradStops, gradAngle)
    const customList = [...(config.background.customGradients || [])]
    if (gradEditingIndex !== null && gradEditingIndex < customList.length) {
      customList[gradEditingIndex] = gradient
    } else {
      customList.push(gradient)
    }
    setConfig({ ...config, background: { ...config.background, customGradients: customList, gradient } })
    setRightPanel(null)
  }

  const applyGrad = (stops = gradStops, angle = gradAngle) => {
    setConfig({ ...config, background: { ...config.background, gradient: stopsToGradient(stops, angle) } })
  }

  const updateGradStop = (idx: number, field: 'color' | 'pos', val: string | number) => {
    const next = gradStops.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    setGradStops(next)
    applyGrad(next, gradAngle)
  }

  const addGradStop = () => {
    const n = gradStops.length
    const last = gradStops[n - 1], prev = gradStops[n - 2]
    const pos = Math.round((prev.pos + last.pos) / 2)
    const color = blendHex(prev.color, last.color)
    const next = [...gradStops.slice(0, n - 1), { color, pos }, last]
    setGradStops(next)
    applyGrad(next, gradAngle)
  }

  const removeGradStop = (idx: number) => {
    if (gradStops.length <= 2) return
    const next = gradStops.filter((_, i) => i !== idx)
    setGradStops(next)
    applyGrad(next, gradAngle)
  }

  // ── 图片预览辅助函数 ────────────────────────────────
  const openPreview = (url: string) => {
    setPreviewUrl(url)
    setImageLoading(true)
    setImageError(false)
    setRightPanel('image-preview')
  }

  const addToCustomImages = (url: string) => {
    const current = config.background.customImages || []
    if (!current.includes(url)) {
      setConfig({ background: { ...config.background, customImages: [...current, url] } })
    }
  }

  // ── 删除数据源辅助函数 ──────────────────────────────
  const handleDeleteSource = (sourceId: string) => {
    setConfig({ background: { ...config.background, imageSources: (config.background.imageSources || []).filter(s => s.id !== sourceId) } })
  }

  if (!active) return null

  return (
    <>

      {/* 设置弹窗 */}
      <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onContextMenu={e => { e.stopPropagation(); e.preventDefault() }}
            style={{
              pointerEvents: open ? 'auto' : 'none',
              position: 'fixed',
              top: `max(8px, calc(50% - ${INIT_H / 2}px))`,
              left: `max(8px, calc(50% - ${INIT_W / 2}px))`,
              width: `min(${INIT_W}px, calc(100vw - 16px))`,
              height: `min(${INIT_H}px, calc(100vh - 16px))`,
              background: '#f5f5f7',
              borderRadius: 22,
              boxShadow: '0 22px 70px rgba(0,0,0,0.45)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex,
            }}
          >

          {/* Body - 左右布局 */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            style={{ display: 'flex', flex: 1, overflow: 'hidden', cursor: 'grab', userSelect: 'none', gap: 12, padding: '10px' }}
          >
            {/* Left Sidebar - 玻璃圆角卡片 */}
            <div style={{
              width: 200,
              background: 'linear-gradient(135deg, rgba(245,250,255,0.55) 0%, rgba(240,245,255,0.35) 100%)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              borderRadius: 16,
              padding: '10px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}>
              {/* 红色关闭按钮 - 左上角 */}
              <div style={{ paddingLeft: 2, marginBottom: 8 }}>
                <TrafficLights onClose={onClose} />
              </div>

              {/* Tabs */}
              {SIDEBAR_ITEMS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id)
                    setRightPanel(null)
                    if (item.id === 'bookmark') onBookmarkTabSelect?.()
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8,
                    background: activeTab === item.id ? 'rgba(0, 101, 225, 0.95)' : 'transparent',
                    cursor: 'pointer',
                    boxShadow: activeTab === item.id ? '0 2px 8px rgba(0, 101, 225, 0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                  <TabIcon id={item.id} size={20} active={activeTab === item.id} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: activeTab === item.id ? '#fff' : 'rgba(0,0,0,0.6)' }}>
                    {t(`tab_${item.id}` as any)}
                  </span>
                </div>
              ))}
            </div>

            {/* Right Content */}
            <div
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                {rightPanel ? (
                  <motion.div
                    key={rightPanel}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: 10 }}
                  >
                    {/* 面板标题栏 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 16, flexShrink: 0 }}>
                      <div
                        onClick={() => setRightPanel(null)}
                        style={{
                          width: 48, height: 28, borderRadius: 14, flexShrink: 0,
                          background: 'white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M9 2L4 7L9 12" stroke="rgba(0,0,0,0.55)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
                        {rightPanel === 'gradient-editor' && t('custom_gradient_title')}
                        {rightPanel === 'new-solid-preset' && t('label_custom_colors')}
                        {rightPanel === 'all-solid-presets' && t('label_custom_colors')}
                        {rightPanel === 'all-grad-presets' && t('label_custom_gradients')}
                        {rightPanel === 'image-preview' && t('preview_title')}
                        {rightPanel === 'image-library' && t('modal_select_image')}
                        {rightPanel === 'delete-confirm' && t('confirm_delete_title')}
                      </span>
                      {/* 批量管理按钮（仅全量预设面板显示） */}
                      {(rightPanel === 'all-solid-presets' || rightPanel === 'all-grad-presets') && (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                          {allPresetsBatchMode && (
                            <div
                              onClick={() => { setAllPresetsBatchMode(false); setAllPresetsSelection(new Set()) }}
                              style={{ fontSize: 12, color: '#86868b', cursor: 'pointer', padding: '3px 8px' }}
                            >{t('btn_cancel')}</div>
                          )}
                          <div
                            onClick={() => {
                              if (allPresetsBatchMode && allPresetsSelection.size > 0) {
                                // 执行批量删除
                                if (rightPanel === 'all-solid-presets') {
                                  const next = (config.background.customSolids || []).filter((_, i) => !allPresetsSelection.has(i))
                                  setConfig({ ...config, background: { ...config.background, customSolids: next } })
                                } else {
                                  const next = (config.background.customGradients || []).filter((_, i) => !allPresetsSelection.has(i))
                                  setConfig({ ...config, background: { ...config.background, customGradients: next } })
                                }
                                setAllPresetsBatchMode(false)
                                setAllPresetsSelection(new Set())
                              } else {
                                setAllPresetsBatchMode(b => !b)
                                setAllPresetsSelection(new Set())
                              }
                            }}
                            style={{
                              fontSize: 12, cursor: 'pointer', padding: '3px 10px', borderRadius: 6,
                              background: allPresetsBatchMode && allPresetsSelection.size > 0 ? '#FF3B30' : 'rgba(0,0,0,0.06)',
                              color: allPresetsBatchMode && allPresetsSelection.size > 0 ? '#fff' : allPresetsBatchMode ? '#007AFF' : 'rgba(0,0,0,0.6)',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                          >
                            {allPresetsBatchMode && allPresetsSelection.size > 0
                              ? t('btn_batch_delete', { count: allPresetsSelection.size })
                              : t('btn_batch_manage')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 面板内容 */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>

                      {/* 全部纯色预设面板 */}
                      {rightPanel === 'all-solid-presets' && (() => {
                        const solids = config.background.customSolids || []
                        return (
                          <div ref={allPresetsGridInnerRef} onMouseDown={handleAllPresetsMouseDown}
                            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px 2px', position: 'relative' }}>
                            {solids.map((color, i) => {
                              const isSelected = allPresetsSelection.has(i)
                              return (
                                <div
                                  key={i}
                                  ref={el => { allPresetsSwatchRefs.current[i] = el }}
                                  onClick={allPresetsBatchMode ? undefined : () => {
                                    setConfig({ ...config, background: { ...config.background, color } })
                                    setRightPanel(null)
                                  }}
                                  style={{
                                    width: 28, height: 28, borderRadius: 6,
                                    cursor: allPresetsBatchMode ? 'crosshair' : 'pointer',
                                    background: color,
                                    outline: isSelected ? '2.5px solid #007AFF' : config.background.color === color && !allPresetsBatchMode ? '2.5px solid #007AFF' : '2px solid transparent',
                                    outlineOffset: 2,
                                    boxShadow: isSelected ? '0 0 0 3px rgba(0,122,255,0.2)' : '0 1px 4px rgba(0,0,0,0.12)',
                                    transition: 'outline 0.1s, box-shadow 0.1s',
                                  }}
                                />
                              )
                            })}
                            {allPresetsDragBox && allPresetsDragBox.w > 4 && allPresetsDragBox.h > 4 && (
                              <div style={{
                                position: 'absolute',
                                left: allPresetsDragBox.x, top: allPresetsDragBox.y,
                                width: allPresetsDragBox.w, height: allPresetsDragBox.h,
                                background: 'rgba(0,122,255,0.1)', border: '1px solid rgba(0,122,255,0.4)',
                                borderRadius: 3, pointerEvents: 'none',
                              }} />
                            )}
                          </div>
                        )
                      })()}

                      {/* 全部渐变预设面板 */}
                      {rightPanel === 'all-grad-presets' && (() => {
                        const grads = config.background.customGradients || []
                        return (
                          <div ref={allPresetsGridInnerRef} onMouseDown={handleAllPresetsMouseDown}
                            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px 2px', position: 'relative' }}>
                            {grads.map((gradient, i) => {
                              const isSelected = allPresetsSelection.has(i)
                              return (
                                <div
                                  key={i}
                                  ref={el => { allPresetsSwatchRefs.current[i] = el }}
                                  onClick={allPresetsBatchMode ? undefined : () => {
                                    setConfig({ ...config, background: { ...config.background, gradient } })
                                    setRightPanel(null)
                                  }}
                                  onDoubleClick={() => !allPresetsBatchMode && openGradientEditor(i)}
                                  style={{
                                    width: 36, height: 28, borderRadius: 6,
                                    cursor: allPresetsBatchMode ? 'crosshair' : 'pointer',
                                    background: gradient,
                                    outline: isSelected ? '2.5px solid #007AFF' : config.background.gradient === gradient && !allPresetsBatchMode ? '2.5px solid #007AFF' : '2px solid transparent',
                                    outlineOffset: 2,
                                    boxShadow: isSelected ? '0 0 0 3px rgba(0,122,255,0.2)' : '0 1px 4px rgba(0,0,0,0.12)',
                                    transition: 'outline 0.1s, box-shadow 0.1s',
                                  }}
                                />
                              )
                            })}
                            {allPresetsDragBox && allPresetsDragBox.w > 4 && allPresetsDragBox.h > 4 && (
                              <div style={{
                                position: 'absolute',
                                left: allPresetsDragBox.x, top: allPresetsDragBox.y,
                                width: allPresetsDragBox.w, height: allPresetsDragBox.h,
                                background: 'rgba(0,122,255,0.1)', border: '1px solid rgba(0,122,255,0.4)',
                                borderRadius: 3, pointerEvents: 'none',
                              }} />
                            )}
                          </div>
                        )
                      })()}

                      {/* 新建纯色预设面板 */}
                      {rightPanel === 'new-solid-preset' && (() => {
                        const presetColors = [
                          '#FFFFFF', '#000000', '#FF3B30', '#FF6B35', '#FF9500',
                          '#FFCC00', '#34C759', '#00C7BE', '#32ADE6', '#007AFF',
                          '#5856D6', '#AF52DE', '#FF2D55', '#A2845E', '#2C2C2E',
                          '#636366', '#8E8E93', '#4A90D9', '#667eea', '#764ba2',
                          '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b',
                          '#38f9d7', '#fa709a', '#fee140', '#30cfd0', '#1DB954',
                        ]
                        return (
                          <div>
                            {/* 取色器行 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                              <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                                <div style={{
                                  width: 44, height: 44, borderRadius: 10,
                                  background: newSolidColor,
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.08)',
                                }} />
                                <input type="color" value={newSolidColor}
                                  onChange={e => { setNewSolidColor(e.target.value); setNewSolidHexInput(e.target.value) }}
                                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0, cursor: 'pointer' }} />
                              </label>
                              <input
                                value={newSolidHexInput}
                                maxLength={7}
                                onChange={e => {
                                  const v = e.target.value
                                  setNewSolidHexInput(v)
                                  if (/^#[0-9A-Fa-f]{6}$/.test(v)) setNewSolidColor(v)
                                }}
                                onBlur={() => setNewSolidHexInput(newSolidColor)}
                                style={{
                                  flex: 1, padding: '8px 10px', borderRadius: 8,
                                  border: '1px solid rgba(0,0,0,0.1)', fontSize: 13,
                                  background: 'rgba(255,255,255,0.8)', outline: 'none',
                                  fontFamily: 'monospace',
                                }}
                              />
                            </div>
                            {/* 预设颜色 */}
                            <div style={{ marginBottom: 16 }}>
                              <span style={{ fontSize: 12, color: '#86868b', display: 'block', marginBottom: 8 }}>{t('label_preset_colors')}</span>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {presetColors.map((color, i) => (
                                  <div key={i} onClick={() => { setNewSolidColor(color); setNewSolidHexInput(color) }}
                                    style={{
                                      width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                                      background: color,
                                      border: newSolidColor === color ? '2px solid #007AFF' : '1px solid rgba(0,0,0,0.1)',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                            {/* 保存按钮 */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                              <button onClick={() => setRightPanel(null)} style={{
                                padding: '5px 14px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)',
                                background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'rgba(0,0,0,0.6)',
                              }}>{t('btn_cancel')}</button>
                              <button onClick={saveNewSolidPreset} style={{
                                padding: '5px 14px', borderRadius: 7, border: 'none',
                                background: '#007AFF', cursor: 'pointer', fontSize: 12, color: '#fff',
                              }}>{t('btn_save')}</button>
                            </div>
                          </div>
                        )
                      })()}

                      {/* 渐变编辑器面板 */}
                      {rightPanel === 'gradient-editor' && (
                        <div>
                          {/* 标题行：CSS 导入按钮 */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, color: '#86868b' }}>{t('bm_label_custom_gradient')}</span>
                            <div
                              onClick={() => { setShowGradCssImport(v => !v); setGradCssError('') }}
                              style={{
                                fontSize: 11, color: showGradCssImport ? '#fff' : '#007AFF',
                                cursor: 'pointer', userSelect: 'none',
                                padding: '2px 8px', borderRadius: 5,
                                background: showGradCssImport ? '#007AFF' : 'rgba(0,122,255,0.08)',
                              }}
                            >{t('css_import_btn_label')}</div>
                          </div>

                          {/* CSS 导入面板 */}
                          {showGradCssImport && (
                            <div style={{
                              marginBottom: 12, padding: 10, borderRadius: 8,
                              background: 'rgba(0,122,255,0.04)', border: '1px solid rgba(0,122,255,0.15)',
                            }}>
                              <textarea
                                value={gradCssInput}
                                onChange={e => { setGradCssInput(e.target.value); setGradCssError('') }}
                                placeholder={t('css_import_placeholder')}
                                rows={4}
                                style={{
                                  width: '100%', padding: '6px 8px', borderRadius: 6, boxSizing: 'border-box',
                                  border: `1px solid ${gradCssError ? '#FF3B30' : 'rgba(0,0,0,0.1)'}`,
                                  fontSize: 11, fontFamily: 'monospace', resize: 'none',
                                  background: 'rgba(255,255,255,0.7)', outline: 'none', color: 'rgba(0,0,0,0.8)',
                                  marginBottom: 6,
                                }}
                              />
                              {gradCssError && (
                                <div style={{ fontSize: 11, color: '#FF3B30', marginBottom: 6, lineHeight: 1.4 }}>{gradCssError}</div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <div
                                  onClick={() => {
                                    const result = parseCssGradientToStops(gradCssInput)
                                    if (result.ok) {
                                      setGradStops(result.stops); setGradAngle(result.angle)
                                      applyGrad(result.stops, result.angle)
                                      setShowGradCssImport(false); setGradCssInput(''); setGradCssError('')
                                    } else {
                                      setGradCssError(result.reason)
                                    }
                                  }}
                                  style={{
                                    padding: '4px 12px', borderRadius: 6, fontSize: 12,
                                    background: '#007AFF', color: '#fff', cursor: 'pointer', userSelect: 'none',
                                  }}
                                >{t('css_import_apply')}</div>
                              </div>
                            </div>
                          )}

                          {/* 渐变预览条 */}
                          <div style={{
                            height: 28, borderRadius: 8,
                            background: stopsToGradient(gradStops, gradAngle),
                            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                            marginBottom: 12,
                          }} />

                          {/* 色标列表 */}
                          {gradStops.map((stop, idx) => {
                            const pct = stop.pos
                            return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: 7, background: stop.color, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                  <input type="color" value={stop.color}
                                    onChange={e => updateGradStop(idx, 'color', e.target.value)}
                                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0 }} />
                                </label>
                                {/* Settings-style custom slider */}
                                <div style={{ flex: 1, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
                                  <div style={{ position: 'absolute', width: '100%', height: 4, background: '#d1d1d6', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: '#007AFF', borderRadius: 2 }} />
                                  </div>
                                  <input type="range" min={0} max={100} value={pct}
                                    onChange={e => updateGradStop(idx, 'pos', Number(e.target.value))}
                                    style={{ position: 'absolute', width: '100%', opacity: 0, cursor: 'pointer', height: 20, margin: 0 }} />
                                  <div style={{
                                    position: 'absolute', left: `clamp(0px, calc(${pct}% - 10px), calc(100% - 20px))`,
                                    width: 20, height: 20, background: '#fff', borderRadius: '50%',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(0,0,0,0.08)',
                                    pointerEvents: 'none', transition: 'left 0.05s',
                                  }} />
                                </div>
                                <span style={{ fontSize: 11, color: '#86868b', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                                {gradStops.length > 2 && (
                                  <button onClick={() => removeGradStop(idx)} style={{
                                    width: 20, height: 20, borderRadius: 10, border: 'none',
                                    background: 'rgba(0,0,0,0.08)', cursor: 'pointer', fontSize: 14,
                                    color: '#86868b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                  }}>×</button>
                                )}
                              </div>
                            )
                          })}

                          {/* 添加色标 */}
                          <button onClick={addGradStop} style={{
                            width: '100%', padding: '4px 0', borderRadius: 6,
                            border: '1px dashed rgba(0,0,0,0.15)', background: 'transparent',
                            cursor: 'pointer', fontSize: 12, color: '#007AFF', marginBottom: 8,
                          }}>{t('gradient_add_stop')}</button>

                          {/* 角度 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 12, color: '#86868b', flexShrink: 0 }}>{t('gradient_angle_label')}</span>
                            <div style={{ flex: 1, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
                              <div style={{ position: 'absolute', width: '100%', height: 4, background: '#d1d1d6', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${(gradAngle / 360) * 100}%`, height: '100%', background: '#007AFF', borderRadius: 2 }} />
                              </div>
                              <input type="range" min={0} max={360} value={gradAngle}
                                onChange={e => { const a = Number(e.target.value); setGradAngle(a); applyGrad(gradStops, a) }}
                                style={{ position: 'absolute', width: '100%', opacity: 0, cursor: 'pointer', height: 20, margin: 0 }} />
                              <div style={{
                                position: 'absolute', left: `clamp(0px, calc(${(gradAngle / 360) * 100}% - 10px), calc(100% - 20px))`,
                                width: 20, height: 20, background: '#fff', borderRadius: '50%',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(0,0,0,0.08)',
                                pointerEvents: 'none', transition: 'left 0.05s',
                              }} />
                            </div>
                            <span style={{ fontSize: 11, color: '#86868b', minWidth: 32, textAlign: 'right', flexShrink: 0 }}>{gradAngle}°</span>
                          </div>

                          {/* 保存按钮 */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12 }}>
                            <button onClick={() => setRightPanel(null)} style={{
                              padding: '5px 14px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)',
                              background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'rgba(0,0,0,0.6)',
                            }}>{t('btn_cancel')}</button>
                            <button onClick={saveGradient} style={{
                              padding: '5px 14px', borderRadius: 7, border: 'none',
                              background: '#007AFF', cursor: 'pointer', fontSize: 12, color: '#fff',
                            }}>{t('btn_save')}</button>
                          </div>
                        </div>
                      )}

                      {/* 图片预览面板 */}
                      {rightPanel === 'image-preview' && (
                        <div>
                          {/* 图片容器 */}
                          <div style={{
                            width: '100%', aspectRatio: '3/2', borderRadius: 8, marginBottom: 16,
                            background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative', overflow: 'hidden',
                          }}>
                            {imageLoading && (
                              <div style={{ color: '#86868b', fontSize: 14 }}>{t('img_loading')}</div>
                            )}
                            {imageError && !imageLoading && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                  width: 80, height: 80, borderRadius: '50%',
                                  background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 40, color: '#d1d1d6',
                                }}>🖼️</div>
                                <div style={{ color: '#86868b', fontSize: 13, textAlign: 'center' }}>
                                  {t('img_load_error')}
                                  <div style={{ fontSize: 11, marginTop: 4, color: '#b0b0b0' }}>{t('img_load_error_hint')}</div>
                                </div>
                              </div>
                            )}
                            {!imageError && (
                              <img
                                src={previewUrl}
                                alt="Preview"
                                onLoad={() => { setImageLoading(false); setImageError(false) }}
                                onError={() => { setImageLoading(false); setImageError(true) }}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', display: imageLoading ? 'none' : 'block' }}
                              />
                            )}
                          </div>

                          {/* 按钮组 */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <div
                              onClick={() => {
                                if (!imageError) {
                                  addToCustomImages(previewUrl)
                                  setRightPanel(null)
                                  setPreviewUrl('')
                                  setImageError(false)
                                  setImageLoading(false)
                                }
                              }}
                              style={{
                                flex: 1, padding: '8px 16px', borderRadius: 6,
                                background: imageError ? 'rgba(0,0,0,0.05)' : 'rgba(0,122,255,0.1)',
                                color: imageError ? '#999' : '#007AFF',
                                fontSize: 13, fontWeight: 500, textAlign: 'center',
                                cursor: imageError ? 'not-allowed' : 'pointer', userSelect: 'none', opacity: imageError ? 0.5 : 1,
                              }}
                            >{t('btn_add_to_presets')}</div>
                            <div
                              onClick={() => {
                                if (!imageError) {
                                  setConfig({ background: { ...config.background, imageUrl: previewUrl } })
                                  setRightPanel(null)
                                  setPreviewUrl('')
                                  setImageError(false)
                                  setImageLoading(false)
                                }
                              }}
                              style={{
                                flex: 1, padding: '8px 16px', borderRadius: 6,
                                background: imageError ? 'rgba(0,0,0,0.05)' : '#007AFF',
                                color: imageError ? '#999' : '#fff',
                                fontSize: 13, fontWeight: 500, textAlign: 'center',
                                cursor: imageError ? 'not-allowed' : 'pointer', userSelect: 'none', opacity: imageError ? 0.5 : 1,
                              }}
                            >{t('btn_set_as_bg')}</div>
                          </div>
                        </div>
                      )}

                      {/* 图片库面板 */}
                      {rightPanel === 'image-library' && (
                        <ImageLibraryPanelContent
                          value={config.background.imageUrl || ''}
                          onChange={(v) => setConfig({ background: { ...config.background, imageUrl: v } })}
                          imageSources={config.background.imageSources || []}
                          onImageSourcesChange={(v) => setConfig({ background: { ...config.background, imageSources: v } })}
                          customImages={config.background.customImages || []}
                          onCustomImagesChange={(v) => setConfig({ background: { ...config.background, customImages: v } })}
                          customImagesGroupName={config.background.customImagesGroupName}
                          onCustomImagesGroupNameChange={(v) => setConfig({ background: { ...config.background, customImagesGroupName: v } })}
                          onOpenConfirmDelete={(sourceId, sourceName) => {
                            setConfirmDelete({ sourceId, sourceName })
                            setRightPanel('delete-confirm')
                          }}
                        />
                      )}

                      {/* 删除确认面板 */}
                      {rightPanel === 'delete-confirm' && confirmDelete && (
                        <div>
                          <div style={{ fontSize: 13, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>
                            {t('confirm_delete_msg', { name: confirmDelete.sourceName })}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <div
                              onClick={() => { setRightPanel('image-library') }}
                              style={{
                                flex: 1, padding: '8px 16px', borderRadius: 7, fontSize: 13,
                                background: 'rgba(0,0,0,0.06)', color: '#333',
                                cursor: 'pointer', userSelect: 'none', textAlign: 'center',
                              }}
                            >{t('btn_cancel')}</div>
                            <div
                              onClick={() => { handleDeleteSource(confirmDelete.sourceId); setConfirmDelete(null); setRightPanel('image-library') }}
                              style={{
                                flex: 1, padding: '8px 16px', borderRadius: 7, fontSize: 13,
                                background: '#ff3b30', color: '#fff',
                                cursor: 'pointer', userSelect: 'none', fontWeight: 500, textAlign: 'center',
                              }}
                            >{t('btn_delete')}</div>
                          </div>
                        </div>
                      )}

                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="main-content"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                    style={{ flex: 1, overflowY: 'auto', paddingRight: 10, cursor: 'auto', scrollbarGutter: 'stable' }}
                  >
                    {activeTab === 'dock' && (
                      <>
                        <SettingsGroup label={t('group_appearance')}>
                          <PositionPicker value={config.position} onChange={(v) => setConfig({ position: v })} />
                          <Slider label={t('label_size')} value={config.baseSize} min={32} max={80} leftLabel={t('size_small')} rightLabel={t('size_large')} onChange={(v) => setConfig({ baseSize: v })} />
                        </SettingsGroup>

                        <SettingsGroup label={t('group_magnification')}>
                          <Toggle label={t('label_magnify')} checked={config.magnification} onChange={(v) => setConfig({ magnification: v })} />
                          <Slider label={t('label_magnify_amount')} value={config.maxSize} min={64} max={128} leftLabel={t('size_small')} rightLabel={t('size_large')} disabled={!config.magnification} onChange={(v) => setConfig({ maxSize: v })} />
                          <Slider label={t('label_effect_radius')} value={config.effectRadius} min={80} max={240} leftLabel={t('radius_narrow')} rightLabel={t('radius_wide')} disabled={!config.magnification} onChange={(v) => setConfig({ effectRadius: v })} />
                        </SettingsGroup>
                      </>
                    )}

                    {activeTab === 'appearance' && (
                      <>
                        <SettingsGroup label={t('group_home')}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.75)', fontWeight: 400 }}>{t('label_home_view')}</span>
                            <Select
                              value={(config.bookmarkLayout ?? DEFAULT_BOOKMARK_LAYOUT).defaultView ?? 'desktop'}
                              onChange={(v) => setConfig({ bookmarkLayout: { ...(config.bookmarkLayout ?? DEFAULT_BOOKMARK_LAYOUT), defaultView: v } })}
                              options={[
                                { value: 'desktop',  label: t('home_view_desktop') },
                                { value: 'launchpad', label: t('home_view_list') },
                              ]}
                              size="small"
                              style={{ width: 110 }}
                              popupClassName="sm-select-popup"
                              getPopupContainer={() => document.body}
                            />
                          </div>
                        </SettingsGroup>

                        <SettingsGroup label={t('group_bg_type')}>
                          <BackgroundTypePicker
                            value={config.background.type}
                            onChange={(v) => setConfig({ background: { ...config.background, type: v } })}
                          />
                        </SettingsGroup>

                        {config.background.type === 'color' && (
                          <SettingsGroup label={t('group_color')}>
                            <ColorPicker
                              value={config.background.color || '#667eea'}
                              onChange={(v) => setConfig({ background: { ...config.background, color: v } })}
                              customSolids={config.background.customSolids}
                              onOpenNewPreset={openNewSolidPreset}
                              onOpenAllSolidPresets={() => openAllPresets('all-solid-presets')}
                            />
                          </SettingsGroup>
                        )}

                        {config.background.type === 'gradient' && (
                          <SettingsGroup label={t('group_gradient')}>
                            <GradientPicker
                              value={config.background.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}
                              onChange={(v) => setConfig({ background: { ...config.background, gradient: v } })}
                              customGradients={config.background.customGradients}
                              onOpenGradientEditor={openGradientEditor}
                              onOpenAllGradPresets={() => openAllPresets('all-grad-presets')}
                            />
                          </SettingsGroup>
                        )}

                        {config.background.type === 'image' && (
                          <SettingsGroup label={t('bg_image')}>
                            <ImagePicker
                              value={config.background.imageUrl || ''}
                              onChange={(v) => setConfig({ background: { ...config.background, imageUrl: v } })}
                              imageSources={config.background.imageSources || []}
                              onImageSourcesChange={(v) => setConfig({ background: { ...config.background, imageSources: v } })}
                              customImages={config.background.customImages}
                              onCustomImagesChange={(v) => setConfig({ background: { ...config.background, customImages: v } })}
                              customImagesGroupName={config.background.customImagesGroupName}
                              onOpenImageLibrary={() => setRightPanel('image-library')}
                              onOpenPreview={openPreview}
                            />
                          </SettingsGroup>
                        )}

                        <SettingsGroup label={t('group_effects')}>
                          <Slider
                            label={t('label_blur')}
                            value={config.background.blur}
                            min={0}
                            max={20}
                            leftLabel={t('blur_none')}
                            rightLabel={t('blur_strong')}
                            unit=""
                            onChange={(v) => setConfig({ background: { ...config.background, blur: v } })}
                          />
                          <Slider
                            label={t('label_opacity')}
                            value={config.background.opacity}
                            min={0}
                            max={100}
                            leftLabel={t('opacity_transparent')}
                            rightLabel={t('opacity_opaque')}
                            unit="%"
                            onChange={(v) => setConfig({ background: { ...config.background, opacity: v } })}
                          />
                        </SettingsGroup>

                        <SettingsGroup label={t('group_random')}>
                          <RandomDisplayRow
                            value={(config.background.randomType || 'none') as import('../store/dockConfig').RandomType}
                            onChange={(v) => setConfig({ background: { ...config.background, randomType: v } })}
                          />
                        </SettingsGroup>
                      </>
                    )}

                    {activeTab === 'language' && (
                      <SettingsGroup label={t('group_language')}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.75)', fontWeight: 400 }}>{t('label_language')}</span>
                          <Select
                            value={config.language || 'zh-CN'}
                            onChange={(v) => setConfig({ language: v })}
                            options={LANGUAGES.map(lang => ({ value: lang.code, label: t(lang.labelKey) }))}
                            size="small"
                            style={{ width: 130 }}
                            popupClassName="sm-select-popup"
                            getPopupContainer={() => document.body}
                          />
                        </div>
                      </SettingsGroup>
                    )}

                    {activeTab === 'bookmark' && <BookmarkLayoutTab />}
                    {activeTab === 'shortcuts' && <ShortcutsTab />}
                    {activeTab === 'backup' && <BackupTab />}
                    {activeTab === 'about' && <AboutTab />}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
      </motion.div>
    </>
  )
}

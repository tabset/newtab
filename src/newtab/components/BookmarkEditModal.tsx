import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '../i18n'

const MODAL_W = 780
const MODAL_H = 540
const BG_NONE = '__none__'
const MAX_PRESET_DISPLAY = 11  // 左栏最多显示几个用户预设色块，超出后显示"更多"

// ── 预设颜色 ─────────────────────────────────────────────

const SOLID_COLORS = [
  '#FFFFFF', '#000000', '#FF3B30', '#FF6B35', '#FF9500',
  '#FFCC00', '#34C759', '#00C7BE', '#32ADE6', '#007AFF',
  '#5856D6', '#AF52DE', '#FF2D55', '#A2845E', '#2C2C2E',
  '#636366', '#8E8E93', '#4A90D9', '#1DB954', '#E91E63',
  '#9C27B0', '#795548',
]

const GRADIENT_COLORS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)',
  'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
  'linear-gradient(135deg, #7F7FD5 0%, #86A8E7 50%, #91EAE4 100%)',
  'linear-gradient(135deg, #FC5C7D 0%, #6A3093 100%)',
  'linear-gradient(135deg, #1FA2FF 0%, #12D8FA 50%, #A6FFCB 100%)',
  'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)',
  'linear-gradient(135deg, #373B44 0%, #4286f4 100%)',
  'linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)',
]

const ALL_BG_COLORS = [...SOLID_COLORS, ...GRADIENT_COLORS]

const BUILTIN_ICONS = [
  '🌐', '🔗', '⭐', '📌', '🏠', '💼', '📚', '🎯',
  '🚀', '💡', '🎨', '🎵', '📷', '🎬', '🛒', '📧',
  '💬', '🔔', '📊', '🔧', '📱', '💻', '🖥️', '⌨️',
  '📋', '📁', '📂', '📝', '✏️', '💰', '💳', '📈',
  '🏦', '✈️', '🚗', '🌍', '🗺️', '🍕', '☕', '🎮',
  '🎲', '🏆', '⚽', '🔬', '🤖', '🔐', '🔑', '🛡️',
  '⚙️', '🌱', '🌸', '🌊', '🌙', '☀️', '🌈', '🍀',
  '🦋', '❤️', '🎁', '🎉', '🔩', '🔨', '🧰', '⚡',
  '🔋', '📯', '🎶', '📍', '✅', '🎪', '🏅', '🧪',
  '🌉', '🍔', '🍜', '🍺', '🍎', '🥑', '🍣', '🐾',
  '🌺', '🖱️', '📡', '📻', '📺', '🗂️', '🖊️', '🗒️',
  '💵', '🏷️', '📉', '🎫', '🚢', '🏖️', '🏔️', '🏙️',
]
const BUILTIN_PREVIEW_COUNT = 24

// ── 自定义分类选择器 ──────────────────────────────────────

function CategorySelect({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const handleOpen = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
    })
    setOpen(v => !v)
  }

  const selected = options.find(o => o.value === value)

  return (
    <div ref={triggerRef} style={{ position: 'relative' }}>
      <div
        onClick={handleOpen}
        style={{
          width: '100%', padding: '7px 30px 7px 11px', borderRadius: 7,
          border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.85)',
          fontSize: 13, color: selected ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.35)',
          cursor: 'pointer', boxSizing: 'border-box', userSelect: 'none',
          display: 'flex', alignItems: 'center',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <svg style={{ position: 'absolute', right: 10, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, transition: 'transform 0.15s', flexShrink: 0 }} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4L6 8L10 4" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open && createPortal(
        <div style={{
          ...dropdownStyle,
          background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden', maxHeight: 200, overflowY: 'auto',
        }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false) }}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                color: opt.value === value ? '#fff' : 'rgba(0,0,0,0.85)',
                background: opt.value === value ? 'rgba(0,101,225,0.95)' : '#fff',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,101,225,0.95)'; (e.currentTarget as HTMLDivElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = opt.value === value ? 'rgba(0,101,225,0.95)' : '#fff'; (e.currentTarget as HTMLDivElement).style.color = opt.value === value ? '#fff' : 'rgba(0,0,0,0.85)' }}
            >
              {opt.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── 类型 ─────────────────────────────────────────────────

export type IconType = 'url' | 'svg' | 'builtin' | 'text'

/**
 * 从书签名称自动派生文字图标
 * - 英文多词: 取各词首字母（最多3个）
 * - 英文单词: ≤3字符全取，否则取前3字符
 * - 中文/日文/韩文: 取前2个字符
 * - 其他: 取前2个字符
 */
export function deriveTextIcon(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'

  // 判断是否以CJK字符为主
  const cjkChars = trimmed.split('').filter(c => /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(c))
  if (cjkChars.length > 0 && cjkChars.length / trimmed.replace(/\s/g, '').length >= 0.4) {
    return cjkChars.slice(0, 2).join('')
  }

  // 英文/其他：按空格拆词
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length > 1) {
    // 多词：取各词首字母，最多3个
    return words.slice(0, 3).map(w => w[0]).join('').toUpperCase()
  }

  // 单词：去掉非字母数字字符后决定取几位
  const letters = trimmed.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '')
  if (letters.length <= 3) return letters.toUpperCase()
  return letters.slice(0, 3).toUpperCase()
}

export interface BookmarkFormData {
  name: string
  url: string
  iconType: IconType
  iconValue: string
  svgColor?: string
  svgScale?: number
  iconFit?: 'contain' | 'cover' | 'fill'
  bgColor: string
  categoryId?: string
}

interface BookmarkCategory {
  id: string
  name: string
}

interface Props {
  open: boolean
  onClose: () => void
  initialData?: Partial<BookmarkFormData>
  onSave: (data: BookmarkFormData) => void
  mode?: 'add' | 'edit'
  categories?: BookmarkCategory[]
}

// ── 工具函数 ──────────────────────────────────────────────

const PRESET_SOLID_KEY = 'newtab_preset_solids'
const PRESET_GRAD_KEY  = 'newtab_preset_grads'

function loadPresets(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function savePresets(key: string, list: string[]) {
  localStorage.setItem(key, JSON.stringify(list))
}

/**
 * 从粘贴的 CSS 文本（可多行）中提取最佳可用值。
 * 优先级：标准 gradient > -webkit- > -moz- > 纯色值 > 原始文本
 * 自动忽略 filter: progid:... (IE fallback)
 */
function extractGradient(raw: string): string {
  const lines = raw.split(/[\n;]/).map(l => l.trim()).filter(Boolean)
  let standard = '', webkit = '', moz = '', solidColor = ''

  for (const line of lines) {
    if (/^filter\s*:/i.test(line)) continue  // 跳过 IE filter

    // 提取 background: ... 或 background-image: ... 的值
    const m = line.match(/background(?:-image)?\s*:\s*(.+)$/i)
    const val = (m ? m[1] : line).replace(/;$/, '').trim()
    if (!val) continue

    if (/^(linear|radial|conic)-gradient\s*\(/i.test(val)) {
      if (!standard) standard = val
    } else if (/^-webkit-(linear|radial|conic)-gradient\s*\(/i.test(val)) {
      if (!webkit) webkit = val.replace(/^-webkit-/, '')
    } else if (/^-moz-(linear|radial|conic)-gradient\s*\(/i.test(val)) {
      if (!moz) moz = val.replace(/^-moz-/, '')
    } else if (/^(hsla?|rgba?)\s*\(/i.test(val) || /^#[0-9A-Fa-f]{3,8}$/.test(val)) {
      if (!solidColor) solidColor = val
    }
  }

  return standard || webkit || moz || solidColor || raw.trim()
}

function isCssGradient(s: string): boolean {
  return /^(linear|radial|conic)-gradient\s*\(/i.test(s.trim())
}


// ── CSS 渐变解析 ───────────────────────────────────────────

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

function splitGradientArgs(s: string): string[] {
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

export type GradStop = { color: string; pos: number }

type GradientParseError =
  | { key: 'err_radial_conic' | 'err_no_gradient' | 'err_not_enough_stops' | 'err_not_enough_stops2' }
  | { key: 'err_invalid_color'; color: string }

type GradientParseResult =
  | { ok: true; angle: number; stops: GradStop[] }
  | { ok: false; error: GradientParseError }

/** 从单个色标字符串（如 "hsla(217,100%,50%,1) 0%"）分离颜色和位置 */
function parseStopPart(part: string): { color: string; pos: number | null } {
  const s = part.trim()
  // 从右向左扫描，找到括号外的最后一个空格
  let depth = 0
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i]
    if (ch === ')') depth++
    else if (ch === '(') depth--
    else if (ch === ' ' && depth === 0) {
      const trailing = s.slice(i + 1).trim()
      if (/^[\d.]+%?$/.test(trailing))
        return { color: s.slice(0, i).trim(), pos: parseFloat(trailing) }
      break
    }
  }
  return { color: s, pos: null }
}

function blendHex(hex1: string, hex2: string): string {
  const p = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]
  const [r1,g1,b1] = p(hex1), [r2,g2,b2] = p(hex2)
  return '#' + [Math.round((r1+r2)/2),Math.round((g1+g2)/2),Math.round((b1+b2)/2)].map(v=>v.toString(16).padStart(2,'0')).join('')
}

function parseCssGradient(raw: string): GradientParseResult {
  const val = extractGradient(raw).replace(/^-(?:webkit|moz|o)-/, '')
  if (/^(radial|conic)-gradient\s*\(/i.test(val))
    return { ok: false, error: { key: 'err_radial_conic' } }
  if (!/^linear-gradient\s*\(/i.test(val))
    return { ok: false, error: { key: 'err_no_gradient' } }

  const inner = val.slice(val.indexOf('(') + 1, val.lastIndexOf(')')).trim()
  const parts = splitGradientArgs(inner)
  if (parts.length < 2) return { ok: false, error: { key: 'err_not_enough_stops' } }

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
  if (stopParts.length < 2) return { ok: false, error: { key: 'err_not_enough_stops2' } }

  const stops: GradStop[] = []
  const hasPosArr: (number | null)[] = []
  const n = stopParts.length

  for (let i = 0; i < n; i++) {
    const { color: colorStr, pos } = parseStopPart(stopParts[i])
    const hex = parseColorToHex(colorStr)
    if (!hex) return { ok: false, error: { key: 'err_invalid_color', color: colorStr } }
    hasPosArr.push(pos)
    stops.push({ color: hex, pos: pos ?? 0 })
  }

  // 填充缺失位置（均匀插值）
  for (let i = 0; i < n; i++) {
    if (hasPosArr[i] !== null) continue
    if (i === 0) { stops[i].pos = 0; hasPosArr[i] = 0; continue }
    if (i === n - 1) { stops[i].pos = 100; hasPosArr[i] = 100; continue }
    let pi = i - 1, ni = i + 1
    while (pi >= 0 && hasPosArr[pi] === null) pi--
    while (ni < n && hasPosArr[ni] === null) ni++
    const p0 = pi >= 0 ? stops[pi].pos : 0
    const p1 = ni < n ? stops[ni].pos : 100
    const fromIdx = pi >= 0 ? pi : 0
    const toIdx = ni < n ? ni : n - 1
    stops[i].pos = Math.round(p0 + (p1 - p0) * (i - fromIdx) / (toIdx - fromIdx))
  }

  return { ok: true, angle, stops }
}

function randomBgColor() {
  return ALL_BG_COLORS[Math.floor(Math.random() * ALL_BG_COLORS.length)]
}

function isValidUrl(s: string): boolean {
  if (!s.trim()) return false
  const full = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(full)
    return u.hostname.includes('.')
  } catch { return false }
}

export function injectSvgColor(svg: string, color: string): string {
  if (!color || !svg) return svg
  return svg
    .replace(/fill="(?!none)[^"]*"/gi, `fill="${color}"`)
    .replace(/stroke="(?!none)[^"]*"/gi, `stroke="${color}"`)
}

async function fetchSiteInfo(rawUrl: string): Promise<{ title: string; icons: string[] }> {
  const fullUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
  let domain = ''
  try { domain = new URL(fullUrl).hostname } catch { return { title: '', icons: [] } }
  const thirdPartyIcons = [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://icon.horse/icon/${domain}`,
  ]
  let title = ''
  const htmlIcons: string[] = []
  try {
    const resp = await fetch(fullUrl, { signal: AbortSignal.timeout(5000) })
    const html = await resp.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    title = doc.querySelector('title')?.textContent?.trim() ?? ''
    for (const sel of ['link[rel="apple-touch-icon"]', 'link[rel="apple-touch-icon-precomposed"]', 'link[rel*="icon"][sizes]', 'link[rel*="icon"]']) {
      doc.querySelectorAll(sel).forEach(link => {
        const href = link.getAttribute('href')
        if (href) { try { htmlIcons.push(new URL(href, fullUrl).href) } catch { /* ignore */ } }
      })
    }
  } catch { /* ignore */ }
  return { title, icons: [...new Set([...htmlIcons, ...thirdPartyIcons])].slice(0, 5) }
}

// ── 子组件 ────────────────────────────────────────────────

function TrafficLights({ onClose }: { onClose: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 8 }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div onClick={onClose} style={{
        width: 15, height: 15, borderRadius: '50%', background: '#FF5F57',
        cursor: 'pointer', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.5)', userSelect: 'none',
      }}>{hovered ? '×' : null}</div>
    </div>
  )
}

function IconPreview({ iconType, iconValue, bgColor, size = 80, svgColor = '', svgScale = 72, iconFit = 'contain' }: {
  iconType: IconType; iconValue: string; bgColor: string; size?: number
  svgColor?: string; svgScale?: number; iconFit?: string
}) {
  const isNone = bgColor === BG_NONE
  return (
    <div style={{
      width: size, height: size, borderRadius: '22%',
      background: isNone
        ? 'repeating-conic-gradient(#d8d8d8 0% 25%, #f0f0f0 0% 50%) 0 0 / 14px 14px'
        : bgColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', flexShrink: 0,
    }}>
      {iconType === 'url' && iconValue ? (
        <img src={iconValue} alt="" style={
          iconFit === 'contain'
            ? { width: '72%', height: '72%', objectFit: 'contain' }
            : { width: '100%', height: '100%', objectFit: iconFit as 'cover' | 'fill' }
        } />
      ) : iconType === 'svg' && iconValue ? (
        <div
          style={{ width: `${svgScale}%`, height: `${svgScale}%`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          dangerouslySetInnerHTML={{ __html: injectSvgColor(iconValue, svgColor) }}
        />
      ) : iconType === 'text' ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, lineHeight: 1, userSelect: 'none', letterSpacing: -0.5,
          color: svgColor || '#fff',
          fontSize: size * ((iconValue || '?').length <= 1 ? 0.48 : (iconValue || '?').length === 2 ? 0.36 : 0.27),
        }}>{iconValue || '?'}</div>
      ) : (
        <span style={{ fontSize: size * 0.48, lineHeight: 1 }}>{iconValue || '🌐'}</span>
      )}
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────────

export default function BookmarkEditModal({ open, onClose, initialData, onSave, mode = 'add', categories = [] }: Props) {
  const t = useT()
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [iconType, setIconType] = useState<IconType>('builtin')
  const [iconValue, setIconValue] = useState('🌐')

  const [urlIconInput, setUrlIconInput] = useState('')
  const [urlIconValue, setUrlIconValue] = useState('')
  const [svgIconValue, setSvgIconValue] = useState('')
  const [svgColor, setSvgColor] = useState('')
  const [svgScale, setSvgScale] = useState(72)
  const [builtinIconValue, setBuiltinIconValue] = useState('🌐')
  const [builtinExpanded, setBuiltinExpanded] = useState(false)
  const [textIconValue, setTextIconValue] = useState('')
  const [iconFit, setIconFit] = useState<'contain' | 'cover' | 'fill'>('contain')

  const [bgColor, setBgColor] = useState(randomBgColor)
  const [fetchedIcons, setFetchedIcons] = useState<string[]>([])
  const [fetching, setFetching] = useState(false)
  const [colorTab, setColorTab] = useState<'solid' | 'gradient'>('solid')
  const [iconTab, setIconTab] = useState<'url' | 'svg' | 'builtin' | 'text'>('builtin')

  const [gradStops, setGradStops] = useState<GradStop[]>([
    { color: '#667eea', pos: 0 },
    { color: '#764ba2', pos: 100 },
  ])
  const [gradAngle, setGradAngle] = useState(135)
  const [cssGradInput, setCssGradInput] = useState('')

  const [userSolids, setUserSolids] = useState<string[]>(() => loadPresets(PRESET_SOLID_KEY))
  const [userGrads, setUserGrads]   = useState<string[]>(() => loadPresets(PRESET_GRAD_KEY))
  const [saveAttempted, setSaveAttempted] = useState(false)

  // 右侧面板状态
  const [rightPanel, setRightPanel] = useState<'form' | 'new-preset' | 'all-presets'>('form')
  const [prevPanel, setPrevPanel] = useState<'form' | 'all-presets'>('form')
  const [newPresetSolidColor, setNewPresetSolidColor] = useState('#007AFF')
  const [editingPreset, setEditingPreset] = useState<{ type: 'solid' | 'gradient'; index: number } | null>(null)
  const [showCssImport, setShowCssImport] = useState(false)
  const [cssImportError, setCssImportError] = useState('')

  // 预设色块右键菜单
  const [presetMenu, setPresetMenu] = useState<{
    x: number; y: number; value: string; type: 'solid' | 'gradient'; index: number
  } | null>(null)
  // 全部预设面板多选
  const [allPresetSelection, setAllPresetSelection] = useState<Set<number>>(new Set())
  const [batchMode, setBatchMode] = useState(false)
  const [dragBox, setDragBox] = useState<{x: number; y: number; w: number; h: number} | null>(null)
  const gridScrollRef = useRef<HTMLDivElement>(null)
  const gridInnerRef = useRef<HTMLDivElement>(null)
  const swatchRefs = useRef<(HTMLDivElement | null)[]>([])
  const lastClickedIdx = useRef<number | null>(null)
  const dragOriginRef = useRef<{cx: number; cy: number; swatchIdx: number; isShift: boolean} | null>(null)

  useEffect(() => {
    if (open) {
      const initBg = initialData?.bgColor ?? randomBgColor()
      const initIconType = initialData?.iconType ?? 'url'
      const initIconValue = initialData?.iconValue ?? ''
      setUrl(initialData?.url ?? '')
      setName(initialData?.name ?? '')
      setCategoryId(initialData?.categoryId ?? '')
      setIconType(initIconType)
      setIconValue(initIconValue)
      setUrlIconInput(initIconType === 'url' ? initIconValue : '')
      setUrlIconValue(initIconType === 'url' ? initIconValue : '')
      setSvgIconValue(initIconType === 'svg' ? initIconValue : '')
      setSvgColor(initialData?.svgColor ?? '')
      setSvgScale(initialData?.svgScale ?? 72)
      setBuiltinIconValue(initIconType === 'builtin' ? initIconValue : '🌐')
      setTextIconValue(initIconType === 'text' ? initIconValue : '')
      setIconFit(initialData?.iconFit ?? 'contain')
      setBuiltinExpanded(false)
      setBgColor(initBg)
      setFetchedIcons([])
      setFetching(false)
      // 自动回填抓取图标和名称（有 URL 时）
      const autoFetchUrl = initialData?.url
      if (autoFetchUrl && isValidUrl(autoFetchUrl)) {
        setFetching(true)
        fetchSiteInfo(autoFetchUrl.trim())
          .then(({ title, icons }) => {
            // 只有原图标类型为图片(url)时，才自动替换图标
            if (initIconType === 'url' && icons.length > 0) {
              setFetchedIcons(icons)
              setUrlIconValue(icons[0])
              setUrlIconInput(icons[0])
              setIconValue(icons[0])
              setIconType('url')
            }
            // 如果没有传入名称，用抓取到的标题填充
            if (title) setName(prev => prev || title)
          })
          .catch(() => {})
          .finally(() => setFetching(false))
      }
      setColorTab('solid')
      setIconTab(initIconType)
      setSaveAttempted(false)
      setGradStops([{ color: '#667eea', pos: 0 }, { color: '#764ba2', pos: 100 }])
      setGradAngle(135)
      setCssGradInput('')
      setUserSolids(loadPresets(PRESET_SOLID_KEY))
      setUserGrads(loadPresets(PRESET_GRAD_KEY))
      setRightPanel('form')
      setPrevPanel('form')
      setNewPresetSolidColor('#007AFF')
      setEditingPreset(null)
      setPresetMenu(null)
      setAllPresetSelection(new Set())
      setBatchMode(false)
      setShowCssImport(false)
      setCssImportError('')
      setCssGradInput('')
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // 切换面板/tab 时清空全部预设多选
  useEffect(() => {
    setAllPresetSelection(new Set())
    setBatchMode(false)
    setPresetMenu(null)
  }, [rightPanel, colorTab])

  // 点击 modal 外部（backdrop / 其他区域）关闭右键菜单
  useEffect(() => {
    if (!presetMenu) return
    const close = () => setPresetMenu(null)
    const timer = setTimeout(() => { window.addEventListener('click', close) }, 0)
    return () => { clearTimeout(timer); window.removeEventListener('click', close) }
  }, [presetMenu])

  const handleFetch = async () => {
    if (fetching || !isValidUrl(url)) return
    setFetching(true)
    try {
      const { title, icons } = await fetchSiteInfo(url.trim())
      setFetchedIcons(icons)
      if (title && !name) setName(title)
      if (icons.length > 0) {
        setIconType('url'); setIconValue(icons[0])
        setUrlIconValue(icons[0]); setUrlIconInput(icons[0])
      }
    } catch { /* ignore */ }
    finally { setFetching(false) }
  }

  const applyIconUrl = () => {
    if (!isValidUrl(urlIconInput)) return
    const full = /^https?:\/\//i.test(urlIconInput) ? urlIconInput : `https://${urlIconInput}`
    setUrlIconValue(full); setIconType('url'); setIconValue(full)
  }

  const clearIconUrl = () => {
    setUrlIconInput(''); setUrlIconValue('')
    if (iconType === 'url') setIconValue('')
  }

  const switchIconTab = (tab: 'url' | 'svg' | 'builtin' | 'text') => {
    setIconTab(tab); setIconType(tab)
    if (tab === 'url') setIconValue(urlIconValue)
    else if (tab === 'svg') setIconValue(svgIconValue)
    else if (tab === 'text') {
      const tv = textIconValue || deriveTextIcon(name)
      setTextIconValue(tv)
      setIconValue(tv)
    }
    else setIconValue(builtinIconValue)
  }

  const stopsToGradient = (stops: GradStop[], angle: number) =>
    `linear-gradient(${angle}deg, ${stops.map(s => `${s.color} ${s.pos}%`).join(', ')})`

  const applyCustomGrad = (stops = gradStops, angle = gradAngle) => {
    setBgColor(stopsToGradient(stops, angle))
  }

  const updateStop = (idx: number, field: 'color' | 'pos', val: string | number) => {
    const next = gradStops.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    setGradStops(next); applyCustomGrad(next, gradAngle)
  }

  const addStop = () => {
    const n = gradStops.length
    const last = gradStops[n - 1], prev = gradStops[n - 2]
    const pos = Math.round((prev.pos + last.pos) / 2)
    const color = blendHex(prev.color, last.color)
    const next = [...gradStops.slice(0, n - 1), { color, pos }, last]
    setGradStops(next); applyCustomGrad(next, gradAngle)
  }

  const removeStop = (idx: number) => {
    if (gradStops.length <= 2) return
    const next = gradStops.filter((_, i) => i !== idx)
    setGradStops(next); applyCustomGrad(next, gradAngle)
  }

  const handleSave = () => {
    setSaveAttempted(true)
    if (!name.trim() || !isValidUrl(url)) return
    let finalUrl = url.trim()
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl
    onSave({ name: name.trim(), url: finalUrl, iconType, iconValue, svgColor, svgScale, iconFit: iconType === 'url' ? iconFit : undefined, bgColor, categoryId: categoryId || undefined })
    onClose()
  }

  const openNewPreset = (editing?: { type: 'solid' | 'gradient'; index: number; value: string }) => {
    setPrevPanel(rightPanel === 'all-presets' ? 'all-presets' : 'form')
    setEditingPreset(editing ?? null)
    setShowCssImport(false)
    setCssImportError('')
    setCssGradInput('')
    if (editing) {
      if (editing.type === 'solid') {
        setColorTab('solid')
        setNewPresetSolidColor(editing.value)
      } else {
        setColorTab('gradient')
        const parsed = parseCssGradient(editing.value)
        if (parsed.ok) {
          setGradStops(parsed.stops); setGradAngle(parsed.angle)
          applyCustomGrad(parsed.stops, parsed.angle)
        } else {
          setCssGradInput(editing.value)
          setBgColor(editing.value)
          setShowCssImport(true)
        }
      }
    } else {
      if (colorTab === 'solid') {
        const initColor = !isCssGradient(bgColor) && bgColor !== BG_NONE ? bgColor : '#007AFF'
        setNewPresetSolidColor(initColor)
      } else {
        const defaultStops: GradStop[] = [{ color: '#667eea', pos: 0 }, { color: '#764ba2', pos: 100 }]
        setGradStops(defaultStops); setGradAngle(135)
        applyCustomGrad(defaultStops, 135)
      }
    }
    setRightPanel('new-preset')
  }

  const saveNewPreset = () => {
    if (colorTab === 'solid') {
      const c = newPresetSolidColor
      let next = [...userSolids]
      if (editingPreset?.type === 'solid') {
        next[editingPreset.index] = c
      } else {
        next = [...next, c]
      }
      setUserSolids(next); savePresets(PRESET_SOLID_KEY, next)
      setBgColor(c)
    } else {
      const g = stopsToGradient(gradStops, gradAngle)
      let next = [...userGrads]
      if (editingPreset?.type === 'gradient') {
        next[editingPreset.index] = g
      } else {
        next = [...next, g]
      }
      setUserGrads(next); savePresets(PRESET_GRAD_KEY, next)
      setBgColor(g)
    }
    setEditingPreset(null)
    setRightPanel(prevPanel)
  }

  const deletePreset = (type: 'solid' | 'gradient', index: number) => {
    if (type === 'solid') {
      const next = userSolids.filter((_, i) => i !== index)
      setUserSolids(next); savePresets(PRESET_SOLID_KEY, next)
    } else {
      const next = userGrads.filter((_, i) => i !== index)
      setUserGrads(next); savePresets(PRESET_GRAD_KEY, next)
    }
    setPresetMenu(null)
    // 从编辑面板删除时回到来源面板
    if (rightPanel === 'new-preset') { setEditingPreset(null); setRightPanel(prevPanel) }
  }

  const deleteSelectedPresets = () => {
    const type = colorTab === 'solid' ? 'solid' : 'gradient'
    const list = type === 'solid' ? userSolids : userGrads
    const indices = [...allPresetSelection].sort((a, b) => b - a)
    let next = [...list]
    indices.forEach(idx => { next.splice(idx, 1) })
    if (type === 'solid') { setUserSolids(next); savePresets(PRESET_SOLID_KEY, next) }
    else { setUserGrads(next); savePresets(PRESET_GRAD_KEY, next) }
    setAllPresetSelection(new Set())
    setPresetMenu(null)
  }

  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!batchMode || e.button !== 0) return
    e.preventDefault()
    const target = e.target as HTMLElement
    const swatchIdx = swatchRefs.current.findIndex(el => el === target || (el?.contains(target) ?? false))
    const isShift = e.shiftKey
    dragOriginRef.current = { cx: e.clientX, cy: e.clientY, swatchIdx, isShift }
    let hasDragged = false

    const onMove = (me: MouseEvent) => {
      if (!dragOriginRef.current || !gridInnerRef.current) return
      const dx = me.clientX - dragOriginRef.current.cx
      const dy = me.clientY - dragOriginRef.current.cy
      if (!hasDragged && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      hasDragged = true
      const gb = gridInnerRef.current.getBoundingClientRect()
      const ox = dragOriginRef.current.cx - gb.left
      const oy = dragOriginRef.current.cy - gb.top
      const cx = me.clientX - gb.left
      const cy = me.clientY - gb.top
      const box = { x: Math.min(ox, cx), y: Math.min(oy, cy), w: Math.abs(cx - ox), h: Math.abs(cy - oy) }
      setDragBox(box)
      const next = new Set<number>()
      swatchRefs.current.forEach((el, idx) => {
        if (!el) return
        const b = el.getBoundingClientRect()
        const il = b.left - gb.left, it = b.top - gb.top
        if (box.x < il + b.width && box.x + box.w > il && box.y < it + b.height && box.y + box.h > it) next.add(idx)
      })
      setAllPresetSelection(next)
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const origin = dragOriginRef.current
      dragOriginRef.current = null
      setDragBox(null)
      if (!hasDragged && origin && origin.swatchIdx >= 0) {
        if (origin.isShift && lastClickedIdx.current !== null) {
          const from = Math.min(lastClickedIdx.current, origin.swatchIdx)
          const to = Math.max(lastClickedIdx.current, origin.swatchIdx)
          setAllPresetSelection(prev => {
            const next = new Set(prev)
            for (let j = from; j <= to; j++) next.add(j)
            return next
          })
        } else {
          setAllPresetSelection(prev => {
            const next = new Set(prev)
            next.has(origin.swatchIdx) ? next.delete(origin.swatchIdx) : next.add(origin.swatchIdx)
            return next
          })
          lastClickedIdx.current = origin.swatchIdx
        }
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── 派生状态 ────────────────────────────────────────────

  const urlError = (saveAttempted && !url.trim()) || (url.length > 0 && !isValidUrl(url))
  const nameError = saveAttempted && !name.trim()
  const iconUrlError = urlIconInput.length > 0 && !isValidUrl(urlIconInput)
  const canFetch = isValidUrl(url) && !fetching
  const canApplyIconUrl = isValidUrl(urlIconInput)
  const canSave = name.trim() && isValidUrl(url)

  // 新建预设面板中的保存按钮启用状态
  const canSaveNewSolid = newPresetSolidColor.length === 7
  const canSaveNewGrad = true  // 渐变面板始终可保存（builder 始终有有效值）

  // 左栏预览使用的底色（新建纯色预设时，用 newPresetSolidColor 作为预览）
  const previewBgColor = rightPanel === 'new-preset' && colorTab === 'solid' ? newPresetSolidColor : bgColor

  // ── 样式 ────────────────────────────────────────────────

  const groupLabel: React.CSSProperties = {
    fontSize: 11, color: '#86868b',
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginBottom: 8, paddingLeft: 4,
  }
  const groupBox: React.CSSProperties = {
    background: 'rgba(0,0,0,0.03)', borderRadius: 10, overflow: 'hidden', marginBottom: 20,
  }
  const groupDivider: React.CSSProperties = {
    height: 1, background: 'rgba(0,0,0,0.07)', marginLeft: 16,
  }
  const groupItem: React.CSSProperties = { padding: '12px 16px' }

  const fieldLabel: React.CSSProperties = {
    fontSize: 12, color: '#86868b', marginBottom: 6,
  }
  const inputBase = (error = false): React.CSSProperties => ({
    width: '100%', padding: '7px 11px', borderRadius: 7,
    border: `1px solid ${error ? '#FF3B30' : 'rgba(0,0,0,0.1)'}`,
    background: error ? 'rgba(255,59,48,0.04)' : 'rgba(255,255,255,0.85)',
    fontSize: 13, color: 'rgba(0,0,0,0.85)', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  })
  const errorTip: React.CSSProperties = { fontSize: 11, color: '#FF3B30', marginTop: 4 }

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', borderRadius: 6, border: 'none',
    background: active ? '#007AFF' : 'rgba(0,0,0,0.07)',
    color: active ? '#fff' : 'rgba(0,0,0,0.5)',
    cursor: 'pointer', fontSize: 12, transition: 'background 0.15s',
  })

  const iconActionBtn = (enabled: boolean): React.CSSProperties => ({
    width: 32, height: 32, borderRadius: 7, flexShrink: 0,
    background: enabled ? '#007AFF' : 'rgba(0,0,0,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'background 0.15s',
  })

  const swatchStyle = (bg: string, selected: boolean): React.CSSProperties => ({
    width: 24, height: 24, borderRadius: 6, background: bg, cursor: 'pointer',
    outline: selected ? '2.5px solid #007AFF' : '2px solid transparent',
    outlineOffset: 2, transition: 'outline 0.1s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  })

  const sectionLabel: React.CSSProperties = {
    fontSize: 10, color: '#aaaaaf',
    letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 5, paddingLeft: 2,
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.4)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onClick={(e) => { e.stopPropagation(); if (presetMenu) setPresetMenu(null) }}
            onContextMenu={e => { e.stopPropagation(); e.preventDefault() }}
            style={{
              position: 'fixed',
              top: `max(8px, calc(50% - ${MODAL_H / 2}px))`,
              left: `max(8px, calc(50% - ${MODAL_W / 2}px))`,
              width: `min(${MODAL_W}px, calc(100vw - 16px))`,
              height: `min(${MODAL_H}px, calc(100vh - 16px))`,
              background: '#f5f5f7', borderRadius: 22,
              boxShadow: '0 22px 70px rgba(0,0,0,0.45)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', zIndex: 501,
            }}
          >
            {/* ── Body（整体左右布局，充满弹窗） ── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '10px', gap: 12 }}>

              {/* ── 左栏 ── */}
              <div style={{
                width: 200, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(245,250,255,0.55) 0%, rgba(240,245,255,0.35) 100%)',
                backdropFilter: 'blur(30px) saturate(180%)',
                WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                borderRadius: 16,
                padding: '10px',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                display: 'flex', flexDirection: 'column', gap: 12,
                overflowY: 'auto',
              }}>
                {/* 关闭按钮 */}
                <div style={{ paddingLeft: 2, marginBottom: 8 }}>
                  <TrafficLights onClose={onClose} />
                </div>

                {/* 图标预览 */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <IconPreview iconType={iconType} iconValue={iconValue} bgColor={previewBgColor} size={88} svgColor={svgColor} svgScale={svgScale} iconFit={iconFit} />
                </div>

                {/* 底色 */}
                <div>
                  <div style={fieldLabel}>{t('bm_label_bg_color')}</div>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                    <button style={tabBtn(colorTab === 'solid')} onClick={() => setColorTab('solid')}>{t('color_tab_solid')}</button>
                    <button style={tabBtn(colorTab === 'gradient')} onClick={() => setColorTab('gradient')}>{t('color_tab_gradient')}</button>
                  </div>

                  {/* 无背景 swatch */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 3, marginBottom: 10 }}>
                    <div
                      onClick={() => setBgColor(BG_NONE)}
                      title={t('label_no_bg')}
                      style={{
                        ...swatchStyle('', bgColor === BG_NONE),
                        background: 'repeating-conic-gradient(#d0d0d0 0% 25%, #f5f5f5 0% 50%) 0 0 / 10px 10px',
                      }}
                    />
                  </div>

                  {/* 内置预设 */}
                  <div style={sectionLabel}>{t('label_builtin_presets')}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 3, marginBottom: 12 }}>
                    {colorTab === 'solid'
                      ? <>
                          {SOLID_COLORS.map((c, i) => (
                            <div key={i} onClick={() => setBgColor(c)} style={swatchStyle(c, bgColor === c)} />
                          ))}
                          <div
                            style={{
                              ...swatchStyle('', false),
                              background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
                              position: 'relative', overflow: 'hidden',
                            }}
                          >
                            <input
                              type="color"
                              value={!isCssGradient(bgColor) && bgColor !== BG_NONE ? bgColor : '#000000'}
                              onChange={e => setBgColor(e.target.value)}
                              style={{
                                position: 'absolute', inset: 0,
                                width: '100%', height: '100%',
                                opacity: 0, cursor: 'pointer', border: 'none', padding: 0,
                              }}
                            />
                          </div>
                        </>
                      : GRADIENT_COLORS.map((c, i) => (
                          <div key={i} onClick={() => setBgColor(c)} style={swatchStyle(c, bgColor === c)} />
                        ))
                    }
                  </div>

                  {/* 我的预设 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={sectionLabel}>{t('label_my_presets')}</div>
                    <div
                      onClick={() => openNewPreset()}
                      style={{
                        fontSize: 11, color: '#007AFF', cursor: 'pointer',
                        userSelect: 'none',
                        padding: '1px 7px', borderRadius: 5,
                        background: 'rgba(0,122,255,0.08)',
                      }}
                    >{t('btn_new_preset')}</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 3 }}>
                    {(() => {
                      const list = colorTab === 'solid' ? userSolids : userGrads
                      const type = colorTab === 'solid' ? 'solid' : 'gradient'
                      if (list.length === 0) return <span style={{ fontSize: 11, color: '#c7c7cc', paddingLeft: 2 }}>{t('label_no_presets')}</span>
                      const showMore = list.length > MAX_PRESET_DISPLAY
                      const visible = showMore ? list.slice(0, MAX_PRESET_DISPLAY) : list
                      return <>
                        {visible.map((c, i) => (
                          <div key={i}
                            onClick={() => setBgColor(c)}
                            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setPresetMenu({ x: e.clientX, y: e.clientY, value: c, type, index: i }) }}
                            style={swatchStyle(c, bgColor === c)}
                          />
                        ))}
                        {showMore && (
                          <div
                            onClick={() => setRightPanel('all-presets')}
                            title={t('label_view_all_presets', { count: list.length })}
                            style={{
                              width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
                              background: 'rgba(0,0,0,0.05)',
                              border: '1px dashed rgba(0,0,0,0.2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, color: '#007AFF', userSelect: 'none',
                            }}
                          >···</div>
                        )}
                      </>
                    })()}
                  </div>
                </div>
              </div>

              {/* ── 右栏 ── */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                <AnimatePresence mode="wait">

                  {/* ── 主表单面板 ── */}
                  {rightPanel === 'form' && (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    >
                      {/* 可滚动内容区 */}
                      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 10 }}>

                        {/* 分组：标签信息 */}
                        <p style={groupLabel}>{t('group_bookmark_info')}</p>
                        <div style={groupBox}>
                          <div style={groupItem}>
                            <div style={fieldLabel}>{t('label_url')}</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                  value={url}
                                  onChange={e => setUrl(e.target.value)}
                                  placeholder={t('bm_url_placeholder')}
                                  style={{ ...inputBase(urlError), paddingRight: url ? 30 : 11 }}
                                  onKeyDown={e => { if (e.key === 'Enter') handleFetch() }}
                                  autoFocus
                                />
                                {url && (
                                  <div onClick={() => { setUrl(''); setFetchedIcons([]) }}
                                    style={{
                                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                      width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.1)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'pointer', fontSize: 11, color: 'rgba(0,0,0,0.45)', userSelect: 'none',
                                    }}>×</div>
                                )}
                              </div>
                              <div onClick={handleFetch} title={t('btn_fetch_icon')} style={iconActionBtn(canFetch)}>
                                {fetching ? (
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                    <circle cx="8" cy="8" r="5.5" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
                                    <path d="M8 2.5 A5.5 5.5 0 0 1 13.5 8" stroke="white" strokeWidth="2" strokeLinecap="round">
                                      <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.75s" repeatCount="indefinite"/>
                                    </path>
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke={canFetch ? 'white' : 'rgba(0,0,0,0.25)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                            </div>
                            {urlError && <div style={errorTip}>{t('bm_url_error')}</div>}
                            {fetchedIcons.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                                <span style={{ fontSize: 11, color: '#86868b', flexShrink: 0 }}>{t('label_fetched_icons')}</span>
                                {fetchedIcons.map((src, i) => (
                                  <div key={i} onClick={() => { setIconType('url'); setIconValue(src); setUrlIconValue(src); setUrlIconInput(src) }}
                                    style={{
                                      width: 34, height: 34, borderRadius: 7, background: '#fff',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                      border: iconType === 'url' && iconValue === src ? '2px solid #007AFF' : '2px solid rgba(0,0,0,0.08)',
                                      overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', transition: 'border 0.1s',
                                    }}>
                                    <img src={src} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div style={groupDivider} />

                          <div style={groupItem}>
                            <div style={fieldLabel}>{t('label_name')}</div>
                            <input
                              value={name}
                              onChange={e => setName(e.target.value)}
                              placeholder={t('bm_name_placeholder')}
                              style={inputBase(nameError)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                            />
                            {nameError && <div style={errorTip}>{t('bm_name_error')}</div>}
                          </div>

                          {categories.length > 0 && (
                            <>
                              <div style={groupDivider} />
                              <div style={groupItem}>
                                <div style={fieldLabel}>{t('label_category')}</div>
                                <CategorySelect
                                  value={categoryId}
                                  onChange={setCategoryId}
                                  placeholder={t('bm_category_none')}
                                  options={[
                                    { value: '', label: t('bm_category_none') },
                                    ...categories.map(cat => ({ value: cat.id, label: cat.name })),
                                  ]}
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {/* 分组：图标 */}
                        <p style={groupLabel}>{t('label_icon')}</p>
                        <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, overflow: 'hidden', padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                            <button style={tabBtn(iconTab === 'url')} onClick={() => switchIconTab('url')}>{t('icon_tab_url')}</button>
                            <button style={tabBtn(iconTab === 'svg')} onClick={() => switchIconTab('svg')}>{t('icon_tab_svg')}</button>
                            <button style={tabBtn(iconTab === 'text')} onClick={() => switchIconTab('text')}>{t('icon_tab_text')}</button>
                            <button style={tabBtn(iconTab === 'builtin')} onClick={() => switchIconTab('builtin')}>{t('icon_tab_builtin')}</button>
                          </div>

                          {iconTab === 'url' && (
                            <div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                  <input
                                    value={urlIconInput}
                                    onChange={e => setUrlIconInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') applyIconUrl() }}
                                    placeholder={t('icon_url_placeholder')}
                                    style={{ ...inputBase(iconUrlError), paddingRight: urlIconInput ? 30 : 11 }}
                                  />
                                  {urlIconInput && (
                                    <div onClick={clearIconUrl} style={{
                                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                      width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.1)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'pointer', fontSize: 11, color: 'rgba(0,0,0,0.45)', userSelect: 'none',
                                    }}>×</div>
                                  )}
                                </div>
                                <div onClick={applyIconUrl} title="预览图标" style={iconActionBtn(canApplyIconUrl)}>
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                    <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z"
                                      stroke={canApplyIconUrl ? 'white' : 'rgba(0,0,0,0.25)'} strokeWidth="1.5" strokeLinejoin="round"/>
                                    <circle cx="8" cy="8" r="2" fill={canApplyIconUrl ? 'white' : 'rgba(0,0,0,0.25)'}/>
                                  </svg>
                                </div>
                              </div>
                              {iconUrlError && <div style={errorTip}>{t('bm_icon_url_error')}</div>}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                <span style={{ fontSize: 12, color: '#86868b', flexShrink: 0 }}>{t('icon_fit_label')}</span>
                                <div style={{ width: 90 }}>
                                  <CategorySelect
                                    value={iconFit}
                                    onChange={v => setIconFit(v as 'contain' | 'cover' | 'fill')}
                                    options={[
                                      { value: 'contain', label: t('icon_fit_contain') },
                                      { value: 'cover',   label: t('icon_fit_cover') },
                                      { value: 'fill',    label: t('icon_fit_fill') },
                                    ]}
                                    placeholder=""
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {iconTab === 'svg' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <textarea
                                value={svgIconValue}
                                onChange={e => { setSvgIconValue(e.target.value); setIconType('svg'); setIconValue(e.target.value) }}
                                placeholder={t('svg_code_placeholder')}
                                style={{ ...inputBase(), height: 68, resize: 'none', fontFamily: 'monospace', fontSize: 12 }}
                              />
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 12, color: '#86868b' }}>{t('icon_size_label')}</span>
                                  <input type="range" min={30} max={100} value={svgScale}
                                    onChange={e => setSvgScale(Number(e.target.value))}
                                    style={{ width: 80, accentColor: '#007AFF' }}
                                  />
                                  <span style={{ fontSize: 12, color: '#86868b', width: 32 }}>{svgScale}%</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 12, color: '#86868b' }}>{t('label_svg_color')}</span>
                                  <label style={{ position: 'relative', cursor: 'pointer' }}>
                                    <div style={{
                                      width: 24, height: 24, borderRadius: 6,
                                      background: svgColor || 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.08)',
                                    }} />
                                    <input type="color" value={svgColor || '#000000'} onChange={e => setSvgColor(e.target.value)}
                                      style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0 }} />
                                  </label>
                                  {svgColor && (
                                    <div onClick={() => setSvgColor('')} title={t('label_clear_color')} style={{
                                      width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.08)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'pointer', fontSize: 11, color: 'rgba(0,0,0,0.45)', userSelect: 'none',
                                    }}>×</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {iconTab === 'text' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input
                                  value={textIconValue}
                                  onChange={e => {
                                    const v = e.target.value.slice(0, 4)
                                    setTextIconValue(v)
                                    setIconValue(v)
                                  }}
                                  placeholder="?"
                                  maxLength={4}
                                  style={{ ...inputBase(), flex: 1, fontWeight: 700, fontSize: 18, textAlign: 'center', letterSpacing: 2 }}
                                />
                                <button
                                  onClick={() => {
                                    const v = deriveTextIcon(name)
                                    setTextIconValue(v)
                                    setIconValue(v)
                                  }}
                                  style={{
                                    padding: '5px 10px', borderRadius: 7, border: 'none',
                                    background: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.55)',
                                    cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0,
                                  }}
                                >↺ {t('icon_tab_text_regen')}</button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 12, color: '#86868b' }}>{t('label_svg_color')}</span>
                                <label style={{ position: 'relative', cursor: 'pointer' }}>
                                  <div style={{
                                    width: 24, height: 24, borderRadius: 6,
                                    background: svgColor || '#ffffff',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.08)',
                                  }} />
                                  <input type="color" value={svgColor || '#ffffff'} onChange={e => setSvgColor(e.target.value)}
                                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0 }} />
                                </label>
                                {svgColor && (
                                  <div onClick={() => setSvgColor('')} title={t('label_clear_color')} style={{
                                    width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', fontSize: 11, color: 'rgba(0,0,0,0.45)', userSelect: 'none',
                                  }}>×</div>
                                )}
                              </div>
                              <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', margin: 0, lineHeight: 1.5 }}>
                                {t('icon_tab_text_hint')}
                              </p>
                            </div>
                          )}

                          {iconTab === 'builtin' && (
                            <div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {(builtinExpanded ? BUILTIN_ICONS : BUILTIN_ICONS.slice(0, BUILTIN_PREVIEW_COUNT)).map(icon => (
                                  <div key={icon}
                                    onClick={() => { setBuiltinIconValue(icon); setIconType('builtin'); setIconValue(icon) }}
                                    style={{
                                      width: 34, height: 34, borderRadius: 7,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 19, cursor: 'pointer',
                                      background: iconType === 'builtin' && iconValue === icon ? 'rgba(0,122,255,0.12)' : 'rgba(0,0,0,0.04)',
                                      border: iconType === 'builtin' && iconValue === icon ? '1.5px solid rgba(0,122,255,0.4)' : '1.5px solid transparent',
                                      transition: 'all 0.12s',
                                    }}
                                  >{icon}</div>
                                ))}
                              </div>
                              <div
                                onClick={() => setBuiltinExpanded(v => !v)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, cursor: 'pointer', userSelect: 'none', color: '#007AFF', fontSize: 12 }}
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                                  style={{ transition: 'transform 0.2s', transform: builtinExpanded ? 'rotate(180deg)' : 'none' }}>
                                  <path d="M2 4L6 8L10 4" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                {builtinExpanded ? t('bm_icon_collapse') : t('bm_icon_expand', { count: BUILTIN_ICONS.length })}
                              </div>
                            </div>
                          )}
                        </div>

                      </div>{/* 滚动内容区结束 */}

                      {/* 按钮区 */}
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, flexShrink: 0 }}>
                        <button onClick={onClose} style={{
                          padding: '5px 14px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)',
                          background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'rgba(0,0,0,0.6)',
                        }}>{t('btn_cancel')}</button>
                        <button onClick={handleSave} disabled={!canSave} style={{
                          padding: '5px 14px', borderRadius: 7, border: 'none',
                          background: canSave ? '#007AFF' : 'rgba(0,122,255,0.35)',
                          cursor: canSave ? 'pointer' : 'not-allowed',
                          fontSize: 12, color: '#fff', transition: 'background 0.15s',
                        }}>{mode === 'add' ? t('btn_add_bookmark') : t('btn_save_bookmark')}</button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── 新建预设面板 ── */}
                  {rightPanel === 'new-preset' && (
                    <motion.div
                      key="new-preset"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    >
                      {/* 顶部：返回按钮 + 标题 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 16, paddingRight: 10, paddingTop: 3, paddingLeft: 2, flexShrink: 0 }}>
                        <div
                          onClick={() => setRightPanel('form')}
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
                          {editingPreset
                            ? (colorTab === 'solid' ? t('preset_edit_solid') : t('preset_edit_grad'))
                            : (colorTab === 'solid' ? t('preset_new_solid') : t('preset_new_grad'))
                          }
                        </span>
                      </div>

                      {/* 内容区 */}
                      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 10 }}>

                        {/* 纯色 */}
                        {colorTab === 'solid' && (
                          <div style={groupBox}>
                            <div style={groupItem}>
                              <div style={fieldLabel}>{t('bm_label_select_color')}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                                  <div style={{
                                    width: 58, height: 58, borderRadius: 15,
                                    background: newPresetSolidColor,
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                                  }} />
                                  <input type="color" value={newPresetSolidColor}
                                    onChange={e => setNewPresetSolidColor(e.target.value)}
                                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0 }} />
                                </label>
                                <input
                                  value={newPresetSolidColor}
                                  onChange={e => {
                                    const v = e.target.value
                                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setNewPresetSolidColor(v)
                                  }}
                                  maxLength={7}
                                  style={{ ...inputBase(), width: 110, fontFamily: 'monospace' }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 渐变 */}
                        {colorTab === 'gradient' && (
                          <div>
                            <div style={groupBox}>
                              <div style={groupItem}>
                                {/* 标题行：自定义渐变 + 从 CSS 导入按钮 */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                  <div style={fieldLabel}>{t('bm_label_custom_gradient')}</div>
                                  <div
                                    onClick={() => { setShowCssImport(v => !v); setCssImportError('') }}
                                    style={{
                                      fontSize: 11, color: showCssImport ? '#fff' : '#007AFF',
                                      cursor: 'pointer', userSelect: 'none',
                                      padding: '2px 8px', borderRadius: 5,
                                      background: showCssImport ? '#007AFF' : 'rgba(0,122,255,0.08)',
                                      transition: 'all 0.15s',
                                    }}
                                  >{t('css_import_btn_label')}</div>
                                </div>

                                {/* CSS 导入面板 */}
                                {showCssImport && (
                                  <div style={{
                                    marginBottom: 12, padding: '10px', borderRadius: 8,
                                    background: 'rgba(0,122,255,0.04)', border: '1px solid rgba(0,122,255,0.15)',
                                  }}>
                                    <textarea
                                      value={cssGradInput}
                                      onChange={e => { setCssGradInput(e.target.value); setCssImportError('') }}
                                      placeholder={t('css_import_placeholder')}
                                      rows={4}
                                      style={{
                                        width: '100%', padding: '6px 8px', borderRadius: 6, boxSizing: 'border-box',
                                        border: `1px solid ${cssImportError ? '#FF3B30' : 'rgba(0,0,0,0.1)'}`,
                                        fontSize: 11, fontFamily: 'monospace', resize: 'none',
                                        background: 'rgba(255,255,255,0.7)', outline: 'none', color: 'rgba(0,0,0,0.8)',
                                        marginBottom: 6,
                                      }}
                                    />
                                    {cssImportError && (
                                      <div style={{ fontSize: 11, color: '#FF3B30', marginBottom: 6, lineHeight: 1.4 }}>
                                        {cssImportError}
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                      <div
                                        onClick={() => {
                                          const result = parseCssGradient(cssGradInput)
                                          if (result.ok) {
                                            setGradStops(result.stops); setGradAngle(result.angle)
                                            applyCustomGrad(result.stops, result.angle)
                                            setShowCssImport(false); setCssGradInput(''); setCssImportError('')
                                          } else {
                                            const err = result.error
                                            setCssImportError(err.key === 'err_invalid_color' ? t(err.key, { color: err.color }) : t(err.key))
                                          }
                                        }}
                                        style={{
                                          padding: '4px 12px', borderRadius: 6, fontSize: 12,
                                          background: '#007AFF', color: '#fff', cursor: 'pointer',
                                          userSelect: 'none',
                                        }}
                                      >{t('css_import_apply')}</div>
                                    </div>
                                  </div>
                                )}

                                {/* 渐变控件 — 多色版 */}
                                {/* 预览条 */}
                                <div style={{
                                  height: 22, borderRadius: 7,
                                  background: stopsToGradient(gradStops, gradAngle),
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                                  marginBottom: 8,
                                }} />
                                {/* 色标列表 */}
                                {gradStops.map((stop, idx) => {
                                  const pct = stop.pos
                                  return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                      <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: 6, background: stop.color, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                        <input type="color" value={stop.color}
                                          onChange={e => updateStop(idx, 'color', e.target.value)}
                                          style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0 }} />
                                      </label>
                                      {/* 自定义进度条 */}
                                      <div style={{ flex: 1, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
                                        <div style={{ position: 'absolute', width: '100%', height: 4, background: '#d1d1d6', borderRadius: 2, overflow: 'hidden' }}>
                                          <div style={{ width: `${pct}%`, height: '100%', background: '#007AFF', borderRadius: 2 }} />
                                        </div>
                                        <input type="range" min={0} max={100} value={pct}
                                          onChange={e => updateStop(idx, 'pos', Number(e.target.value))}
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
                                        <button onClick={() => removeStop(idx)}
                                          style={{
                                            width: 20, height: 20, borderRadius: 10, border: 'none',
                                            background: 'rgba(0,0,0,0.08)', cursor: 'pointer',
                                            fontSize: 14, lineHeight: '18px', color: '#86868b',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                          }}>×</button>
                                      )}
                                    </div>
                                  )
                                })}
                                {/* 添加色标 */}
                                <button onClick={addStop}
                                  style={{
                                    width: '100%', padding: '4px 0', borderRadius: 6, border: '1px dashed rgba(0,0,0,0.15)',
                                    background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#007AFF', marginBottom: 8,
                                  }}>{t('gradient_add_stop')}</button>
                                {/* 角度 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, color: '#86868b', flexShrink: 0 }}>{t('gradient_angle_label')}</span>
                                  <div style={{ flex: 1, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
                                    <div style={{ position: 'absolute', width: '100%', height: 4, background: '#d1d1d6', borderRadius: 2, overflow: 'hidden' }}>
                                      <div style={{ width: `${(gradAngle / 360) * 100}%`, height: '100%', background: '#007AFF', borderRadius: 2 }} />
                                    </div>
                                    <input type="range" min={0} max={360} value={gradAngle}
                                      onChange={e => { const a = Number(e.target.value); setGradAngle(a); applyCustomGrad(gradStops, a) }}
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
                              </div>
                            </div>
                          </div>
                        )}

                      </div>{/* 内容区结束 */}

                      {/* 按钮区 */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 12, paddingRight: 10, flexShrink: 0 }}>
                        {editingPreset && (
                          <button
                            onClick={() => deletePreset(editingPreset.type, editingPreset.index)}
                            style={{
                              padding: '5px 14px', borderRadius: 7, border: 'none', marginRight: 'auto',
                              background: '#FF3B30', cursor: 'pointer', fontSize: 12, color: '#fff',
                            }}
                          >{t('btn_delete_preset')}</button>
                        )}
                        <button onClick={() => setRightPanel(prevPanel)} style={{
                          padding: '5px 14px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)',
                          background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'rgba(0,0,0,0.6)',
                          marginLeft: editingPreset ? 0 : 'auto',
                        }}>{t('btn_cancel')}</button>
                        <button
                          onClick={saveNewPreset}
                          disabled={colorTab === 'solid' ? !canSaveNewSolid : !canSaveNewGrad}
                          style={{
                            padding: '5px 14px', borderRadius: 7, border: 'none',
                            background: (colorTab === 'solid' ? canSaveNewSolid : canSaveNewGrad) ? '#007AFF' : 'rgba(0,122,255,0.35)',
                            cursor: (colorTab === 'solid' ? canSaveNewSolid : canSaveNewGrad) ? 'pointer' : 'not-allowed',
                            fontSize: 12, color: '#fff', transition: 'background 0.15s',
                          }}
                        >{t('btn_save_preset')}</button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── 全部预设面板 ── */}
                  {rightPanel === 'all-presets' && (
                    <motion.div
                      key="all-presets"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    >
                      {/* 顶部：返回 + 标题 + 批量管理 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 16, paddingRight: 10, paddingTop: 3, paddingLeft: 2, flexShrink: 0 }}>
                        <div
                          onClick={() => setRightPanel('form')}
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
                          {colorTab === 'solid' ? t('all_presets_solid_title') : t('all_presets_grad_title')}
                        </span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                          {batchMode && (
                            <div
                              onClick={() => { setBatchMode(false); setAllPresetSelection(new Set()); lastClickedIdx.current = null }}
                              style={{ fontSize: 12, color: '#86868b', cursor: 'pointer', padding: '3px 8px' }}
                            >{t('btn_cancel')}</div>
                          )}
                          <div
                            onClick={() => {
                              if (batchMode && allPresetSelection.size > 0) {
                                deleteSelectedPresets()
                                setBatchMode(false); lastClickedIdx.current = null
                              } else {
                                setBatchMode(b => !b)
                                setAllPresetSelection(new Set())
                              }
                            }}
                            style={{
                              fontSize: 12, cursor: 'pointer', padding: '3px 10px', borderRadius: 6,
                              background: batchMode && allPresetSelection.size > 0 ? '#FF3B30' : 'rgba(0,0,0,0.06)',
                              color: batchMode && allPresetSelection.size > 0 ? '#fff' : batchMode ? '#007AFF' : 'rgba(0,0,0,0.6)',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                          >
                            {batchMode && allPresetSelection.size > 0 ? t('btn_batch_delete', { count: allPresetSelection.size }) : t('btn_batch_manage')}
                          </div>
                        </div>
                      </div>

                      {/* 全部预设网格（可滚动） */}
                      <div ref={gridScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '5px 10px 5px 5px' }}>
                        <div ref={gridInnerRef} onMouseDown={handleGridMouseDown} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, position: 'relative' }}>
                          {(colorTab === 'solid' ? userSolids : userGrads).map((c, i) => {
                            const type = colorTab === 'solid' ? 'solid' : 'gradient'
                            const isSelected = allPresetSelection.has(i)
                            return (
                              <div
                                key={i}
                                ref={el => { swatchRefs.current[i] = el }}
                                onClick={batchMode ? undefined : () => setBgColor(c)}
                                onContextMenu={e => {
                                  e.preventDefault(); e.stopPropagation()
                                  if (!batchMode) setPresetMenu({ x: e.clientX, y: e.clientY, value: c, type, index: i })
                                }}
                                style={{
                                  width: 32, height: 32, borderRadius: 8, background: c,
                                  cursor: batchMode ? 'crosshair' : 'pointer',
                                  outline: isSelected ? '2.5px solid #007AFF' : bgColor === c && !batchMode ? '2.5px solid #007AFF' : '2px solid transparent',
                                  outlineOffset: 2, transition: 'outline 0.1s, box-shadow 0.1s',
                                  boxShadow: isSelected ? '0 0 0 3px rgba(0,122,255,0.2)' : '0 1px 4px rgba(0,0,0,0.12)',
                                }}
                              />
                            )
                          })}
                          {dragBox && dragBox.w > 4 && dragBox.h > 4 && (
                            <div style={{
                              position: 'absolute',
                              left: dragBox.x, top: dragBox.y,
                              width: dragBox.w, height: dragBox.h,
                              background: 'rgba(0,122,255,0.1)',
                              border: '1px solid rgba(0,122,255,0.4)',
                              borderRadius: 3,
                              pointerEvents: 'none',
                            }} />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>

              </div>{/* 右栏结束 */}
            </div>

            {/* 预设色块右键菜单（fixed 定位，不受 overflow:hidden 影响） */}
            {presetMenu && (
              <>
                <div
                  onClick={e => e.stopPropagation()}
                  onContextMenu={e => e.stopPropagation()}
                  style={{
                    position: 'fixed',
                    left: Math.min(presetMenu.x, window.innerWidth - 130),
                    top: Math.min(presetMenu.y, window.innerHeight - 90),
                    zIndex: 600,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(248,248,250,0.96) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    borderRadius: 8,
                    border: '0.5px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    padding: 4,
                    minWidth: 120,
                  }}
                >
                  {[
                    { label: t('preset_menu_edit'), action: () => { openNewPreset({ type: presetMenu.type, index: presetMenu.index, value: presetMenu.value }); setPresetMenu(null) }, danger: false },
                    { label: t('preset_menu_delete'), action: () => deletePreset(presetMenu.type, presetMenu.index), danger: true },
                  ].map(item => (
                    <div
                      key={item.label}
                      onClick={item.action}
                      style={{ padding: '6px 12px', fontSize: 13, color: item.danger ? '#FF3B30' : 'rgba(0,0,0,0.85)', cursor: 'pointer', borderRadius: 5, userSelect: 'none', transition: 'background 0.1s, color 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = item.danger ? '#FF3B30' : '#007AFF'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = item.danger ? '#FF3B30' : 'rgba(0,0,0,0.85)' }}
                    >{item.label}</div>
                  ))}
                </div>
              </>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

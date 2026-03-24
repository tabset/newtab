import type { BackgroundConfig, RandomType } from '../store/dockConfig'

// 内置纯色池
export const BUILTIN_SOLIDS = [
  '#FFFFFF', '#000000', '#FF3B30', '#FF6B35', '#FF9500',
  '#FFCC00', '#34C759', '#00C7BE', '#32ADE6', '#007AFF',
  '#5856D6', '#AF52DE', '#FF2D55', '#A2845E', '#2C2C2E',
  '#636366', '#8E8E93', '#667eea', '#764ba2', '#f093fb',
  '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
  '#fa709a', '#fee140', '#30cfd0', '#1DB954', '#0984e3',
]

// 内置渐变池
export const BUILTIN_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
  'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
  'linear-gradient(135deg, #7F7FD5 0%, #86A8E7 50%, #91EAE4 100%)',
  'linear-gradient(135deg, #FC5C7D 0%, #6A3093 100%)',
  'linear-gradient(135deg, #1FA2FF 0%, #12D8FA 50%, #A6FFCB 100%)',
  'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)',
  'linear-gradient(135deg, #373B44 0%, #4286f4 100%)',
  'linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)',
  'linear-gradient(to right, #fa709a 0%, #fee140 100%)',
  'linear-gradient(to right, #30cfd0 0%, #330867 100%)',
  'linear-gradient(to right, #3a7bd5 0%, #3a6073 100%)',
]

/** 判断当前时刻是否处于与上次随机不同的时间窗口 */
export function shouldRandomize(type: RandomType, lastRandomAt: number | undefined): boolean {
  if (type === 'none') return false
  const now = Date.now()
  const last = lastRandomAt ?? 0
  switch (type) {
    case 'every5min':
      return Math.floor(now / (5 * 60_000)) > Math.floor(last / (5 * 60_000))
    case 'every30min':
      return Math.floor(now / (30 * 60_000)) > Math.floor(last / (30 * 60_000))
    case 'hourly':
      return Math.floor(now / 3_600_000) > Math.floor(last / 3_600_000)
    case 'daily': {
      const n = new Date(now), l = new Date(last)
      return n.getFullYear() !== l.getFullYear() || n.getMonth() !== l.getMonth() || n.getDate() !== l.getDate()
    }
    case 'monthly': {
      const n = new Date(now), l = new Date(last)
      return n.getFullYear() !== l.getFullYear() || n.getMonth() !== l.getMonth()
    }
  }
}

/** 从可用素材池中随机选取一项，返回需要更新的 BackgroundConfig 字段 */
export function pickRandomBackground(bg: BackgroundConfig): Partial<BackgroundConfig> {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  switch (bg.type) {
    case 'color': {
      const pool = [...BUILTIN_SOLIDS, ...(bg.customSolids || [])]
      if (!pool.length) return {}
      return { color: pick(pool), lastRandomAt: Date.now() }
    }
    case 'gradient': {
      const pool = [...BUILTIN_GRADIENTS, ...(bg.customGradients || [])]
      if (!pool.length) return {}
      return { gradient: pick(pool), lastRandomAt: Date.now() }
    }
    case 'image': {
      const pool = [
        ...(bg.imageSources || []).flatMap(s => s.images),
        ...(bg.customImages || []),
      ]
      if (!pool.length) return {}
      return { imageUrl: pick(pool), lastRandomAt: Date.now() }
    }
    default:
      return {}
  }
}

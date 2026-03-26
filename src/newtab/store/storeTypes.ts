export type StoreIconType = 'url' | 'svg' | 'builtin' | 'text'

export interface StoreIcon {
  type: StoreIconType
  value: string
  bgColor: string
  svgColor?: string
  svgScale?: number
  fit?: 'contain' | 'cover' | 'fill'
}

export interface StoreItem {
  id: string
  name: Record<string, string>
  description?: Record<string, string>
  url?: string
  icon: StoreIcon
}

export interface StoreCategory {
  id: string
  name: Record<string, string>
  items: StoreItem[]
}

export interface StoreData {
  version: string
  categories: StoreCategory[]
}

// 数据源插件接口 — 业务方实现此接口，StorePanel 通过它获取数据
export interface StorePlugin {
  id: string
  fetchData: () => Promise<StoreData>
}

// 最常用的实现：从静态 URL 拉取 JSON
export function createUrlPlugin(id: string, url: string): StorePlugin {
  return {
    id,
    fetchData: async () => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<StoreData>
    },
  }
}

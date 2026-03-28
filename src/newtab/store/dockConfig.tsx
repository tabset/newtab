import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { AppItem } from '../types'

export type DockPosition = 'bottom' | 'top' | 'left' | 'right'
export type BackgroundType = 'color' | 'gradient' | 'image' | 'animated' | 'video'
export type RandomType = 'none' | 'every5min' | 'every30min' | 'hourly' | 'daily' | 'monthly'

export type BookmarkDisplayType = 'grid' | 'list'
export type BookmarkSearchScope = 'local' | 'online'
export type BookmarkDisplayStyle = 'icon-text' | 'icon-only' | 'name-only'
export type BookmarkCategoryMode = 'show' | 'hide'
export type BookmarkOpenMode = 'newtab' | 'current'

export interface SearchEngine {
  id: string
  nameKey: string      // i18n key for display name
  url: string          // URL template with {query} placeholder
  isBuiltin?: boolean
}

export const BUILTIN_SEARCH_ENGINES: SearchEngine[] = [
  { id: 'google',     nameKey: 'engine_google',     url: 'https://www.google.com/search?q={query}',              isBuiltin: true },
  { id: 'bing',       nameKey: 'engine_bing',       url: 'https://www.bing.com/search?q={query}',                isBuiltin: true },
  { id: 'yahoo',      nameKey: 'engine_yahoo',      url: 'https://search.yahoo.com/search?p={query}',            isBuiltin: true },
  { id: 'baidu',      nameKey: 'engine_baidu',      url: 'https://www.baidu.com/s?wd={query}',                   isBuiltin: true },
  { id: 'duckduckgo', nameKey: 'engine_duckduckgo', url: 'https://duckduckgo.com/?q={query}',                    isBuiltin: true },
  { id: 'ask',        nameKey: 'engine_ask',        url: 'https://www.ask.com/web?q={query}',                    isBuiltin: true },
  { id: 'github',     nameKey: 'engine_github',     url: 'https://github.com/search?q={query}',                  isBuiltin: true },
  { id: 'yandex',     nameKey: 'engine_yandex',     url: 'https://yandex.com/search/?text={query}',              isBuiltin: true },
  { id: 'naver',      nameKey: 'engine_naver',      url: 'https://search.naver.com/search.naver?query={query}',  isBuiltin: true },
]

export interface BookmarkCategory {
  id: string
  name: string
}

export type BookmarkIconType = 'url' | 'svg' | 'builtin' | 'text'

export interface BookmarkItem {
  id: string
  name: string
  url: string
  iconType: BookmarkIconType
  iconValue: string
  svgColor?: string
  svgScale?: number
  iconFit?: 'contain' | 'cover' | 'fill'   // URL 图标填充方式，默认 contain
  bgColor: string
  categoryId?: string
}

export interface BookmarkLayoutConfig {
  displayType: BookmarkDisplayType
  showSearch: boolean
  searchScope: BookmarkSearchScope
  defaultSearchEngineId: string
  displayStyle: BookmarkDisplayStyle
  animationEffect: string
  scale: number              // 1=small 2=medium 3=large 4=xlarge
  searchBarScale: number     // 1-5, controls search input width
  searchBarRadius: number    // 0-10px, controls search input border-radius
  categoryMode: BookmarkCategoryMode
  showCatAll: boolean        // 分类栏是否显示「全部」选项
  categories: BookmarkCategory[]
  openMode: BookmarkOpenMode
  defaultView: 'desktop' | 'launchpad'  // 新标签页默认打开视图
}

export const DEFAULT_BOOKMARK_LAYOUT: BookmarkLayoutConfig = {
  displayType: 'grid',
  showSearch: true,
  searchScope: 'local',
  defaultSearchEngineId: 'google',
  displayStyle: 'icon-text',
  animationEffect: 'fadeIn',
  scale: 2,
  searchBarScale: 2,
  searchBarRadius: 2,
  categoryMode: 'show',
  showCatAll: true,
  categories: [],
  openMode: 'newtab',
  defaultView: 'desktop',
}

export interface ImageSource {
  id: string       // 唯一标识
  name: string     // 分组名称（可编辑）
  url: string      // API 地址
  images: string[] // 缓存的图片 URL 列表
}

export interface TimeSlot {
  id: 'morning' | 'afternoon' | 'evening' | 'night'
  startHour: number
  background: Partial<BackgroundConfig>
}

export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: 'morning',   startHour: 6,  background: { type: 'gradient', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' } },
  { id: 'afternoon', startHour: 12, background: { type: 'gradient', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' } },
  { id: 'evening',   startHour: 18, background: { type: 'gradient', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' } },
  { id: 'night',     startHour: 22, background: { type: 'gradient', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' } },
]

export interface BackgroundConfig {
  type: BackgroundType
  color?: string
  gradient?: string
  customSolids?: string[]
  customGradients?: string[]
  imageUrl?: string
  imageSources?: ImageSource[]    // 持久化的 API 数据源列表
  customImages?: string[]         // 用户手动添加的图片
  customImagesGroupName?: string  // "我的图片库"分组名（可编辑）
  blur: number
  opacity: number
  randomType?: RandomType
  lastRandomAt?: number
  // Animated effect
  animatedEffect?: string
  animatedColor?: string
  animatedBgColor?: string
  animatedSpeed?: number
  // Video background
  videoUrl?: string
  // Time-based schedule
  timeScheduleEnabled?: boolean
  timeSlots?: TimeSlot[]
  // Community shader effects
  installedEffects?: import('../utils/effectStore').ShaderEffect[]
  effectStoreUrl?: string
}

export interface DockConfig {
  baseSize: number       // 图标基础大小 32-80
  magnification: boolean // 放大效果开关
  maxSize: number        // 放大后最大尺寸 64-128
  effectRadius: number   // 放大效果范围 80-240
  position: DockPosition // 位置
  background: BackgroundConfig // 背景配置
  language?: string            // 语言设置，默认 zh-CN
  bookmarkLayout?: BookmarkLayoutConfig
  bookmarks?: BookmarkItem[]
  dockApps?: AppItem[]
}

const STORAGE_KEY = 'newtab_dock_config'

export const DEFAULT_CONFIG: DockConfig = {
  baseSize: 56,
  magnification: true,
  maxSize: 96,
  effectRadius: 160,
  position: 'bottom',
  background: {
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
    blur: 0,
    opacity: 100,
  },
  language: 'en',
}

export interface DockConfigCtx {
  config: DockConfig
  setConfig: (patch: Partial<DockConfig>) => void
  chromeReady: boolean
}

export const DockConfigContext = createContext<DockConfigCtx>({
  config: DEFAULT_CONFIG,
  setConfig: () => {},
  chromeReady: false,
})

const SESSION_KEY = 'newtab_config_cache'

export function DockConfigProvider({ children }: { children: ReactNode }) {
  // 同步从 localStorage 读取上次 config，消除新开标签页/刷新时的空白帧
  const [config, setConfigState] = useState<DockConfig>(() => {
    try {
      const cached = localStorage.getItem(SESSION_KEY)
      if (cached) return { ...DEFAULT_CONFIG, ...JSON.parse(cached) }
    } catch { /* ignore */ }
    return DEFAULT_CONFIG
  })
  const [chromeReady, setChromeReady] = useState(false)

  // 异步从 chrome.storage.local 读取权威数据并覆盖
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (result[STORAGE_KEY]) {
        setConfigState({ ...DEFAULT_CONFIG, ...result[STORAGE_KEY] })
      }
      setChromeReady(true)
    })
  }, [])

  // config 变更时写入 chrome.storage（chrome 已就绪后）和 localStorage（始终）
  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(config))
    if (chromeReady) chrome.storage.local.set({ [STORAGE_KEY]: config })
  }, [config, chromeReady])

  const setConfig = (patch: Partial<DockConfig>) =>
    setConfigState((prev) => ({ ...prev, ...patch }))

  return (
    <DockConfigContext.Provider value={{ config, setConfig, chromeReady }}>
      {children}
    </DockConfigContext.Provider>
  )
}

export const useDockConfig = () => useContext(DockConfigContext)

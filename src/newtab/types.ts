export interface AppItem {
  id: string
  name: string
  emoji: string
  color: string
  url?: string
  iconUrl?: string   // if set, renders as <img> instead of emoji in dock
  // bookmark icon struct — populated by displayApps / addBookmarkToDock
  bmIconType?: 'url' | 'svg' | 'builtin' | 'text'
  bmIconValue?: string
  bmSvgColor?: string
  bmIconFit?: 'contain' | 'cover' | 'fill'
}

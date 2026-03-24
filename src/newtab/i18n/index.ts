import { useDockConfig } from '../store/dockConfig'
import zhCN from './locales/zh-CN'
import zhTW from './locales/zh-TW'
import en from './locales/en'
import ru from './locales/ru'
import ja from './locales/ja'
import ko from './locales/ko'

export type Locale = typeof zhCN

type LocaleKey = keyof Locale

const locales: Record<string, Locale> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en': en,
  'ru': ru,
  'ja': ja,
  'ko': ko,
}

export const LANGUAGES = [
  { code: 'zh-CN', labelKey: 'lang_zh_cn' as LocaleKey },
  { code: 'zh-TW', labelKey: 'lang_zh_tw' as LocaleKey },
  { code: 'en',    labelKey: 'lang_en'    as LocaleKey },
  { code: 'ru',    labelKey: 'lang_ru'    as LocaleKey },
  { code: 'ja',    labelKey: 'lang_ja'    as LocaleKey },
  { code: 'ko',    labelKey: 'lang_ko'    as LocaleKey },
]

export function useT() {
  const { config } = useDockConfig()
  const lang = (config as any).language || 'zh-CN'
  const locale: Locale = locales[lang] || zhCN

  return function t(key: LocaleKey, vars?: Record<string, string | number>): string {
    const template = (locale[key] ?? zhCN[key] ?? key) as string
    if (!vars) return template
    return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
  }
}

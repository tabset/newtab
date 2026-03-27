import { BUILTIN_SHADERS } from './builtinShaders'
import type { ShaderEffect } from './builtinShaders'

export type { ShaderEffect }

const CACHE_KEY = 'newtab_community_effects_cache'
const CACHE_TTL = 1000 * 60 * 60 * 6 // 6 hours

interface CacheEntry {
  effects: ShaderEffect[]
  fetchedAt: number
  url: string
}

export function getInstalledIds(installedEffects: ShaderEffect[]): Set<string> {
  return new Set(installedEffects.map(e => e.id))
}

export function getAllEffects(installedEffects: ShaderEffect[] = []): ShaderEffect[] {
  return [...BUILTIN_SHADERS, ...installedEffects.filter(e => !e.builtin)]
}

export function findEffect(id: string, installedEffects: ShaderEffect[] = []): ShaderEffect | undefined {
  return BUILTIN_SHADERS.find(e => e.id === id) || installedEffects.find(e => e.id === id)
}

export async function fetchCommunityEffects(remoteUrl: string): Promise<ShaderEffect[]> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const cache: CacheEntry = JSON.parse(raw)
      if (cache.url === remoteUrl && Date.now() - cache.fetchedAt < CACHE_TTL) {
        return cache.effects
      }
    }
  } catch {}

  const res = await fetch(remoteUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()

  const effects: ShaderEffect[] = Array.isArray(data) ? data : data.effects
  const valid = effects.filter(e => e.id && (e.name || e.nameKey) && typeof e.shader === 'string')

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ effects: valid, fetchedAt: Date.now(), url: remoteUrl }))
  } catch {}

  return valid
}

export function clearCommunityCache() {
  localStorage.removeItem(CACHE_KEY)
}

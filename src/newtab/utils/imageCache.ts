// 图片缓存工具 - 使用 IndexedDB 缓存图片 blob + 压缩

const DB_NAME = 'newtab_image_cache'
const STORE_NAME = 'images'
const ICON_STORE = 'icons'
const DB_VERSION = 2
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7天过期
const ICON_EXPIRY = 30 * 24 * 60 * 60 * 1000 // 图标30天过期

// 图片压缩配置
const MAX_WIDTH = 1920   // 最大宽度
const MAX_HEIGHT = 1080  // 最大高度
const QUALITY = 0.85     // 压缩质量 0-1

// 缩略图配置（用于快速预览）
const THUMB_WIDTH = 50
const THUMB_HEIGHT = 50
const THUMB_QUALITY = 0.3

interface CachedImage {
  url: string
  blob: Blob           // 压缩后的高清图
  thumbnail?: string   // base64缩略图（快速预览）
  timestamp: number
}

class ImageCache {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'url' })
        }
        if (!db.objectStoreNames.contains(ICON_STORE)) {
          db.createObjectStore(ICON_STORE, { keyPath: 'url' })
        }
      }
    })
  }

  async get(url: string): Promise<{ fullImage: string, thumbnail?: string } | null> {
    if (!this.db) await this.init()

    return new Promise((resolve) => {
      if (!this.db) {
        resolve(null)
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(url)

      request.onsuccess = () => {
        const data = request.result as CachedImage | undefined
        
        if (!data) {
          resolve(null)
          return
        }

        // 检查是否过期
        if (Date.now() - data.timestamp > CACHE_EXPIRY) {
          this.delete(url) // 异步删除过期数据
          resolve(null)
          return
        }

        // 将 blob 转换为 URL
        const blobUrl = URL.createObjectURL(data.blob)
        resolve({ 
          fullImage: blobUrl,
          thumbnail: data.thumbnail 
        })
      }

      request.onerror = () => resolve(null)
    })
  }

  async set(url: string, blob: Blob, thumbnail?: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      
      const data: CachedImage = {
        url,
        blob,
        thumbnail,
        timestamp: Date.now(),
      }

      const request = store.put(data)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async delete(url: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve) => {
      if (!this.db) {
        resolve()
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(url)
      
      request.onsuccess = () => resolve()
      request.onerror = () => resolve() // 即使失败也resolve
    })
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve) => {
      if (!this.db) {
        resolve()
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()
      
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
    })
  }
}

// 单例
export const imageCache = new ImageCache()

// ── 图标缓存（轻量，存 dataUrl，持久跨刷新）────────────────────

interface CachedIcon {
  url: string
  dataUrl: string
  timestamp: number
}

// 内存层，避免同一会话重复读 IndexedDB
const iconMemCache = new Map<string, string>()

async function getIconDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' })
      }
      if (!db.objectStoreNames.contains(ICON_STORE)) {
        db.createObjectStore(ICON_STORE, { keyPath: 'url' })
      }
    }
  })
}

async function getIconFromDb(url: string): Promise<string | null> {
  try {
    const db = await getIconDb()
    return new Promise((resolve) => {
      const tx = db.transaction([ICON_STORE], 'readonly')
      const req = tx.objectStore(ICON_STORE).get(url)
      req.onsuccess = () => {
        const data = req.result as CachedIcon | undefined
        if (!data || Date.now() - data.timestamp > ICON_EXPIRY) {
          resolve(null)
        } else {
          resolve(data.dataUrl)
        }
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function saveIconToDb(url: string, dataUrl: string): Promise<void> {
  try {
    const db = await getIconDb()
    return new Promise((resolve) => {
      const tx = db.transaction([ICON_STORE], 'readwrite')
      tx.objectStore(ICON_STORE).put({ url, dataUrl, timestamp: Date.now() })
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch { /* ignore */ }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * 加载书签图标并缓存到 IndexedDB（dataUrl 格式，离线可用）
 * - 优先返回缓存，避免网络请求
 * - fetch 失败（CORS / 无网络）时回退到原始 URL
 */
export async function loadIconWithCache(url: string): Promise<string> {
  if (!url) return url

  // 1. 内存层
  const mem = iconMemCache.get(url)
  if (mem) return mem

  // 2. IndexedDB 层
  const cached = await getIconFromDb(url)
  if (cached) {
    iconMemCache.set(url, cached)
    return cached
  }

  // 3. 网络获取（8s 超时）
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const resp = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const blob = await resp.blob()
    if (!blob.type.startsWith('image/')) throw new Error('not image')
    const dataUrl = await blobToDataUrl(blob)
    iconMemCache.set(url, dataUrl)
    saveIconToDb(url, dataUrl) // 异步写入，不阻塞返回
    return dataUrl
  } catch {
    // CORS 或无网络，回退原始 URL（有网时可显示）
    return url
  }
}

// 压缩图片
async function compressImage(blob: Blob): Promise<{ compressed: Blob, thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      
      try {
        // 计算压缩后的尺寸
        let { width, height } = img
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }
        
        // 创建高清压缩图
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        
        // 创建缩略图
        const thumbCanvas = document.createElement('canvas')
        thumbCanvas.width = THUMB_WIDTH
        thumbCanvas.height = THUMB_HEIGHT
        const thumbCtx = thumbCanvas.getContext('2d')!
        thumbCtx.drawImage(img, 0, 0, THUMB_WIDTH, THUMB_HEIGHT)
        const thumbnail = thumbCanvas.toDataURL('image/jpeg', THUMB_QUALITY)
        
        // 转换为 blob
        canvas.toBlob(
          (compressedBlob) => {
            if (compressedBlob) {
              resolve({ compressed: compressedBlob, thumbnail })
            } else {
              reject(new Error('压缩失败'))
            }
          },
          'image/jpeg',
          QUALITY
        )
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    
    img.src = url
  })
}

// 加载图片并缓存（带压缩）
export async function loadImageWithCache(url: string): Promise<{ 
  fullImage: string
  thumbnail?: string 
}> {
  try {
    // 1. 先尝试从缓存加载
    const cached = await imageCache.get(url)
    if (cached) {
      return cached
    }

    // 2. 从网络加载
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()

    // 3. 压缩图片（如果是图片类型）
    let finalBlob = blob
    let thumbnail: string | undefined
    
    if (blob.type.startsWith('image/')) {
      try {
        const compressed = await compressImage(blob)
        finalBlob = compressed.compressed
        thumbnail = compressed.thumbnail
        console.log(`图片压缩完成: ${(blob.size / 1024 / 1024).toFixed(2)}MB → ${(finalBlob.size / 1024 / 1024).toFixed(2)}MB`)
      } catch (err) {
        console.warn('图片压缩失败，使用原图:', err)
      }
    }

    // 4. 存入缓存
    await imageCache.set(url, finalBlob, thumbnail)

    // 5. 返回 blob URL 和缩略图
    return {
      fullImage: URL.createObjectURL(finalBlob),
      thumbnail
    }
  } catch (error) {
    console.error('加载图片失败:', url, error)
    // 失败时返回原始URL
    return { fullImage: url }
  }
}

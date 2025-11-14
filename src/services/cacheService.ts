// Redis-like cache service for frontend using localStorage
// Provides TTL (Time To Live) support and automatic cache invalidation

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL?: number // Default TTL in milliseconds (default: 5 minutes)
  prefix?: string // Prefix for all cache keys
  storage?: 'localStorage' | 'sessionStorage' // Storage type (default: localStorage)
}

class CacheService {
  private defaultTTL: number
  private prefix: string
  private storage: Storage

  constructor(config: CacheConfig = {}) {
    this.defaultTTL = config.defaultTTL || 5 * 60 * 1000 // 5 minutes default
    this.prefix = config.prefix || 'funzone_owner_cache_'
    this.storage = config.storage === 'sessionStorage' ? sessionStorage : localStorage
    
    // Clean up expired entries on initialization
    this.cleanExpired()
  }

  /**
   * Generate cache key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    const now = Date.now()
    return now - entry.timestamp > entry.ttl
  }

  /**
   * Get cached data by key
   */
  get<T>(key: string): T | null {
    try {
      const cacheKey = this.getKey(key)
      const cached = this.storage.getItem(cacheKey)
      
      if (!cached) {
        return null
      }

      const entry: CacheEntry<T> = JSON.parse(cached)
      
      // Check if expired
      if (this.isExpired(entry)) {
        this.delete(key)
        return null
      }

      return entry.data
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): boolean {
    try {
      const cacheKey = this.getKey(key)
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
      }

      this.storage.setItem(cacheKey, JSON.stringify(entry))
      return true
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
      
      // If storage is full, try to clean expired entries and retry
      if (error instanceof DOMException && error.code === 22) {
        this.cleanExpired()
        try {
          this.storage.setItem(this.getKey(key), JSON.stringify({
            data,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
          }))
          return true
        } catch (retryError) {
          console.error(`Cache set retry failed for key ${key}:`, retryError)
          return false
        }
      }
      
      return false
    }
  }

  /**
   * Delete cached data by key
   */
  delete(key: string): boolean {
    try {
      const cacheKey = this.getKey(key)
      this.storage.removeItem(cacheKey)
      return true
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error)
      return false
    }
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Clear all cache entries with the prefix
   */
  clear(): void {
    try {
      const keys = Object.keys(this.storage)
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          this.storage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Cache clear error:', error)
    }
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    try {
      const allKeys = Object.keys(this.storage)
      return allKeys
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.replace(this.prefix, ''))
    } catch (error) {
      console.error('Cache keys error:', error)
      return []
    }
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    try {
      const keys = this.keys()
      keys.forEach(key => {
        const cached = this.storage.getItem(this.getKey(key))
        if (cached) {
          try {
            const entry: CacheEntry<any> = JSON.parse(cached)
            if (this.isExpired(entry)) {
              this.delete(key)
            }
          } catch (error) {
            // Invalid entry, remove it
            this.delete(key)
          }
        }
      })
    } catch (error) {
      console.error('Cache clean expired error:', error)
    }
  }

  /**
   * Delete entries matching a pattern
   */
  deletePattern(pattern: string | RegExp): number {
    let deletedCount = 0
    try {
      const keys = this.keys()
      keys.forEach(key => {
        const matches = typeof pattern === 'string' 
          ? key.includes(pattern)
          : pattern.test(key)
        
        if (matches) {
          this.delete(key)
          deletedCount++
        }
      })
    } catch (error) {
      console.error('Cache delete pattern error:', error)
    }
    return deletedCount
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const keys = this.keys()
    let totalSize = 0
    let expiredCount = 0

    keys.forEach(key => {
      const cached = this.storage.getItem(this.getKey(key))
      if (cached) {
        totalSize += cached.length
        try {
          const entry: CacheEntry<any> = JSON.parse(cached)
          if (this.isExpired(entry)) {
            expiredCount++
          }
        } catch (error) {
          // Invalid entry
        }
      }
    })

    return {
      totalKeys: keys.length,
      expiredKeys: expiredCount,
      totalSize: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
    }
  }

  /**
   * Set with tags for easier invalidation
   */
  setWithTags<T>(key: string, data: T, tags: string[], ttl?: number): boolean {
    const success = this.set(key, data, ttl)
    if (success) {
      // Store tags for this key
      tags.forEach(tag => {
        const tagKey = `tag_${tag}`
        const tagKeys = this.get<string[]>(tagKey) || []
        if (!tagKeys.includes(key)) {
          tagKeys.push(key)
          this.set(tagKey, tagKeys, ttl || this.defaultTTL)
        }
      })
    }
    return success
  }

  /**
   * Invalidate cache by tag
   */
  invalidateTag(tag: string): number {
    const tagKey = `tag_${tag}`
    const keys = this.get<string[]>(tagKey) || []
    let deletedCount = 0

    keys.forEach(key => {
      if (this.delete(key)) {
        deletedCount++
      }
    })

    // Delete the tag itself
    this.delete(tagKey)
    return deletedCount
  }
}

// Create singleton instance
export const cacheService = new CacheService({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  prefix: 'funzone_owner_cache_',
  storage: 'localStorage',
})

// Export class for custom instances
export default CacheService


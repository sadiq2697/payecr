import AsyncStorage from '@react-native-async-storage/async-storage';

class CacheService {
  constructor() {
    this.cache = new Map();
    this.cacheConfig = {
      default: { maxAge: 300000, maxSize: 100 }, // 5 minutes, 100 entries
      api: { maxAge: 600000, maxSize: 200 }, // 10 minutes, 200 entries
      device: { maxAge: 3600000, maxSize: 50 }, // 1 hour, 50 entries
      transaction: { maxAge: 86400000, maxSize: 1000 }, // 24 hours, 1000 entries
      settings: { maxAge: Infinity, maxSize: 50 }, // Permanent, 50 entries
    };
    this.lastCleanup = Date.now();
    this.cleanupInterval = 300000; // 5 minutes
  }

  getCacheKey(namespace, key, params = {}) {
    const paramString = Object.keys(params).length > 0 
      ? JSON.stringify(params) 
      : '';
    return `${namespace}:${key}${paramString ? `:${paramString}` : ''}`;
  }

  async get(namespace, key, params = {}, options = {}) {
    const cacheKey = this.getCacheKey(namespace, key, params);
    const config = this.cacheConfig[namespace] || this.cacheConfig.default;
    
    // Check memory cache first
    if (this.cache.has(cacheKey)) {
      const item = this.cache.get(cacheKey);
      if (Date.now() - item.timestamp < config.maxAge) {
        return { data: item.data, source: 'memory' };
      }
      // Expired, remove from memory
      this.cache.delete(cacheKey);
    }

    // Check persistent storage
    try {
      const stored = await AsyncStorage.getItem(`cache:${cacheKey}`);
      if (stored) {
        const item = JSON.parse(stored);
        if (Date.now() - item.timestamp < config.maxAge) {
          // Update memory cache
          this.cache.set(cacheKey, item);
          return { data: item.data, source: 'storage' };
        } else {
          // Expired, remove from storage
          await AsyncStorage.removeItem(`cache:${cacheKey}`);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }

    return null;
  }

  async set(namespace, key, data, params = {}, options = {}) {
    const cacheKey = this.getCacheKey(namespace, key, params);
    const config = this.cacheConfig[namespace] || this.cacheConfig.default;
    const item = {
      data,
      timestamp: Date.now(),
      namespace,
      key,
      params,
    };

    // Store in memory cache
    this.cache.set(cacheKey, item);

    // Enforce memory cache size limit
    if (this.cache.size > config.maxSize) {
      const entries = Array.from(this.cache.entries())
        .filter(([k]) => k.startsWith(`${namespace}:`))
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, entries.length - config.maxSize);
      toRemove.forEach(([k]) => this.cache.delete(k));
    }

    // Store in persistent storage (unless memory-only)
    if (!options.memoryOnly) {
      try {
        await AsyncStorage.setItem(`cache:${cacheKey}`, JSON.stringify(item));
      } catch (error) {
        console.warn('Cache write error:', error);
      }
    }

    // Periodic cleanup
    this.performCleanupIfNeeded();
  }

  async invalidate(namespace, key = null, params = {}) {
    if (key) {
      const cacheKey = this.getCacheKey(namespace, key, params);
      this.cache.delete(cacheKey);
      try {
        await AsyncStorage.removeItem(`cache:${cacheKey}`);
      } catch (error) {
        console.warn('Cache invalidation error:', error);
      }
    } else {
      // Invalidate entire namespace
      const keysToDelete = [];
      for (const [k] of this.cache.entries()) {
        if (k.startsWith(`${namespace}:`)) {
          keysToDelete.push(k);
        }
      }
      keysToDelete.forEach(k => this.cache.delete(k));

      // Clear from persistent storage
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const namespaceKeys = allKeys.filter(k => k.startsWith(`cache:${namespace}:`));
        if (namespaceKeys.length > 0) {
          await AsyncStorage.multiRemove(namespaceKeys);
        }
      } catch (error) {
        console.warn('Cache namespace invalidation error:', error);
      }
    }
  }

  async clear() {
    this.cache.clear();
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('cache:'));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  async performCleanupIfNeeded() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;
    await this.cleanup();
  }

  async cleanup() {
    // Clean memory cache
    const memoryKeysToDelete = [];
    for (const [cacheKey, item] of this.cache.entries()) {
      const namespace = item.namespace || 'default';
      const config = this.cacheConfig[namespace] || this.cacheConfig.default;
      
      if (Date.now() - item.timestamp >= config.maxAge) {
        memoryKeysToDelete.push(cacheKey);
      }
    }
    memoryKeysToDelete.forEach(key => this.cache.delete(key));

    // Clean persistent storage
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('cache:'));
      
      const expiredKeys = [];
      for (const key of cacheKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const item = JSON.parse(stored);
            const namespace = item.namespace || 'default';
            const config = this.cacheConfig[namespace] || this.cacheConfig.default;
            
            if (Date.now() - item.timestamp >= config.maxAge) {
              expiredKeys.push(key);
            }
          }
        } catch (error) {
          // Invalid cache entry, mark for deletion
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }

  getCacheStats() {
    const stats = {
      memoryEntries: this.cache.size,
      namespaces: {},
    };

    for (const [cacheKey, item] of this.cache.entries()) {
      const namespace = item.namespace || 'default';
      if (!stats.namespaces[namespace]) {
        stats.namespaces[namespace] = {
          entries: 0,
          oldestEntry: Date.now(),
          newestEntry: 0,
        };
      }
      
      stats.namespaces[namespace].entries++;
      stats.namespaces[namespace].oldestEntry = Math.min(
        stats.namespaces[namespace].oldestEntry,
        item.timestamp
      );
      stats.namespaces[namespace].newestEntry = Math.max(
        stats.namespaces[namespace].newestEntry,
        item.timestamp
      );
    }

    return stats;
  }

  async warmup(entries = []) {
    const promises = entries.map(({ namespace, key, fetcher, params = {} }) => {
      return this.getOrFetch(namespace, key, fetcher, params);
    });
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Cache warmup error:', error);
    }
  }

  async getOrFetch(namespace, key, fetcher, params = {}, options = {}) {
    const cached = await this.get(namespace, key, params, options);
    if (cached) {
      return cached.data;
    }

    try {
      const data = await fetcher(params);
      await this.set(namespace, key, data, params, options);
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Specialized cache methods for common use cases
  async cacheAPIResponse(endpoint, response, params = {}) {
    return this.set('api', endpoint, response, params);
  }

  async getCachedAPIResponse(endpoint, params = {}) {
    return this.get('api', endpoint, params);
  }

  async cacheDeviceInfo(deviceId, deviceInfo) {
    return this.set('device', deviceId, deviceInfo);
  }

  async getCachedDeviceInfo(deviceId) {
    return this.get('device', deviceId);
  }

  async cacheTransaction(transactionId, transaction) {
    return this.set('transaction', transactionId, transaction);
  }

  async getCachedTransaction(transactionId) {
    return this.get('transaction', transactionId);
  }

  async cacheSettings(key, value) {
    return this.set('settings', key, value);
  }

  async getCachedSettings(key) {
    return this.get('settings', key);
  }
}

export default new CacheService();
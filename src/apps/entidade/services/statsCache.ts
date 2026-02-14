import { EntityProductionRecord } from './goalService';

interface ProductionCacheEntry {
    data: EntityProductionRecord[];
    timestamp: number;
    year: string;
}

// In-Memory map to track active promises (deduplication)
const activeRequests = new Map<string, Promise<EntityProductionRecord[]>>();

// In-Memory data cache (Hot Cache) - Avoids JSON.parse on every switching tab
const memoryCache = new Map<string, ProductionCacheEntry>();

// 30 Minutes Cache (More aggressive since we have invalidations)
const CACHE_VALIDITY_MS = 30 * 60 * 1000;
const CACHE_VERSION = 'v2.0'; // Bumped to invalidate cache after connector query refactor

export const statsCache = {
    /**
     * Tries to get data from:
     * 1. Memory Cache (Fastest)
     * 2. LocalStorage (Persisted)
     * 3. Fetch (Slowest)
     */
    getOrFetch: async (
        entityId: string,
        year: string,
        fetcher: () => Promise<EntityProductionRecord[]>
    ): Promise<EntityProductionRecord[]> => {
        const key = `PROBPA_STATS_${entityId}_${year}_${CACHE_VERSION}`;

        // 1. Check Memory Cache (Hot)
        const cached = memoryCache.get(key);
        if (cached && (Date.now() - cached.timestamp < CACHE_VALIDITY_MS)) {
            // console.log(`[StatsCache] Memory Cache HIT for ${key}`);
            return cached.data;
        }

        // 2. LocalStorage DISABLED due to QuotaExceededError with large connector datasets
        // const fromStorage = loadFromStorage(key);
        // if (fromStorage) {
        //     // console.log(`[StatsCache] Disk Cache HIT for ${key}`);
        //     // Hydrate Memory Cache
        //     memoryCache.set(key, { data: fromStorage, timestamp: Date.now(), year });
        //     return fromStorage;
        // }
        // console.log(`[StatsCache] Cache MISS for ${key} - Fetching...`);

        // 3. Check Active Requests (Promise Deduplication)
        if (activeRequests.has(key)) {
            // Join the existing request!
            return activeRequests.get(key) as Promise<EntityProductionRecord[]>;
        }

        // 4. Start New Request
        const promise = fetcher().then(data => {
            const entry = { data, timestamp: Date.now(), year };

            // Save to Memory
            memoryCache.set(key, entry);

            // Save to LS - DISABLED due to QuotaExceededError with large connector datasets
            // saveToStorage(key, data, year);

            activeRequests.delete(key); // Cleanup
            return data;
        }).catch(err => {
            activeRequests.delete(key); // Cleanup on error
            throw err;
        });

        activeRequests.set(key, promise);
        return promise;
    },

    invalidate: (entityId: string, year?: string) => {
        // Clear from LS and Memory
        if (year) {
            const key = `PROBPA_STATS_${entityId}_${year}`;
            localStorage.removeItem(key);
            memoryCache.delete(key);
        } else {
            // Clear all years for this entity
            const prefix = `PROBPA_STATS_${entityId}_`;

            // Clear Memory
            for (const key of memoryCache.keys()) {
                if (key.startsWith(prefix)) {
                    memoryCache.delete(key);
                }
            }

            // Clear LS
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith(prefix)) {
                    localStorage.removeItem(k);
                }
            });
        }
    }
};

// --- Helpers ---

function loadFromStorage(key: string): EntityProductionRecord[] | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const entry: ProductionCacheEntry = JSON.parse(raw);
        if (!entry || !entry.data) return null;

        // Expiration Check
        if ((Date.now() - entry.timestamp) > CACHE_VALIDITY_MS) {
            localStorage.removeItem(key);
            return null;
        }

        return entry.data;

    } catch (e) {
        console.warn('Failed to load stats from cache', e);
        return null;
    }
}

function saveToStorage(key: string, data: EntityProductionRecord[], year: string) {
    try {
        const entry: ProductionCacheEntry = {
            data,
            timestamp: Date.now(),
            year
        };
        localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
        console.warn('Failed to save stats to cache (quota?)', e);
    }
}


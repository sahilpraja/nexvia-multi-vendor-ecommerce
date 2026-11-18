import Redis from 'ioredis';
import { config } from './index.js';

// ── In-memory fallback when Redis is unavailable ──
const memoryStore = new Map<string, { value: string; expiresAt: number | null }>();

export const memGet = (key: string): string | null => {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

export const memSet = (key: string, value: string, ttl?: number) => {
  memoryStore.set(key, {
    value,
    expiresAt: ttl ? Date.now() + ttl * 1000 : null,
  });
};

export const memDel = (key: string) => {
  memoryStore.delete(key);
};

// ── Redis client (may fail to connect) ──
let redisReady = false;

const redisClient = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  connectTimeout: 2000,
  retryStrategy: (times) => {
    if (times > 2) return null;
    return Math.min(times * 200, 1000);
  },
  lazyConnect: true,
});

redisClient.on('connect', () => {
  redisReady = true;
  console.log('✅ Connected to Redis successfully');
});

redisClient.on('error', (err) => {
  if (!redisReady) {
    // only log once
  }
});

redisClient.on('end', () => {
  redisReady = false;
});

// Try connecting but don't block startup
redisClient.connect().catch(() => {
  console.warn('⚠️  Redis not reachable — using in-memory cart store.');
});

export const redis = redisClient;
export const isRedisReady = () => redisReady;

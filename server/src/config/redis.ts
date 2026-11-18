import Redis from 'ioredis';
import { config } from './index.js';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) {
          console.warn('⚠️  Redis connection attempts exceeded limit. Operating in degraded mode.');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      console.log('✅ Connected to Redis successfully');
    });

    redisClient.on('error', (err) => {
      console.warn('⚠️  Redis Client Warning/Error:', err.message);
    });
  }

  return redisClient;
};

export const redis = getRedisClient();

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/marketplace_db?schema=public',
  redisUrl: (process.env.REDIS_URL || 'redis://localhost:6379')
    .trim()
    .replace(/^["']|["']$/g, ''),
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  elasticsearchIndex: process.env.ELASTICSEARCH_INDEX || 'products',
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
    bucketName: process.env.S3_BUCKET_NAME || 'marketplace-images',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || true,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'jwt_access_secret_development_fallback_key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'jwt_refresh_secret_development_fallback_key',
    accessExpiry: '15m',
    refreshExpiryDays: 7,
  },
  commissionPercent: parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '10'),
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
  },
};

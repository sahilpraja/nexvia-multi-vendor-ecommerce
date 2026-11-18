import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

export const createApp = () => {
  const app = express();

  // Security Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-session-id'],
    })
  );

  // Body Parsing Middlewares with raw body capture for Stripe Webhook signature verification
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // API V1 Routes
  app.use('/api/v1', apiRouter);

  // Root welcome route
  app.get('/', (_req, res) => {
    res.json({
      message: 'Nexvia Multi-Vendor Marketplace API is active',
      documentation: '/docs',
      health: '/api/v1/health',
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

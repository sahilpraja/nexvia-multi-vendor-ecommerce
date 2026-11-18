import { Router } from 'express';
import authRoutes from './auth.routes.js';
import vendorRoutes from './vendor.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import reviewRoutes from './review.routes.js';
import couponRoutes from './coupon.routes.js';
import analyticsRoutes from './analytics.routes.js';

const apiRouter = Router();

// Health check endpoint (PRD 8 Observability)
apiRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'multi-vendor-marketplace-api',
  });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/', vendorRoutes);
apiRouter.use('/', productRoutes);
apiRouter.use('/', categoryRoutes);
apiRouter.use('/', cartRoutes);
apiRouter.use('/', orderRoutes);
apiRouter.use('/', paymentRoutes);
apiRouter.use('/', reviewRoutes);
apiRouter.use('/', couponRoutes);
apiRouter.use('/', analyticsRoutes);

export default apiRouter;

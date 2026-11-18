import { Router } from 'express';
import {
  getAnalyticsSummary,
  getRevenueOverTime,
  getTopVendors,
  getTopProducts,
  exportCsv,
} from '../controllers/analytics.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate, requireRole(['ADMIN']));

router.get('/admin/analytics/summary', getAnalyticsSummary);
router.get('/admin/analytics/revenue', getRevenueOverTime);
router.get('/admin/analytics/top-vendors', getTopVendors);
router.get('/admin/analytics/top-products', getTopProducts);
router.get('/admin/analytics/export-csv', exportCsv);

export default router;

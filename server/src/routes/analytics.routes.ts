import { Router } from 'express';
import {
  getAnalyticsSummary,
  getRevenueOverTime,
  getTopVendors,
  getTopProducts,
  exportCsv,
  getDashboardStats,
} from '../controllers/analytics.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/admin/analytics/summary', authenticate, requireRole(['ADMIN']), getAnalyticsSummary);
router.get('/admin/analytics/dashboard-stats', authenticate, requireRole(['ADMIN']), getDashboardStats);
router.get('/admin/analytics/revenue', authenticate, requireRole(['ADMIN']), getRevenueOverTime);
router.get('/admin/analytics/top-vendors', authenticate, requireRole(['ADMIN']), getTopVendors);
router.get('/admin/analytics/top-products', authenticate, requireRole(['ADMIN']), getTopProducts);
router.get('/admin/analytics/export-csv', authenticate, requireRole(['ADMIN']), exportCsv);

export default router;

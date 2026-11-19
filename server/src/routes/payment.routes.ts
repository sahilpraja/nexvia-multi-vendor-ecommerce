import { Router } from 'express';
import {
  createCheckoutSession,
  getSessionStatus,
  handleStripeWebhook,
  createPaymentIntent,
  getVendorEarnings,
  confirmCodCollection,
  refundPayment,
  getAdminPayments,
  getAdminPaymentStats,
} from '../controllers/payment.controller.js';
import {
  authenticate,
  requireApprovedVendor,
  requireRole,
} from '../middlewares/auth.middleware.js';

const router = Router();

// Stripe Checkout Session APIs
router.post('/payment/create-checkout-session', authenticate, createCheckoutSession);
router.get('/payment/session/:id', authenticate, getSessionStatus);
router.post('/payment/webhook', handleStripeWebhook);

// Backward-compatible routes
router.post('/payments/create-intent', authenticate, createPaymentIntent);
router.post('/payments/webhook', handleStripeWebhook);

// Vendor Earnings
router.get('/vendor/earnings', authenticate, requireApprovedVendor, getVendorEarnings);

// Admin Payment & COD Management APIs
router.get('/admin/payments', authenticate, requireRole(['ADMIN']), getAdminPayments);
router.get('/admin/payments/stats', authenticate, requireRole(['ADMIN']), getAdminPaymentStats);
router.post('/admin/payments/:id/confirm-cod', authenticate, requireRole(['ADMIN']), confirmCodCollection);
router.post('/admin/payments/:id/refund', authenticate, requireRole(['ADMIN']), refundPayment);

export default router;

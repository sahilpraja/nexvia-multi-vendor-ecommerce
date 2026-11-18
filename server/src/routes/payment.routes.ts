import { Router } from 'express';
import {
  createCheckoutSession,
  getSessionStatus,
  handleStripeWebhook,
  createPaymentIntent,
  getVendorEarnings,
} from '../controllers/payment.controller.js';
import {
  authenticate,
  requireApprovedVendor,
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

export default router;

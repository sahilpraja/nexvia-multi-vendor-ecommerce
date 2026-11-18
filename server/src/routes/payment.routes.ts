import { Router } from 'express';
import {
  createPaymentIntent,
  handlePaymentWebhook,
  getVendorEarnings,
} from '../controllers/payment.controller.js';
import {
  authenticate,
  requireApprovedVendor,
} from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/payments/create-intent', authenticate, createPaymentIntent);
router.post('/payments/webhook', handlePaymentWebhook);
router.get('/vendor/earnings', authenticate, requireApprovedVendor, getVendorEarnings);

export default router;

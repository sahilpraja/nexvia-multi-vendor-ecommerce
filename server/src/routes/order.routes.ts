import { Router } from 'express';
import {
  checkout,
  listCustomerOrders,
  getOrderById,
  cancelOrder,
  downloadInvoice,
  listVendorSubOrders,
  updateSubOrderStatus,
} from '../controllers/order.controller.js';
import {
  authenticate,
  requireApprovedVendor,
} from '../middlewares/auth.middleware.js';

const router = Router();

// Customer Orders & Checkout
router.post('/checkout', authenticate, checkout);
router.get('/orders', authenticate, listCustomerOrders);
router.get('/orders/my-orders', authenticate, listCustomerOrders);
router.get('/orders/:id', authenticate, getOrderById);
router.post('/orders/:id/cancel', authenticate, cancelOrder);
router.get('/orders/:id/invoice', authenticate, downloadInvoice);

// Vendor Sub-order Fulfillment
router.get('/vendor/orders', authenticate, requireApprovedVendor, listVendorSubOrders);
router.patch('/vendor/suborders/:id/status', authenticate, requireApprovedVendor, updateSubOrderStatus);

export default router;

import { Router } from 'express';
import {
  checkout,
  listCustomerOrders,
  getOrderById,
  cancelOrder,
  downloadInvoice,
  listVendorSubOrders,
  updateSubOrderStatus,
  listAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
} from '../controllers/order.controller.js';
import {
  authenticate,
  requireRole,
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

// Admin Order Management
router.get('/admin/orders', authenticate, requireRole(['ADMIN']), listAdminOrders);
router.get('/admin/orders/:id', authenticate, requireRole(['ADMIN']), getAdminOrderById);
router.patch('/admin/orders/:id/status', authenticate, requireRole(['ADMIN']), updateAdminOrderStatus);

export default router;

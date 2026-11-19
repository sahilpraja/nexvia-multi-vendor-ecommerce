import { Router } from 'express';
import {
  listCouponsAdmin,
  createCouponAdmin,
  updateCouponAdmin,
  deleteCouponAdmin,
} from '../controllers/coupon.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/admin/coupons', authenticate, requireRole(['ADMIN']), listCouponsAdmin);
router.post('/admin/coupons', authenticate, requireRole(['ADMIN']), createCouponAdmin);
router.patch('/admin/coupons/:id', authenticate, requireRole(['ADMIN']), updateCouponAdmin);
router.delete('/admin/coupons/:id', authenticate, requireRole(['ADMIN']), deleteCouponAdmin);

export default router;

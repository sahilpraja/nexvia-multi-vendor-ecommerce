import { Router } from 'express';
import {
  listCouponsAdmin,
  createCouponAdmin,
  updateCouponAdmin,
  deleteCouponAdmin,
} from '../controllers/coupon.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate, requireRole(['ADMIN']));

router.get('/admin/coupons', listCouponsAdmin);
router.post('/admin/coupons', createCouponAdmin);
router.patch('/admin/coupons/:id', updateCouponAdmin);
router.delete('/admin/coupons/:id', deleteCouponAdmin);

export default router;

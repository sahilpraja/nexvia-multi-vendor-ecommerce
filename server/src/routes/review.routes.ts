import { Router } from 'express';
import {
  listProductReviews,
  createReview,
  deleteReviewAdmin,
} from '../controllers/review.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/products/:id/reviews', listProductReviews);
router.post('/products/:id/reviews', authenticate, createReview);
router.delete('/admin/reviews/:id', authenticate, requireRole(['ADMIN']), deleteReviewAdmin);

export default router;

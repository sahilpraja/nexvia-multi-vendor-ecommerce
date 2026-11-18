import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
} from '../controllers/category.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validations/category.validation.js';

const router = Router();

router.get('/categories', listCategories);
router.post(
  '/admin/categories',
  authenticate,
  requireRole(['ADMIN']),
  validateRequest(createCategorySchema),
  createCategory
);
router.patch(
  '/admin/categories/:id',
  authenticate,
  requireRole(['ADMIN']),
  validateRequest(updateCategorySchema),
  updateCategory
);

export default router;

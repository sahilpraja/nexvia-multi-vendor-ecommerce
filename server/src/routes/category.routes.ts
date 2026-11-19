import { Router } from 'express';
import {
  listCategories,
  listAdminCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validations/category.validation.js';

const router = Router();

// Public route for storefront navigation
router.get('/categories', listCategories);

// Admin Category Management Routes
router.get(
  '/admin/categories',
  authenticate,
  requireRole(['ADMIN']),
  listAdminCategories
);

router.get(
  '/admin/categories/:id',
  authenticate,
  requireRole(['ADMIN']),
  getCategoryById
);

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

router.delete(
  '/admin/categories/:id',
  authenticate,
  requireRole(['ADMIN']),
  deleteCategory
);

export default router;

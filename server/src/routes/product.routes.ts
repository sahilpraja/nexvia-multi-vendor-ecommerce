import { Router } from 'express';
import {
  listPublicProducts,
  getProductById,
  listVendorProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';
import { presignUpload } from '../controllers/upload.controller.js';
import {
  authenticate,
  requireApprovedVendor,
} from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  presignUploadSchema,
} from '../validations/product.validation.js';

const router = Router();

// Public Product Catalog & Search
router.get('/products', listPublicProducts);
router.get('/products/:id', getProductById);

// Vendor-specific Product Management
router.get('/vendor/products', authenticate, requireApprovedVendor, listVendorProducts);
router.post(
  '/vendor/products',
  authenticate,
  requireApprovedVendor,
  validateRequest(createProductSchema),
  createProduct
);
router.patch(
  '/vendor/products/:id',
  authenticate,
  requireApprovedVendor,
  validateRequest(updateProductSchema),
  updateProduct
);
router.delete('/vendor/products/:id', authenticate, requireApprovedVendor, deleteProduct);

// S3 Pre-signed Upload URL
router.post(
  '/uploads/presign',
  authenticate,
  requireApprovedVendor,
  validateRequest(presignUploadSchema),
  presignUpload
);

export default router;

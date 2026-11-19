import { Router } from 'express';
import {
  applyVendor,
  getMyVendorProfile,
  updateMyVendorProfile,
  listVendorsAdmin,
  getVendorDetailsAdmin,
  updateVendorStatusAdmin,
} from '../controllers/vendor.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  applyVendorSchema,
  updateVendorProfileSchema,
  updateVendorStatusSchema,
} from '../validations/vendor.validation.js';

const router = Router();

// Vendor Self Routes
router.post('/vendors/apply', authenticate, validateRequest(applyVendorSchema), applyVendor);
router.get('/vendors/me', authenticate, getMyVendorProfile);
router.patch(
  '/vendors/me',
  authenticate,
  validateRequest(updateVendorProfileSchema),
  updateMyVendorProfile
);

// Admin Vendor Approval & Moderation Routes
router.get('/admin/vendors', authenticate, requireRole(['ADMIN']), listVendorsAdmin);
router.get('/admin/vendors/:id', authenticate, requireRole(['ADMIN']), getVendorDetailsAdmin);
router.patch(
  '/admin/vendors/:id/status',
  authenticate,
  requireRole(['ADMIN']),
  validateRequest(updateVendorStatusSchema),
  updateVendorStatusAdmin
);

export default router;

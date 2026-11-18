import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError, sendResponse } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const listCouponsAdmin = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const coupons = await prisma.coupon.findMany({
      include: {
        _count: { select: { redemptions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse(res, 200, true, 'Coupons retrieved', coupons);
  } catch (error) {
    return next(error);
  }
};

export const createCouponAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      code,
      type,
      value,
      minOrder,
      maxDiscount,
      usageLimit,
      perUserLimit,
      expiresAt,
      active,
    } = req.body;

    const existing = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existing) {
      return next(ApiError.conflict('Coupon code already exists'));
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        type: type || 'PERCENT',
        value,
        minOrder: minOrder || 0,
        maxDiscount,
        usageLimit,
        perUserLimit: perUserLimit || 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        active: active !== undefined ? active : true,
      },
    });

    return sendResponse(res, 201, true, 'Coupon created successfully', coupon);
  } catch (error) {
    return next(error);
  }
};

export const updateCouponAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      code,
      type,
      value,
      minOrder,
      maxDiscount,
      usageLimit,
      perUserLimit,
      expiresAt,
      active,
    } = req.body;

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(type && { type }),
        ...(value !== undefined && { value }),
        ...(minOrder !== undefined && { minOrder }),
        ...(maxDiscount !== undefined && { maxDiscount }),
        ...(usageLimit !== undefined && { usageLimit }),
        ...(perUserLimit !== undefined && { perUserLimit }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(active !== undefined && { active }),
      },
    });

    return sendResponse(res, 200, true, 'Coupon updated successfully', coupon);
  } catch (error) {
    return next(error);
  }
};

export const deleteCouponAdmin = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = _req.params;
    await prisma.coupon.delete({ where: { id } });
    return sendResponse(res, 200, true, 'Coupon deleted successfully');
  } catch (error) {
    return next(error);
  }
};

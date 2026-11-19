import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError, sendResponse } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const listAddresses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return sendResponse(res, 200, true, 'Customer addresses retrieved', addresses);
  } catch (error) {
    return next(error);
  }
};

export const createAddress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { fullName, line1, line2, city, state, postalCode, country, phone, isDefault } = req.body;

    if (!line1 || !city || !state || !postalCode || !phone) {
      return next(
        ApiError.badRequest('Street address, city, state, postal code, and phone are required')
      );
    }

    const existingCount = await prisma.address.count({ where: { userId } });
    const shouldBeDefault = isDefault || existingCount === 0;

    const address = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return await tx.address.create({
        data: {
          userId,
          fullName: fullName?.trim() || req.user!.email,
          line1: line1.trim(),
          line2: line2?.trim() || null,
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country: country?.trim() || 'US',
          phone: phone.trim(),
          isDefault: shouldBeDefault,
        },
      });
    });

    return sendResponse(res, 201, true, 'Address saved successfully', address);
  } catch (error) {
    return next(error);
  }
};

export const updateAddress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { fullName, line1, line2, city, state, postalCode, country, phone, isDefault } = req.body;

    const existing = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return next(ApiError.notFound('Address not found or unauthorized'));
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return await tx.address.update({
        where: { id },
        data: {
          ...(fullName !== undefined && { fullName: fullName?.trim() }),
          ...(line1 && { line1: line1.trim() }),
          ...(line2 !== undefined && { line2: line2?.trim() || null }),
          ...(city && { city: city.trim() }),
          ...(state && { state: state.trim() }),
          ...(postalCode && { postalCode: postalCode.trim() }),
          ...(country && { country: country.trim() }),
          ...(phone && { phone: phone.trim() }),
          ...(isDefault !== undefined && { isDefault }),
        },
      });
    });

    return sendResponse(res, 200, true, 'Address updated successfully', updated);
  } catch (error) {
    return next(error);
  }
};

export const deleteAddress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return next(ApiError.notFound('Address not found or unauthorized'));
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });

      // If deleted address was default, promote the newest remaining address as default
      if (existing.isDefault) {
        const nextAddress = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (nextAddress) {
          await tx.address.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return sendResponse(res, 200, true, 'Address deleted successfully');
  } catch (error) {
    return next(error);
  }
};

export const setDefaultAddress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return next(ApiError.notFound('Address not found or unauthorized'));
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return await tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    return sendResponse(res, 200, true, 'Default delivery address updated', updated);
  } catch (error) {
    return next(error);
  }
};

import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError, sendResponse } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const applyVendor = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { storeName, description, payoutAccountId } = req.body;

    const existingProfile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      return next(ApiError.conflict('A vendor profile already exists for this account'));
    }

    const [vendor] = await prisma.$transaction([
      prisma.vendorProfile.create({
        data: {
          userId,
          storeName,
          description,
          payoutAccountId,
          status: 'PENDING',
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { role: 'VENDOR' },
      }),
    ]);

    return sendResponse(res, 201, true, 'Vendor application submitted for admin approval', vendor);
  } catch (error) {
    return next(error);
  }
};

export const getMyVendorProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId },
      include: {
        _count: {
          select: { products: true, subOrders: true },
        },
      },
    });

    if (!vendor) {
      return next(ApiError.notFound('Vendor profile not found'));
    }

    return sendResponse(res, 200, true, 'Vendor profile retrieved', vendor);
  } catch (error) {
    return next(error);
  }
};

export const updateMyVendorProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { storeName, description, payoutAccountId } = req.body;

    const vendor = await prisma.vendorProfile.update({
      where: { userId },
      data: {
        ...(storeName && { storeName }),
        ...(description !== undefined && { description }),
        ...(payoutAccountId && { payoutAccountId }),
      },
    });

    return sendResponse(res, 200, true, 'Vendor profile updated', vendor);
  } catch (error) {
    return next(error);
  }
};

export const listVendorsAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const status = req.query.status as any;
    const search = req.query.search as string;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 20);

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { storeName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, vendors] = await Promise.all([
      prisma.vendorProfile.count({ where }),
      prisma.vendorProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              addresses: { take: 1, select: { phone: true, city: true, country: true } },
            },
          },
          _count: {
            select: { products: true, subOrders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return sendResponse(res, 200, true, 'Vendors retrieved', {
      vendors: vendors.map((v) => ({
        ...v,
        phone: v.user.addresses?.[0]?.phone || null,
        city: v.user.addresses?.[0]?.city || null,
        country: v.user.addresses?.[0]?.country || null,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getVendorDetailsAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            addresses: true,
          },
        },
        products: {
          take: 20,
          where: { deletedAt: null },
          include: {
            category: { select: { id: true, name: true } },
            images: { take: 1, orderBy: { position: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { products: true, subOrders: true },
        },
      },
    });

    if (!vendor) {
      return next(ApiError.notFound('Vendor profile not found'));
    }

    return sendResponse(res, 200, true, 'Vendor details retrieved', {
      ...vendor,
      phone: vendor.user.addresses?.[0]?.phone || null,
      products: vendor.products.map((p) => ({
        ...p,
        price: Number(p.price),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

export const updateVendorStatusAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const existing = await prisma.vendorProfile.findUnique({ where: { id } });
    if (!existing) {
      return next(ApiError.notFound('Vendor profile not found'));
    }

    const vendor = await prisma.vendorProfile.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason || 'Application rejected by platform admin' : null,
      },
      include: {
        user: { select: { email: true, name: true } },
        _count: { select: { products: true, subOrders: true } },
      },
    });

    return sendResponse(
      res,
      200,
      true,
      `Vendor status updated to ${status}${status === 'REJECTED' && rejectionReason ? ` (Reason: ${rejectionReason})` : ''}`,
      vendor
    );
  } catch (error) {
    return next(error);
  }
};

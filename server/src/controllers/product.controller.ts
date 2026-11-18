import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError, sendResponse } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { SearchService } from '../services/search.service.js';

export const listPublicProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      vendorId,
      minRating,
      inStock,
      sort,
      page,
      limit,
    } = req.query;

    const result = await SearchService.search({
      q: q as string,
      category: category as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      vendorId: vendorId as string,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      inStock: inStock === 'true',
      sort: sort as any,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 12,
    });

    return sendResponse(res, 200, true, 'Products retrieved', result);
  } catch (error) {
    return next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        vendor: {
          select: { id: true, storeName: true, description: true, status: true },
        },
        images: { orderBy: { position: 'asc' } },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!product) {
      return next(ApiError.notFound('Product not found'));
    }

    return sendResponse(res, 200, true, 'Product details retrieved', product);
  } catch (error) {
    return next(error);
  }
};

export const listVendorProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const vendorId = req.user!.vendorId!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);
    const search = req.query.search as string;
    const stockStatus = req.query.stockStatus as string;

    const where: any = {
      vendorId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (stockStatus === 'low') {
      where.stock = { gt: 0, lte: 10 };
    } else if (stockStatus === 'out') {
      where.stock = { equals: 0 };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { orderBy: { position: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return sendResponse(res, 200, true, 'Vendor products retrieved', {
      products,
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

export const createProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const vendorId = req.user!.vendorId!;
    const { title, description, price, stock, sku, categoryId, status, images } = req.body;

    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return next(ApiError.conflict(`Product with SKU "${sku}" already exists`));
    }

    const product = await prisma.product.create({
      data: {
        vendorId,
        categoryId,
        title,
        description,
        price,
        stock,
        sku,
        status: status || 'DRAFT',
        images: images && images.length > 0 ? {
          create: images.map((url: string, index: number) => ({
            url,
            position: index,
          })),
        } : undefined,
      },
      include: {
        category: true,
        images: true,
      },
    });

    if (product.status === 'ACTIVE') {
      await SearchService.indexProduct(product.id);
    }

    return sendResponse(res, 201, true, 'Product created successfully', product);
  } catch (error) {
    return next(error);
  }
};

export const updateProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const vendorId = req.user!.vendorId!;
    const { id } = req.params;
    const { title, description, price, stock, sku, categoryId, status, images } = req.body;

    const existingProduct = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingProduct) {
      return next(ApiError.notFound('Product not found'));
    }

    // Role check: Vendor can only edit their own product
    if (existingProduct.vendorId !== vendorId && req.user!.role !== 'ADMIN') {
      return next(ApiError.forbidden('You do not have permission to modify this product'));
    }

    if (sku && sku !== existingProduct.sku) {
      const skuCheck = await prisma.product.findUnique({ where: { sku } });
      if (skuCheck) {
        return next(ApiError.conflict(`SKU "${sku}" is already in use by another product`));
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(price !== undefined && { price }),
        ...(stock !== undefined && { stock }),
        ...(sku && { sku }),
        ...(categoryId && { categoryId }),
        ...(status && { status }),
        ...(images && {
          images: {
            deleteMany: {},
            create: images.map((url: string, index: number) => ({
              url,
              position: index,
            })),
          },
        }),
      },
      include: {
        category: true,
        images: true,
      },
    });

    await SearchService.indexProduct(product.id);

    return sendResponse(res, 200, true, 'Product updated successfully', product);
  } catch (error) {
    return next(error);
  }
};

export const deleteProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const vendorId = req.user!.vendorId!;
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      return next(ApiError.notFound('Product not found'));
    }

    if (product.vendorId !== vendorId && req.user!.role !== 'ADMIN') {
      return next(ApiError.forbidden('You do not have permission to delete this product'));
    }

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await SearchService.removeProduct(id);

    return sendResponse(res, 200, true, 'Product deleted successfully');
  } catch (error) {
    return next(error);
  }
};

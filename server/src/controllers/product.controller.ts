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

export const listAdminProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 20);
    const search = req.query.search as string;
    const categoryId = req.query.categoryId as string;
    const vendorId = req.query.vendorId as string;
    const status = req.query.status as any;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
    const stockStatus = req.query.stockStatus as string;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { vendor: { storeName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = categoryId;
    }

    if (vendorId && vendorId !== 'ALL') {
      where.vendorId = vendorId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (stockStatus === 'low') {
      where.stock = { gt: 0, lte: 10 };
    } else if (stockStatus === 'out') {
      where.stock = { equals: 0 };
    } else if (stockStatus === 'in') {
      where.stock = { gt: 0 };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          vendor: { select: { id: true, storeName: true, status: true } },
          images: { orderBy: { position: 'asc' } },
          _count: { select: { reviews: true, orderItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return sendResponse(res, 200, true, 'Admin products retrieved', {
      products: products.map((p) => ({
        ...p,
        price: Number(p.price),
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

export const createAdminProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let { vendorId, categoryId, title, description, price, stock, sku, status, images } = req.body;

    if (!vendorId) {
      const defaultVendor = await prisma.vendorProfile.findFirst({
        where: { status: 'APPROVED' },
      });
      if (!defaultVendor) {
        return next(ApiError.badRequest('No approved vendor found. Please create or approve a vendor first.'));
      }
      vendorId = defaultVendor.id;
    }

    const generatedSku =
      sku || `NX-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    const existingSku = await prisma.product.findUnique({ where: { sku: generatedSku } });
    if (existingSku) {
      return next(ApiError.conflict(`Product with SKU "${generatedSku}" already exists`));
    }

    const product = await prisma.product.create({
      data: {
        vendorId,
        categoryId,
        title,
        description: description || '',
        price,
        stock: parseInt(stock, 10) || 0,
        sku: generatedSku,
        status: status || 'ACTIVE',
        images:
          images && images.length > 0
            ? {
                create: images.map((url: string, index: number) => ({
                  url,
                  position: index,
                })),
              }
            : undefined,
      },
      include: {
        category: true,
        vendor: true,
        images: true,
      },
    });

    if (product.status === 'ACTIVE') {
      await SearchService.indexProduct(product.id);
    }

    return sendResponse(res, 201, true, 'Product created successfully by admin', product);
  } catch (error) {
    return next(error);
  }
};

export const updateAdminProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { title, description, price, stock, sku, categoryId, vendorId, status, images } = req.body;

    const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return next(ApiError.notFound('Product not found'));
    }

    if (sku && sku !== existing.sku) {
      const conflict = await prisma.product.findUnique({ where: { sku } });
      if (conflict) {
        return next(ApiError.conflict(`SKU "${sku}" is already in use`));
      }
    }

    if (images && Array.isArray(images)) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(stock !== undefined && { stock: parseInt(stock, 10) }),
        ...(sku && { sku }),
        ...(categoryId && { categoryId }),
        ...(vendorId && { vendorId }),
        ...(status && { status }),
        ...(images &&
          Array.isArray(images) &&
          images.length > 0 && {
            images: {
              create: images.map((url: string, idx: number) => ({
                url,
                position: idx,
              })),
            },
          }),
      },
      include: {
        category: true,
        vendor: true,
        images: true,
      },
    });

    if (product.status === 'ACTIVE') {
      await SearchService.indexProduct(product.id);
    } else {
      await SearchService.removeProduct(product.id);
    }

    return sendResponse(res, 200, true, 'Product updated successfully by admin', product);
  } catch (error) {
    return next(error);
  }
};

export const updateAdminProductStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'DRAFT', 'PENDING', 'REJECTED'].includes(status)) {
      return next(ApiError.badRequest('Invalid product status. Allowed: ACTIVE, DRAFT, PENDING, REJECTED'));
    }

    const product = await prisma.product.update({
      where: { id },
      data: { status },
      include: { category: true, vendor: true },
    });

    if (status === 'ACTIVE') {
      await SearchService.indexProduct(product.id);
    } else {
      await SearchService.removeProduct(product.id);
    }

    return sendResponse(res, 200, true, `Product status updated to ${status}`, product);
  } catch (error) {
    return next(error);
  }
};

export const deleteAdminProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) {
      return next(ApiError.notFound('Product not found'));
    }

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await SearchService.removeProduct(id);
    return sendResponse(res, 200, true, 'Product deleted successfully by admin');
  } catch (error) {
    return next(error);
  }
};

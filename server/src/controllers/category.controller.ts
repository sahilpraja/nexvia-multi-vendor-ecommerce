import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError, sendResponse } from '../utils/apiResponse.js';

export const listCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    return sendResponse(res, 200, true, 'Categories retrieved', categories);
  } catch (error) {
    return next(error);
  }
};

export const listAdminCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true, status: true } },
        _count: { select: { products: true, children: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse(res, 200, true, 'Admin categories retrieved', categories);
  } catch (error) {
    return next(error);
  }
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          include: {
            _count: { select: { products: true } },
          },
        },
        products: {
          take: 10,
          select: {
            id: true,
            title: true,
            price: true,
            stock: true,
            status: true,
            sku: true,
            images: { take: 1, orderBy: { position: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      return next(ApiError.notFound('Category not found'));
    }

    return sendResponse(res, 200, true, 'Category details retrieved', category);
  } catch (error) {
    return next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, imageUrl, status, parentId } = req.body;
    const generatedSlug = slug?.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const existing = await prisma.category.findUnique({ where: { slug: generatedSlug } });
    if (existing) {
      return next(ApiError.conflict('Category slug already exists'));
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return next(ApiError.badRequest('Parent category not found'));
      }
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: generatedSlug,
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        status: status || 'ACTIVE',
        parentId: parentId || null,
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    return sendResponse(res, 201, true, 'Category created successfully', category);
  } catch (error) {
    return next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, slug, description, imageUrl, status, parentId } = req.body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return next(ApiError.notFound('Category not found'));
    }

    if (parentId && parentId === id) {
      return next(ApiError.badRequest('A category cannot be its own parent'));
    }

    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.category.findUnique({ where: { slug } });
      if (slugConflict) {
        return next(ApiError.conflict('Category slug already exists'));
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(slug && { slug: slug.trim() }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl ? imageUrl.trim() : null }),
        ...(status && { status }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    return sendResponse(res, 200, true, 'Category updated successfully', category);
  } catch (error) {
    return next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      return next(ApiError.notFound('Category not found'));
    }

    // Safety guard: Prevent deleting categories with existing products
    if (category._count.products > 0) {
      return next(
        ApiError.badRequest(
          `Cannot delete category "${category.name}" because it is currently assigned to ${category._count.products} product(s). Please reassign or remove the products first.`
        )
      );
    }

    // Safety guard: Prevent deleting categories that have child subcategories
    if (category._count.children > 0) {
      return next(
        ApiError.badRequest(
          `Cannot delete category "${category.name}" because it has ${category._count.children} child subcategory(s). Please remove or reassign them first.`
        )
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return sendResponse(res, 200, true, `Category "${category.name}" deleted successfully`);
  } catch (error) {
    return next(error);
  }
};

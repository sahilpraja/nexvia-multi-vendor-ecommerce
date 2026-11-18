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

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, parentId } = req.body;
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const existing = await prisma.category.findUnique({ where: { slug: generatedSlug } });
    if (existing) {
      return next(ApiError.conflict('Category slug already exists'));
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: generatedSlug,
        parentId,
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
    const { name, slug, parentId } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(parentId !== undefined && { parentId }),
      },
    });

    return sendResponse(res, 200, true, 'Category updated successfully', category);
  } catch (error) {
    return next(error);
  }
};

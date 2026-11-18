import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError, sendResponse } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { SearchService } from '../services/search.service.js';

export const listProductReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const reviews = await prisma.review.findMany({
      where: { productId: id },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse(res, 200, true, 'Reviews retrieved', reviews);
  } catch (error) {
    return next(error);
  }
};

export const createReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { id: productId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return next(ApiError.badRequest('Rating must be an integer between 1 and 5'));
    }

    // Acceptance requirement: Only customers with a DELIVERED order containing the product can review
    const deliveredOrderItem = await prisma.orderItem.findFirst({
      where: {
        productId,
        subOrder: {
          status: 'DELIVERED',
          order: { customerId: userId },
        },
      },
    });

    if (!deliveredOrderItem) {
      return next(
        ApiError.forbidden(
          'Verified Buyer policy: You can only review products from orders that have been successfully DELIVERED.'
        )
      );
    }

    // One review per product per customer
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId,
        },
      },
    });

    if (existingReview) {
      return next(ApiError.conflict('You have already reviewed this product'));
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          productId,
          userId,
          rating: parseInt(rating, 10),
          comment,
        },
      });

      // Recalculate average rating & count
      const agg = await tx.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          avgRating: Math.round((agg._avg.rating || 0) * 10) / 10,
          reviewCount: agg._count.rating || 0,
        },
      });

      return created;
    });

    // Update Elasticsearch
    await SearchService.indexProduct(productId);

    return sendResponse(res, 201, true, 'Review submitted successfully', review);
  } catch (error) {
    return next(error);
  }
};

export const deleteReviewAdmin = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = _req.params;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return next(ApiError.notFound('Review not found'));
    }

    await prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id } });

      const agg = await tx.review.aggregate({
        where: { productId: review.productId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.product.update({
        where: { id: review.productId },
        data: {
          avgRating: Math.round((agg._avg.rating || 0) * 10) / 10,
          reviewCount: agg._count.rating || 0,
        },
      });
    });

    await SearchService.indexProduct(review.productId);

    return sendResponse(res, 200, true, 'Review deleted by admin');
  } catch (error) {
    return next(error);
  }
};

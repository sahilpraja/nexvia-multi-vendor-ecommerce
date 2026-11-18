import { Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service.js';
import { sendResponse, ApiError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const getIdentifier = (req: AuthenticatedRequest): string => {
  if (req.user?.userId) {
    return req.user.userId;
  }
  const guestHeader = req.headers['x-guest-session-id'] as string;
  if (guestHeader) {
    return `guest_${guestHeader}`;
  }
  throw ApiError.badRequest('Session ID or authentication required for cart');
};

export const getCart = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = getIdentifier(req);
    const cart = await CartService.getCart(id);
    return sendResponse(res, 200, true, 'Cart retrieved', cart);
  } catch (error) {
    return next(error);
  }
};

export const addToCart = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = getIdentifier(req);
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      return next(ApiError.badRequest('Product ID is required'));
    }
    const cart = await CartService.addItem(id, productId, Math.max(1, parseInt(quantity, 10)));
    return sendResponse(res, 200, true, 'Item added to cart', cart);
  } catch (error) {
    return next(error);
  }
};

export const updateCartItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = getIdentifier(req);
    const { productId } = req.params;
    const { quantity } = req.body;
    if (quantity === undefined) {
      return next(ApiError.badRequest('Quantity is required'));
    }
    const cart = await CartService.updateQuantity(id, productId, parseInt(quantity, 10));
    return sendResponse(res, 200, true, 'Cart item updated', cart);
  } catch (error) {
    return next(error);
  }
};

export const removeCartItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = getIdentifier(req);
    const { productId } = req.params;
    const cart = await CartService.removeItem(id, productId);
    return sendResponse(res, 200, true, 'Item removed from cart', cart);
  } catch (error) {
    return next(error);
  }
};

export const clearCart = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = getIdentifier(req);
    await CartService.clearCart(id);
    return sendResponse(res, 200, true, 'Cart cleared');
  } catch (error) {
    return next(error);
  }
};

import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../controllers/cart.controller.js';
import { optionalAuthenticate } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  addToCartSchema,
  updateCartItemSchema,
  removeCartItemSchema,
} from '../validations/cart.validation.js';

const router = Router();

router.use(optionalAuthenticate);

router.get('/cart', getCart);
router.post('/cart/items', validateRequest(addToCartSchema), addToCart);

// Support both :id (cart item id) and :productId
router.patch('/cart/items/:id', validateRequest(updateCartItemSchema), updateCartItem);
router.delete('/cart/items/:id', validateRequest(removeCartItemSchema), removeCartItem);

router.delete('/cart', clearCart);

export default router;

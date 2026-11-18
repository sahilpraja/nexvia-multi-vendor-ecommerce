import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../controllers/cart.controller.js';
import { optionalAuthenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(optionalAuthenticate);

router.get('/cart', getCart);
router.post('/cart/items', addToCart);
router.patch('/cart/items/:productId', updateCartItem);
router.delete('/cart/items/:productId', removeCartItem);
router.delete('/cart', clearCart);

export default router;

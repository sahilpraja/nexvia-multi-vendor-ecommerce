import { api } from '../api/client.js';
import { CartData } from '../types/index.js';

export const cartService = {
  getCart: async (): Promise<CartData> => {
    const res = await api.get('/cart');
    return res.data.data;
  },

  addItem: async (productId: string, quantity: number = 1): Promise<CartData> => {
    const res = await api.post('/cart/items', { productId, quantity });
    return res.data.data;
  },

  updateQuantity: async (itemOrProductId: string, quantity: number): Promise<CartData> => {
    const res = await api.patch(`/cart/items/${itemOrProductId}`, { quantity });
    return res.data.data;
  },

  removeItem: async (itemOrProductId: string): Promise<CartData> => {
    const res = await api.delete(`/cart/items/${itemOrProductId}`);
    return res.data.data;
  },

  clearCart: async (): Promise<CartData> => {
    const res = await api.delete('/cart');
    return res.data.data;
  },
};

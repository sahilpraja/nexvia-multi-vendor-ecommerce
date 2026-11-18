import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartData } from '../types/index.js';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.js';

interface CartContextType {
  cart: CartData;
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const emptyCart: CartData = {
  items: [],
  subtotal: 0,
  itemCount: 0,
  hasUnavailableItems: false,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartData>(emptyCart);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const refreshCart = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cart');
      setCart(res.data.data);
    } catch {
      setCart(emptyCart);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [user]);

  const addToCart = async (productId: string, quantity = 1) => {
    const res = await api.post('/cart/items', { productId, quantity });
    setCart(res.data.data);
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    const res = await api.patch(`/cart/items/${productId}`, { quantity });
    setCart(res.data.data);
  };

  const removeItem = async (productId: string) => {
    const res = await api.delete(`/cart/items/${productId}`);
    setCart(res.data.data);
  };

  const clearCart = async () => {
    await api.delete('/cart');
    setCart(emptyCart);
  };

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateQuantity, removeItem, clearCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

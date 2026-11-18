import React, { createContext, useContext, useEffect } from 'react';
import { CartData } from '../types/index.js';
import { useAuth } from './AuthContext.js';
import { useAppDispatch, useAppSelector } from '../redux/store.js';
import {
  fetchCart,
  addToCart as addToCartThunk,
  updateCartItemQuantity,
  removeCartItem,
  clearCart as clearCartThunk,
} from '../redux/slices/cartSlice.js';

interface CartContextType {
  cart: CartData;
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { cart, loading } = useAppSelector((state) => state.cart);
  const { user } = useAuth();

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch, user]);

  const refreshCart = async () => {
    await dispatch(fetchCart()).unwrap();
  };

  const addToCart = async (productId: string, quantity = 1) => {
    await dispatch(addToCartThunk({ productId, quantity })).unwrap();
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    await dispatch(updateCartItemQuantity({ id: productId, quantity })).unwrap();
  };

  const removeItem = async (productId: string) => {
    await dispatch(removeCartItem(productId)).unwrap();
  };

  const clearCart = async () => {
    await dispatch(clearCartThunk()).unwrap();
  };

  return (
    <CartContext.Provider
      value={{ cart, loading, addToCart, updateQuantity, removeItem, clearCart, refreshCart }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

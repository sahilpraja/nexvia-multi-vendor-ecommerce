import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { cartService } from '../../services/cartService.js';
import { CartData } from '../../types/index.js';

export interface CartNotification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface CartState {
  cart: CartData;
  loading: boolean;
  itemActionLoading: Record<string, boolean>;
  error: string | null;
  notification: CartNotification | null;
}

const initialCart: CartData = {
  items: [],
  subtotal: 0,
  totalOriginalPrice: 0,
  productDiscount: 0,
  deliveryCharges: 0,
  itemCount: 0,
  total: 0,
  hasUnavailableItems: false,
};

const initialState: CartState = {
  cart: initialCart,
  loading: false,
  itemActionLoading: {},
  error: null,
  notification: null,
};

// Async Thunks
export const fetchCart = createAsyncThunk<CartData, void, { rejectValue: string }>(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      return await cartService.getCart();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch cart');
    }
  }
);

export const addToCart = createAsyncThunk<
  CartData,
  { productId: string; quantity?: number },
  { rejectValue: string }
>('cart/addToCart', async ({ productId, quantity = 1 }, { rejectWithValue }) => {
  try {
    return await cartService.addItem(productId, quantity);
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add item to cart');
  }
});

export const updateCartItemQuantity = createAsyncThunk<
  CartData,
  { id: string; quantity: number },
  { rejectValue: string }
>('cart/updateCartItemQuantity', async ({ id, quantity }, { rejectWithValue }) => {
  try {
    return await cartService.updateQuantity(id, quantity);
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update item quantity');
  }
});

export const removeCartItem = createAsyncThunk<CartData, string, { rejectValue: string }>(
  'cart/removeCartItem',
  async (id, { rejectWithValue }) => {
    try {
      return await cartService.removeItem(id);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to remove item');
    }
  }
);

export const clearCart = createAsyncThunk<CartData, void, { rejectValue: string }>(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      return await cartService.clearCart();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to clear cart');
    }
  }
);

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearNotification: (state) => {
      state.notification = null;
    },
    setNotification: (state, action: PayloadAction<{ message: string; type: 'success' | 'error' | 'info' }>) => {
      state.notification = {
        id: Date.now(),
        message: action.payload.message,
        type: action.payload.type,
      };
    },
    resetCart: (state) => {
      state.cart = initialCart;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchCart
    builder.addCase(fetchCart.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchCart.fulfilled, (state, action) => {
      state.loading = false;
      state.cart = action.payload;
    });
    builder.addCase(fetchCart.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to load cart';
    });

    // addToCart
    builder.addCase(addToCart.pending, (state, action) => {
      state.itemActionLoading[action.meta.arg.productId] = true;
    });
    builder.addCase(addToCart.fulfilled, (state, action) => {
      state.itemActionLoading[action.meta.arg.productId] = false;
      state.cart = action.payload;
      state.notification = {
        id: Date.now(),
        message: 'Product added to your cart successfully',
        type: 'success',
      };
    });
    builder.addCase(addToCart.rejected, (state, action) => {
      state.itemActionLoading[action.meta.arg.productId] = false;
      state.notification = {
        id: Date.now(),
        message: action.payload || 'Could not add product to cart',
        type: 'error',
      };
    });

    // updateCartItemQuantity
    builder.addCase(updateCartItemQuantity.pending, (state, action) => {
      state.itemActionLoading[action.meta.arg.id] = true;
    });
    builder.addCase(updateCartItemQuantity.fulfilled, (state, action) => {
      state.itemActionLoading[action.meta.arg.id] = false;
      state.cart = action.payload;
      state.notification = {
        id: Date.now(),
        message: 'Cart quantity updated',
        type: 'info',
      };
    });
    builder.addCase(updateCartItemQuantity.rejected, (state, action) => {
      state.itemActionLoading[action.meta.arg.id] = false;
      state.notification = {
        id: Date.now(),
        message: action.payload || 'Failed to update quantity',
        type: 'error',
      };
    });

    // removeCartItem
    builder.addCase(removeCartItem.pending, (state, action) => {
      state.itemActionLoading[action.meta.arg] = true;
    });
    builder.addCase(removeCartItem.fulfilled, (state, action) => {
      delete state.itemActionLoading[action.meta.arg];
      state.cart = action.payload;
      state.notification = {
        id: Date.now(),
        message: 'Item removed from your cart',
        type: 'info',
      };
    });
    builder.addCase(removeCartItem.rejected, (state, action) => {
      delete state.itemActionLoading[action.meta.arg];
      state.notification = {
        id: Date.now(),
        message: action.payload || 'Failed to remove item',
        type: 'error',
      };
    });

    // clearCart
    builder.addCase(clearCart.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(clearCart.fulfilled, (state) => {
      state.loading = false;
      state.cart = initialCart;
      state.notification = {
        id: Date.now(),
        message: 'All items have been cleared from your cart',
        type: 'info',
      };
    });
    builder.addCase(clearCart.rejected, (state, action) => {
      state.loading = false;
      state.notification = {
        id: Date.now(),
        message: action.payload || 'Failed to clear cart',
        type: 'error',
      };
    });
  },
});

export const { clearNotification, setNotification, resetCart } = cartSlice.actions;
export default cartSlice.reducer;

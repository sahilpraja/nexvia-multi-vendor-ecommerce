import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../redux/store.js';
import {
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from '../redux/slices/cartSlice.js';
import { CartItemComponent } from '../components/cart/CartItem.js';
import { OrderSummary } from '../components/cart/OrderSummary.js';
import { EmptyCart } from '../components/cart/EmptyCart.js';
import { CartNotificationToast } from '../components/cart/CartNotification.js';

export const CartPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { cart, loading, itemActionLoading } = useAppSelector((state) => state.cart);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const navigate = useNavigate();

  const handleUpdateQuantity = (itemOrProductId: string, newQuantity: number) => {
    dispatch(updateCartItemQuantity({ id: itemOrProductId, quantity: newQuantity }));
  };

  const handleRemoveItem = (itemOrProductId: string) => {
    dispatch(removeCartItem(itemOrProductId));
  };

  const handleClearCart = async () => {
    await dispatch(clearCart());
    setShowClearConfirm(false);
  };

  if (loading && cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-sm font-semibold text-gray-500">Loading your shopping cart...</p>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <>
        <EmptyCart />
        <CartNotificationToast />
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <nav className="text-xs text-gray-400 mb-2 flex items-center space-x-1.5 font-medium">
            <Link to="/" className="hover:text-blue-600 transition">Marketplace</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Shopping Cart</span>
          </nav>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Shopping Cart
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
              {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center text-xs font-bold text-gray-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Stock limitation / unavailable warning banner */}
      {cart.hasUnavailableItems && (
        <div className="mb-8 p-4 sm:p-5 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-900 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold">Attention: Some items have inventory limitations.</span>
            <p className="mt-0.5 text-xs text-amber-700">
              One or more products in your cart are currently out of stock or have lower available inventory than requested. Please review before checkout.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Left Cart Items, Right Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Section: Shopping Cart (8 Cols) */}
        <section aria-label="Shopping Cart Items" className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Items from Verified Sellers
            </span>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline transition inline-flex items-center"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              <span>Clear cart</span>
            </button>
          </div>

          {/* Cart items list */}
          <div className="space-y-4">
            {cart.items.map((item) => (
              <CartItemComponent
                key={item.id || item.productId}
                item={item}
                loading={
                  itemActionLoading[item.id || ''] ||
                  itemActionLoading[item.productId]
                }
                onUpdateQuantity={(qty) => handleUpdateQuantity(item.id || item.productId, qty)}
                onRemove={() => handleRemoveItem(item.id || item.productId)}
              />
            ))}
          </div>

          {/* Bottom Bar: Free delivery incentive */}
          <div className="mt-6 p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs text-blue-900 font-medium">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Free standard shipping applied on all orders above $100</span>
            </div>
            <Link to="/" className="font-bold text-blue-600 hover:underline">
              Add more
            </Link>
          </div>
        </section>

        {/* Right Section: Order Summary (4 Cols) */}
        <aside aria-label="Order Summary" className="lg:col-span-4">
          <OrderSummary
            cart={cart}
            onProceedToCheckout={(coupon) => {
              navigate('/checkout', { state: { couponCode: coupon } });
            }}
          />
        </aside>
      </div>

      {/* Confirmation Modal for Clearing Cart */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-gray-900">Clear Shopping Cart?</h3>
              <p className="mt-1 text-xs text-gray-500">
                Are you sure you want to remove all {cart.itemCount} items from your cart? This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
              >
                Keep Items
              </button>
              <button
                type="button"
                onClick={handleClearCart}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-rose-500/20"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <CartNotificationToast />
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, ArrowRight, ShoppingBag, Tag, CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext.js';
import { api } from '../api/client.js';

export const CartPage: React.FC = () => {
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      setCouponError(null);
      setCouponSuccess(null);

      // Verify coupon against checkout rules
      const code = couponCode.trim().toUpperCase();
      if (code === 'WELCOME10') {
        const discount = Math.round(cart.subtotal * 0.10 * 100) / 100;
        setCouponDiscount(discount);
        setCouponSuccess(`Coupon applied! 10% off (-$${discount.toFixed(2)})`);
      } else if (code === 'FLASH50') {
        if (cart.subtotal < 300) {
          setCouponError('FLASH50 requires a minimum order of $300');
          return;
        }
        setCouponDiscount(50);
        setCouponSuccess('Coupon applied! $50.00 flat discount');
      } else if (code === 'VIP20') {
        if (cart.subtotal < 150) {
          setCouponError('VIP20 requires a minimum order of $150');
          return;
        }
        const discount = Math.round(cart.subtotal * 0.20 * 100) / 100;
        setCouponDiscount(discount);
        setCouponSuccess(`Coupon applied! 20% VIP discount (-$${discount.toFixed(2)})`);
      } else {
        setCouponError('Invalid or expired coupon code');
        setCouponDiscount(0);
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.message || 'Invalid coupon');
    }
  };

  const finalTotal = Math.max(0, cart.subtotal - couponDiscount);

  if (cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="bg-white p-12 rounded-3xl border border-gray-200 shadow-sm">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Your shopping cart is empty</h2>
          <p className="text-sm text-gray-500 mt-2 mb-6">
            Browse our multi-vendor marketplace and discover items from independent stores.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow-md"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-8">Shopping Cart</h1>

      {cart.hasUnavailableItems && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center space-x-3 text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>
            Some items in your cart have stock limitations or are unavailable. Please adjust quantities before proceeding to checkout.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Item List */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div
              key={item.productId}
              className={`bg-white p-5 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${
                !item.isAvailable ? 'border-red-200 bg-red-50/20' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-4">
                <img
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300'}
                  alt={item.title}
                  className="w-20 h-20 rounded-xl object-cover bg-gray-50 border border-gray-100 flex-shrink-0"
                />
                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
                    Vendor: {item.vendorName}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">
                    ${Number(item.price).toFixed(2)} each
                  </p>
                  {!item.isAvailable && (
                    <p className="text-xs font-semibold text-red-600 mt-1 flex items-center">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      {item.unavailableReason}
                    </p>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-xs font-bold text-gray-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 text-sm font-bold disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <div className="text-right">
                  <span className="text-base font-bold text-gray-900">
                    ${item.itemTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={() => removeItem(item.productId)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => clearCart()}
              className="text-xs text-red-600 hover:underline font-medium"
            >
              Clear entire cart
            </button>
            <Link to="/" className="text-xs text-blue-600 hover:underline font-semibold">
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm h-fit space-y-6">
          <h2 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-100">
            Order Summary
          </h2>

          {/* Coupon Code Input */}
          <div>
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-grow">
                <Tag className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Coupon code (e.g. WELCOME10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs uppercase font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition"
              >
                Apply
              </button>
            </form>

            {couponSuccess && (
              <p className="text-[11px] font-semibold text-green-600 mt-2 flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> {couponSuccess}
              </p>
            )}
            {couponError && (
              <p className="text-[11px] font-semibold text-red-600 mt-2 flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {couponError}
              </p>
            )}
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-3 text-sm border-t border-gray-100 pt-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({cart.itemCount} items)</span>
              <span className="font-semibold text-gray-900">${cart.subtotal.toFixed(2)}</span>
            </div>

            {couponDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="font-semibold">-${couponDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Estimated Shipping</span>
              <span className="text-green-600 font-semibold">FREE</span>
            </div>

            <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t border-gray-100">
              <span>Total</span>
              <span className="text-xl text-blue-600">${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout CTA */}
          <button
            onClick={() => {
              navigate('/checkout', {
                state: { couponCode: couponDiscount > 0 ? couponCode : undefined },
              });
            }}
            disabled={cart.hasUnavailableItems}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

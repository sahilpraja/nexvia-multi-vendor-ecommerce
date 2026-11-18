import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, ShieldCheck, ArrowRight, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { CartData } from '../../types/index.js';

interface OrderSummaryProps {
  cart: CartData;
  onProceedToCheckout?: (couponCode?: string) => void;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({ cart, onProceedToCheckout }) => {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    description: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const code = couponCode.trim().toUpperCase();

    if (!code) return;

    if (code === 'WELCOME10') {
      const discount = Math.round(cart.subtotal * 0.1 * 100) / 100;
      setAppliedCoupon({
        code: 'WELCOME10',
        discount,
        description: '10% Welcome Discount',
      });
    } else if (code === 'FLASH50') {
      if (cart.subtotal < 300) {
        setCouponError('FLASH50 requires a minimum order of $300');
        return;
      }
      setAppliedCoupon({
        code: 'FLASH50',
        discount: 50,
        description: '$50 Flat Off Promotion',
      });
    } else if (code === 'VIP20') {
      if (cart.subtotal < 150) {
        setCouponError('VIP20 requires a minimum order of $150');
        return;
      }
      const discount = Math.round(cart.subtotal * 0.2 * 100) / 100;
      setAppliedCoupon({
        code: 'VIP20',
        discount,
        description: '20% VIP Merchant Pass',
      });
    } else {
      setCouponError('Invalid coupon code. Try WELCOME10, FLASH50, or VIP20');
      setAppliedCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const deliveryCharge = cart.deliveryCharges !== undefined ? cart.deliveryCharges : (cart.subtotal >= 100 ? 0 : 9.99);
  const finalPayable = Math.max(0, Math.round((cart.subtotal - couponDiscount + (cart.items.length > 0 ? deliveryCharge : 0)) * 100) / 100);

  const handleCheckout = () => {
    if (onProceedToCheckout) {
      onProceedToCheckout(appliedCoupon?.code);
    } else {
      navigate('/checkout', {
        state: { couponCode: appliedCoupon?.code },
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-7 space-y-6 sticky top-24">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">Order Summary</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Coupon Form */}
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
          Promotional Coupon
        </label>
        {appliedCoupon ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-bold">{appliedCoupon.code}</span>
                <p className="text-[11px] text-emerald-600">{appliedCoupon.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="text-emerald-700 font-bold hover:underline ml-2"
            >
              Remove
            </button>
          </div>
        ) : (
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. WELCOME10"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <button
              type="submit"
              disabled={!couponCode.trim()}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition disabled:opacity-40"
            >
              Apply
            </button>
          </form>
        )}

        {couponError && (
          <div className="mt-2 flex items-center text-rose-600 text-[11px] font-semibold space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{couponError}</span>
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className="space-y-3 pt-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span className="font-bold text-gray-900">${cart.subtotal.toFixed(2)}</span>
        </div>

        {cart.productDiscount !== undefined && cart.productDiscount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Product Savings</span>
            <span className="font-bold">-${cart.productDiscount.toFixed(2)}</span>
          </div>
        )}

        {couponDiscount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Coupon Discount</span>
            <span className="font-bold">-${couponDiscount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-600">
          <div className="flex items-center space-x-1">
            <span>Estimated Delivery</span>
            <Truck className="w-3.5 h-3.5 text-gray-400" />
          </div>
          {deliveryCharge === 0 ? (
            <span className="font-bold text-emerald-600">FREE</span>
          ) : (
            <span className="font-bold text-gray-900">${deliveryCharge.toFixed(2)}</span>
          )}
        </div>

        {cart.subtotal > 0 && cart.subtotal < 100 && (
          <p className="text-[11px] text-gray-400 bg-gray-50 p-2 rounded-lg">
            Add ${(100 - cart.subtotal).toFixed(2)} more of eligible items to get <strong>Free Delivery</strong>
          </p>
        )}

        {/* Final Amount */}
        <div className="pt-4 border-t border-gray-100 flex items-baseline justify-between">
          <div>
            <span className="text-base font-black text-gray-900">Total Payable</span>
            <p className="text-[10px] text-gray-400">Inclusive of all taxes</p>
          </div>
          <span className="text-2xl font-black text-blue-600">
            ${finalPayable.toFixed(2)}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <button
        type="button"
        onClick={handleCheckout}
        disabled={cart.items.length === 0 || cart.hasUnavailableItems}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/20 transition-all duration-200 flex items-center justify-center space-x-2 text-sm disabled:opacity-50 disabled:pointer-events-none group"
      >
        <span>Proceed to Checkout</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Trust & Guarantee */}
      <div className="pt-4 border-t border-gray-100 space-y-2 text-[11px] text-gray-500">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Multi-vendor escrow protection & instant payout splitting</span>
        </div>
        <div className="flex items-center space-x-2">
          <Truck className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>Dispatched directly by verified merchants</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CreditCard, Lock, AlertCircle, Truck, Package, ArrowRight, Check } from 'lucide-react';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { paymentService } from '../services/paymentService.js';

export const CheckoutPage: React.FC = () => {
  const { cart, refreshCart } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const couponCode = (location.state as any)?.couponCode;

  // Shipping Form State
  const [address, setAddress] = useState({
    line1: '742 Evergreen Terrace',
    line2: '',
    city: 'Springfield',
    state: 'OR',
    postalCode: '97477',
    country: 'USA',
    phone: '+1-555-0199',
  });

  const [paymentMethod, setPaymentMethod] = useState<'stripe'>('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group items by vendor for multi-vendor sub-order review
  const vendorGroups = cart.items.reduce((acc, item) => {
    if (!acc[item.vendorName]) acc[item.vendorName] = [];
    acc[item.vendorName].push(item);
    return acc;
  }, {} as Record<string, typeof cart.items>);

  const handlePlaceOrderAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }

    if (cart.items.length === 0) {
      setError('Your shopping cart is empty.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Create pending Order & Sub-Orders in PostgreSQL
      const checkoutRes = await api.post('/checkout', {
        address: {
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone,
        },
        couponCode,
      });

      const { parentOrder } = checkoutRes.data.data;

      // Step 2: Create Stripe Checkout Session on Express backend
      const session = await paymentService.createCheckoutSession(parentOrder.id);

      // Step 3: Redirect customer to Stripe Hosted Checkout URL
      if (session.sessionUrl.startsWith('http://') || session.sessionUrl.startsWith('https://')) {
        // If it's an internal test redirect or live stripe URL:
        if (session.sessionUrl.includes(window.location.host)) {
          // Local test redirect
          window.location.href = session.sessionUrl;
        } else {
          // Stripe hosted checkout page (https://checkout.stripe.com/...)
          window.location.href = session.sessionUrl;
        }
      } else {
        navigate(`/payment/success?session_id=${session.sessionId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Checkout failed. Please verify cart items and address.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Title */}
      <div className="mb-8">
        <nav className="text-xs text-gray-400 mb-1 flex items-center space-x-1.5 font-medium">
          <Link to="/cart" className="hover:text-blue-600 transition">Cart</Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Stripe Checkout</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Secure Stripe Checkout
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Cols: Shipping & Payment Method Selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Shipping Address Form */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                1
              </span>
              <h2 className="text-base font-bold text-gray-900">
                Delivery Address
              </h2>
            </div>

            <form className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  State / Province
                </label>
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  required
                />
              </div>
            </form>
          </div>

          {/* 2. Payment Method: Stripe Checkout Sessions */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                2
              </span>
              <h2 className="text-base font-bold text-gray-900">
                Payment Method
              </h2>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => setPaymentMethod('stripe')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start justify-between ${
                  paymentMethod === 'stripe'
                    ? 'border-blue-600 bg-blue-50/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 flex-shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-gray-900">
                        Stripe Online Payment (Hosted Checkout)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Official
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                      Pay securely with Credit/Debit Card, Apple Pay, Google Pay, or Link. Redirects to official 256-bit SSL encrypted Stripe Checkout page.
                    </p>
                  </div>
                </div>

                <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-gray-500 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Card details are processed exclusively by Stripe. Nexvia never stores your credit card number.</span>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Multi-Vendor Order Breakdown & Pay Now Button */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6 sticky top-24">
            <h2 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center">
              <Package className="w-4 h-4 mr-2 text-blue-600" />
              Order Review ({cart.itemCount} items)
            </h2>

            {/* Vendor Sub-Orders Breakdown */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {Object.entries(vendorGroups).map(([vendorName, items]) => {
                const vendorTotal = items.reduce((acc, i) => acc + i.itemTotal, 0);
                return (
                  <div key={vendorName} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-blue-700 uppercase">Sub-Order: {vendorName}</span>
                      <span className="font-black text-gray-900">${vendorTotal.toFixed(2)}</span>
                    </div>
                    {items.map((i) => (
                      <div key={i.productId} className="flex justify-between text-xs text-gray-500">
                        <span className="truncate max-w-[190px]">{i.title} ×{i.quantity}</span>
                        <span>${i.itemTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Pricing Totals */}
            <div className="space-y-2.5 text-sm border-t border-gray-100 pt-4">
              <div className="flex justify-between text-gray-600 text-xs">
                <span>Items Subtotal</span>
                <span className="font-bold text-gray-900">${cart.subtotal.toFixed(2)}</span>
              </div>
              {couponCode && (
                <div className="flex justify-between text-emerald-600 text-xs font-semibold">
                  <span>Coupon Applied ({couponCode})</span>
                  <span>Active</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 text-xs">
                <span>Shipping</span>
                <span className="font-bold text-emerald-600">FREE</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-3 border-t border-gray-100">
                <span>Final Payable</span>
                <span className="text-2xl text-blue-600">${cart.subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit / Pay with Stripe CTA */}
            <button
              type="button"
              onClick={handlePlaceOrderAndPay}
              disabled={loading || cart.items.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/25 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm group"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{loading ? 'Initializing Stripe Checkout...' : 'Pay with Stripe'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="text-center text-[10px] text-gray-400">
              Guaranteed safe & secure checkout powered by Stripe
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

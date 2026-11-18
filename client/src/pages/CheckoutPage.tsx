import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group items by vendor for multi-vendor sub-order review
  const vendorGroups = cart.items.reduce((acc, item) => {
    if (!acc[item.vendorName]) acc[item.vendorName] = [];
    acc[item.vendorName].push(item);
    return acc;
  }, {} as Record<string, typeof cart.items>);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Create Address or use existing
      // For seamless demo, send address data directly or retrieve user's address
      // First ensure address exists in DB or create temporary address
      const checkoutRes = await api.post('/checkout', {
        addressId: (user as any).addresses?.[0]?.id || 'seed-fallback-addr',
        couponCode,
      }).catch(async () => {
        // Fallback: If no address in user profile, send request with mock id handled gracefully
        const res = await api.post('/checkout', {
          addressId: 'default',
          couponCode,
        });
        return res;
      });

      const { parentOrder } = checkoutRes.data.data;

      // 2. Create Payment Intent
      const intentRes = await api.post('/payments/create-intent', {
        orderId: parentOrder.id,
      });

      // 3. Complete Payment in test mode via Webhook simulator
      await api.post('/payments/webhook', {
        paymentIntentId: intentRes.data.data.providerPaymentId,
        type: 'payment_intent.succeeded',
      });

      // Refresh cart context
      await refreshCart();

      // Navigate to order details
      navigate(`/orders/${parentOrder.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Checkout failed. Please verify cart items and address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-8">
        Secure Checkout
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Shipping & Payment Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address Form */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs mr-2 font-bold">1</span>
              Shipping Destination
            </h2>

            <form className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">State / Province</label>
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm"
                  required
                />
              </div>
            </form>
          </div>

          {/* Payment Method */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs mr-2 font-bold">2</span>
              Payment & Vendor Split Verification
            </h2>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-sm text-blue-950">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Test Mode Split Payment (Stripe Connect / Razorpay Route)</span>
              </div>
              <p>
                Nexvia automatically calculates the <strong>10% platform commission</strong> and splits payouts to independent vendor test accounts upon webhook settlement.
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Multi-Vendor Order Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm h-fit space-y-6">
          <h2 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-100">
            Multi-Vendor Fulfillment Plan
          </h2>

          <div className="space-y-4">
            {Object.entries(vendorGroups).map(([vendorName, items]) => {
              const vendorTotal = items.reduce((acc, i) => acc + i.itemTotal, 0);
              return (
                <div key={vendorName} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-blue-700 uppercase">Sub-Order: {vendorName}</span>
                    <span className="text-xs font-bold text-gray-900">${vendorTotal.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((i) => (
                      <div key={i.productId} className="flex justify-between text-xs text-gray-600">
                        <span className="truncate max-w-[180px]">{i.title} x{i.quantity}</span>
                        <span>${i.itemTotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Totals */}
          <div className="space-y-2.5 text-sm border-t border-gray-100 pt-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">${cart.subtotal.toFixed(2)}</span>
            </div>
            {couponCode && (
              <div className="flex justify-between text-green-600 text-xs font-semibold">
                <span>Coupon Applied ({couponCode})</span>
                <span>Active</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-100">
              <span>Total to Pay</span>
              <span className="text-xl text-blue-600">${cart.subtotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={loading || cart.items.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{loading ? 'Processing Split Payment...' : 'Pay & Confirm Order'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

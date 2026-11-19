import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Package, ArrowRight, ShieldCheck, Clock, MapPin } from 'lucide-react';
import { paymentService, SessionStatusResponse } from '../services/paymentService.js';
import { useCart } from '../context/CartContext.js';

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || searchParams.get('order_id');
  const methodParam = searchParams.get('method');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SessionStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { refreshCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) {
      setError('No session or order reference found in verification redirect.');
      setLoading(false);
      return;
    }

    const verifyPayment = async () => {
      try {
        setLoading(true);
        // 1. Fetch payment status from backend
        let res = await paymentService.getSessionStatus(sessionId);

        // If in test mode with mock session or webhook pending, simulate webhook settlement
        if (res.paymentStatus === 'PENDING' && sessionId.includes('mock_session')) {
          await paymentService.simulateSuccessfulWebhook(sessionId);
          res = await paymentService.getSessionStatus(sessionId);
        }

        setData(res);
        await refreshCart();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to verify payment session.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-black text-gray-900">Verifying Payment with Stripe...</h2>
        <p className="mt-2 text-sm text-gray-500">
          Securing order records, verifying cryptographic signatures, and updating merchant split ledgers.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-white p-10 rounded-3xl border border-red-200 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            !
          </div>
          <h2 className="text-xl font-black text-gray-900">Verification Pending or Failed</h2>
          <p className="text-sm text-gray-600">{error || 'Could not verify payment session.'}</p>
          <div className="pt-4 flex justify-center space-x-3">
            <Link
              to="/orders"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
            >
              Check My Orders
            </Link>
            <Link
              to="/cart"
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
            >
              Return to Cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { order } = data;
  const isCod = order.paymentMethod === 'COD' || data.paymentStatus === 'COD_PENDING';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 sm:p-12 space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-3">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner ${
              isCod ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>
          <span
            className={`inline-block text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
              isCod
                ? 'text-amber-800 bg-amber-50 border-amber-200'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}
          >
            {isCod ? 'Cash on Delivery – Order Confirmed' : 'Payment Verified & Order Confirmed'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {isCod ? 'Order Placed Successfully!' : 'Thank you for your purchase!'}
          </h1>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            {isCod
              ? 'Your multi-vendor order has been confirmed. Please have exact cash ready when your shipment arrives.'
              : 'A confirmation receipt has been generated. Your multi-vendor sub-orders have been routed to independent merchants for fulfillment.'}
          </p>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
          <div>
            <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">Order ID</span>
            <span className="font-mono font-bold text-gray-900 truncate block mt-0.5">#{order.id.slice(0, 8)}</span>
          </div>
          <div>
            <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">
              {isCod ? 'Payable on Delivery' : 'Total Paid'}
            </span>
            <span className="font-bold text-gray-900 block mt-0.5">${Number(order.total).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">Payment Status</span>
            <span
              className={`font-bold block mt-0.5 ${
                data.paymentStatus === 'PAID'
                  ? 'text-emerald-600'
                  : data.paymentStatus === 'COD_PENDING'
                  ? 'text-amber-600'
                  : 'text-gray-700'
              }`}
            >
              {data.paymentStatus}
            </span>
          </div>
          <div>
            <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">Payment Method</span>
            <span className="font-bold text-gray-900 block mt-0.5">
              {isCod ? 'Cash on Delivery (COD)' : 'Stripe Checkout'}
            </span>
          </div>
        </div>

        {/* Multi-Vendor Sub-Orders Breakdown */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
            <Package className="w-4 h-4 mr-1.5 text-blue-600" />
            Fulfillment Plans ({order.subOrders?.length || 0} Sub-Orders)
          </h3>

          <div className="space-y-3">
            {order.subOrders?.map((subOrder: any) => (
              <div
                key={subOrder.id}
                className="p-4 rounded-2xl border border-gray-200/80 bg-white space-y-2"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-blue-700 uppercase">
                    Store: {subOrder.vendor?.storeName || 'Merchant'}
                  </span>
                  <span className="font-extrabold text-gray-900">${Number(subOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {subOrder.orderItems?.map((item: any) => (
                    <div key={item.id} className="py-2 flex justify-between text-xs text-gray-600">
                      <span className="truncate max-w-sm">
                        {item.titleSnapshot} <strong className="text-gray-900">×{item.quantity}</strong>
                      </span>
                      <span className="font-semibold text-gray-900">
                        ${(Number(item.priceSnapshot) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping Destination */}
        {order.address && (
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs text-gray-700 flex items-start space-x-3">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-gray-900 block">Delivering to:</span>
              <p className="text-gray-600 mt-0.5">
                {order.address.line1}, {order.address.city}, {order.address.state} {order.address.postalCode}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
          <Link
            to={`/orders/${order.id}`}
            className="flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-center text-xs transition shadow-md shadow-blue-500/20 flex items-center justify-center space-x-1.5"
          >
            <span>View Full Order Details</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/"
            className="py-3.5 px-6 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-center text-xs transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

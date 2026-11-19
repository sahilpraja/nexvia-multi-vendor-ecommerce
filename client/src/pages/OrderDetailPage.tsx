import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Package,
  Truck,
  AlertCircle,
  Ban,
  Clock,
  RotateCcw,
  XCircle,
  ShieldCheck,
  History,
  Copy,
  Check,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { api } from '../api/client.js';
import { Order, OrderStatusType } from '../types/index.js';

const STATUS_CONFIG: Record<
  OrderStatusType,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<any> }
> = {
  PENDING: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  CONFIRMED: { label: 'Confirmed', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle },
  PROCESSING: { label: 'Processing', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: Package },
  SHIPPED: { label: 'Shipped', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: Truck },
  DELIVERED: { label: 'Delivered', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: XCircle },
  RETURNED: { label: 'Returned', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: RotateCcw },
  REFUNDED: { label: 'Refunded', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', icon: RotateCcw },
  PAYMENT_FAILED: { label: 'Payment Failed', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
};

const STANDARD_STEPS: OrderStatusType[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  const fetchOrder = () => {
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleDownloadInvoice = () => {
    window.open(`/api/v1/orders/${id}/invoice`, '_blank');
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? This will release reserved inventory.')) {
      return;
    }
    try {
      setCancelling(true);
      const res = await api.post(`/orders/${id}/cancel`);
      setCancelMessage(res.data.message || 'Order cancelled successfully');
      fetchOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyTracking = () => {
    if (!order?.trackingNumber) return;
    navigator.clipboard.writeText(order.trackingNumber);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-gray-800">Order not found</h2>
        <Link to="/orders" className="text-blue-600 underline mt-2 inline-block">
          Return to Orders
        </Link>
      </div>
    );
  }

  const currentStatus = order.orderStatus || 'PENDING';
  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PENDING;
  const isCancellable =
    order.subOrders?.every((s) => s.status === 'PLACED') &&
    ['PENDING', 'CONFIRMED'].includes(order.orderStatus) &&
    order.paymentStatus !== 'REFUNDED' &&
    order.orderStatus !== 'CANCELLED';

  // Timeline step calculation
  const currentStepIndex = STANDARD_STEPS.indexOf(currentStatus);
  const isTerminalFailure = ['CANCELLED', 'RETURNED', 'REFUNDED', 'PAYMENT_FAILED'].includes(currentStatus);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/orders" className="inline-flex items-center text-xs text-blue-600 font-semibold mb-6 hover:underline">
        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to My Orders
      </Link>

      {cancelMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 text-xs rounded-2xl flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>{cancelMessage}</span>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400">Order Reference</span>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
            >
              {statusCfg.label}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">#{order.id.slice(0, 8)}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Placed on {new Date(order.createdAt).toLocaleString()} • Payment:{' '}
            <strong className={order.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}>
              {order.paymentStatus}
            </strong>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isCancellable && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
            >
              <Ban className="w-4 h-4" />
              <span>{cancelling ? 'Cancelling...' : 'Cancel Order'}</span>
            </button>
          )}

          <button
            onClick={handleDownloadInvoice}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition shadow-md flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Download Invoice</span>
          </button>
        </div>
      </div>

      {/* Courier & Tracking Banner (if available) */}
      {(order.courierName || order.trackingNumber) && (
        <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-blue-700 block">
                Carrier & Tracking Details
              </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {order.courierName || 'Standard Express'}
              </p>
              {order.trackingNumber && (
                <p className="text-xs font-mono text-gray-600 mt-0.5">
                  Waybill / Tracking: <span className="font-bold text-gray-900">{order.trackingNumber}</span>
                </p>
              )}
            </div>
          </div>

          {order.trackingNumber && (
            <button
              onClick={handleCopyTracking}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
            >
              {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTracking ? 'Copied' : 'Copy Tracking'}</span>
            </button>
          )}
        </div>
      )}

      {/* Interactive Delivery Lifecycle Stepper */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm mb-8 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center">
          <Truck className="w-4 h-4 mr-2 text-blue-600" />
          Live Order Tracking
        </h2>

        {isTerminalFailure ? (
          <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center space-x-3 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold block text-sm">Order Status: {statusCfg.label}</span>
              <p className="mt-0.5">
                This order has entered status {statusCfg.label}. Please review the status history below or contact support if you need assistance.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <div className="flex items-center justify-between w-full relative">
              {STANDARD_STEPS.map((step, idx) => {
                const isComplete = currentStepIndex >= 0 && idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={step} className="flex flex-col items-center flex-1 relative">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition z-10 ${
                        isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md'
                          : isComplete
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}
                    >
                      {isComplete && !isCurrent ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-bold mt-2 text-center ${
                        isCurrent ? 'text-blue-600 font-black' : isComplete ? 'text-gray-800' : 'text-gray-400'
                      }`}
                    >
                      {STATUS_CONFIG[step]?.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Order Status History Timeline */}
      {order.statusHistories && order.statusHistories.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm mb-8 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center">
            <History className="w-4 h-4 mr-2 text-indigo-600" />
            Order Timeline Updates
          </h2>

          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {order.statusHistories.map((h) => {
              const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.PENDING;
              return (
                <div key={h.id} className="relative space-y-1 text-xs">
                  <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${cfg.bg} ${cfg.text} flex items-center justify-center`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(h.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {h.note && <p className="text-xs text-gray-600 pl-0.5">{h.note}</p>}
                  {h.trackingNumber && (
                    <p className="text-[11px] font-mono text-blue-600">
                      Carrier: {h.courierName || 'Express'} • Tracking: {h.trackingNumber}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delivery Destination & Sub-Orders */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-gray-900">Items & Merchant Packages</h2>

        {order.subOrders?.map((sub) => (
          <div key={sub.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">Vendor Store</span>
                <h3 className="text-base font-extrabold text-gray-900">{sub.vendor?.storeName || 'Merchant'}</h3>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-800 uppercase">
                {sub.status}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {sub.orderItems?.map((item) => (
                <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-gray-900">{item.titleSnapshot}</span>
                    <p className="text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-gray-900">
                    ${(Number(item.priceSnapshot) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Shipping Address & Payment Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {order.address && (
            <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-2">
              <span className="font-bold text-gray-900 uppercase text-[10px] flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-blue-600" /> Shipping Destination
              </span>
              <p className="text-gray-900 font-semibold">{order.address.line1}</p>
              {order.address.line2 && <p className="text-gray-700">{order.address.line2}</p>}
              <p>
                {order.address.city}, {order.address.state} {order.address.postalCode}
              </p>
              <p className="text-gray-400">Recipient Phone: {order.address.phone}</p>
            </div>
          )}

          {/* Payment Method & Security Card */}
          <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-2">
            <span className="font-bold text-gray-900 uppercase text-[10px] flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Payment & Transaction
            </span>
            <div className="flex justify-between items-center pt-1">
              <span className="text-gray-500">Method:</span>
              <span className="font-bold text-gray-900">
                {order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Stripe Online Payment'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : order.paymentStatus === 'COD_PENDING'
                    ? 'bg-amber-100 text-amber-800'
                    : order.paymentStatus === 'REFUNDED'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
            {order.payment?.stripePaymentIntentId && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-500">Transaction ID:</span>
                <span className="font-mono text-gray-700 truncate max-w-[150px]">
                  {order.payment.stripePaymentIntentId}
                </span>
              </div>
            )}
            {order.paymentMethod === 'COD' && (
              <div className="pt-2 border-t border-gray-200/60 text-[11px] text-amber-900 font-medium">
                {order.payment?.codCollectedAt ? (
                  <p className="text-emerald-700 font-semibold">
                    Cash collected on {new Date(order.payment.codCollectedAt).toLocaleDateString()} by{' '}
                    {order.payment.codCollectedBy || 'Delivery Agent'}
                  </p>
                ) : (
                  <p>Pay exact cash of ${Number(order.total).toFixed(2)} to delivery partner upon receipt.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="p-6 rounded-3xl bg-blue-50/40 border border-blue-100 text-xs text-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-blue-900 uppercase text-[10px]">Verified Marketplace Order</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500 text-xs">All taxes and standard platform processing included</span>
          </div>

          <div className="sm:text-right space-y-1 w-full sm:w-auto">
            <div className="flex justify-between sm:justify-end sm:space-x-4">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-semibold text-gray-800">${Number(order.subtotal).toFixed(2)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between sm:justify-end sm:space-x-4 text-emerald-600 font-bold">
                <span>Discount:</span>
                <span>-${Number(order.discount).toFixed(2)}</span>
              </div>
            )}
            {Number(order.codCharges) > 0 && (
              <div className="flex justify-between sm:justify-end sm:space-x-4 text-gray-600">
                <span>COD Handling:</span>
                <span>${Number(order.codCharges).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between sm:justify-end sm:space-x-4 pt-1 border-t border-blue-200/50">
              <span className="text-sm font-black text-gray-900">Final Total:</span>
              <span className="text-base font-black text-blue-600">${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

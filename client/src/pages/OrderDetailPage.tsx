import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, Package, Truck, Home, AlertCircle, Ban } from 'lucide-react';
import { api } from '../api/client.js';
import { Order, SubOrderStatus } from '../types/index.js';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const fetchOrder = () => {
    api.get(`/orders/${id}`)
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
        <Link to="/orders" className="text-blue-600 underline mt-2 inline-block">Return to Orders</Link>
      </div>
    );
  }

  // Check if eligible for customer cancellation (all sub-orders PLACED)
  const isCancellable = order.subOrders.every((s) => s.status === 'PLACED') && order.paymentStatus !== 'REFUNDED';

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
          <span className="text-xs font-bold text-gray-400">Order Reference</span>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">#{order.id.slice(0, 8)}</h1>
          <p className="text-xs text-gray-500 mt-1">
            Confirmed on {new Date(order.createdAt).toLocaleString()}
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
            <span>Download PDF Invoice</span>
          </button>
        </div>
      </div>

      {/* Sub-Orders Lifecycle Breakdown */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-gray-900">Vendor Sub-Orders & Fulfillment Status</h2>

        {order.subOrders.map((sub) => {
          const statuses: SubOrderStatus[] = ['PLACED', 'PACKED', 'SHIPPED', 'DELIVERED'];
          const currentIndex = statuses.indexOf(sub.status);

          return (
            <div key={sub.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-gray-100 gap-2">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase">Vendor Store</span>
                  <h3 className="text-base font-extrabold text-gray-900">{sub.vendor?.storeName || 'Merchant'}</h3>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-800 uppercase">
                  Sub-Order Status: {sub.status}
                </span>
              </div>

              {/* Status Timeline */}
              {sub.status !== 'CANCELLED' ? (
                <div className="relative py-4">
                  <div className="flex items-center justify-between w-full">
                    {statuses.map((step, idx) => {
                      const isComplete = idx <= currentIndex;
                      const isCurrent = idx === currentIndex;

                      return (
                        <div key={step} className="flex flex-col items-center flex-1 relative">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition z-10 ${
                              isComplete ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {isComplete ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[11px] font-semibold mt-2 ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
                  This sub-order was cancelled and inventory has been returned.
                </div>
              )}

              {/* Items in Sub-Order */}
              <div className="divide-y divide-gray-100">
                {sub.orderItems.map((item) => (
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
          );
        })}
      </div>
    </div>
  );
};

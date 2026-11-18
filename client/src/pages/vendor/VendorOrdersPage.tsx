import React, { useState, useEffect } from 'react';
import { Package, ArrowRight, CheckCircle, Clock, Truck, ShieldAlert } from 'lucide-react';
import { api } from '../../api/client.js';
import { SubOrder, SubOrderStatus } from '../../types/index.js';

export const VendorOrdersPage: React.FC = () => {
  const [subOrders, setSubOrders] = useState<SubOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    api.get('/vendor/orders')
      .then((res) => setSubOrders(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAdvanceStatus = async (subOrderId: string, nextStatus: SubOrderStatus) => {
    try {
      setUpdatingId(subOrderId);
      await api.patch(`/vendor/suborders/${subOrderId}/status`, { status: nextStatus });
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update sub-order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getNextAction = (status: SubOrderStatus) => {
    if (status === 'PLACED') return { label: 'Mark as Packed', next: 'PACKED' as const };
    if (status === 'PACKED') return { label: 'Ship Parcel', next: 'SHIPPED' as const };
    if (status === 'SHIPPED') return { label: 'Confirm Delivered', next: 'DELIVERED' as const };
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Sub-Order Fulfillment</h1>
        <p className="text-xs text-gray-500 mt-1">
          Fulfill customer orders containing items from your store. Advance statuses in sequence.
        </p>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : subOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center shadow-sm">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">No sub-orders received yet</h3>
            <p className="text-xs text-gray-500 mt-1">When customers purchase your products, sub-orders will be listed here.</p>
          </div>
        ) : (
          subOrders.map((sub: any) => {
            const action = getNextAction(sub.status);

            return (
              <div
                key={sub.id}
                className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-gray-100 gap-2">
                  <div>
                    <span className="text-xs text-gray-400 font-mono">Sub-Order #{sub.id.slice(0, 8)}</span>
                    <p className="text-xs text-gray-600 font-semibold mt-0.5">
                      Customer: {sub.order?.customer?.name} ({sub.order?.customer?.email})
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold px-3 py-1 rounded-full uppercase bg-indigo-50 text-indigo-700">
                      Status: {sub.status}
                    </span>
                    <span className="text-base font-black text-gray-900">
                      ${Number(sub.subtotal).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50 text-xs">
                  {sub.orderItems?.map((item: any) => (
                    <div key={item.id} className="py-2 flex justify-between items-center text-gray-700">
                      <div>
                        <span className="font-semibold text-gray-900">{item.titleSnapshot}</span>
                        <span className="text-gray-400 ml-2">x{item.quantity}</span>
                      </div>
                      <span className="font-bold">
                        ${(Number(item.priceSnapshot) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Shipping Destination */}
                {sub.order?.address && (
                  <div className="bg-gray-50 p-3 rounded-2xl text-[11px] text-gray-600 flex justify-between items-center">
                    <span>
                      Ship to: {sub.order.address.line1}, {sub.order.address.city}, {sub.order.address.state} {sub.order.address.postalCode}
                    </span>
                    <span className="font-mono text-gray-400">Tel: {sub.order.address.phone}</span>
                  </div>
                )}

                {/* Sequential Step Progression Button */}
                <div className="pt-2 flex justify-end">
                  {action ? (
                    <button
                      onClick={() => handleAdvanceStatus(sub.id, action.next)}
                      disabled={updatingId === sub.id}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <span>{updatingId === sub.id ? 'Advancing status...' : action.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : sub.status === 'DELIVERED' ? (
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-xl flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Order Fully Delivered & Completed
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-xl">
                      Order Cancelled
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

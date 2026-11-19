import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, FileText } from 'lucide-react';
import { api } from '../api/client.js';
import { Order } from '../types/index.js';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders')
      .then((res) => setOrders(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-8">My Order History</h1>

      {orders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center shadow-sm">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-800">No orders placed yet</h2>
          <p className="text-sm text-gray-500 mt-1 mb-4">When you place an order, it will appear here.</p>
          <Link to="/" className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-xs shadow-md">
            Start Exploring
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm hover:border-blue-300 transition"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-100 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-900">Order #{order.id.slice(0, 8)}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        order.paymentMethod === 'COD'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-blue-100 text-blue-900 border border-blue-200'
                      }`}
                    >
                      {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Stripe Online'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      order.paymentStatus === 'PAID'
                        ? 'bg-green-100 text-green-800'
                        : order.paymentStatus === 'COD_PENDING'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : order.paymentStatus === 'REFUNDED'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {order.paymentStatus === 'COD_PENDING' ? 'COD: Pay on Handover' : `Payment: ${order.paymentStatus}`}
                  </span>
                  <span className="text-base font-extrabold text-gray-900">
                    ${Number(order.total).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Sub-Orders List */}
              <div className="mt-4 space-y-3">
                {order.subOrders?.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex justify-between items-center bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-xs"
                  >
                    <div>
                      <span className="font-bold text-blue-700">Vendor: {sub.vendor?.storeName || 'Merchant'}</span>
                      <p className="text-gray-500 mt-0.5">{sub.orderItems?.length || 0} product item(s)</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-gray-700 uppercase bg-white px-2 py-1 rounded border border-gray-200">
                        Status: {sub.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end items-center space-x-3">
                <Link
                  to={`/orders/${order.id}`}
                  className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <span>View Details & Tracking</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

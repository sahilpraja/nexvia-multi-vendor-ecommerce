import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Eye,
  ShieldAlert,
  MapPin,
  User,
  CreditCard,
  Calendar,
  ChevronDown,
  ExternalLink,
  History,
  X,
  FileText,
  Loader2,
  Store,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Order, OrderStatusType, OrderStatusHistory } from '../../types/index.js';

const STATUS_CONFIG: Record<
  OrderStatusType,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<any> }
> = {
  PENDING: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  CONFIRMED: { label: 'Confirmed', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle2 },
  PROCESSING: { label: 'Processing', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: Package },
  SHIPPED: { label: 'Shipped', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: Truck },
  DELIVERED: { label: 'Delivered', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: XCircle },
  RETURNED: { label: 'Returned', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: RotateCcw },
  REFUNDED: { label: 'Refunded', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', icon: RotateCcw },
  PAYMENT_FAILED: { label: 'Payment Failed', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertTriangle },
};

const ALL_STATUSES: OrderStatusType[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
  'PAYMENT_FAILED',
];

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'PROCESSING', 'PAYMENT_FAILED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED', 'CANCELLED'],
  DELIVERED: ['RETURNED', 'REFUNDED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: ['REFUNDED'],
  PAYMENT_FAILED: ['PENDING', 'CANCELLED'],
  REFUNDED: [],
};

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal / Detail state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusForm, setStatusForm] = useState<{
    status: OrderStatusType;
    courierName: string;
    trackingNumber: string;
    note: string;
  }>({
    status: 'PENDING',
    courierName: '',
    trackingNumber: '',
    note: '',
  });

  // Confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    orderId: string;
    targetStatus: OrderStatusType;
  } | null>(null);

  // Notification banners
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await api.get(`/admin/orders?${params.toString()}`);
      setOrders(res.data.data.orders);
      setStatusCounts(res.data.data.statusCounts || {});
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to fetch customer orders',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOrders();
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const handleOpenDetailModal = (order: Order) => {
    setSelectedOrder(order);
    setStatusForm({
      status: order.orderStatus || 'PENDING',
      courierName: order.courierName || '',
      trackingNumber: order.trackingNumber || '',
      note: '',
    });
  };

  const handleInitiateQuickStatusChange = (order: Order, newStatus: OrderStatusType) => {
    if (order.orderStatus === newStatus) return;

    // If changing to sensitive status, ask confirmation
    if (['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(newStatus)) {
      setConfirmModal({
        show: true,
        orderId: order.id,
        targetStatus: newStatus,
      });
      return;
    }

    executeStatusUpdate(order.id, newStatus);
  };

  const executeStatusUpdate = async (
    orderId: string,
    targetStatus: OrderStatusType,
    extraData?: { courierName?: string; trackingNumber?: string; note?: string }
  ) => {
    try {
      setUpdatingStatus(true);
      setNotification(null);

      const payload = {
        status: targetStatus,
        courierName: extraData?.courierName,
        trackingNumber: extraData?.trackingNumber,
        note: extraData?.note,
      };

      const res = await api.patch(`/admin/orders/${orderId}/status`, payload);
      const updatedOrder = res.data.data;

      // Update state locally
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updatedOrder);
      }

      setNotification({
        type: 'success',
        message: `Order #${orderId.slice(0, 8)} status updated to ${targetStatus} successfully!`,
      });

      setConfirmModal(null);
      // Refresh count pills
      fetchOrders();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Could not update order status.',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    executeStatusUpdate(selectedOrder.id, statusForm.status, {
      courierName: statusForm.courierName,
      trackingNumber: statusForm.trackingNumber,
      note: statusForm.note,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <nav className="text-xs text-gray-400 mb-1 flex items-center space-x-1.5 font-medium">
            <Link to="/admin/dashboard" className="hover:text-blue-600 transition">Admin Dashboard</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Orders Management</span>
          </nav>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Order Status Management
            </h1>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
              Admin Control
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Track customer shipments, update delivery lifecycles, assign tracking numbers, and view audit timelines
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/admin/dashboard"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
          >
            <span>Analytics Dashboard</span>
          </Link>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Refresh Orders
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order ID, Customer name, email, tracking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
            />
          </div>

          <div className="text-xs text-gray-500 font-semibold self-end sm:self-auto">
            Showing <strong className="text-gray-900">{orders.length}</strong> matching orders
          </div>
        </div>

        {/* Status Filter Badges (Horizontal scrollable pills) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
              statusFilter === 'ALL'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            <span>All Orders</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {statusCounts.ALL || 0}
            </span>
          </button>

          {ALL_STATUSES.map((status) => {
            const count = statusCounts[status] || 0;
            const config = STATUS_CONFIG[status];
            const isSelected = statusFilter === status;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  isSelected
                    ? `${config.bg} ${config.text} border-2 ${config.border} shadow-sm`
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <span>{config.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-black/10' : 'bg-gray-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500 font-semibold">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Package className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-900">No orders found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No orders matched your active filter or search keyword. Try clearing filters.
            </p>
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSearch('');
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-black uppercase tracking-wider text-gray-500">
                  <th className="py-4 px-6">Order ID & Date</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Items & Stores</th>
                  <th className="py-4 px-6">Total & Payment</th>
                  <th className="py-4 px-6">Courier / Tracking</th>
                  <th className="py-4 px-6">Status Dropdown</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {orders.map((order) => {
                  const currentConfig = STATUS_CONFIG[order.orderStatus || 'PENDING'] || STATUS_CONFIG.PENDING;
                  const Icon = currentConfig.icon;
                  const totalItems = order.subOrders?.reduce(
                    (acc, s) => acc + s.orderItems.reduce((iAcc, item) => iAcc + item.quantity, 0),
                    0
                  ) || 0;

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Order ID & Date */}
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-blue-600 block">
                          #{order.id.slice(0, 8)}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()} at{' '}
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-6">
                        <span className="font-bold text-gray-900 block truncate max-w-[150px]">
                          {order.customer?.name || 'Customer'}
                        </span>
                        <span className="text-[11px] text-gray-500 truncate max-w-[150px] block">
                          {order.customer?.email || 'N/A'}
                        </span>
                      </td>

                      {/* Items & Stores */}
                      <td className="py-4 px-6">
                        <span className="font-semibold text-gray-900 block">
                          {totalItems} item{totalItems !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {order.subOrders?.length || 0} vendor store{(order.subOrders?.length || 0) !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Total & Payment Status */}
                      <td className="py-4 px-6">
                        <span className="font-black text-gray-900 block">
                          ${Number(order.total).toFixed(2)}
                        </span>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.paymentStatus === 'REFUNDED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>

                      {/* Courier & Tracking */}
                      <td className="py-4 px-6">
                        {order.trackingNumber ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-gray-800 block text-[11px]">
                              {order.courierName || 'Courier'}
                            </span>
                            <span className="font-mono text-[10px] text-blue-600 block truncate max-w-[120px]">
                              {order.trackingNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Not assigned</span>
                        )}
                      </td>

                      {/* Quick Status Dropdown */}
                      <td className="py-4 px-6">
                        <div className="relative inline-block w-44">
                          <select
                            value={order.orderStatus || 'PENDING'}
                            onChange={(e) =>
                              handleInitiateQuickStatusChange(order, e.target.value as OrderStatusType)
                            }
                            disabled={updatingStatus}
                            className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border cursor-pointer appearance-none outline-none transition ${currentConfig.bg} ${currentConfig.text} ${currentConfig.border} focus:ring-2 focus:ring-blue-500/20`}
                          >
                            {ALL_STATUSES.map((st) => (
                              <option key={st} value={st} className="bg-white text-gray-800 py-1 font-semibold">
                                {STATUS_CONFIG[st].label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none text-current opacity-70" />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleOpenDetailModal(order)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 font-bold rounded-xl text-xs transition inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail & Timeline Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl overflow-y-auto p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-600">
                    Order Details: #{selectedOrder.id}
                  </span>
                  <h2 className="text-xl font-black text-gray-900 mt-1">
                    Manage Order & Tracking
                  </h2>
                  <p className="text-xs text-gray-500">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Update Form */}
              <form onSubmit={handleModalSubmit} className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200/80 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center">
                  <Truck className="w-4 h-4 mr-1.5 text-blue-600" />
                  Update Order Lifecycle & Courier Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      New Status
                    </label>
                    <select
                      value={statusForm.status}
                      onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as OrderStatusType })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {STATUS_CONFIG[st].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Courier / Carrier Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FedEx, DHL, BlueDart, UPS"
                      value={statusForm.courierName}
                      onChange={(e) => setStatusForm({ ...statusForm, courierName: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Tracking Number / Waybill ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 789456123012"
                      value={statusForm.trackingNumber}
                      onChange={(e) => setStatusForm({ ...statusForm, trackingNumber: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                      Update Note / Reason
                    </label>
                    <input
                      type="text"
                      placeholder="Optional explanation for status transition..."
                      value={statusForm.note}
                      onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={updatingStatus}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Status & Tracking</span>
                  </button>
                </div>
              </form>

              {/* Order Status History / Timeline */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center">
                  <History className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Order Status Audit History & Timeline
                </h3>

                {(!selectedOrder.statusHistories || selectedOrder.statusHistories.length === 0) ? (
                  <p className="text-xs text-gray-400 italic">No history events recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                    {selectedOrder.statusHistories.map((h, idx) => {
                      const cfg = STATUS_CONFIG[h.status as OrderStatusType] || STATUS_CONFIG.PENDING;
                      return (
                        <div key={h.id || idx} className="relative space-y-1">
                          <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${cfg.bg} ${cfg.text} flex items-center justify-center`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>
                              {h.status}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(h.createdAt).toLocaleString()}
                            </span>
                            {h.updatedBy && (
                              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                By: {h.updatedBy}
                              </span>
                            )}
                          </div>
                          {h.note && <p className="text-xs text-gray-600 pl-0.5">{h.note}</p>}
                          {h.trackingNumber && (
                            <p className="text-[11px] text-blue-600 font-mono">
                              {h.courierName ? `${h.courierName}: ` : 'Tracking: '}
                              {h.trackingNumber}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Customer & Shipping Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex items-center text-gray-500 font-bold uppercase text-[10px]">
                    <User className="w-3.5 h-3.5 mr-1 text-blue-600" /> Customer Information
                  </div>
                  <p className="font-bold text-gray-900">{selectedOrder.customer?.name || 'Customer'}</p>
                  <p className="text-gray-500">{selectedOrder.customer?.email}</p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex items-center text-gray-500 font-bold uppercase text-[10px]">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Delivery Destination
                  </div>
                  <p className="font-bold text-gray-900">{selectedOrder.address?.line1}</p>
                  <p className="text-gray-500">
                    {selectedOrder.address?.city}, {selectedOrder.address?.state} {selectedOrder.address?.postalCode}
                  </p>
                  <p className="text-gray-400">Tel: {selectedOrder.address?.phone}</p>
                </div>
              </div>

              {/* Ordered Items List */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Products in this Order ({selectedOrder.subOrders?.length || 0} Sub-Orders)
                </h3>

                <div className="space-y-3">
                  {selectedOrder.subOrders?.map((sub) => (
                    <div key={sub.id} className="p-4 rounded-2xl border border-gray-200/80 bg-white space-y-2 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="font-bold text-blue-700 uppercase flex items-center">
                          <Store className="w-3.5 h-3.5 mr-1" />
                          {sub.vendor?.storeName || 'Merchant'}
                        </span>
                        <span className="font-black text-gray-900">${Number(sub.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {sub.orderItems?.map((item) => (
                          <div key={item.id} className="py-2 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-semibold text-gray-900">{item.titleSnapshot}</span>
                              <span className="text-gray-400 block text-[11px]">Qty: {item.quantity}</span>
                            </div>
                            <span className="font-bold text-gray-900">
                              ${(Number(item.priceSnapshot) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <a
                href={`/api/v1/orders/${selectedOrder.id}/invoice`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition inline-flex items-center space-x-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>PDF Invoice</span>
              </a>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-xs transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-gray-900">
                Confirm Status Transition to {confirmModal.targetStatus}?
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Are you sure you want to transition Order #{confirmModal.orderId.slice(0, 8)} to{' '}
                <strong>{confirmModal.targetStatus}</strong>? This will notify the customer and update merchant records.
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeStatusUpdate(confirmModal.orderId, confirmModal.targetStatus)}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-rose-500/20"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

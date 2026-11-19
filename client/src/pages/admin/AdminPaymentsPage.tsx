import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Eye,
  ExternalLink,
  ShieldCheck,
  Package,
  X,
  History,
  Check,
  Banknote,
  Receipt,
  User,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService.js';
import { PaymentMethod, PaymentStatus } from '../../types/index.js';

interface PaymentStats {
  totalRevenue: number;
  stripeVolume: number;
  codCollected: number;
  codPending: number;
  failedCount: number;
  refundsCount: number;
  refundsTotal: number;
  totalCount: number;
  breakdown: {
    stripePaidCount: number;
    codPaidCount: number;
    codPendingCount: number;
  };
}

export const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);

  // Modals state
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [showCodModal, setShowCodModal] = useState<any | null>(null);
  const [showRefundModal, setShowRefundModal] = useState<any | null>(null);
  const [showAuditModal, setShowAuditModal] = useState<any | null>(null);

  // Refund Form State
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const data = await paymentService.getAdminPaymentStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load payment statistics:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getAdminPayments({
        search: search.trim() || undefined,
        method: methodFilter !== 'ALL' ? methodFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page,
        limit: 15,
      });
      setPayments(data.payments || []);
      setTotalPages(data.totalPages || 1);
      setTotalPayments(data.total || 0);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [search, methodFilter, statusFilter, page]);

  // Handle Confirm COD Collection
  const handleConfirmCodCollection = async () => {
    if (!showCodModal) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await paymentService.confirmCodCollection(showCodModal.id);
      setActionSuccess('Cash on delivery collection successfully confirmed!');
      setShowCodModal(null);
      await Promise.all([fetchStats(), fetchPayments()]);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to confirm COD collection');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Refund Submission
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRefundModal) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await paymentService.refundPayment(showRefundModal.id, {
        amount: refundAmount ? parseFloat(refundAmount) : undefined,
        reason: refundReason.trim() || undefined,
      });
      setActionSuccess('Payment refund processed successfully!');
      setShowRefundModal(null);
      setRefundAmount('');
      setRefundReason('');
      await Promise.all([fetchStats(), fetchPayments()]);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-8 h-8 text-blue-600" />
            Payment Management & Transactions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time multi-vendor transactions, Stripe online settlements, and Cash on Delivery (COD) collection control.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center space-x-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-2xl flex items-center space-x-2 animate-fade-in shadow-sm">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden group hover:border-blue-400 transition">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Total Settled Revenue</span>
                <h3 className="text-2xl font-black text-gray-900 mt-1">${stats.totalRevenue.toFixed(2)}</h3>
                <span className="text-xs text-emerald-600 font-bold mt-0.5 block">100% Verified Paid Orders</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Stripe Online Volume */}
          <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden group hover:border-indigo-400 transition">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Stripe Online Volume</span>
                <h3 className="text-2xl font-black text-gray-900 mt-1">${stats.stripeVolume.toFixed(2)}</h3>
                <span className="text-xs text-indigo-600 font-bold mt-0.5 block">
                  {stats.breakdown.stripePaidCount} successful transaction(s)
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* COD Pending Collection */}
          <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden group hover:border-amber-400 transition">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">COD Pending Collection</span>
                <h3 className="text-2xl font-black text-amber-700 mt-1">${stats.codPending.toFixed(2)}</h3>
                <span className="text-xs text-amber-600 font-bold mt-0.5 block">
                  {stats.breakdown.codPendingCount} pending doorstep handovers
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* COD Collected vs Refunds */}
          <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden group hover:border-teal-400 transition">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">COD Cash Collected</span>
                <h3 className="text-2xl font-black text-teal-800 mt-1">${stats.codCollected.toFixed(2)}</h3>
                <span className="text-xs text-teal-600 font-bold mt-0.5 block">
                  {stats.breakdown.codPaidCount} confirmed collection(s)
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by Order ID, Customer Name, Email, or Stripe Session/Intent ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Method Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-semibold text-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="STRIPE">Stripe Online</option>
              <option value="COD">Cash on Delivery (COD)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-semibold text-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="COD_PENDING">COD_PENDING</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
              <option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-400 font-semibold">Loading payment transactions...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-16 text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">No payment records found</h3>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Order / Customer</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4">Provider / Reference ID</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => {
                  const isCod = p.paymentMethod === 'COD';
                  const isPaid = p.status === 'PAID';
                  const isCodPending = p.status === 'COD_PENDING';
                  const isRefunded = p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED';

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition">
                      {/* Order / Customer */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/orders/${p.orderId}`}
                          className="font-mono font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          #{p.orderId.slice(0, 8)}
                          <ExternalLink className="w-3 h-3 text-blue-400" />
                        </Link>
                        <p className="font-semibold text-gray-900 mt-0.5 truncate max-w-[180px]">
                          {p.order?.customer?.name || 'Customer'}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[180px]">
                          {p.order?.customer?.email}
                        </p>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isCod
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}
                        >
                          {isCod ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                          {isCod ? 'Cash on Delivery' : 'Stripe Online'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4">
                        <span className="font-black text-gray-900 text-sm">
                          ${Number(p.amount).toFixed(2)}
                        </span>
                        {Number(p.refundedAmount || 0) > 0 && (
                          <span className="block text-[10px] text-purple-700 font-bold">
                            Refunded: -${Number(p.refundedAmount).toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isCodPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isRefunded
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* Provider Reference */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                        {p.stripePaymentIntentId ? (
                          <span title={p.stripePaymentIntentId} className="block truncate max-w-[140px]">
                            {p.stripePaymentIntentId}
                          </span>
                        ) : p.stripeSessionId ? (
                          <span title={p.stripeSessionId} className="block truncate max-w-[140px]">
                            {p.stripeSessionId}
                          </span>
                        ) : isCod && p.codCollectedAt ? (
                          <span className="text-emerald-700 font-bold block">
                            Collected by {p.codCollectedBy || 'Admin'}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Doorstep cash pending</span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString()}
                        <span className="block text-[10px] text-gray-400">
                          {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Confirm COD Collection button */}
                        {isCod && isCodPending && (
                          <button
                            onClick={() => setShowCodModal(p)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-[11px] transition shadow-sm"
                          >
                            Confirm Cash
                          </button>
                        )}

                        {/* Refund button (for paid orders) */}
                        {isPaid && (
                          <button
                            onClick={() => {
                              setShowRefundModal(p);
                              setRefundAmount(
                                (Number(p.amount) - Number(p.refundedAmount || 0)).toFixed(2)
                              );
                              setRefundReason('');
                            }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-[11px] transition"
                          >
                            Refund
                          </button>
                        )}

                        {/* Audit Transactions History */}
                        <button
                          onClick={() => setShowAuditModal(p)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-[11px] transition"
                          title="View Transaction Audit Trail"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
            <span>
              Showing Page {page} of {totalPages} ({totalPayments} total transactions)
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-gray-200 font-bold hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-gray-200 font-bold hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Confirm COD Collection */}
      {showCodModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-600" /> Confirm COD Cash Collection
              </h3>
              <button onClick={() => setShowCodModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to confirm cash collection for Order #{showCodModal.orderId.slice(0, 8)}?
              This will update the payment to <strong>PAID</strong>, mark the order as delivered, and credit merchant payout ledgers.
            </p>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-amber-800 font-medium">Payable Amount:</span>
                <span className="font-extrabold text-amber-900">${Number(showCodModal.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800 font-medium">Customer:</span>
                <span className="font-semibold text-gray-800">{showCodModal.order?.customer?.name}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCodModal(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmCodCollection}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs transition shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Cash Received'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Refund Payment */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-600" /> Initiate Payment Refund
              </h3>
              <button onClick={() => setShowRefundModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Refund Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={(Number(showRefundModal.amount) - Number(showRefundModal.refundedAmount || 0)).toFixed(2)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Max refundable: ${(Number(showRefundModal.amount) - Number(showRefundModal.refundedAmount || 0)).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Reason for Refund
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customer returned items, damaged in transit, requested by customer..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-xs transition shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing Refund...' : 'Process Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transaction Audit Trail */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" /> Transaction Audit Trail
              </h3>
              <button onClick={() => setShowAuditModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {showAuditModal.transactions && showAuditModal.transactions.length > 0 ? (
                showAuditModal.transactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-gray-900 uppercase text-[10px] tracking-wider">
                        {tx.type}
                      </span>
                      <span className="font-mono font-bold text-gray-900">${Number(tx.amount).toFixed(2)}</span>
                    </div>
                    <p className="text-gray-600 text-[11px]">{tx.note || 'No notes attached'}</p>
                    <div className="flex justify-between items-center pt-1 text-[10px] text-gray-400">
                      <span>Status: {tx.status}</span>
                      <span>{new Date(tx.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 text-center py-6">No historical audit transactions recorded.</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAuditModal(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 font-bold text-gray-800 rounded-xl text-xs transition"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

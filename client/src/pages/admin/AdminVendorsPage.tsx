import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Store,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Mail,
  User,
  Phone,
  Calendar,
  Package,
  ShoppingBag,
  ExternalLink,
  Loader2,
  AlertCircle,
  Ban,
  Check,
  FileText,
} from 'lucide-react';
import { api } from '../../api/client.js';

/* ───────────── Types ───────────── */
interface VendorItem {
  id: string;
  userId: string;
  storeName: string;
  description?: string | null;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  rejectionReason?: string | null;
  payoutAccountId?: string | null;
  createdAt: string;
  updatedAt: string;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
  _count?: {
    products: number;
    subOrders: number;
  };
}

interface VendorDetail extends VendorItem {
  products?: Array<{
    id: string;
    title: string;
    price: number;
    stock: number;
    sku: string;
    status: string;
    category?: { id: string; name: string };
    images?: Array<{ position: number; url: string }>;
  }>;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ───────────── Toast ───────────── */
interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastCount = 0;

export const AdminVendorsPage: React.FC = () => {
  // Data state
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals
  const [detailVendor, setDetailVendor] = useState<VendorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Sensitive action confirmation dialogs
  const [confirmApprove, setConfirmApprove] = useState<VendorItem | null>(null);
  const [rejectModal, setRejectModal] = useState<{ vendor: VendorItem; reason: string } | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<VendorItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = ++toastCount;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ── Fetch Vendors ── */
  const fetchVendors = useCallback(
    async (page = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const params: Record<string, string | number> = { page, limit: 15 };
        if (search) params.search = search;
        if (statusFilter !== 'ALL') params.status = statusFilter;

        const res = await api.get('/admin/vendors', { params });
        setVendors(res.data.data.vendors || []);
        setPagination(res.data.data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
      } catch (err: any) {
        addToast('error', err.response?.data?.message || 'Failed to fetch vendors');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, addToast]
  );

  useEffect(() => {
    fetchVendors(1);
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchVendors(1);
    }, 350);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch Single Vendor Details ── */
  const handleOpenDetail = async (v: VendorItem) => {
    setDetailLoading(true);
    setDetailVendor(v as VendorDetail);
    try {
      const res = await api.get(`/admin/vendors/${v.id}`);
      setDetailVendor(res.data.data);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to fetch vendor profile');
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── Status Update Actions ── */
  const executeStatusUpdate = async (vendorId: string, status: string, rejectionReason?: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/vendors/${vendorId}/status`, {
        status,
        rejectionReason: rejectionReason || undefined,
      });

      addToast('success', `Vendor store status updated to ${status}`);
      setConfirmApprove(null);
      setRejectModal(null);
      setConfirmSuspend(null);
      fetchVendors(pagination.page, true);

      // If viewing in detail modal, update it
      if (detailVendor && detailVendor.id === vendorId) {
        setDetailVendor({
          ...detailVendor,
          status: status as any,
          rejectionReason: rejectionReason || null,
        });
      }
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to update vendor status');
    } finally {
      setActionLoading(false);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Compute pending count for badge
  const pendingCount = vendors.filter((v) => v.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* ═══ Toast Notifications ═══ */}
      <div className="fixed top-4 right-4 z-[60] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-bold ${
              t.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* ═══ Page Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Store className="w-7 h-7 text-emerald-600" />
            <span>Vendor Management</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Review onboarding applications, verify merchant credentials, and moderate storefront permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchVendors(pagination.page, true)}
            disabled={refreshing}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh merchant accounts"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ═══ Search & Status Tabs Bar ═══ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search store name, owner, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
            {[
              { id: 'ALL', label: 'All Merchants' },
              { id: 'PENDING', label: 'Pending Review' },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'SUSPENDED', label: 'Suspended' },
              { id: 'REJECTED', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === 'PENDING' && pendingCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Summary Info ═══ */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <p className="font-semibold">
          {pagination.total} merchant{pagination.total === 1 ? '' : 's'} registered
          {search && ` matching "${search}"`}
        </p>
      </div>

      {/* ═══ Vendors Data Table ═══ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="animate-pulse space-y-0">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                  <div className="h-2 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-20" />
                <div className="h-5 bg-gray-200 rounded-full w-16" />
              </div>
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No vendors found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or filter options.'
                : 'No merchant stores have been registered on the marketplace yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/70 text-gray-900 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-5">Store & Business</th>
                    <th className="py-3 px-3">Owner Contact</th>
                    <th className="py-3 px-3">Catalog Size</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Registered</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50/70 transition group">
                      {/* Store & Description */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                            {v.storeName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate max-w-[200px]">
                              {v.storeName}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate max-w-[200px]">
                              {v.description || 'No description provided'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Owner Contact */}
                      <td className="py-3 px-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{v.user.name}</p>
                          <p className="text-[10px] font-mono text-gray-400 truncate">{v.user.email}</p>
                          {v.phone && (
                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{v.phone}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Products & Orders */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 inline-flex items-center gap-1">
                            <Package className="w-3 h-3 text-gray-400" />
                            {v._count?.products || 0} products
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {v._count?.subOrders || 0} fulfillments
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            v.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : v.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : v.status === 'SUSPENDED'
                              ? 'bg-red-50 text-red-700 border border-red-200/60'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {v.status}
                        </span>
                        {v.status === 'REJECTED' && v.rejectionReason && (
                          <p className="text-[9px] text-red-600 truncate max-w-[120px] mt-0.5" title={v.rejectionReason}>
                            Reason: {v.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                        {fmtDate(v.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => handleOpenDetail(v)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                            title="View vendor details & catalog"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Approve / Activate */}
                          {v.status !== 'APPROVED' && (
                            <button
                              onClick={() => setConfirmApprove(v)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[10px] transition flex items-center gap-1"
                              title="Approve or activate merchant"
                            >
                              <Check className="w-3 h-3" />
                              <span>{v.status === 'SUSPENDED' ? 'Activate' : 'Approve'}</span>
                            </button>
                          )}

                          {/* Reject (for Pending) */}
                          {v.status === 'PENDING' && (
                            <button
                              onClick={() => setRejectModal({ vendor: v, reason: '' })}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-[10px] transition flex items-center gap-1"
                              title="Reject merchant application"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          )}

                          {/* Suspend (for Approved) */}
                          {v.status === 'APPROVED' && (
                            <button
                              onClick={() => setConfirmSuspend(v)}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-[10px] transition flex items-center gap-1"
                              title="Suspend merchant store"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Suspend</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-500 font-medium">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchVendors(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-gray-700 px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchVendors(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ View Vendor Profile & Catalog Modal ═══ */}
      {detailVendor && (
        <ModalOverlay onClose={() => setDetailVendor(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-600" />
                Merchant Profile & Catalog
              </h3>
              <button
                onClick={() => setDetailVendor(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : (
                <>
                  {/* Store Overview */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-md">
                        {detailVendor.storeName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-gray-900">{detailVendor.storeName}</h4>
                        <p className="text-xs text-gray-500">{detailVendor.description || 'No description provided.'}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              detailVendor.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : detailVendor.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {detailVendor.status}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            Registered {fmtDate(detailVendor.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rejection notice if present */}
                  {detailVendor.status === 'REJECTED' && detailVendor.rejectionReason && (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800">
                      <p className="font-bold">Rejection Reason:</p>
                      <p className="mt-0.5">{detailVendor.rejectionReason}</p>
                    </div>
                  )}

                  {/* Business & Account Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Owner Name
                      </span>
                      <p className="text-xs font-bold text-gray-900 truncate">{detailVendor.user.name}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Owner Email
                      </span>
                      <p className="text-xs font-mono font-medium text-gray-900 truncate">
                        {detailVendor.user.email}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Phone Contact
                      </span>
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {detailVendor.phone || 'Not provided'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Catalog Size
                      </span>
                      <p className="text-xs font-bold text-gray-900">
                        {detailVendor._count?.products || 0} items
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Total Orders
                      </span>
                      <p className="text-xs font-bold text-gray-900">
                        {detailVendor._count?.subOrders || 0} fulfilled
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Payout Account
                      </span>
                      <p className="text-xs font-mono text-gray-900 truncate">
                        {detailVendor.payoutAccountId || 'Standard Payout'}
                      </p>
                    </div>
                  </div>

                  {/* Merchant Products Catalog */}
                  <div>
                    <h5 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Store Products ({detailVendor.products?.length || 0})</span>
                    </h5>
                    {!detailVendor.products || detailVendor.products.length === 0 ? (
                      <p className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-xl text-center">
                        This vendor has not published any products yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                        {detailVendor.products.map((p) => (
                          <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {p.images && p.images[0] ? (
                                <img
                                  src={p.images[0].url}
                                  alt={p.title}
                                  className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate max-w-[240px]">{p.title}</p>
                                <p className="text-[10px] text-gray-400 font-mono">SKU: {p.sku}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-gray-900">${p.price.toFixed(2)}</p>
                              <span
                                className={`text-[10px] font-bold uppercase ${
                                  p.status === 'ACTIVE' ? 'text-emerald-600' : 'text-gray-400'
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar inside Detail */}
                  <div className="pt-4 border-t border-gray-100 flex justify-end gap-2.5">
                    {detailVendor.status !== 'APPROVED' && (
                      <button
                        onClick={() => {
                          setDetailVendor(null);
                          setConfirmApprove(detailVendor);
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
                      >
                        {detailVendor.status === 'SUSPENDED' ? 'Activate Merchant' : 'Approve Application'}
                      </button>
                    )}
                    {detailVendor.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          setDetailVendor(null);
                          setRejectModal({ vendor: detailVendor, reason: '' });
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
                      >
                        Reject Application
                      </button>
                    )}
                    {detailVendor.status === 'APPROVED' && (
                      <button
                        onClick={() => {
                          setDetailVendor(null);
                          setConfirmSuspend(detailVendor);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
                      >
                        Suspend Storefront
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══ Confirm Approval Modal ═══ */}
      {confirmApprove && (
        <ModalOverlay onClose={() => setConfirmApprove(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-gray-900">
              {confirmApprove.status === 'SUSPENDED' ? 'Re-activate Vendor Store?' : 'Approve Vendor Application?'}
            </h3>
            <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
              Grant <strong>"{confirmApprove.storeName}"</strong> permission to list products and sell on the marketplace.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setConfirmApprove(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => executeStatusUpdate(confirmApprove.id, 'APPROVED')}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Approval
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══ Reject Vendor with Reason Modal ═══ */}
      {rejectModal && (
        <ModalOverlay onClose={() => setRejectModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-gray-900">Reject Application</h3>
              <p className="text-xs text-gray-500 mt-1">
                Rejecting application for <strong>"{rejectModal.vendor.storeName}"</strong>
              </p>
            </div>

            <div className="mt-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                Rejection Reason *
              </label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                placeholder="Specify reason (e.g. Incomplete merchant documentation, prohibited product categories...)"
                rows={3}
                className="w-full px-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectModal.reason.trim()) {
                    return addToast('error', 'Please provide a reason for rejection');
                  }
                  executeStatusUpdate(rejectModal.vendor.id, 'REJECTED', rejectModal.reason.trim());
                }}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══ Confirm Suspend Modal ═══ */}
      {confirmSuspend && (
        <ModalOverlay onClose={() => setConfirmSuspend(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-gray-900">Suspend Vendor Account?</h3>
            <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
              Are you sure you want to suspend <strong>"{confirmSuspend.storeName}"</strong>? This will temporarily hide
              their active products and restrict their vendor portal access.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setConfirmSuspend(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => executeStatusUpdate(confirmSuspend.id, 'SUSPENDED')}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Suspension
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};

/* ── Modal Overlay Helper ── */
const ModalOverlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative z-10 w-full flex justify-center">{children}</div>
  </div>
);

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  MoreVertical,
  ArrowUpDown,
  PackageX,
  Store,
  Tag,
  DollarSign,
  Archive,
  Loader2,
} from 'lucide-react';
import { api } from '../../api/client.js';

/* ───────────── Types ───────────── */
interface AdminProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  status: 'ACTIVE' | 'DRAFT' | 'PENDING' | 'REJECTED';
  avgRating: number;
  reviewCount: number;
  categoryId: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string };
  vendor?: { id: string; storeName: string; status: string };
  images?: { id: string; url: string; position: number }[];
  _count?: { reviews: number; orderItems: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface VendorOption {
  id: string;
  storeName: string;
}

/* ───────────── Status helpers ───────────── */
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DRAFT: 'bg-gray-100 text-gray-600 border-gray-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'DRAFT', 'PENDING', 'REJECTED'] as const;

/* ───────────── Toast ───────────── */
interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastIdCounter = 0;

/* ───────────── Component ───────────── */
export const AdminProductsPage: React.FC = () => {
  // ── Data state ──
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Filter state ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Options for dropdowns ──
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  // ── Modals ──
  const [viewProduct, setViewProduct] = useState<AdminProduct | null>(null);
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminProduct | null>(null);
  const [statusChange, setStatusChange] = useState<{ product: AdminProduct; newStatus: string } | null>(null);

  // ── Toast ──
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Action loading ──
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Toast helpers ── */
  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ── Fetch filter options ── */
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [catRes, venRes] = await Promise.all([
          api.get('/categories'),
          api.get('/admin/vendors?limit=100'),
        ]);
        setCategories(catRes.data.data || []);
        const vendorData = venRes.data.data?.vendors || venRes.data.data || [];
        setVendors(vendorData.map((v: any) => ({ id: v.id, storeName: v.storeName })));
      } catch (err) {
        console.error('Error fetching filter options', err);
      }
    };
    fetchOptions();
  }, []);

  /* ── Fetch products ── */
  const fetchProducts = useCallback(
    async (page = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const params: Record<string, string | number> = { page, limit: 15 };
        if (search) params.search = search;
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (categoryFilter !== 'ALL') params.categoryId = categoryFilter;
        if (vendorFilter !== 'ALL') params.vendorId = vendorFilter;

        const res = await api.get('/admin/products', { params });
        setProducts(res.data.data.products);
        setPagination(res.data.data.pagination);
      } catch (err: any) {
        addToast('error', err.response?.data?.message || 'Failed to load products');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, categoryFilter, vendorFilter, addToast]
  );

  useEffect(() => {
    fetchProducts(1);
  }, [statusFilter, categoryFilter, vendorFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Debounced search ── */
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchProducts(1);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Status update ── */
  const handleStatusUpdate = async () => {
    if (!statusChange) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/products/${statusChange.product.id}/status`, {
        status: statusChange.newStatus,
      });
      addToast('success', `Product status updated to ${statusChange.newStatus}`);
      setStatusChange(null);
      fetchProducts(pagination.page, true);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Delete product ── */
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/products/${deleteConfirm.id}`);
      addToast('success', `"${deleteConfirm.title}" deleted successfully`);
      setDeleteConfirm(null);
      fetchProducts(pagination.page, true);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to delete product');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Pagination ── */
  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchProducts(page);
    }
  };

  /* ── Format helpers ── */
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtPrice = (p: number) => `$${p.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* ═══ Toast Notifications ═══ */}
      <div className="fixed top-4 right-4 z-[60] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-bold animate-[slideIn_0.3s_ease-out] ${
              t.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
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
            <Package className="w-7 h-7 text-blue-600" />
            <span>Product Management</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Search, moderate, edit, and organize all multi-vendor products across the marketplace.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchProducts(pagination.page, true)}
            disabled={refreshing}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* ═══ Search & Filters Bar ═══ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition placeholder:text-gray-400"
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

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 ${
              showFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-gray-100">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Vendor</label>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.storeName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setCategoryFilter('ALL');
                  setVendorFilter('ALL');
                  setStatusFilter('ALL');
                  setSearch('');
                }}
                className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Product Count ═══ */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">
          {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
          {search && ` for "${search}"`}
        </p>
      </div>

      {/* ═══ Products Table ═══ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="animate-pulse space-y-0">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-2 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-200 rounded w-12" />
                <div className="h-5 bg-gray-200 rounded-full w-16" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <PackageX className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No products found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                ? 'Try adjusting your search or filter criteria.'
                : 'Start by adding your first product to the marketplace.'}
            </p>
            {!search && statusFilter === 'ALL' && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                Add Product
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/70 text-gray-900 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-5">Product</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Vendor</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">Stock</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition group">
                      {/* Product info */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          {p.images && p.images.length > 0 ? (
                            <img
                              src={p.images[0].url}
                              alt={p.title}
                              className="w-10 h-10 rounded-xl object-cover bg-gray-100 border border-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate max-w-[200px]">{p.title}</p>
                            <p className="text-[10px] text-gray-400 font-mono">SKU: {p.sku}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="text-gray-700 font-medium truncate block max-w-[120px]">
                          {p.category?.name || '—'}
                        </span>
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-3">
                        <span className="text-gray-700 font-medium truncate block max-w-[120px]">
                          {p.vendor?.storeName || '—'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">
                        {fmtPrice(p.price)}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold whitespace-nowrap ${
                            p.stock === 0
                              ? 'text-red-600'
                              : p.stock <= 10
                              ? 'text-amber-600'
                              : 'text-gray-700'
                          }`}
                        >
                          {p.stock === 0 ? 'Out of stock' : `${p.stock} units`}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <select
                          value={p.status}
                          onChange={(e) => {
                            if (e.target.value !== p.status) {
                              setStatusChange({ product: p, newStatus: e.target.value });
                            }
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400/30 ${
                            STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="DRAFT">Draft</option>
                          <option value="PENDING">Pending</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </td>

                      {/* Created */}
                      <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                        {fmtDate(p.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewProduct(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditProduct(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Edit product"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ═══ Pagination ═══ */}
            {pagination.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-500 font-medium">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goToPage(pagination.page + 1)}
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

      {/* ═══ View Product Modal ═══ */}
      {viewProduct && (
        <ModalOverlay onClose={() => setViewProduct(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Product Details
              </h3>
              <button onClick={() => setViewProduct(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Images */}
              {viewProduct.images && viewProduct.images.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {viewProduct.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt={viewProduct.title}
                      className="w-24 h-24 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                    />
                  ))}
                </div>
              )}

              {/* Title & SKU */}
              <div>
                <h4 className="text-lg font-bold text-gray-900">{viewProduct.title}</h4>
                <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {viewProduct.sku}</p>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <p className="text-xs text-gray-700 mt-1 leading-relaxed">{viewProduct.description || 'No description provided.'}</p>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoCard label="Price" value={fmtPrice(viewProduct.price)} icon={<DollarSign className="w-4 h-4" />} />
                <InfoCard label="Stock" value={`${viewProduct.stock} units`} icon={<Archive className="w-4 h-4" />} />
                <InfoCard
                  label="Status"
                  value={viewProduct.status}
                  icon={<Tag className="w-4 h-4" />}
                  valueClass={
                    viewProduct.status === 'ACTIVE' ? 'text-emerald-700' :
                    viewProduct.status === 'REJECTED' ? 'text-red-700' :
                    viewProduct.status === 'PENDING' ? 'text-amber-700' : 'text-gray-600'
                  }
                />
                <InfoCard label="Category" value={viewProduct.category?.name || '—'} icon={<Package className="w-4 h-4" />} />
                <InfoCard label="Vendor" value={viewProduct.vendor?.storeName || '—'} icon={<Store className="w-4 h-4" />} />
                <InfoCard label="Created" value={fmtDate(viewProduct.createdAt)} icon={<Tag className="w-4 h-4" />} />
              </div>

              {/* Stats */}
              <div className="flex gap-4 pt-2">
                <div className="text-center px-4 py-3 bg-gray-50 rounded-xl flex-1">
                  <p className="text-lg font-black text-gray-900">{viewProduct.avgRating.toFixed(1)}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Avg Rating</p>
                </div>
                <div className="text-center px-4 py-3 bg-gray-50 rounded-xl flex-1">
                  <p className="text-lg font-black text-gray-900">{viewProduct._count?.reviews || 0}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Reviews</p>
                </div>
                <div className="text-center px-4 py-3 bg-gray-50 rounded-xl flex-1">
                  <p className="text-lg font-black text-gray-900">{viewProduct._count?.orderItems || 0}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Orders</p>
                </div>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══ Add / Edit Product Modal ═══ */}
      {(addModalOpen || editProduct) && (
        <ProductFormModal
          product={editProduct}
          categories={categories}
          vendors={vendors}
          onClose={() => {
            setAddModalOpen(false);
            setEditProduct(null);
          }}
          onSuccess={(msg) => {
            addToast('success', msg);
            setAddModalOpen(false);
            setEditProduct(null);
            fetchProducts(pagination.page, true);
          }}
          onError={(msg) => addToast('error', msg)}
        />
      )}

      {/* ═══ Delete Confirmation ═══ */}
      {deleteConfirm && (
        <ModalOverlay onClose={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-gray-900">Delete Product</h3>
            <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
              Are you sure you want to delete <strong>"{deleteConfirm.title}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete Product
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══ Status Change Confirmation ═══ */}
      {statusChange && (
        <ModalOverlay onClose={() => setStatusChange(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <ArrowUpDown className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-gray-900">Update Status</h3>
            <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
              Change <strong>"{statusChange.product.title}"</strong> from{' '}
              <span className="font-bold text-gray-700">{statusChange.product.status}</span> to{' '}
              <span className="font-bold text-blue-700">{statusChange.newStatus}</span>?
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setStatusChange(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Update
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Shared Sub-Components
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── Modal Overlay ── */
const ModalOverlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative z-10 w-full flex justify-center">{children}</div>
  </div>
);

/* ── Info Card ── */
const InfoCard: React.FC<{ label: string; value: string; icon: React.ReactNode; valueClass?: string }> = ({
  label,
  value,
  icon,
  valueClass,
}) => (
  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
    <div className="flex items-center gap-1.5 text-gray-400 mb-1">{icon}<span className="text-[10px] font-bold uppercase tracking-wider">{label}</span></div>
    <p className={`text-sm font-bold ${valueClass || 'text-gray-900'}`}>{value}</p>
  </div>
);

/* ── Product Form Modal (Add / Edit) ── */
const ProductFormModal: React.FC<{
  product: AdminProduct | null;
  categories: CategoryOption[];
  vendors: VendorOption[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ product, categories, vendors, onClose, onSuccess, onError }) => {
  const isEdit = !!product;
  const [form, setForm] = useState({
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    stock: product?.stock?.toString() || '0',
    sku: product?.sku || '',
    categoryId: product?.categoryId || (categories[0]?.id || ''),
    vendorId: product?.vendorId || (vendors[0]?.id || ''),
    status: product?.status || 'ACTIVE',
    imageUrl: product?.images?.[0]?.url || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.title.trim()) return onError('Product title is required');
    if (!form.price || parseFloat(form.price) < 0) return onError('Valid price is required');
    if (!form.categoryId) return onError('Category is required');

    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        stock: form.stock,
        categoryId: form.categoryId,
        vendorId: form.vendorId,
        status: form.status,
      };

      if (form.sku) payload.sku = form.sku.trim();
      if (form.imageUrl.trim()) payload.images = [form.imageUrl.trim()];

      if (isEdit) {
        await api.patch(`/admin/products/${product!.id}`, payload);
        onSuccess('Product updated successfully');
      } else {
        await api.post('/admin/products', payload);
        onSuccess('Product created successfully');
      }
    } catch (err: any) {
      onError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} product`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            {isEdit ? <Pencil className="w-5 h-5 text-amber-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Product Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter product title"
              className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Enter product description"
              rows={3}
              className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
            />
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Price ($) *</label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Stock</label>
              <input
                name="stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
          </div>

          {/* SKU */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              SKU {!isEdit && <span className="text-gray-400">(auto-generated if empty)</span>}
            </label>
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              placeholder={isEdit ? form.sku : 'Leave blank to auto-generate'}
              className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono"
            />
          </div>

          {/* Category & Vendor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category *</label>
              <select
                name="categoryId"
                value={form.categoryId}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Vendor</label>
              <select
                name="vendorId"
                value={form.vendorId}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.storeName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Image URL */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Image URL</label>
            <input
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleChange}
              placeholder="https://images.example.com/product.jpg"
              className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            {form.imageUrl && (
              <img
                src={form.imageUrl}
                alt="Preview"
                className="mt-2 w-16 h-16 rounded-xl object-cover border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
};

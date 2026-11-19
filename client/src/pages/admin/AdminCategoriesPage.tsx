import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Package,
  Calendar,
  ExternalLink,
  ChevronRight,
  Loader2,
  FolderPlus,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../api/client.js';

/* ───────────── Types ───────────── */
interface CategoryChild {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  parent?: { id: string; name: string; slug: string } | null;
  children?: CategoryChild[];
  _count?: { products: number; children: number };
}

interface CategoryDetail extends AdminCategory {
  products?: Array<{
    id: string;
    title: string;
    price: number;
    stock: number;
    status: string;
    sku: string;
    images?: Array<{ position: number; url: string }>;
  }>;
}

/* ───────────── Toast ───────────── */
interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastCounter = 0;

export const AdminCategoriesPage: React.FC = () => {
  // Data state
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<AdminCategory | null>(null);
  const [detailCategory, setDetailCategory] = useState<CategoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ── Fetch Categories ── */
  const fetchCategories = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/admin/categories', { params });
      setCategories(res.data.data || []);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, addToast]);

  useEffect(() => {
    fetchCategories();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchCategories();
    }, 350);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Open Category Detail ── */
  const handleOpenDetail = async (cat: AdminCategory) => {
    setDetailLoading(true);
    setDetailCategory(cat as CategoryDetail);
    try {
      const res = await api.get(`/admin/categories/${cat.id}`);
      setDetailCategory(res.data.data);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to fetch category details');
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── Delete Category ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/categories/${deleteTarget.id}`);
      addToast('success', `Category "${deleteTarget.name}" deleted successfully`);
      setDeleteTarget(null);
      fetchCategories(true);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to delete category');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Toggle Status Quick Action ── */
  const handleToggleStatus = async (cat: AdminCategory) => {
    const newStatus = cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/admin/categories/${cat.id}`, { status: newStatus });
      addToast('success', `"${cat.name}" marked as ${newStatus}`);
      fetchCategories(true);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Status update failed');
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
            <FolderTree className="w-7 h-7 text-indigo-600" />
            <span>Category Management</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Organize catalog taxonomies, parent-child structures, and monitor product associations safely.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCategories(true)}
            disabled={refreshing}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh categories"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* ═══ Search & Filters ═══ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search category name, slug, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
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

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'ALL' ? 'All Taxonomies' : s === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Category Count & Safety Notice ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
        <p className="font-semibold">
          {categories.length} taxonom{categories.length === 1 ? 'y' : 'ies'} listed
        </p>
        <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Safety guard enabled: Categories with linked products cannot be deleted.
        </span>
      </div>

      {/* ═══ Categories Table ═══ */}
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
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-5 bg-gray-200 rounded-full w-16" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderTree className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No categories found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'Try clearing search terms or filter criteria.'
                : 'Get started by creating your first product category.'}
            </p>
            {!search && statusFilter === 'ALL' && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                Add Category
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 text-gray-900 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-3">Slug</th>
                  <th className="py-3 px-3">Parent Hierarchy</th>
                  <th className="py-3 px-3">Products</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition group">
                    {/* Category Name & Image */}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        {c.imageUrl ? (
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className="w-10 h-10 rounded-xl object-cover bg-gray-100 border border-gray-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                            <FolderTree className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate max-w-[220px]">{c.name}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[220px]">
                            {c.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-3 px-3">
                      <span className="font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg text-[10px]">
                        /{c.slug}
                      </span>
                    </td>

                    {/* Parent Hierarchy */}
                    <td className="py-3 px-3">
                      {c.parent ? (
                        <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                          <span className="text-gray-400">↳</span>
                          {c.parent.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Root Category</span>
                      )}
                    </td>

                    {/* Associated Products Count */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg text-[11px] ${
                          (c._count?.products || 0) > 0
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        {c._count?.products || 0}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        title="Click to toggle status"
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                      >
                        {c.status || 'ACTIVE'}
                      </button>
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {fmtDate(c.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetail(c)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="View category details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditCategory(c)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition"
                          title="Edit category"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete category"
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
        )}
      </div>

      {/* ═══ View Category Detail Drawer/Modal ═══ */}
      {detailCategory && (
        <ModalOverlay onClose={() => setDetailCategory(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-indigo-600" />
                Category Details
              </h3>
              <button
                onClick={() => setDetailCategory(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {detailLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <>
                  {/* Image & Basic Info */}
                  <div className="flex items-center gap-4">
                    {detailCategory.imageUrl ? (
                      <img
                        src={detailCategory.imageUrl}
                        alt={detailCategory.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <FolderTree className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-lg font-black text-gray-900">{detailCategory.name}</h4>
                      <p className="text-xs font-mono text-gray-400">/{detailCategory.slug}</p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          detailCategory.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {detailCategory.status}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Description
                    </span>
                    <p className="text-xs text-gray-700 mt-1 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {detailCategory.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Key Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl text-center border border-gray-100">
                      <p className="text-lg font-black text-gray-900">
                        {detailCategory._count?.products || 0}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Products</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl text-center border border-gray-100">
                      <p className="text-lg font-black text-gray-900">
                        {detailCategory.children?.length || detailCategory._count?.children || 0}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Subcategories</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl text-center border border-gray-100">
                      <p className="text-xs font-bold text-gray-700 truncate mt-1">
                        {detailCategory.parent?.name || 'Root'}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Parent</p>
                    </div>
                  </div>

                  {/* Associated Products Preview */}
                  {detailCategory.products && detailCategory.products.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                        Recent Products Assigned to Category ({detailCategory.products.length})
                      </span>
                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                        {detailCategory.products.map((p) => (
                          <div key={p.id} className="p-2.5 flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-900 truncate max-w-[240px]">
                              {p.title}
                            </span>
                            <span className="font-bold text-gray-900">${p.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Timestamps */}
                  <div className="text-[11px] text-gray-400 pt-2 border-t border-gray-100 flex justify-between">
                    <span>Created: {fmtDate(detailCategory.createdAt)}</span>
                    <span>Updated: {fmtDate(detailCategory.updatedAt)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══ Add / Edit Modal ═══ */}
      {(addModalOpen || editCategory) && (
        <CategoryFormModal
          category={editCategory}
          availableParents={categories.filter((c) => !editCategory || c.id !== editCategory.id)}
          onClose={() => {
            setAddModalOpen(false);
            setEditCategory(null);
          }}
          onSuccess={(msg) => {
            addToast('success', msg);
            setAddModalOpen(false);
            setEditCategory(null);
            fetchCategories(true);
          }}
          onError={(msg) => addToast('error', msg)}
        />
      )}

      {/* ═══ Delete Confirmation Modal ═══ */}
      {deleteTarget && (
        <ModalOverlay onClose={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-gray-900">Delete Category</h3>
            <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
            </p>

            {/* Warning if products exist */}
            {(deleteTarget._count?.products || 0) > 0 ? (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-bold">Cannot delete this category</p>
                  <p className="text-[11px] mt-0.5">
                    This category currently has{' '}
                    <strong>{deleteTarget._count?.products} product(s)</strong> assigned. Backend
                    safety guards will reject the deletion until products are reassigned or removed.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 mt-2">
                This category has 0 assigned products and can be safely deleted.
              </p>
            )}

            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading || (deleteTarget._count?.products || 0) > 0}
                className="px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete Category
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════════════════ */

const ModalOverlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative z-10 w-full flex justify-center">{children}</div>
  </div>
);

interface CategoryFormModalProps {
  category: AdminCategory | null;
  availableParents: AdminCategory[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  category,
  availableParents,
  onClose,
  onSuccess,
  onError,
}) => {
  const isEdit = !!category;
  const [form, setForm] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    imageUrl: category?.imageUrl || '',
    status: category?.status || 'ACTIVE',
    parentId: category?.parentId || '',
  });
  const [saving, setSaving] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setForm((prev) => ({
      ...prev,
      name: newName,
      // Auto-generate slug if not editing or if slug was empty
      slug: !isEdit ? newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return onError('Category name is required');

    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        status: form.status,
        parentId: form.parentId ? form.parentId : null,
      };
      if (form.slug.trim()) {
        payload.slug = form.slug.trim();
      }

      if (isEdit) {
        await api.patch(`/admin/categories/${category!.id}`, payload);
        onSuccess(`Category "${form.name}" updated successfully`);
      } else {
        await api.post('/admin/categories', payload);
        onSuccess(`Category "${form.name}" created successfully`);
      }
    } catch (err: any) {
      onError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            {isEdit ? (
              <Pencil className="w-5 h-5 text-indigo-600" />
            ) : (
              <FolderPlus className="w-5 h-5 text-indigo-600" />
            )}
            {isEdit ? 'Edit Category' : 'Create New Category'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category Name */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              Category Name *
            </label>
            <input
              value={form.name}
              onChange={handleNameChange}
              placeholder="e.g. Smart Electronics"
              className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              URL Slug
            </label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="e.g. smart-electronics"
              className="w-full px-3 py-2.5 text-xs font-mono font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Leave blank to automatically generate from category name.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Describe this category..."
              className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
            />
          </div>

          {/* Parent Category & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                Parent Category
              </label>
              <select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">None (Root Category)</option>
                {availableParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              Category Image URL
            </label>
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
            {form.imageUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-[10px] text-gray-400">Live Image Preview</span>
              </div>
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
              className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
};

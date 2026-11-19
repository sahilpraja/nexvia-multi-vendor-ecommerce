import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  FolderTree,
  Store,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  ShieldCheck,
  ChevronRight,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../../api/client.js';

interface DashboardStats {
  products: {
    total: number;
    active: number;
    pendingOrDraft: number;
    statusDistribution: Array<{ status: string; count: number; color: string }>;
  };
  categories: {
    total: number;
    topCategories: Array<{ id: string; name: string; productCount: number }>;
  };
  vendors: {
    total: number;
    approved: number;
    pending: number;
    suspended: number;
    statusDistribution: Array<{ status: string; count: number; color: string }>;
    registrationChart: Array<{ date: string; registrations: number }>;
  };
  orders: {
    total: number;
    totalRevenue: number;
  };
  recentProducts: Array<{
    id: string;
    title: string;
    price: number;
    stock: number;
    status: string;
    sku: string;
    categoryName: string;
    vendorName: string;
    imageUrl?: string;
    createdAt: string;
  }>;
  recentVendors: Array<{
    id: string;
    storeName: string;
    ownerName: string;
    email: string;
    status: string;
    productCount: number;
    createdAt: string;
  }>;
  pendingVendorsList: Array<{
    id: string;
    storeName: string;
    ownerName: string;
    email: string;
    status: string;
    createdAt: string;
  }>;
}

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<Array<{ date: string; revenue: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [statsRes, revRes] = await Promise.all([
        api.get('/admin/analytics/dashboard-stats'),
        api.get('/admin/analytics/revenue'),
      ]);

      setStats(statsRes.data.data);
      setRevenueData(revRes.data.data);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.response?.data?.message || 'Failed to fetch real-time dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleExportCsv = () => {
    window.open('/api/v1/admin/analytics/export-csv', '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 rounded-2xl"></div>
          <div className="h-80 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-red-200 shadow-sm max-w-xl mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-900">Dashboard Loading Error</h3>
        <p className="text-xs text-gray-500 mt-1 mb-4">{error || 'Could not retrieve database metrics'}</p>
        <button
          onClick={() => fetchDashboardData(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Platform Dashboard
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Live Database
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time telemetry across products, categories, merchant verifications, and financial turnover.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh database metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Orders</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Products</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {stats.products.total}
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-gray-500">
              <span className="text-emerald-600 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {stats.products.active} Active
              </span>
              <span>•</span>
              <span className="text-gray-400">
                {stats.products.pendingOrDraft} Draft
              </span>
            </div>
          </div>
          <Link
            to="/admin/products"
            className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-blue-600 hover:text-blue-700 transition"
          >
            <span>Manage Products</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Total Categories */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categories</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {stats.categories.total}
            </div>
            <p className="mt-2 text-[11px] font-semibold text-gray-500 truncate">
              {stats.categories.topCategories.length} root taxonomies indexed
            </p>
          </div>
          <Link
            to="/admin/categories"
            className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition"
          >
            <span>Manage Categories</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Vendors Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vendors</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {stats.vendors.total}
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold">
              <span className="text-emerald-600 font-bold">
                {stats.vendors.approved} Approved
              </span>
              <span>•</span>
              <span className={stats.vendors.pending > 0 ? 'text-amber-600 font-bold' : 'text-gray-400'}>
                {stats.vendors.pending} Pending
              </span>
            </div>
          </div>
          <Link
            to="/admin/vendors"
            className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition"
          >
            <span>Review Merchants</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Revenue / GMV */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Settled Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              ${stats.orders.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="mt-2 text-[11px] font-semibold text-gray-500">
              Across {stats.orders.total} marketplace orders
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-purple-600 hover:text-purple-700 transition"
          >
            <span>Order Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Pending Vendor Approvals Alert Banner (if any) */}
      {stats.vendors.pending > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {stats.vendors.pending} Merchant Application{stats.vendors.pending > 1 ? 's' : ''} Awaiting Approval
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Review business details, store credentials, and approve or reject onboarding merchants.
              </p>
            </div>
          </div>
          <Link
            to="/admin/vendors"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition whitespace-nowrap self-start sm:self-auto"
          >
            Review Applications
          </Link>
        </div>
      )}

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Revenue Trends */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900">Platform Revenue Over Time</h3>
              <p className="text-[11px] text-gray-500">Historical settled GMV from customer checkout orders</p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl">
              ${stats.orders.totalRevenue.toFixed(2)} Total
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                  <Tooltip
                    formatter={(val: any) => [`$${val}`, 'Revenue']}
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#adminRevGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                <ShoppingBag className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-semibold">No order revenue recorded yet</p>
                <p className="text-[11px] text-gray-400">Data automatically updates upon Stripe payment settlement.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Product & Vendor Status Distribution */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-gray-900">Inventory & Vendor Status Distribution</h3>
            <p className="text-[11px] text-gray-500">Live operational states across catalog and merchant accounts</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            {/* Products Distribution */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Catalog Health</span>
                <p className="text-lg font-black text-gray-900 mt-1">{stats.products.total} Products</p>
              </div>
              <div className="space-y-1.5 mt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                  </span>
                  <span className="font-bold text-gray-900">{stats.products.active}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span> Draft / Inactive
                  </span>
                  <span className="font-bold text-gray-900">{stats.products.pendingOrDraft}</span>
                </div>
              </div>
            </div>

            {/* Vendors Distribution */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Merchant Status</span>
                <p className="text-lg font-black text-gray-900 mt-1">{stats.vendors.total} Stores</p>
              </div>
              <div className="space-y-1.5 mt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Approved
                  </span>
                  <span className="font-bold text-gray-900">{stats.vendors.approved}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-700 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending
                  </span>
                  <span className="font-bold text-gray-900">{stats.vendors.pending}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-700 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Suspended
                  </span>
                  <span className="font-bold text-gray-900">{stats.vendors.suspended}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Categories Breakdown */}
          <div className="pt-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top Product Categories</span>
            <div className="mt-2 space-y-2">
              {stats.categories.topCategories.slice(0, 4).map((cat) => (
                <div key={cat.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700 truncate">{cat.name}</span>
                  <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg text-[10px]">
                    {cat.productCount} products
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dual Activity Tables: Recent Products & Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Recent Products */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900">Recent Marketplace Products</h3>
              <p className="text-[11px] text-gray-500">Latest items cataloged by platform vendors</p>
            </div>
            <Link
              to="/admin/products"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/70 text-gray-900 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-5">Product</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-3">Stock</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No products cataloged in the database yet.
                    </td>
                  </tr>
                ) : (
                  stats.recentProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.title}
                              className="w-9 h-9 rounded-xl object-cover bg-gray-100 border border-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate max-w-[180px]">{p.title}</p>
                            <p className="text-[10px] text-gray-400 font-mono">SKU: {p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-gray-700 font-medium truncate block max-w-[120px]">
                          {p.categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-900">
                        ${p.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-semibold ${p.stock > 10 ? 'text-gray-700' : 'text-amber-600'}`}>
                          {p.stock} in stock
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Cols: Recently Registered Vendors & Pending Approvals */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900">Registered Vendors</h3>
                <p className="text-[11px] text-gray-500">Merchant accounts and storefronts</p>
              </div>
              <Link
                to="/admin/vendors"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 divide-y divide-gray-100">
              {stats.recentVendors.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <Store className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No registered vendors yet</p>
                </div>
              ) : (
                stats.recentVendors.map((v) => (
                  <div key={v.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {v.storeName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-xs truncate">{v.storeName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{v.email}</p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          v.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : v.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {v.status}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">{v.productCount} products</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 bg-gray-50/70 border-t border-gray-100 text-center">
            <Link
              to="/admin/vendors"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <span>Open Merchant Moderation Hub</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

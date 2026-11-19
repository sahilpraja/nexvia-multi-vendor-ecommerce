import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Store,
  Users,
  Download,
  ShieldAlert,
  Tag,
  FolderTree,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../../api/client.js';

export const AdminDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [topVendors, setTopVendors] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/analytics/summary'),
      api.get('/admin/analytics/revenue'),
      api.get('/admin/analytics/top-vendors'),
      api.get('/admin/analytics/top-products'),
    ])
      .then(([summaryRes, revRes, vendorsRes, prodsRes]) => {
        setSummary(summaryRes.data.data);
        setRevenueData(revRes.data.data);
        setTopVendors(vendorsRes.data.data);
        setTopProducts(prodsRes.data.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleExportCsv = () => {
    window.open('/api/v1/admin/analytics/export-csv', '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Platform Analytics & Control</h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time multi-vendor Gross Merchandise Value (GMV), commissions, and merchant operations
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/admin/orders"
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center space-x-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Manage Orders</span>
          </Link>
          <Link
            to="/admin/vendors"
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold text-xs transition flex items-center space-x-1.5"
          >
            <Store className="w-4 h-4 text-indigo-600" />
            <span>Vendor Approvals</span>
          </Link>
          <Link
            to="/admin/coupons"
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold text-xs transition flex items-center space-x-1.5"
          >
            <Tag className="w-4 h-4 text-emerald-600" />
            <span>Manage Coupons</span>
          </Link>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-xs shadow-sm transition flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Gross GMV</span>
          <h3 className="text-2xl font-black text-gray-900 mt-1">
            ${summary?.totalGMV?.toFixed(2) || '0.00'}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Total customer checkout volume</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Commission Earned</span>
          <h3 className="text-2xl font-black text-rose-600 mt-1">
            ${summary?.platformCommission?.toFixed(2) || '0.00'}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">10% Platform revenue</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Orders</span>
          <h3 className="text-2xl font-black text-gray-900 mt-1">
            {summary?.totalOrders || 0}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">All processed transactions</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Vendors</span>
          <h3 className="text-2xl font-black text-gray-900 mt-1">
            {summary?.activeVendors || 0}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Approved merchants</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Customer Accounts</span>
          <h3 className="text-2xl font-black text-gray-900 mt-1">
            {summary?.totalCustomers || 0}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Registered buyers</p>
        </div>
      </div>

      {/* Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-900">Daily Revenue Timeline</h3>
            <span className="text-xs text-gray-400 font-medium">USD ($)</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData.length > 0 ? revenueData : [{ date: 'Today', revenue: 719.99 }]}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Vendors Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-900">Top Performing Stores</h3>
            <span className="text-xs text-gray-400 font-medium">By Gross Sales ($)</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topVendors.length > 0 ? topVendors : [{ storeName: 'Apex Tech', totalSales: 349.99 }, { storeName: 'Luxe Apparel', totalSales: 420.00 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="storeName" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="totalSales" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Highest Rated Products</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {topProducts.map((p) => (
            <div key={p.id} className="p-4 px-6 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-gray-900">{p.title}</p>
                <p className="text-[11px] text-gray-400">In stock: {p.stock} units</p>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-gray-900">${Number(p.price).toFixed(2)}</span>
                <p className="text-amber-500 font-bold text-[11px]">★ {p.avgRating.toFixed(1)} ({p.reviewCount} reviews)</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

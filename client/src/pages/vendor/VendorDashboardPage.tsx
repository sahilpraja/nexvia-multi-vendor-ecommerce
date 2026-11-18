import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store, Package, DollarSign, Clock, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '../../api/client.js';
import { VendorProfile } from '../../types/index.js';

export const VendorDashboardPage: React.FC = () => {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/vendors/me')
      .then((res) => setProfile(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  const isApproved = profile?.status === 'APPROVED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome & Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-8 rounded-3xl text-white shadow-xl mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            Merchant Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            {profile?.storeName || 'Vendor Portal'}
          </h1>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            {profile?.description || 'Manage your product catalogue, fulfill sub-orders, and monitor your platform payouts.'}
          </p>
        </div>

        <div>
          {profile?.status === 'APPROVED' && (
            <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30">
              <CheckCircle className="w-4 h-4 mr-1.5 text-green-400" /> Account Approved & Active
            </span>
          )}
          {profile?.status === 'PENDING' && (
            <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Clock className="w-4 h-4 mr-1.5 text-amber-400" /> Under Admin Review
            </span>
          )}
          {profile?.status === 'SUSPENDED' && (
            <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">
              <AlertTriangle className="w-4 h-4 mr-1.5 text-red-400" /> Account Suspended
            </span>
          )}
        </div>
      </div>

      {!isApproved && (
        <div className="mb-10 p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-bold">Pending Marketplace Approval</h4>
            <p className="mt-0.5 text-xs text-amber-700">
              Your vendor application is currently under review by platform admins. While pending, you can preview the workspace, but product publishing is restricted until approval.
            </p>
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/vendor/products"
          className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Product Management</h3>
            <p className="text-xs text-gray-500 mt-1">
              Create, edit, soft-delete products and upload images with pre-signed URLs.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-bold text-indigo-600">
            <span>Manage Products</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/vendor/orders"
          className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Sub-Order Fulfillment</h3>
            <p className="text-xs text-gray-500 mt-1">
              Advance sub-orders step-by-step: PLACED ➔ PACKED ➔ SHIPPED ➔ DELIVERED.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-bold text-blue-600">
            <span>View Orders</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/vendor/earnings"
          className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Earnings & Commission</h3>
            <p className="text-xs text-gray-500 mt-1">
              Review platform splits, 10% commission deductions, and net payout records.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-bold text-emerald-600">
            <span>Inspect Ledger</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>
      </div>
    </div>
  );
};

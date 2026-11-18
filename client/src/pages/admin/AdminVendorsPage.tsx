import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client.js';

export const AdminVendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchVendors = () => {
    setLoading(true);
    api.get('/admin/vendors')
      .then((res) => setVendors(res.data.data.vendors))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleUpdateStatus = async (vendorId: string, status: 'APPROVED' | 'SUSPENDED') => {
    try {
      setActionLoading(vendorId);
      await api.patch(`/admin/vendors/${vendorId}/status`, { status });
      fetchVendors();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update vendor status');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Vendor Approvals & Management</h1>
        <p className="text-xs text-gray-500 mt-1">Review onboarding applications, approve merchants, or suspend accounts</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-6">Store Details</th>
                <th className="py-3.5 px-4">Owner Email</th>
                <th className="py-3.5 px-4">Catalog Size</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">Loading vendors...</td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">No vendor applications registered yet.</td>
                </tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-6">
                      <p className="font-bold text-gray-900">{v.storeName}</p>
                      <p className="text-[11px] text-gray-400 truncate max-w-xs">{v.description || 'No description provided'}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">{v.user?.email}</td>
                    <td className="py-3.5 px-4 font-semibold">{v._count?.products || 0} products</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        v.status === 'APPROVED'
                          ? 'bg-green-50 text-green-700'
                          : v.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-2">
                      {v.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleUpdateStatus(v.id, 'APPROVED')}
                          disabled={actionLoading === v.id}
                          className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-lg text-xs"
                        >
                          Approve Store
                        </button>
                      )}
                      {v.status !== 'SUSPENDED' && (
                        <button
                          onClick={() => handleUpdateStatus(v.id, 'SUSPENDED')}
                          disabled={actionLoading === v.id}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg text-xs"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

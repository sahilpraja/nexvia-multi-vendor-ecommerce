import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AdminSidebar } from '../components/admin/AdminSidebar.js';
import { AdminNavbar } from '../components/admin/AdminNavbar.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

export const AdminLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('nexvia_admin_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingVendorsCount, setPendingVendorsCount] = useState(0);

  const handleSetCollapsed = (val: boolean) => {
    setCollapsed(val);
    localStorage.setItem('nexvia_admin_sidebar_collapsed', String(val));
  };

  // Fetch pending vendors count for badge indicator
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      api.get('/admin/vendors?status=PENDING&limit=1')
        .then((res) => {
          setPendingVendorsCount(res.data.data.pagination.total || 0);
        })
        .catch(() => {
          // ignore badge error
        });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Security Guard: Verify role
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 antialiased font-sans">
      {/* Sidebar Navigation */}
      <AdminSidebar
        collapsed={collapsed}
        setCollapsed={handleSetCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        pendingVendorsCount={pendingVendorsCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <AdminNavbar
          onToggleMobileMenu={() => setMobileOpen(!mobileOpen)}
          pendingVendorsCount={pendingVendorsCount}
        />

        {/* Page View Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

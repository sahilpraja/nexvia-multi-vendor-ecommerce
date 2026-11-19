import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Store,
  ShoppingBag,
  Tag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  Sparkles,
} from 'lucide-react';

interface AdminSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  pendingVendorsCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  pendingVendorsCount = 0,
}) => {
  const navItems = [
    {
      label: 'Dashboard',
      to: '/admin/dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: 'Products',
      to: '/admin/products',
      icon: Package,
      badge: null,
    },
    {
      label: 'Categories',
      to: '/admin/categories',
      icon: FolderTree,
      badge: null,
    },
    {
      label: 'Vendors',
      to: '/admin/vendors',
      icon: Store,
      badge: pendingVendorsCount > 0 ? pendingVendorsCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      label: 'Orders',
      to: '/admin/orders',
      icon: ShoppingBag,
      badge: null,
    },
    {
      label: 'Coupons',
      to: '/admin/coupons',
      icon: Tag,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:w-20' : 'lg:w-64'
        } ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950/40">
          <Link
            to="/admin/dashboard"
            className="flex items-center space-x-3 overflow-hidden group"
            onClick={() => setMobileOpen(false)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-black text-lg text-white tracking-tight leading-tight flex items-center gap-1.5">
                  Nexvia <span className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">ADMIN</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Platform Management</span>
              </div>
            )}
          </Link>

          {/* Collapse Toggle for Desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white items-center justify-center transition border border-slate-700/60"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {(!collapsed || mobileOpen) && (
            <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Main Menu
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  } ${collapsed && !mobileOpen ? 'justify-center' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    
                    {(!collapsed || mobileOpen) && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}

                    {(!collapsed || mobileOpen) && item.badge && (
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-blue-500 text-white'}`}>
                        {item.badge}
                      </span>
                    )}

                    {/* Tooltip on Desktop Collapsed */}
                    {collapsed && !mobileOpen && (
                      <div className="fixed left-20 ml-2 px-2.5 py-1.5 rounded-lg bg-slate-950 text-white text-xs font-medium shadow-xl border border-slate-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        {item.label}
                        {item.badge && ` (${item.badge})`}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer / Storefront Link */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition group ${
              collapsed && !mobileOpen ? 'justify-center' : ''
            }`}
            title="Open Marketplace Storefront"
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0 group-hover:text-blue-400 transition" />
            {(!collapsed || mobileOpen) && (
              <span className="truncate">View Storefront</span>
            )}
            {collapsed && !mobileOpen && (
              <div className="fixed left-20 ml-2 px-2.5 py-1.5 rounded-lg bg-slate-950 text-white text-xs font-medium shadow-xl border border-slate-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                View Storefront
              </div>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
};

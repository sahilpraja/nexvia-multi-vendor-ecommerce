import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  User,
  LogOut,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface AdminNavbarProps {
  onToggleMobileMenu: () => void;
  pendingVendorsCount?: number;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  onToggleMobileMenu,
  pendingVendorsCount = 0,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Default search routes to products management or order lookup
    navigate(`/admin/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Admin Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search products, SKU, categories, vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-12 py-2 bg-gray-50 hover:bg-gray-100/80 focus:bg-white text-xs font-medium text-gray-900 placeholder-gray-400 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-mono text-gray-400 font-bold">
            ↵ Enter
          </span>
        </form>
      </div>

      {/* Right: Actions, Notifications, Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Marketplace Storefront Link */}
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
        >
          <span>Storefront</span>
          <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
        </Link>

        {/* Notifications Popover */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileDropdownOpen(false);
            }}
            className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {pendingVendorsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 border-2 border-white rounded-full animate-pulse" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-xs text-gray-900">Notifications</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {pendingVendorsCount > 0 ? `${pendingVendorsCount} Action(s) required` : 'All clear'}
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 py-1">
                {pendingVendorsCount > 0 ? (
                  <Link
                    to="/admin/vendors"
                    onClick={() => setNotificationsOpen(false)}
                    className="p-3.5 flex items-start gap-3 hover:bg-gray-50/90 transition block"
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900">
                        {pendingVendorsCount} Pending Vendor Application{pendingVendorsCount > 1 ? 's' : ''}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        New merchant stores require compliance and verification review.
                      </p>
                      <span className="text-[10px] font-semibold text-blue-600 hover:underline mt-1 inline-block">
                        Review applications →
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="py-8 text-center px-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-bold text-gray-700">Everything is up to date</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">No pending vendor applications or critical alerts.</p>
                  </div>
                )}
              </div>

              <div className="px-4 pt-2 border-t border-gray-100 text-center">
                <Link
                  to="/admin/dashboard"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                >
                  View System Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />

        {/* Admin Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 transition text-left"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[120px]">
                {user?.name || 'Admin'}
              </p>
              <p className="text-[10px] text-blue-600 font-semibold tracking-wide">Administrator</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden lg:block" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black text-gray-900 truncate">{user?.name}</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wider">
                    {user?.role}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-mono truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <Link
                  to="/admin/dashboard"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-gray-400" />
                  <span>Admin Dashboard</span>
                </Link>
                <Link
                  to="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                  <span>Visit Marketplace</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

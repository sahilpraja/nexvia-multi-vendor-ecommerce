import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { CartProvider } from './context/CartContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';

// Layouts
import { AdminLayout } from './layouts/AdminLayout.js';

// Public & Customer Pages
import { HomePage } from './pages/HomePage.js';
import { ProductDetailPage } from './pages/ProductDetailPage.js';
import { CartPage } from './pages/CartPage.js';
import { CheckoutPage } from './pages/CheckoutPage.js';
import { PaymentSuccess } from './pages/PaymentSuccess.js';
import { PaymentCancel } from './pages/PaymentCancel.js';
import { OrdersPage } from './pages/OrdersPage.js';
import { OrderDetailPage } from './pages/OrderDetailPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';

// Vendor Pages
import { VendorDashboardPage } from './pages/vendor/VendorDashboardPage.js';
import { VendorProductsPage } from './pages/vendor/VendorProductsPage.js';
import { VendorOrdersPage } from './pages/vendor/VendorOrdersPage.js';
import { VendorEarningsPage } from './pages/vendor/VendorEarningsPage.js';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.js';
import { AdminProductsPage } from './pages/admin/AdminProductsPage.js';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage.js';
import { AdminVendorsPage } from './pages/admin/AdminVendorsPage.js';
import { AdminCouponsPage } from './pages/admin/AdminCouponsPage.js';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage.js';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage.js';
import { CartNotificationToast } from './components/cart/CartNotification.js';

// Customer / Storefront Layout wrapper
const StorefrontLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <CartNotificationToast />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Dedicated Admin Panel Layout */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="vendors" element={<AdminVendorsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="coupons" element={<AdminCouponsPage />} />
            </Route>

            {/* Consumer Storefront & Vendor Portal */}
            <Route element={<StorefrontLayout />}>
              {/* Public & Customer Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Customer Authenticated Routes */}
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment/success"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                    <PaymentSuccess />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment/cancel"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                    <PaymentCancel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                    <OrderDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Vendor Dashboard Routes */}
              <Route
                path="/vendor/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['VENDOR', 'ADMIN']}>
                    <VendorDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/products"
                element={
                  <ProtectedRoute allowedRoles={['VENDOR', 'ADMIN']}>
                    <VendorProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/orders"
                element={
                  <ProtectedRoute allowedRoles={['VENDOR', 'ADMIN']}>
                    <VendorOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/earnings"
                element={
                  <ProtectedRoute allowedRoles={['VENDOR', 'ADMIN']}>
                    <VendorEarningsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

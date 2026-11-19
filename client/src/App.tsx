import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { CartProvider } from './context/CartContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';

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
import { AdminVendorsPage } from './pages/admin/AdminVendorsPage.js';
import { AdminCouponsPage } from './pages/admin/AdminCouponsPage.js';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage.js';
import { CartNotificationToast } from './components/cart/CartNotification.js';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col justify-between bg-slate-50">
            <Navbar />

            <main className="flex-grow">
              <Routes>
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

                {/* Admin Dashboard Routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/orders"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminOrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/vendors"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminVendorsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/coupons"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminCouponsPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>

            <Footer />
            <CartNotificationToast />
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

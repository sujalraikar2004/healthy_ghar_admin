import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ToastContainer } from './components/common/ToastContainer';
import { AdminLayout } from './layouts/AdminLayout';

import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { ProductFormPage } from './pages/products/ProductFormPage';
import { ProductDetailPage } from './pages/products/ProductDetailPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { BrandsPage } from './pages/brands/BrandsPage';
import { ProductReviewsPage } from './pages/reviews/ProductReviewsPage';
import { InventoryOverviewPage } from './pages/inventory/InventoryOverviewPage';
import { StockManagementPage } from './pages/inventory/StockManagementPage';
import { BatchesExpiryPage } from './pages/batches/BatchesExpiryPage';
import { WarehousesPage } from './pages/warehouses/WarehousesPage';
import { StockTransfersPage } from './pages/warehouses/StockTransfersPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { PurchaseOrdersPage } from './pages/purchase-orders/PurchaseOrdersPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { OrderDetailPage } from './pages/orders/OrderDetailPage';
import { PrescriptionsPage } from './pages/prescriptions/PrescriptionsPage';
import { PrescriptionReviewPage } from './pages/prescriptions/PrescriptionReviewPage';
import { ReturnsRefundsPage } from './pages/returns/ReturnsRefundsPage';
import { DeliveryManagementPage } from './pages/delivery/DeliveryManagementPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { CustomerGroupsPage } from './pages/customers/CustomerGroupsPage';
import { SupportTicketsPage } from './pages/support/SupportTicketsPage';
import { DoctorConsultationsPage } from './pages/consultations/DoctorConsultationsPage';
import { DoctorsPage } from './pages/doctors/DoctorsPage';
import { CouponsCampaignsPage } from './pages/marketing/CouponsCampaignsPage';
import { PromotionalBannersPage } from './pages/marketing/PromotionalBannersPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { SalesAnalyticsPage } from './pages/analytics/SalesAnalyticsPage';
import { InventoryAnalyticsPage } from './pages/analytics/InventoryAnalyticsPage';
import { StaffManagementPage } from './pages/staff/StaffManagementPage';
import { RolesPermissionsPage } from './pages/staff/RolesPermissionsPage';
import { ActivityLogsPage } from './pages/activity-logs/ActivityLogsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute module="dashboard">
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Catalog */}
            <Route
              path="/products"
              element={
                <ProtectedRoute module="products">
                  <ProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/new"
              element={
                <ProtectedRoute module="products" action="create">
                  <ProductFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id"
              element={
                <ProtectedRoute module="products">
                  <ProductDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id/edit"
              element={
                <ProtectedRoute module="products" action="edit">
                  <ProductFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute module="categories">
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brands"
              element={
                <ProtectedRoute module="brands">
                  <BrandsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/product-reviews"
              element={
                <ProtectedRoute module="reviews">
                  <ProductReviewsPage />
                </ProtectedRoute>
              }
            />

            {/* Inventory & Supply Chain */}
            <Route
              path="/inventory-overview"
              element={
                <ProtectedRoute module="inventory">
                  <InventoryOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-management"
              element={
                <ProtectedRoute module="inventory">
                  <StockManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batches-and-expiry"
              element={
                <ProtectedRoute module="batches">
                  <BatchesExpiryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-transfers"
              element={
                <ProtectedRoute module="transfers">
                  <StockTransfersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase-orders"
              element={
                <ProtectedRoute module="purchase_orders">
                  <PurchaseOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute module="suppliers">
                  <SuppliersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouses"
              element={
                <ProtectedRoute module="warehouses">
                  <WarehousesPage />
                </ProtectedRoute>
              }
            />

            {/* Orders, Rx & Logistics */}
            <Route
              path="/orders"
              element={
                <ProtectedRoute module="orders">
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute module="orders">
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prescriptions"
              element={
                <ProtectedRoute module="prescriptions">
                  <PrescriptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prescriptions/:id"
              element={
                <ProtectedRoute module="prescriptions">
                  <PrescriptionReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/returns-and-refunds"
              element={
                <ProtectedRoute module="returns">
                  <ReturnsRefundsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery-management"
              element={
                <ProtectedRoute module="delivery">
                  <DeliveryManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute module="payments">
                  <PaymentsPage />
                </ProtectedRoute>
              }
            />

            {/* Patients & Support */}
            <Route
              path="/customers"
              element={
                <ProtectedRoute module="customers">
                  <CustomersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer-groups"
              element={
                <ProtectedRoute module="customers">
                  <CustomerGroupsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/support-tickets"
              element={
                <ProtectedRoute module="support">
                  <SupportTicketsPage />
                </ProtectedRoute>
              }
            />

            {/* Healthcare */}
            <Route
              path="/doctor-consultations"
              element={
                <ProtectedRoute module="consultations">
                  <DoctorConsultationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctors"
              element={
                <ProtectedRoute module="doctors">
                  <DoctorsPage />
                </ProtectedRoute>
              }
            />

            {/* Marketing & Notifications */}
            <Route
              path="/coupons-and-discounts"
              element={
                <ProtectedRoute module="coupons">
                  <CouponsCampaignsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/promotional-banners"
              element={
                <ProtectedRoute module="banners">
                  <PromotionalBannersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute module="notifications">
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            {/* Analytics */}
            <Route
              path="/sales-analytics"
              element={
                <ProtectedRoute module="analytics">
                  <SalesAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory-analytics"
              element={
                <ProtectedRoute module="analytics">
                  <InventoryAnalyticsPage />
                </ProtectedRoute>
              }
            />

            {/* Administration */}
            <Route
              path="/staff-management"
              element={
                <ProtectedRoute module="staff">
                  <StaffManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles-and-permissions"
              element={
                <ProtectedRoute module="roles">
                  <RolesPermissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity-logs"
              element={
                <ProtectedRoute module="activity_logs">
                  <ActivityLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute module="settings">
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

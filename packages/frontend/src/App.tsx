import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer } from './components/common/Toast';
import { useSocket } from './hooks/useSocket';
import { useAuth } from './hooks/useAuth';
import { routes } from './config/routes';

// Layout components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';

// Page components
import { Home } from './pages/Home';
import { Billboard } from './pages/Billboard';
import { Rooms } from './pages/Rooms';
import { RoomDetail } from './pages/RoomDetail';
import { LiveRoom } from './pages/LiveRoom';
import { Marketplace } from './pages/Marketplace';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderHistory } from './pages/OrderHistory';
import { Wallet } from './pages/Wallet';
import { Deposit } from './pages/Deposit';
import { Withdraw } from './pages/Withdraw';
import { TransactionHistory } from './pages/TransactionHistory';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Achievements } from './pages/Achievements';
import { Leaderboard } from './pages/Leaderboard';
import { Challenges } from './pages/Challenges';
import { Notifications } from './pages/Notifications';
import { Messages } from './pages/Messages';
import { Search } from './pages/Search';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { VerifyPhone } from './pages/VerifyPhone';

// Sponsor pages
import { SponsorDashboard } from './pages/sponsor/Dashboard';
import { SponsorBrands } from './pages/sponsor/Brands';
import { CreateBrand } from './pages/sponsor/CreateBrand';
import { EditBrand } from './pages/sponsor/EditBrand';
import { SponsorRooms } from './pages/sponsor/Rooms';
import { CreateRoom } from './pages/sponsor/CreateRoom';
import { EditRoom } from './pages/sponsor/EditRoom';
import { SponsorCampaigns } from './pages/sponsor/Campaigns';
import { CreateCampaign } from './pages/sponsor/CreateCampaign';
import { EditCampaign } from './pages/sponsor/EditCampaign';
import { CampaignAnalytics } from './pages/sponsor/CampaignAnalytics';
import { SponsorProducts } from './pages/sponsor/Products';
import { CreateProduct } from './pages/sponsor/CreateProduct';
import { SponsorOrders } from './pages/sponsor/Orders';
import { SponsorAnalytics } from './pages/sponsor/Analytics';
import { SponsorSettings } from './pages/sponsor/Settings';

// Admin pages
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminUsers } from './pages/admin/Users';
import { AdminSponsors } from './pages/admin/Sponsors';
import { AdminModeration } from './pages/admin/Moderation';
import { AdminFraudCases } from './pages/admin/FraudCases';
import { AdminDisputes } from './pages/admin/Disputes';
import { AdminReports } from './pages/admin/Reports';
import { AdminSystemConfig } from './pages/admin/SystemConfig';
import { AdminAuditLogs } from './pages/admin/AuditLogs';
import { AdminSystemHealth } from './pages/admin/SystemHealth';
import { AdminSettings } from './pages/admin/Settings';

// Protected route wrapper
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { SponsorRoute } from './components/common/SponsorRoute';
import { AdminRoute } from './components/common/AdminRoute';

function App() {
  const { isAuthenticated, user } = useAuth();
  const dispatch = useDispatch();
  const socket = useSocket();

  useEffect(() => {
    // Initialize socket connection when authenticated
    if (isAuthenticated && user) {
      socket.connect();
    }

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user, socket]);

  return (
    <div className="app">
      <Header />
      <div className="main-layout">
        {isAuthenticated && <Sidebar />}
        <main className="content">
          <Routes>
            {/* Public routes */}
            <Route path={routes.HOME} element={<Home />} />
            <Route path={routes.LOGIN} element={<Login />} />
            <Route path={routes.REGISTER} element={<Register />} />
            <Route path={routes.FORGOT_PASSWORD} element={<ForgotPassword />} />
            <Route path={routes.RESET_PASSWORD} element={<ResetPassword />} />
            <Route path={routes.VERIFY_EMAIL} element={<VerifyEmail />} />
            <Route path={routes.VERIFY_PHONE} element={<VerifyPhone />} />
            <Route path={routes.BILLBOARD} element={<Billboard />} />
            <Route path={routes.SEARCH} element={<Search />} />
            <Route path={routes.MARKETPLACE} element={<Marketplace />} />
            <Route path={routes.PRODUCT_DETAIL} element={<ProductDetail />} />

            {/* Protected routes (require authentication) */}
            <Route element={<ProtectedRoute />}>
              <Route path={routes.ROOMS} element={<Rooms />} />
              <Route path={routes.ROOM_DETAIL} element={<RoomDetail />} />
              <Route path={routes.LIVE_ROOM} element={<LiveRoom />} />
              <Route path={routes.CART} element={<Cart />} />
              <Route path={routes.CHECKOUT} element={<Checkout />} />
              <Route path={routes.ORDER_HISTORY} element={<OrderHistory />} />
              <Route path={routes.WALLET} element={<Wallet />} />
              <Route path={routes.DEPOSIT} element={<Deposit />} />
              <Route path={routes.WITHDRAW} element={<Withdraw />} />
              <Route path={routes.TRANSACTIONS} element={<TransactionHistory />} />
              <Route path={routes.PROFILE} element={<Profile />} />
              <Route path={routes.SETTINGS} element={<Settings />} />
              <Route path={routes.ACHIEVEMENTS} element={<Achievements />} />
              <Route path={routes.LEADERBOARD} element={<Leaderboard />} />
              <Route path={routes.CHALLENGES} element={<Challenges />} />
              <Route path={routes.NOTIFICATIONS} element={<Notifications />} />
              <Route path={routes.MESSAGES} element={<Messages />} />
            </Route>

            {/* Sponsor routes */}
            <Route element={<SponsorRoute />}>
              <Route path={routes.SPONSOR_DASHBOARD} element={<SponsorDashboard />} />
              <Route path={routes.SPONSOR_BRANDS} element={<SponsorBrands />} />
              <Route path={routes.SPONSOR_CREATE_BRAND} element={<CreateBrand />} />
              <Route path={routes.SPONSOR_EDIT_BRAND} element={<EditBrand />} />
              <Route path={routes.SPONSOR_ROOMS} element={<SponsorRooms />} />
              <Route path={routes.SPONSOR_CREATE_ROOM} element={<CreateRoom />} />
              <Route path={routes.SPONSOR_EDIT_ROOM} element={<EditRoom />} />
              <Route path={routes.SPONSOR_CAMPAIGNS} element={<SponsorCampaigns />} />
              <Route path={routes.SPONSOR_CREATE_CAMPAIGN} element={<CreateCampaign />} />
              <Route path={routes.SPONSOR_EDIT_CAMPAIGN} element={<EditCampaign />} />
              <Route path={routes.SPONSOR_CAMPAIGN_ANALYTICS} element={<CampaignAnalytics />} />
              <Route path={routes.SPONSOR_PRODUCTS} element={<SponsorProducts />} />
              <Route path={routes.SPONSOR_CREATE_PRODUCT} element={<CreateProduct />} />
              <Route path={routes.SPONSOR_ORDERS} element={<SponsorOrders />} />
              <Route path={routes.SPONSOR_ANALYTICS} element={<SponsorAnalytics />} />
              <Route path={routes.SPONSOR_SETTINGS} element={<SponsorSettings />} />
            </Route>

            {/* Admin routes */}
            <Route element={<AdminRoute />}>
              <Route path={routes.ADMIN_DASHBOARD} element={<AdminDashboard />} />
              <Route path={routes.ADMIN_USERS} element={<AdminUsers />} />
              <Route path={routes.ADMIN_SPONSORS} element={<AdminSponsors />} />
              <Route path={routes.ADMIN_MODERATION} element={<AdminModeration />} />
              <Route path={routes.ADMIN_FRAUD_CASES} element={<AdminFraudCases />} />
              <Route path={routes.ADMIN_DISPUTES} element={<AdminDisputes />} />
              <Route path={routes.ADMIN_REPORTS} element={<AdminReports />} />
              <Route path={routes.ADMIN_SYSTEM_CONFIG} element={<AdminSystemConfig />} />
              <Route path={routes.ADMIN_AUDIT_LOGS} element={<AdminAuditLogs />} />
              <Route path={routes.ADMIN_SYSTEM_HEALTH} element={<AdminSystemHealth />} />
              <Route path={routes.ADMIN_SETTINGS} element={<AdminSettings />} />
            </Route>

            {/* 404 redirect */}
            <Route path="*" element={<Navigate to={routes.HOME} replace />} />
          </Routes>
        </main>
      </div>
      <Footer />
      <MobileNav />
      <ToastContainer />
    </div>
  );
}

export default App;
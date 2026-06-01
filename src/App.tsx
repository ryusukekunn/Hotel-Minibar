import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RoomsPage from './pages/RoomsPage'
import RoomDetailPage from './pages/RoomDetailPage'
import AdminPage from './pages/AdminPage'
import ReceptionPage from './pages/ReceptionPage'
import HousekeepingPage from './pages/HousekeepingPage'
import AuditPage from './pages/AuditPage'
import CheckoutPage from './pages/CheckoutPage'

// Components
import Layout from './components/shared/Layout'
import LoadingScreen from './components/shared/LoadingScreen'
import PWAInstallPrompt from './components/shared/PWAInstallPrompt'
import OfflineSyncBanner from './components/shared/OfflineSyncBanner'

function AppRoutes() {
  const { session, user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <LoginPage />

  return (
    <>
      <Layout>
        <OfflineSyncBanner />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/rooms/:id" element={<RoomDetailPage />} />
          <Route path="/checkout/:id" element={<CheckoutPage />} />

          {user?.role === 'admin' && (
            <>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/audit" element={<AuditPage />} />
            </>
          )}

          {(user?.role === 'admin' || user?.role === 'reception') && (
            <Route path="/reception" element={<ReceptionPage />} />
          )}

          {(user?.role === 'admin' || user?.role === 'housekeeping') && (
            <Route path="/housekeeping" element={<HousekeepingPage />} />
          )}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <PWAInstallPrompt />
    </>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#f1f5f9' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' },
            },
          }}
        />
      </AuthProvider>
    </Router>
  )
}

export default App

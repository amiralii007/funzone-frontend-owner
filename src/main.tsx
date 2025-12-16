import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import AppLayout from './ui/AppLayout'
import DashboardPage from './pages/DashboardPage'
import VenuesPage from './pages/VenuesPage'
import VenueEditPage from './pages/VenueEditPage'
import EventsPage from './pages/EventsPage'
import EventEditPage from './pages/EventEditPage'
import WalletPage from './pages/WalletPage'
import ProfilePage from './pages/ProfilePage'
import SupportPage from './pages/SupportPage'
import CommentsPage from './pages/CommentsPage'
import ReservationsPage from './pages/ReservationsPage'
import LoginPage from './pages/LoginPage'
import PaymentCallbackPage from './pages/PaymentCallbackPage'
import AuthGuard from './components/AuthGuard'
import ProfileCompletionGuard from './components/ProfileCompletionGuard'
import ScrollRestoration from './components/ScrollRestoration'
import { LanguageProvider } from './contexts/LanguageContext'
import { AuthProvider } from './state/authStore'

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <>
        <ScrollRestoration />
        <AuthGuard>
          <ProfileCompletionGuard>
            <AppLayout />
          </ProfileCompletionGuard>
        </AuthGuard>
      </>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'venues', element: <VenuesPage /> },
      { path: 'venues/:id/edit', element: <VenueEditPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:id/edit', element: <EventEditPage /> },
      { path: 'wallet', element: <WalletPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'support', element: <SupportPage /> },
      { path: 'comments', element: <CommentsPage /> },
      { path: 'reservations', element: <ReservationsPage /> },
      { path: 'analytics', element: <Navigate to="/" replace /> },
    ],
  },
  {
    path: '/login',
    element: (
      <>
        <ScrollRestoration />
        <LoginPage />
      </>
    ),
  },
  {
    path: '/payment/callback',
    element: (
      <>
        <ScrollRestoration />
        <PaymentCallbackPage />
      </>
    ),
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>
)

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Settings, ClipboardList,
  LogOut, Menu, X, Wifi, WifiOff, Bell, ShieldCheck,
  Hotel, BookOpen
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getPendingActionsCount } from '../../lib/offline'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const pendingCount = getPendingActionsCount()

  const navItems = [
    {
      label: 'Kontrolna tabla',
      href: '/',
      icon: LayoutDashboard,
      roles: ['admin', 'reception', 'housekeeping'],
    },
    {
      label: 'Sobe',
      href: '/rooms',
      icon: Building2,
      roles: ['admin', 'reception', 'housekeeping'],
    },
    {
      label: 'Recepcija',
      href: '/reception',
      icon: Hotel,
      roles: ['admin', 'reception'],
    },
    {
      label: 'Sobarice',
      href: '/housekeeping',
      icon: ClipboardList,
      roles: ['admin', 'housekeeping'],
    },
    {
      label: 'Administracija',
      href: '/admin',
      icon: Settings,
      roles: ['admin'],
    },
    {
      label: 'Audit log',
      href: '/audit',
      icon: BookOpen,
      roles: ['admin'],
    },
  ]

  const filteredNav = navItems.filter(item =>
    user ? item.roles.includes(user.role) : false
  )

  const roleLabel = {
    admin: 'Administrator',
    reception: 'Recepcija',
    housekeeping: 'Sobarica',
  }[user?.role ?? 'admin']

  const roleColor = {
    admin: 'text-gold-400',
    reception: 'text-blue-400',
    housekeeping: 'text-emerald-400',
  }[user?.role ?? 'admin']

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 bg-slate-900 border-r border-slate-800 z-50
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-hotel-600 to-hotel-800 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-lg">🍾</span>
              </div>
              <div>
                <h1 className="font-display text-white font-semibold text-lg leading-none">
                  Hotel Minibar
                </h1>
                <p className="text-slate-500 text-xs mt-0.5">Upravljanje</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {filteredNav.map(item => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150
                      font-medium text-sm touch-manipulation select-none
                      ${isActive
                        ? 'bg-hotel-600/20 text-hotel-300 border border-hotel-600/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                      }
                    `}
                  >
                    <Icon size={18} className={isActive ? 'text-hotel-400' : ''} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Offline indicator */}
        {(!isOnline || pendingCount > 0) && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <WifiOff size={14} className="text-amber-400" />
              <span className="text-xs text-amber-300 font-medium">
                {!isOnline ? 'Oflajn mod' : `${pendingCount} čeka sinhronizaciju`}
              </span>
            </div>
          </div>
        )}

        {/* User info */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center font-semibold text-sm text-white">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.full_name}</p>
              <p className={`text-xs font-medium flex items-center gap-1 ${roleColor}`}>
                <ShieldCheck size={11} />
                {roleLabel}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 text-sm font-medium touch-manipulation"
          >
            <LogOut size={16} />
            Odjava
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 safe-top">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors touch-manipulation"
            >
              <Menu size={20} />
            </button>

            {/* Page title (mobile) */}
            <div className="lg:hidden">
              <span className="font-display text-white font-semibold">
                {filteredNav.find(n => n.href === location.pathname)?.label ?? 'Hotel Minibar'}
              </span>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Wifi size={12} className="text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium hidden sm:block">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse-soft">
                  <WifiOff size={12} className="text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium hidden sm:block">Oflajn</span>
                </div>
              )}
              {pendingCount > 0 && (
                <div className="relative">
                  <Bell size={18} className="text-slate-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

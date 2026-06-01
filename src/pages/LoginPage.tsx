import { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Unesite email i lozinku')
      return
    }

    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast.error('Pogrešan email ili lozinka')
    }
  }

  const demoAccounts = [
    { role: 'Admin', email: 'admin@hotel.com', color: 'text-gold-400' },
    { role: 'Recepcija', email: 'recepcija@hotel.com', color: 'text-blue-400' },
    { role: 'Sobarica', email: 'sobarica@hotel.com', color: 'text-emerald-400' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-hotel-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gold-600/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-hotel-600 to-hotel-900 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-hotel-900/50">
            <span className="text-4xl">🍾</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-white mb-1">
            Hotel Minibar
          </h1>
          <p className="text-slate-400 text-sm">Sistem upravljanja minibarom</p>
        </div>

        {/* Form */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email adresa</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vas@email.com"
                className="input-field"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label className="label">Lozinka</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-11"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 touch-manipulation"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Prijava...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Prijavite se
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 card p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Demo nalozi (lozinka: demo123)
          </p>
          <div className="space-y-2">
            {demoAccounts.map(acc => (
              <button
                key={acc.email}
                onClick={() => {
                  setEmail(acc.email)
                  setPassword('demo123')
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors text-sm touch-manipulation"
              >
                <span className={`font-medium ${acc.color}`}>{acc.role}</span>
                <span className="text-slate-400 text-xs">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          © 2024 Hotel Minibar System
        </p>
      </div>
    </div>
  )
}

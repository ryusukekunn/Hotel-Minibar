import { useState, useEffect } from 'react'
import { Plus, Trash2, ShieldCheck, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../shared/ConfirmDialog'
import Modal from '../shared/Modal'
import toast from 'react-hot-toast'
import type { User, UserRole } from '../../types'

const ROLE_OPTIONS: { value: UserRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Administrator', color: 'text-gold-400' },
  { value: 'reception', label: 'Recepcija', color: 'text-blue-400' },
  { value: 'housekeeping', label: 'Sobarica', color: 'text-emerald-400' },
]

export default function UserManager() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'housekeeping' as UserRole,
  })

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setUsers(data as User[])
    } finally {
      setLoading(false)
    }
  }

  async function createUser() {
    if (!form.email || !form.full_name || !form.password) {
      toast.error('Popunite sva polja')
      return
    }
    if (form.password.length < 6) {
      toast.error('Lozinka mora imati najmanje 6 karaktera')
      return
    }
    setSaving(true)
    try {
      // Create auth user via admin API (requires service role — here using signUp workaround)
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name, role: form.role },
        },
      })
      if (error) throw error

      if (data.user) {
        await supabase
          .from('profiles')
          .update({ full_name: form.full_name, role: form.role })
          .eq('id', data.user.id)
      }

      toast.success(`Korisnik ${form.full_name} kreiran`)
      setModalOpen(false)
      setForm({ email: '', full_name: '', password: '', role: 'housekeeping' })
      setTimeout(loadUsers, 1000)
    } catch (e: any) {
      toast.error(e.message ?? 'Greška pri kreiranju korisnika')
    } finally {
      setSaving(false)
    }
  }

  async function updateRole(userId: string, role: UserRole) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      toast.success('Uloga promenjena')
    } catch {
      toast.error('Greška pri promeni uloge')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{users.length} korisnika</p>
        <div className="flex gap-2">
          <button
            onClick={loadUsers}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors touch-manipulation"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Plus size={15} />
            Dodaj korisnika
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="card divide-y divide-slate-700/50">
          {users.length === 0 && (
            <div className="py-8 text-center text-slate-500">Nema korisnika</div>
          )}
          {users.map(user => {
            const roleConfig = ROLE_OPTIONS.find(r => r.value === user.role)
            const isCurrentUser = user.id === currentUser?.id
            return (
              <div key={user.id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center font-semibold text-white text-sm flex-shrink-0">
                  {user.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200 truncate">{user.full_name}</p>
                    {isCurrentUser && (
                      <span className="text-[10px] text-hotel-400 bg-hotel-400/10 px-1.5 py-0.5 rounded-full">Vi</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={user.role}
                    onChange={e => updateRole(user.id, e.target.value as UserRole)}
                    disabled={isCurrentUser}
                    className={`text-xs font-medium bg-transparent border-0 cursor-pointer focus:outline-none ${roleConfig?.color ?? 'text-slate-400'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value} className="bg-slate-800 text-white">
                        {r.label}
                      </option>
                    ))}
                  </select>
                  {!isCurrentUser && (
                    <button
                      onClick={() => setDeleteTarget(user)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors touch-manipulation"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create user modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novi korisnik"
        size="sm"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Otkaži</button>
            <button onClick={createUser} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Kreiranje...' : 'Kreiraj'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Ime i prezime *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="npr. Marija Jovanović"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="marija@hotel.com"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Lozinka *</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="Minimum 6 karaktera"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Uloga</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, role: r.value }))}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all touch-manipulation border ${
                    form.role === r.value
                      ? 'border-hotel-500 bg-hotel-600/20 text-hotel-300'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          // Note: actual deletion requires service role key
          toast.error('Brisanje korisnika zahteva admin pristup Supabase dashboard-u')
          setDeleteTarget(null)
        }}
        title="Obriši korisnika"
        message={`Da li ste sigurni da želite da obrišete korisnika "${deleteTarget?.full_name}"?`}
        confirmLabel="Obriši"
        loading={deleting}
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Package, Building2, Settings, Save, Users, ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import Modal from '../components/shared/Modal'
import InventoryManager from '../components/admin/InventoryManager'
import UserManager from '../components/admin/UserManager'
import toast from 'react-hot-toast'
import type { Room, MinibarItem, ItemCategory } from '../types'

type AdminTab = 'rooms' | 'items' | 'inventory' | 'users'

const CATEGORY_OPTIONS: { value: ItemCategory; label: string; icon: string }[] = [
  { value: 'beverages', label: 'Bezalkoholna pića', icon: '🥤' },
  { value: 'alcohol', label: 'Alkoholna pića', icon: '🍷' },
  { value: 'snacks', label: 'Grickalice', icon: '🍿' },
  { value: 'toiletries', label: 'Toaletni pribor', icon: '🧴' },
  { value: 'other', label: 'Ostalo', icon: '📦' },
]

const ITEM_ICONS = ['🍺', '🍷', '🥃', '🍾', '🥤', '☕', '🍵', '🧃', '💧', '🍫', '🍿', '🍪', '🥜', '🧴', '🪥', '📦']

const ROOM_TYPES = [
  { value: 'single', label: 'Jednokrevetna' },
  { value: 'double', label: 'Dvokrevetna' },
  { value: 'suite', label: 'Apartman' },
  { value: 'deluxe', label: 'Deluxe' },
]

export default function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('rooms')
  const [rooms, setRooms] = useState<Room[]>([])
  const [items, setItems] = useState<MinibarItem[]>([])
  const [loading, setLoading] = useState(true)

  // Room modal state
  const [roomModal, setRoomModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomForm, setRoomForm] = useState({ number: '', floor: 1, type: 'double' as Room['type'] })

  // Item modal state
  const [itemModal, setItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MinibarItem | null>(null)
  const [itemForm, setItemForm] = useState({
    name: '', category: 'beverages' as ItemCategory,
    price: '', icon: '📦', barcode: ''
  })

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'room' | 'item'; id: string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [roomsRes, itemsRes] = await Promise.all([
        supabase.from('rooms').select('*').order('number'),
        supabase.from('minibar_items').select('*').order('name'),
      ])
      if (roomsRes.data) setRooms(roomsRes.data as Room[])
      if (itemsRes.data) setItems(itemsRes.data as MinibarItem[])
    } finally {
      setLoading(false)
    }
  }

  // ---- ROOMS CRUD ----
  function openRoomModal(room?: Room) {
    if (room) {
      setEditingRoom(room)
      setRoomForm({ number: room.number, floor: room.floor, type: room.type })
    } else {
      setEditingRoom(null)
      setRoomForm({ number: '', floor: 1, type: 'double' })
    }
    setRoomModal(true)
  }

  async function saveRoom() {
    if (!roomForm.number.trim()) return toast.error('Unesite broj sobe')
    setSaving(true)
    try {
      if (editingRoom) {
        const { error } = await supabase
          .from('rooms')
          .update({ ...roomForm, updated_at: new Date().toISOString() })
          .eq('id', editingRoom.id)
        if (error) throw error
        toast.success('Soba ažurirana')
      } else {
        const { error } = await supabase.from('rooms').insert({
          ...roomForm,
          status: 'free',
        })
        if (error) throw error
        toast.success('Soba dodana')
      }
      setRoomModal(false)
      loadData()
    } catch (e: any) {
      toast.error(e.message ?? 'Greška')
    } finally {
      setSaving(false)
    }
  }

  // ---- ITEMS CRUD ----
  function openItemModal(item?: MinibarItem) {
    if (item) {
      setEditingItem(item)
      setItemForm({
        name: item.name,
        category: item.category as ItemCategory,
        price: String(item.price),
        icon: item.icon,
        barcode: item.barcode ?? '',
      })
    } else {
      setEditingItem(null)
      setItemForm({ name: '', category: 'beverages', price: '', icon: '📦', barcode: '' })
    }
    setItemModal(true)
  }

  async function saveItem() {
    if (!itemForm.name.trim()) return toast.error('Unesite naziv artikla')
    if (!itemForm.price || isNaN(Number(itemForm.price))) return toast.error('Unesite ispravnu cenu')
    setSaving(true)
    try {
      const data = {
        name: itemForm.name.trim(),
        category: itemForm.category,
        price: parseFloat(itemForm.price),
        icon: itemForm.icon,
        barcode: itemForm.barcode || null,
        is_active: true,
      }
      if (editingItem) {
        const { error } = await supabase.from('minibar_items').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editingItem.id)
        if (error) throw error
        toast.success('Artikal ažuriran')
      } else {
        const { error } = await supabase.from('minibar_items').insert(data)
        if (error) throw error
        toast.success('Artikal dodat')
      }
      setItemModal(false)
      loadData()
    } catch (e: any) {
      toast.error(e.message ?? 'Greška')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const table = deleteConfirm.type === 'room' ? 'rooms' : 'minibar_items'
      const { error } = await supabase.from(table).delete().eq('id', deleteConfirm.id)
      if (error) throw error
      toast.success(`${deleteConfirm.type === 'room' ? 'Soba' : 'Artikal'} obrisan`)
      setDeleteConfirm(null)
      loadData()
    } catch (e: any) {
      toast.error(e.message ?? 'Greška pri brisanju')
    } finally {
      setDeleting(false)
    }
  }

  const tabs = [
    { id: 'rooms' as AdminTab, label: 'Sobe', icon: Building2, count: rooms.length },
    { id: 'items' as AdminTab, label: 'Artikli', icon: Package, count: items.length },
    { id: 'inventory' as AdminTab, label: 'Inventar', icon: ClipboardList, count: null },
    { id: 'users' as AdminTab, label: 'Korisnici', icon: Users, count: null },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-white">Administracija</h1>
          <p className="text-slate-400 text-sm">Upravljanje hotelom</p>
        </div>
        <Settings size={20} className="text-slate-500" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all touch-manipulation ${activeTab === tab.id ? 'bg-hotel-600 text-white' : 'text-slate-400'}`}
            >
              <Icon size={14} />
              {tab.label}
              {tab.count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-hotel-500/50' : 'bg-slate-700'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ROOMS TAB */}
      {activeTab === 'rooms' && (
        <div className="space-y-3">
          <button
            onClick={() => openRoomModal()}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Dodaj sobu
          </button>

          {loading ? (
            [...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)
          ) : (
            <div className="card divide-y divide-slate-700/50">
              {rooms.length === 0 && (
                <div className="py-8 text-center text-slate-500">Nema soba</div>
              )}
              {rooms.map(room => (
                <div key={room.id} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center font-bold text-white text-sm">
                    {room.number}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">Soba {room.number}</p>
                    <p className="text-xs text-slate-500">Sprat {room.floor} · {room.type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openRoomModal(room)}
                      className="p-2 rounded-lg text-slate-400 hover:text-hotel-400 hover:bg-hotel-400/10 transition-colors touch-manipulation"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'room', id: room.id, label: `Soba ${room.number}` })}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors touch-manipulation"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ITEMS TAB */}
      {activeTab === 'items' && (
        <div className="space-y-3">
          <button
            onClick={() => openItemModal()}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Dodaj artikal
          </button>

          {loading ? (
            [...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)
          ) : (
            <div className="card divide-y divide-slate-700/50">
              {items.length === 0 && (
                <div className="py-8 text-center text-slate-500">Nema artikala</div>
              )}
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-4">
                  <span className="text-xl w-8 text-center">{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {CATEGORY_OPTIONS.find(c => c.value === item.category)?.label} ·{' '}
                      <span className="text-emerald-400">{item.price.toFixed(2)} €</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openItemModal(item)}
                      className="p-2 rounded-lg text-slate-400 hover:text-hotel-400 hover:bg-hotel-400/10 transition-colors touch-manipulation"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'item', id: item.id, label: item.name })}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors touch-manipulation"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && <InventoryManager />}

      {/* USERS TAB */}
      {activeTab === 'users' && <UserManager />}

      {/* ROOM MODAL */}
      <Modal
        isOpen={roomModal}
        onClose={() => setRoomModal(false)}
        title={editingRoom ? 'Uredi sobu' : 'Nova soba'}
        size="sm"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setRoomModal(false)} className="btn-secondary flex-1">Otkaži</button>
            <button onClick={saveRoom} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? '...' : <><Save size={15} />Sačuvaj</>}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Broj sobe *</label>
            <input
              type="text"
              value={roomForm.number}
              onChange={e => setRoomForm(p => ({ ...p, number: e.target.value }))}
              placeholder="npr. 101"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Sprat</label>
            <input
              type="number"
              min={0}
              max={99}
              value={roomForm.floor}
              onChange={e => setRoomForm(p => ({ ...p, floor: Number(e.target.value) }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Tip sobe</label>
            <select
              value={roomForm.type}
              onChange={e => setRoomForm(p => ({ ...p, type: e.target.value as Room['type'] }))}
              className="input-field"
            >
              {ROOM_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ITEM MODAL */}
      <Modal
        isOpen={itemModal}
        onClose={() => setItemModal(false)}
        title={editingItem ? 'Uredi artikal' : 'Novi artikal'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setItemModal(false)} className="btn-secondary flex-1">Otkaži</button>
            <button onClick={saveItem} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? '...' : <><Save size={15} />Sačuvaj</>}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Naziv artikla *</label>
            <input
              type="text"
              value={itemForm.name}
              onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))}
              placeholder="npr. Coca Cola 0.33l"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Kategorija</label>
            <select
              value={itemForm.category}
              onChange={e => setItemForm(p => ({ ...p, category: e.target.value as ItemCategory }))}
              className="input-field"
            >
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cena (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={itemForm.price}
              onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))}
              placeholder="0.00"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Ikona</label>
            <div className="grid grid-cols-8 gap-2 p-3 bg-slate-800 rounded-xl">
              {ITEM_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setItemForm(p => ({ ...p, icon }))}
                  className={`text-xl h-9 rounded-lg flex items-center justify-center transition-all touch-manipulation ${itemForm.icon === icon ? 'bg-hotel-600 ring-2 ring-hotel-400' : 'hover:bg-slate-700'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Barkod (opciono)</label>
            <input
              type="text"
              value={itemForm.barcode}
              onChange={e => setItemForm(p => ({ ...p, barcode: e.target.value }))}
              placeholder="EAN barkod"
              className="input-field"
            />
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Potvrdi brisanje"
        message={`Da li ste sigurni da želite da obrišete "${deleteConfirm?.label}"? Ova akcija se ne može poništiti.`}
        confirmLabel="Obriši"
        loading={deleting}
      />
    </div>
  )
}

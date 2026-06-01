import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RoomInventory, MinibarItem } from '../types'
import toast from 'react-hot-toast'

export interface InventoryWithItem extends RoomInventory {
  item: MinibarItem
}

export function useRoomInventory(roomId: string | undefined) {
  const [inventory, setInventory] = useState<InventoryWithItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!roomId) return
    try {
      const { data, error } = await supabase
        .from('room_inventory')
        .select('*, minibar_items(*)')
        .eq('room_id', roomId)
        .order('minibar_items(category)')

      if (error) throw error

      setInventory(
        (data as any[]).map(row => ({
          ...row,
          item: row.minibar_items as MinibarItem,
        }))
      )
    } catch {
      toast.error('Greška pri učitavanju inventara')
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => { fetch() }, [fetch])

  async function updateQuantity(inventoryId: string, quantity: number) {
    try {
      const { error } = await supabase
        .from('room_inventory')
        .update({ current_quantity: quantity, updated_at: new Date().toISOString() })
        .eq('id', inventoryId)
      if (error) throw error
      setInventory(prev =>
        prev.map(i => i.id === inventoryId ? { ...i, current_quantity: quantity } : i)
      )
    } catch {
      toast.error('Greška pri ažuriranju količine')
    }
  }

  async function setDefaultInventory(roomId: string) {
    try {
      const { data: items } = await supabase
        .from('minibar_items')
        .select('id, category')
        .eq('is_active', true)

      if (!items) return

      const inserts = items.map(item => ({
        room_id: roomId,
        item_id: item.id,
        default_quantity: item.category === 'beverages' ? 3 : 2,
        current_quantity: item.category === 'beverages' ? 3 : 2,
        min_quantity: 1,
      }))

      const { error } = await supabase
        .from('room_inventory')
        .upsert(inserts, { onConflict: 'room_id,item_id' })

      if (error) throw error
      toast.success('Podrazumevani inventar postavljen')
      fetch()
    } catch {
      toast.error('Greška pri postavljanju inventara')
    }
  }

  return { inventory, loading, refetch: fetch, updateQuantity, setDefaultInventory }
}

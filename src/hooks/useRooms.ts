import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Room, RoomStatus } from '../types'
import { setCacheEntry, getCacheEntry } from '../lib/offline'
import toast from 'react-hot-toast'

const CACHE_KEY = 'rooms_list'

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRooms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('number')

      if (error) throw error

      const roomData = data as Room[]
      setRooms(roomData)
      setCacheEntry(CACHE_KEY, roomData)
      setError(null)
    } catch (err) {
      const cached = getCacheEntry<Room[]>(CACHE_KEY)
      if (cached) {
        setRooms(cached)
      } else {
        setError('Nije moguće učitati sobe')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Odmah prikaži keš dok se čeka mreža
    const cached = getCacheEntry<Room[]>(CACHE_KEY)
    if (cached) {
      setRooms(cached)
      setLoading(false)
    }
    fetchRooms()
  }, [fetchRooms])

  // Real-time sinhronizacija
  useEffect(() => {
    const channel = supabase
      .channel('rooms_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
      }, () => {
        fetchRooms()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchRooms])

  async function updateRoomStatus(roomId: string, status: RoomStatus, notes?: string) {
    const room = rooms.find(r => r.id === roomId)
    if (!room) return

    try {
      const { error } = await supabase
        .from('rooms')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', roomId)

      if (error) throw error

      // Log status promene
      await supabase.from('room_status_logs').insert({
        room_id: roomId,
        from_status: room.status,
        to_status: status,
        changed_by: (await supabase.auth.getUser()).data.user?.id ?? '',
        notes: notes ?? null,
      })

      setRooms(prev => prev.map(r =>
        r.id === roomId ? { ...r, status, updated_at: new Date().toISOString() } : r
      ))
    } catch {
      toast.error('Greška pri promeni statusa sobe')
      throw new Error('Status update failed')
    }
  }

  async function deleteRoom(roomId: string) {
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId)
      if (error) throw error
      setRooms(prev => prev.filter(r => r.id !== roomId))
      toast.success('Soba obrisana')
    } catch {
      toast.error('Greška pri brisanju sobe')
    }
  }

  return { rooms, loading, error, fetchRooms, updateRoomStatus, deleteRoom }
}

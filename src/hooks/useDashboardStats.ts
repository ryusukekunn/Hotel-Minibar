import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface DashboardStats {
  roomsWaiting: number
  roomsInspected: number
  roomsReady: number
  roomsOccupied: number
  todayRevenue: number
  weekRevenue: number
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    roomsWaiting: 0,
    roomsInspected: 0,
    roomsReady: 0,
    roomsOccupied: 0,
    todayRevenue: 0,
    weekRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const [roomsRes, todayRes, weekRes] = await Promise.all([
        supabase.from('rooms').select('status'),
        supabase
          .from('consumption_logs')
          .select('total_price')
          .gte('created_at', today.toISOString()),
        supabase
          .from('consumption_logs')
          .select('total_price')
          .gte('created_at', weekAgo.toISOString()),
      ])

      const rooms = roomsRes.data ?? []
      setStats({
        roomsWaiting: rooms.filter(r => r.status === 'waiting_inspection').length,
        roomsInspected: rooms.filter(r => r.status === 'inspected').length,
        roomsReady: rooms.filter(r => r.status === 'ready_for_charge').length,
        roomsOccupied: rooms.filter(r => r.status === 'occupied').length,
        todayRevenue: (todayRes.data ?? []).reduce((s, r) => s + (r.total_price ?? 0), 0),
        weekRevenue: (weekRes.data ?? []).reduce((s, r) => s + (r.total_price ?? 0), 0),
      })
    } catch (err) {
      console.error('Stats error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    // Real-time subscription za rooms i consumption
    const channel = supabase
      .channel('dashboard_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'consumption_logs' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

  return { stats, loading, refresh: load }
}

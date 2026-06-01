import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { MinibarItem } from '../types'
import { setCacheEntry, getCacheEntry } from '../lib/offline'

const CACHE_KEY = 'minibar_items'

export function useMinibarItems() {
  const [items, setItems] = useState<MinibarItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('minibar_items')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name')

      if (error) throw error

      const itemData = data as MinibarItem[]
      setItems(itemData)
      setCacheEntry(CACHE_KEY, itemData, 10 * 60 * 1000)
    } catch {
      const cached = getCacheEntry<MinibarItem[]>(CACHE_KEY)
      if (cached) setItems(cached)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const cached = getCacheEntry<MinibarItem[]>(CACHE_KEY)
    if (cached) {
      setItems(cached)
      setLoading(false)
    }
    fetchItems()
  }, [fetchItems])

  return { items, loading, fetchItems }
}

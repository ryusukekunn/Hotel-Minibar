// ============================================================
// TIPOVI ZA HOTEL MINIBAR APLIKACIJU
// ============================================================

export type UserRole = 'admin' | 'reception' | 'housekeeping'

export type RoomStatus =
  | 'free'
  | 'occupied'
  | 'checkout'
  | 'waiting_inspection'
  | 'inspected'
  | 'ready_for_charge'
  | 'completed'

export type ItemCategory =
  | 'beverages'
  | 'alcohol'
  | 'snacks'
  | 'toiletries'
  | 'other'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  hotel_id?: string
  created_at: string
}

export interface Room {
  id: string
  number: string
  floor: number
  type: 'single' | 'double' | 'suite' | 'deluxe'
  status: RoomStatus
  notes?: string
  last_inspected_at?: string
  last_inspected_by?: string
  created_at: string
  updated_at: string
}

export interface MinibarItem {
  id: string
  name: string
  category: ItemCategory
  price: number
  icon: string
  barcode?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoomInventory {
  id: string
  room_id: string
  item_id: string
  default_quantity: number
  current_quantity: number
  min_quantity: number
  item?: MinibarItem
  created_at: string
  updated_at: string
}

export interface ConsumptionLog {
  id: string
  room_id: string
  item_id: string
  quantity: number
  unit_price: number
  total_price: number
  logged_by: string
  guest_checkout_id?: string
  created_at: string
  item?: MinibarItem
  room?: Room
  logged_by_user?: User
}

export interface RefillLog {
  id: string
  room_id: string
  item_id: string
  quantity_refilled: number
  refilled_by: string
  created_at: string
  item?: MinibarItem
  refilled_by_user?: User
}

export interface RoomStatusLog {
  id: string
  room_id: string
  from_status: RoomStatus
  to_status: RoomStatus
  changed_by: string
  notes?: string
  created_at: string
  changed_by_user?: User
}

export interface RoomNote {
  id: string
  room_id: string
  content: string
  author_id: string
  author_role: UserRole
  created_at: string
  author?: User
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name: string
  record_id: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  created_at: string
  user?: User
}

export interface DashboardStats {
  rooms_waiting_inspection: number
  rooms_inspected: number
  rooms_ready_for_charge: number
  today_revenue: number
  top_consumed_items: Array<{
    item_name: string
    total_quantity: number
    total_revenue: number
  }>
  low_stock_rooms: Array<{
    room_number: string
    item_name: string
    current_quantity: number
    min_quantity: number
  }>
}

// Za oflajn keširanje
export interface OfflineAction {
  id: string
  type: 'consumption' | 'refill' | 'note' | 'status_change' | 'room_check'
  payload: Record<string, unknown>
  created_at: string
  synced: boolean
}

export interface CheckoutSummary {
  room: Room
  items: Array<{
    item: MinibarItem
    quantity: number
    unit_price: number
    total: number
  }>
  total_amount: number
  period: {
    from: string
    to: string
  }
}

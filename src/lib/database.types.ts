// Automatski generisani tipovi za Supabase bazu podataka
// Ove tipove možete regenerisati koristeći: supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          number: string
          floor: number
          type: string
          status: string
          notes: string | null
          last_inspected_at: string | null
          last_inspected_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          number: string
          floor: number
          type: string
          status?: string
          notes?: string | null
          last_inspected_at?: string | null
          last_inspected_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          number?: string
          floor?: number
          type?: string
          status?: string
          notes?: string | null
          last_inspected_at?: string | null
          last_inspected_by?: string | null
          updated_at?: string
        }
      }
      minibar_items: {
        Row: {
          id: string
          name: string
          category: string
          price: number
          icon: string
          barcode: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          price: number
          icon: string
          barcode?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          price?: number
          icon?: string
          barcode?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      room_inventory: {
        Row: {
          id: string
          room_id: string
          item_id: string
          default_quantity: number
          current_quantity: number
          min_quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          item_id: string
          default_quantity: number
          current_quantity: number
          min_quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          item_id?: string
          default_quantity?: number
          current_quantity?: number
          min_quantity?: number
          updated_at?: string
        }
      }
      consumption_logs: {
        Row: {
          id: string
          room_id: string
          item_id: string
          quantity: number
          unit_price: number
          total_price: number
          logged_by: string
          guest_checkout_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          item_id: string
          quantity: number
          unit_price: number
          total_price: number
          logged_by: string
          guest_checkout_id?: string | null
          created_at?: string
        }
        Update: never
      }
      refill_logs: {
        Row: {
          id: string
          room_id: string
          item_id: string
          quantity_refilled: number
          refilled_by: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          item_id: string
          quantity_refilled: number
          refilled_by: string
          created_at?: string
        }
        Update: never
      }
      room_status_logs: {
        Row: {
          id: string
          room_id: string
          from_status: string
          to_status: string
          changed_by: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          from_status: string
          to_status: string
          changed_by: string
          notes?: string | null
          created_at?: string
        }
        Update: never
      }
      room_notes: {
        Row: {
          id: string
          room_id: string
          content: string
          author_id: string
          author_role: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          content: string
          author_id: string
          author_role: string
          created_at?: string
        }
        Update: never
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          role?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          table_name: string
          record_id: string
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          table_name: string
          record_id: string
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: never
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

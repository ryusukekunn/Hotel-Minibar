-- ============================================================
-- HOTEL MINIBAR MANAGEMENT SYSTEM
-- Supabase SQL Schema - Kompletan setup
-- Verzija: 1.0.0
-- ============================================================

-- Čišćenje starih tabela (redosled zbog FK)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS room_notes CASCADE;
DROP TABLE IF EXISTS room_status_logs CASCADE;
DROP TABLE IF EXISTS refill_logs CASCADE;
DROP TABLE IF EXISTS consumption_logs CASCADE;
DROP TABLE IF EXISTS room_inventory CASCADE;
DROP TABLE IF EXISTS minibar_items CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================
-- TABELA: profiles (korisnici)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'reception', 'housekeeping')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: rooms (sobe)
-- ============================================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  floor INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL DEFAULT 'double' CHECK (type IN ('single', 'double', 'suite', 'deluxe')),
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN (
    'free', 'occupied', 'checkout',
    'waiting_inspection', 'inspected',
    'ready_for_charge', 'completed'
  )),
  notes TEXT,
  last_inspected_at TIMESTAMPTZ,
  last_inspected_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksi za brže pretrage
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_number ON rooms(number);
CREATE INDEX idx_rooms_floor ON rooms(floor);

-- ============================================================
-- TABELA: minibar_items (artikli minibar)
-- ============================================================
CREATE TABLE minibar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'beverages', 'alcohol', 'snacks', 'toiletries', 'other'
  )),
  price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  icon TEXT NOT NULL DEFAULT '📦',
  barcode TEXT UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_minibar_items_category ON minibar_items(category);
CREATE INDEX idx_minibar_items_active ON minibar_items(is_active);

-- ============================================================
-- TABELA: room_inventory (inventar po sobi)
-- ============================================================
CREATE TABLE room_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES minibar_items(id) ON DELETE CASCADE,
  default_quantity INTEGER NOT NULL DEFAULT 1 CHECK (default_quantity >= 0),
  current_quantity INTEGER NOT NULL DEFAULT 1 CHECK (current_quantity >= 0),
  min_quantity INTEGER NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, item_id)
);

CREATE INDEX idx_room_inventory_room ON room_inventory(room_id);
CREATE INDEX idx_room_inventory_item ON room_inventory(item_id);
CREATE INDEX idx_room_inventory_low_stock ON room_inventory(current_quantity, min_quantity);

-- ============================================================
-- TABELA: consumption_logs (evidencija konzumacije)
-- ============================================================
CREATE TABLE consumption_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES minibar_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  logged_by UUID NOT NULL REFERENCES profiles(id),
  guest_checkout_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consumption_room ON consumption_logs(room_id);
CREATE INDEX idx_consumption_item ON consumption_logs(item_id);
CREATE INDEX idx_consumption_date ON consumption_logs(created_at);
CREATE INDEX idx_consumption_logged_by ON consumption_logs(logged_by);

-- ============================================================
-- TABELA: refill_logs (evidencija punjenja minibar)
-- ============================================================
CREATE TABLE refill_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES minibar_items(id) ON DELETE RESTRICT,
  quantity_refilled INTEGER NOT NULL CHECK (quantity_refilled > 0),
  refilled_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refill_room ON refill_logs(room_id);
CREATE INDEX idx_refill_date ON refill_logs(created_at);

-- ============================================================
-- TABELA: room_status_logs (log promena statusa)
-- ============================================================
CREATE TABLE room_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_status_log_room ON room_status_logs(room_id);
CREATE INDEX idx_status_log_date ON room_status_logs(created_at);

-- ============================================================
-- TABELA: room_notes (napomene)
-- ============================================================
CREATE TABLE room_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id),
  author_role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_room ON room_notes(room_id);

-- ============================================================
-- TABELA: audit_logs (audit trail)
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_date ON audit_logs(created_at);

-- ============================================================
-- TRIGERI: updated_at automatsko ažuriranje
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER minibar_items_updated_at BEFORE UPDATE ON minibar_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER room_inventory_updated_at BEFORE UPDATE ON room_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGER: automatsko kreiranje profila pri registraciji
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'housekeeping')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE minibar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refill_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper funkcija za proveru uloge
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (auth_user_role() = 'admin');

-- ROOMS policies
CREATE POLICY "all_authenticated_read_rooms" ON rooms
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_reception_manage_rooms" ON rooms
  FOR ALL USING (auth_user_role() IN ('admin', 'reception'));

CREATE POLICY "housekeeping_update_rooms" ON rooms
  FOR UPDATE USING (auth_user_role() = 'housekeeping');

-- MINIBAR ITEMS policies
CREATE POLICY "all_read_items" ON minibar_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_manage_items" ON minibar_items
  FOR ALL USING (auth_user_role() = 'admin');

-- ROOM INVENTORY policies
CREATE POLICY "all_read_inventory" ON room_inventory
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_housekeeping_manage_inventory" ON room_inventory
  FOR ALL USING (auth_user_role() IN ('admin', 'housekeeping'));

-- CONSUMPTION LOGS policies
CREATE POLICY "all_read_consumption" ON consumption_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "housekeeping_admin_insert_consumption" ON consumption_logs
  FOR INSERT WITH CHECK (auth_user_role() IN ('admin', 'housekeeping'));

-- REFILL LOGS policies
CREATE POLICY "all_read_refill" ON refill_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "housekeeping_admin_insert_refill" ON refill_logs
  FOR INSERT WITH CHECK (auth_user_role() IN ('admin', 'housekeeping'));

-- STATUS LOGS policies
CREATE POLICY "all_read_status_logs" ON room_status_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "all_insert_status_logs" ON room_status_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- NOTES policies
CREATE POLICY "all_read_notes" ON room_notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "all_insert_notes" ON room_notes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- AUDIT LOGS policies
CREATE POLICY "admin_read_audit" ON audit_logs
  FOR SELECT USING (auth_user_role() = 'admin');

CREATE POLICY "all_insert_audit" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- REALTIME konfiguracija
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE consumption_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE room_status_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE room_notes;

-- ============================================================
-- SEED DATA - Demo podaci
-- ============================================================

-- Napomena: Korisnici se kreiraju kroz Supabase Auth dashboard
-- ili putem skripte. Profile tabela se automatski puni trigerom.
-- Demo nalog lozinke: demo123

-- Sobe
INSERT INTO rooms (number, floor, type, status) VALUES
  ('101', 1, 'single', 'free'),
  ('102', 1, 'double', 'occupied'),
  ('103', 1, 'double', 'waiting_inspection'),
  ('104', 1, 'suite', 'free'),
  ('105', 1, 'deluxe', 'occupied'),
  ('201', 2, 'single', 'free'),
  ('202', 2, 'double', 'checkout'),
  ('203', 2, 'double', 'inspected'),
  ('204', 2, 'suite', 'ready_for_charge'),
  ('205', 2, 'deluxe', 'occupied'),
  ('301', 3, 'double', 'free'),
  ('302', 3, 'suite', 'occupied'),
  ('303', 3, 'deluxe', 'waiting_inspection'),
  ('304', 3, 'double', 'free'),
  ('305', 3, 'single', 'completed');

-- Minibar artikli
INSERT INTO minibar_items (name, category, price, icon, is_active) VALUES
  -- Bezalkoholna pića
  ('Coca Cola 0.33l', 'beverages', 3.50, '🥤', true),
  ('Fanta Naranča 0.33l', 'beverages', 3.50, '🧃', true),
  ('Sprite 0.33l', 'beverages', 3.50, '💧', true),
  ('Mineralna voda 0.5l', 'beverages', 2.50, '💧', true),
  ('Gazirani sok 0.33l', 'beverages', 3.00, '🥤', true),
  ('Red Bull 0.25l', 'beverages', 5.50, '⚡', true),
  ('Sok od narandže 0.2l', 'beverages', 4.00, '🧃', true),
  ('Kafa instant', 'beverages', 2.50, '☕', true),
  ('Čaj filter', 'beverages', 2.00, '🍵', true),
  -- Alkohol
  ('Pivo Heineken 0.33l', 'alcohol', 5.00, '🍺', true),
  ('Vino crveno 0.187l', 'alcohol', 8.50, '🍷', true),
  ('Vino belo 0.187l', 'alcohol', 8.50, '🥂', true),
  ('Whisky Jameson 4cl', 'alcohol', 9.00, '🥃', true),
  ('Gin 4cl', 'alcohol', 8.50, '🍸', true),
  ('Prosecco 0.2l', 'alcohol', 12.00, '🍾', true),
  -- Grickalice
  ('Čips Pringles', 'snacks', 4.50, '🍿', true),
  ('Čokolada Milka', 'snacks', 4.00, '🍫', true),
  ('Kikiriki slani 50g', 'snacks', 3.00, '🥜', true),
  ('Keks maslac', 'snacks', 3.50, '🍪', true),
  ('Gumeni bomboni', 'snacks', 3.00, '🍬', true),
  -- Toaletni pribor
  ('Šampon 30ml', 'toiletries', 2.00, '🧴', true),
  ('Balzam za kosu 30ml', 'toiletries', 2.50, '🧴', true),
  ('Gel za tuširanje 30ml', 'toiletries', 2.00, '🧴', true),
  ('Pasta za zube', 'toiletries', 3.00, '🪥', true),
  ('Četkica za zube', 'toiletries', 3.50, '🪥', true);

-- Inventar soba (postavi za svaku sobu)
DO $$
DECLARE
  room RECORD;
  item RECORD;
BEGIN
  FOR room IN SELECT id FROM rooms LOOP
    FOR item IN SELECT id, category FROM minibar_items WHERE is_active = true LOOP
      INSERT INTO room_inventory (room_id, item_id, default_quantity, current_quantity, min_quantity)
      VALUES (
        room.id,
        item.id,
        CASE
          WHEN item.category = 'beverages' THEN 3
          WHEN item.category = 'alcohol' THEN 2
          WHEN item.category = 'snacks' THEN 2
          WHEN item.category = 'toiletries' THEN 2
          ELSE 1
        END,
        CASE
          WHEN item.category = 'beverages' THEN 3
          WHEN item.category = 'alcohol' THEN 2
          WHEN item.category = 'snacks' THEN 2
          WHEN item.category = 'toiletries' THEN 2
          ELSE 1
        END,
        1
      )
      ON CONFLICT (room_id, item_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- HELPER FUNKCIJA: dashboard statistike
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
  today_start TIMESTAMPTZ := date_trunc('day', NOW());
BEGIN
  SELECT json_build_object(
    'rooms_waiting_inspection', (SELECT COUNT(*) FROM rooms WHERE status = 'waiting_inspection'),
    'rooms_inspected', (SELECT COUNT(*) FROM rooms WHERE status = 'inspected'),
    'rooms_ready_for_charge', (SELECT COUNT(*) FROM rooms WHERE status = 'ready_for_charge'),
    'today_revenue', (
      SELECT COALESCE(SUM(total_price), 0)
      FROM consumption_logs
      WHERE created_at >= today_start
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- NAPOMENE ZA SETUP
-- ============================================================
-- 1. Pokrenite ovaj SQL u Supabase SQL Editor
-- 2. Kreirajte korisnike u Authentication > Users:
--    - admin@hotel.com (lozinka: demo123, meta: {"full_name":"Admin Hotela","role":"admin"})
--    - recepcija@hotel.com (lozinka: demo123, meta: {"full_name":"Ana Recepcija","role":"reception"})
--    - sobarica@hotel.com (lozinka: demo123, meta: {"full_name":"Maja Sobarica","role":"housekeeping"})
-- 3. Proverite da je Realtime uključen za tabele
-- 4. Podesite .env sa vašim Supabase URL i anon key

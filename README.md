<<<<<<< HEAD
# Hotel-Minibar
=======
# 🍾 Hotel Minibar Management System

Produkcijska PWA aplikacija za upravljanje minibarom u hotelima. Omogućava komunikaciju između recepcije i sobarica za praćenje konzumacije i naplate minibar artikala.

---

## 📋 Sadržaj

- [Pregled](#pregled)
- [Tehnologije](#tehnologije)
- [Struktura projekta](#struktura-projekta)
- [Brzi start](#brzi-start)
- [Supabase setup](#supabase-setup)
- [Environment varijable](#environment-varijable)
- [Korisničke uloge](#korisničke-uloge)
- [Tok rada](#tok-rada)
- [Vercel deployment](#vercel-deployment)
- [PWA instalacija](#pwa-instalacija)

---

## Pregled

Aplikacija rešava sledeći hotelski proces:

```
Gost se odjavljuje → Recepcija označava sobu → 
Sobarica proverava minibar → Recepcija vidi konzumaciju → 
Naplata gosta → Završeno
```

### Uloge

| Uloga | Opis |
|-------|------|
| **Admin** | Pun pristup: sobe, artikli, cene, inventar, korisnici, audit log |
| **Recepcija** | Dashboard, status soba, naplata, pokretanje odjave |
| **Sobarica** | Mobile-first pregled soba, evidencija konzumacije, oflajn podrška |

---

## Tehnologije

- **Frontend**: React 18 + TypeScript + Vite
- **Stilizovanje**: TailwindCSS 3 (dark mode)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + RLS)
- **PWA**: vite-plugin-pwa + Workbox
- **Routing**: React Router v6
- **Notifikacije**: react-hot-toast
- **Datumi**: date-fns
- **Ikone**: lucide-react
- **Deployment**: Vercel

---

## Struktura projekta

```
hotel-minibar/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── InventoryManager.tsx    # Upravljanje inventarom po sobi
│   │   │   └── UserManager.tsx         # Upravljanje korisnicima
│   │   └── shared/
│   │       ├── ConfirmDialog.tsx        # Dijalog potvrde
│   │       ├── Layout.tsx              # Glavni layout sa navigacijom
│   │       ├── LoadingScreen.tsx       # Ekran učitavanja
│   │       ├── Modal.tsx               # Reusable modal
│   │       ├── OfflineSyncBanner.tsx   # Banner za oflajn sinhronizaciju
│   │       ├── PWAInstallPrompt.tsx    # PWA install prompt
│   │       └── StatusBadge.tsx         # Status oznaka sobe
│   ├── context/
│   │   └── AuthContext.tsx             # Autentifikacija context
│   ├── hooks/
│   │   ├── useDashboardStats.ts        # Dashboard statistike (real-time)
│   │   ├── useMinibarItems.ts          # Minibar artikli hook
│   │   ├── useOnlineStatus.ts          # Online/oflajn status
│   │   ├── useRoomInventory.ts         # Inventar sobe hook
│   │   └── useRooms.ts                 # Sobe hook (real-time)
│   ├── lib/
│   │   ├── database.types.ts           # Supabase TypeScript tipovi
│   │   ├── offline.ts                  # Oflajn keš i akcije
│   │   └── supabase.ts                 # Supabase klijent
│   ├── pages/
│   │   ├── AdminPage.tsx               # Admin panel (sobe, artikli, inv, korisnici)
│   │   ├── AuditPage.tsx               # Audit log stranica
│   │   ├── CheckoutPage.tsx            # Naplata minibar
│   │   ├── DashboardPage.tsx           # Glavna kontrolna tabla
│   │   ├── HousekeepingPage.tsx        # Sobarice - pregled i evidencija
│   │   ├── LoginPage.tsx               # Prijava
│   │   ├── ReceptionPage.tsx           # Recepcija dashboard
│   │   ├── RoomDetailPage.tsx          # Detalji sobe (inventar, napomene, istorija)
│   │   └── RoomsPage.tsx               # Lista soba
│   ├── types/
│   │   └── index.ts                    # TypeScript interfejsi
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── supabase/
│   └── schema.sql                      # Kompletan SQL schema + seed data
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

---

## Brzi start

### Preduslovi

- Node.js 18+
- npm ili yarn
- Supabase nalog (besplatan na supabase.com)

### Instalacija

```bash
# 1. Klonirajte projekat
git clone <repo-url>
cd hotel-minibar

# 2. Instalirajte zavisnosti
npm install

# 3. Podesite environment varijable
cp .env.example .env
# Uredite .env sa vašim Supabase kredencijalima

# 4. Pokrenite razvojni server
npm run dev
```

---

## Supabase setup

### Korak 1: Kreirajte Supabase projekat

1. Idite na [supabase.com](https://supabase.com) i kreirajte novi projekat
2. Zapamtite **Project URL** i **anon public key**

### Korak 2: Pokrenite SQL shemu

1. U Supabase dashboard-u idite na **SQL Editor**
2. Kopirajte sadržaj fajla `supabase/schema.sql`
3. Nalepite i pokrenite SQL

### Korak 3: Kreirajte demo korisnike

U Supabase dashboard-u → **Authentication** → **Users** → **Add user**:

| Email | Lozinka | Metadata (full_name / role) |
|-------|---------|----------------------------|
| admin@hotel.com | demo123 | `{"full_name":"Admin Hotela","role":"admin"}` |
| recepcija@hotel.com | demo123 | `{"full_name":"Ana Jovanović","role":"reception"}` |
| sobarica@hotel.com | demo123 | `{"full_name":"Maja Petrović","role":"housekeeping"}` |

### Korak 4: Uključite Realtime

U Supabase → **Database** → **Replication** → dodajte tabele:
- `rooms`
- `room_inventory`
- `consumption_logs`
- `room_status_logs`
- `room_notes`

---

## Environment varijable

Kreirajte `.env` fajl u root direktorijumu:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Ove vrednosti možete pronaći u Supabase dashboard-u → **Settings** → **API**.

---

## Korisničke uloge

### 👑 Admin

- Upravljanje sobama (dodaj/uredi/obriši)
- Upravljanje minibar artiklima i cenama
- Podešavanje podrazumevanog inventara po sobi
- Upravljanje korisnicima (dodaj/promeni ulogu)
- Pregled audit loga svih promena
- Pristup svim funkcijama recepcije i sobarica

### 🏨 Recepcija

- Real-time dashboard sa statusima soba
- Pokretanje procesa odjave gosta
- Pregled konzumacije pre naplate
- Automatski izračun minibar naknade
- Završavanje naplate (označava sobu kao završenu)

### 🧹 Sobarice

- Mobile-first lista soba za pregled
- Evidencija konzumiranih artikala po sobi
- Označavanje nedostajućih artikala
- Dodavanje napomena
- Dugme "Soba pregledana" koje menja status
- **Oflajn podrška** — radi bez interneta, sinhronizuje kada se veza uspostavi

---

## Tok rada

```
1. GOST SE ODJAVLJUJE
   └─► Recepcija klikne "Odjava" → status: waiting_inspection

2. SOBARICA PROVERAVA
   └─► Sobarica otvara sobu na mobilnom → unosi konzumaciju
   └─► Klikne "Soba pregledana" → status: inspected

3. RECEPCIJA NAPLAĆUJE
   └─► Recepcija vidi sobu sa iznosima → klikne "Naplata"
   └─► Pregled računa sa svim artiklima i ukupnim iznosom
   └─► Potvrdi → status: completed

4. RESET
   └─► Admin može podesiti sobu na "Slobodna" za novog gosta
```

---

## Vercel deployment

### Automatski (preporučeno)

1. Push kod na GitHub
2. Idite na [vercel.com](https://vercel.com) → New Project
3. Uvezite GitHub repozitorijum
4. Dodajte environment varijable:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Kliknite Deploy

### Ručno

```bash
# Instalirajte Vercel CLI
npm i -g vercel

# Build
npm run build

# Deploy
vercel --prod
```

### Build komande (automatski preuzeto iz vercel.json)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

---

## PWA instalacija

### Android (Chrome/Samsung Browser)

1. Otvorite aplikaciju u pretraživaču
2. Pojaviće se banner "Instalirajte aplikaciju"
3. Kliknite **Instaliraj** ili ☰ Menu → **Dodaj na početni ekran**

### iOS (Safari)

1. Otvorite aplikaciju u Safari
2. Kliknite ikonu **Deli** (kvadrat sa strelicom gore)
3. Izaberite **Dodaj na početni ekran**
4. Potvrdite

### Desktop (Chrome/Edge)

1. Kliknite ikonu ⬇️ u adresnoj traci
2. Kliknite **Instaliraj**

---

## Oflajn podrška

Aplikacija podržava rad bez interneta:

- Podatci o sobama i artiklima se kešuju lokalno
- Sobarice mogu evidencijom konzumacije čak i bez interneta
- Kada se veza uspostavi, akcije se automatski sinhronizuju
- Indikator u navigaciji pokazuje broj čekajućih akcija

---

## Baza podataka — ER dijagram

```
profiles (korisnici)
    │
    ├── rooms (sobe)
    │       ├── room_inventory (inventar po sobi)
    │       │       └── minibar_items (artikli)
    │       ├── consumption_logs (konzumacija)
    │       ├── refill_logs (punjenje)
    │       ├── room_status_logs (promene statusa)
    │       └── room_notes (napomene)
    │
    └── audit_logs (audit trail)
```

---

## Troubleshooting

### "Nedostaju Supabase kredencijali"
→ Proverite `.env` fajl i restartujte dev server

### Korisnik ne može da se prijavi
→ Proverite da su profili kreirani (triger `handle_new_user` mora biti aktivan)

### Real-time ne radi
→ Proverite Replication settings u Supabase dashboard-u

### PWA se ne može instalirati
→ Aplikacija mora biti servirana sa HTTPS (Vercel to automatski obezbeđuje)

---

## Licenca

MIT — slobodni ste da koristite i prilagodite za vaš hotel.
>>>>>>> ea2194a (Initial commit)

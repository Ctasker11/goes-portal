# GOES Portal

Plataforma segura de gestión de documentos y seguimiento de aplicaciones para becas académicas y deportivas en universidades de EE.UU.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (Auth + Postgres + Storage)

---

## Setup local (10 min)

### 1. Crear proyecto Supabase gratis

1. Ir a [supabase.com](https://supabase.com) → "Start your project" → sign up con email
2. New project:
   - Name: `goes-portal`
   - Region: `West EU (Ireland)` o `Central EU (Frankfurt)`
   - Database password: guarda en sitio seguro
3. Esperar ~2 min a que arranque

### 2. Cargar schema

1. En Supabase dashboard → **SQL Editor** → "New query"
2. Copiar contenido de `supabase/migrations/0001_initial_schema.sql`
3. Run

### 3. Crear bucket de storage

1. **Storage** → "New bucket"
2. Name: `documents`, **Public: OFF**
3. SQL Editor → ejecutar las policies comentadas al final del archivo de migración

### 4. Configurar variables de entorno

1. Supabase dashboard → **Settings** → **API**
2. Copiar `Project URL` y `anon public key`
3. Editar `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### 5. Arrancar dev server

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Crear primer usuario interno (advisor)

Por defecto todo signup crea un `student`. Para promover a advisor:

1. Crear cuenta normal en `/signup`
2. Confirmar email
3. Supabase dashboard → **Table Editor** → `profiles` → editar tu fila → cambiar `role` a `advisor`

---

## Estructura

```
src/
  app/
    (auth)/         login + signup
    (app)/          rutas protegidas: dashboard (estudiante), admin (interno)
    page.tsx        landing pública
  components/       Logo, SignOutButton
  lib/supabase/     clients (browser + server)
  proxy.ts          refresh de sesión auth
supabase/
  migrations/       SQL schema + RLS policies
public/             assets estáticos
assets/             material original (PRD, pitch deck)
```

---

## Roadmap MVP pendiente

- [ ] Página `/admin/[familyId]` para revisión por estudiante
- [ ] Upload real de archivos (drag & drop + Supabase Storage)
- [ ] Cambio de status manual desde panel interno
- [ ] Hilo de comentarios por documento
- [ ] Notificaciones por email (Supabase Auth + Resend)
- [ ] Realtime: status visible al estudiante al instante
- [ ] Onboarding del estudiante (formulario inicial → asigna `family`)
- [ ] Reemplazar SVG inline del logo por archivo oficial en `/public/`

## Despliegue

- **Demo local:** `npm run dev` + ngrok para mostrar a clientes sin pagar
- **Producción:** Vercel (gratis hasta cierto tráfico) → DNS CNAME desde Hostinger: `portal.goeseducation.com`

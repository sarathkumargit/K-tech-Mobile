# K-Tech — mobile phone shop

A full e-commerce site: products, offers, cart, orders and an admin panel.
All data lives in **Supabase** — nothing about products, offers or users is
hard-coded in the frontend.

```
React (TanStack Start)  →  Supabase Auth  →  Supabase Postgres (+ Row Level Security)  →  Supabase Storage
```

## Run it

1. Set up Supabase once — follow **SUPABASE_SETUP.md** (runs `supabase/schema.sql`,
   turns on email + Google sign-in, makes you admin).
2. Create `.env.local` next to `package.json`:

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```

3. `npm install`, then `npm run dev` and open http://localhost:8080

## Where things are

| Path                       | What                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `supabase/schema.sql`      | Tables, security rules (RLS), storage buckets, `place_order()` etc.                                      |
| `supabase/tests/`          | Security tests for the schema (local Postgres only)                                                      |
| `src/lib/supabase.ts`      | The single Supabase client (anon key only)                                                               |
| `src/types/database.ts`    | TypeScript types for the tables                                                                          |
| `src/services/*Service.ts` | All database access: auth, products, categories, offers, cart, orders, users, storage, settings, repairs |
| `src/hooks/`               | React Query hooks (cart, site settings, order statuses)                                                  |
| `src/lib/auth-context.tsx` | Session, profile and admin flag                                                                          |
| `src/routes/`              | Pages (file-based routing). `admin.*` = admin panel                                                      |
| `src/components/admin/`    | Admin forms and UI pieces                                                                                |

Pages call services; services call Supabase. Admin checks use the database
function `is_admin()` (the `admin_users` table), never an email address, and
Row Level Security enforces every permission even if the frontend is bypassed.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — ESLint

Built with TanStack Start, React, TypeScript, Tailwind CSS, TanStack Query and Supabase.

# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## How this folder is organised

Pages are grouped by area. A folder name in `(brackets)` is a **route group**:
it only organises files and is **not** part of the URL.

```
routes/
├── __root.tsx              app shell: header, footer, mobile nav (every page)
├── index.tsx               /                     home
├── (site)/                 information pages
│   ├── about.tsx           /about
│   └── contact.tsx         /contact
├── (store)/                shopping
│   ├── shop.tsx            /shop
│   ├── product/$slug.tsx   /product/:slug
│   ├── cart.tsx            /cart
│   └── checkout.tsx        /checkout
├── (account)/              customer sign-in and profile
│   ├── login.tsx           /login
│   ├── signup.tsx          /signup
│   ├── reset-password.tsx  /reset-password
│   ├── account.tsx         /account
│   └── auth/callback.tsx   /auth/callback        (Google / email links land here)
└── admin/                  admin panel (admins only)
    ├── route.tsx           /admin layout: side menu + admin check
    ├── index.tsx           /admin                dashboard
    ├── categories.tsx      /admin/categories
    ├── offers.tsx          /admin/offers
    ├── repairs.tsx         /admin/repairs
    ├── lend.tsx            /admin/lend           lend book
    ├── settings.tsx        /admin/settings
    ├── products/           index · create · edit/$id
    ├── orders/             index · $id
    └── users/              index · $id
```

To add an admin page: create `admin/<name>.tsx`, then add it to `NAV` in
`admin/route.tsx`. To add a shop page: put it in `(store)/`.

## Conventions

| File         | URL                                                        |
| ------------ | ---------------------------------------------------------- |
| `index.tsx`  | the folder's own URL (`admin/index.tsx` → `/admin`)        |
| `route.tsx`  | layout for everything in the folder (renders `<Outlet />`) |
| `$id.tsx`    | dynamic segment, read with `Route.useParams()`             |
| `(group)/`   | organises files only; not in the URL                       |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />`        |

`routeTree.gen.ts` is auto-generated when you run `npm run dev` or
`npm run build`. Don't edit it by hand.

Shared pieces live in `src/components/` (by area: `layout`, `product`,
`order`, `repair`, `auth`, `admin`, `common`; `ui` is the shadcn library).
Database calls live in `src/services/`.

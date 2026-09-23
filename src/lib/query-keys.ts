// One place for react-query cache keys, so invalidation stays consistent.
import type { ProductFilters } from "@/services/productService";

export const qk = {
  settings: ["site-settings"] as const,
  categories: ["categories"] as const,
  products: (filters: ProductFilters = {}) => ["products", "list", filters] as const,
  featured: ["products", "featured"] as const,
  offers: ["products", "offers"] as const,
  product: (slug: string) => ["products", "detail", slug] as const,
  related: (id: string) => ["products", "related", id] as const,
  cart: (userId: string | null) => ["cart", userId] as const,
  myOrders: (userId: string | null) => ["orders", "mine", userId] as const,
  order: (id: string) => ["orders", "detail", id] as const,
  orderStatuses: ["order-statuses"] as const,
  profile: (userId: string | null) => ["profile", userId] as const,
  isAdmin: (userId: string | null) => ["is-admin", userId] as const,
  admin: {
    all: ["admin"] as const,
    stats: ["admin", "stats"] as const,
    products: (search: string) => ["admin", "products", search] as const,
    product: (id: string) => ["admin", "product", id] as const,
    categories: ["admin", "categories"] as const,
    offers: ["admin", "offers"] as const,
    orders: (status: string) => ["admin", "orders", status] as const,
    order: (id: string) => ["admin", "order", id] as const,
    users: ["admin", "users"] as const,
    user: (id: string) => ["admin", "user", id] as const,
    userOrders: (id: string) => ["admin", "user-orders", id] as const,
    repairs: ["admin", "repairs"] as const,
  },
};

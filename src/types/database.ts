// TypeScript types for the Supabase schema in supabase/schema.sql.
// Keep this in sync when you change the SQL.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Spec = { label: string; value: string };
export type DiscountType = "percentage" | "fixed";
export type RepairStatus = "new" | "contacted" | "in_progress" | "completed" | "cancelled";

export type ShippingAddress = {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code?: string;
};

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
} & Timestamps;

export type AdminUserRow = { id: string; user_id: string; created_at: string };

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
} & Timestamps;

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string;
  price: number;
  compare_price: number | null;
  stock_quantity: number;
  category_id: string | null;
  image_url: string | null;
  brand: string | null;
  sku: string | null;
  condition: string | null;
  specifications: Spec[];
  features: string[];
  is_featured: boolean;
  is_active: boolean;
  created_by: string | null;
  search_vector: unknown;
} & Timestamps;

export type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  storage_path: string | null;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

export type OfferRow = {
  id: string;
  product_id: string;
  title: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by: string | null;
} & Timestamps;

export type ProductCatalogRow = Omit<ProductRow, "created_by"> & {
  category_name: string | null;
  category_slug: string | null;
  offer_id: string | null;
  offer_title: string | null;
  offer_discount_type: DiscountType | null;
  offer_discount_value: number | null;
  offer_start_date: string | null;
  offer_end_date: string | null;
  final_price: number;
};

export type CartRow = { id: string; user_id: string } & Timestamps;

export type CartItemRow = {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
} & Timestamps;

export type OrderStatusRow = {
  code: string;
  label: string;
  sort_order: number;
  is_final: boolean;
};

export type OrderRow = {
  id: string;
  order_number: number;
  user_id: string | null;
  status: string;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  shipping_address: ShippingAddress;
  customer_email: string | null;
  notes: string | null;
} & Timestamps;

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  image_url: string | null;
  original_unit_price: number;
  unit_price: number;
  offer_id: string | null;
  quantity: number;
  subtotal: number;
};

export type RepairRequestRow = {
  id: string;
  user_id: string | null;
  customer_name: string;
  phone_number: string;
  phone_brand: string;
  phone_model: string;
  issue: string;
  message: string | null;
  status: RepairStatus;
} & Timestamps;

export type SiteSettingsRow = {
  id: string;
  shop_name: string;
  whatsapp_number: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  shipping_fee: number;
  free_shipping_threshold: number;
  updated_at: string;
};

export type DashboardStats = {
  total_products: number;
  active_products: number;
  low_stock: number;
  total_users: number;
  active_offers: number;
  total_orders: number;
  pending_orders: number;
  revenue: number;
  new_repairs: number;
};

// Helper: a table definition in the shape supabase-js expects.
type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: {
    foreignKeyName: string;
    columns: string[];
    isOneToOne?: boolean;
    referencedRelation: string;
    referencedColumns: string[];
  }[];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
        },
        { full_name?: string | null; avatar_url?: string | null; phone?: string | null }
      >;
      admin_users: Table<AdminUserRow, { user_id: string }>;
      categories: Table<
        CategoryRow,
        {
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
        }
      >;
      products: Table<
        ProductRow,
        {
          name: string;
          slug: string;
          price: number;
          short_description?: string | null;
          description?: string;
          compare_price?: number | null;
          stock_quantity?: number;
          category_id?: string | null;
          brand?: string | null;
          sku?: string | null;
          condition?: string | null;
          specifications?: Spec[];
          features?: string[];
          is_featured?: boolean;
          is_active?: boolean;
        }
      >;
      product_images: Table<
        ProductImageRow,
        {
          product_id: string;
          image_url: string;
          storage_path?: string | null;
          alt_text?: string | null;
          sort_order?: number;
        }
      >;
      offers: Table<
        OfferRow,
        {
          product_id: string;
          title: string;
          description?: string | null;
          discount_type: DiscountType;
          discount_value: number;
          start_date?: string;
          end_date: string;
          is_active?: boolean;
        }
      >;
      carts: Table<CartRow, { user_id?: string }>;
      cart_items: Table<
        CartItemRow,
        { cart_id: string; product_id: string; quantity: number },
        { quantity?: number }
      >;
      order_statuses: Table<OrderStatusRow, OrderStatusRow>;
      orders: Table<
        OrderRow,
        never,
        { status?: string; notes?: string | null; shipping_address?: ShippingAddress }
      >;
      order_items: Table<OrderItemRow, never, never>;
      repair_requests: Table<
        RepairRequestRow,
        {
          customer_name: string;
          phone_number: string;
          phone_brand: string;
          phone_model: string;
          issue: string;
          message?: string | null;
          user_id?: string | null;
        },
        { status?: RepairStatus }
      >;
      site_settings: Table<
        SiteSettingsRow,
        never,
        Partial<Omit<SiteSettingsRow, "id" | "updated_at">>
      >;
    };
    Views: {
      product_catalog: {
        Row: ProductCatalogRow;
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      add_to_cart: {
        Args: { p_product_id: string; p_quantity?: number };
        Returns: CartItemRow;
      };
      place_order: {
        Args: { p_shipping_address: ShippingAddress; p_notes?: string | null };
        Returns: string;
      };
      cancel_my_order: { Args: { p_order_id: string }; Returns: undefined };
      admin_dashboard_stats: { Args: Record<string, never>; Returns: DashboardStats };
      apply_discount: {
        Args: { p_price: number; p_discount_type: string; p_discount_value: number };
        Returns: number;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  document: string | null;
  address: Address;
  timezone: string;
  currency: string;
  is_open: boolean;
  auto_accept: boolean;
  min_order: number;
  avg_prep_time: number;
  status: "active" | "suspended" | "trial" | "cancelled";
  trial_ends_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
}

export interface User {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_superadmin: boolean;
}

export interface RestaurantUser {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: "owner" | "manager" | "operator" | "viewer";
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  prep_time: number | null;
  serves: number;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  option_groups?: OptionGroup[];
}

export interface OptionGroup {
  id: string;
  restaurant_id: string;
  product_id: string;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  sort_order: number;
  options?: Option[];
}

export interface Option {
  id: string;
  restaurant_id: string;
  option_group_id: string;
  name: string;
  price: number;
  is_active: boolean;
  sort_order: number;
}

export interface Customer {
  id: string;
  restaurant_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  segment: "novato" | "candidato" | "promissor" | "fidelizado" | "inativo" | "perdido";
  source: "organic" | "ifood" | "99food" | "whatsapp" | "ads" | "import";
  consent_marketing: boolean;
  total_orders: number;
  total_spent: number;
  tags: string[];
}

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "dispatched" | "delivered" | "cancelled";

export interface Order {
  id: string;
  restaurant_id: string;
  customer_id: string | null;
  order_number: number;
  channel: "cardapio" | "whatsapp" | "ifood" | "99food";
  status: OrderStatus;
  payment_method: string | null;
  payment_status: "pending" | "paid" | "refunded" | "failed";
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  delivery_address: Address | null;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  coupon_code: string | null;
  scheduled_for: string | null;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: { group_name: string; option_name: string; price: number }[];
  notes: string | null;
}

export interface DeliveryZone {
  id: string;
  restaurant_id: string;
  name: string;
  type: "radius" | "zip_list";
  radius_km: number | null;
  zip_codes: string[];
  fee: number;
  min_order: number;
  estimated_min: number;
  is_active: boolean;
  sort_order: number;
}

export interface OperatingHour {
  id: string;
  restaurant_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_active: boolean;
}

export interface PaymentConfig {
  id: string;
  restaurant_id: string;
  gateway: "mercadopago" | "asaas" | "stripe" | "pagseguro" | "manual";
  accepts_pix: boolean;
  accepts_card: boolean;
  accepts_cash: boolean;
  accepts_card_delivery: boolean;
  is_active: boolean;
}

export interface WhatsAppInstance {
  id: string;
  restaurant_id: string;
  provider: "uazapi" | "meta_cloud";
  phone_number: string | null;
  status: "connected" | "disconnected" | "connecting" | "banned";
  agent_name: string;
  agent_persona: string;
  agent_enabled: boolean;
}

export interface Feedback {
  id: string;
  restaurant_id: string;
  order_id: string | null;
  customer_id: string | null;
  rating: number;
  comment: string | null;
  pillars: Record<string, number>;
  created_at: string;
}

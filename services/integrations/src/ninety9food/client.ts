import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const API_99 = "https://api-food.99app.com";

interface Creds { app_id: string; app_secret: string; access_token: string; shop_id: string; }

async function api(c: Creds, path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_99}${path}`, {
    ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.access_token}`, ...opts.headers },
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "99Food API request failed");
  return data;
}

export const ninety9food = {
  getOrders: (c: Creds) => api(c, `/v1/shops/${c.shop_id}/orders`),
  getOrder: (c: Creds, id: string) => api(c, `/v1/shops/${c.shop_id}/orders/${id}`),
  confirmOrder: (c: Creds, id: string) => api(c, `/v1/shops/${c.shop_id}/orders/${id}/confirm`, { method: "POST" }),
  cancelOrder: (c: Creds, id: string) => api(c, `/v1/shops/${c.shop_id}/orders/${id}/cancel`, { method: "POST" }),
  getCatalog: (c: Creds) => api(c, `/v1/shops/${c.shop_id}/menu`),
};

export async function import99FoodOrder(restaurantId: string, o: any) {
  const phone = o.customer?.phone?.replace(/\D/g, "") || "";
  let { data: cust } = await supabase.from("customers").select("id").eq("restaurant_id", restaurantId).eq("phone", phone).maybeSingle();
  if (!cust && phone) { const { data } = await supabase.from("customers").insert({ restaurant_id: restaurantId, name: o.customer?.name, phone, source: "99food" }).select("id").single(); cust = data; }

  const { data: order, error } = await supabase.from("orders").insert({
    restaurant_id: restaurantId, customer_id: cust?.id, channel: "99food", status: "confirmed",
    payment_status: "paid", subtotal: o.subtotal ?? 0, delivery_fee: o.delivery_fee ?? 0,
    total: o.total ?? 0, customer_name: o.customer?.name, customer_phone: phone, external_id: o.id,
  }).select("id, order_number").single();

  if (error) return { success: false, error: error.message };

  const items = (o.items ?? []).map((i: any) => ({
    order_id: order!.id, restaurant_id: restaurantId, product_name: i.name,
    quantity: i.quantity ?? 1, unit_price: i.unit_price ?? 0, total_price: i.total_price ?? 0, options: [],
  }));
  if (items.length) await supabase.from("order_items").insert(items);
  return { success: true, orderNumber: order!.order_number };
}

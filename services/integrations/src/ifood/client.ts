import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const IFOOD_API = "https://merchant-api.ifood.com.br";

interface Creds { client_id: string; client_secret: string; merchant_id: string; }
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getToken(c: Creds): Promise<string> {
  const cached = tokenCache.get(c.client_id);
  if (cached && cached.expiresAt > Date.now() + 60000) return cached.token;

  const res = await fetch(`${IFOOD_API}/authentication/v1.0/oauth/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grantType: "client_credentials", clientId: c.client_id, clientSecret: c.client_secret }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`iFood auth: ${d.message}`);
  tokenCache.set(c.client_id, { token: d.accessToken, expiresAt: Date.now() + (d.expiresIn - 120) * 1000 });
  return d.accessToken;
}

async function api(c: Creds, path: string, opts: RequestInit = {}) {
  const token = await getToken(c);
  const res = await fetch(`${IFOOD_API}${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...opts.headers } });
  if (res.status === 204) return null;
  return res.json();
}

export const ifood = {
  pollEvents: (c: Creds) => api(c, "/order/v1.0/events:polling", { headers: { "x-polling-merchants": c.merchant_id } }),
  ackEvents: (c: Creds, ids: string[]) => api(c, "/order/v1.0/events/acknowledgment", { method: "POST", body: JSON.stringify(ids.map(id => ({ id }))) }),
  getOrder: (c: Creds, id: string) => api(c, `/order/v1.0/orders/${id}`),
  confirmOrder: (c: Creds, id: string) => api(c, `/order/v1.0/orders/${id}/confirm`, { method: "POST" }),
  dispatchOrder: (c: Creds, id: string) => api(c, `/order/v1.0/orders/${id}/dispatch`, { method: "POST" }),
  cancelOrder: (c: Creds, id: string, reason: string) => api(c, `/order/v1.0/orders/${id}/requestCancellation`, { method: "POST", body: JSON.stringify({ reason, cancellationCode: "501" }) }),
  getCatalog: (c: Creds) => api(c, `/catalog/v2.0/merchants/${c.merchant_id}/sellableItems`),
  getMerchant: (c: Creds) => api(c, `/merchant/v1.0/merchants/${c.merchant_id}/status`),
};

export async function importIFoodOrder(restaurantId: string, o: any) {
  const phone = o.customer?.phone?.number?.replace(/\D/g, "") || "";
  let { data: cust } = await supabase.from("customers").select("id").eq("restaurant_id", restaurantId).eq("phone", phone).maybeSingle();
  if (!cust && phone) { const { data } = await supabase.from("customers").insert({ restaurant_id: restaurantId, name: o.customer?.name, phone, source: "ifood" }).select("id").single(); cust = data; }

  const { data: order, error } = await supabase.from("orders").insert({
    restaurant_id: restaurantId, customer_id: cust?.id, channel: "ifood", status: "confirmed",
    payment_status: "paid", subtotal: o.total?.subTotal ?? 0, delivery_fee: o.total?.deliveryFee ?? 0,
    discount: o.total?.benefits ?? 0, total: o.total?.orderAmount ?? 0, customer_name: o.customer?.name,
    customer_phone: phone, external_id: o.id, delivery_address: o.delivery?.deliveryAddress,
  }).select("id, order_number").single();

  if (error) return { success: false, error: error.message };

  const items = (o.items ?? []).map((i: any) => ({
    order_id: order!.id, restaurant_id: restaurantId, product_name: i.name,
    quantity: i.quantity ?? 1, unit_price: i.unitPrice ?? 0, total_price: i.totalPrice ?? 0,
    options: (i.options ?? []).map((op: any) => ({ group_name: op.groupName || "", option_name: op.name, price: op.price ?? 0 })),
  }));
  if (items.length) await supabase.from("order_items").insert(items);
  if (cust?.id) await supabase.rpc("increment_customer_stats", { p_customer_id: cust.id, p_total: o.total?.orderAmount ?? 0 }).catch(() => {});
  return { success: true, orderNumber: order!.order_number };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// NÍVEL B: o cliente envia apenas o order_id. O valor é derivado do pedido no
// servidor; nenhum valor financeiro trafega a partir do browser.
export async function requestPixPayment(orderId: string): Promise<{
  pixCode?: string;
  pixQrBase64?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/api/payments/pix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId }),
    });
    return res.json();
  } catch (err: any) {
    return { error: err.message };
  }
}

export interface CreateOrderPayload {
  restaurant_slug: string;
  customer_name: string;
  customer_phone: string;
  delivery_address?: Record<string, unknown> | null;
  zone_id?: string | null;
  payment_method: string;
  notes?: string | null;
  scheduled_for?: string | null;
  coupon_code?: string | null;
  redeem_amount?: number | null;
  items: {
    product_id: string;
    quantity: number;
    options: { group_name: string; option_name: string }[];
    notes?: string | null;
  }[];
}

// Cria o pedido no servidor (preços/total recomputados a partir do banco).
export async function createOrder(payload: CreateOrderPayload): Promise<{
  id?: string;
  order_number?: number;
  total?: number;
  error?: any;
}> {
  const res = await fetch(`${API_URL}/api/public/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || "Erro ao criar pedido" };
  return data;
}

// Consulta o saldo de cashback do cliente (por telefone) para oferecer resgate no checkout.
export async function getLoyaltyBalance(restaurant_slug: string, phone: string): Promise<{
  enabled: boolean;
  balance: number;
  min_redeem?: number;
}> {
  try {
    const res = await fetch(`${API_URL}/api/public/loyalty/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurant_slug, phone }),
    });
    if (!res.ok) return { enabled: false, balance: 0 };
    return res.json();
  } catch {
    return { enabled: false, balance: 0 };
  }
}

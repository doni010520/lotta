import { SupabaseClient } from "@supabase/supabase-js";
import { wa } from "@lotta/shared";

const STATUS_MESSAGES: Record<string, string> = {
  confirmed: "✅ Seu pedido #{num} foi confirmado! Estamos preparando.",
  preparing: "👨‍🍳 Seu pedido #{num} está sendo preparado!",
  ready: "📦 Seu pedido #{num} está pronto! Saindo pra entrega em breve.",
  dispatched: "🛵 Seu pedido #{num} saiu pra entrega! Fique de olho!",
  delivered: "🎉 Seu pedido #{num} foi entregue! Bom apetite!",
  cancelled: "❌ Seu pedido #{num} foi cancelado. Desculpe pelo inconveniente.",
};

export async function onOrderStatusChange(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string,
  newStatus: string,
) {
  const { data: order } = await supabase
    .from("orders")
    .select("order_number, customer_phone, customer_id, total, channel")
    .eq("id", orderId)
    .single();

  if (!order?.customer_phone) return;

  // Send WhatsApp notification
  const template = STATUS_MESSAGES[newStatus];
  if (template) {
    const message = template.replace("#{num}", String(order.order_number));
    await wa.sendText(restaurantId, order.customer_phone, message).catch((err: any) => {
      console.error("Status notification failed:", err.message);
    });
  }

  // On delivered: credit loyalty + request feedback
  if (newStatus === "delivered" && order.customer_id) {
    // Credit loyalty
    await supabase.rpc("credit_loyalty", {
      p_restaurant_id: restaurantId,
      p_customer_id: order.customer_id,
      p_order_id: orderId,
      p_order_total: order.total,
    }).catch(() => {});

    // Get loyalty program type for notification
    const { data: program } = await supabase
      .from("loyalty_programs")
      .select("type, points_per_real, cashback_pct, is_active")
      .eq("restaurant_id", restaurantId)
      .single();

    if (program?.is_active) {
      const credit = program.type === "points"
        ? Math.floor(order.total * program.points_per_real)
        : Math.round(order.total * program.cashback_pct / 100 * 100) / 100;

      if (credit > 0) {
        const { notifyLoyaltyCredit } = await import("../../workers/src/loyalty-notify").catch(() => ({ notifyLoyaltyCredit: null }));
        // Fallback: send directly if import fails (different service)
        const unit = program.type === "points" ? `${credit} pontos` : `R$ ${credit.toFixed(2)}`;
        await wa.sendText(restaurantId, order.customer_phone,
          `🎉 Você ganhou ${unit} com esse pedido! Continue pedindo!`
        ).catch(() => {});
      }
    }

    // Request feedback after 30min via BullMQ delayed job
    try {
      const IORedis = (await import('ioredis')).default;
      const { Queue } = await import('bullmq');
      const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
      const feedbackQueue = new Queue('feedback-requests', { connection: redis });
      await feedbackQueue.add('request-feedback', {
        restaurantId, phone: order.customer_phone, orderNumber: order.order_number,
      }, { delay: 30 * 60 * 1000 }); // 30 minutes
      await redis.quit();
    } catch (err) {
      console.error('Failed to queue feedback request:', err);
    }
  }
}

// Called after order is created (checkout or WhatsApp)
export async function onOrderCreated(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string,
) {
  const { data: order } = await supabase
    .from("orders")
    .select("customer_phone, total, order_number")
    .eq("id", orderId)
    .single();

  if (!order) return;

  // Send CAPI purchase event to Meta (if configured)
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("metadata")
    .eq("id", restaurantId)
    .single();

  const metaCreds = (restaurant?.metadata as any)?.meta_ads_creds;
  if (metaCreds?.pixel_id && metaCreds?.access_token) {
    const ADS_URL = process.env.ADS_INTERNAL_URL || "http://lotta_lotta-ads:3006";
    await fetch(`${ADS_URL}/api/capi/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_API_SECRET || "" },
      body: JSON.stringify({ restaurant_id: restaurantId, phone: order.customer_phone, value: order.total, order_id: orderId }),
    }).catch((err) => console.error("CAPI event failed:", err.message));
  }
}

import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";

export async function dispatchRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  // POST /api/orders/:id/dispatch — dispatch to logistics provider
  app.post("/:id/dispatch", async (request, reply) => {
    const { id } = request.params as any;

    const { data: order } = await request.supabase
      .from("orders")
      .select("*, items:order_items(product_name, quantity)")
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId)
      .single();

    if (!order) return reply.status(404).send({ error: "Pedido não encontrado" });

    const { data: restaurant } = await request.supabase
      .from("restaurants")
      .select("address, metadata")
      .eq("id", request.restaurantId)
      .single();

    const deliveryConfig = (restaurant?.metadata as any)?.delivery_provider;

    // Dynamic import to avoid bundling issues
    const { getDeliveryProvider } = await import("../../../integrations/src/delivery/providers");
    const provider = getDeliveryProvider(deliveryConfig || { provider: "self", credentials: {} });

    const result = await provider.dispatch({
      orderId: id,
      pickupAddress: restaurant?.address,
      deliveryAddress: order.delivery_address,
      items: (order.items ?? []).map((i: any) => ({ name: i.product_name, quantity: i.quantity })),
    });

    // Update order with tracking info
    await request.supabase.from("orders").update({
      status: "dispatched",
      metadata: { ...((order.metadata || {}) as any), tracking_url: result.trackingUrl, delivery_external_id: result.externalId },
    }).eq("id", id);

    // Notify customer
    const { wa } = await import("@lotta/shared");
    if (order.customer_phone && result.trackingUrl) {
      await wa.sendText(request.restaurantId!, order.customer_phone,
        `🛵 Seu pedido #${order.order_number} saiu pra entrega! Acompanhe: ${result.trackingUrl}`
      ).catch(() => {});
    }

    return { dispatched: true, trackingUrl: result.trackingUrl };
  });
}

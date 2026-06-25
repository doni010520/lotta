import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";
import { onOrderStatusChange, onOrderCreated } from "../modules/order-hooks";

export async function orderRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  // GET /api/orders — list orders
  app.get("/", async (request) => {
    const { status, channel, since } = request.query as any;
    let query = request.supabase.from("orders").select("*, items:order_items(*)").eq("restaurant_id", request.restaurantId).order("created_at", { ascending: false }).limit(100);
    if (status) query = query.eq("status", status);
    if (channel) query = query.eq("channel", channel);
    if (since) query = query.gte("created_at", since);
    const { data } = await query;
    return data ?? [];
  });

  // PATCH /api/orders/:id/status — advance status (triggers hooks)
  app.patch("/:id/status", async (request, reply) => {
    const { id } = request.params as any;
    const { status } = request.body as any;

    const { data: order, error } = await request.supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId)
      .select("id, status")
      .single();

    if (error) return reply.status(400).send({ error: error.message });

    // Log status history
    await request.supabase.from("order_status_history").insert({
      order_id: id, restaurant_id: request.restaurantId,
      to_status: status, changed_by: request.userId,
    });

    // Fire hooks (async, don't block response)
    onOrderStatusChange(request.supabaseAdmin, id, request.restaurantId!, status).catch((err) => {
      app.log.error({ err }, "Order hook failed");
    });

    return order;
  });

  // POST /api/orders — create order (used by checkout, triggers hooks)
  app.post("/", async (request, reply) => {
    const body = request.body as any;

    const { data: order, error } = await request.supabase
      .from("orders")
      .insert({ ...body, restaurant_id: request.restaurantId })
      .select("id, order_number")
      .single();

    if (error) return reply.status(400).send({ error: error.message });

    // Insert items if provided
    if (body.items?.length) {
      await request.supabase.from("order_items").insert(
        body.items.map((item: any) => ({ ...item, order_id: order.id, restaurant_id: request.restaurantId }))
      );
    }

    // Fire hooks
    onOrderCreated(request.supabaseAdmin, order.id, request.restaurantId!).catch((err) => {
      app.log.error({ err }, "Order creation hook failed");
    });

    return reply.status(201).send(order);
  });
}

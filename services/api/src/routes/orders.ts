import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";
import { onOrderStatusChange, onOrderCreated } from "../modules/order-hooks";
import { z } from "zod";

const createOrderSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  channel: z.enum(["cardapio", "whatsapp", "ifood", "99food"]).default("cardapio"),
  payment_method: z.enum(["pix", "credit_card", "debit_card", "cash", "card_on_delivery"]).optional().nullable(),
  delivery_address: z.record(z.unknown()).optional().nullable(),
  customer_name: z.string().max(200).optional().nullable(),
  customer_phone: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  coupon_code: z.string().max(50).optional().nullable(),
  scheduled_for: z.string().optional().nullable(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1),
    options: z.array(z.object({
      group_name: z.string(), option_name: z.string(), price: z.number().min(0),
    })).default([]),
    notes: z.string().max(500).optional().nullable(),
  })).min(1),
});

const statusSchema = z.object({
  status: z.enum(["pending", "confirmed", "preparing", "ready", "dispatched", "delivered", "cancelled"]),
});

export async function orderRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get("/", async (request) => {
    const { status, channel, since } = request.query as any;
    let query = request.supabase.from("orders").select("*, items:order_items(*)").eq("restaurant_id", request.restaurantId).order("created_at", { ascending: false }).limit(100);
    if (status) query = query.eq("status", status);
    if (channel) query = query.eq("channel", channel);
    if (since) query = query.gte("created_at", since);
    const { data, error } = await query;
    if (error) { app.log.error(error); return []; }
    return data ?? [];
  });

  // POST /api/orders — server-side price calculation (P0-1, P0-3)
  app.post("/", async (request, reply) => {
    const parsed = createOrderSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const input = parsed.data;
    const restaurantId = request.restaurantId!;

    // Recompute prices from DB (NEVER trust client)
    let subtotal = 0;
    const orderItems = [];

    for (const item of input.items) {
      const { data: product, error } = await request.supabaseAdmin
        .from("products")
        .select("id, name, price, promo_price, restaurant_id")
        .eq("id", item.product_id)
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .single();

      if (error || !product) return reply.status(400).send({ error: `Produto ${item.product_id} não encontrado ou inativo` });

      const unitPrice = product.promo_price ?? product.price;
      const optionsTotal = item.options.reduce((s, o) => s + o.price, 0);
      const itemTotal = (unitPrice + optionsTotal) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
        options: item.options,
        notes: item.notes || null,
      });
    }

    // Compute delivery fee from zone
    let deliveryFee = 0;
    // (could match address to zone here — simplified for now, admin sets zone at dispatch)

    // Validate coupon if provided
    let discount = 0;
    if (input.coupon_code) {
      const { data: couponResult } = await request.supabaseAdmin.rpc("validate_coupon", {
        p_restaurant_id: restaurantId,
        p_code: input.coupon_code,
        p_subtotal: subtotal,
      });
      if (couponResult?.valid) discount = couponResult.discount ?? 0;
    }

    const total = subtotal + deliveryFee - discount;

    // Determine initial status
    const isPaidOnline = input.payment_method === "pix" || input.payment_method === "credit_card";
    const initialStatus = isPaidOnline ? "pending" : "confirmed";
    const paymentStatus = isPaidOnline ? "pending" : "paid";

    const { data: order, error: orderErr } = await request.supabaseAdmin
      .from("orders")
      .insert({
        restaurant_id: restaurantId,
        customer_id: input.customer_id || null,
        channel: input.channel,
        status: initialStatus,
        payment_method: input.payment_method || null,
        payment_status: paymentStatus,
        subtotal, delivery_fee: deliveryFee, discount, total,
        delivery_address: input.delivery_address || null,
        customer_name: input.customer_name || null,
        customer_phone: input.customer_phone || null,
        notes: input.notes || null,
        coupon_code: input.coupon_code || null,
        scheduled_for: input.scheduled_for || null,
      })
      .select("id, order_number")
      .single();

    if (orderErr) return reply.status(400).send({ error: orderErr.message });

    // Insert items
    await request.supabaseAdmin.from("order_items").insert(
      orderItems.map((item) => ({ ...item, order_id: order!.id, restaurant_id: restaurantId }))
    );

    // Status history
    await request.supabaseAdmin.from("order_status_history").insert({
      order_id: order!.id, restaurant_id: restaurantId, to_status: initialStatus,
    });

    // Fire hooks
    onOrderCreated(request.supabaseAdmin, order!.id, restaurantId).catch((err) => {
      app.log.error({ err }, "Order creation hook failed");
    });

    return reply.status(201).send(order);
  });

  // PATCH /api/orders/:id/status
  app.patch("/:id/status", async (request, reply) => {
    const { id } = request.params as any;
    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { data: order, error } = await request.supabase
      .from("orders")
      .update({ status: parsed.data.status })
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId)
      .select("id, status")
      .single();

    if (error) return reply.status(400).send({ error: error.message });

    await request.supabaseAdmin.from("order_status_history").insert({
      order_id: id, restaurant_id: request.restaurantId, to_status: parsed.data.status, changed_by: request.userId,
    });

    onOrderStatusChange(request.supabaseAdmin, id, request.restaurantId!, parsed.data.status).catch((err) => {
      app.log.error({ err }, "Order hook failed");
    });

    return order;
  });
}

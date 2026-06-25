import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { onOrderCreated } from "../modules/order-hooks";

// Public checkout endpoint used by the anonymous menu customer.
// NÍVEL B: nenhum valor financeiro vem do cliente — preço unitário, preço de
// opções, taxa de entrega e total são SEMPRE recomputados a partir do banco.
const publicOrderSchema = z.object({
  restaurant_slug: z.string().min(1),
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().min(8).max(20),
  delivery_address: z.record(z.unknown()).optional().nullable(),
  zone_id: z.string().uuid().optional().nullable(),
  payment_method: z.enum(["pix", "cash", "card_on_delivery"]),
  notes: z.string().max(1000).optional().nullable(),
  scheduled_for: z.string().optional().nullable(),
  coupon_code: z.string().max(50).optional().nullable(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
    // Cliente envia apenas a IDENTIFICAÇÃO das opções; o preço é ignorado/derivado.
    options: z.array(z.object({
      group_name: z.string(),
      option_name: z.string(),
    })).default([]),
    notes: z.string().max(500).optional().nullable(),
  })).min(1),
});

export async function publicOrderRoutes(app: FastifyInstance) {
  // POST /api/public/orders — checkout do cardápio (sem auth, cliente anônimo)
  // Rate limit: 15 pedidos/min por IP para coibir spam de pedidos e cobranças no gateway
  app.post("/orders", { config: { rateLimit: { max: 15, timeWindow: "1 minute" } } }, async (request, reply) => {
    const parsed = publicOrderSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const input = parsed.data;
    const db = request.supabaseAdmin;

    // 1. Resolve restaurant
    const { data: restaurant } = await db
      .from("restaurants")
      .select("id, min_order, is_open")
      .eq("slug", input.restaurant_slug)
      .single();
    if (!restaurant) return reply.status(404).send({ error: "Restaurante não encontrado" });

    const restaurantId = restaurant.id;

    // 2. Recompute item prices from DB
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of input.items) {
      const { data: product } = await db
        .from("products")
        .select("id, name, price, promo_price")
        .eq("id", item.product_id)
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .single();
      if (!product) return reply.status(400).send({ error: `Produto indisponível` });

      const unitPrice = Number(product.promo_price ?? product.price);

      // Recompute option prices from DB (match by group+option name within product)
      let optionsTotal = 0;
      const resolvedOptions: any[] = [];
      if (item.options.length) {
        const { data: dbOptions } = await db
          .from("options")
          .select("name, price, option_group_id, option_groups!inner(name, product_id)")
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
          .eq("option_groups.product_id", product.id);

        for (const sel of item.options) {
          const match = (dbOptions ?? []).find(
            (o: any) => o.name === sel.option_name && o.option_groups?.name === sel.group_name
          );
          if (!match) return reply.status(400).send({ error: `Opção inválida: ${sel.option_name}` });
          const optPrice = Number(match.price);
          optionsTotal += optPrice;
          resolvedOptions.push({ groupName: sel.group_name, optionName: sel.option_name, price: optPrice });
        }
      }

      const itemTotal = (unitPrice + optionsTotal) * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
        options: resolvedOptions,
        notes: item.notes || null,
      });
    }

    if (subtotal < Number(restaurant.min_order ?? 0)) {
      return reply.status(400).send({ error: "Pedido abaixo do mínimo" });
    }

    // 3. Delivery fee from zone (authoritative)
    let deliveryFee = 0;
    if (input.zone_id) {
      const { data: zone } = await db
        .from("delivery_zones")
        .select("fee")
        .eq("id", input.zone_id)
        .eq("restaurant_id", restaurantId)
        .single();
      deliveryFee = Number(zone?.fee ?? 0);
    }

    // 4. Coupon (validated server-side)
    let discount = 0;
    if (input.coupon_code) {
      const { data: couponResult } = await db.rpc("validate_coupon", {
        p_restaurant_id: restaurantId,
        p_code: input.coupon_code,
        p_subtotal: subtotal,
      });
      if (couponResult?.valid) discount = Math.min(Number(couponResult.discount ?? 0), subtotal);
    }

    const total = Math.max(0, subtotal + deliveryFee - discount);

    // 5. Find or create customer
    const phone = input.customer_phone.replace(/\D/g, "");
    let { data: customer } = await db
      .from("customers")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("phone", phone)
      .maybeSingle();
    if (!customer) {
      const { data: created } = await db
        .from("customers")
        .insert({ restaurant_id: restaurantId, name: input.customer_name, phone, source: "organic" })
        .select("id")
        .single();
      customer = created;
    }

    // 6. Determine status (pix fica pending até confirmação do gateway)
    const isPaidOnline = input.payment_method === "pix";
    const status = isPaidOnline ? "pending" : "confirmed";
    const paymentStatus = isPaidOnline ? "pending" : "paid";

    const { data: order, error: orderErr } = await db
      .from("orders")
      .insert({
        restaurant_id: restaurantId,
        customer_id: customer?.id || null,
        channel: "cardapio",
        status,
        payment_method: input.payment_method,
        payment_status: paymentStatus,
        subtotal, delivery_fee: deliveryFee, discount, total,
        delivery_address: input.delivery_address || null,
        customer_name: input.customer_name,
        customer_phone: phone,
        notes: input.notes || null,
        coupon_code: input.coupon_code || null,
        scheduled_for: input.scheduled_for || null,
      })
      .select("id, order_number, total")
      .single();
    if (orderErr) { app.log.error(orderErr); return reply.status(400).send({ error: "Não foi possível criar o pedido" }); }

    await db.from("order_items").insert(
      orderItems.map((it) => ({ ...it, order_id: order!.id, restaurant_id: restaurantId }))
    );
    await db.from("order_status_history").insert({
      order_id: order!.id, restaurant_id: restaurantId, to_status: status,
      notes: "Pedido criado pelo cardápio digital",
    });
    if (customer?.id) {
      try { await db.rpc("increment_customer_stats", { p_customer_id: customer.id, p_total: total }); } catch {}
    }

    onOrderCreated(db, order!.id, restaurantId).catch((err) => app.log.error({ err }, "onOrderCreated falhou"));

    return reply.status(201).send({ id: order!.id, order_number: order!.order_number, total: order!.total });
  });
}

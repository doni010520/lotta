import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";
import { createDeliveryZoneSchema, updateDeliveryZoneSchema } from "@lotta/shared";

export async function deliveryZoneRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get("/", async (request) => {
    const { data } = await request.supabase
      .from("delivery_zones")
      .select("*")
      .eq("restaurant_id", request.restaurantId)
      .order("sort_order");
    return data ?? [];
  });

  app.post("/", async (request, reply) => {
    const parsed = createDeliveryZoneSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { data, error } = await request.supabase
      .from("delivery_zones")
      .insert({ ...parsed.data, restaurant_id: request.restaurantId })
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as any;
    const parsed = updateDeliveryZoneSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { data, error } = await request.supabase
      .from("delivery_zones")
      .update(parsed.data)
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId)
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as any;
    await request.supabase
      .from("delivery_zones")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId);
    return reply.status(204).send();
  });
}

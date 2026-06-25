import type { FastifyInstance } from "fastify";
import { requireAuth, requireRole } from "../plugins/auth-guard";
import { createCategorySchema, updateCategorySchema } from "@lotta/shared";

export async function categoryRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get("/", async (request) => {
    const { data } = await request.supabase
      .from("categories")
      .select("*, products(count)")
      .eq("restaurant_id", request.restaurantId)
      .order("sort_order");
    return data ?? [];
  });

  app.post("/", { preHandler: requireRole("owner", "manager") }, async (request, reply) => {
    const parsed = createCategorySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { data, error } = await request.supabase
      .from("categories")
      .insert({ ...parsed.data, restaurant_id: request.restaurantId })
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });

  app.patch("/:id", { preHandler: requireRole("owner", "manager") }, async (request, reply) => {
    const { id } = request.params as any;
    const parsed = updateCategorySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { data, error } = await request.supabase
      .from("categories")
      .update(parsed.data)
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId)
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });

  app.delete("/:id", { preHandler: requireRole("owner", "manager") }, async (request, reply) => {
    const { id } = request.params as any;
    const { error } = await request.supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId);

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(204).send();
  });
}

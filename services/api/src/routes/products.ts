import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";
import { createProductSchema, updateProductSchema } from "@lotta/shared";

export async function productRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get("/", async (request) => {
    const { category_id } = request.query as any;

    let query = request.supabase
      .from("products")
      .select("*, category:categories(id,name), option_groups(*, options(*))")
      .eq("restaurant_id", request.restaurantId)
      .order("sort_order");

    if (category_id) query = query.eq("category_id", category_id);

    const { data } = await query;
    return data ?? [];
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as any;
    const { data, error } = await request.supabase
      .from("products")
      .select("*, category:categories(id,name), option_groups(*, options(*))")
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId)
      .single();

    if (error) return reply.status(404).send({ error: "Product not found" });
    return data;
  });

  app.post("/", async (request, reply) => {
    const parsed = createProductSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { data, error } = await request.supabase
      .from("products")
      .insert({ ...parsed.data, restaurant_id: request.restaurantId })
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as any;
    const parsed = updateProductSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { data, error } = await request.supabase
      .from("products")
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
    const { error } = await request.supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId);

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(204).send();
  });

  // ── Option Groups ──
  app.post("/:productId/option-groups", async (request, reply) => {
    const { productId } = request.params as any;
    const body = request.body as any;

    const { data, error } = await request.supabase
      .from("option_groups")
      .insert({
        product_id: productId,
        restaurant_id: request.restaurantId,
        name: body.name,
        min_select: body.min_select ?? 0,
        max_select: body.max_select ?? 1,
        is_required: body.is_required ?? false,
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });

  // ── Options ──
  app.post("/:productId/option-groups/:groupId/options", async (request, reply) => {
    const { groupId } = request.params as any;
    const body = request.body as any;

    const { data, error } = await request.supabase
      .from("options")
      .insert({
        option_group_id: groupId,
        restaurant_id: request.restaurantId,
        name: body.name,
        price: body.price ?? 0,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });
}

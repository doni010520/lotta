import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";
import { updateRestaurantSchema } from "@lotta/shared";

export async function restaurantRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get("/current", async (request) => {
    const { data, error } = await request.supabase
      .from("restaurants")
      .select("*")
      .eq("id", request.restaurantId)
      .single();

    if (error) return { error: error.message };
    return data;
  });

  app.patch("/current", async (request, reply) => {
    const parsed = updateRestaurantSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { data, error } = await request.supabase
      .from("restaurants")
      .update(parsed.data)
      .eq("id", request.restaurantId)
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });
}

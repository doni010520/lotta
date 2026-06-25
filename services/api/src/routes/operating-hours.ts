import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";
import { createOperatingHourSchema } from "@lotta/shared";

export async function operatingHourRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get("/", async (request) => {
    const { data } = await request.supabase
      .from("operating_hours")
      .select("*")
      .eq("restaurant_id", request.restaurantId)
      .order("day_of_week")
      .order("open_time");
    return data ?? [];
  });

  app.post("/", async (request, reply) => {
    const parsed = createOperatingHourSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { data, error } = await request.supabase
      .from("operating_hours")
      .insert({ ...parsed.data, restaurant_id: request.restaurantId })
      .select()
      .single();

    if (error) return reply.status(400).send({ error: error.message });
    return reply.status(201).send(data);
  });

  // PUT /operating-hours/batch — substitui todos de uma vez
  app.put("/batch", async (request, reply) => {
    const hours = request.body as any[];

    // Delete existing
    await request.supabase
      .from("operating_hours")
      .delete()
      .eq("restaurant_id", request.restaurantId);

    // Insert new
    const rows = hours.map((h: any) => ({
      ...h,
      restaurant_id: request.restaurantId,
    }));

    const { data, error } = await request.supabase
      .from("operating_hours")
      .insert(rows)
      .select();

    if (error) return reply.status(400).send({ error: error.message });
    return data;
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as any;
    await request.supabase
      .from("operating_hours")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId);
    return reply.status(204).send();
  });
}

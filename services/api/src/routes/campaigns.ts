import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";
import IORedis from "ioredis";
import { Queue } from "bullmq";

let campaignQueue: Queue | null = null;

function getQueue() {
  if (!campaignQueue) {
    const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });
    campaignQueue = new Queue("campaigns", { connection: redis });
  }
  return campaignQueue;
}

export async function campaignApiRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  // POST /api/campaigns/:id/send — dispatch campaign to BullMQ
  app.post("/:id/send", async (request, reply) => {
    const { id } = request.params as any;

    // Atomic: only updates if status IS 'draft' — prevents TOCTOU race where
    // two concurrent requests both pass the status check and enqueue twice.
    const { data: updated, error } = await request.supabase
      .from("campaigns")
      .update({ status: "scheduled" })
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (error) return reply.status(500).send({ error: error.message });
    if (!updated) {
      // Either not found, wrong restaurant, or already scheduled/sent
      const { data: existing } = await request.supabase
        .from("campaigns")
        .select("status")
        .eq("id", id)
        .eq("restaurant_id", request.restaurantId)
        .maybeSingle();
      if (!existing) return reply.status(404).send({ error: "Campanha não encontrada" });
      return reply.status(409).send({ error: "Campanha já enviada ou cancelada" });
    }

    // jobId deduplicates: if this job already exists in queue, BullMQ ignores the second add.
    await getQueue().add(
      "send-campaign",
      { campaignId: id, restaurantId: request.restaurantId },
      { jobId: `campaign-${id}` },
    );

    return { queued: true };
  });
}

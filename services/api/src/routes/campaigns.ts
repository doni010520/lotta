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

    const { data: campaign, error } = await request.supabase
      .from("campaigns")
      .select("id, status")
      .eq("id", id)
      .eq("restaurant_id", request.restaurantId)
      .single();

    if (error || !campaign) return reply.status(404).send({ error: "Campanha não encontrada" });
    if (campaign.status !== "draft") return reply.status(400).send({ error: "Campanha já enviada ou cancelada" });

    await request.supabase.from("campaigns").update({ status: "scheduled" }).eq("id", id);

    await getQueue().add("send-campaign", {
      campaignId: id,
      restaurantId: request.restaurantId,
    });

    return { queued: true };
  });
}

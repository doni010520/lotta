import Fastify from "fastify";
import { startSegmentationCron } from "./segmentation";
import { startCampaignWorker } from "./campaigns";
import { startRecoveryCron } from "./recovery";

const app = Fastify({ logger: true });

async function start() {
  app.get("/health", async () => ({ service: "lotta-workers", version: "0.0.1" }));

  // Cron: RFM segmentation (every 6 hours)
  app.get("/cron/segmentation", async (req, reply) => {
    const secret = (req.query as any)?.secret;
    if (secret !== process.env.CRON_SECRET) return reply.status(401).send("Unauthorized");
    const result = await startSegmentationCron();
    return result;
  });

  // Cron: Recovery (every 15 min)
  app.get("/cron/recovery", async (req, reply) => {
    const secret = (req.query as any)?.secret;
    if (secret !== process.env.CRON_SECRET) return reply.status(401).send("Unauthorized");
    const result = await startRecoveryCron();
    return result;
  });

  // Start campaign worker
  startCampaignWorker();

  // Cron: Loyalty expiration (daily)
  app.get("/cron/loyalty-expire", async (req, reply) => {
    const secret = (req.query as any)?.secret;
    if (secret !== process.env.CRON_SECRET) return reply.status(401).send("Unauthorized");
    const { expireLoyaltyPoints } = await import("./loyalty");
    return expireLoyaltyPoints();
  });
  const port = parseInt(process.env.WORKERS_PORT || "3005");
  await app.listen({ port, host: "0.0.0.0" });
  console.log("Workers service on :" + port);
}

start().catch((err) => { console.error(err); process.exit(1); });

import Fastify from "fastify";
import cors from "@fastify/cors";
import { startIFoodPolling } from "./ifood/poller";

const app = Fastify({ logger: true });

async function start() {
  const ALLOWED_ORIGINS = [
    process.env.ADMIN_URL || "http://localhost:3000",
    process.env.MENU_URL || "http://localhost:3002",
  ].filter(Boolean);
  await app.register(cors, { origin: ALLOWED_ORIGINS });

  app.get("/health", async () => ({ service: "lotta-integrations", version: "0.0.1" }));

  // Start iFood polling
  startIFoodPolling();

  // Start 99Food polling
  const { start99FoodPolling } = await import("./ninety9food/poller");
  start99FoodPolling();

  const port = parseInt(process.env.INTEGRATIONS_PORT || "3004");
  await app.listen({ port, host: "0.0.0.0" });
  console.log("Integrations service on :" + port);
}

start().catch((err) => { console.error(err); process.exit(1); });

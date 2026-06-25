import Fastify from "fastify";
import cors from "@fastify/cors";
import { startIFoodPolling } from "./ifood/poller";

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ service: "lotta-integrations", version: "0.0.1" }));

  // Start iFood polling
  startIFoodPolling();

  const port = parseInt(process.env.INTEGRATIONS_PORT || "3004");
  await app.listen({ port, host: "0.0.0.0" });
  console.log("Integrations service on :" + port);
}

start().catch((err) => { console.error(err); process.exit(1); });

import Fastify from "fastify";
import cors from "@fastify/cors";
import { webhookRoutes } from "./routes/webhooks";
import { sendRoutes } from "./routes/send";

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });
  await app.register(webhookRoutes, { prefix: "/webhooks" });
  await app.register(sendRoutes, { prefix: "/api/send" });

  app.get("/health", async () => ({ service: "lotta-whatsapp", version: "0.0.1" }));

  const port = parseInt(process.env.WHATSAPP_PORT || "3003");
  await app.listen({ port, host: "0.0.0.0" });
  console.log("WhatsApp service on :" + port);
}

start().catch((err) => { console.error(err); process.exit(1); });

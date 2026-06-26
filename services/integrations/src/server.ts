import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = !!SUPABASE_URL && !!SUPABASE_KEY;

async function start() {
  const ALLOWED_ORIGINS = [
    process.env.ADMIN_URL || "http://localhost:3000",
    process.env.MENU_URL || "http://localhost:3002",
  ].filter(Boolean);
  await app.register(cors, { origin: ALLOWED_ORIGINS });

  app.get("/health", async () => ({
    service: "lotta-integrations",
    version: "0.0.1",
    configured,
  }));

  if (configured) {
    const { startIFoodPolling } = await import("./ifood/poller");
    startIFoodPolling();

    const { start99FoodPolling } = await import("./ninety9food/poller");
    start99FoodPolling();
  } else {
    console.warn(
      "[integrations] Missing env vars — pollers disabled. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const port = parseInt(process.env.INTEGRATIONS_PORT || "3004");
  await app.listen({ port, host: "0.0.0.0" });
  console.log("Integrations service on :" + port);
}

start().catch((err) => { console.error(err); process.exit(1); });

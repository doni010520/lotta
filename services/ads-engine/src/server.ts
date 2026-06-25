import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { metaAds } from "./meta/client";

const app = Fastify({ logger: true });
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "lotta-internal";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function start() {
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ service: "lotta-ads-engine", version: "0.0.1" }));

  // CAPI Purchase event — called by API after order creation
  app.post("/api/capi/purchase", async (request, reply) => {
    if (request.headers["x-internal-secret"] !== INTERNAL_SECRET) return reply.status(401).send({ error: "Unauthorized" });

    const { restaurant_id, phone, value, order_id } = request.body as any;

    const { data: restaurant } = await supabase.from("restaurants").select("metadata").eq("id", restaurant_id).single();
    const creds = (restaurant?.metadata as any)?.meta_ads_creds;

    if (!creds?.pixel_id || !creds?.access_token) return { skipped: true, reason: "No Meta Ads credentials" };

    await metaAds.sendCAPIPurchase(creds, { phone, value, orderId: order_id });
    return { sent: true };
  });

  const port = parseInt(process.env.ADS_PORT || "3006");
  await app.listen({ port, host: "0.0.0.0" });
  console.log("Ads engine on :" + port);
}

start().catch((err) => { console.error(err); process.exit(1); });

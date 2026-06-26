import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { metaAds } from "./meta/client";
import { googleAds, gmb } from "./google/client";

const app = Fastify({ logger: true });

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: SupabaseClient | null = null;
let configured = false;

if (!INTERNAL_SECRET || !SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    "[ads-engine] Missing env vars — routes disabled. Required: INTERNAL_API_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  configured = true;
}

function requireInternal(req: any, reply: any, done: any) {
  if (!configured) {
    return reply.status(503).send({ error: "Service not configured — missing env vars" });
  }
  const provided = req.headers["x-internal-secret"];
  const cronSecret = process.env.CRON_SECRET;
  const cronProvided = (req.query as any)?.secret;
  const internalOk = !!provided && provided === INTERNAL_SECRET;
  const cronOk = !!cronSecret && !!cronProvided && cronProvided === cronSecret;
  if (!internalOk && !cronOk) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  done();
}

async function start() {
  const ALLOWED_ORIGINS = [
    process.env.ADMIN_URL || "http://localhost:3000",
    process.env.MENU_URL || "http://localhost:3002",
  ].filter(Boolean);
  await app.register(cors, { origin: ALLOWED_ORIGINS });

  app.get("/health", async () => ({
    service: "lotta-ads-engine",
    version: "0.0.1",
    configured,
  }));

  // ── Meta CAPI: Purchase event ──
  app.post("/api/capi/purchase", { preHandler: requireInternal }, async (request) => {
    const { restaurant_id, phone, value, order_id } = request.body as any;
    const { data: rest } = await supabase!.from("restaurants").select("metadata").eq("id", restaurant_id).single();
    const creds = (rest?.metadata as any)?.meta_ads_creds;
    if (!creds?.pixel_id) return { skipped: true };
    await metaAds.sendCAPIPurchase(creds, { phone, value, orderId: order_id });
    return { sent: true };
  });

  // ── Meta Ads: Generate creatives for a restaurant ──
  app.post("/api/meta/generate-creatives", { preHandler: requireInternal }, async (request) => {
    const { restaurant_id } = request.body as any;
    const { data: rest } = await supabase!.from("restaurants").select("name, metadata").eq("id", restaurant_id).single();
    const { data: products } = await supabase!.from("products").select("name, description").eq("restaurant_id", restaurant_id).eq("is_active", true).order("sort_order").limit(3);
    if (!products?.length) return { error: "No products" };

    const copies = [];
    for (const prod of products) {
      const variations = await metaAds.generateCreative(rest?.name || "", prod.name, prod.description || "");
      copies.push({ product: prod.name, variations });
    }
    return { creatives: copies };
  });

  // ── Google Ads: Generate keywords ──
  app.post("/api/google/keywords", { preHandler: requireInternal }, async (request) => {
    const { restaurant_id } = request.body as any;
    const { data: rest } = await supabase!.from("restaurants").select("name, address, metadata").eq("id", restaurant_id).single();
    const addr = rest?.address as any;
    if (!addr?.city) return { error: "Restaurant address not set" };
    const keywords = await googleAds.generateKeywords(rest?.name || "restaurante", addr.city, addr.neighborhood || "");
    return { keywords };
  });

  // ── Cron: GMB weekly post ──
  app.get("/cron/gmb-posts", { preHandler: requireInternal }, async () => {
    const { data: restaurants } = await supabase!.from("restaurants").select("id, name, slug, metadata");
    let posted = 0;

    for (const rest of restaurants ?? []) {
      const gmbCreds = (rest.metadata as any)?.gmb_creds;
      if (!gmbCreds?.access_token || !gmbCreds?.location_id) continue;

      const { data: product } = await supabase!.from("products").select("name")
        .eq("restaurant_id", rest.id).eq("is_active", true).order("sort_order").limit(1).single();

      if (!product) continue;

      const menuLink = `https://cardapio.lotta.delivery/${rest.slug}`;
      await gmb.generateAndPost(gmbCreds, rest.name, product.name, menuLink);
      posted++;
    }

    return { posted };
  });

  // ── Cron: GMB auto-reply reviews ──
  app.get("/cron/gmb-reviews", { preHandler: requireInternal }, async () => {
    const { data: restaurants } = await supabase!.from("restaurants").select("id, metadata");
    let replied = 0;

    for (const rest of restaurants ?? []) {
      const gmbCreds = (rest.metadata as any)?.gmb_creds;
      if (!gmbCreds?.access_token) continue;

      const reviews = await gmb.getReviews(gmbCreds);
      for (const review of reviews?.reviews ?? []) {
        if (review.reviewReply) continue;
        await gmb.replyReview(gmbCreds, review.name, review.comment || "", review.starRating || 3);
        replied++;
      }
    }

    return { replied };
  });

  const port = parseInt(process.env.ADS_PORT || "3006");
  await app.listen({ port, host: "0.0.0.0" });
  console.log("Ads engine on :" + port);
}

start().catch((err) => { console.error(err); process.exit(1); });

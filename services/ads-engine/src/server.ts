import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { metaAds } from "./meta/client";
import { googleAds, gmb } from "./google/client";

const app = Fastify({ logger: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Analisa feedbacks recentes e grava resumo + ações recomendadas (Relatórios IA)
async function analyzeFeedbacks(db: SupabaseClient, restaurantId: string, periodDays = 30) {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: feedbacks } = await db
    .from("feedbacks")
    .select("rating, comment")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", since)
    .limit(200);
  if (!feedbacks?.length) return null;

  const avg = feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length;
  const comments = feedbacks.filter((f) => f.comment).map((f) => `(${f.rating}★) ${f.comment}`).slice(0, 80).join("\n");

  let parsed: any = { summary: "", sentiment: "neutro", recommendations: [] };
  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4.1-mini", max_tokens: 600, temperature: 0.4,
      messages: [{
        role: "user",
        content: `Analise os feedbacks de um restaurante delivery (nota média ${avg.toFixed(1)}). ` +
          `Responda SOMENTE JSON: {"summary":"resumo de 1-2 frases","sentiment":"positivo|neutro|negativo",` +
          `"recommendations":[{"title":"problema","action":"ação recomendada"}]} (máx 4 recomendações).\n\nFeedbacks:\n${comments || "(sem comentários, só notas)"}`,
      }],
    });
    parsed = JSON.parse(r.choices[0]?.message?.content?.replace(/```json|```/g, "").trim() || "{}");
  } catch { /* mantém default */ }

  const insight = {
    restaurant_id: restaurantId,
    period_days: periodDays,
    summary: parsed.summary || null,
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    sentiment: ["positivo", "neutro", "negativo"].includes(parsed.sentiment) ? parsed.sentiment : "neutro",
    avg_rating: Math.round(avg * 100) / 100,
    sample_size: feedbacks.length,
  };
  await db.from("feedback_insights").insert(insight);
  return insight;
}

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

  // ── Helper: extrai métricas do payload de insights da Meta ──
  function parseMetaInsights(insights: any) {
    const row = insights?.data?.[0];
    if (!row) return null;
    const purchases = (row.actions ?? []).find((a: any) => String(a.action_type).includes("purchase"));
    return {
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      ctr: Number(row.ctr ?? 0),
      spend: Number(row.spend ?? 0),
      conversions: purchases ? Number(purchases.value ?? 0) : 0,
    };
  }

  // ── Internal: sincroniza métricas das campanhas de um restaurante ──
  app.post("/api/ads/refresh-metrics", { preHandler: requireInternal }, async (request) => {
    const { restaurant_id } = request.body as any;
    const { data: rest } = await supabase!.from("restaurants").select("metadata").eq("id", restaurant_id).single();
    const creds = (rest?.metadata as any)?.meta_ads_creds;
    const { data: campaigns } = await supabase!.from("ad_campaigns")
      .select("id, platform_campaign_id")
      .eq("restaurant_id", restaurant_id).eq("channel", "meta")
      .not("platform_campaign_id", "is", null);

    let refreshed = 0;
    for (const c of campaigns ?? []) {
      if (!creds?.access_token || !c.platform_campaign_id) continue;
      try {
        const insights = await metaAds.getMetrics(creds, c.platform_campaign_id);
        const metrics = parseMetaInsights(insights);
        if (metrics) {
          await supabase!.from("ad_campaigns")
            .update({ metrics, metrics_updated_at: new Date().toISOString() })
            .eq("id", c.id);
          refreshed++;
        }
      } catch (err) { console.error("[ads] metrics refresh error", err); }
    }
    return { refreshed };
  });

  // ── Cron semanal: a IA gera 3 criativos por restaurante e mantém 1 campanha viva por canal ──
  app.get("/cron/ads-weekly", { preHandler: requireInternal }, async () => {
    const { data: restaurants } = await supabase!.from("restaurants").select("id, name, metadata");
    let generated = 0;

    for (const rest of restaurants ?? []) {
      const meta = (rest.metadata as any) || {};
      if (!meta.ads_enabled || !meta.meta_ads_creds?.access_token) continue;

      // produto destaque
      const { data: product } = await supabase!.from("products").select("id, name, description")
        .eq("restaurant_id", rest.id).eq("is_active", true).order("sort_order").limit(1).maybeSingle();
      if (!product) continue;

      let variations: string[] = [];
      try {
        variations = await metaAds.generateCreative(rest.name, product.name, product.description || "");
      } catch (err) { console.error("[ads] creative gen error", err); continue; }
      if (!variations?.length) continue;

      const creatives = variations.map((text, i) => ({ text, active: i === 0 }));
      const dailyBudget = Math.round(((meta.ads_weekly_budget ?? 100) / 7) * 100) / 100;

      // mantém 1 campanha viva por canal (índice único garante atomicidade)
      const { data: existing } = await supabase!.from("ad_campaigns")
        .select("id").eq("restaurant_id", rest.id).eq("channel", "meta")
        .in("status", ["draft", "active", "paused"]).maybeSingle();

      if (existing) {
        await supabase!.from("ad_campaigns").update({
          creatives, product_id: product.id, daily_budget: dailyBudget,
          last_optimized_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase!.from("ad_campaigns").insert({
          restaurant_id: rest.id, channel: "meta", status: "draft",
          name: `Campanha ${product.name} — Meta`, daily_budget: dailyBudget,
          product_id: product.id, creatives, last_optimized_at: new Date().toISOString(),
        });
      }
      generated++;
    }

    return { generated };
  });

  // ── Cron: refresh de métricas de todas as campanhas publicadas ──
  app.get("/cron/ads-metrics", { preHandler: requireInternal }, async () => {
    const { data: restaurants } = await supabase!.from("restaurants").select("id, metadata");
    let refreshed = 0;
    for (const rest of restaurants ?? []) {
      const creds = (rest.metadata as any)?.meta_ads_creds;
      if (!creds?.access_token) continue;
      const { data: campaigns } = await supabase!.from("ad_campaigns")
        .select("id, platform_campaign_id").eq("restaurant_id", rest.id).eq("channel", "meta")
        .not("platform_campaign_id", "is", null);
      for (const c of campaigns ?? []) {
        try {
          const metrics = parseMetaInsights(await metaAds.getMetrics(creds, c.platform_campaign_id!));
          if (metrics) {
            await supabase!.from("ad_campaigns")
              .update({ metrics, metrics_updated_at: new Date().toISOString() }).eq("id", c.id);
            refreshed++;
          }
        } catch (err) { console.error("[ads] metrics cron error", err); }
      }
    }
    return { refreshed };
  });

  // ── Internal: análise de feedbacks por IA (sob demanda) ──
  app.post("/api/feedback/insights", { preHandler: requireInternal }, async (request) => {
    const { restaurant_id, period_days } = request.body as any;
    const insight = await analyzeFeedbacks(supabase!, restaurant_id, period_days || 30);
    if (!insight) return { skipped: true, reason: "sem feedbacks no período" };
    return { insight };
  });

  // ── Cron: gera insights de feedback para todos os restaurantes com volume mínimo ──
  app.get("/cron/feedback-insights", { preHandler: requireInternal }, async () => {
    const { data: restaurants } = await supabase!.from("restaurants").select("id");
    let generated = 0;
    for (const rest of restaurants ?? []) {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase!.from("feedbacks")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", rest.id).gte("created_at", since);
      if ((count ?? 0) < 3) continue; // volume mínimo para um insight útil
      try { if (await analyzeFeedbacks(supabase!, rest.id, 30)) generated++; }
      catch (err) { console.error("[ads] feedback insight error", err); }
    }
    return { generated };
  });

  // ── Internal: sugere um cupom estratégico via IA (com base no ticket médio) ──
  app.post("/api/coupons/suggest", { preHandler: requireInternal }, async (request) => {
    const { restaurant_id } = request.body as any;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orders } = await supabase!.from("orders")
      .select("total, status").eq("restaurant_id", restaurant_id).gte("created_at", since);
    const valid = (orders ?? []).filter((o: any) => o.status !== "cancelled");
    const avg = valid.length ? valid.reduce((s: number, o: any) => s + (o.total || 0), 0) / valid.length : 0;

    let parsed: any = {};
    try {
      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini", max_tokens: 200, temperature: 0.7,
        messages: [{
          role: "user",
          content: `Ticket médio R$${avg.toFixed(2)} num delivery. Sugira UM cupom estratégico que aumente pedidos ` +
            `sem queimar margem. Responda SOMENTE JSON: {"code":"CODIGO","type":"percent|fixed|free_delivery",` +
            `"value":10,"min_order":0,"reason":"motivo curto"}.`,
        }],
      });
      parsed = JSON.parse(r.choices[0]?.message?.content?.replace(/```json|```/g, "").trim() || "{}");
    } catch { /* usa defaults abaixo */ }

    const suggestion = {
      code: String(parsed.code || "VOLTA10").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) || "VOLTA10",
      type: ["percent", "fixed", "free_delivery"].includes(parsed.type) ? parsed.type : "percent",
      value: Number(parsed.value) || 10,
      min_order: Number(parsed.min_order) || 0,
      reason: parsed.reason || "",
    };
    return { suggestion };
  });

  const port = parseInt(process.env.ADS_PORT || "3006");
  await app.listen({ port, host: "0.0.0.0" });
  console.log("Ads engine on :" + port);
}

start().catch((err) => { console.error(err); process.exit(1); });

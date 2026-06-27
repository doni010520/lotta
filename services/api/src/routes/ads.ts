import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";
import { ads } from "@lotta/shared";

/**
 * Rotas de Tráfego Pago consumidas pelo admin (Bearer).
 * O CRUD/listagem de campanhas é feito direto no Supabase (RLS) pelo front;
 * aqui ficam as ações que precisam do ads-engine interno (IA + plataformas).
 */
export async function adsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  // POST /api/ads/creatives — gera 3 variações de copy por produto (preview, não publica)
  app.post("/creatives", async (request, reply) => {
    try {
      const result = await ads.generateCreatives(request.restaurantId!);
      return result; // { creatives: [{ product, variations: [...] }] }
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || "Falha ao gerar criativos" });
    }
  });

  // POST /api/ads/campaigns — cria uma campanha (rascunho) com criativos da IA
  app.post("/campaigns", async (request, reply) => {
    const body = (request.body || {}) as any;
    const channel = body.channel === "google" || body.channel === "gmb" ? body.channel : "meta";
    const dailyBudget = Math.max(0, Number(body.daily_budget) || 0);

    // Produto destaque (informado ou o primeiro ativo)
    let productId: string | null = body.product_id ?? null;
    let productName: string | null = null;
    if (!productId) {
      const { data: prod } = await request.supabase
        .from("products")
        .select("id, name")
        .eq("restaurant_id", request.restaurantId)
        .eq("is_active", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      productId = prod?.id ?? null;
      productName = prod?.name ?? null;
    }

    // Gera criativos via IA (best-effort: se falhar, cria com lista vazia)
    let creatives: { text: string; active: boolean }[] = [];
    try {
      const gen = await ads.generateCreatives(request.restaurantId!);
      const first = gen?.creatives?.[0];
      if (first?.variations?.length) {
        creatives = first.variations.map((text: string, i: number) => ({ text, active: i === 0 }));
        if (!productName) productName = first.product;
      }
    } catch {
      /* sem IA disponível — campanha entra como rascunho vazio */
    }

    const name = body.name || `Campanha ${productName || "Delivery"} — ${channel === "meta" ? "Meta" : channel === "google" ? "Google" : "GMB"}`;

    const { data, error } = await request.supabase
      .from("ad_campaigns")
      .insert({
        restaurant_id: request.restaurantId,
        channel,
        name,
        status: "draft",
        daily_budget: dailyBudget,
        product_id: productId,
        creatives,
      })
      .select("*")
      .single();

    if (error) {
      // 23505 = violação do índice único (já existe campanha viva nesse canal)
      if ((error as any).code === "23505") {
        return reply.status(409).send({ error: "Já existe uma campanha ativa nesse canal. Pause ou arquive antes de criar outra." });
      }
      return reply.status(500).send({ error: error.message });
    }
    return data;
  });

  // POST /api/ads/campaigns/:id/refresh — sincroniza métricas das plataformas
  app.post("/campaigns/:id/refresh", async (request, reply) => {
    try {
      const result = await ads.refreshMetrics(request.restaurantId!);
      return result;
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || "Falha ao sincronizar métricas" });
    }
  });
}

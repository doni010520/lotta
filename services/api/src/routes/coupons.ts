import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";
import { coupons } from "@lotta/shared";

// Cupons inteligentes — sugestão por IA (o CRUD é feito direto no Supabase pelo admin).
export async function couponRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  // POST /api/coupons/suggest — sugere um cupom estratégico via IA
  app.post("/suggest", async (request, reply) => {
    try {
      return await coupons.suggest(request.restaurantId!);
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || "Falha ao sugerir cupom" });
    }
  });
}

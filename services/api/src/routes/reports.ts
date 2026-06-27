import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth-guard";
import { reports } from "@lotta/shared";

/**
 * Relatórios IA — ações que precisam do ads-engine (OpenAI).
 * Os dados (funil, insights salvos) são lidos direto do Supabase (RLS) pelo admin.
 */
export async function reportsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  // POST /api/reports/feedback-insights — gera a análise de feedbacks por IA
  app.post("/feedback-insights", async (request, reply) => {
    const { period_days } = (request.body || {}) as any;
    try {
      const result = await reports.feedbackInsights(request.restaurantId!, period_days || 30);
      return result;
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || "Falha ao analisar feedbacks" });
    }
  });
}

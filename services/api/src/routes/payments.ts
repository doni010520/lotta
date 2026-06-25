import type { FastifyInstance } from "fastify";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// NÍVEL B: a Lotta dispara a cobrança no gateway DO RESTAURANTE.
// O valor cobrado é SEMPRE o total autoritativo do pedido (banco), nunca um
// valor vindo do cliente. A confirmação de pagamento é validada contra o
// gateway (token/assinatura + reconsulta) antes de marcar o pedido como pago.
export async function paymentRoutes(app: FastifyInstance) {
  // POST /api/payments/pix — gera cobrança Pix para um pedido existente
  // Rate limit: 10/min por IP para evitar spam de cobranças no gateway
  app.post("/pix", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { order_id } = (request.body as any) ?? {};
    if (!order_id || typeof order_id !== "string") {
      return reply.status(400).send({ error: "order_id obrigatório" });
    }

    // Buscar o pedido — valor e restaurante vêm do banco, nunca do cliente
    const { data: order } = await supabase
      .from("orders")
      .select("id, total, restaurant_id, payment_status")
      .eq("id", order_id)
      .single();
    if (!order) return reply.status(404).send({ error: "Pedido não encontrado" });
    if (order.payment_status === "paid") return reply.status(409).send({ error: "Pedido já pago" });

    const amount = Number(order.total);
    if (!(amount > 0)) return reply.status(400).send({ error: "Valor do pedido inválido" });

    const { data: config } = await supabase
      .from("payment_configs")
      .select("*")
      .eq("restaurant_id", order.restaurant_id)
      .single();
    if (!config || config.gateway === "manual") {
      return reply.status(400).send({ error: "Gateway não configurado" });
    }

    if (config.gateway === "mercadopago") {
      const creds = config.credentials as any;
      const res = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${creds.access_token}` },
        body: JSON.stringify({
          transaction_amount: amount, description: `Pedido ${order_id}`,
          payment_method_id: "pix", external_reference: order_id,
          payer: { email: creds.payer_email || "cliente@lotta.app" },
        }),
      });
      const data = await res.json();
      if (!res.ok) return reply.status(400).send({ error: data.message || "Falha no gateway" });

      await supabase.from("orders").update({ payment_gateway_id: String(data.id) }).eq("id", order_id);
      return {
        pixCode: data.point_of_interaction?.transaction_data?.qr_code,
        pixQrBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
      };
    }

    if (config.gateway === "asaas") {
      const creds = config.credentials as any;
      const baseUrl = creds.sandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3";
      const payRes = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: creds.api_key },
        body: JSON.stringify({
          billingType: "PIX", value: amount, description: `Pedido ${order_id}`,
          externalReference: order_id, customer: creds.default_customer_id,
          dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
        }),
      });
      const payment = await payRes.json();
      if (!payRes.ok) return reply.status(400).send({ error: payment.errors?.[0]?.description || "Falha no gateway" });

      await supabase.from("orders").update({ payment_gateway_id: payment.id }).eq("id", order_id);
      const pixRes = await fetch(`${baseUrl}/payments/${payment.id}/pixQrCode`, {
        headers: { access_token: creds.api_key },
      });
      const pix = await pixRes.json();
      return { pixCode: pix.payload, pixQrBase64: pix.encodedImage };
    }

    return reply.status(400).send({ error: `Gateway ${config.gateway} não suportado para Pix` });
  });

  // POST /api/payments/webhook/:gateway — confirmação do gateway (validada)
  app.post("/webhook/:gateway", async (request, reply) => {
    const { gateway } = request.params as any;
    const body = request.body as any;

    let orderId: string | null = null;
    let paidAmount: number | null = null;

    // ── Mercado Pago: reconsulta o pagamento na API (autentica contra o MP) ──
    if (gateway === "mercadopago") {
      if (body?.action === "payment.updated" || body?.action === "payment.created") {
        const paymentId = body.data?.id;
        if (paymentId) {
          const { data: configs } = await supabase
            .from("payment_configs").select("credentials").eq("gateway", "mercadopago");
          for (const cfg of configs ?? []) {
            const creds = cfg.credentials as any;
            const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { Authorization: `Bearer ${creds.access_token}` },
            });
            if (!res.ok) continue;
            const payment = await res.json();
            if (payment.status === "approved") {
              orderId = payment.external_reference;
              paidAmount = Number(payment.transaction_amount);
              break;
            }
          }
        }
      }
    }

    // ── Asaas: valida o token do webhook e reconsulta o pagamento ──
    if (gateway === "asaas") {
      if (body?.event === "PAYMENT_CONFIRMED" || body?.event === "PAYMENT_RECEIVED") {
        const ref = body.payment?.externalReference;
        const paymentId = body.payment?.id;
        if (ref && paymentId) {
          // Descobrir o restaurante pelo pedido para achar as credenciais corretas
          const { data: ord } = await supabase
            .from("orders").select("restaurant_id").eq("id", ref).single();
          if (ord) {
            const { data: cfg } = await supabase
              .from("payment_configs").select("credentials")
              .eq("restaurant_id", ord.restaurant_id).eq("gateway", "asaas").single();
            const creds = cfg?.credentials as any;
            const sentToken = request.headers["asaas-access-token"];
            // 1) valida o token do webhook configurado no Asaas
            if (creds?.webhook_token && sentToken === creds.webhook_token) {
              // 2) reconsulta o pagamento no Asaas para confirmar status + valor
              const baseUrl = creds.sandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3";
              const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
                headers: { access_token: creds.api_key },
              });
              if (res.ok) {
                const payment = await res.json();
                if (payment.status === "CONFIRMED" || payment.status === "RECEIVED") {
                  orderId = ref;
                  paidAmount = Number(payment.value);
                }
              }
            } else {
              app.log.warn({ ref }, "Webhook Asaas com token inválido/ausente — ignorado");
            }
          }
        }
      }
    }

    if (orderId && paidAmount !== null) {
      // Idempotência + conferência de valor antes de confirmar
      const { data: order } = await supabase
        .from("orders").select("id, restaurant_id, total, payment_status").eq("id", orderId).single();
      if (order && order.payment_status !== "paid" && paidAmount + 0.01 >= Number(order.total)) {
        await supabase.from("orders").update({ payment_status: "paid", status: "confirmed" }).eq("id", orderId);
        const { onOrderStatusChange } = await import("../modules/order-hooks");
        await onOrderStatusChange(supabase, order.id, order.restaurant_id, "confirmed").catch(() => {});
      } else if (order && paidAmount + 0.01 < Number(order.total)) {
        app.log.warn({ orderId, paidAmount, total: order.total }, "Pagamento abaixo do total — não confirmado");
      }
    }

    return reply.send({ ok: true });
  });
}

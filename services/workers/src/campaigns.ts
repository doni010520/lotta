import { createClient } from "@supabase/supabase-js";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import OpenAI from "openai";
import { wa } from "@lotta/shared";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const campaignQueue = new Queue("campaigns", { connection: redis });

// Enfileira campanhas agendadas cujo horário já chegou (chamado por cron)
export async function dispatchScheduledCampaigns() {
  const now = new Date().toISOString();
  const { data: due } = await supabase
    .from("campaigns")
    .select("id, restaurant_id")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .limit(100);

  let queued = 0;
  for (const c of due ?? []) {
    // jobId deduplica: evita enfileirar duas vezes se o cron rodar de novo antes do worker pegar
    await campaignQueue.add(
      "send-campaign",
      { campaignId: c.id, restaurantId: c.restaurant_id },
      { jobId: `campaign-${c.id}` },
    );
    queued++;
  }
  return { queued };
}

export function startCampaignWorker() {
  const worker = new Worker("campaigns", async (job) => {
    const { campaignId, restaurantId } = job.data;

    const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
    if (!campaign || campaign.status === "cancelled") return;

    await supabase.from("campaigns").update({ status: "sending" }).eq("id", campaignId);

    const filter = campaign.segment_filter || {};
    let query = supabase.from("customers").select("id, phone, name")
      .eq("restaurant_id", restaurantId).eq("consent_marketing", true).limit(4000);
    if (filter.segment) query = query.eq("segment", filter.segment);

    const { data: audience } = await query;
    if (!audience?.length) {
      await supabase.from("campaigns").update({ status: "sent", sent_count: 0 }).eq("id", campaignId);
      return;
    }

    let sent = 0;

    for (const customer of audience) {
      try {
        let messageBody = campaign.template || "";

        // IA varies message per client to avoid spam patterns
        const varied = await openai.chat.completions.create({
          model: "gpt-4.1-mini", max_tokens: 200, temperature: 0.9,
          messages: [{ role: "system", content: "Reescreva mantendo o sentido, variando palavras e estrutura. Substitua {nome} pelo nome. Max 160 chars. Responda APENAS com a mensagem." },
            { role: "user", content: `Nome: ${customer.name || "Cliente"}\nMensagem: ${messageBody}` }],
        });
        messageBody = varied.choices[0]?.message?.content || messageBody;
        messageBody = messageBody.replace(/{nome}/g, customer.name?.split(" ")[0] || "");

        // Rodapé de opt-out (LGPD / boas práticas anti-ban no WhatsApp)
        messageBody += "\n\n_Responda SAIR para não receber mais mensagens._";

        // Send via WhatsApp internal API
        await wa.sendText(restaurantId, customer.phone, messageBody);

        await supabase.from("campaign_messages").insert({
          restaurant_id: restaurantId, campaign_id: campaignId, customer_id: customer.id,
          phone: customer.phone, message_body: messageBody, status: "sent", sent_at: new Date().toISOString(),
        });

        sent++;
        await new Promise((r) => setTimeout(r, 1000)); // 1msg/s throttle
      } catch (err) {
        console.error(`Campaign send error ${customer.phone}:`, err);
        await supabase.from("campaign_messages").insert({
          restaurant_id: restaurantId, campaign_id: campaignId, customer_id: customer.id,
          phone: customer.phone, status: "failed",
        });
      }
    }

    await supabase.from("campaigns").update({ status: "sent", sent_count: sent }).eq("id", campaignId);
    console.log(`Campaign ${campaignId}: ${sent}/${audience.length} sent`);
  }, { connection: redis, concurrency: 1 });

  console.log("Campaign worker started");
  return worker;
}

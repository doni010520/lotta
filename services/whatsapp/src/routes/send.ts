import type { FastifyInstance } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { getProvider } from "../providers";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET!;

export async function sendRoutes(app: FastifyInstance) {
  if (!process.env.INTERNAL_API_SECRET) {
    throw new Error('INTERNAL_API_SECRET is required');
  }

  // Auth: only internal services can call this
  app.addHook("onRequest", async (req, reply) => {
    const token = req.headers["x-internal-secret"];
    if (token !== INTERNAL_SECRET) return reply.status(401).send({ error: "Unauthorized" });
  });

  // POST /api/send/text — send text message to a customer
  app.post("/text", async (request, reply) => {
    const { restaurant_id, phone, text } = request.body as any;
    if (!restaurant_id || !phone || !text) return reply.status(400).send({ error: "Missing restaurant_id, phone, or text" });

    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .eq("status", "connected")
      .single();

    if (!instance) return reply.status(404).send({ error: "No connected WhatsApp instance" });

    const provider = getProvider({ provider: instance.provider, credentials: instance.credentials, externalId: instance.external_id });
    const { externalId } = await provider.sendText({ to: phone, text });

    // Find or create conversation + log message
    let { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("restaurant_id", restaurant_id)
      .eq("contact_phone", phone)
      .single();

    if (!conv) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ restaurant_id, instance_id: instance.id, contact_phone: phone, status: "bot" })
        .select("id")
        .single();
      conv = newConv;
    }

    if (conv) {
      await supabase.from("messages").insert({
        restaurant_id, conversation_id: conv.id, direction: "out",
        content_type: "text", body: text, external_id: externalId, sender_type: "system",
      });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conv.id);
    }

    return { sent: true, externalId };
  });

  // POST /api/send/media — send image/audio/video
  app.post("/media", async (request, reply) => {
    const { restaurant_id, phone, url, caption, kind } = request.body as any;
    if (!restaurant_id || !phone || !url) return reply.status(400).send({ error: "Missing fields" });

    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .eq("status", "connected")
      .single();

    if (!instance) return reply.status(404).send({ error: "No connected instance" });

    const provider = getProvider({ provider: instance.provider, credentials: instance.credentials, externalId: instance.external_id });
    const { externalId } = await provider.sendMedia({ to: phone, url, caption, kind: kind || "image" });

    return { sent: true, externalId };
  });

  // POST /api/send/template — send HSM template (Meta Cloud only)
  app.post("/template", async (request, reply) => {
    const { restaurant_id, phone, template_name, language, components } = request.body as any;

    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .eq("status", "connected")
      .single();

    if (!instance) return reply.status(404).send({ error: "No connected instance" });

    const provider = getProvider({ provider: instance.provider, credentials: instance.credentials, externalId: instance.external_id });

    if (provider.sendTemplate) {
      const { externalId } = await provider.sendTemplate({ to: phone, name: template_name, language: language || "pt_BR", components });
      return { sent: true, externalId };
    }

    // Fallback: Uazapi doesn't use templates, send as text
    return reply.status(400).send({ error: "Templates only available on Meta Cloud API" });
  });
}

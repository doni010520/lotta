import type { FastifyInstance } from "fastify";
import { handleInboundMessage } from "./inbound";
import type { InboundMessage } from "../providers/types";
import crypto from "crypto";

export async function webhookRoutes(app: FastifyInstance) {
  // ── UAZAPI webhook ──
  app.post("/uazapi", async (request, reply) => {
    const token = request.headers["x-webhook-token"] || (request.query as any)?.token;

    // P0-4: signature REQUIRED, not optional
    if (!process.env.UAZAPI_WEBHOOK_TOKEN) {
      app.log.warn("UAZAPI_WEBHOOK_TOKEN not set — rejecting all webhooks");
      return reply.status(500).send({ error: "Webhook token not configured" });
    }
    if (token !== process.env.UAZAPI_WEBHOOK_TOKEN) {
      return reply.status(401).send({ error: "Invalid webhook token" });
    }

    const body = request.body as any;

    if (body?.event === "message" || body?.event === "messages.upsert") {
      const data = body.data || body;
      const message = data.message || data;

      if (!message?.key?.remoteJid) return reply.send({ ok: true });
      if (message.key?.fromMe) return reply.send({ ok: true });

      const from = message.key.remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
      const pushName = message.pushName || "";

      let contentType: InboundMessage["contentType"] = "text";
      let msgBody: string | undefined;
      const msg = message.message || {};

      if (msg.conversation || msg.extendedTextMessage) {
        contentType = "text";
        msgBody = msg.conversation || msg.extendedTextMessage?.text;
      } else if (msg.imageMessage) { contentType = "image"; msgBody = msg.imageMessage.caption;
      } else if (msg.audioMessage) { contentType = "audio";
      } else if (msg.videoMessage) { contentType = "video"; msgBody = msg.videoMessage.caption;
      } else if (msg.documentMessage) { contentType = "document";
      } else if (msg.stickerMessage) { contentType = "sticker";
      } else if (msg.locationMessage) { contentType = "location"; }

      handleInboundMessage({
        channelExternalId: body.instance || "", from, contactName: pushName,
        contentType, body: msgBody, externalId: message.key?.id,
        timestamp: message.messageTimestamp?.toString(), fromMe: false,
      }).catch((err) => app.log.error({ err, from }, "UAZAPI inbound failed"));
    }

    return reply.send({ ok: true });
  });

  // ── Meta Cloud API webhook ──
  app.get("/meta", async (request, reply) => {
    const query = request.query as any;
    if (!process.env.META_VERIFY_TOKEN) return reply.status(500).send("META_VERIFY_TOKEN not set");
    if (query["hub.mode"] === "subscribe" && query["hub.verify_token"] === process.env.META_VERIFY_TOKEN) {
      return reply.send(query["hub.challenge"]);
    }
    return reply.status(403).send("Forbidden");
  });

  app.post("/meta", { config: { rawBody: true } }, async (request, reply) => {
    // P0-4: signature REQUIRED
    if (!process.env.META_APP_SECRET) {
      app.log.warn("META_APP_SECRET not set — rejecting webhooks");
      return reply.status(500).send({ error: "App secret not configured" });
    }

    const signature = request.headers["x-hub-signature-256"] as string;
    if (!signature) {
      return reply.status(401).send({ error: "Missing signature" });
    }

    // Validate over the RAW body bytes (fastify-raw-body popula request.rawBody)
    const rawBody = (request as any).rawBody
      ?? (typeof request.body === "string" ? request.body : JSON.stringify(request.body));
    const expected = "sha256=" + crypto
      .createHmac("sha256", process.env.META_APP_SECRET)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return reply.status(401).send({ error: "Invalid signature" });
    }

    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

    for (const entry of body?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        if (change.field !== "messages") continue;
        const value = change.value;

        for (const message of value?.messages ?? []) {
          const from = message.from;
          const contact = value.contacts?.find((c: any) => c.wa_id === from);

          let contentType: InboundMessage["contentType"] = "text";
          let msgBody: string | undefined;
          let mediaUrl: string | undefined;

          switch (message.type) {
            case "text": contentType = "text"; msgBody = message.text?.body; break;
            case "image": contentType = "image"; msgBody = message.image?.caption; mediaUrl = message.image?.id; break;
            case "audio": contentType = "audio"; mediaUrl = message.audio?.id; break;
            case "video": contentType = "video"; msgBody = message.video?.caption; break;
            case "document": contentType = "document"; break;
            case "sticker": contentType = "sticker"; break;
            case "location": contentType = "location"; break;
          }

          handleInboundMessage({
            channelExternalId: value.metadata?.phone_number_id || "", from,
            contactName: contact?.profile?.name, contentType, body: msgBody,
            mediaUrl, externalId: message.id, timestamp: message.timestamp, fromMe: false,
          }).catch((err) => app.log.error({ err, from }, "Meta inbound failed"));
        }
      }
    }

    return reply.send({ ok: true });
  });
}

import type { FastifyInstance } from "fastify";
import { handleInboundMessage } from "./inbound";
import type { InboundMessage } from "../providers/types";
import crypto from "crypto";

export async function webhookRoutes(app: FastifyInstance) {
  // ── UAZAPI webhook ──
  app.post("/uazapi", async (request, reply) => {
    const token = request.headers["x-webhook-token"] || (request.query as any)?.token;
    if (token && token !== process.env.UAZAPI_WEBHOOK_TOKEN) {
      return reply.status(401).send({ error: "Invalid token" });
    }

    const body = request.body as any;

    // Normalize UAZAPI payload → InboundMessage
    if (body?.event === "message" || body?.event === "messages.upsert") {
      const data = body.data || body;
      const message = data.message || data;

      if (!message?.key?.remoteJid) return reply.send({ ok: true });
      if (message.key?.fromMe) return reply.send({ ok: true });

      const from = message.key.remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
      const pushName = message.pushName || message.key?.participant || "";

      let contentType: InboundMessage["contentType"] = "text";
      let msgBody: string | undefined;
      let mediaUrl: string | undefined;

      const msg = message.message || {};

      if (msg.conversation || msg.extendedTextMessage) {
        contentType = "text";
        msgBody = msg.conversation || msg.extendedTextMessage?.text;
      } else if (msg.imageMessage) {
        contentType = "image";
        msgBody = msg.imageMessage.caption;
      } else if (msg.audioMessage) {
        contentType = "audio";
      } else if (msg.videoMessage) {
        contentType = "video";
        msgBody = msg.videoMessage.caption;
      } else if (msg.documentMessage) {
        contentType = "document";
      } else if (msg.stickerMessage) {
        contentType = "sticker";
      } else if (msg.locationMessage) {
        contentType = "location";
      }

      const inbound: InboundMessage = {
        channelExternalId: body.instance || "",
        from,
        contactName: pushName,
        contentType,
        body: msgBody,
        mediaUrl,
        externalId: message.key?.id,
        timestamp: message.messageTimestamp?.toString(),
        fromMe: false,
      };

      // Process async (don't block webhook)
      handleInboundMessage(inbound).catch((err) => {
        app.log.error({ err, from }, "Failed to handle UAZAPI message");
      });
    }

    return reply.send({ ok: true });
  });

  // ── Meta Cloud API webhook ──
  app.get("/meta", async (request, reply) => {
    const query = request.query as any;
    const verifyToken = process.env.META_VERIFY_TOKEN;

    if (query["hub.mode"] === "subscribe" && query["hub.verify_token"] === verifyToken) {
      return reply.send(query["hub.challenge"]);
    }
    return reply.status(403).send("Forbidden");
  });

  app.post("/meta", async (request, reply) => {
    // Verify signature
    const signature = request.headers["x-hub-signature-256"] as string;
    if (signature && process.env.META_APP_SECRET) {
      const raw = JSON.stringify(request.body);
      const expected = "sha256=" + crypto
        .createHmac("sha256", process.env.META_APP_SECRET)
        .update(raw)
        .digest("hex");

      if (signature !== expected) {
        return reply.status(401).send({ error: "Invalid signature" });
      }
    }

    const body = request.body as any;

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
            case "text":
              contentType = "text";
              msgBody = message.text?.body;
              break;
            case "image":
              contentType = "image";
              msgBody = message.image?.caption;
              mediaUrl = message.image?.id; // Will need downloadMedia to get URL
              break;
            case "audio":
              contentType = "audio";
              mediaUrl = message.audio?.id;
              break;
            case "video":
              contentType = "video";
              msgBody = message.video?.caption;
              break;
            case "document":
              contentType = "document";
              break;
            case "sticker":
              contentType = "sticker";
              break;
            case "location":
              contentType = "location";
              break;
          }

          const inbound: InboundMessage = {
            channelExternalId: value.metadata?.phone_number_id || "",
            from,
            contactName: contact?.profile?.name,
            contentType,
            body: msgBody,
            mediaUrl,
            externalId: message.id,
            timestamp: message.timestamp,
            fromMe: false,
          };

          handleInboundMessage(inbound).catch((err) => {
            app.log.error({ err, from }, "Failed to handle Meta message");
          });
        }
      }
    }

    return reply.send({ ok: true });
  });
}

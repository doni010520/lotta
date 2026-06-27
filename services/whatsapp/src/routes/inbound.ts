import { createClient } from "@supabase/supabase-js";
import { getProvider, type InboundMessage } from "../providers";
import { handleMessage } from "../agent";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

import IORedis from "ioredis";

// Debounce buffer via Redis (survives restart, works multi-instance)
const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
const DEBOUNCE_MS = parseInt(process.env.BOT_DEBOUNCE_MS || "5000");
const localTimers = new Map<string, NodeJS.Timeout>(); // timers still local but data in Redis

export async function handleInboundMessage(msg: InboundMessage) {
  if (msg.fromMe) return; // Ignore own messages (echo)

  // Find WhatsApp instance
  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("*, restaurants(id, name, slug)")
    .eq("external_id", msg.channelExternalId)
    .single();

  if (!instance) {
    console.error("No instance found for external_id:", msg.channelExternalId);
    return;
  }

  if (!instance.agent_enabled) return;

  const restaurant = (instance as any).restaurants;
  if (!restaurant) return;

  // Find or create conversation
  let { data: conversation } = await supabase
    .from("conversations")
    .select("id, status, customer_id")
    .eq("restaurant_id", restaurant.id)
    .eq("contact_phone", msg.from)
    .single();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        restaurant_id: restaurant.id,
        instance_id: instance.id,
        contact_phone: msg.from,
        contact_name: msg.contactName,
        status: "bot",
      })
      .select("id, status, customer_id")
      .single();
    conversation = newConv;
  }

  if (!conversation) return;

  // If conversation is in "human" mode, don't let bot respond
  if (conversation.status === "human") return;

  // Save inbound message
  await supabase.from("messages").insert({
    restaurant_id: restaurant.id,
    conversation_id: conversation.id,
    direction: "in",
    content_type: msg.contentType,
    body: msg.body,
    media_url: msg.mediaUrl,
    external_id: msg.externalId,
    sender_type: "contact",
  });

  // Opt-out de marketing: cliente responde SAIR/PARAR/STOP → desativa consentimento
  const optOutKeywords = ["sair", "parar", "stop", "cancelar", "descadastrar"];
  if (optOutKeywords.includes((msg.body || "").trim().toLowerCase())) {
    const phone = msg.from.replace(/\D/g, "");
    await supabase
      .from("customers")
      .update({ consent_marketing: false, opted_out_at: new Date().toISOString() })
      .eq("restaurant_id", restaurant.id)
      .eq("phone", phone);
    try {
      const provider = getProvider({
        provider: instance.provider,
        credentials: instance.credentials,
        externalId: instance.external_id,
      });
      await provider.sendText({ to: msg.from, text: "Pronto! Você não receberá mais mensagens de marketing. 👋" });
    } catch (err) { console.error("opt-out reply error:", err); }
    return; // não aciona o bot
  }

  // Update conversation
  await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      unread_count: (conversation as any).unread_count + 1,
      contact_name: msg.contactName || undefined,
      status: "bot",
    })
    .eq("id", conversation.id);

  // Debounce: buffer rapid messages
  const bufferKey = `${restaurant.id}:${msg.from}`;
  const messageText = msg.contentType === "audio"
    ? `[AUDIO:${msg.mediaUrl}]`
    : msg.body ?? "";

  // Push message to Redis list
  await redis.rpush(`debounce:${bufferKey}`, messageText);
  await redis.expire(`debounce:${bufferKey}`, 60); // TTL 60s safety

  // Clear existing timer
  const existingTimer = localTimers.get(bufferKey);
  if (existingTimer) clearTimeout(existingTimer);

  // Set new timer
  const timer = setTimeout(async () => {
    localTimers.delete(bufferKey);
    const messages = await redis.lrange(`debounce:${bufferKey}`, 0, -1);
    await redis.del(`debounce:${bufferKey}`);
    if (messages.length > 0) {
      processBuffered(instance, restaurant, conversation!, msg, messages);
    }
  }, DEBOUNCE_MS);
  localTimers.set(bufferKey, timer);
}

async function processBuffered(
  instance: any,
  restaurant: any,
  conversation: any,
  lastMsg: InboundMessage,
  messages: string[],
) {
  const provider = getProvider({
    provider: instance.provider,
    credentials: instance.credentials,
    externalId: instance.external_id,
  });

  // Handle audio: transcribe if present
  let combinedText = "";
  let mediaUrl: string | undefined;

  for (const m of messages) {
    if (m.startsWith("[AUDIO:")) {
      mediaUrl = m.replace("[AUDIO:", "").replace("]", "");
    } else {
      combinedText += (combinedText ? "\n" : "") + m;
    }
  }

  const contentType = mediaUrl && !combinedText ? "audio" : lastMsg.contentType;

  try {
    // Mark as read
    if (lastMsg.externalId) {
      await provider.markRead?.([lastMsg.externalId]);
    }

    const result = await handleMessage(
      {
        restaurantId: restaurant.id,
        agentName: instance.agent_name,
        agentPersona: instance.agent_persona,
        restaurantName: restaurant.name,
      },
      {
        conversationId: conversation.id,
        customerPhone: lastMsg.from,
        customerName: lastMsg.contactName,
      },
      contentType,
      combinedText || undefined,
      mediaUrl,
    );

    // Send response
    const { externalId } = await provider.sendText({
      to: lastMsg.from,
      text: result.text,
    });

    // Save outbound message
    await supabase.from("messages").insert({
      restaurant_id: restaurant.id,
      conversation_id: conversation.id,
      direction: "out",
      content_type: "text",
      body: result.text,
      external_id: externalId,
      sender_type: "bot",
    });

  } catch (err) {
    console.error("Agent error:", err);
  }
}

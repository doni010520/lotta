import type { ChannelProvider, SendTextParams, SendMediaParams, ConnectResult } from "./types";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

export class MetaProvider implements ChannelProvider {
  private phoneNumberId: string;
  private accessToken: string;

  constructor(credentials: Record<string, any>) {
    this.phoneNumberId = credentials.phone_number_id || "";
    this.accessToken = credentials.access_token || process.env.META_ACCESS_TOKEN || "";
  }

  private get baseUrl() {
    return `https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneNumberId}`;
  }

  private async request(path: string, body: any) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async connect(): Promise<ConnectResult> {
    return { status: "connected" };
  }

  async status() {
    try {
      const res = await fetch(this.baseUrl, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return res.ok ? "connected" as const : "disconnected" as const;
    } catch {
      return "disconnected" as const;
    }
  }

  async sendText(params: SendTextParams) {
    const data = await this.request("/messages", {
      messaging_product: "whatsapp",
      to: params.to,
      type: "text",
      text: { body: params.text },
      ...(params.replyId && { context: { message_id: params.replyId } }),
    });
    return { externalId: data?.messages?.[0]?.id };
  }

  async sendMedia(params: SendMediaParams) {
    const typeMap: Record<string, string> = {
      image: "image", video: "video", audio: "audio", document: "document", sticker: "sticker",
    };
    const mediaType = typeMap[params.kind] || "document";

    const data = await this.request("/messages", {
      messaging_product: "whatsapp",
      to: params.to,
      type: mediaType,
      [mediaType]: {
        link: params.url,
        ...(params.caption && mediaType !== "audio" && mediaType !== "sticker" && { caption: params.caption }),
      },
    });
    return { externalId: data?.messages?.[0]?.id };
  }

  async sendTemplate(params: { to: string; name: string; language: string; components?: unknown[] }) {
    const data = await this.request("/messages", {
      messaging_product: "whatsapp",
      to: params.to,
      type: "template",
      template: {
        name: params.name,
        language: { code: params.language },
        ...(params.components && { components: params.components }),
      },
    });
    return { externalId: data?.messages?.[0]?.id };
  }

  async downloadMedia(mediaId: string) {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const data = await res.json();
    return { url: data?.url, mimetype: data?.mime_type };
  }

  async markRead(externalIds: string[]) {
    for (const id of externalIds) {
      await this.request("/messages", {
        messaging_product: "whatsapp",
        status: "read",
        message_id: id,
      }).catch(() => {});
    }
  }
}

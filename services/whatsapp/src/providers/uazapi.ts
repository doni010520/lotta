import type { ChannelProvider, SendTextParams, SendMediaParams, ConnectResult } from "./types";

export class UazapiProvider implements ChannelProvider {
  private host: string;
  private token: string;
  private instance: string;

  constructor(credentials: Record<string, any>, externalId?: string) {
    this.host = credentials.host || process.env.UAZAPI_HOST || "";
    this.token = credentials.token || process.env.UAZAPI_ADMIN_TOKEN || "";
    this.instance = externalId || credentials.instance || "";
  }

  private async request(path: string, body?: any) {
    const url = `${this.host}/${this.instance}${path}`;
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async connect(phone?: string): Promise<ConnectResult> {
    if (phone) {
      const data = await this.request("/connect/code", { number: phone });
      return { status: "connecting", pairCode: data.code };
    }
    const data = await this.request("/connect/qr");
    return { status: "connecting", qrCode: data.qr };
  }

  async status() {
    try {
      const data = await this.request("/status");
      if (data.connected) return "connected" as const;
      return "disconnected" as const;
    } catch {
      return "disconnected" as const;
    }
  }

  async sendText(params: SendTextParams) {
    const data = await this.request("/message/send-text", {
      number: params.to,
      text: params.text,
      delay: "3000",
      ...(params.replyId && { quoted: params.replyId }),
    });
    return { externalId: data?.key?.id };
  }

  async sendMedia(params: SendMediaParams) {
    const endpoint = params.kind === "audio" ? "/message/send-audio" : "/message/send-media";
    const data = await this.request(endpoint, {
      number: params.to,
      url: params.url,
      caption: params.caption || "",
      type: params.kind,
      delay: "3000",
    });
    return { externalId: data?.key?.id };
  }

  async downloadMedia(externalId: string) {
    const data = await this.request("/message/download", { messageid: externalId });
    return { url: data?.url, mimetype: data?.mimetype };
  }

  async markRead(externalIds: string[]) {
    for (const id of externalIds) {
      await this.request("/message/read", { messageid: id }).catch(() => {});
    }
  }
}

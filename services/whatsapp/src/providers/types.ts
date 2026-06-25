export interface SendTextParams {
  to: string;
  text: string;
  replyId?: string;
}

export interface SendMediaParams {
  to: string;
  url: string;
  caption?: string;
  kind: "image" | "audio" | "video" | "document" | "sticker";
  replyId?: string;
}

export interface SendButtonsParams {
  to: string;
  text: string;
  buttons: { id: string; title: string }[];
}

export interface ConnectResult {
  status: "connected" | "disconnected" | "connecting";
  qrCode?: string;
  pairCode?: string;
}

export interface ChannelProvider {
  connect(phone?: string): Promise<ConnectResult>;
  status(): Promise<"connected" | "disconnected" | "connecting" | "banned">;
  sendText(params: SendTextParams): Promise<{ externalId?: string }>;
  sendMedia(params: SendMediaParams): Promise<{ externalId?: string }>;
  sendButtons?(params: SendButtonsParams): Promise<{ externalId?: string }>;
  sendTemplate?(params: { to: string; name: string; language: string; components?: unknown[] }): Promise<{ externalId?: string }>;
  downloadMedia?(externalId: string): Promise<{ url?: string; mimetype?: string }>;
  markRead?(externalIds: string[]): Promise<void>;
}

export interface InboundMessage {
  channelExternalId: string;
  from: string;
  contactName?: string;
  contentType: "text" | "image" | "audio" | "video" | "document" | "location" | "contact" | "sticker";
  body?: string;
  mediaUrl?: string;
  externalId?: string;
  timestamp?: string;
  fromMe?: boolean;
}

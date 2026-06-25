const WA_URL = process.env.WHATSAPP_INTERNAL_URL || "http://lotta_lotta-whatsapp:3003";
const SECRET = process.env.INTERNAL_API_SECRET;

async function internalPost(service: string, path: string, body: any) {
  if (!SECRET) throw new Error("INTERNAL_API_SECRET is required for internal service calls");
  const urls: Record<string, string> = {
    whatsapp: WA_URL,
  };
  const base = urls[service] || service;
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": SECRET },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const wa = {
  sendText: (restaurant_id: string, phone: string, text: string) =>
    internalPost("whatsapp", "/api/send/text", { restaurant_id, phone, text }),

  sendMedia: (restaurant_id: string, phone: string, url: string, caption?: string, kind?: string) =>
    internalPost("whatsapp", "/api/send/media", { restaurant_id, phone, url, caption, kind }),

  sendTemplate: (restaurant_id: string, phone: string, template_name: string, components?: any[]) =>
    internalPost("whatsapp", "/api/send/template", { restaurant_id, phone, template_name, components }),
};

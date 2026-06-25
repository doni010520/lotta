import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GoogleCreds { access_token: string; customer_id: string; developer_token: string; }
interface GMBCreds { access_token: string; account_id: string; location_id: string; }

async function gAdsApi(c: GoogleCreds, path: string, body?: any) {
  return fetch(`https://googleads.googleapis.com/v18/${path}`, { method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${c.access_token}`, "developer-token": c.developer_token, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d?.error?.message || "Google Ads API request failed"); return d; });
}
async function gmbApi(c: GMBCreds, path: string, opts: RequestInit = {}) {
  return fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${path}`, { ...opts,
    headers: { Authorization: `Bearer ${c.access_token}`, "Content-Type": "application/json", ...opts.headers } }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d?.error?.message || "Google My Business API request failed"); return d; });
}

export const googleAds = {
  async createCampaign(c: GoogleCreds, name: string, budgetMicros: number) {
    const b = await gAdsApi(c, `customers/${c.customer_id}/campaignBudgets:mutate`, { operations: [{ create: { name: `${name} Budget`, amountMicros: budgetMicros, deliveryMethod: "STANDARD" } }] });
    return gAdsApi(c, `customers/${c.customer_id}/campaigns:mutate`, { operations: [{ create: { name, advertisingChannelType: "SEARCH", status: "PAUSED", campaignBudget: b?.results?.[0]?.resourceName, biddingStrategy: { type: "MAXIMIZE_CONVERSIONS" } } }] });
  },
  async generateKeywords(type: string, city: string, bairro: string) {
    const r = await openai.chat.completions.create({ model: "gpt-4.1-mini", max_tokens: 300,
      messages: [{ role: "user", content: `15 keywords de busca local: "${type}" delivery "${bairro}, ${city}". JSON: ["kw1",...]` }] });
    try { return JSON.parse(r.choices[0]?.message?.content?.replace(/```json|```/g, "").trim() || "[]"); } catch { return []; }
  },
  async getMetrics(c: GoogleCreds, campaignId: string) {
    return gAdsApi(c, `customers/${c.customer_id}/googleAds:searchStream`, { query: `SELECT campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE campaign.id = ${campaignId}` });
  },
};

export const gmb = {
  async generateAndPost(c: GMBCreds, restaurantName: string, product: string, link: string) {
    const r = await openai.chat.completions.create({ model: "gpt-4.1-mini", max_tokens: 200,
      messages: [{ role: "user", content: `Post curto (max 150 chars) p/ Google Meu Negócio: "${restaurantName}" promovendo "${product}". Tom amigável.` }] });
    const summary = r.choices[0]?.message?.content || `${product} disponível no ${restaurantName}!`;
    return gmbApi(c, `${c.account_id}/${c.location_id}/localPosts`, { method: "POST",
      body: JSON.stringify({ summary, callToAction: { actionType: "ORDER", url: link }, topicType: "STANDARD" }) });
  },
  async getReviews(c: GMBCreds) { return gmbApi(c, `${c.account_id}/${c.location_id}/reviews`); },
  async replyReview(c: GMBCreds, reviewName: string, text: string, rating: number) {
    const r = await openai.chat.completions.create({ model: "gpt-4.1-mini", max_tokens: 200,
      messages: [{ role: "user", content: `Responda avaliação Google (${rating}★): "${text}". Tom profissional. Max 150 chars.` }] });
    return gmbApi(c, `${reviewName}/reply`, { method: "PUT", body: JSON.stringify({ comment: r.choices[0]?.message?.content || "Obrigado!" }) });
  },
  async syncHours(c: GMBCreds, periods: any[]) {
    return gmbApi(c, `${c.account_id}/${c.location_id}?updateMask=regularHours`, { method: "PATCH", body: JSON.stringify({ regularHours: { periods } }) });
  },
};

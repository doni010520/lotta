import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const GRAPH = process.env.META_GRAPH_VERSION || "v23.0";

interface MetaAdsCreds { access_token: string; ad_account_id: string; page_id: string; pixel_id?: string; }

async function graphApi(creds: MetaAdsCreds, path: string, opts: RequestInit = {}) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`https://graph.facebook.com/${GRAPH}${path}${sep}access_token=${creds.access_token}`, { ...opts, headers: { "Content-Type": "application/json", ...opts.headers } });
  return res.json();
}

export const metaAds = {
  async generateCreative(restaurantName: string, product: string, desc: string) {
    const r = await openai.chat.completions.create({ model: "gpt-4o", max_tokens: 300, temperature: 0.9,
      messages: [{ role: "user", content: `3 variações de copy (max 90 chars) para anúncio "${restaurantName}" - "${product}". JSON: ["c1","c2","c3"]` }] });
    try { return JSON.parse(r.choices[0]?.message?.content?.replace(/```json|```/g, "").trim() || "[]"); } catch { return ["Peça agora!"]; }
  },
  async createCampaign(creds: MetaAdsCreds, name: string, dailyBudget: number) {
    return graphApi(creds, `/act_${creds.ad_account_id}/campaigns`, { method: "POST",
      body: JSON.stringify({ name, objective: "OUTCOME_SALES", status: "PAUSED", special_ad_categories: ["NONE"], daily_budget: Math.round(dailyBudget * 100), bid_strategy: "LOWEST_COST_WITHOUT_CAP" }) });
  },
  async createAdSet(creds: MetaAdsCreds, campaignId: string, name: string, lat: number, lng: number, radiusKm: number) {
    return graphApi(creds, `/act_${creds.ad_account_id}/adsets`, { method: "POST",
      body: JSON.stringify({ name, campaign_id: campaignId, status: "PAUSED", billing_event: "IMPRESSIONS", optimization_goal: "OFFSITE_CONVERSIONS",
        targeting: { geo_locations: { custom_locations: [{ latitude: lat, longitude: lng, radius: radiusKm, distance_unit: "kilometer" }] }, age_min: 18, age_max: 65 },
        promoted_object: { pixel_id: creds.pixel_id, custom_event_type: "PURCHASE" } }) });
  },
  async createAd(creds: MetaAdsCreds, adSetId: string, name: string, imageHash: string, copy: string, link: string) {
    const cr = await graphApi(creds, `/act_${creds.ad_account_id}/adcreatives`, { method: "POST",
      body: JSON.stringify({ name: `CR-${name}`, object_story_spec: { page_id: creds.page_id, link_data: { image_hash: imageHash, link, message: copy, call_to_action: { type: "ORDER_NOW" } } } }) });
    return graphApi(creds, `/act_${creds.ad_account_id}/ads`, { method: "POST", body: JSON.stringify({ name, adset_id: adSetId, creative: { creative_id: cr.id }, status: "PAUSED" }) });
  },
  async getMetrics(creds: MetaAdsCreds, campaignId: string) {
    return graphApi(creds, `/${campaignId}/insights?fields=impressions,clicks,ctr,spend,actions,cost_per_action_type&date_preset=last_7d`);
  },
  async sendCAPIPurchase(creds: MetaAdsCreds, data: { phone?: string; value: number; orderId: string }) {
    if (!creds.pixel_id) return;
    const crypto = await import("crypto");
    const ph = data.phone ? crypto.createHash("sha256").update(data.phone).digest("hex") : undefined;
    return graphApi(creds, `/${creds.pixel_id}/events`, { method: "POST",
      body: JSON.stringify({ data: [{ event_name: "Purchase", event_time: Math.floor(Date.now() / 1000), event_id: data.orderId, user_data: { ph }, custom_data: { currency: "BRL", value: data.value } }] }) });
  },
};

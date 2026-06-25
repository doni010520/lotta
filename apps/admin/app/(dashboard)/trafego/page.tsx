"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function TrafegoPage() {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [metaCreds, setMetaCreds] = useState({ access_token: "", ad_account_id: "", page_id: "", pixel_id: "" });
  const [googleCreds, setGoogleCreds] = useState({ access_token: "", customer_id: "", developer_token: "" });
  const [gmbCreds, setGmbCreds] = useState({ access_token: "", account_id: "", location_id: "" });
  const [weeklyBudget, setWeeklyBudget] = useState(100);
  const [radius, setRadius] = useState(3);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("restaurants").select("id, metadata").limit(1).single().then(({ data }) => {
      if (data) {
        setRestaurant(data);
        const m = (data.metadata || {}) as any;
        if (m.meta_ads_creds) setMetaCreds(m.meta_ads_creds);
        if (m.google_ads_creds) setGoogleCreds(m.google_ads_creds);
        if (m.gmb_creds) setGmbCreds(m.gmb_creds);
        setWeeklyBudget(m.ads_weekly_budget ?? 100);
        setRadius(m.ads_radius_km ?? 3);
      }
    });
  }, []);

  async function save() {
    const metadata = { ...((restaurant?.metadata || {}) as any),
      meta_ads_creds: metaCreds, google_ads_creds: googleCreds, gmb_creds: gmbCreds,
      ads_weekly_budget: weeklyBudget, ads_radius_km: radius };
    await supabase.from("restaurants").update({ metadata }).eq("id", restaurant.id);
    toast.success("Configurações de tráfego salvas");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Tráfego Pago</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Meta Ads */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">📘 Meta Ads (Facebook/Instagram)</h2>
          <div className="space-y-3">
            <input value={metaCreds.ad_account_id} onChange={(e) => setMetaCreds({ ...metaCreds, ad_account_id: e.target.value })} placeholder="Ad Account ID (sem act_)" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={metaCreds.page_id} onChange={(e) => setMetaCreds({ ...metaCreds, page_id: e.target.value })} placeholder="Page ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={metaCreds.pixel_id} onChange={(e) => setMetaCreds({ ...metaCreds, pixel_id: e.target.value })} placeholder="Pixel ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={metaCreds.access_token} onChange={(e) => setMetaCreds({ ...metaCreds, access_token: e.target.value })} placeholder="Access Token" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Google Ads */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">🔍 Google Ads</h2>
          <div className="space-y-3">
            <input value={googleCreds.customer_id} onChange={(e) => setGoogleCreds({ ...googleCreds, customer_id: e.target.value })} placeholder="Customer ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={googleCreds.access_token} onChange={(e) => setGoogleCreds({ ...googleCreds, access_token: e.target.value })} placeholder="Access Token" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={googleCreds.developer_token} onChange={(e) => setGoogleCreds({ ...googleCreds, developer_token: e.target.value })} placeholder="Developer Token" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* GMB */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">📍 Google Meu Negócio</h2>
          <div className="space-y-3">
            <input value={gmbCreds.account_id} onChange={(e) => setGmbCreds({ ...gmbCreds, account_id: e.target.value })} placeholder="Account ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={gmbCreds.location_id} onChange={(e) => setGmbCreds({ ...gmbCreds, location_id: e.target.value })} placeholder="Location ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={gmbCreds.access_token} onChange={(e) => setGmbCreds({ ...gmbCreds, access_token: e.target.value })} placeholder="Access Token" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Campaign settings */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">⚙️ Configurações de campanha</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento semanal (R$)</label>
              <input type="number" value={weeklyBudget} onChange={(e) => setWeeklyBudget(parseInt(e.target.value))} min={100} step={50} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <p className="text-xs text-gray-400 mt-1">Mínimo R$100/semana. Dividido entre Meta + Google.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raio de segmentação (km)</label>
              <input type="number" value={radius} onChange={(e) => setRadius(parseFloat(e.target.value))} min={1} max={10} step={0.5} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button onClick={save} className="px-6 py-2.5 bg-paprica text-white rounded-lg text-sm font-medium hover:bg-paprica-dark">Salvar tudo</button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";

export default function MarketingPage() {
  const [pixelId, setPixelId] = useState("");
  const [ga4Id, setGa4Id] = useState("");
  const [gtmId, setGtmId] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("restaurants").select("metadata").limit(1).single().then(({ data }) => {
      const m = (data?.metadata || {}) as Record<string, any>;
      setPixelId(m.meta_pixel_id || "");
      setGa4Id(m.ga4_measurement_id || "");
      setGtmId(m.gtm_container_id || "");
      setLoading(false);
    });
  }, []);

  async function save() {
    const { error } = await supabase.from("restaurants").update({
      metadata: {
        meta_pixel_id: pixelId || null,
        ga4_measurement_id: ga4Id || null,
        gtm_container_id: gtmId || null,
      },
    }).not("id", "is", null); // updates all (RLS limits to own restaurant)

    if (error) toast.error(error.message);
    else toast.success("Tags de marketing salvas");
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Carregando...</div>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">Tags de marketing</h1>
      <p className="text-sm text-gray-500 mb-6">Os scripts são injetados automaticamente no cardápio digital do seu restaurante.</p>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meta Pixel ID</label>
          <input value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="Ex: 123456789012345" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <p className="text-xs text-gray-400 mt-1">Rastreamento de conversões Facebook/Instagram</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GA4 Measurement ID</label>
          <input value={ga4Id} onChange={(e) => setGa4Id(e.target.value)} placeholder="Ex: G-XXXXXXXXXX" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <p className="text-xs text-gray-400 mt-1">Google Analytics 4</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GTM Container ID</label>
          <input value={gtmId} onChange={(e) => setGtmId(e.target.value)} placeholder="Ex: GTM-XXXXXXX" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <p className="text-xs text-gray-400 mt-1">Google Tag Manager</p>
        </div>

        <button onClick={save} className="px-6 py-2.5 bg-paprica text-white rounded-lg text-sm font-medium hover:bg-paprica-dark">
          Salvar
        </button>
      </div>
    </div>
  );
}

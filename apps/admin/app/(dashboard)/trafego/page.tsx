"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  Facebook, Search, MapPin, Settings, Megaphone, Sparkles, RefreshCw,
  Eye, MousePointerClick, Wallet, Target, Play, Pause, Archive,
} from "lucide-react";

const CHANNEL_LABEL: Record<string, string> = { meta: "Meta", google: "Google", gmb: "Google Meu Negócio" };
const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  archived: "bg-gray-100 text-gray-400",
};
const STATUS_LABEL: Record<string, string> = { draft: "Rascunho", active: "Ativa", paused: "Pausada", archived: "Arquivada" };

export default function TrafegoPage() {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [metaCreds, setMetaCreds] = useState({ access_token: "", ad_account_id: "", page_id: "", pixel_id: "" });
  const [googleCreds, setGoogleCreds] = useState({ access_token: "", customer_id: "", developer_token: "" });
  const [gmbCreds, setGmbCreds] = useState({ access_token: "", account_id: "", location_id: "" });
  const [weeklyBudget, setWeeklyBudget] = useState(100);
  const [radius, setRadius] = useState(3);
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const supabase = createClient();

  async function token() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async function loadCampaigns() {
    const { data } = await supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false });
    setCampaigns(data ?? []);
  }

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
        setAdsEnabled(!!m.ads_enabled);
      }
    });
    loadCampaigns();
  }, []);

  async function save() {
    const metadata = { ...((restaurant?.metadata || {}) as any),
      meta_ads_creds: metaCreds, google_ads_creds: googleCreds, gmb_creds: gmbCreds,
      ads_weekly_budget: weeklyBudget, ads_radius_km: radius, ads_enabled: adsEnabled };
    await supabase.from("restaurants").update({ metadata }).eq("id", restaurant.id);
    toast.success("Configurações de tráfego salvas");
  }

  async function generateCampaign(channel: string) {
    setGenerating(true);
    try {
      await api("/api/ads/campaigns", {
        method: "POST",
        body: JSON.stringify({ channel, daily_budget: Math.round((weeklyBudget / 7) * 100) / 100 }),
        token: await token(),
      });
      toast.success("Campanha criada pela IA");
      await loadCampaigns();
    } catch (err: any) {
      toast.error(err.message || "Falha ao criar campanha");
    } finally {
      setGenerating(false);
    }
  }

  async function refreshMetrics(id: string) {
    try {
      await api(`/api/ads/campaigns/${id}/refresh`, { method: "POST", token: await token() });
      toast.success("Métricas sincronizadas");
      await loadCampaigns();
    } catch (err: any) {
      toast.error(err.message || "Falha ao sincronizar");
    }
  }

  async function setStatus(id: string, status: string) {
    await supabase.from("ad_campaigns").update({ status }).eq("id", id);
    await loadCampaigns();
  }

  // Métricas agregadas (dashboard)
  const totals = campaigns.reduce(
    (acc, c) => {
      const m = c.metrics || {};
      acc.impressions += Number(m.impressions || 0);
      acc.clicks += Number(m.clicks || 0);
      acc.spend += Number(m.spend || 0);
      acc.conversions += Number(m.conversions || 0);
      return acc;
    },
    { impressions: 0, clicks: 0, spend: 0, conversions: 0 },
  );

  const kpis = [
    { label: "Impressões", value: totals.impressions.toLocaleString("pt-BR"), icon: Eye },
    { label: "Cliques", value: totals.clicks.toLocaleString("pt-BR"), icon: MousePointerClick },
    { label: "Investido (7d)", value: formatCurrency(totals.spend), icon: Wallet },
    { label: "Conversões", value: totals.conversions.toLocaleString("pt-BR"), icon: Target },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cafe mb-1">Tráfego Pago</h1>
      <p className="text-sm text-muted mb-6">A IA cria e otimiza seus anúncios toda semana.</p>

      {/* Dashboard de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 max-w-5xl">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <k.icon className="w-4 h-4" /> {k.label}
            </div>
            <p className="text-xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Campanhas */}
      <div className="bg-white rounded-xl border p-6 mb-6 max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2"><Megaphone className="w-5 h-5 text-paprica" /> Campanhas</h2>
          <button
            onClick={() => generateCampaign("meta")}
            disabled={generating || !adsEnabled}
            title={!adsEnabled ? "Ative o tráfego nas configurações abaixo" : ""}
            className="inline-flex items-center gap-2 px-4 py-2 bg-paprica text-white rounded-lg text-sm font-medium hover:bg-paprica-dark disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" /> {generating ? "Gerando..." : "Gerar campanha com IA"}
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            Nenhuma campanha ainda. Configure as credenciais, ative o tráfego e clique em &quot;Gerar campanha com IA&quot;.
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const m = c.metrics || {};
              return (
                <div key={c.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                        <span className="text-xs text-gray-400">{CHANNEL_LABEL[c.channel]}</span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Orçamento {formatCurrency(c.daily_budget)}/dia
                        {c.last_optimized_at && ` · otimizada ${new Date(c.last_optimized_at).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => refreshMetrics(c.id)} title="Sincronizar métricas" className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      {c.status !== "active" && c.status !== "archived" && (
                        <button onClick={() => setStatus(c.id, "active")} title="Ativar" className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {c.status === "active" && (
                        <button onClick={() => setStatus(c.id, "paused")} title="Pausar" className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg">
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {c.status !== "archived" && (
                        <button onClick={() => setStatus(c.id, "archived")} title="Arquivar" className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50">
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Criativos gerados pela IA */}
                  {Array.isArray(c.creatives) && c.creatives.length > 0 && (
                    <div className="mt-3 grid sm:grid-cols-3 gap-2">
                      {c.creatives.map((cr: any, i: number) => (
                        <div key={i} className={`text-xs p-2 rounded-lg border ${cr.active ? "border-paprica bg-paprica/5" : "border-gray-200 text-muted"}`}>
                          {cr.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Métricas da campanha */}
                  {(m.impressions || m.clicks || m.spend) ? (
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                      <span>{Number(m.impressions || 0).toLocaleString("pt-BR")} impressões</span>
                      <span>{Number(m.clicks || 0).toLocaleString("pt-BR")} cliques</span>
                      <span>CTR {Number(m.ctr || 0).toFixed(2)}%</span>
                      <span>{formatCurrency(Number(m.spend || 0))} investido</span>
                      <span>{Number(m.conversions || 0)} conversões</span>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-gray-400">Sem métricas ainda — publique na plataforma e sincronize.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Configurações + credenciais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Configurações de campanha */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-muted" /> Configurações de campanha</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-gray-700">Tráfego automático ativado</span>
              <input type="checkbox" checked={adsEnabled} onChange={(e) => setAdsEnabled(e.target.checked)} className="h-4 w-4 accent-paprica" />
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento semanal (R$)</label>
              <input type="number" value={weeklyBudget} onChange={(e) => setWeeklyBudget(parseInt(e.target.value))} min={70} step={10} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <p className="text-xs text-gray-400 mt-1">~{formatCurrency(weeklyBudget / 7)}/dia. Dividido entre Meta + Google.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raio de segmentação (km)</label>
              <input type="number" value={radius} onChange={(e) => setRadius(parseFloat(e.target.value))} min={1} max={10} step={0.5} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Meta Ads */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Facebook className="w-5 h-5 text-[#1877F2]" /> Meta Ads (Facebook/Instagram)</h2>
          <div className="space-y-3">
            <input value={metaCreds.ad_account_id} onChange={(e) => setMetaCreds({ ...metaCreds, ad_account_id: e.target.value })} placeholder="Ad Account ID (sem act_)" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={metaCreds.page_id} onChange={(e) => setMetaCreds({ ...metaCreds, page_id: e.target.value })} placeholder="Page ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={metaCreds.pixel_id} onChange={(e) => setMetaCreds({ ...metaCreds, pixel_id: e.target.value })} placeholder="Pixel ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={metaCreds.access_token} onChange={(e) => setMetaCreds({ ...metaCreds, access_token: e.target.value })} placeholder="Access Token" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Google Ads */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-[#4285F4]" /> Google Ads</h2>
          <div className="space-y-3">
            <input value={googleCreds.customer_id} onChange={(e) => setGoogleCreds({ ...googleCreds, customer_id: e.target.value })} placeholder="Customer ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={googleCreds.access_token} onChange={(e) => setGoogleCreds({ ...googleCreds, access_token: e.target.value })} placeholder="Access Token" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={googleCreds.developer_token} onChange={(e) => setGoogleCreds({ ...googleCreds, developer_token: e.target.value })} placeholder="Developer Token" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* GMB */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-[#34A853]" /> Google Meu Negócio</h2>
          <div className="space-y-3">
            <input value={gmbCreds.account_id} onChange={(e) => setGmbCreds({ ...gmbCreds, account_id: e.target.value })} placeholder="Account ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={gmbCreds.location_id} onChange={(e) => setGmbCreds({ ...gmbCreds, location_id: e.target.value })} placeholder="Location ID" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={gmbCreds.access_token} onChange={(e) => setGmbCreds({ ...gmbCreds, access_token: e.target.value })} placeholder="Access Token" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button onClick={save} className="px-6 py-2.5 bg-paprica text-white rounded-lg text-sm font-medium hover:bg-paprica-dark">Salvar configurações</button>
      </div>
    </div>
  );
}

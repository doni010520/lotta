"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { Wifi, WifiOff, QrCode, Bot } from "lucide-react";

export default function WhatsAppPage() {
  const [instance, setInstance] = useState<any>(null);
  const [provider, setProvider] = useState<"uazapi" | "meta_cloud">("uazapi");
  const [agentName, setAgentName] = useState("Assistente");
  const [agentPersona, setAgentPersona] = useState("Você é um assistente simpático e eficiente.");
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("whatsapp_instances").select("*").limit(1).single().then(({ data }) => {
      if (data) {
        setInstance(data);
        setProvider(data.provider);
        setAgentName(data.agent_name);
        setAgentPersona(data.agent_persona);
        setAgentEnabled(data.agent_enabled);
        setCreds(data.credentials || {});
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    const payload = {
      provider,
      agent_name: agentName,
      agent_persona: agentPersona,
      agent_enabled: agentEnabled,
      credentials: creds,
    };

    if (instance) {
      await supabase.from("whatsapp_instances").update(payload).eq("id", instance.id);
    } else {
      const { data } = await supabase.from("whatsapp_instances").insert(payload).select().single();
      setInstance(data);
    }
    toast.success("Configuração salva");
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Carregando...</div>;

  const isConnected = instance?.status === "connected";

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cafe mb-6">WhatsApp</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection status */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-4">
            {isConnected ? (
              <Wifi className="w-6 h-6 text-green-500" />
            ) : (
              <WifiOff className="w-6 h-6 text-paprica/60" />
            )}
            <div>
              <p className="font-medium">{isConnected ? "Conectado" : "Desconectado"}</p>
              {instance?.phone_number && (
                <p className="text-sm text-muted">{instance.phone_number}</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Provedor</label>
            <select
              value={provider}
              onChange={(e) => { setProvider(e.target.value as any); setCreds({}); }}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="uazapi">Uazapi (não-oficial, QR Code)</option>
              <option value="meta_cloud">Meta Cloud API (oficial)</option>
            </select>
          </div>

          {provider === "uazapi" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted mb-1">Host da instância</label>
                <input
                  value={creds.host || ""}
                  onChange={(e) => setCreds({ ...creds, host: e.target.value })}
                  placeholder="https://uazapi.benitechlab.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Token admin</label>
                <input
                  type="password"
                  value={creds.token || ""}
                  onChange={(e) => setCreds({ ...creds, token: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Nome da instância</label>
                <input
                  value={creds.instance || ""}
                  onChange={(e) => setCreds({ ...creds, instance: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {qrCode && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted mb-2">Escaneie o QR Code no WhatsApp</p>
                  <img src={qrCode} alt="QR Code" className="mx-auto w-48 h-48 border rounded-lg" />
                </div>
              )}
            </div>
          )}

          {provider === "meta_cloud" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted mb-1">Phone Number ID</label>
                <input
                  value={creds.phone_number_id || ""}
                  onChange={(e) => setCreds({ ...creds, phone_number_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Access Token</label>
                <input
                  type="password"
                  value={creds.access_token || ""}
                  onChange={(e) => setCreds({ ...creds, access_token: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">WABA ID</label>
                <input
                  value={creds.waba_id || ""}
                  onChange={(e) => setCreds({ ...creds, waba_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Agent config */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bot className="w-6 h-6 text-purple-500" />
            <p className="font-medium">Agente IA</p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={agentEnabled}
                onChange={(e) => setAgentEnabled(e.target.checked)}
                className="rounded"
              />
              Agente IA ativo (responde automaticamente)
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do agente</label>
              <input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Ex: Sofia, Bia, Assistente..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">O nome que o agente usa para se apresentar</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personalidade e tom</label>
              <textarea
                value={agentPersona}
                onChange={(e) => setAgentPersona(e.target.value)}
                rows={5}
                placeholder="Descreva como o agente deve se comportar, o tom de voz, regras especiais..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Ex: "Seja informal e use emojis. Sempre sugira a sobremesa do dia. Não ofereça desconto sem pedir."
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={save}
          className="px-6 py-2.5 bg-paprica text-white rounded-lg text-sm font-medium hover:bg-paprica-dark"
        >
          Salvar configurações
        </button>
      </div>

      {/* Webhook URLs */}
      <div className="mt-6 bg-gray-50 rounded-xl border p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">URLs de webhook (configure no provedor)</p>
        <div className="space-y-1 text-xs text-muted font-mono">
          <p>Uazapi: POST {process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.seudominio.com"}/webhooks/uazapi</p>
          <p>Meta: GET/POST {process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.seudominio.com"}/webhooks/meta</p>
        </div>
      </div>
    </div>
  );
}

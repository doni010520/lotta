const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type EventType = "view_menu" | "view_product" | "add_to_cart" | "begin_checkout";

// Sessão anônima estável por navegador (para o funil de conversão)
function sessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("lotta_sid");
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("lotta_sid", id);
    }
    return id;
  } catch {
    return "";
  }
}

// Telemetria best-effort — nunca quebra o fluxo do cliente
export function trackEvent(slug: string, type: EventType, productId?: string) {
  if (typeof window === "undefined" || !slug) return;
  const body = JSON.stringify({ restaurant_slug: slug, session_id: sessionId(), type, product_id: productId ?? null });
  try {
    const url = `${API_URL}/api/public/events`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } else {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

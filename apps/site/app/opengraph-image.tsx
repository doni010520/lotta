import { ImageResponse } from "next/og";

// Imagem que aparece ao compartilhar o link (WhatsApp, redes, etc.) — gerada no build.
export const alt = "Lotta — seu delivery lota quando o cliente é seu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#2A1410",
          padding: 90,
        }}
      >
        <div style={{ display: "flex", fontSize: 46, fontWeight: 700 }}>
          <span style={{ color: "#ffffff" }}>Lotta</span>
          <span style={{ color: "#FFC53D" }}>.</span>
        </div>
        <div style={{ display: "flex", fontSize: 78, fontWeight: 800, color: "#ffffff", lineHeight: 1.05, marginTop: 28, maxWidth: 940 }}>
          A solução que lota o seu delivery.
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#FFB7A8", marginTop: 28, maxWidth: 860 }}>
          Cardápio digital, IA no WhatsApp, fidelidade e tráfego — sem taxa por pedido.
        </div>
        <div style={{ display: "flex", marginTop: 44, height: 8, width: 130, background: "#E5402A", borderRadius: 100 }} />
      </div>
    ),
    { ...size },
  );
}

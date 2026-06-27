import type { Metadata } from "next";
import { Space_Grotesk, Manrope, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display", display: "swap" });
const sans = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans", display: "swap" });
const mono = Spline_Sans_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Lotta — Seu delivery lota quando o cliente é seu",
  description:
    "Plataforma SaaS de delivery para restaurantes: cardápio digital, atendimento com IA no WhatsApp, CRM, fidelidade e tráfego pago — sem taxa por pedido.",
  openGraph: {
    title: "Lotta — Seu delivery lota quando o cliente é seu",
    description: "Do pedido à fidelização, o Lotta cuida de tudo. Seu cliente compra mais, volta sempre e é seu — não do app.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans text-body antialiased">{children}</body>
    </html>
  );
}

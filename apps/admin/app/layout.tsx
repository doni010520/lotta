import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lotta — Painel",
  description: "Lotta — a solução que lota o seu delivery",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-creme text-body antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

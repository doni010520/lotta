import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cardápio Digital",
  description: "Faça seu pedido online",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-creme text-body antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

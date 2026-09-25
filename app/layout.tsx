import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: "Galeteria RC | Pedidos Online",
  description:
    "Frango assado e acompanhamentos feitos na brasa. Monte seu pedido e acompanhe o preparo.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}<Toaster richColors position="bottom-right"/></body>
    </html>
  );
}

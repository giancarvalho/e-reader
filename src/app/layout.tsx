import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource-variable/newsreader";
import "@/design-system/tokens/base.css";
import { UpdateNotice } from "@/features/diagnostics";
import { messages } from "@/lib/messages/pt-br";

export const metadata: Metadata = {
  title: messages.title,
  description: messages.description,
  appleWebApp: { capable: true, title: messages.title },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF5EC" },
    { media: "(prefers-color-scheme: dark)", color: "#17130F" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="auto">
      <body><UpdateNotice />{children}</body>
    </html>
  );
}

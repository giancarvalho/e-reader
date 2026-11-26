import type { MetadataRoute } from "next";
import { messages } from "../lib/messages/pt-br";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: messages.title,
    short_name: messages.title,
    description: messages.description,
    lang: "pt-BR",
    start_url: "/estante",
    scope: "/",
    display: "standalone",
    background_color: "#FAF5EC",
    theme_color: "#FAF5EC",
    icons: [
      { src: "/icons/book-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/book-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}

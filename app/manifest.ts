import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MYKuantan — An Editorial Celebration of Kuantan, Pahang",
    short_name: "MYKuantan",
    description:
      "A luxury travel lookbook celebrating Kuantan, Pahang, Malaysia — modern print-magazine feel, elegant typography, and generous breathing room.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FAF8F5",
    theme_color: "#0F3460",
    categories: ["travel", "lifestyle", "photography"],
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

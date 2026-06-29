import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MYKuantan Lookbook",
    short_name: "MYKuantan",
    description:
      "An editorial lookbook tracing light, tide, and tradition across Kuantan.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "194x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x517",
        type: "image/png",
      },
    ],
  };
}

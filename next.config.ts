import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";
import type { RuntimeCaching } from "workbox-build";

const runtimeCaching: RuntimeCaching[] = [
  {
    urlPattern: /^\/_next\/static\//,
    handler: "CacheFirst",
    options: {
      cacheName: "next-static-assets",
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      },
    },
  },
  {
    urlPattern: /\.(?:eot|otf|ttf|woff|woff2|css)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-resources",
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      },
    },
  },
  {
    urlPattern: /\.(?:png|jpg|jpeg|gif|webp|svg|ico|avif)$/i,
    handler: "CacheFirst",
    options: {
      cacheName: "lookbook-images",
      expiration: {
        maxEntries: 150,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      },
    },
  },
  {
    urlPattern: /^https:\/\/server\.arcgisonline\.com\//i,
    handler: "CacheFirst",
    options: {
      cacheName: "esri-map-tiles",
      expiration: {
        maxEntries: 250,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: /^https:\/\/tile\.openstreetmap\.org\//i,
    handler: "CacheFirst",
    options: {
      cacheName: "osm-map-tiles",
      expiration: {
        maxEntries: 250,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: true,
    runtimeCaching,
  },
})(nextConfig);

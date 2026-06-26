import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import UploadModalProvider from "@/components/UploadModalProvider";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MYKuantan — An Editorial Celebration of Kuantan, Pahang",
  description:
    "A luxury travel lookbook celebrating Kuantan, Pahang, Malaysia — modern print-magazine feel, elegant typography, and generous breathing room.",
  openGraph: {
    title: "MYKuantan — An Editorial Celebration of Kuantan, Pahang",
    description:
      "A luxury travel lookbook celebrating Kuantan, Pahang, Malaysia.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="antialiased w-full min-h-screen bg-[#F5F0E8] text-stone-900 m-0 p-0">
        <UploadModalProvider>{children}</UploadModalProvider>
      </body>
    </html>
  );
}
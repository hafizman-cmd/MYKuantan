import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Gallery from "@/components/Gallery";
import { fetchAllPhotos } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Frames of Kuantan — Gallery | MYKuantan",
  description:
    "A two-tier lookbook of Kuantan: a scroll-linked atlas pinned to the map, and a filterable archive of every approved frame from Teluk Cempedak, Cherating, Sungai Lembing, and Pantai Sepat.",
};

export default async function GalleryPage() {
  const allPhotos = await fetchAllPhotos();

  return (
    <div className="w-full min-h-screen flex flex-col items-stretch justify-start bg-[#0F3460] overflow-x-hidden">
      <Navbar />
      <main className="w-full flex flex-col items-stretch justify-start flex-1 pt-20 md:pt-24">
        <Gallery photos={allPhotos} />
      </main>
      <Footer />
    </div>
  );
}
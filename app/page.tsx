import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import KuantanChronicles from "@/components/KuantanChronicles";
import VisitGalleryShell from "@/components/VisitGalleryShell";
import Footer from "@/components/Footer";
import { fetchLatestPhotos, fetchAllPhotos } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [latestPhotos, allPhotos] = await Promise.all([
    fetchLatestPhotos(5),
    fetchAllPhotos(),
  ]);

  return (
    <div className="w-full min-h-screen flex flex-col items-stretch justify-start bg-[#F5F0E8] overflow-x-hidden">
      <Navbar />
      <main className="w-full flex flex-col items-stretch justify-start flex-1 pt-20 md:pt-24">
        <Hero latestPhotos={latestPhotos} />
        <KuantanChronicles />
        <VisitGalleryShell photos={allPhotos} />
      </main>
      <Footer />
    </div>
  );
}
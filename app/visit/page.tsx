import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VisitTracks from "@/components/VisitTracks";
import { fetchAllPhotos } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function VisitPage() {
  const allPhotos = await fetchAllPhotos();

  return (
    <div className="w-full min-h-screen flex flex-col items-stretch justify-start bg-[#F5F0E8] overflow-x-hidden">
      <Navbar />
      <main className="w-full flex flex-col items-stretch justify-start flex-1 pt-20 md:pt-24">
        <VisitTracks photos={allPhotos} />
      </main>
      <Footer />
    </div>
  );
}
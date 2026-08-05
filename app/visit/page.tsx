import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VisitGalleryShell from "@/components/VisitGalleryShell";
import { fetchAllPhotos } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function VisitPage() {
  const allPhotos = await fetchAllPhotos();

  return (
    <div className="w-full min-h-screen flex flex-col items-stretch justify-start bg-[#0F3460] overflow-x-hidden">
      <Navbar />
      <main className="w-full flex flex-col items-stretch justify-start flex-1">
        <VisitGalleryShell photos={allPhotos} />
      </main>
      <Footer />
    </div>
  );
}
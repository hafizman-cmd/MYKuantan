import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import KuantanChronicles from "@/components/KuantanChronicles";

export const dynamic = "force-dynamic";

export default function StoriesPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-stretch justify-start bg-[#0F3460] overflow-x-hidden">
      <Navbar />
      <main className="w-full flex flex-col items-stretch justify-start flex-1">
        <KuantanChronicles />
      </main>
      <Footer />
    </div>
  );
}
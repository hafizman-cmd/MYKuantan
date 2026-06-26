import Image from "next/image";
import type { Photo } from "@/types/photo";

interface GalleryProps {
  photos: Photo[];
}

export default function Gallery({ photos }: GalleryProps) {
  return (
    <section id="gallery" className="w-full overflow-hidden block bg-[#0F3460]">
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-16 py-20 md:py-28">
        <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center mx-auto mb-12">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F5F0E8]/25 bg-white/5 px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-[#F5F0E8]/80 backdrop-blur-md">
            The Archive
          </span>
          <h2 className="font-display text-[#F5F0E8] text-4xl md:text-6xl font-extrabold leading-[0.95] tracking-tight">
            Frames of Pahang
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#F5F0E8]/70 font-light">
            A curated grid of approved submissions — each frame caged in
            strict aspect ratios so the page reads edge to edge.
          </p>
        </div>

        {photos.length === 0 ? (
          <p className="text-center text-[#F5F0E8]/60 py-16 font-light">
            No photos approved yet. Be the first to submit.
          </p>
        ) : (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo, i) => (
              <figure
                key={photo.id}
                className="group relative w-full aspect-[4/5] rounded-[2rem] overflow-hidden bg-[#1A4A7A]"
              >
                <Image
                  src={photo.image_url}
                  alt={photo.caption || photo.location}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="w-full h-full object-cover rounded-[2rem] transition-transform duration-[1.4s] ease-out group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <figcaption className="absolute left-5 right-5 bottom-5 flex flex-col gap-2">
                  <span className="inline-flex w-fit items-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#F5F0E8] font-medium break-words whitespace-normal leading-relaxed max-w-[85%]">
                    {photo.location}
                  </span>
                  <p className="font-display text-[#F5F0E8] text-xl md:text-2xl font-semibold leading-tight break-words whitespace-normal leading-relaxed max-w-[85%]">
                    {photo.caption}
                  </p>
                  <span className="text-[#F5F0E8]/70 text-xs tracking-wide break-words whitespace-normal leading-relaxed max-w-[85%]">
                    by {photo.photographer}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
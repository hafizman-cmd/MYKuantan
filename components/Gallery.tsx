"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { Photo } from "@/types/photo";

const EditorialMap = dynamic(() => import("./EditorialMap"), {
  ssr: false,
});

interface GalleryProps {
  photos: Photo[];
}

export default function Gallery({
  photos,
}: GalleryProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [activeLocation, setActiveLocation] = useState<string | null>(
    photos[0]?.location ?? null
  );

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || photos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const location = (visible[0].target as HTMLElement).dataset.photoLocation;
        if (location) setActiveLocation(location);
      },
      {
        root,
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0, 0.15, 0.3, 0.5, 0.75, 1],
      }
    );

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [photos]);

  const setCardRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      cardRefs.current.set(id, el);
    },
    []
  );

  return (
    <section id="gallery" className="w-full overflow-hidden block bg-[#0F3460]">
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-16 pt-20 md:pt-28 pb-8 md:pb-12">
        <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center mx-auto">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F5F0E8]/25 bg-white/5 px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-[#F5F0E8]/80 backdrop-blur-md">
            The Archive
          </span>
          <h2 className="font-display text-[#F5F0E8] text-4xl md:text-6xl font-extrabold leading-[0.95] tracking-tight">
            Frames of Pahang
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#F5F0E8]/70 font-light">
            A scroll-linked atlas — each frame pins its light on the dark map
            of Kuantan.
          </p>
        </div>
      </div>

      <div className="w-full max-w-[1600px] mx-auto">
        <div className="flex flex-col md:grid md:grid-cols-2">
          <div className="order-2 md:order-1 relative h-[60vh] md:h-screen">
            <div
              ref={scrollRef}
              className="h-full overflow-y-auto px-6 md:px-10 lg:px-16 py-12 md:py-20"
            >
              {photos.length === 0 ? (
                <p className="text-center text-[#F5F0E8]/60 py-16 font-light">
                  No photos approved yet. Be the first to submit.
                </p>
              ) : (
                <div className="flex flex-col gap-8 md:gap-10 pt-2 pb-12 md:pb-20">
                  {photos.map((photo) => {
                  const isSelected = activeLocation === photo.location;
                  return (
                    <div
                      key={photo.id}
                      data-photo-location={photo.location}
                      ref={setCardRef(photo.id)}
                      onClick={() => setActiveLocation(photo.location)}
                      className={`group relative w-full rounded-[2rem] overflow-hidden bg-[#1A4A7A] cursor-pointer transition-all duration-300 transform hover:scale-[1.01] ${
                        isSelected
                          ? "ring-2 ring-amber-400 shadow-[0_24px_80px_rgba(0,0,0,0.4)]"
                          : "ring-1 ring-white/5"
                      }`}
                    >
                      <div className="relative w-full aspect-[4/5] md:aspect-[3/4]">
                        <Image
                          src={photo.image_url}
                          alt={photo.caption || photo.location}
                          fill
                          loading="lazy"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="w-full h-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-105"
                        />
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <figcaption className="absolute left-5 right-5 bottom-5 flex flex-col gap-2">
                          <span className="inline-flex w-fit items-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#F5F0E8] font-medium break-words whitespace-normal leading-relaxed max-w-[85%]">
                            {photo.location}
                          </span>
                          <p className="font-display text-[#F5F0E8] text-xl md:text-2xl font-semibold leading-tight break-words whitespace-normal max-w-[85%]">
                            {photo.caption}
                          </p>
                          <span className="text-[#F5F0E8]/70 text-xs tracking-wide break-words whitespace-normal leading-relaxed max-w-[85%]">
                            by {photo.photographer}
                          </span>
                        </figcaption>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
            <div
              aria-hidden
              className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-[#0F3460] to-transparent z-10 pointer-events-none"
            />
            <div
              aria-hidden
              className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#0F3460] to-transparent z-10 pointer-events-none"
            />
          </div>

          <div className="order-1 md:order-2 md:sticky md:top-6 w-full p-4 md:p-6 lg:p-8">
            <EditorialMap
              photos={photos}
              activeLocation={activeLocation}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Photo } from "@/types/photo";

interface HeroProps {
  latestPhotos: Photo[];
}

export default function Hero({ latestPhotos }: HeroProps) {
  const slides = latestPhotos.slice(0, 5);
  const [active, setActive] = useState(0);

  return (
    <section id="lookbook" className="w-full overflow-hidden block">
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-16 pt-44 md:pt-52 pb-20 md:pb-28">
        <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center mx-auto mb-12">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0F3460]/20 bg-white/40 px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-[#0F3460] backdrop-blur-md">
            Pahang · Malaysia · 3.5°N
          </span>
          <h1 className="font-display text-stone-900 text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight">
            Where the Sea
            <br />
            <span className="italic text-[#0F3460] font-semibold">Remembers.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base md:text-lg leading-relaxed text-stone-600 font-light">
            An editorial lookbook tracing light, tide, and tradition across
            Kuantan — the quiet capital of Pahang, where the South China Sea
            outlines every silhouette.
          </p>
        </div>

        {/* Horizontal Accordion Slider */}
        <div className="w-full flex h-[60vh] min-h-[440px] md:h-[72vh] md:min-h-[560px] gap-3 md:gap-4">
          {slides.map((photo, i) => {
            const isActive = i === active;
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View ${photo.location}`}
                className={`relative h-full overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-[#0F3460] cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-flex-grow ${
                  isActive ? "flex-[4]" : "flex-[0.7]"
                }`}
              >
                <Image
                  src={photo.image_url}
                  alt={photo.caption || photo.location}
                  fill
                  sizes={isActive ? "(max-width: 768px) 70vw, 40vw" : "(max-width: 768px) 12vw, 12vw"}
                  priority={i === 0}
                  className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-105"
                  style={{ filter: isActive ? "none" : "brightness(0.55) saturate(0.9)" }}
                />

                {/* gradient veil */}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/5" />

                {/* collapsed caption line — visible only when this panel is NOT active.
                    Mobile: book-spine rotation along the vertical axis.
                    Desktop: standard horizontal letterboxing at the bottom. */}
                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center px-2 md:px-3 md:items-end md:justify-center md:text-center pointer-events-none">
                    <span
                      className={`font-display text-[#F5F0E8] font-bold drop-shadow-lg break-words leading-relaxed max-w-[90%] ${
                        isActive
                          ? "rotate-0 whitespace-normal text-sm md:text-xl"
                          : "-rotate-90 md:rotate-0 origin-center whitespace-nowrap md:whitespace-normal absolute md:relative tracking-widest md:tracking-wide uppercase md:normal-case text-xs md:text-sm md:text-xl"
                      }`}
                    >
                      {photo.location}
                    </span>
                  </div>
                )}

                {/* expanded description grid — fades out when collapsed */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="absolute inset-0 flex flex-col justify-end p-4 md:p-10 lg:p-14"
                    >
                      <div className="max-w-md text-left">
                        <span className="hidden md:block text-[11px] uppercase tracking-[0.3em] text-[#F5F0E8]/80 mb-4">
                          {photo.photographer}
                        </span>
                        <h2 className="font-display text-[#F5F0E8] text-sm md:text-xl font-bold leading-tight mb-2 md:mb-4 break-words whitespace-normal leading-relaxed max-w-[85%]">
                          {photo.location}
                        </h2>
                        <p className="hidden md:block text-xs text-white/80 mt-1 leading-relaxed break-words whitespace-normal max-w-[85%]">
                          {photo.caption}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === active ? "w-10 bg-[#0F3460]" : "w-2.5 bg-stone-400/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { Photo } from "@/types/photo";
import { useLanguage } from "@/lib/i18n";

interface HeroProps {
  latestPhotos: Photo[];
}

interface TrackerData {
  windSpeed: number;
  windDirectionText: string;
  isOnshore: boolean;
  tideStatus: string;
  tideHeight: string;
  countdownText: string;
}

const KUANTAN_LAT = 3.8077;
const KUANTAN_LNG = 103.3260;

function degreesToCardinal(deg: number): string {
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

function computeTide(date: Date): { status: string; height: string } {
  const hours = date.getHours() + date.getMinutes() / 60;
  // Semi-diurnal cycle: ~12.42h period; phase anchored to ~00:00 high tide.
  const phase = ((hours / 12.42) * 2 * Math.PI);
  const height = Math.sin(phase + Math.PI / 2); // [-1, 1], 1=high
  const norm = (height + 1) / 2;
  let status: string;
  if (norm > 0.75) status = "High Tide";
  else if (norm > 0.55) status = "Rising";
  else if (norm > 0.45) status = "Mid Tide";
  else if (norm > 0.25) status = "Falling";
  else status = "Low Tide";
  const heightM = (norm * 2.0).toFixed(2);
  return { status, height: heightM };
}

function computeCountdown(sunset: number): string {
  const now = Date.now();
  const diff = sunset - now;
  if (diff <= 0) return "Golden hour has passed";
  const totalMin = Math.floor(diff / 60000);
  if (totalMin > 90) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `Golden hour in ${h}h ${m}m`;
  }
  if (totalMin > 0) return `Golden hour in ${totalMin}m`;
  return "Golden hour now";
}

export default function Hero({ latestPhotos }: HeroProps) {
  const { copy } = useLanguage();
  const slides = latestPhotos.slice(0, 5);
  const [active, setActive] = useState(0);
  const [coastalData, setCoastalData] = useState<TrackerData | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    async function loadCoastalData() {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${KUANTAN_LAT}` +
          `&longitude=${KUANTAN_LNG}&current=wind_speed_10m,wind_direction_10m` +
          `&daily=sunset&timezone=Asia%2FKuala_Lumpur`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();

        const windSpeedRaw = data?.current?.wind_speed_10m;
        const windDirRaw = data?.current?.wind_direction_10m;
        const sunsetStr = data?.daily?.sunset?.[0];
        if (windSpeedRaw == null || windDirRaw == null || !sunsetStr) return;

        // Open-Meteo returns wind_speed_10m in km/h. Convert to knots.
        const windSpeed = Math.round((Number(windSpeedRaw) / 1.852) * 10) / 10;
        const windDir = Number(windDirRaw);
        const windDirectionText = degreesToCardinal(windDir);
        // South China Sea lies to the east of Kuantan. Onshore breeze when
        // wind blows from the sea toward land: between 30° and 160°.
        const isOnshore = windDir >= 30 && windDir <= 160;

        const sunsetDate = new Date(`${sunsetStr}+08:00`);
        const countdownText = computeCountdown(sunsetDate.getTime());
        const tide = computeTide(new Date());

        setCoastalData({
          windSpeed,
          windDirectionText,
          isOnshore,
          tideStatus: tide.status,
          tideHeight: tide.height,
          countdownText,
        });
      } catch {
        // Network or parse failure — keep prior state (or null).
      }
    }

    void loadCoastalData();
    timer = setInterval(() => void loadCoastalData(), 10 * 60 * 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <section id="lookbook" className="relative w-full overflow-hidden block">
      <Image
        src="/HOMEPAGE-bg.webp"
        alt=""
        fill
        priority
        className="object-cover object-center opacity-25 pointer-events-none z-0"
      />
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 lg:px-16 pt-20 pb-6">
        <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center mx-auto mb-12">
          {coastalData && (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 mb-6 text-[10px] uppercase tracking-[0.25em] animate-fade-in">
              {/* Node 1: Dynamic Tide Metrics */}
              <div className="flex items-center gap-2">
                  <span className="font-bold text-[#0F3460]">{copy.hero.tide}</span>
                  <span className="text-stone-600 font-medium">
                  {copy.hero.tideStatuses[coastalData.tideStatus] ??
                    coastalData.tideStatus} ({coastalData.tideHeight}m)
                </span>
              </div>
              <span className="hidden sm:inline font-light text-[#0F3460]/20">|</span>
              {/* Node 2: Wind Metrics */}
              <div className="flex items-center gap-2">
                  <span className="font-bold text-[#0F3460]">{copy.hero.wind}</span>
                <span className="text-stone-600 font-medium">
                  {coastalData.windSpeed} KTS {coastalData.windDirectionText}
                </span>
                {coastalData.isOnshore && (
                  <span className="text-[#0F3460] font-bold tracking-[0.2em] text-[9px] bg-[#0F3460]/5 px-2 py-0.5 rounded-full">
                    {copy.hero.onshore}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline font-light text-[#0F3460]/20">|</span>
              {/* Node 3: Solar Tracker */}
              <div className="flex items-center gap-2">
                  <span className="font-bold text-[#0F3460]">{copy.hero.light}</span>
                <span className="text-stone-600 font-medium">
                  {coastalData.countdownText}
                </span>
              </div>
            </div>
          )}
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#0F3460]">
            {copy.hero.eyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif tracking-tight text-stone-900 leading-tight mb-3">
            {copy.hero.titleLineOne}
            <br />
            <span className="italic text-[#0F3460] font-semibold">
              {copy.hero.titleLineTwo}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto mb-6 leading-relaxed">
            {copy.hero.description}
          </p>
        </div>

        {/* Horizontal Accordion Slider */}
        <div className="w-full max-w-6xl mx-auto h-[380px] md:h-[420px] overflow-hidden flex gap-3 md:gap-4">
          {slides.map((photo, i) => {
            const isActive = i === active;
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={copy.hero.viewFrame(photo.location)}
                data-cursor="VIEW FRAME"
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

                {/* text container — location title transitions between vertical (collapsed)
                     and horizontal (expanded); photographer + caption fade in only when active.
                     overflow-hidden on the card button ensures rotated text never bleeds outside. */}
                <div className="absolute bottom-4 left-4 right-4 flex flex-col justify-end items-start pointer-events-none transition-all duration-300">
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="max-w-md text-left w-full"
                      >
                        <span className="hidden md:block text-[11px] uppercase tracking-[0.3em] text-[#F5F0E8]/80 mb-2 md:mb-4">
                          {photo.photographer}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <span
                    className={
                      isActive
                        ? "[writing-mode:horizontal-tb] rotate-0 text-lg sm:text-2xl font-serif text-white tracking-tight leading-snug"
                        : "[writing-mode:vertical-rl] rotate-180 text-xs tracking-wider uppercase text-stone-200/90 whitespace-nowrap transition-all duration-300 select-none"
                    }
                  >
                    {photo.location}
                  </span>

                  <AnimatePresence>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="hidden md:block text-xs text-white/80 mt-2 md:mt-4 leading-relaxed break-words whitespace-normal max-w-[85%]"
                      >
                        {photo.caption}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-center gap-4 mt-6">
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === active ? "w-10 bg-[#0F3460]" : "w-2.5 bg-stone-400/50"
                }`}
              />
            ))}
          </div>

          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#0a1726]/15 bg-white/40 hover:bg-white/80 backdrop-blur-sm shadow-sm hover:scale-105 text-xs tracking-[0.2em] text-[#0a1726]/80 hover:text-[#0a1726] font-medium transition-all duration-300 uppercase"
          >
            {copy.hero.exploreGallery}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

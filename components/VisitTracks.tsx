"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Photo } from "@/types/photo";
import {
  ROUTE_TRACKS,
  locationCoords,
  locationRouteMap,
  type RouteCategory,
} from "@/lib/routes";

const VisitMiniMap = dynamic(() => import("./VisitMiniMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-stone-400 text-[11px] uppercase tracking-[0.3em] font-sans">
      Loading atlas&hellip;
    </div>
  ),
});

const locationDetailsRegistry: Record<string, { time: string; activity: string }> = {
  "Pantai Sepat": { time: "07:30 AM", activity: "Peaceful morning beach walk and photography" },
  "Pantai Berserah": { time: "12:30 PM", activity: "Traditional seafood lunch stopover" },
  "Pantai Batu Hitam": { time: "03:30 PM", activity: "Exploration of unique black stone shorelines" },
  "Teluk Cempedak": { time: "05:30 PM", activity: "Sunset views and dynamic coastline tracking" },
  "Bukit Panorama": { time: "05:45 AM", activity: "Catch the mountain fog sea sunrise" },
  "Bandar Sungai Lembing": { time: "08:30 AM", activity: "Local breakfast and mining heritage walk" },
  "Air Terjun Pelangi": { time: "10:30 AM", activity: "Trek out to capture the pristine cascades" },
  "Bandar Kuantan": { time: "09:00 AM", activity: "Explore historical roots and city infrastructure" },
  "Masjid Sultan Ahmad Shah": { time: "11:00 AM", activity: "Architectural study of the majestic state mosque" },
  "Tanjung Lumpur": { time: "02:00 PM", activity: "Traditional charcoal-grilled culinary stops" },
};

function timeToMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 24 * 60;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getLocationDetails(location: string): { time: string; activity: string } {
  return (
    locationDetailsRegistry[location] ?? {
      time: "Flexible Time",
      activity: `Explore and document ${location}`,
    }
  );
}

function buildJourneyUrl(locations: string[]): string | null {
  const stops: [number, number][] = [];
  for (const name of locations) {
    const coords = locationCoords[name];
    if (coords) stops.push(coords);
  }
  if (stops.length < 2) return null;
  const [originLat, originLng] = stops[0];
  const [destLat, destLng] = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1);
  let url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${originLat},${originLng}` +
    `&destination=${destLat},${destLng}`;
  if (waypoints.length > 0) {
    url +=
      "&waypoints=" +
      waypoints.map(([lat, lng]) => `${lat},${lng}`).join("%7C");
  }
  return url;
}

interface VisitTracksProps {
  photos: Photo[];
}

export default function VisitTracks({ photos }: VisitTracksProps) {
  const [activeRouteFilter, setActiveRouteFilter] =
    useState<RouteCategory | null>(null);

  const handleToggle = (id: RouteCategory) => {
    setActiveRouteFilter((current) => (current === id ? null : id));
  };

  const visibleCount = (id: RouteCategory) =>
    photos.filter((p) => locationRouteMap[p.location] === id).length;

  const activeTrack =
    ROUTE_TRACKS.find((r) => r.id === activeRouteFilter) ?? null;

  const activeLocations = useMemo<string[]>(() => {
    if (!activeRouteFilter) return [];
    const unique = Array.from(
      new Set(
        photos
          .filter((p) => locationRouteMap[p.location] === activeRouteFilter)
          .map((p) => p.location)
      )
    );
    return unique.sort(
      (a, b) =>
        timeToMinutes(getLocationDetails(a).time) -
        timeToMinutes(getLocationDetails(b).time)
    );
  }, [photos, activeRouteFilter]);

  const journeyUrl =
    activeLocations.length > 0 ? buildJourneyUrl(activeLocations) : null;

  return (
    <section id="visit" className="w-full block bg-[#F5F0E8]">
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-16 pt-20 md:pt-28 pb-20 md:pb-28">
        <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center mx-auto mb-12 md:mb-16">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/60 px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-stone-600 backdrop-blur-md">
            The Itineraries
          </span>
          <h2 className="font-display text-stone-900 text-4xl md:text-6xl font-extrabold leading-[0.95] tracking-tight">
            Visit Kuantan
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-600 font-light">
            Three curated travel routes through Pahang&apos;s coast, peaks, and
            heritage heart. Select a trail to filter the atlas below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
          {/* Left Column: Route selection cards */}
          <div className="flex flex-col gap-6">
            {ROUTE_TRACKS.map((route) => {
              const isSelected = activeRouteFilter === route.id;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => handleToggle(route.id)}
                  className={`text-left bg-[#FAF8F5] rounded-2xl border p-6 md:p-8 transition-all duration-300 hover:shadow-[0_18px_60px_rgba(15,52,96,0.10)] ${
                    isSelected
                      ? "border-stone-800 shadow-[0_18px_60px_rgba(15,52,96,0.14)] ring-1 ring-stone-800"
                      : "border-stone-200 shadow-[0_8px_30px_rgba(15,52,96,0.04)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-amber-600 font-sans tracking-widest text-[11px] uppercase font-bold">
                      {route.id}
                    </span>
                    <span className="text-[11px] font-sans tracking-widest uppercase text-stone-400">
                      {visibleCount(route.id)} pins
                    </span>
                  </div>
                  <h3 className="font-display text-stone-900 text-2xl md:text-3xl font-bold leading-tight mb-2">
                    {route.title}
                  </h3>
                  <p className="text-stone-600 font-serif text-base leading-relaxed">
                    {route.description}
                  </p>
                  <span
                    className={`mt-5 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] font-medium transition-colors duration-300 ${
                      isSelected ? "text-stone-900" : "text-stone-400"
                    }`}
                  >
                    {isSelected ? "Filtering atlas" : "Select to filter"}
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      {isSelected ? (
                        <>
                          <path d="M19 12H5" />
                          <path d="M12 19l-7-7 7-7" />
                        </>
                      ) : (
                        <>
                          <path d="M5 12h14" />
                          <path d="M12 5l7 7-7 7" />
                        </>
                      )}
                    </svg>
                  </span>
                </button>
              );
            })}

            {activeRouteFilter && (
              <button
                type="button"
                onClick={() => setActiveRouteFilter(null)}
                className="self-start text-[12px] uppercase tracking-[0.2em] font-medium text-stone-500 hover:text-stone-900 transition-colors duration-300"
              >
                Reset — show all trails
              </button>
            )}
          </div>

          {/* Right Column: Detached mini-map atlas + itinerary timeline */}
          <div className="bg-[#FAF8F5] rounded-2xl border border-stone-200 shadow-[0_8px_30px_rgba(15,52,96,0.04)] p-6 md:p-8 flex flex-col gap-6 md:gap-8">
            <div
              id="visit-mini-map-atlas"
              className="w-full h-[350px] md:h-[400px] rounded-xl overflow-hidden border border-stone-300 shadow-[0_8px_30px_rgba(15,52,96,0.08)] bg-slate-950"
            >
              <VisitMiniMap
                photos={photos}
                activeRouteFilter={activeRouteFilter}
              />
            </div>

            {activeTrack ? (
              <div className="flex flex-col">
                <div className="mb-6 flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
                  <div>
                    <span className="text-amber-600 font-sans tracking-widest text-[11px] uppercase font-bold">
                      {activeTrack.id}
                    </span>
                    <h3 className="font-display text-stone-900 text-2xl md:text-3xl font-bold leading-tight mt-1">
                      {activeTrack.title}
                    </h3>
                  </div>
                  {journeyUrl && (
                    <a
                      href={journeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-stone-850 text-stone-850 bg-transparent hover:bg-amber-500 hover:border-amber-500 hover:text-stone-950 transition-all duration-200 text-xs tracking-widest uppercase font-bold rounded-full whitespace-nowrap shadow-sm"
                    >
                      Start Journey ↗
                    </a>
                  )}
                </div>
                {activeLocations.length > 0 ? (
                  <ol className="relative flex flex-col gap-6">
                    {activeLocations.map((location, idx) => {
                      const isLast = idx === activeLocations.length - 1;
                      const details = getLocationDetails(location);
                      return (
                        <li key={location} className="relative flex gap-5">
                          <div className="flex flex-col items-center">
                            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-stone-900 text-[#F5F0E8] font-sans text-[10px] uppercase tracking-widest font-bold shrink-0">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            {!isLast && (
                              <span className="mt-1 w-px flex-1 border-l border-dashed border-stone-300" />
                            )}
                          </div>
                          <div className="flex flex-col pt-1 pb-6">
                            <span className="text-amber-600 font-sans tracking-widest text-[11px] uppercase font-bold mb-1">
                              {details.time}
                            </span>
                            <p className="text-stone-800 font-serif text-base md:text-lg leading-relaxed">
                              {details.activity}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="text-stone-500 font-serif text-sm leading-relaxed text-center py-6">
                    No pinned frames for this trail yet — be the first to
                    submit.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-6 md:py-8">
                <p className="font-display text-stone-700 text-xl md:text-2xl font-bold mb-2">
                  A bird&apos;s-eye view of Kuantan
                </p>
                <p className="text-stone-500 font-serif text-sm leading-relaxed max-w-sm">
                  Every pinned frame is plotted above. Select a curated trail
                  on the left to chart its itinerary and focus the atlas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
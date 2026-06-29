"use client";

import type { Photo } from "@/types/photo";
import {
  ROUTE_TRACKS,
  locationRouteMap,
  type RouteCategory,
} from "@/lib/routes";

interface VisitTracksProps {
  photos: Photo[];
  activeRouteFilter: RouteCategory | null;
  setActiveRouteFilter: (value: RouteCategory | null) => void;
}

export default function VisitTracks({
  photos,
  activeRouteFilter,
  setActiveRouteFilter,
}: VisitTracksProps) {
  const handleToggle = (id: RouteCategory) => {
    setActiveRouteFilter(activeRouteFilter === id ? null : id);
  };

  const visibleCount = (id: RouteCategory) =>
    photos.filter((p) => locationRouteMap[p.location] === id).length;

  const activeTrack =
    ROUTE_TRACKS.find((r) => r.id === activeRouteFilter) ?? null;

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

          {/* Right Column: Timeline of selected route */}
          <div className="bg-[#FAF8F5] rounded-2xl border border-stone-200 shadow-[0_8px_30px_rgba(15,52,96,0.04)] p-6 md:p-8">
            {activeTrack ? (
              <>
                <div className="mb-6">
                  <span className="text-amber-600 font-sans tracking-widest text-[11px] uppercase font-bold">
                    {activeTrack.id}
                  </span>
                  <h3 className="font-display text-stone-900 text-2xl md:text-3xl font-bold leading-tight mt-1">
                    {activeTrack.title}
                  </h3>
                </div>
                <ol className="relative flex flex-col gap-6">
                  {activeTrack.itinerary.map((point, idx) => {
                    const isLast = idx === activeTrack.itinerary.length - 1;
                    return (
                      <li key={idx} className="relative flex gap-5">
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
                            {point.time}
                          </span>
                          <p className="text-stone-800 font-serif text-base md:text-lg leading-relaxed">
                            {point.detail}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <span className="mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-stone-100 text-stone-400">
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <p className="font-display text-stone-700 text-xl font-bold mb-2">
                  Select a route
                </p>
                <p className="text-stone-500 font-serif text-sm leading-relaxed max-w-xs">
                  Choose a curated trail on the left to reveal its editorial
                  itinerary timeline and filter the map atlas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
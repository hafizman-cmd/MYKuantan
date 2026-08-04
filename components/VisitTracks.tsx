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
  "Air Terjun Berkelah": { time: "Flexible Time", activity: "Trek through the rainforest to the cascading Berkelah falls" },
  "Menara Kuantan 188": { time: "Flexible Time", activity: "Rise above the city on the 188-meter observation tower" },
  "Sungai Cherating": { time: "Flexible Time", activity: "River cruise and firefly-watching along the Cherating waters" },
  "Taman Bandar Kuantan": { time: "Flexible Time", activity: "Leisurely stroll and people-watching in the city park" },
  "Taman Gelora": { time: "Flexible Time", activity: "Pine-grove picnic beside the sea breeze" },
  "Zoo Mini Teruntum": { time: "Flexible Time", activity: "Family-friendly wildlife encounter at the mini zoo" },
  "Natural Batik Village": { time: "Flexible Time", activity: "Hands-on batik workshop and heritage craft study" },
  "Muzium Sungai Lembing": { time: "Flexible Time", activity: "Mining heritage exhibits inside the historic tunnel museum" },
  "Pantai Cherating": { time: "Flexible Time", activity: "Turtle beach stroll and laid-back surf breaks" },
  "Petrosains Kuantan": { time: "Flexible Time", activity: "Interactive science discovery for all ages" },
  "East Coast Mall": { time: "Flexible Time", activity: "Shopping and dining at the east coast retail hub" },
  "Pantai Balok": { time: "07:00 AM", activity: "Kite-surfing winds and wide dawn sands" },
  "Pantai Pelindung": { time: "Flexible Time", activity: "Secluded fisherman cove and rocky headland photography" },
  "Gua Charas": { time: "Flexible Time", activity: "Limestone cave temple climb and stalactite study" },
  "Kuantan City Mall": { time: "Flexible Time", activity: "Modern retail and lifestyle centre exploration" },
  "Santuari Penyu": { time: "Flexible Time", activity: "Turtle nesting conservation sanctuary visit" },
  "Muzium Seni Pahang": { time: "Flexible Time", activity: "State art museum and cultural gallery tour" },
  "Esplanade Kuantan": { time: "Flexible Time", activity: "Riverside esplanade promenade at golden hour" },
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

function buildJourneyUrl(
  locations: string[]
): { url: string; truncated: boolean } | null {
  const safeItinerary = locations.slice(0, 10);
  const stops: [number, number][] = [];
  for (const name of safeItinerary) {
    const coords = locationCoords[name];
    if (coords) stops.push(coords);
  }
  if (stops.length < 2) return null;
  const [originLat, originLng] = stops[0];
  const [destLat, destLng] = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1);
  let url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent(`${originLat},${originLng}`)}` +
    `&destination=${encodeURIComponent(`${destLat},${destLng}`)}`;
  if (waypoints.length > 0) {
    url +=
      "&waypoints=" +
      waypoints
        .map(([lat, lng]) => encodeURIComponent(`${lat},${lng}`))
        .join(encodeURIComponent("|"));
  }
  return { url, truncated: locations.length > 10 };
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
    return unique.sort((a, b) => {
      const timeDiff =
        timeToMinutes(getLocationDetails(a).time) -
        timeToMinutes(getLocationDetails(b).time);
      if (timeDiff !== 0) return timeDiff;
      return (a || "").localeCompare(b || "");
    });
  }, [photos, activeRouteFilter]);

  const journey =
    activeLocations.length > 0 ? buildJourneyUrl(activeLocations) : null;
  const journeyUrl = journey?.url ?? null;
  const journeyTruncated = journey?.truncated ?? false;

  return (
    <section
      id="visit"
      className="w-full max-w-7xl mx-auto px-6 pt-16 pb-6 min-h-[calc(100vh-80px)] flex flex-col justify-start overflow-hidden block bg-[#F5F0E8]"
    >
      <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center mx-auto mb-6">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight mb-2 text-center">
          Visit Kuantan
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto mb-6 text-center">
          Three curated travel routes through Pahang&apos;s coast, peaks, and
          heritage heart. Select a trail to filter the atlas below.
        </p>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[58vh] max-h-[580px] w-full overflow-hidden">
          {/* Left Column: Route selection cards (scrollable) */}
          <div className="h-full overflow-y-auto pr-3 space-y-4 custom-scrollbar flex flex-col">
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
          <div className="h-full w-full rounded-2xl overflow-hidden border border-stone-200 shadow-sm relative bg-[#FAF8F5] p-6 md:p-8 flex flex-col">
            <div
              id="visit-mini-map-atlas"
              className="w-full h-[180px] rounded-xl overflow-hidden border border-stone-300 shadow-[0_8px_30px_rgba(15,52,96,0.08)] bg-slate-950 shrink-0"
            >
              <VisitMiniMap
                photos={photos}
                activeRouteFilter={activeRouteFilter}
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-4">
              {activeTrack ? (
                <div className="flex flex-col">
                  <div className="mb-4 flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
                    <div>
                      <span className="text-amber-600 font-sans tracking-widest text-[11px] uppercase font-bold">
                        {activeTrack.id}
                      </span>
                      <h3 className="font-display text-stone-900 text-xl md:text-2xl font-bold leading-tight mt-1">
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
                  {journeyTruncated && (
                    <p className="mb-4 text-[11px] uppercase tracking-[0.2em] font-medium text-amber-600/80 font-sans text-center md:text-left">
                      Showing the optimal first 10 stops on your Kuantan
                      itinerary.
                    </p>
                  )}
                  {activeLocations.length > 0 ? (
                    <ol className="relative flex flex-col gap-4">
                      {activeLocations.map((location, idx) => {
                        const isLast = idx === activeLocations.length - 1;
                        const details = getLocationDetails(location);
                        return (
                          <li key={location} className="relative flex gap-5">
                            <div className="flex flex-col items-center">
                              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-stone-900 text-[#F5F0E8] font-sans text-[10px] uppercase tracking-widest font-bold shrink-0">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              {!isLast && (
                                <span className="mt-1 w-px flex-1 border-l border-dashed border-stone-300" />
                              )}
                            </div>
                            <div className="flex flex-col pt-1 pb-4">
                              <span className="text-amber-600 font-sans tracking-widest text-[11px] uppercase font-bold mb-1">
                                {details.time}
                              </span>
                              <p className="text-stone-800 font-serif text-sm md:text-base leading-relaxed">
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
                  <p className="font-display text-stone-700 text-lg md:text-xl font-bold mb-2">
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
      </div>
    </section>
  );
}
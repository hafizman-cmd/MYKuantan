"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import type { Photo } from "@/types/photo";
import { useCollection } from "@/lib/useCollection";
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
  const {
    bookmarkedLocations,
    busyKeys: collectionBusyKeys,
    toast: collectionToast,
    toggleBookmarkLocation,
  } = useCollection();

  const handleToggle = (id: RouteCategory) => {
    setActiveRouteFilter((current) => (current === id ? null : id));
  };

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
    <>
      {/* Page header — breathing room below fixed Navbar */}
      <div className="w-full flex flex-col items-center justify-center text-center">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-100 tracking-tight mb-8">
          Visit Kuantan
        </h2>
        <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto text-center leading-relaxed mb-10 md:mb-12">
          Three curated travel routes through Pahang&apos;s coast, peaks, and
          heritage heart. Select a trail to filter the atlas below.
        </p>
      </div>

      {/* Top 2-column selection workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 w-full items-stretch mt-2">
        {/* Left Column: trail selector cards only */}
        <div className="w-full flex flex-col gap-4">
          {ROUTE_TRACKS.map((route) => {
            const isSelected = activeRouteFilter === route.id;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => handleToggle(route.id)}
                className={`w-full text-left rounded-2xl p-6 border shadow-sm relative transition-all duration-200 ${isSelected
                  ? "bg-slate-800 border-amber-500/50 text-white shadow-lg"
                  : "bg-slate-900/60 border-slate-800 text-stone-200 hover:border-slate-700"
                  }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-amber-400 font-sans tracking-widest text-[11px] uppercase font-bold">
                    {route.id}
                  </span>
                </div>
                <h3 className="font-display text-white text-2xl md:text-3xl font-bold leading-tight mb-2">
                  {route.title}
                </h3>
                <p className="text-stone-300 font-serif text-base leading-relaxed">
                  {route.description}
                </p>
                <span
                  className={`mt-5 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] font-medium transition-colors duration-300 ${isSelected ? "text-amber-400" : "text-stone-400"
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
        </div>

        {/* Right Column: mini-map atlas locked to workspace height */}
        <VisitMiniMap photos={photos} activeRouteFilter={activeRouteFilter} />
      </div>

      {/* Active itinerary details — standard page flow below the workspace */}
      {activeTrack && (
        <div className="w-full mt-8 rounded-2xl bg-slate-900/60 p-6 md:p-8 border border-slate-800 shadow-sm relative block">
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
            <div>
              <span className="text-amber-400 font-sans tracking-widest text-[11px] uppercase font-bold">
                {activeTrack.id}
              </span>
              <h3 className="font-display text-white text-xl md:text-2xl font-bold leading-tight mt-1">
                {activeTrack.title}
              </h3>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveRouteFilter(null)}
                className="text-[12px] uppercase tracking-[0.2em] font-medium text-stone-400 hover:text-amber-400 transition-colors duration-300"
              >
                Reset — show all trails
              </button>

              {journeyUrl && (
                <a
                  href={journeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-stone-950 hover:bg-amber-400 hover:scale-105 transition-all duration-200 text-xs tracking-widest uppercase font-extrabold rounded-full whitespace-nowrap shadow-md shadow-amber-500/10"
                >
                  Start Journey ↗
                </a>
              )}
            </div>
          </div>
          {journeyTruncated && (
            <p className="mb-4 text-[11px] uppercase tracking-[0.2em] font-medium text-amber-400/80 font-sans text-center md:text-left">
              Showing the optimal first 10 stops on your Kuantan
              itinerary.
            </p>
          )}
          {activeLocations.length > 0 ? (
            <ol className="relative flex flex-col">
              {activeLocations.map((location, idx) => {
                const isLast = idx === activeLocations.length - 1;
                const details = getLocationDetails(location);
                return (
                  <li key={location} className="relative flex items-start gap-4 mb-4 last:mb-0">
                    <div className="flex flex-col items-center">
                      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-stone-950 font-sans text-[10px] uppercase tracking-widest font-bold shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      {!isLast && (
                        <span className="mt-1 w-px flex-1 border-l border-dashed border-slate-600" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col pt-1 pb-4">
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block text-amber-400 font-sans tracking-widest text-[11px] uppercase font-bold">
                            {details.time}
                          </span>
                          <h4 className="mt-1 truncate font-display text-base font-semibold text-stone-100 md:text-lg">
                            {location}
                          </h4>
                        </div>
                        <button
                          type="button"
                          disabled={collectionBusyKeys.has(
                            `location_name:${location}`
                          )}
                          onClick={() => void toggleBookmarkLocation(location)}
                          aria-pressed={bookmarkedLocations.has(location)}
                          aria-label={
                            bookmarkedLocations.has(location)
                              ? `Remove ${location} from My Kuantan Trip`
                              : `Save ${location} to My Kuantan Trip`
                          }
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all disabled:cursor-wait disabled:opacity-60 ${
                            bookmarkedLocations.has(location)
                              ? "border-amber-400/70 bg-amber-400/15 text-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
                              : "border-slate-700 bg-slate-800/80 text-stone-400 hover:border-amber-400/60 hover:text-amber-400"
                          }`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill={
                              bookmarkedLocations.has(location)
                                ? "currentColor"
                                : "none"
                            }
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4V4z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-stone-300 font-serif text-sm md:text-base leading-relaxed">
                        {details.activity}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-stone-400 font-serif text-sm leading-relaxed text-center py-6">
              No pinned frames for this trail yet — be the first to
              submit.
            </p>
          )}
        </div>
      )}

      <AnimatePresence>
        {collectionToast ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            role="status"
            className="fixed bottom-6 left-1/2 z-[100001] w-[calc(100%_-_2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-amber-400/25 bg-slate-900/95 px-5 py-3 text-center text-sm text-stone-100 shadow-2xl backdrop-blur-xl"
          >
            {collectionToast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

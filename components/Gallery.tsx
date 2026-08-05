"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { Photo } from "@/types/photo";
import {
  fetchAuthedLikedSet,
  readGuestLikedSet,
  GUEST_LIKES_LS_KEY,
} from "./LikeButton";
import LikeButton from "./LikeButton";
import { supabaseClient } from "@/lib/supabase/client";

const EditorialMap = dynamic(() => import("./EditorialMap"), {
  ssr: false,
});

const ARCHIVE_PAGE_SIZE = 12;
const ARCHIVE_LOCATIONS = [
  "All",
  "Teluk Cempedak",
  "Cherating",
  "Sungai Lembing",
  "Pantai Sepat",
] as const;
type ArchiveLocation = (typeof ARCHIVE_LOCATIONS)[number];

const SORT_MODES = ["Newest", "Oldest"] as const;
type SortMode = "newest" | "oldest";

interface GalleryProps {
  photos: Photo[];
}

function formatUploadDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function uploaderHandle(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "@anonymous";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export default function Gallery({ photos }: GalleryProps) {
  // ── Atlas workspace state ────────────────────────────────────────────
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [activeLocation, setActiveLocation] = useState<string | null>(
    photos[0]?.location ?? null
  );

  // ── Archive state ────────────────────────────────────────────────────
  const [locationFilter, setLocationFilter] =
    useState<ArchiveLocation>("All");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [visibleCount, setVisibleCount] = useState(ARCHIVE_PAGE_SIZE);

  // Reset pagination whenever filter or sort changes.
  useEffect(() => {
    setVisibleCount(ARCHIVE_PAGE_SIZE);
  }, [locationFilter, sortMode]);

  const archivePhotos = useMemo(() => {
    const base =
      locationFilter === "All"
        ? photos
        : photos.filter((p) => p.location === locationFilter);
    const sorted = [...base].sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      if (Number.isNaN(at) || Number.isNaN(bt)) return 0;
      return sortMode === "newest" ? bt - at : at - bt;
    });
    return sorted;
  }, [photos, locationFilter, sortMode]);

  const visibleArchive = archivePhotos.slice(0, visibleCount);
  const hasMore = archivePhotos.length > visibleCount;

  // ── Auth-aware liked set (unchanged from prior implementation) ────────
  const [isAuthed, setIsAuthed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [likedSet, setLikedSet] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let mounted = true;
    let unsub: { unsubscribe: () => void } | null = null;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      if (session?.user) {
        setIsAuthed(true);
        setUserId(session.user.id);
        fetchAuthedLikedSet(session.user.id).then((set) => {
          if (mounted) setLikedSet(set);
        });
      } else {
        setIsAuthed(false);
        setUserId(null);
        setLikedSet(readGuestLikedSet());
      }
    });

    const { data: subData } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setIsAuthed(true);
          setUserId(session.user.id);
          fetchAuthedLikedSet(session.user.id).then((set) => {
            if (mounted) setLikedSet(set);
          });
        } else {
          setIsAuthed(false);
          setUserId(null);
          setLikedSet(readGuestLikedSet());
        }
      }
    );
    unsub = subData.subscription;

    const onStorage = (e: StorageEvent) => {
      if (e.key === GUEST_LIKES_LS_KEY) setLikedSet(readGuestLikedSet());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      unsub?.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // ── Scroll-linked active location observer (for the atlas map) ───────
  useEffect(() => {
    if (photos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const location = (visible[0].target as HTMLElement).dataset
          .photoLocation;
        if (location) setActiveLocation(location);
      },
      {
        root: null,
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
    <>
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — TOP 50/50 WORKSPACE (Fixed Boundary)
         ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full max-w-[1600px] mx-auto px-6 lg:px-16 pt-16 pb-6">
        {/* Header */}
        <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center mx-auto mb-6">
          <h2 className="text-3xl sm:text-4xl font-serif text-stone-100 tracking-tight mb-2">
            Frames of Kuantan
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto mb-6 text-center">
            A scroll-linked atlas — each frame pins its light on the dark map
            of Kuantan.
          </p>
        </div>

        {/* 50/50 Grid Container — fixed boundary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[58vh] max-h-[580px] w-full overflow-hidden relative mb-16">
          {/* Left column — scrollable featured photos feed */}
          <div className="h-full w-full overflow-y-auto custom-scrollbar snap-y snap-mandatory rounded-2xl bg-stone-900/40 p-2 border border-stone-800">
            {photos.length === 0 ? (
              <p className="text-center text-[#F5F0E8]/60 py-16 font-light">
                No photos approved yet. Be the first to submit.
              </p>
            ) : (
              photos.map((photo) => {
                const isSelected = activeLocation === photo.location;
                return (
                  <div
                    key={photo.id}
                    data-photo-location={photo.location}
                    data-cursor="VIEW FRAME"
                    ref={setCardRef(photo.id)}
                    onClick={() => setActiveLocation(photo.location)}
                    className={`group h-full w-full flex-shrink-0 snap-start snap-always relative rounded-xl overflow-hidden mb-0 cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "border border-white/30 shadow-lg shadow-black/40"
                        : "border border-stone-800/80"
                    }`}
                  >
                    {/* Photo frame — fills 100% of the card height cleanly */}
                    <Image
                      src={photo.image_url}
                      alt={photo.caption || photo.location}
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="w-full h-full object-cover rounded-xl transition-transform duration-[1.4s] ease-out group-hover:scale-105"
                    />
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-xl" />

                    {/* LikeButton — top-right overlay */}
                    <div className="absolute top-4 right-4 z-20">
                      <LikeButton
                        photoId={photo.id}
                        initialCount={photo.likes_count ?? 0}
                        initiallyLiked={likedSet.has(photo.id)}
                        isAuthed={isAuthed}
                        userId={userId}
                      />
                    </div>

                    {/* Location pill + title + handle — bottom overlay */}
                    <figcaption className="absolute left-5 right-5 bottom-5 flex flex-col gap-2 z-10">
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
                );
              })
            )}
          </div>

          {/* Right column — Map wrapper (relative, contained, no bleed) */}
          <div className="h-full w-full rounded-2xl overflow-hidden relative border border-stone-800 bg-stone-900">
            <EditorialMap
              photos={photos}
              activeLocation={activeLocation}
              fill
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — BOTTOM ARCHIVE GRID (Standard Flow)
         ══════════════════════════════════════════════════════════════════ */}
      <section className="w-full max-w-[1600px] mx-auto px-6 lg:px-16 pb-24 border-t border-stone-800/60 pt-12">
        {/* Filter & Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#F5F0E8]/25 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-[#F5F0E8]/80 backdrop-blur-md">
              Browse
            </span>
            <h2 className="font-display text-[#F5F0E8] text-3xl md:text-5xl font-extrabold tracking-tight">
              THE ARCHIVE
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Location filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {ARCHIVE_LOCATIONS.map((loc) => {
                const active = locationFilter === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocationFilter(loc)}
                    aria-pressed={active}
                    className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors duration-300 border ${
                      active
                        ? "bg-amber-400 text-[#0F3460] border-amber-400 font-bold shadow-[0_0_24px_rgba(251,191,36,0.35)]"
                        : "border-white/15 bg-white/5 text-[#F5F0E8]/75 backdrop-blur-md hover:text-[#F5F0E8] hover:border-white/30"
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>

            {/* Sort buttons */}
            <div className="inline-flex rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-md">
              {SORT_MODES.map((label) => {
                const mode: SortMode =
                  label === "Newest" ? "newest" : "oldest";
                const active = sortMode === mode;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSortMode(mode)}
                    aria-pressed={active}
                    className={`px-5 py-2 rounded-full text-[11px] uppercase tracking-[0.22em] transition-colors duration-300 ${
                      active
                        ? "bg-[#F5F0E8] text-[#0F3460] font-bold"
                        : "text-[#F5F0E8]/70 hover:text-[#F5F0E8]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Photo Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {visibleArchive.map((photo) => (
            <article
              key={photo.id}
              data-cursor="VIEW FRAME"
              className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#1A4A7A] ring-1 ring-white/5 transition-transform duration-300 hover:scale-[1.01]"
            >
              <div className="relative w-full aspect-[4/3] overflow-hidden">
                <Image
                  src={photo.image_url}
                  alt={photo.caption || photo.location}
                  fill
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
                  className="w-full h-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Location pill tag */}
                <span className="absolute top-3 left-3 inline-flex w-fit items-center rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#F5F0E8] font-medium break-words whitespace-normal leading-relaxed max-w-[85%] z-10">
                  {photo.location}
                </span>

                {/* Heart LikeButton */}
                <div className="absolute top-3 right-3 z-20">
                  <LikeButton
                    photoId={photo.id}
                    initialCount={photo.likes_count ?? 0}
                    initiallyLiked={likedSet.has(photo.id)}
                    isAuthed={isAuthed}
                    userId={userId}
                  />
                </div>

                {/* Uploader handle + upload date */}
                <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between gap-2 z-10">
                  <span className="text-[#F5F0E8] text-xs font-medium tracking-wide break-words whitespace-normal max-w-[70%]">
                    {uploaderHandle(photo.photographer)}
                  </span>
                  <span className="text-[#F5F0E8]/70 text-[10px] tracking-wide font-mono">
                    {formatUploadDate(photo.created_at)}
                  </span>
                </div>
              </div>

              {photo.caption ? (
                <p className="px-4 pt-3 pb-4 text-[#F5F0E8]/85 text-sm leading-relaxed font-light break-words whitespace-normal">
                  {photo.caption}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        {/* Empty state */}
        {archivePhotos.length === 0 ? (
          <p className="mt-12 text-center text-[#F5F0E8]/60 py-12 font-light">
            No frames from {locationFilter} yet.
          </p>
        ) : null}

        {/* Load More */}
        {hasMore ? (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + ARCHIVE_PAGE_SIZE)}
              className="inline-flex items-center gap-2 rounded-full border border-[#F5F0E8]/25 bg-white/5 px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-[#F5F0E8]/85 backdrop-blur-md transition-colors duration-300 hover:bg-[#F5F0E8] hover:text-[#0F3460] hover:border-[#F5F0E8]"
            >
              Load More
              <span className="text-[10px] tabular-nums opacity-70">
                ({archivePhotos.length - visibleCount} remaining)
              </span>
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
}
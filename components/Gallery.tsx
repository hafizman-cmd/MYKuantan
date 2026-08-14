"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import type { Photo } from "@/types/photo";
import { KUANTAN_LOCATIONS } from "@/lib/locations";
import {
  fetchAuthedLikedSet,
  readGuestLikedSet,
  GUEST_LIKES_LS_KEY,
} from "./LikeButton";
import LikeButton from "./LikeButton";
import { supabaseClient } from "@/lib/supabase/client";
import { useCollection } from "@/lib/useCollection";
import { useLanguage } from "@/lib/i18n";

const EditorialMap = dynamic(() => import("./EditorialMap"), {
  ssr: false,
});

const ARCHIVE_PAGE_SIZE = 12;

const SORT_MODES = ["newest", "oldest"] as const;
type SortMode = "newest" | "oldest";

const REPORT_REASONS = [
  "Inappropriate content",
  "Copyright / Not original work",
  "Spam or wrong location",
  "Other",
] as const;

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

export default function Gallery({ photos: initialPhotos }: GalleryProps) {
  const { copy } = useLanguage();
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const {
    bookmarkedPhotoIds,
    busyKeys: collectionBusyKeys,
    toast: collectionToast,
    toggleBookmarkPhoto,
  } = useCollection();

  // ── Atlas workspace state ────────────────────────────────────────────
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [activeLocation, setActiveLocation] = useState<string | null>(
    photos[0]?.location ?? null
  );

  // ── Archive state ────────────────────────────────────────────────────
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [visibleCount, setVisibleCount] = useState(ARCHIVE_PAGE_SIZE);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("Inappropriate content");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmittedSuccess, setReportSubmittedSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const reportResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const activePhoto =
    photos.find((photo) => photo.id === selectedPhotoId) || null;

  // Reset pagination whenever filter or sort changes.
  useEffect(() => {
    setVisibleCount(ARCHIVE_PAGE_SIZE);
  }, [locationFilter, sortMode]);

  useEffect(() => {
    if (!activePhoto) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isReporting) setIsReporting(false);
      else setSelectedPhotoId(null);
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePhoto, isReporting]);

  useEffect(
    () => () => {
      if (reportResetTimerRef.current) {
        clearTimeout(reportResetTimerRef.current);
      }
    },
    []
  );

  const archivePhotos = useMemo(() => {
    const base =
      locationFilter === "ALL"
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

  const archiveLocations = useMemo(
    () =>
      Array.from(
        new Set([
          ...KUANTAN_LOCATIONS.map((location) => location.name),
          ...photos.map((photo) => photo.location.trim()).filter(Boolean),
        ])
      ),
    [photos]
  );

  const visibleArchive = archivePhotos.slice(0, visibleCount);
  const hasMore = archivePhotos.length > visibleCount;

  // ── Auth-aware liked set (unchanged from prior implementation) ────────
  const [isAuthed, setIsAuthed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [likedSet, setLikedSet] = useState<Set<string>>(() => new Set());

  const handleLike = useCallback(
    (photoId: string, nextCount: number, nextLiked: boolean) => {
      setPhotos((currentPhotos) =>
        currentPhotos.map((photo) =>
          photo.id === photoId
            ? { ...photo, likes_count: nextCount }
            : photo
        )
      );
      setLikedSet((currentLikedSet) => {
        const nextLikedSet = new Set(currentLikedSet);
        if (nextLiked) nextLikedSet.add(photoId);
        else nextLikedSet.delete(photoId);
        return nextLikedSet;
      });
    },
    []
  );

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

  const closeReportModal = useCallback(() => {
    if (reportResetTimerRef.current) {
      clearTimeout(reportResetTimerRef.current);
      reportResetTimerRef.current = null;
    }
    setIsReporting(false);
    setReportSubmittedSuccess(false);
    setReportError(null);
    setReportReason("Inappropriate content");
    setReportDetails("");
  }, []);

  const handleSubmitReport = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!activePhoto || isSubmittingReport) return;

      setIsSubmittingReport(true);
      setReportError(null);

      try {
        const { error } = await supabaseClient.from("photo_reports").insert([
          {
            photo_id: activePhoto.id,
            reason: reportReason,
            details: reportDetails,
          },
        ]);

        if (error) throw error;

        setReportSubmittedSuccess(true);
        reportResetTimerRef.current = setTimeout(() => {
          setIsReporting(false);
          setReportSubmittedSuccess(false);
          setReportReason("Inappropriate content");
          setReportDetails("");
          reportResetTimerRef.current = null;
        }, 2000);
      } catch (error) {
        console.error("photo report submission error:", error);
        setReportError("We couldn't submit your report. Please try again.");
      } finally {
        setIsSubmittingReport(false);
      }
    },
    [activePhoto, isSubmittingReport, reportDetails, reportReason]
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
            {copy.gallery.title}
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto mb-6 text-center">
            {copy.gallery.description}
          </p>
        </div>

        {/* 50/50 Grid Container — fixed boundary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[58vh] max-h-[580px] w-full overflow-hidden relative mb-16">
          {/* Left column — scrollable featured photos feed */}
          <div className="h-full w-full overflow-y-auto custom-scrollbar snap-y snap-mandatory rounded-2xl bg-stone-900/40 p-2 border border-stone-800">
            {photos.length === 0 ? (
              <p className="text-center text-[#F5F0E8]/60 py-16 font-light">
                {copy.gallery.noPhotos}
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
                    className={`group h-full w-full flex-shrink-0 snap-start snap-always relative rounded-xl overflow-hidden mb-0 cursor-pointer transition-all duration-300 ${isSelected
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
                        onLikeChange={(nextCount, nextLiked) =>
                          handleLike(photo.id, nextCount, nextLiked)
                        }
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
                        {copy.gallery.by} {photo.photographer}
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
              {copy.gallery.browse}
            </span>
            <h2 className="font-display text-[#F5F0E8] text-3xl md:text-5xl font-extrabold tracking-tight">
              {copy.gallery.archive}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Dynamic location filter */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setLocationFilter("ALL")}
                aria-pressed={locationFilter === "ALL"}
                className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors duration-300 border ${locationFilter === "ALL"
                    ? "bg-amber-400 text-[#0F3460] border-amber-400 font-bold shadow-[0_0_24px_rgba(251,191,36,0.35)]"
                    : "border-white/15 bg-white/5 text-[#F5F0E8]/75 backdrop-blur-md hover:text-[#F5F0E8] hover:border-white/30"
                  }`}
              >
                {copy.gallery.all}
              </button>

              <select
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
                aria-label={copy.gallery.filterByLocation}
                className="bg-slate-900/90 text-stone-200 border border-slate-700/80 rounded-full px-4 py-2 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-amber-400 cursor-pointer transition-colors"
              >
                <option value="ALL">{copy.gallery.allLocations}</option>
                {archiveLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort buttons */}
            <div className="inline-flex rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-md">
              {SORT_MODES.map((mode) => {
                const label =
                  mode === "newest" ? copy.gallery.newest : copy.gallery.oldest;
                const active = sortMode === mode;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSortMode(mode)}
                    aria-pressed={active}
                    className={`px-5 py-2 rounded-full text-[11px] uppercase tracking-[0.22em] transition-colors duration-300 ${active
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
              role="button"
              tabIndex={0}
              aria-label={copy.gallery.preview(photo.caption || photo.location)}
              onClick={() => setSelectedPhotoId(photo.id)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedPhotoId(photo.id);
                }
              }}
              className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#1A4A7A] ring-1 ring-white/5 transition-transform duration-300 hover:scale-[1.01] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
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

                {/* Archive actions */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                  <LikeButton
                    photoId={photo.id}
                    initialCount={photo.likes_count ?? 0}
                    initiallyLiked={likedSet.has(photo.id)}
                    isAuthed={isAuthed}
                    userId={userId}
                    onLikeChange={(nextCount, nextLiked) =>
                      handleLike(photo.id, nextCount, nextLiked)
                    }
                    archiveOverlay
                  />

                  <button
                    type="button"
                    disabled={collectionBusyKeys.has(`photo_id:${photo.id}`)}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void toggleBookmarkPhoto(photo.id);
                    }}
                    aria-pressed={bookmarkedPhotoIds.has(photo.id)}
                    aria-label={
                      bookmarkedPhotoIds.has(photo.id)
                         ? copy.gallery.removePhoto
                         : copy.gallery.savePhoto
                    }
                    className={`inline-flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/10 rounded-full p-2 hover:scale-105 transition-transform disabled:cursor-wait disabled:opacity-60 ${
                      bookmarkedPhotoIds.has(photo.id)
                        ? "text-amber-400"
                        : "text-stone-200 hover:text-amber-400"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill={
                        bookmarkedPhotoIds.has(photo.id)
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
            {copy.gallery.noFrames(locationFilter)}
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
              {copy.gallery.loadMore}
              <span className="text-[10px] tabular-nums opacity-70">
                {copy.gallery.remaining(archivePhotos.length - visibleCount)}
              </span>
            </button>
          </div>
        ) : null}
      </section>

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

      <AnimatePresence>
        {activePhoto ? (
          <motion.div
            key="photo-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 pt-20 sm:pt-24 overflow-y-auto"
            onClick={() => setSelectedPhotoId(null)}
            role="presentation"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 30,
              }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="photo-preview-user"
              className="relative max-w-3xl sm:max-w-4xl w-full max-h-[85vh] bg-slate-900/95 border border-slate-800 rounded-3xl overflow-y-auto shadow-2xl flex flex-col p-5 sm:p-7 my-auto z-[100000]"
            >
              <header className="flex items-start gap-3 pr-10">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#1A4A7A] text-sm font-bold uppercase text-[#F5F0E8] shadow-inner">
                  {(activePhoto.photographer?.trim().replace(/^@/, "")[0] ??
                    "A")}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      id="photo-preview-user"
                      className="truncate text-sm font-semibold text-stone-100"
                    >
                      {uploaderHandle(activePhoto.photographer)}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      aria-label="Verified contributor"
                      className="h-4 w-4 shrink-0 text-sky-400"
                      fill="currentColor"
                    >
                      <path d="M23.4 12c0 1.2-1.8 2.1-2.2 3.2-.4 1.1.4 3-.4 3.8-.8.8-2.7 0-3.8.4-1.1.4-2 2.2-3.2 2.2s-2.1-1.8-3.2-2.2c-1.1-.4-3 .4-3.8-.4-.8-.8 0-2.7-.4-3.8C6 14.1 4.2 13.2 4.2 12S6 9.9 6.4 8.8c.4-1.1-.4-3 .4-3.8.8-.8 2.7 0 3.8-.4 1.1-.4 2-2.2 3.2-2.2s2.1 1.8 3.2 2.2c1.1.4 3-.4 3.8.4.8.8 0 2.7.4 3.8.4 1.1 2.2 2 2.2 3.2Z" />
                      <path
                        d="m9.6 12.1 2.2 2.2 4.5-4.7"
                        fill="none"
                        stroke="white"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-stone-400">
                    <span aria-hidden>📍 </span>
                    {activePhoto.location}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPhotoId(null)}
                   aria-label={copy.gallery.closePreview}
                  className="relative z-10 text-stone-400 hover:text-amber-400 transition-colors p-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path
                      d="M6 6l12 12M18 6 6 18"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </header>

              <div className="w-full max-h-[70vh] rounded-2xl overflow-hidden bg-black/50 relative my-4 flex items-center justify-center">
                <Image
                  src={activePhoto.image_url}
                  alt={activePhoto.caption || activePhoto.location}
                  width={1600}
                  height={1200}
                  sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(100vw - 48px), 896px"
                  className="w-full max-h-[70vh] object-contain rounded-2xl h-auto"
                />
              </div>

              {activePhoto.caption ? (
                <p className="mb-4 text-sm leading-relaxed text-stone-300">
                  {activePhoto.caption}
                </p>
              ) : null}

              <div
                className="flex items-center justify-between border-t border-white/10 pt-4"
                aria-label="Photo actions"
              >
                <LikeButton
                  photoId={activePhoto.id}
                  initialCount={activePhoto.likes_count ?? 0}
                  initiallyLiked={likedSet.has(activePhoto.id)}
                  isAuthed={isAuthed}
                  userId={userId}
                  onLikeChange={(nextCount, nextLiked) =>
                    handleLike(activePhoto.id, nextCount, nextLiked)
                  }
                />

                <button
                  type="button"
                  onClick={() => {
                    setReportError(null);
                    setReportSubmittedSuccess(false);
                    setIsReporting(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path
                      d="M5 21V5m0 0c4-3 8 3 14 0v9c-6 3-10-3-14 0"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                   {copy.gallery.report}
                </button>
              </div>
            </motion.div>

            <AnimatePresence>
              {isReporting ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isSubmittingReport) closeReportModal();
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{
                      type: "spring",
                      stiffness: 340,
                      damping: 30,
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="report-photo-title"
                    onClick={(event) => event.stopPropagation()}
                    className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-stone-100"
                  >
                    {reportSubmittedSuccess ? (
                      <div
                        className="flex min-h-64 flex-col items-center justify-center text-center"
                        role="status"
                      >
                        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/30">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-7 w-7"
                            aria-hidden
                          >
                            <path
                              d="m5 12 4 4L19 6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <h3 className="font-display text-2xl text-stone-100">
                          Thank you!
                        </h3>
                        <p className="mt-2 max-w-xs text-sm leading-relaxed text-stone-400">
                          Your report has been submitted for review.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReport}>
                        <header className="flex items-start justify-between gap-4">
                          <div>
                            <h2
                              id="report-photo-title"
                              className="font-display text-2xl font-semibold text-stone-100"
                            >
                              Report Photo
                            </h2>
                            <p className="mt-1 text-xs leading-relaxed text-stone-400">
                              Help us keep MYKuantan safe and authentic.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={closeReportModal}
                            disabled={isSubmittingReport}
                            aria-label="Close report form"
                            className="shrink-0 rounded-full border border-slate-700/60 bg-slate-800/80 p-2 text-stone-400 transition-colors hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="h-4 w-4"
                              aria-hidden
                            >
                              <path
                                d="M6 6l12 12M18 6 6 18"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </header>

                        <fieldset className="mt-6 space-y-2">
                          <legend className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                            Reason for report
                          </legend>
                          {REPORT_REASONS.map((reason) => (
                            <label
                              key={reason}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                                reportReason === reason
                                  ? "border-amber-400/70 bg-amber-400/10 text-amber-100"
                                  : "border-slate-700/70 bg-slate-800/50 text-stone-300 hover:border-slate-600"
                              }`}
                            >
                              <input
                                type="radio"
                                name="report-reason"
                                value={reason}
                                checked={reportReason === reason}
                                onChange={() => setReportReason(reason)}
                                className="accent-amber-400"
                              />
                              {reason}
                            </label>
                          ))}
                        </fieldset>

                        <textarea
                          value={reportDetails}
                          onChange={(event) =>
                            setReportDetails(event.target.value)
                          }
                          placeholder="Additional context (optional)..."
                          className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-400 mt-3 resize-none h-20"
                        />

                        {reportError ? (
                          <p
                            className="mt-3 text-xs text-red-400"
                            role="alert"
                          >
                            {reportError}
                          </p>
                        ) : null}

                        <button
                          type="submit"
                          disabled={isSubmittingReport}
                          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#0F3460] transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSubmittingReport ? (
                            <>
                              <span
                                className="h-4 w-4 animate-spin rounded-full border-2 border-[#0F3460]/30 border-t-[#0F3460]"
                                aria-hidden
                              />
                              Submitting...
                            </>
                          ) : (
                            "Submit Report"
                          )}
                        </button>
                      </form>
                    )}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

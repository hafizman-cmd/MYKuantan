"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LikeButton, {
  fetchAuthedLikedSet,
} from "@/components/LikeButton";
import {
  formatTravelDuration,
  getTravelEstimate,
  KUANTAN_LOCATIONS,
  optimizeRouteOrder,
  type KuantanLocation,
} from "@/lib/locations";
import { supabaseClient } from "@/lib/supabase/client";
import type { Photo } from "@/types/photo";
import { useLanguage } from "@/lib/i18n";

type CollectionTab = "frames" | "locations";

interface CollectionRow {
  photo_id: string | null;
  location_name: string | null;
  order_index: number | null;
  custom_time: string | null;
  custom_notes: string | null;
}

type ItineraryItem = CollectionRow & { location_name: string };

const PHOTO_SELECT =
  "id,image_url,photographer,location,caption,status,created_at,latitude,longitude,likes_count";

function photographerHandle(name: string): string {
  const clean = name.trim();
  if (!clean) return "@anonymous";
  return clean.startsWith("@") ? clean : `@${clean}`;
}

export default function CollectionPage() {
  const { copy } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionRows, setCollectionRows] = useState<CollectionRow[]>([]);
  const [savedPhotos, setSavedPhotos] = useState<Photo[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<
    string | number | null
  >(null);
  const [likedPhotoIds, setLikedPhotoIds] = useState<Set<string>>(
    () => new Set()
  );
  const [isReportingPhoto, setIsReportingPhoto] = useState(false);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<CollectionTab>("frames");
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [itinerarySavingKey, setItinerarySavingKey] = useState<string | null>(
    null
  );
  const itineraryOrderRef = useRef<ItineraryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [optimizationNotice, setOptimizationNotice] = useState<string | null>(
    null
  );
  const [isTouch, setIsTouch] = useState(false);
  const selectedPhoto =
    savedPhotos.find((photo) => photo.id === selectedPhotoId) ?? null;

  useEffect(() => {
    let mounted = true;

    void supabaseClient.auth.getUser().then(({ data, error: authError }) => {
      if (!mounted) return;
      if (authError) console.error("collection auth error:", authError.message);
      setUser(data.user ?? null);
      setAuthLoading(false);
    });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadCollection = useCallback(async (userId: string) => {
    setCollectionLoading(true);
    setError(null);

    const { data: rowsData, error: rowsError } = await supabaseClient
      .from("user_collections")
      .select("photo_id,location_name,order_index,custom_time,custom_notes")
      .eq("user_id", userId)
      .order("order_index", { ascending: true, nullsFirst: false });

    if (rowsError) {
      console.error("collection fetch error:", rowsError.message);
      setError("We couldn't load your saved trip. Please try again.");
      setCollectionRows([]);
      setSavedPhotos([]);
      setCollectionLoading(false);
      return;
    }

    const rows = (rowsData ?? []) as CollectionRow[];
    const photoIds = Array.from(
      new Set(
        rows
          .map((row) => row.photo_id)
          .filter((photoId): photoId is string => Boolean(photoId))
      )
    );

    let photos: Photo[] = [];
    if (photoIds.length > 0) {
      const { data: photosData, error: photosError } = await supabaseClient
        .from("photos")
        .select(PHOTO_SELECT)
        .in("id", photoIds);

      if (photosError) {
        console.error("saved photo fetch error:", photosError.message);
        setError("Your saved locations loaded, but some frames are unavailable.");
      } else {
        const photoMap = new Map(
          ((photosData ?? []) as Photo[]).map((photo) => [photo.id, photo])
        );
        photos = photoIds
          .map((photoId) => photoMap.get(photoId))
          .filter((photo): photo is Photo => Boolean(photo));
      }
    }

    setCollectionRows(rows);
    setSavedPhotos(photos);
    setCollectionLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setCollectionRows([]);
      setSavedPhotos([]);
      return;
    }
    void loadCollection(user.id);
  }, [loadCollection, user]);

  useEffect(() => {
    if (!user) {
      setLikedPhotoIds(new Set());
      return;
    }
    let cancelled = false;
    void fetchAuthedLikedSet(user.id).then((likedSet) => {
      if (!cancelled) setLikedPhotoIds(likedSet);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedPhoto) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isReportingPhoto) {
        setSelectedPhotoId(null);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isReportingPhoto, selectedPhoto]);

  const savedLocationRows = useMemo(
    () =>
      collectionRows
        .filter(
          (row): row is CollectionRow & { location_name: string } =>
            Boolean(row.location_name)
        )
        .sort((a, b) => {
          const aOrder = a.order_index ?? Number.MAX_SAFE_INTEGER;
          const bOrder = b.order_index ?? Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder;
        }),
    [collectionRows]
  );

  useEffect(() => {
    itineraryOrderRef.current = savedLocationRows;
  }, [savedLocationRows]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  const locationDetails = useMemo(
    () => new Map(KUANTAN_LOCATIONS.map((location) => [location.name, location])),
    []
  );

  const travelEstimates = useMemo(
    () =>
      savedLocationRows.slice(0, -1).map((row, index) => ({
        from: row.location_name,
        to: savedLocationRows[index + 1].location_name,
        estimate: getTravelEstimate(
          row.location_name,
          savedLocationRows[index + 1].location_name
        ),
      })),
    [savedLocationRows]
  );

  const routeSummary = useMemo(
    () =>
      travelEstimates.reduce(
        (summary, segment) => {
          if (!segment.estimate) return summary;
          return {
            durationMins: summary.durationMins + segment.estimate.durationMins,
            distanceKm:
              summary.distanceKm + Number.parseFloat(segment.estimate.distanceKm),
          };
        },
        { durationMins: 0, distanceKm: 0 }
      ),
    [travelEstimates]
  );

  const googleMapsRouteUrl = useMemo(() => {
    const coordinates = savedLocationRows
      .map((row) => locationDetails.get(row.location_name))
      .filter((location) => Boolean(location))
      .map((location) => `${location!.latitude},${location!.longitude}`);

    if (coordinates.length === 0) return null;
    if (coordinates.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        coordinates[0]
      )}`;
    }

    const origin = coordinates[0];
    const destination = coordinates[coordinates.length - 1];
    const waypoints = coordinates.slice(1, -1);
    const waypointQuery =
      waypoints.length > 0
        ? `&waypoints=${encodeURIComponent(waypoints.join("|"))}`
        : "";

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}${waypointQuery}`;
  }, [locationDetails, savedLocationRows]);

  const whatsappShareUrl = useMemo(() => {
    const lines = [copy.collection.title, ""];

    savedLocationRows.forEach((row, index) => {
      lines.push(
        `${index + 1}. ${row.location_name}`,
        `   ${copy.collection.time}: ${
          row.custom_time?.toLowerCase() === "flexible"
            ? copy.collection.flexible
            : row.custom_time || copy.collection.flexible
        }`
      );
      if (row.custom_notes?.trim()) {
        lines.push(`   ${copy.collection.notes}: ${row.custom_notes.trim()}`);
      }
      const segment = travelEstimates[index];
      if (segment?.estimate) {
        lines.push(
          `   🚗 ${segment.estimate.formatted} from ${segment.from}`
        );
      }
      lines.push("");
    });

    if (googleMapsRouteUrl) {
      lines.push(`${copy.collection.mapsRoute}: ${googleMapsRouteUrl}`);
    }

    return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [copy, googleMapsRouteUrl, savedLocationRows, travelEstimates]);

  const removeCollectionItem = async (
    column: "photo_id" | "location_name",
    value: string
  ) => {
    if (!user) return;
    const key = `${column}:${value}`;
    if (removingKey) return;

    setRemovingKey(key);
    setError(null);
    const { error: removeError } = await supabaseClient
      .from("user_collections")
      .delete()
      .eq("user_id", user.id)
      .eq(column, value);

    if (removeError) {
      console.error("collection remove error:", removeError.message);
      setError("We couldn't remove that item. Please try again.");
    } else {
      setCollectionRows((current) =>
        current.filter((row) => row[column] !== value)
      );
      if (column === "photo_id") {
        setSavedPhotos((current) =>
          current.filter((photo) => photo.id !== value)
        );
      }
    }
    setRemovingKey(null);
  };

  const handleSavedPhotoLike = (
    photoId: string,
    nextCount: number,
    nextLiked: boolean
  ) => {
    setSavedPhotos((current) =>
      current.map((photo) =>
        photo.id === photoId ? { ...photo, likes_count: nextCount } : photo
      )
    );
    setLikedPhotoIds((current) => {
      const next = new Set(current);
      if (nextLiked) next.add(photoId);
      else next.delete(photoId);
      return next;
    });
  };

  const reportSavedPhoto = async (photoId: string) => {
    if (isReportingPhoto) return;
    if (!window.confirm("Flag this photo for editorial review?")) return;
    setIsReportingPhoto(true);
    setPreviewNotice(null);
    const { error: reportError } = await supabaseClient
      .from("photo_reports")
      .insert([
        {
          photo_id: photoId,
          reason: "Inappropriate content",
          details: "Reported from My Kuantan Trip.",
        },
      ]);
    if (reportError) {
      console.error("saved frame report error:", reportError.message);
      setPreviewNotice("We couldn't submit this report. Please try again.");
    } else {
      setPreviewNotice("Thank you. This frame was flagged for review.");
    }
    setIsReportingPhoto(false);
  };

  const updateLocationDraft = (
    locationName: string,
    field: "custom_time" | "custom_notes",
    value: string
  ) => {
    setCollectionRows((current) =>
      current.map((row) =>
        row.location_name === locationName ? { ...row, [field]: value } : row
      )
    );
  };

  const saveLocationField = async (
    locationName: string,
    field: "custom_time" | "custom_notes",
    value: string
  ) => {
    if (!user) return;
    const key = `${field}:${locationName}`;
    setItinerarySavingKey(key);
    setError(null);

    const { error: updateError } = await supabaseClient
      .from("user_collections")
      .update({ [field]: value })
      .eq("user_id", user.id)
      .eq("location_name", locationName);

    if (updateError) {
      console.error("itinerary field update error:", updateError.message);
      setError("We couldn't save that itinerary change. Please try again.");
      await loadCollection(user.id);
    }
    setItinerarySavingKey(null);
  };

  const handleReorder = (nextItems: ItineraryItem[]) => {
    const indexedItems = nextItems.map((item, index) => ({
      ...item,
      order_index: index,
    }));
    itineraryOrderRef.current = indexedItems;
    const byLocation = new Map(
      indexedItems.map((item) => [item.location_name, item])
    );
    setCollectionRows((current) =>
      current.map((row) =>
        row.location_name ? byLocation.get(row.location_name) ?? row : row
      )
    );
  };

  const persistItineraryOrder = async () => {
    if (!user || itinerarySavingKey) return;
    const orderedItems = itineraryOrderRef.current.map((item, index) => ({
      ...item,
      order_index: index,
    }));
    if (orderedItems.length === 0) return;

    setItinerarySavingKey("order:all");
    setError(null);
    let updateError: { message: string } | null = null;

    for (let index = 0; index < orderedItems.length; index += 1) {
      const item = orderedItems[index];
      const { error: temporaryError } = await supabaseClient
        .from("user_collections")
        .update({ order_index: -1_000_000 - index })
        .eq("user_id", user.id)
        .eq("location_name", item.location_name);
      if (temporaryError && !updateError) updateError = temporaryError;
    }

    for (let index = 0; index < orderedItems.length; index += 1) {
      const item = orderedItems[index];
      const { error: finalError } = await supabaseClient
        .from("user_collections")
        .update({ order_index: index })
        .eq("user_id", user.id)
        .eq("location_name", item.location_name);
      if (finalError && !updateError) updateError = finalError;
    }

    if (updateError) {
      console.error("itinerary reorder error:", updateError.message);
      setError("We couldn't reorder your itinerary. Please try again.");
      await loadCollection(user.id);
    } else {
      handleReorder(orderedItems);
    }
    setItinerarySavingKey(null);
  };

  const moveLocationStop = (name: string, direction: -1 | 1) => {
    const current = itineraryOrderRef.current;
    const from = current.findIndex((item) => item.location_name === name);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    handleReorder(next);
    void persistItineraryOrder();
  };

  const optimizeItinerary = async () => {
    if (!user || savedLocationRows.length < 3 || itinerarySavingKey) return;
    const optimized = optimizeRouteOrder(savedLocationRows);
    handleReorder(optimized);
    setOptimizationNotice(copy.collection.optimizedNotice);
    await persistItineraryOrder();
  };

  return (
    <div className="collection-page flex min-h-screen w-full flex-col bg-[#0B192C] text-stone-100">
      <Navbar />
      <main className="screen-collection min-h-screen bg-[#0B192C] text-stone-100 pt-28 sm:pt-32 pb-16 px-4 sm:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <header className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-amber-400/90 text-xs tracking-[0.25em] font-mono uppercase font-semibold mb-2">
               {copy.collection.eyebrow}
            </p>
            <h1 className="font-serif text-4xl sm:text-6xl tracking-tight text-stone-100 mb-3">
               {copy.collection.title}
            </h1>
            <p className="text-stone-400 text-sm sm:text-base max-w-xl mx-auto font-sans">
               {copy.collection.description}
            </p>
          </header>

          {authLoading ? (
            <CollectionLoading />
          ) : !user ? (
            <section className="mx-auto max-w-2xl rounded-3xl border border-slate-700/70 bg-slate-900/80 p-8 text-center shadow-2xl backdrop-blur-xl md:p-12">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-2xl text-amber-300">
                ♡
              </span>
              <h2 className="mt-6 font-display text-3xl font-bold text-stone-100">
                 {copy.collection.journeyAwaits}
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-400">
                 {copy.collection.signInDescription}
              </p>
              <Link
                href="/submit?redirectTo=%2Fcollection"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-amber-400 px-7 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#0B192C] transition-colors hover:bg-amber-300"
              >
                 {copy.collection.signInUp}
              </Link>
            </section>
          ) : collectionLoading ? (
            <CollectionLoading />
          ) : (
            <>
              <div className="mb-8 flex justify-center">
                <div className="inline-flex rounded-full border border-slate-700/80 bg-slate-900/80 p-1 shadow-xl">
                  {(
                    [
                       ["frames", copy.collection.savedFrames(savedPhotos.length)],
                      [
                        "locations",
                         copy.collection.itinerary(savedLocationRows.length),
                      ],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={`rounded-full px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                        tab === id
                          ? "bg-amber-400 text-[#0B192C]"
                          : "text-stone-400 hover:text-stone-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="mx-auto mb-6 max-w-2xl rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-center text-sm text-red-200"
                >
                  {error}
                </div>
              ) : null}

              {tab === "frames" ? (
                savedPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {savedPhotos.map((photo) => {
                      const key = `photo_id:${photo.id}`;
                      return (
                        <article
                          key={photo.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Preview ${photo.caption || photo.location}`}
                          onClick={() => {
                            setPreviewNotice(null);
                            setSelectedPhotoId(photo.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setPreviewNotice(null);
                              setSelectedPhotoId(photo.id);
                            }
                          }}
                          className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#153352] shadow-xl transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-black/30">
                            <Image
                              src={photo.image_url}
                              alt={photo.caption || photo.location}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-100 backdrop-blur-md">
                              {photo.location}
                            </span>
                          </div>
                          <div className="p-4">
                            <h2 className="font-display line-clamp-2 text-lg font-semibold text-stone-100">
                              {photo.caption || photo.location}
                            </h2>
                            <p className="mt-1 text-xs text-stone-400">
                              {photographerHandle(photo.photographer)}
                            </p>
                            <button
                              type="button"
                              disabled={removingKey === key}
                              onClick={(event) => {
                                event.stopPropagation();
                                void removeCollectionItem("photo_id", photo.id);
                              }}
                              className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-400/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300 transition-colors hover:bg-rose-400/15 disabled:cursor-wait disabled:opacity-50"
                            >
                               {removingKey === key ? "Removing..." : copy.collection.remove}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyCollection
                     title={copy.collection.noSavedFrames}
                     body={copy.collection.savedFramesDescription}
                     href="/gallery"
                     action={copy.collection.browseGallery}
                  />
                )
              ) : savedLocationRows.length > 0 ? (
                <div className="mx-auto max-w-5xl">
                  <div className="print-hidden mb-6 flex flex-col gap-4 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-stone-100">
                         {copy.collection.itineraryTitle}
                      </h2>
                      <p className="mt-1 text-xs text-stone-400">
                         {copy.collection.itineraryDescription}
                      </p>
                      {isTouch ? (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                          <span aria-hidden>↕</span>
                           {copy.collection.reorderHint}
                        </p>
                      ) : null}
                      <div className="mt-4 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">
                        <div className="col-span-2 rounded-xl border border-slate-700/60 bg-slate-800/45 px-2.5 py-2 text-center sm:col-span-1">
                          <span className="block text-[9px] uppercase tracking-[0.16em] text-stone-500">
                            {copy.collection.routeSummary}
                          </span>
                          <span className="mt-1 block font-mono text-[11px] leading-tight text-amber-300">
                            {copy.collection.totalStops(savedLocationRows.length)}
                          </span>
                        </div>
                        <div className="min-w-0 rounded-xl border border-slate-700/60 bg-slate-800/45 px-2.5 py-2 text-center">
                          <span className="block text-[9px] uppercase tracking-[0.16em] text-stone-500">
                            {copy.collection.drive}
                          </span>
                          <span className="mt-1 block break-words font-mono text-[11px] leading-tight text-amber-300">
                            {copy.collection.totalDrive(
                              formatTravelDuration(routeSummary.durationMins)
                            )}
                          </span>
                        </div>
                        <div className="min-w-0 rounded-xl border border-slate-700/60 bg-slate-800/45 px-2.5 py-2 text-center">
                          <span className="block text-[9px] uppercase tracking-[0.16em] text-stone-500">
                            {copy.collection.distance}
                          </span>
                          <span className="mt-1 block break-words font-mono text-[11px] leading-tight text-amber-300">
                            {copy.collection.totalDistance(
                              routeSummary.distanceKm.toFixed(1)
                            )}
                          </span>
                        </div>
                      </div>
                      {optimizationNotice ? (
                        <p className="mt-3 inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                          {optimizationNotice}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
                      {savedLocationRows.length >= 3 ? (
                        <button
                          type="button"
                          onClick={() => void optimizeItinerary()}
                          disabled={itinerarySavingKey !== null}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/80 px-4 py-2 text-xs font-mono text-amber-400 transition-all hover:bg-slate-700/80 disabled:cursor-wait disabled:opacity-50"
                        >
                          <span aria-hidden>⚡</span>
                          {copy.collection.optimizeRoute}
                        </button>
                      ) : null}
                      {googleMapsRouteUrl ? (
                        <a
                          href={googleMapsRouteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full bg-amber-500 px-5 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-stone-950 transition-colors hover:bg-amber-400"
                        >
                          {copy.collection.mapsRoute}
                        </a>
                      ) : null}
                      <a
                        href={whatsappShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#062b16] transition-colors hover:bg-[#42e47c]"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-4 w-4"
                          aria-hidden
                        >
                          <path d="M12 2a9.8 9.8 0 0 0-8.48 14.73L2 22l5.43-1.43A9.8 9.8 0 1 0 12 2Zm0 17.9a8.08 8.08 0 0 1-4.12-1.13l-.3-.18-3.22.85.86-3.14-.2-.32A8.1 8.1 0 1 1 12 19.9Zm4.44-6.07c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.52.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
                        </svg>
                         {copy.collection.shareWhatsapp}
                      </a>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center justify-center rounded-full border border-slate-600 bg-slate-800 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-200 transition-colors hover:border-stone-400 hover:text-white"
                      >
                         {copy.collection.printPdf}
                      </button>
                    </div>
                  </div>

                  <Reorder.Group
                    as="div"
                    axis="y"
                    values={savedLocationRows}
                    onReorder={handleReorder}
                    className="space-y-4"
                  >
                    {savedLocationRows.map((row, index) => {
                      const segment = travelEstimates[index];
                      return (
                        <Fragment key={row.location_name}>
                          <ItineraryRow
                            row={row}
                            index={index}
                            details={locationDetails.get(row.location_name)}
                            removingKey={removingKey}
                            itinerarySavingKey={itinerarySavingKey}
                            isTouch={isTouch}
                            onRemove={(name) =>
                              void removeCollectionItem("location_name", name)
                            }
                            onUpdateDraft={updateLocationDraft}
                            onSaveField={(name, field, value) =>
                              void saveLocationField(name, field, value)
                            }
                            onPersistOrder={persistItineraryOrder}
                            onMove={moveLocationStop}
                            total={savedLocationRows.length}
                          />
                          {segment?.estimate ? (
                            <div className="my-2 flex items-center justify-center py-1">
                              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1 font-mono text-[11px] text-amber-400/90 shadow-sm">
                                <span aria-hidden>🚗</span>
                                <span>
                                  {segment.estimate.formatted} from {segment.from}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </Reorder.Group>
                </div>
              ) : (
                <EmptyCollection
                   title={copy.collection.noSavedLocations}
                   body={copy.collection.savedLocationsDescription}
                   href="/visit"
                   action={copy.collection.exploreTrails}
                />
              )}
            </>
          )}
        </div>

        <AnimatePresence>
          {selectedPhoto ? (
            <motion.div
              key="saved-photo-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 pt-20 sm:pt-24 overflow-y-auto"
              onClick={() => {
                if (!isReportingPhoto) {
                  setPreviewNotice(null);
                  setSelectedPhotoId(null);
                }
              }}
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
                aria-labelledby="saved-photo-preview-user"
                className="relative max-w-3xl sm:max-w-4xl w-full max-h-[85vh] bg-slate-900/95 border border-slate-800 rounded-3xl overflow-y-auto shadow-2xl flex flex-col p-5 sm:p-7 my-auto z-[100000]"
              >
                <header className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#1A4A7A] text-sm font-bold uppercase text-[#F5F0E8] shadow-inner">
                    {selectedPhoto.photographer.trim().replace(/^@/, "")[0] ??
                      "A"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      id="saved-photo-preview-user"
                      className="truncate text-sm font-semibold text-stone-100"
                    >
                      {photographerHandle(selectedPhoto.photographer)}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-stone-400">
                      <span aria-hidden>📍 </span>
                      {selectedPhoto.location}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isReportingPhoto}
                    onClick={() => {
                      setPreviewNotice(null);
                      setSelectedPhotoId(null);
                    }}
                    aria-label="Close photo preview"
                    className="relative z-10 rounded-full border border-slate-700/50 bg-slate-800/80 p-1.5 text-stone-400 transition-colors hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
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
                    src={selectedPhoto.image_url}
                    alt={selectedPhoto.caption || selectedPhoto.location}
                    width={1600}
                    height={1200}
                    sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(100vw - 48px), 896px"
                    className="w-full max-h-[70vh] object-contain rounded-2xl h-auto"
                  />
                </div>

                {selectedPhoto.caption ? (
                  <p className="mb-4 text-sm leading-relaxed text-stone-300">
                    {selectedPhoto.caption}
                  </p>
                ) : null}

                {previewNotice ? (
                  <p
                    role="status"
                    className="mb-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-stone-300"
                  >
                    {previewNotice}
                  </p>
                ) : null}

                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  <LikeButton
                    photoId={selectedPhoto.id}
                    initialCount={selectedPhoto.likes_count ?? 0}
                    initiallyLiked={likedPhotoIds.has(selectedPhoto.id)}
                    isAuthed={Boolean(user)}
                    userId={user?.id}
                    onLikeChange={(nextCount, nextLiked) =>
                      handleSavedPhotoLike(
                        selectedPhoto.id,
                        nextCount,
                        nextLiked
                      )
                    }
                  />
                  <button
                    type="button"
                    disabled={isReportingPhoto}
                    onClick={() => void reportSavedPhoto(selectedPhoto.id)}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-50"
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
                    {isReportingPhoto ? "Reporting..." : "Report"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <section className="print-itinerary" aria-label="Printable itinerary">
        <header className="print-document-header">
          <p>MYKUANTAN · {copy.collection.eyebrow.toUpperCase()}</p>
          <h1>{copy.collection.title}</h1>
          <span>
            {copy.collection.totalStops(savedLocationRows.length)} · {copy.collection.totalDrive(formatTravelDuration(routeSummary.durationMins))} · {copy.collection.totalDistance(routeSummary.distanceKm.toFixed(1))}
          </span>
        </header>
        {savedLocationRows.length > 0 ? (
          <ol className="print-stop-list">
            {savedLocationRows.map((row, index) => {
              const details = locationDetails.get(row.location_name);
              const segment = travelEstimates[index];
              const time =
                row.custom_time?.toLowerCase() === "flexible"
                  ? copy.collection.flexible
                  : row.custom_time || copy.collection.flexible;
              return (
                <Fragment key={row.location_name}>
                  <li className="print-stop">
                    <span className="print-stop-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="print-stop-heading">
                        <h2>{row.location_name}</h2>
                        <time>{time}</time>
                      </div>
                      {details ? (
                        <p className="print-coordinates">
                          {details.latitude.toFixed(6)}, {details.longitude.toFixed(6)}
                        </p>
                      ) : null}
                      {row.custom_notes ? (
                        <p className="print-notes">{row.custom_notes}</p>
                      ) : null}
                    </div>
                  </li>
                  {segment?.estimate ? (
                    <li className="print-travel">
                      🚗 {segment.estimate.formatted} from {segment.from}
                    </li>
                  ) : null}
                </Fragment>
              );
            })}
          </ol>
        ) : (
          <p className="print-empty">No saved itinerary stops yet.</p>
        )}
        <footer className="print-document-footer">
          Curated with MYKuantan · Kuantan, Pahang
        </footer>
      </section>
      <Footer />

      <style jsx global>{`
        .print-itinerary {
          display: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 14mm 16mm;
          }

          html,
          body {
            background: #ffffff !important;
            color: #172033 !important;
          }

          .collection-page {
            display: block !important;
            min-height: auto !important;
            background: #ffffff !important;
            color: #172033 !important;
          }

          .collection-page > header,
          .collection-page > footer,
          .screen-collection,
          .print-hidden,
          button,
          nav {
            display: none !important;
          }

          .print-itinerary {
            display: block !important;
            width: 100%;
            color: #172033 !important;
            font-family: var(--font-inter), sans-serif;
          }

          .print-document-header {
            padding-bottom: 12px;
            border-bottom: 2px solid #172033;
          }

          .print-document-header p {
            margin: 0 0 5px;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.22em;
          }

          .print-document-header h1 {
            margin: 0;
            font-family: var(--font-playfair), serif;
            font-size: 25px;
            line-height: 1.1;
          }

          .print-document-header span {
            display: block;
            margin-top: 5px;
            font-size: 9px;
            color: #526070;
          }

          .print-stop-list {
            display: grid;
            gap: 7px;
            margin: 14px 0 0;
            padding: 0;
            list-style: none;
          }

          .print-stop {
            display: grid;
            grid-template-columns: 28px 1fr;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #d7dce2;
            break-inside: avoid;
          }

          .print-travel {
            margin: -2px 0 0 38px;
            color: #8a6418;
            font-family: monospace;
            font-size: 8px;
            list-style: none;
          }

          .print-stop-number {
            display: flex;
            width: 26px;
            height: 26px;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: #f2b632;
            color: #172033;
            font-size: 9px;
            font-weight: 800;
          }

          .print-stop-heading {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 12px;
          }

          .print-stop-heading h2 {
            margin: 0;
            font-family: var(--font-playfair), serif;
            font-size: 14px;
          }

          .print-stop-heading time {
            flex-shrink: 0;
            font-family: monospace;
            font-size: 9px;
            font-weight: 700;
          }

          .print-coordinates {
            margin: 2px 0 0;
            color: #687482;
            font-family: monospace;
            font-size: 7px;
          }

          .print-notes {
            margin: 4px 0 0;
            color: #344152;
            font-size: 9px;
            line-height: 1.35;
          }

          .print-empty {
            margin: 36px 0;
            text-align: center;
            color: #687482;
          }

          .print-document-footer {
            margin-top: 14px;
            padding-top: 7px;
            border-top: 1px solid #172033;
            color: #687482;
            font-size: 7px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }
        }
      `}</style>
    </div>
  );
}

function CollectionLoading() {
  return (
    <div
      className="mx-auto max-w-5xl"
      aria-label="Loading your saved trip"
      role="status"
    >
      <div className="mb-8 flex justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-amber-400" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60"
          >
            <div className="aspect-[4/3] animate-pulse bg-slate-800" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyCollection({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-700/70 bg-slate-900/70 p-9 text-center">
      <h2 className="font-display text-2xl font-bold text-stone-100">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-400">{body}</p>
      <Link
        href={href}
        className="mt-6 inline-flex rounded-full border border-amber-400/40 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300 transition-colors hover:bg-amber-400 hover:text-[#0B192C]"
      >
        {action}
      </Link>
    </section>
  );
}

function TimePicker({
  value,
  open,
  onOpenChange,
  onSelect,
}: {
  value: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string) => void;
}) {
  const { copy } = useLanguage();
  const [meridiem, setMeridiem] = useState<"AM" | "PM">("AM");
  const isFlexible =
    !value ||
    value.trim().toLowerCase() === "flexible" ||
    value.trim().toLowerCase() === copy.collection.flexible.toLowerCase();
  const display = isFlexible ? copy.collection.flexible : value;

  const toggle = () => {
    if (!open) {
      setMeridiem(/\bPM\b/i.test(value ?? "") ? "PM" : "AM");
    }
    onOpenChange(!open);
  };

  const choose = (next: string) => {
    onSelect(next);
    onOpenChange(false);
  };

  return (
    <div className={`relative ${open ? "z-30" : ""}`}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-9 w-full items-center justify-between gap-1 rounded-xl border bg-slate-900/80 px-3 text-xs text-stone-200 transition-colors sm:h-10 ${
          open ? "border-amber-400" : "border-slate-700/70"
        }`}
      >
        <span className="truncate">{display}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="h-3 w-3 shrink-0 text-stone-500"
          aria-hidden
        >
          <path
            d="m6 10 6 6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onPointerDown={() => onOpenChange(false)}
          />
          <div
            role="listbox"
            aria-label="Pick a time"
            className="absolute left-0 top-full z-50 mt-2 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-1 border-b border-slate-800 p-1.5">
              <button
                type="button"
                onClick={() => choose("Flexible")}
                className={`rounded-lg px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                  display === copy.collection.flexible
                    ? "bg-amber-400 text-[#0B192C]"
                    : "text-stone-400 hover:bg-slate-800 hover:text-stone-200"
                }`}
              >
                {copy.collection.flexible}
              </button>
              <div className="flex rounded-lg bg-slate-800 p-0.5">
                {(["AM", "PM"] as const).map((half) => (
                  <button
                    key={half}
                    type="button"
                    onClick={() => setMeridiem(half)}
                    className={`rounded-md px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] transition-colors ${
                      meridiem === half
                        ? "bg-amber-400 text-[#0B192C]"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    {half}
                  </button>
                ))}
              </div>
            </div>
            <ul className="max-h-44 overflow-y-auto p-1">
              {TIME_PICKER_SLOTS.map((slot) => {
                const full = `${slot} ${meridiem}`;
                const selected = display === full;
                return (
                  <li key={slot}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => choose(full)}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors ${
                        selected
                          ? "bg-amber-400 font-bold text-[#0B192C]"
                          : "text-stone-300 hover:bg-slate-800"
                      }`}
                    >
                      {full}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}

const TIME_PICKER_SLOTS = Array.from({ length: 24 }, (_, slotIndex) => {
  const hour24 = Math.floor(slotIndex / 2);
  const minute = slotIndex % 2 === 0 ? "00" : "30";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, "0")}:${minute}`;
});

function ItineraryRow({
  row,
  index,
  details,
  removingKey,
  itinerarySavingKey,
  isTouch,
  onRemove,
  onUpdateDraft,
  onSaveField,
  onPersistOrder,
  onMove,
  total,
}: {
  row: ItineraryItem;
  index: number;
  details: KuantanLocation | undefined;
  removingKey: string | null;
  itinerarySavingKey: string | null;
  isTouch: boolean;
  onRemove: (name: string) => void;
  onUpdateDraft: (
    name: string,
    field: "custom_time" | "custom_notes",
    value: string
  ) => void;
  onSaveField: (
    name: string,
    field: "custom_time" | "custom_notes",
    value: string
  ) => void;
  onPersistOrder: () => void;
  onMove: (name: string, direction: -1 | 1) => void;
  total: number;
}) {
  const { copy } = useLanguage();
  const controls = useDragControls();
  const longPressTimer = useRef<number | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const [isArmingHold, setIsArmingHold] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const name = row.location_name;
  const removeKey = `location_name:${name}`;
  const rowIsSaving =
    itinerarySavingKey === "order:all" ||
    Boolean(itinerarySavingKey && itinerarySavingKey.endsWith(name));

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsArmingHold(false);
    startPoint.current = null;
  }, []);

  const handleCardPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") return;
    startPoint.current = { x: event.clientX, y: event.clientY };
    setIsArmingHold(true);
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      setIsArmingHold(false);
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function"
      ) {
        try {
          navigator.vibrate(15);
        } catch {
          /* haptics unsupported */
        }
      }
      controls.start(event.nativeEvent);
    }, 450);
  };

  const handleCardPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (longPressTimer.current === null || !startPoint.current) return;
    const dx = event.clientX - startPoint.current.x;
    const dy = event.clientY - startPoint.current.y;
    if (Math.hypot(dx, dy) > 10) {
      clearLongPress();
    }
  };

  const handleTouchStart = (
    event: ReactPointerEvent<HTMLElement>
  ): void => {
    if (isTouch) {
      event.stopPropagation();
      handleCardPointerDown(event);
    }
  };

  const handleTouchMove = (
    event: ReactPointerEvent<HTMLElement>
  ): void => {
    if (!isTouch) return;
    event.stopPropagation();
    handleCardPointerMove(event);
  };

  const handleTouchEnd = (
    event: ReactPointerEvent<HTMLElement>
  ): void => {
    if (!isTouch) return;
    event.stopPropagation();
    clearLongPress();
  };

  const dragConfig = isTouch
    ? { dragListener: false as const, dragControls: controls }
    : {};

  return (
    <Reorder.Item
      as="article"
      key={name}
      value={row}
      onDragStart={() => {
        didDragRef.current = true;
      }}
      onDragEnd={() => {
        const didDrag = didDragRef.current;
        didDragRef.current = false;
        clearLongPress();
        if (didDrag) void onPersistOrder();
      }}
      whileDrag={{
        scale: 1.015,
        boxShadow: "0 24px 60px rgba(0,0,0,0.38)",
      }}
      className={`rounded-2xl border bg-slate-900/70 p-4 shadow-lg transition-shadow sm:p-5 ${
        timePickerOpen ? "relative z-30" : ""
      } ${
        isArmingHold
          ? "border-amber-400/70 ring-2 ring-amber-400/40"
          : "border-slate-700/70"
      }`}
      {...dragConfig}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 md:contents">
          <span
            aria-hidden
            onPointerDown={isTouch ? handleTouchStart : undefined}
            onPointerMove={isTouch ? handleTouchMove : undefined}
            onPointerUp={isTouch ? handleTouchEnd : undefined}
            onPointerCancel={isTouch ? handleTouchEnd : undefined}
            style={isTouch ? { touchAction: "none" } : undefined}
            className={`print-hidden flex shrink-0 select-none items-center justify-center font-mono text-lg tracking-[-0.18em] text-stone-500 transition-colors active:cursor-grabbing ${
              isTouch
                ? "cursor-grab -ml-1.5 mr-0.5 h-9 w-7 sm:h-11 sm:w-9"
                : "cursor-grab hover:text-amber-400"
            } ${isArmingHold ? "!text-amber-400" : ""}`}
          >
            :::
          </span>

          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3 md:w-56 md:flex-none md:shrink-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-[#0B192C] sm:h-11 sm:w-11 sm:text-xs">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-base font-semibold text-stone-100 sm:text-xl">
                {name}
              </h3>
              <p className="mt-0.5 truncate font-mono text-[9px] tracking-wide text-stone-500 sm:mt-1 sm:text-[10px]">
                {details
                  ? `${details.latitude.toFixed(6)}, ${details.longitude.toFixed(6)}`
                  : "Coordinates unavailable"}
              </p>
            </div>
          </div>

          <div
            className="print-hidden ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:order-last"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                aria-label={`Move ${name} up to position ${index}`}
                disabled={index === 0 || rowIsSaving}
                onClick={() => onMove(name, -1)}
                className="rounded-md border border-slate-700/70 bg-slate-800/80 p-1 text-stone-400 transition-colors hover:border-amber-400/60 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="h-3.5 w-3.5"
                  aria-hidden
                >
                  <path
                    d="m6 14 6-6 6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label={`Move ${name} down to position ${index + 2}`}
                disabled={index >= total - 1 || rowIsSaving}
                onClick={() => onMove(name, 1)}
                className="rounded-md border border-slate-700/70 bg-slate-800/80 p-1 text-stone-400 transition-colors hover:border-amber-400/60 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="h-3.5 w-3.5"
                  aria-hidden
                >
                  <path
                    d="m6 10 6 6 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <button
              type="button"
              disabled={removingKey === removeKey}
              onClick={() => onRemove(name)}
              aria-label={`Remove ${name} from itinerary`}
              className="flex items-center gap-1.5 rounded-full border border-rose-400/30 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-300 transition-colors hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-50 sm:px-3"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5 sm:hidden"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">
                {removingKey === removeKey ? "Removing..." : copy.collection.remove}
              </span>
            </button>
          </div>
        </div>

        <div
          className="grid flex-1 grid-cols-[6.75rem_1fr] items-center gap-2 sm:grid-cols-3 sm:gap-3 md:mx-2"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="block">
            <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              {copy.collection.time}
            </span>
            <TimePicker
              value={row.custom_time}
              open={timePickerOpen}
              onOpenChange={setTimePickerOpen}
              onSelect={(next) => {
                onUpdateDraft(name, "custom_time", next);
                onSaveField(name, "custom_time", next);
              }}
            />
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              {copy.collection.notes}
            </span>
            <textarea
              value={row.custom_notes ?? ""}
              placeholder="Add a note for this stop..."
              onChange={(event) =>
                onUpdateDraft(name, "custom_notes", event.target.value)
              }
              onBlur={(event) =>
                onSaveField(name, "custom_notes", event.currentTarget.value)
              }
              rows={1}
              className="w-full h-9 sm:h-10 bg-slate-900/80 border border-slate-700/70 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400 transition-colors placeholder:text-stone-500 resize-none flex items-center"
            />
          </label>
        </div>
      </div>
      {rowIsSaving ? (
        <p className="mt-2 text-right text-[9px] uppercase tracking-[0.18em] text-amber-300/70">
          Saving...
        </p>
      ) : null}
    </Reorder.Item>
  );
}

"use client";

import {
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
import { KUANTAN_LOCATIONS, type KuantanLocation } from "@/lib/locations";
import { supabaseClient } from "@/lib/supabase/client";
import type { Photo } from "@/types/photo";

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

  return (
    <div className="collection-page flex min-h-screen w-full flex-col bg-[#0B192C] text-stone-100">
      <Navbar />
      <main className="screen-collection min-h-screen bg-[#0B192C] text-stone-100 pt-28 sm:pt-32 pb-16 px-4 sm:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <header className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-amber-400/90 text-xs tracking-[0.25em] font-mono uppercase font-semibold mb-2">
              Personal Field Notes
            </p>
            <h1 className="font-serif text-4xl sm:text-6xl tracking-tight text-stone-100 mb-3">
              My Kuantan Trip
            </h1>
            <p className="text-stone-400 text-sm sm:text-base max-w-xl mx-auto font-sans">
              A private collection of the frames and places shaping your next
              journey along Kuantan&apos;s coast.
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
                Your Kuantan Journey Awaits
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-400">
                Sign in to curate your personal itinerary, save favorite gallery
                frames, and plan your coastal escape.
              </p>
              <Link
                href="/submit?redirectTo=%2Fcollection"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-amber-400 px-7 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#0B192C] transition-colors hover:bg-amber-300"
              >
                Sign In / Sign Up
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
                      ["frames", `Saved Frames (${savedPhotos.length})`],
                      [
                        "locations",
                        `My Itinerary (${savedLocationRows.length})`,
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
                              {removingKey === key ? "Removing..." : "Remove"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyCollection
                    title="No saved frames yet"
                    body="Explore The Archive and bookmark the photographs you want to remember."
                    href="/gallery"
                    action="Browse Gallery"
                  />
                )
              ) : savedLocationRows.length > 0 ? (
                <div className="mx-auto max-w-5xl">
                  <div className="print-hidden mb-6 flex flex-col gap-4 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-stone-100">
                        My Itinerary
                      </h2>
                      <p className="mt-1 text-xs text-stone-400">
                        Reorder stops, set your timing, and leave private field
                        notes.
                      </p>
                      {isTouch ? (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                          <span aria-hidden>✋</span>
                          Press &amp; hold a stop to drag it
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {googleMapsRouteUrl ? (
                        <a
                          href={googleMapsRouteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-amber-500 text-stone-950 font-bold rounded-full px-5 py-2.5 hover:bg-amber-400 text-[11px] uppercase tracking-[0.12em] transition-colors"
                        >
                          Open Google Maps Route ↗
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-full border border-slate-600 bg-slate-800 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-200 transition-colors hover:border-stone-400 hover:text-white"
                      >
                        Print / Save as PDF 🖨️
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
                    {savedLocationRows.map((row, index) => (
                      <ItineraryRow
                        key={row.location_name}
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
                      />
                    ))}
                  </Reorder.Group>
                </div>
              ) : (
                <EmptyCollection
                  title="No saved locations yet"
                  body="Open the Visit trails and bookmark the stops for your personal route."
                  href="/visit"
                  action="Explore Visit Trails"
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
          <p>MYKUANTAN · PERSONAL FIELD NOTES</p>
          <h1>MY KUANTAN TRIP ITINERARY</h1>
          <span>
            {savedLocationRows.length} planned stop
            {savedLocationRows.length === 1 ? "" : "s"}
          </span>
        </header>
        {savedLocationRows.length > 0 ? (
          <ol className="print-stop-list">
            {savedLocationRows.map((row, index) => {
              const details = locationDetails.get(row.location_name);
              return (
                <li key={row.location_name} className="print-stop">
                  <span className="print-stop-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="print-stop-heading">
                      <h2>{row.location_name}</h2>
                      <time>{row.custom_time || "Flexible"}</time>
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
}) {
  const controls = useDragControls();
  const longPressTimer = useRef<number | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const [isArmingHold, setIsArmingHold] = useState(false);

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

  const touchHandlers = isTouch
    ? {
        onPointerDown: handleCardPointerDown,
        onPointerMove: handleCardPointerMove,
        onPointerUp: clearLongPress,
        onPointerCancel: clearLongPress,
      }
    : {};

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
      className={`rounded-2xl border bg-slate-900/70 p-5 shadow-lg transition-shadow ${
        isArmingHold
          ? "border-amber-400/70 ring-2 ring-amber-400/40"
          : "border-slate-700/70"
      }`}
      {...dragConfig}
      {...touchHandlers}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <span
          aria-hidden
          className={`print-hidden shrink-0 select-none font-mono text-lg tracking-[-0.18em] text-stone-500 transition-colors active:cursor-grabbing ${
            isTouch ? "cursor-grab" : "cursor-grab hover:text-amber-400"
          }`}
        >
          :::
        </span>

        <div className="flex items-center gap-3 md:w-56 md:shrink-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-[#0B192C]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-xl font-semibold text-stone-100">
              {name}
            </h3>
            <p className="mt-1 font-mono text-[10px] tracking-wide text-stone-500">
              {details
                ? `${details.latitude.toFixed(6)}, ${details.longitude.toFixed(6)}`
                : "Coordinates unavailable"}
            </p>
          </div>
        </div>

        <div
          className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center mx-2 sm:mx-4"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <label className="block sm:col-span-1">
            <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              Time
            </span>
            <input
              type="text"
              value={row.custom_time ?? "Flexible"}
              placeholder="09:00 AM"
              onChange={(event) =>
                onUpdateDraft(name, "custom_time", event.target.value)
              }
              onBlur={(event) =>
                onSaveField(name, "custom_time", event.currentTarget.value)
              }
              className="w-full h-10 bg-slate-900/80 border border-slate-700/70 rounded-xl px-3 text-xs text-stone-200 focus:outline-none focus:border-amber-400 transition-colors flex items-center"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              Notes
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
              className="w-full h-10 bg-slate-900/80 border border-slate-700/70 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400 transition-colors placeholder:text-stone-500 resize-none flex items-center"
            />
          </label>
        </div>

        <div
          className="print-hidden flex shrink-0 items-center gap-2"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            disabled={removingKey === removeKey}
            onClick={() => onRemove(name)}
            className="rounded-full border border-rose-400/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-300 transition-colors hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-50"
          >
            {removingKey === removeKey ? "Removing..." : "Remove"}
          </button>
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

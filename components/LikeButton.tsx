"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabaseClient } from "@/lib/supabase/client";

export const GUEST_LIKES_LS_KEY = "mykuantan_liked_photos";

export function readGuestLikedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(GUEST_LIKES_LS_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

export function writeGuestLikedSet(next: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      GUEST_LIKES_LS_KEY,
      JSON.stringify(Array.from(next))
    );
  } catch {
    /* ignore quota / privacy errors */
  }
}

export async function fetchAuthedLikedSet(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabaseClient
      .from("photo_likes")
      .select("photo_id")
      .eq("user_id", userId);
    if (error) {
      console.error("fetchAuthedLikedSet error:", error.message);
      return new Set();
    }
    return new Set((data ?? []).map((row) => row.photo_id as string));
  } catch {
    return new Set();
  }
}

interface LikeButtonProps {
  photoId: string;
  initialCount: number;
  initiallyLiked: boolean;
  isAuthed: boolean;
  userId?: string | null;
}

export default function LikeButton({
  photoId,
  initialCount,
  initiallyLiked,
  isAuthed,
  userId,
}: LikeButtonProps) {
  const [count, setCount] = useState<number>(initialCount);
  const [liked, setLiked] = useState<boolean>(initiallyLiked);
  const [busy, setBusy] = useState(false);
  const [particles, setParticles] = useState<number[]>([]);
  const particleSeq = useRef(0);

  // ── Mount-time authoritative resolution ─────────────────────────────
  // Re-resolve liked state from the source of truth (photo_likes table for
  // authenticated users, localStorage for guests) so that a page refresh
  // can never leave the heart in a stale "unliked" state. This runs against
  // the same persisted-session client the login flow uses, so a refreshed
  // authenticated session is recovered correctly.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        if (cancelled) return;
        const activeUserId = sessionData.session?.user?.id ?? null;

        if (activeUserId) {
          // Authenticated: look up the exact (photo_id, user_id) row.
          const { data, error } = await supabaseClient
            .from("photo_likes")
            .select("photo_id")
            .eq("photo_id", photoId)
            .eq("user_id", activeUserId)
            .maybeSingle();
          if (cancelled) return;
          if (!error) {
            setLiked(Boolean(data));
          }
        } else {
          // Guest: consult localStorage.
          setLiked(readGuestLikedSet().has(photoId));
        }
      } catch {
        /* keep prop-derived state on resolution failure */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [photoId]);

  // Re-sync count if the upstream initialCount changes (e.g. server refetch).
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  // upstream initiallyLiked is only a seed; the mount effect above is
  // authoritative. Keep the prop in the interface for parent compatibility.
  void initiallyLiked;
  void isAuthed;
  void userId;

  const spawnParticle = useCallback(() => {
    const id = ++particleSeq.current;
    setParticles((prev) => [...prev, id]);
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((x) => x !== id));
    }, 650);
  }, []);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (busy) return;
      setBusy(true);

      const prevLiked = liked;
      const nextLiked = !prevLiked;

      // 0ms optimistic local toggle
      setLiked(nextLiked);
      setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
      if (nextLiked) spawnParticle();

      try {
        // (1) Live session check — don't trust stale props in case the
        // session changed between mount and click.
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const activeUserId = sessionData.session?.user?.id ?? null;
        const authed = Boolean(activeUserId);

        // (2) Always update the master photos.likes_count via RPC, for
        // both authenticated users and guests.
        const rpcName = nextLiked
          ? "increment_photo_like"
          : "decrement_photo_like";
        const { error: rpcError } = await supabaseClient.rpc(rpcName, {
          p_photo_id: photoId,
        });
        if (rpcError) throw rpcError;

        // (3) Per-user persistence.
        if (authed && activeUserId) {
          // Authenticated: insert / delete a row in public.photo_likes.
          if (nextLiked) {
            const { error: insertError } = await supabaseClient
              .from("photo_likes")
              .insert({ photo_id: photoId, user_id: activeUserId });
            // 23505 = unique_violation (already liked) — treat as success.
            if (insertError && insertError.code !== "23505") {
              throw insertError;
            }
          } else {
            const { error: deleteError } = await supabaseClient
              .from("photo_likes")
              .delete()
              .eq("photo_id", photoId)
              .eq("user_id", activeUserId);
            if (deleteError) throw deleteError;
          }
        } else {
          // Guest: track liked IDs in localStorage only.
          const set = readGuestLikedSet();
          if (nextLiked) set.add(photoId);
          else set.delete(photoId);
          writeGuestLikedSet(set);
        }
      } catch (err) {
        // Revert optimistic UI state on any failure.
        console.error("like persistence error:", err);
        setLiked(prevLiked);
        setCount((c) => Math.max(0, c + (prevLiked ? 1 : -1)));
      } finally {
        setBusy(false);
      }
    },
    [busy, liked, photoId, spawnParticle]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      aria-pressed={liked}
      aria-label={liked ? "Unlike photo" : "Like photo"}
      className={`group/like relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] backdrop-blur-md transition-colors duration-300 ${
        liked
          ? "border-red-500/50 bg-red-500/15 text-red-600 shadow-[0_0_20px_rgba(220,38,38,0.55)]"
          : "border-white/25 bg-black/35 text-stone-300 hover:text-red-500 hover:border-red-500/50"
      }`}
    >
      <span className="pointer-events-none relative flex h-4 w-4 items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-transform duration-300 ${
            liked ? "scale-110" : "scale-100 group-hover/like:scale-110"
          }`}
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          />
        </svg>
        <AnimatePresence>
          {particles.map((id) => (
            <motion.span
              key={id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -44, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 text-base font-bold will-change-transform"
            >
              ♥
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
      <span className={`tabular-nums ${liked ? "font-bold" : "font-medium"}`}>
        {count}
      </span>
    </button>
  );
}
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";

type CollectionColumn = "location_name" | "photo_id";

const SIGN_IN_MESSAGE = "Sign in to save this location to your trip!";

export function useCollection() {
  const [bookmarkedLocations, setBookmarkedLocations] = useState<Set<string>>(
    () => new Set()
  );
  const [bookmarkedPhotoIds, setBookmarkedPhotoIds] = useState<Set<string>>(
    () => new Set()
  );
  const [busyKeys, setBusyKeys] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2800);
  }, []);

  const hydrateCollections = useCallback(async (userId: string | null) => {
    if (!userId) {
      setBookmarkedLocations(new Set());
      setBookmarkedPhotoIds(new Set());
      return;
    }

    const { data, error } = await supabaseClient
      .from("user_collections")
      .select("location_name,photo_id")
      .eq("user_id", userId);

    if (error) {
      console.error("load user collection error:", error.message);
      return;
    }

    setBookmarkedLocations(
      new Set(
        (data ?? [])
          .map((item) => item.location_name as string | null)
          .filter((value): value is string => Boolean(value))
      )
    );
    setBookmarkedPhotoIds(
      new Set(
        (data ?? [])
          .map((item) => item.photo_id as string | null)
          .filter((value): value is string => Boolean(value))
      )
    );
  }, []);

  useEffect(() => {
    let mounted = true;

    void supabaseClient.auth.getUser().then(({ data }) => {
      if (mounted) void hydrateCollections(data.user?.id ?? null);
    });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        window.setTimeout(() => {
          if (mounted) void hydrateCollections(session?.user?.id ?? null);
        }, 0);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [hydrateCollections]);

  const toggleBookmark = useCallback(
    async (column: CollectionColumn, value: string) => {
      const busyKey = `${column}:${value}`;
      if (busyKeys.has(busyKey)) return;

      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        showToast(SIGN_IN_MESSAGE);
        return;
      }

      setBusyKeys((current) => new Set(current).add(busyKey));

      try {
        const { data: existing, error: lookupError } = await supabaseClient
          .from("user_collections")
          .select("user_id")
          .eq("user_id", user.id)
          .eq(column, value)
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (existing) {
          const { error } = await supabaseClient
            .from("user_collections")
            .delete()
            .eq("user_id", user.id)
            .eq(column, value);
          if (error) throw error;
        } else {
          if (column === "location_name") {
            const { data: lastStop, error: orderError } = await supabaseClient
              .from("user_collections")
              .select("order_index")
              .eq("user_id", user.id)
              .not("location_name", "is", null)
              .order("order_index", { ascending: false, nullsFirst: false })
              .limit(1)
              .maybeSingle();
            if (orderError) throw orderError;

            const { error } = await supabaseClient
              .from("user_collections")
              .insert({
                user_id: user.id,
                location_name: value,
                order_index: (lastStop?.order_index ?? -1) + 1,
                custom_time: "Flexible",
                custom_notes: "",
              });
            if (error) throw error;
          } else {
            const { error } = await supabaseClient
              .from("user_collections")
              .insert({ user_id: user.id, photo_id: value });
            if (error) throw error;
          }
        }

        const setState =
          column === "location_name"
            ? setBookmarkedLocations
            : setBookmarkedPhotoIds;
        setState((current) => {
          const next = new Set(current);
          if (existing) next.delete(value);
          else next.add(value);
          return next;
        });
      } catch (error) {
        console.error("toggle collection bookmark error:", error);
        showToast("We couldn't update your trip. Please try again.");
      } finally {
        setBusyKeys((current) => {
          const next = new Set(current);
          next.delete(busyKey);
          return next;
        });
      }
    },
    [busyKeys, showToast]
  );

  const toggleBookmarkLocation = useCallback(
    (locationName: string) => toggleBookmark("location_name", locationName),
    [toggleBookmark]
  );

  const toggleBookmarkPhoto = useCallback(
    (photoId: string) => toggleBookmark("photo_id", photoId),
    [toggleBookmark]
  );

  return {
    bookmarkedLocations,
    bookmarkedPhotoIds,
    busyKeys,
    toast,
    toggleBookmarkLocation,
    toggleBookmarkPhoto,
  };
}

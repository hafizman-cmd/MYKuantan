import { supabase, SUPABASE_PHOTOS_TABLE } from "./supabase";
import type { Photo } from "@/types/photo";

const SELECT_COLS = "id,image_url,photographer,location,caption,status,created_at";

export async function fetchLatestPhotos(limit: number): Promise<Photo[]> {
  const { data, error } = await supabase
    .from(SUPABASE_PHOTOS_TABLE)
    .select(SELECT_COLS)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetchLatestPhotos error:", error.message);
    return [];
  }

  return (data ?? []) as Photo[];
}

export async function fetchAllPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from(SUPABASE_PHOTOS_TABLE)
    .select(SELECT_COLS)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchAllPhotos error:", error.message);
    return [];
  }

  return (data ?? []) as Photo[];
}

export async function fetchPendingPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from(SUPABASE_PHOTOS_TABLE)
    .select(SELECT_COLS)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchPendingPhotos error:", error.message);
    return [];
  }

  return (data ?? []) as Photo[];
}

export async function fetchAdminAnalyticsPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from(SUPABASE_PHOTOS_TABLE)
    .select(SELECT_COLS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchAdminAnalyticsPhotos error:", error.message);
    return [];
  }

  return (data ?? []) as Photo[];
}

export async function updatePhotoDetails(
  id: string,
  updates: {
    status?: string;
    location?: string;
    caption?: string;
    photographer?: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from(SUPABASE_PHOTOS_TABLE)
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("updatePhotoDetails error:", error.message);
    return false;
  }

  return true;
}

const SUPABASE_STORAGE_BUCKET = "kuantan-photos";

function extractStoragePath(imageUrl: string): string | null {
  if (!imageUrl) return null;
  try {
    const u = new URL(imageUrl);
    const marker = `/object/public/${SUPABASE_STORAGE_BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return u.pathname.slice(idx + marker.length);
  } catch {
    const marker = `/${SUPABASE_STORAGE_BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return null;
    return imageUrl.slice(idx + marker.length);
  }
}

export async function deletePhotoPermanently(
  id: string,
  imageUrl: string
): Promise<boolean> {
  let storagePurged = false;

  const filePath = extractStoragePath(imageUrl);
  if (filePath) {
    const { error: storErr } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .remove([filePath]);
    if (storErr) {
      console.error("deletePhotoPermanently storage error:", storErr.message);
    } else {
      storagePurged = true;
    }
  }

  const { error: dbErr } = await supabase
    .from(SUPABASE_PHOTOS_TABLE)
    .delete()
    .eq("id", id);

  if (dbErr) {
    console.error("deletePhotoPermanently database error:", dbErr.message);
    return false;
  }

  return storagePurged || !filePath;
}
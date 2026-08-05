"use client";

import { useEffect, useState } from "react";
import AdminDashboard from "@/components/AdminDashboard";
import AdminGate from "@/components/AdminGate";
import {
  fetchPendingPhotos,
  fetchAdminAnalyticsPhotos,
  fetchTopLikedPhotos,
} from "@/lib/api";
import type { Photo } from "@/types/photo";

type AdminPageStatus =
  | { kind: "gate" }
  | { kind: "loading-dashboard" }
  | { kind: "dashboard"; pending: Photo[]; all: Photo[]; topLiked: Photo[] }
  | { kind: "error"; message: string };

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const [status, setStatus] = useState<AdminPageStatus>({ kind: "gate" });

  // When AdminGate signals the active user is a verified admin, load the
  // dashboard data client-side. The gate itself owns the Supabase session +
  // is_admin verification, so by the time we reach this callback the deck is
  // safe to render.
  const handleAuthed = async () => {
    setStatus({ kind: "loading-dashboard" });
    try {
      const [initialPending, initialAll, initialTopLiked] = await Promise.all([
        fetchPendingPhotos(),
        fetchAdminAnalyticsPhotos(),
        fetchTopLikedPhotos(6),
      ]);
      setStatus({
        kind: "dashboard",
        pending: initialPending,
        all: initialAll,
        topLiked: initialTopLiked,
      });
    } catch (error) {
      console.error("[admin] dashboard data fetch failed:", error);
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not load the editorial deck. Please try again.",
      });
    }
  };

  // Re-render on hot-reload without losing the gate state.
  useEffect(() => {
    if (status.kind === "dashboard") {
      // no-op — dashboard already hydrated
    }
  }, [status]);

  if (status.kind === "dashboard") {
    return (
      <AdminDashboard
        initialPending={status.pending}
        initialAll={status.all}
        initialTopLiked={status.topLiked}
      />
    );
  }

  if (status.kind === "loading-dashboard") {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#F5F0E8]">
        <div className="flex flex-col items-center gap-4">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-[#0F3460]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
            Loading Editorial Control Deck
          </span>
        </div>
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#F5F0E8] p-6">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-[0_24px_80px_rgba(15,52,96,0.18)] border border-stone-900/5 p-8 md:p-10 text-center">
          <h1 className="font-display text-2xl font-extrabold text-stone-900 mb-3">
            Deck unavailable
          </h1>
          <p className="text-sm text-stone-600 break-words whitespace-normal leading-relaxed mb-6">
            {status.message}
          </p>
          <button
            type="button"
            onClick={() => setStatus({ kind: "gate" })}
            className="inline-flex items-center justify-center rounded-full bg-[#0F3460] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#F5F0E8] hover:bg-[#1A4A7A] transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return <AdminGate onAuthed={handleAuthed} />;
}

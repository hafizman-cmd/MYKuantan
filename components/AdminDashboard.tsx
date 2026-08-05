"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { animate, AnimatePresence, motion } from "framer-motion";
import type { Photo } from "@/types/photo";
import { supabase, SUPABASE_PHOTOS_TABLE } from "@/lib/supabase";
import { updatePhotoDetails, deletePhotoPermanently } from "@/lib/api";
import { KUANTAN_LOCATIONS, getCoordinatesByName } from "@/lib/locations";
import { toTitleCase } from "@/lib/format";

const supabaseAuthClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

type Tab = "overview" | "moderation" | "analytics" | "archive";
type Range = "day" | "week" | "month";
type ModerationView = "submissions" | "reports";

type ReportPhoto = Pick<
  Photo,
  "id" | "image_url" | "photographer" | "location" | "caption"
>;

interface PhotoReport {
  id: string;
  photo_id: string;
  reason: string;
  details: string | null;
  status: string | null;
  created_at: string;
  photo: ReportPhoto | null;
}

type ReportItem = PhotoReport;

interface AdminDashboardProps {
  initialPending: Photo[];
  initialAll: Photo[];
  initialTopLiked: Photo[];
}

const HOUR_MS = 3600_000;
const DAY_MS = 86400_000;

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <OverviewIcon /> },
  { id: "moderation", label: "Moderation", icon: <ModerationIcon /> },
  { id: "analytics", label: "Analytics", icon: <AnalyticsIcon /> },
  { id: "archive", label: "Active Archive", icon: <ArchiveIcon /> },
];

const RANGES: { id: Range; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export default function AdminDashboard({
  initialPending,
  initialAll,
  initialTopLiked,
}: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<Range>("week");
  const [moderationView, setModerationView] =
    useState<ModerationView>("submissions");
  const [pending, setPending] = useState<Photo[]>(initialPending);
  const [all, setAll] = useState<Photo[]>(initialAll);
  const [topLiked, setTopLiked] = useState<Photo[]>(initialTopLiked);
  const [search, setSearch] = useState("");
  const [reports, setReports] = useState<PhotoReport[]>([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportActionId, setReportActionId] = useState<string | null>(null);
  const [flaggedReportCount, setFlaggedReportCount] = useState(0);

  const approvedCount = useMemo(
    () => all.filter((p) => p.status === "approved").length,
    [all]
  );
  const contributorCount = useMemo(
    () => new Set(all.map((p) => p.photographer)).size,
    [all]
  );
  const pendingCount = pending.length;

  const approvedPhotos = useMemo(
    () => all.filter((p) => p.status === "approved"),
    [all]
  );

  const filteredApproved = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return approvedPhotos;
    return approvedPhotos.filter(
      (p) =>
        p.photographer.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
    );
  }, [approvedPhotos, search]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from(SUPABASE_PHOTOS_TABLE)
      .update({ status })
      .eq("id", id);
    if (error) console.error("update status error:", error.message);
    return !error;
  };

  const handleApprove = (id: string) => {
    const target = pending.find((p) => p.id === id);
    setPending((prev) => prev.filter((p) => p.id !== id));
    if (target) {
      setAll((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p))
      );
    }
    setStatus(id, "approved");
  };

  const handleReject = (id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
    setAll((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "rejected" } : p))
    );
    setStatus(id, "rejected");
  };

  const handleSaveDetails = async (
    id: string,
    updates: {
      photographer?: string;
      location?: string;
      caption?: string;
      latitude?: number | null;
      longitude?: number | null;
    }
  ): Promise<boolean> => {
    const sanitized: typeof updates = { ...updates };
    if (typeof sanitized.photographer === "string") {
      sanitized.photographer = toTitleCase(sanitized.photographer);
    }
    setAll((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...sanitized } : p))
    );
    return updatePhotoDetails(id, sanitized);
  };

  const handleTakeDown = async (id: string) => {
    setAll((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "pending" } : p))
    );
    setPending((prev) => {
      const existing = prev.find((p) => p.id === id);
      const moved = all.find((p) => p.id === id);
      if (existing || !moved) return prev;
      return [{ ...moved, status: "pending" as const }, ...prev];
    });
    await updatePhotoDetails(id, { status: "pending" });
  };

  const handleHardDelete = (id: string, imageUrl: string) => {
    if (
      !confirm(
        "Are you absolutely sure you want to permanently delete this frame from the database and cloud storage? This cannot be undone."
      )
    )
      return;
    setPending((prev) => prev.filter((p) => p.id !== id));
    setAll((prev) => prev.filter((p) => p.id !== id));
    deletePhotoPermanently(id, imageUrl);
  };

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);

    const { data, error } = await supabaseAuthClient
      .from("photo_reports")
      .select(
        "id,photo_id,reason,details,status,created_at,photo:photos(id,image_url,photographer,location,caption)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetch photo reports error:", error.message);
      setReportsError("Could not load flagged reports. Please try again.");
      setReportsLoading(false);
      return;
    }

    const normalized = (data ?? []).map((row) => {
      const joinedPhoto = Array.isArray(row.photo) ? row.photo[0] : row.photo;
      return {
        ...row,
        photo: (joinedPhoto ?? null) as ReportPhoto | null,
      } as PhotoReport;
    });

    setReports(normalized);
    setFlaggedReportCount(normalized.length);
    setReportsLoaded(true);
    setReportsLoading(false);
  }, []);

  const loadFlaggedReportCount = useCallback(async () => {
    const { count, error } = await supabaseAuthClient
      .from("photo_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) {
      console.error("fetch pending report count error:", error.message);
      return;
    }
    setFlaggedReportCount(count ?? 0);
  }, []);

  useEffect(() => {
    void loadFlaggedReportCount();
  }, [loadFlaggedReportCount]);

  useEffect(() => {
    if (
      tab === "moderation" &&
      moderationView === "reports" &&
      !reportsLoaded &&
      !reportsLoading
    ) {
      void loadReports();
    }
  }, [loadReports, moderationView, reportsLoaded, reportsLoading, tab]);

  const handleReportStatus = async (
    reportId: string,
    status: "dismissed" | "reviewed"
  ): Promise<boolean> => {
    setReportActionId(reportId);
    setReportsError(null);
    const { error } = await supabaseAuthClient
      .from("photo_reports")
      .update({ status })
      .eq("id", reportId);

    if (error) {
      console.error("update photo report error:", error.message);
      setReportsError("Could not update this report. Please try again.");
      setReportActionId(null);
      return false;
    } else {
      setReports((current) =>
        current.filter((report) => report.id !== reportId)
      );
      setFlaggedReportCount((current) => Math.max(0, current - 1));
    }
    setReportActionId(null);
    return true;
  };

  const handleDeleteReportedPhoto = async (
    report: PhotoReport
  ): Promise<boolean> => {
    if (!report.photo) return false;
    if (
      !confirm(
        "Permanently delete this reported frame? This cannot be undone."
      )
    ) {
      return false;
    }

    setReportActionId(report.id);
    setReportsError(null);
    const removedReportCount = Math.max(
      1,
      reports.filter((item) => item.photo_id === report.photo_id).length
    );
    const { error } = await supabaseAuthClient
      .from(SUPABASE_PHOTOS_TABLE)
      .delete()
      .eq("id", report.photo.id);

    if (error) {
      console.error("delete reported photo error:", error.message);
      setReportsError("Could not delete this frame. Please try again.");
      setReportActionId(null);
      return false;
    } else {
      setPending((current) =>
        current.filter((photo) => photo.id !== report.photo_id)
      );
      setAll((current) =>
        current.filter((photo) => photo.id !== report.photo_id)
      );
      setTopLiked((current) =>
        current.filter((photo) => photo.id !== report.photo_id)
      );
      setReports((current) =>
        current.filter((item) => item.photo_id !== report.photo_id)
      );
      setFlaggedReportCount((current) =>
        Math.max(0, current - removedReportCount)
      );
    }
    setReportActionId(null);
    return true;
  };

  const handleSignOut = async () => {
    await supabaseAuthClient.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F0E8] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 md:min-h-screen shrink-0 bg-stone-900 text-[#F5F0E8] md:sticky md:top-0 md:flex md:flex-col">
        <div className="hidden md:flex flex-col gap-1 px-6 py-8">
          <span className="font-display text-2xl font-extrabold tracking-tight">
            Kuantan
          </span>
          <span className="text-[10px] uppercase tracking-[0.3em] text-stone-400">
            Admin Console
          </span>
        </div>
        <div className="hidden md:block px-4">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2 text-sm text-stone-400 hover:text-amber-400 transition-colors duration-200 rounded-xl font-medium mb-6 group"
          >
            <svg
              className="w-4 h-4 shrink-0 group-hover:-translate-x-1 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            <span>View Site</span>
          </Link>
        </div>
        <nav className="flex md:flex-col flex-row gap-1 px-2 md:px-4 py-2 md:py-2 overflow-x-auto md:overflow-visible">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${tab === t.id
                  ? "text-[#F5F0E8]"
                  : "text-stone-400 hover:text-[#F5F0E8] hover:bg-white/5"
                }`}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="admin-tab"
                  className="absolute inset-0 rounded-xl bg-[#0F3460]"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative z-10 shrink-0">{t.icon}</span>
              <span className="relative z-10">{t.label}</span>
              {t.id === "moderation" &&
                (pendingCount > 0 || flaggedReportCount > 0) && (
                  <span className="relative z-10 ml-auto flex items-center gap-1.5">
                    {pendingCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded-full bg-amber-500 text-stone-950 shadow-sm">
                        {pendingCount}
                      </span>
                    )}
                    {flaggedReportCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded-full bg-rose-500 text-white shadow-sm">
                        {flaggedReportCount}
                      </span>
                    )}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="hidden md:flex flex-col gap-2 px-4 mt-auto pt-6 pb-6">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-stone-400 hover:text-[#F5F0E8] hover:bg-white/5 transition-colors"
          >
            <SignOutIcon />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Workspace */}
      <main className="flex-1 min-w-0 p-6 md:p-8 lg:p-12">
        <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-[0.3em] text-[#0F3460] font-semibold">
              Editorial Operations
            </span>
            <h1 className="font-display text-stone-900 text-3xl md:text-5xl font-extrabold tracking-tight mt-1">
              Admin Dashboard
            </h1>
          </div>
          <div className="text-sm text-stone-500 font-light">
            {new Date().toLocaleDateString("en-MY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </header>

        {tab === "overview" && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-8">
            <MetricCard
              label="Pending Queue"
              value={pendingCount}
              accent="amber"
              icon={<ClockIcon />}
              hint="awaiting review"
            />
            <MetricCard
              label="Published Archive"
              value={approvedCount}
              accent="sea"
              icon={<BookIcon />}
              hint="public frames"
            />
            <MetricCard
              label="Contributor Count"
              value={contributorCount}
              accent="moss"
              icon={<UsersIcon />}
              hint="unique photographers"
            />
          </section>
        )}

        {(tab === "overview" || tab === "analytics") && (
          <section className="mb-8">
            <div className="rounded-3xl bg-white shadow-[0_8px_40px_rgba(15,52,96,0.08)] border border-stone-900/5 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 md:px-8 py-5 border-b border-stone-100">
                <div>
                  <h2 className="font-display text-stone-900 text-xl md:text-2xl font-bold">
                    Upload Volume
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Incoming frames grouped by timestamp
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-stone-100 p-1 self-start">
                  {RANGES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRange(r.id)}
                      className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${range === r.id
                          ? "text-[#F5F0E8]"
                          : "text-stone-600 hover:text-stone-900"
                        }`}
                    >
                      {range === r.id && (
                        <motion.span
                          layoutId="range-pill"
                          className="absolute inset-0 rounded-full bg-[#0F3460]"
                          transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <AnalyticsChart photos={all} range={range} />
            </div>
          </section>
        )}

        {tab === "analytics" && <TopLikedFrames photos={topLiked} />}

        {(tab === "overview" || tab === "moderation") && (
          <section className="rounded-3xl bg-white shadow-[0_8px_40px_rgba(15,52,96,0.08)] border border-stone-900/5 overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-stone-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-stone-900 text-xl md:text-2xl font-bold">
                  {tab === "moderation" && moderationView === "reports"
                    ? "Flagged Reports"
                    : "Moderation Queue"}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  {tab === "moderation" && moderationView === "reports"
                    ? `${reports.length} active report${reports.length === 1 ? "" : "s"} awaiting review`
                    : `${pendingCount} frame${pendingCount === 1 ? "" : "s"} awaiting decision`}
                </p>
              </div>

              {tab === "moderation" && (
                <div className="inline-flex self-start rounded-full bg-stone-100 p-1">
                  {(
                    [
                      ["submissions", "Submissions Queue"],
                      ["reports", "Flagged Reports"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setModerationView(id)}
                      className={`relative rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                        moderationView === id
                          ? "text-[#F5F0E8]"
                          : "text-stone-500 hover:text-stone-900"
                      }`}
                    >
                      {moderationView === id && (
                        <motion.span
                          layoutId="moderation-view-pill"
                          className="absolute inset-0 rounded-full bg-[#0F3460]"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 35,
                          }}
                        />
                      )}
                      <span className="relative z-10">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {tab === "overview" || moderationView === "submissions" ? (
              <ModerationQueue
                pending={pending}
                onApprove={handleApprove}
                onReject={handleReject}
                onHardDelete={handleHardDelete}
              />
            ) : (
              <FlaggedReports
                reports={reports}
                loading={reportsLoading}
                error={reportsError}
                actionId={reportActionId}
                onRetry={loadReports}
                onDeletePhoto={handleDeleteReportedPhoto}
                onSetStatus={handleReportStatus}
              />
            )}
          </section>
        )}

        {tab === "archive" && (
          <section className="rounded-3xl bg-white shadow-[0_8px_40px_rgba(15,52,96,0.08)] border border-stone-900/5 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 md:px-8 py-5 border-b border-stone-100">
              <div>
                <h2 className="font-display text-stone-900 text-xl md:text-2xl font-bold">
                  Published Lookbook
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  {approvedCount} approved frame{approvedCount === 1 ? "" : "s"} on the public home page
                </p>
              </div>
              <div className="relative w-full sm:w-80">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search photographer or location..."
                  className="w-full rounded-full bg-[#F5F0E8]/60 backdrop-blur-md border border-stone-900/10 pl-11 pr-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#0F3460]/40 focus:ring-2 focus:ring-[#0F3460]/10 transition"
                />
              </div>
            </div>
            <ActiveArchive
              photos={filteredApproved}
              onSaveDetails={handleSaveDetails}
              onTakeDown={handleTakeDown}
              onHardDelete={handleHardDelete}
            />
          </section>
        )}
      </main>

      {/* Mobile action bar — standalone, anchors to bottom on phones */}
      <div className="flex md:hidden items-center justify-between w-full border-t border-stone-200 mt-auto p-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-stone-600 hover:text-[#0F3460] hover:bg-stone-100 transition-colors duration-200 font-medium"
        >
          <svg
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          <span>View Site</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-stone-600 hover:text-[#0F3460] hover:bg-stone-100 transition-colors font-medium"
        >
          <SignOutIcon />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

/* ---------- Metric Card ---------- */

type Accent = "amber" | "sea" | "moss";

const ACCENT_MAP: Record<Accent, { bar: string; chip: string; num: string }> = {
  amber: { bar: "bg-amber-500", chip: "bg-amber-100 text-amber-700", num: "text-amber-600" },
  sea: { bar: "bg-[#0F3460]", chip: "bg-[#0F3460]/10 text-[#0F3460]", num: "text-[#0F3460]" },
  moss: { bar: "bg-emerald-600", chip: "bg-emerald-100 text-emerald-700", num: "text-emerald-600" },
};

function MetricCard({
  label,
  value,
  accent,
  icon,
  hint,
}: {
  label: string;
  value: number;
  accent: Accent;
  icon: React.ReactNode;
  hint: string;
}) {
  const [display, setDisplay] = useState(0);
  const a = ACCENT_MAP[accent];

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-3xl bg-white shadow-[0_8px_40px_rgba(15,52,96,0.08)] border border-stone-900/5 p-6 md:p-7 overflow-hidden"
    >
      <span className={`absolute top-0 left-0 h-1 w-full ${a.bar}`} />
      <div className="flex items-start justify-between">
        <span className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl ${a.chip}`}>
          {icon}
        </span>
      </div>
      <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-stone-500 font-semibold">
        {label}
      </p>
      <p className={`font-display text-stone-900 text-4xl md:text-5xl font-extrabold leading-none mt-2 ${a.num}`}>
        {display.toLocaleString()}
      </p>
      <p className="text-xs text-stone-400 mt-2 font-light">{hint}</p>
    </motion.div>
  );
}

/* ---------- Analytics Chart ---------- */

interface Bucket {
  label: string;
  count: number;
  start: number;
}

function buildBuckets(photos: Photo[], range: Range): Bucket[] {
  const now = Date.now();
  if (range === "day") {
    const baseHour = Math.floor(now / HOUR_MS) * HOUR_MS;
    return Array.from({ length: 24 }, (_, i) => {
      const start = baseHour - (23 - i) * HOUR_MS;
      const d = new Date(start);
      return {
        label: `${d.getHours() % 12 === 0 ? 12 : d.getHours() % 12}${d.getHours() < 12 ? "a" : "p"}`,
        count: 0,
        start,
      };
    });
  }
  if (range === "week") {
    const baseDay = Math.floor(now / DAY_MS) * DAY_MS;
    return Array.from({ length: 7 }, (_, i) => {
      const start = baseDay - (6 - i) * DAY_MS;
      const d = new Date(start);
      return {
        label: d.toLocaleDateString("en-MY", { weekday: "short" }),
        count: 0,
        start,
      };
    });
  }
  const baseDay = Math.floor(now / DAY_MS) * DAY_MS;
  return Array.from({ length: 30 }, (_, i) => {
    const start = baseDay - (29 - i) * DAY_MS;
    const d = new Date(start);
    return {
      label: `${d.getDate()}`,
      count: 0,
      start,
    };
  });
}

function populateBuckets(photos: Photo[], range: Range): Bucket[] {
  const buckets = buildBuckets(photos, range);
  const span = range === "day" ? HOUR_MS : DAY_MS;
  for (const p of photos) {
    const t = Date.parse(p.created_at);
    if (Number.isNaN(t)) continue;
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (t >= buckets[i].start && t < buckets[i].start + span) {
        buckets[i].count++;
        break;
      }
    }
  }
  return buckets;
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function AnalyticsChart({ photos, range }: { photos: Photo[]; range: Range }) {
  const buckets = useMemo(() => populateBuckets(photos, range), [photos, range]);
  const max = Math.max(...buckets.map((b) => b.count), 1);
  const peak = Math.max(...buckets.map((b) => b.count), 0);

  const W = 1000;
  const H = 320;
  const padX = 16;
  const padTop = 24;
  const padBottom = 36;
  const innerH = H - padTop - padBottom;
  const innerW = W - padX * 2;
  const step = buckets.length > 1 ? innerW / (buckets.length - 1) : 0;

  const pts = buckets.map((b, i) => ({
    x: padX + (buckets.length === 1 ? innerW / 2 : i * step),
    y: padTop + innerH - (b.count / max) * innerH,
  }));

  const linePath = smoothPath(pts);
  const areaPath =
    pts.length > 0
      ? `${linePath} L ${pts[pts.length - 1].x} ${padTop + innerH} L ${pts[0].x} ${padTop + innerH} Z`
      : "";

  const labelEvery = range === "day" ? 4 : range === "week" ? 1 : 5;

  return (
    <div className="px-4 md:px-6 py-6">
      <div className="flex items-center gap-4 mb-4 text-xs text-stone-500">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#0F3460]" /> Photo uploads
        </span>
        <span className="ml-auto">
          Peak: <strong className="text-stone-800">{peak}</strong> · {buckets.length}{" "}
          {range === "day" ? "hours" : "days"}
        </span>
      </div>

      {peak === 0 ? (
        <div className="w-full h-[320px] flex items-center justify-center text-stone-400 text-sm font-light">
          No uploads in this timeframe yet.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F3460" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#0F3460" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={padX}
              x2={W - padX}
              y1={padTop + innerH - f * innerH}
              y2={padTop + innerH - f * innerH}
              stroke="#E7E5E4"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          ))}

          {areaPath && (
            <motion.path
              d={areaPath}
              fill="url(#areaFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          )}
          {linePath && (
            <motion.path
              d={linePath}
              fill="none"
              stroke="#0F3460"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.3, ease: "easeInOut" }}
            />
          )}

          {pts.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#fff"
              stroke="#0F3460"
              strokeWidth="2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.03, type: "spring", stiffness: 300, damping: 20 }}
              style={{ transformBox: "fill-box", transformOrigin: "center" } as React.CSSProperties}
            />
          ))}

          {buckets.map((b, i) => {
            if (i % labelEvery !== 0 && i !== buckets.length - 1) return null;
            const x = pts[i].x;
            return (
              <text
                key={i}
                x={x}
                y={H - 10}
                textAnchor="middle"
                className="fill-stone-400"
                style={{ fontSize: "12px", fontWeight: 500 }}
              >
                {b.label}
              </text>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/* ---------- Top Liked Frames ---------- */

function TopLikedFrames({ photos }: { photos: Photo[] }) {
  return (
    <section className="mb-8 rounded-3xl bg-white shadow-[0_8px_40px_rgba(15,52,96,0.08)] border border-stone-900/5 overflow-hidden">
      <div className="px-6 md:px-8 py-5 border-b border-stone-100">
        <h2 className="font-display text-stone-900 text-xl md:text-2xl font-bold">
          Top Liked Frames
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          The archive&apos;s most appreciated photographs
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="px-6 py-14 text-center text-sm text-stone-400">
          No liked frames to rank yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-6 md:p-8">
          {photos.map((photo, index) => (
            <motion.article
              key={photo.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.06,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group overflow-hidden rounded-2xl border border-stone-200/80 bg-[#F5F0E8]/45"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                <Image
                  src={photo.image_url}
                  alt={photo.caption || photo.location}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#0F3460] px-2 text-xs font-bold text-[#F5F0E8] shadow-lg">
                  #{index + 1}
                </span>
                <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-red-200/60 bg-white/90 px-3 py-1.5 text-xs font-bold text-red-600 shadow-lg backdrop-blur-md">
                  <span aria-hidden>♥</span>
                  <span className="tabular-nums">{photo.likes_count ?? 0}</span>
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-display line-clamp-2 text-lg font-bold leading-snug text-stone-900">
                  {photo.caption || photo.location}
                </h3>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-stone-500">
                  <span className="min-w-0 truncate font-medium text-stone-700">
                    {photo.photographer.startsWith("@")
                      ? photo.photographer
                      : `@${photo.photographer}`}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 truncate">
                    <PinIcon /> {photo.location}
                  </span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Flagged Reports ---------- */

function FlaggedReports({
  reports,
  loading,
  error,
  actionId,
  onRetry,
  onDeletePhoto,
  onSetStatus,
}: {
  reports: PhotoReport[];
  loading: boolean;
  error: string | null;
  actionId: string | null;
  onRetry: () => void | Promise<void>;
  onDeletePhoto: (report: PhotoReport) => boolean | Promise<boolean>;
  onSetStatus: (
    reportId: string,
    status: "dismissed" | "reviewed"
  ) => boolean | Promise<boolean>;
}) {
  const [selectedReportItem, setSelectedReportItem] =
    useState<ReportItem | null>(null);

  useEffect(() => {
    if (!selectedReportItem) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && actionId !== selectedReportItem.id) {
        setSelectedReportItem(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actionId, selectedReportItem]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-stone-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-[#0F3460]" />
        Loading flagged reports...
      </div>
    );
  }

  if (error && reports.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-4 rounded-full bg-[#0F3460] px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="px-6 md:px-8 py-16 flex flex-col items-center justify-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckIcon />
        </span>
        <p className="font-display text-stone-700 text-lg font-semibold">
          No active reports
        </p>
        <p className="text-sm text-stone-400 mt-1 font-light">
          Every flagged frame has been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <p className="border-b border-red-100 bg-red-50 px-6 py-3 text-xs text-red-600">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="bg-stone-50/80 border-b border-stone-100">
              {["Frame", "Photographer", "Location", "Flagged Reason", "Actions"].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-4 md:px-6 py-3.5 text-[10px] uppercase tracking-[0.18em] text-stone-500 font-semibold whitespace-nowrap"
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {reports.map((report) => {
                const photo = report.photo;
                const busy = actionId === report.id;
                return (
                  <motion.tr
                    key={report.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 48 }}
                    className="border-b border-stone-50 hover:bg-stone-50/50"
                  >
                    <td className="px-4 md:px-6 py-3.5">
                      <button
                        type="button"
                        disabled={!photo}
                        onClick={() => setSelectedReportItem(report)}
                        aria-label={
                          photo
                            ? `Inspect reported frame by ${photo.photographer}`
                            : "Reported frame unavailable"
                        }
                        className="relative w-14 h-14 rounded-xl overflow-hidden cursor-pointer group border border-stone-200/80 hover:border-amber-500 transition-all shadow-sm disabled:cursor-not-allowed"
                      >
                        {photo ? (
                          <>
                            <Image
                              src={photo.image_url}
                              alt={photo.caption || photo.location}
                              fill
                              sizes="56px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/45 group-hover:opacity-100">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-5 w-5"
                                aria-hidden
                              >
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-4-4M11 8v6M8 11h6" />
                              </svg>
                            </span>
                          </>
                        ) : (
                          <span className="flex h-full items-center justify-center text-[9px] uppercase tracking-wider text-stone-400">
                            Deleted
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 md:px-6 py-3.5 text-sm font-medium text-stone-800">
                      {photo
                        ? photo.photographer.startsWith("@")
                          ? photo.photographer
                          : `@${photo.photographer}`
                        : "—"}
                    </td>
                    <td className="px-4 md:px-6 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-sm text-stone-600">
                        <PinIcon /> {photo?.location ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3.5">
                      <span className="block max-w-[240px] text-sm font-medium text-red-700">
                        {report.reason}
                      </span>
                      {report.details ? (
                        <span className="mt-1 block max-w-[280px] text-xs leading-relaxed text-stone-400">
                          {report.details}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 md:px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy || !photo}
                          onClick={() => void onDeletePhoto(report)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700 transition-colors hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <TrashIcon /> Delete Photo
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onSetStatus(report.id, "dismissed")}
                          className="rounded-full bg-stone-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600 transition-colors hover:bg-stone-200 disabled:opacity-40"
                        >
                          👁️‍🗨️ Dismiss
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onSetStatus(report.id, "reviewed")}
                          className="rounded-full bg-emerald-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white disabled:opacity-40"
                        >
                          ✅ Mark Reviewed
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedReportItem?.photo ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={() => {
              if (actionId !== selectedReportItem.id) {
                setSelectedReportItem(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 30,
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reported-frame-preview-title"
              onClick={(event) => event.stopPropagation()}
              className="relative max-w-3xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6 shadow-2xl flex flex-col text-stone-100 my-auto"
            >
              <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2
                    id="reported-frame-preview-title"
                    className="truncate text-base font-semibold text-stone-100"
                  >
                    {selectedReportItem.photo.photographer.startsWith("@")
                      ? selectedReportItem.photo.photographer
                      : `@${selectedReportItem.photo.photographer}`}
                  </h2>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-stone-400">
                    <PinIconLight /> {selectedReportItem.photo.location}
                  </p>
                </div>

                <div className="flex shrink-0 items-start gap-3">
                  <span className="max-w-52 rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-300">
                    {selectedReportItem.reason}
                  </span>
                  <button
                    type="button"
                    disabled={actionId === selectedReportItem.id}
                    onClick={() => setSelectedReportItem(null)}
                    aria-label="Close reported frame preview"
                    className="rounded-full border border-slate-700 bg-slate-800 p-2 text-stone-400 transition-colors hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CloseIcon />
                  </button>
                </div>
              </header>

              <Image
                src={selectedReportItem.photo.image_url}
                alt={
                  selectedReportItem.photo.caption ||
                  selectedReportItem.photo.location
                }
                width={1600}
                height={1200}
                sizes="(max-width: 768px) calc(100vw - 32px), 768px"
                className="w-full max-h-[60vh] object-contain rounded-2xl bg-black/50 my-4 h-auto"
              />

              {selectedReportItem.details ? (
                <blockquote className="mb-4 rounded-xl border border-slate-700/80 bg-slate-800/70 px-4 py-3 text-xs leading-relaxed text-stone-300">
                  <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Reporter notes
                  </span>
                  “{selectedReportItem.details}”
                </blockquote>
              ) : null}

              {error ? (
                <p className="mb-3 rounded-xl bg-red-400/10 px-4 py-2 text-xs text-red-300">
                  {error}
                </p>
              ) : null}

              <footer className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  disabled={actionId === selectedReportItem.id}
                  onClick={async () => {
                    const completed = await onDeletePhoto(selectedReportItem);
                    if (completed) setSelectedReportItem(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-300 transition-colors hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <TrashIcon /> Delete Photo
                </button>
                <button
                  type="button"
                  disabled={actionId === selectedReportItem.id}
                  onClick={async () => {
                    const completed = await onSetStatus(
                      selectedReportItem.id,
                      "dismissed"
                    );
                    if (completed) setSelectedReportItem(null);
                  }}
                  className="rounded-full bg-slate-800 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-300 transition-colors hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  disabled={actionId === selectedReportItem.id}
                  onClick={async () => {
                    const completed = await onSetStatus(
                      selectedReportItem.id,
                      "reviewed"
                    );
                    if (completed) setSelectedReportItem(null);
                  }}
                  className="rounded-full bg-emerald-500/15 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300 transition-colors hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Mark Reviewed
                </button>
              </footer>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Moderation Queue ---------- */

function ModerationQueue({
  pending,
  onApprove,
  onReject,
  onHardDelete,
}: {
  pending: Photo[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onHardDelete: (id: string, imageUrl: string) => void;
}) {
  if (pending.length === 0) {
    return (
      <div className="px-6 md:px-8 py-16 flex flex-col items-center justify-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckIcon />
        </span>
        <p className="font-display text-stone-700 text-lg font-semibold">All clear</p>
        <p className="text-sm text-stone-400 mt-1 font-light">
          No frames are waiting in the queue.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="bg-stone-50/80 border-b border-stone-100">
            {["Frame", "Contributor", "Location", "Caption", "Actions"].map((h) => (
              <th
                key={h}
                className="px-4 md:px-6 py-3.5 text-[10px] uppercase tracking-[0.18em] text-stone-500 font-semibold whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {pending.map((p) => (
              <motion.tr
                key={p.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 48, transition: { duration: 0.35 } }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="border-b border-stone-50 hover:bg-stone-50/50"
              >
                <td className="px-4 md:px-6 py-3.5">
                  <div className="relative w-20 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                    <Image
                      src={p.image_url}
                      alt={p.caption || p.location}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                </td>
                <td className="px-4 md:px-6 py-3.5">
                  <span className="text-sm font-medium text-stone-800 break-words whitespace-normal leading-relaxed max-w-[180px] block">
                    {p.photographer}
                  </span>
                </td>
                <td className="px-4 md:px-6 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-sm text-stone-600 break-words whitespace-normal leading-relaxed max-w-[180px]">
                    <PinIcon />
                    {p.location}
                  </span>
                </td>
                <td className="px-4 md:px-6 py-3.5">
                  <span className="text-sm text-stone-500 break-words whitespace-normal leading-relaxed max-w-[260px] block font-light">
                    {p.caption || "—"}
                  </span>
                </td>
                <td className="px-4 md:px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onApprove(p.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap"
                    >
                      <CheckIcon /> Approve
                    </button>
                    <button
                      onClick={() => onReject(p.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-stone-200 px-4 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold text-stone-700 hover:bg-red-100 hover:text-red-700 transition-colors whitespace-nowrap"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => onHardDelete(p.id, p.image_url)}
                      aria-label="Delete permanently"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Active Archive Grid ---------- */

interface EditDraft {
  photographer: string;
  location: string;
  caption: string;
  latitude: number | null;
  longitude: number | null;
}

function ActiveArchive({
  photos,
  onSaveDetails,
  onTakeDown,
  onHardDelete,
}: {
  photos: Photo[];
  onSaveDetails: (
    id: string,
    updates: EditDraft
  ) => Promise<boolean>;
  onTakeDown: (id: string) => void;
  onHardDelete: (id: string, imageUrl: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft>({
    photographer: "",
    location: "",
    caption: "",
    latitude: null,
    longitude: null,
  });
  const [saving, setSaving] = useState(false);

  const openEdit = (p: Photo) => {
    setEditingId(p.id);
    setDraft({
      photographer: p.photographer,
      location: p.location,
      caption: p.caption,
      latitude: p.latitude,
      longitude: p.longitude,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSaving(false);
  };

  const submitEdit = async (id: string) => {
    setSaving(true);
    await onSaveDetails(id, draft);
    setSaving(false);
    setEditingId(null);
  };

  if (photos.length === 0) {
    return (
      <div className="px-6 md:px-8 py-16 flex flex-col items-center justify-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
          <ArchiveIcon />
        </span>
        <p className="font-display text-stone-700 text-lg font-semibold">
          No frames found
        </p>
        <p className="text-sm text-stone-400 mt-1 font-light">
          Try a different search, or approve pending frames from Moderation.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {photos.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -24, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="relative rounded-2xl overflow-hidden bg-stone-100 group"
            >
              <div className="relative w-full aspect-[4/3]">
                <Image
                  src={p.image_url}
                  alt={p.caption || p.location}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

                {/* metadata overlay */}
                <div className="absolute left-4 right-4 bottom-4 flex flex-col gap-1.5">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white font-medium break-words whitespace-normal leading-relaxed max-w-[85%]">
                    <PinIconLight />
                    {p.location}
                  </span>
                  <p className="font-display text-white text-base md:text-lg font-semibold leading-tight break-words whitespace-normal leading-relaxed max-w-[90%]">
                    {p.caption || "—"}
                  </p>
                  <span className="text-white/70 text-[11px] tracking-wide break-words whitespace-normal leading-relaxed max-w-[90%]">
                    by {p.photographer}
                  </span>
                </div>

                {/* action buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => openEdit(p)}
                    aria-label="Edit details"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/85 backdrop-blur-md text-stone-800 hover:bg-white hover:text-[#0F3460] transition-colors shadow-sm"
                  >
                    <PenIcon />
                  </button>
                  <button
                    onClick={() => onTakeDown(p.id)}
                    aria-label="Take down from public page"
                    className="inline-flex items-center gap-1 rounded-full bg-white/85 backdrop-blur-md px-3 h-9 text-[10px] uppercase tracking-[0.15em] font-semibold text-stone-800 hover:bg-red-500 hover:text-white transition-colors shadow-sm whitespace-nowrap"
                  >
                    Take Down
                  </button>
                  <button
                    onClick={() => onHardDelete(p.id, p.image_url)}
                    aria-label="Delete permanently"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/85 backdrop-blur-md text-stone-800 hover:bg-red-600 hover:text-white transition-colors shadow-sm"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>

              {/* inline edit frosted form */}
              <AnimatePresence>
                {editingId === p.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 z-10 flex items-center justify-center p-4"
                  >
                    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" onClick={cancelEdit} />
                    <motion.form
                      onSubmit={(e: React.FormEvent) => {
                        e.preventDefault();
                        submitEdit(p.id);
                      }}
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26 }}
                      className="relative w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-white/40 p-5 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-[#0F3460] font-semibold">
                          Edit Frame
                        </span>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          aria-label="Cancel"
                          className="text-stone-400 hover:text-stone-900 transition-colors"
                        >
                          <CloseIcon />
                        </button>
                      </div>
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-semibold">
                          Photographer
                        </span>
                        <input
                          type="text"
                          value={draft.photographer}
                          onChange={(e) => setDraft({ ...draft, photographer: e.target.value })}
                          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-[#0F3460] transition"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-semibold">
                          Location
                        </span>
                        <select
                          value={draft.location}
                          onChange={(e) => {
                            const name = e.target.value;
                            const coords = name ? getCoordinatesByName(name) : null;
                            setDraft({
                              ...draft,
                              location: name,
                              latitude: coords ? coords[0] : null,
                              longitude: coords ? coords[1] : null,
                            });
                          }}
                          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-[#0F3460] transition"
                        >
                          {[
                            ...(draft.location &&
                              !KUANTAN_LOCATIONS.some((l) => l.name === draft.location)
                              ? [{ name: draft.location }]
                              : []),
                            ...KUANTAN_LOCATIONS,
                          ]
                            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                            .map((l) => (
                              <option key={l.name} value={l.name}>
                                {l.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-semibold">
                          Caption
                        </span>
                        <textarea
                          value={draft.caption}
                          onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
                          rows={2}
                          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-[#0F3460] transition resize-none"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={saving}
                        className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0F3460] px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] font-semibold text-[#F5F0E8] hover:bg-[#1A4A7A] disabled:opacity-60 transition-colors"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </motion.form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- Icons ---------- */

function OverviewIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function ModerationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function AnalyticsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 3 3 5-6" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#0F3460]">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function PinIconLight() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function ArchiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function PenIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function SignOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

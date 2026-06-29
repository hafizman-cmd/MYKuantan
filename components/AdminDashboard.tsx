"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { animate, AnimatePresence, motion } from "framer-motion";
import type { Photo } from "@/types/photo";
import { supabase, SUPABASE_PHOTOS_TABLE } from "@/lib/supabase";
import { updatePhotoDetails, deletePhotoPermanently } from "@/lib/api";
import { KUANTAN_LOCATIONS, getCoordinatesByName } from "@/lib/locations";
import { toTitleCase } from "@/lib/format";

type Tab = "overview" | "moderation" | "analytics" | "archive";
type Range = "day" | "week" | "month";

interface AdminDashboardProps {
  initialPending: Photo[];
  initialAll: Photo[];
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
}: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<Range>("week");
  const [pending, setPending] = useState<Photo[]>(initialPending);
  const [all, setAll] = useState<Photo[]>(initialAll);
  const [search, setSearch] = useState("");

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

  const handleSignOut = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
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
              className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.id
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
              {t.id === "moderation" && pendingCount > 0 && (
                <span className="relative z-10 ml-auto hidden md:inline-flex items-center justify-center rounded-full bg-amber-500 text-stone-900 text-[11px] font-bold px-2 min-w-[20px] h-5">
                  {pendingCount}
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
                      className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                        range === r.id
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

        {(tab === "overview" || tab === "moderation") && (
          <section className="rounded-3xl bg-white shadow-[0_8px_40px_rgba(15,52,96,0.08)] border border-stone-900/5 overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="font-display text-stone-900 text-xl md:text-2xl font-bold">
                  Moderation Queue
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  {pendingCount} frame{pendingCount === 1 ? "" : "s"} awaiting decision
                </p>
              </div>
            </div>
            <ModerationQueue
              pending={pending}
              onApprove={handleApprove}
              onReject={handleReject}
              onHardDelete={handleHardDelete}
            />
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
                  className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
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
                          ].map((l) => (
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
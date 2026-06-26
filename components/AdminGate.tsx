"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface AdminGateProps {
  onAuthed?: () => void;
  loadingFallback?: ReactNode;
}

const DEFAULT_LOADING_FALLBACK = (
  <div className="w-full min-h-screen flex items-center justify-center bg-[#F5F0E8] text-[#0F3460] font-sans font-bold">
    Loading System Control Deck Security Verification...
  </div>
);

export default function AdminGate({
  onAuthed,
  loadingFallback,
}: AdminGateProps) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "verifying" | "error" | "reloading"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [shakeKey, setShakeKey] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const fallback = loadingFallback ?? DEFAULT_LOADING_FALLBACK;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/auth", { method: "GET" });
        if (!active) return;
        if (res.ok) {
          const body = await res
            .json()
            .catch(() => ({ authed: false }) as { authed?: boolean });
          if (body?.authed) {
            if (onAuthed) {
              onAuthed();
              setChecking(false);
              return;
            }
            setStatus("reloading");
            window.location.reload();
            return;
          }
        }
      } catch {
        // network error — fall through to the gate form
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [onAuthed]);

  const triggerShake = () => {
    setShakeKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "verifying" || status === "reloading") return;
    setStatus("verifying");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({}) as Record<string, string>);
        throw new Error(body?.error || "Invalid credentials.");
      }

      setStatus("reloading");
      setPassword("");
      if (onAuthed) {
        onAuthed();
      } else {
        window.location.reload();
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Verification failed.");
      triggerShake();
    }
  };

  if (checking || status === "reloading") {
    return <>{fallback}</>;
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F0E8] flex items-center justify-center p-6 overflow-hidden relative">
      {/* failsafe visual anchor — proves the component mounted */}
      <div className="absolute top-4 left-4 text-xs font-mono text-[#0F3460]/40 font-bold z-50">
        GATEWAY MOUNTED SUCCESSFULLY
      </div>

      {/* soft radial halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, rgba(15,52,96,0.12), transparent 60%)",
        }}
      />

      <div
        key={shakeKey}
        ref={cardRef}
        className="relative w-full max-w-md"
        style={{
          animation: shakeKey > 0 ? "adminShake 0.5s ease-in-out" : undefined,
        }}
      >
        <div className="relative w-full max-w-md rounded-3xl bg-white shadow-[0_24px_80px_rgba(15,52,96,0.18)] border border-stone-900/5 p-8 md:p-10 overflow-hidden">
          <span className="absolute top-0 left-0 h-1 w-full bg-[#0F3460]" />

          <div className="flex flex-col items-center text-center mb-8">
            <span className="mb-5 inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#0F3460]/10 text-[#0F3460]">
              <ShieldIcon />
            </span>
            <span className="text-[11px] uppercase tracking-[0.3em] text-[#0F3460] font-semibold mb-2">
              MYKuantan · Editorial
            </span>
            <h1 className="font-display text-stone-900 text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
              Editorial Control Deck
            </h1>
            <p className="mt-3 text-sm text-stone-500 font-light max-w-xs leading-relaxed">
              Enter the access key to unlock the moderation queue, analytics,
              and the live lookbook archive.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-stone-600 font-semibold">
                Access Key
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                disabled={status === "verifying"}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/15 transition disabled:opacity-60"
              />
            </label>

            {status === "error" && errorMsg && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 break-words whitespace-normal leading-relaxed max-w-full">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "verifying" || password.length === 0}
              className="relative inline-flex items-center justify-center gap-2 rounded-full bg-[#0F3460] px-6 py-3.5 text-[12px] uppercase tracking-[0.25em] text-[#F5F0E8] font-semibold hover:bg-[#1A4A7A] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {status === "verifying" ? (
                <>
                  <Spinner />
                  <span>Verifying</span>
                </>
              ) : (
                <>
                  <KeyIcon />
                  <span>Enter Deck</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-[11px] text-stone-400 font-light break-words whitespace-normal leading-relaxed max-w-full">
            Sessions are held in an HttpOnly cookie. Sign out from the deck to
            clear the footprint.
          </p>
        </div>
      </div>

      {/* local keyframes for the shake animation — avoids Framer Motion mount risk */}
      <style>{`
        @keyframes adminShake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="M10 13l10-10" />
      <path d="M16 7l3 3" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

const supabaseClient = createClient(
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

const SUPABASE_PROFILES_TABLE = "profiles";

type AuthMode = "signin" | "signup";
type AdminGateStatus =
  | { kind: "loading" }
  | { kind: "unauthed" }
  | { kind: "checking-admin"; email: string | null }
  | { kind: "access-denied"; email: string | null }
  | { kind: "authed" };

interface AdminGateProps {
  onAuthed?: () => void;
}

export default function AdminGate({ onAuthed }: AdminGateProps) {
  const [status, setStatus] = useState<AdminGateStatus>({ kind: "loading" });

  // Auth form state
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    const resolve = async (session: Session | null) => {
      if (!mounted) return;
      if (!session?.user) {
        setStatus({ kind: "unauthed" });
        return;
      }
      setStatus({ kind: "checking-admin", email: session.user.email ?? null });

      const { data, error } = await supabaseClient
        .from(SUPABASE_PROFILES_TABLE)
        .select("is_admin")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.error("[admin] profile fetch error", error);
        setStatus({ kind: "access-denied", email: session.user.email ?? null });
        return;
      }
      if (data?.is_admin === true) {
        if (onAuthed) {
          onAuthed();
        } else {
          setStatus({ kind: "authed" });
        }
      } else {
        setStatus({ kind: "access-denied", email: session.user.email ?? null });
      }
    };

    supabaseClient.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: sub } = supabaseClient.auth.onAuthStateChange(
      (_event, newSession) => resolve(newSession)
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [onAuthed]);

  const handleEmailAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    setErrorMsg(null);
    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        throw new Error("Email and password are required.");
      }
      const result =
        authMode === "signin"
          ? await supabaseClient.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            })
          : await supabaseClient.auth.signUp({
              email: trimmedEmail,
              password,
            });
      if (result.error) throw result.error;
      setPassword("");
      // onAuthStateChange will pick up the new session and re-resolve status.
    } catch (err) {
      setAuthLoading(false);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : authMode === "signin"
            ? "Sign in failed. Please try again."
            : "Sign up failed. Please try again."
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/admin" },
      });
      if (error) throw error;
    } catch (err) {
      setOauthLoading(false);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Google sign-in failed. Please try again."
      );
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabaseClient.auth.signOut();
      setStatus({ kind: "unauthed" });
      setEmail("");
      setPassword("");
      setErrorMsg(null);
      setAuthMode("signin");
    } finally {
      setSigningOut(false);
    }
  };

  if (status.kind === "loading" || status.kind === "checking-admin") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF8F5]">
        <div className="flex flex-col items-center gap-4">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-[#0F3460]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
            {status.kind === "checking-admin"
              ? "Verifying editorial privileges"
              : "Loading Editorial Control Deck"}
          </span>
        </div>
      </div>
    );
  }

  if (status.kind === "access-denied") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF8F5] p-6 overflow-hidden relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(circle at 50% 38%, rgba(15,52,96,0.12), transparent 60%)",
          }}
        />
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
              Access Denied
            </h1>
            <p className="mt-3 text-sm text-stone-500 font-light max-w-xs leading-relaxed break-words whitespace-normal">
              Your account
              {status.email ? (
                <>
                  {" "}
                  <span className="text-stone-700 font-medium">
                    {status.email}
                  </span>{" "}
                </>
              ) : (
                " "
              )}
              does not have editorial control deck privileges.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="relative inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F3460] px-6 py-3.5 text-[12px] uppercase tracking-[0.25em] text-[#F5F0E8] font-semibold hover:bg-[#1A4A7A] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {signingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </div>
    );
  }

  // authed — caller will render the dashboard instead, but provide a safe
  // fallback so the component is never empty.
  if (status.kind === "authed") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF8F5]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
          Loading deck…
        </span>
      </div>
    );
  }

  // unauthed — editorial sign-in card
  const inputClass =
    "w-full rounded-xl border border-stone-300 bg-white/80 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/15 transition";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF8F5] p-6 overflow-hidden relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, rgba(15,52,96,0.12), transparent 60%)",
        }}
      />

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
            Sign in with an authorized contributor account to unlock the
            moderation queue, analytics, and the live lookbook archive.
          </p>
        </div>

        {/* Sign In / Create Account toggle */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-stone-200 bg-white/70 p-1">
          {(["signin", "signup"] as AuthMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setAuthMode(mode);
                setErrorMsg(null);
              }}
              className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                authMode === mode
                  ? "bg-[#0F3460] text-[#F5F0E8]"
                  : "text-stone-600 hover:text-[#0F3460]"
              }`}
            >
              {mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-600">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-600">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={
                authMode === "signin" ? "current-password" : "new-password"
              }
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={authLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F3460] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#F5F0E8] transition-colors hover:bg-[#1A4A7A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authLoading
              ? "Please wait…"
              : authMode === "signin"
                ? "Sign In"
                : "Sign Up"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-stone-200" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            or
          </span>
          <span className="h-px flex-1 bg-stone-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={oauthLoading}
          className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-stone-300 bg-white px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-800 transition-all duration-300 hover:border-[#0F3460] hover:text-[#0F3460] hover:shadow-[0_8px_30px_rgba(15,52,96,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleGIcon />
          {oauthLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        {errorMsg && (
          <p className="mt-6 break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
            {errorMsg}
          </p>
        )}

        <div className="mt-7 text-center">
          <a
            href="/"
            className="inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-stone-500 transition-colors hover:text-[#0F3460]"
          >
            ← Back to lookbook
          </a>
        </div>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function GoogleGIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.04-3.711H.957v2.332A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71A5.41 5.41 0 0 1 3.682 9c0-.588.102-1.16.278-1.71V4.958H.957A9 9 0 0 0 0 9c0 1.452.347 2.827.957 4.042l3.003-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.958L3.96 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
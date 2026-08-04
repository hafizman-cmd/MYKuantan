"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabase/client";

const SUPABASE_PROFILES_TABLE = "profiles";

interface ContributorProfile {
  username: string;
  display_name: string | null;
}

const NAV_LINKS = [
  { label: "Lookbook", href: "/" },
  { label: "Stories", href: "/stories" },
  { label: "Gallery", href: "/gallery" },
  { label: "Visit", href: "/visit" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });

    const { data: subData } = supabaseClient.auth.onAuthStateChange(
      (_event, newSession) => {
        if (mounted) setSession(newSession);
      }
    );

    return () => {
      mounted = false;
      subData.subscription.unsubscribe();
    };
  }, []);

  // Whenever the signed-in user changes, fetch their public.profiles row.
  useEffect(() => {
    const user = session?.user ?? null;
    if (!user) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    supabaseClient
      .from(SUPABASE_PROFILES_TABLE)
      .select("username, display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("navbar profile fetch error", error);
          setProfile(null);
          return;
        }
        if (data && typeof data.username === "string" && data.username) {
          setProfile({
            username: data.username,
            display_name:
              typeof data.display_name === "string" ? data.display_name : null,
          });
        } else {
          setProfile(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await supabaseClient.auth.signOut();
      setProfile(null);
      setIsOpen(false);
    } finally {
      setLoggingOut(false);
    }
  };

  const user = session?.user ?? null;
  const isKnownContributor = !!user && !!profile;

  // Left-hand handle badge — subtle editorial pill next to the Kuantan logo.
  const handleBadge = profile ? (
    <Link
      href="/submit"
      onClick={() => setIsOpen(false)}
      title={
        profile.display_name ? `Signed in as ${profile.display_name}` : undefined
      }
      className="px-3 py-1 text-[11px] font-mono tracking-wider bg-stone-200/60 text-stone-700 rounded-full border border-stone-300/60 transition-colors duration-300 hover:bg-stone-200 hover:text-stone-900"
    >
      @{profile.username}
    </Link>
  ) : null;

  const submitBtn = (
    <Link
      href="/submit"
      onClick={() => setIsOpen(false)}
      className="hidden sm:inline-flex items-center rounded-full border border-[#0F3460] bg-transparent px-6 py-2.5 text-[12px] uppercase tracking-[0.2em] text-[#0F3460] font-semibold hover:bg-[#0F3460] hover:text-[#FAF8F5] transition-all duration-300"
    >
      Submit
    </Link>
  );

  const logOutBtn = (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loggingOut}
      className="hidden md:inline-flex items-center text-[11px] uppercase tracking-[0.18em] text-stone-500 hover:text-red-700 transition-colors duration-300 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Log out"
    >
      {loggingOut ? "…" : "Log Out"}
    </button>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] w-full bg-[#FAF8F5]/80 backdrop-blur-md border-b border-stone-200/60">
      <nav className="w-full max-w-[1600px] mx-auto px-6 lg:px-16 h-20 md:h-24 flex items-center justify-between">
        {/* LEFT: brand + contributor handle badge */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/"
            className="font-display font-extrabold tracking-tight text-stone-900 text-3xl md:text-4xl leading-none select-none"
          >
            Kuantan
          </Link>
          {handleBadge}
        </div>

        {/* RIGHT: nav links + Submit CTA + Log Out + hamburger */}
        <div className="flex items-center gap-6 md:gap-8 lg:gap-10">
          <ul className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[13px] uppercase tracking-[0.18em] text-stone-700 hover:text-[#0F3460] transition-colors duration-300 font-medium"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {submitBtn}
          {isKnownContributor ? logOutBtn : null}
          <button
            aria-label="Open menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden flex flex-col items-end gap-1.5 p-2"
          >
            <span className="block h-[2px] w-6 bg-stone-900" />
            <span className="block h-[2px] w-4 bg-stone-900" />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown drawer — hidden on md+ screens */}
      {isOpen && (
        <div className="md:hidden w-full bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/60">
          <ul className="w-full max-w-[1600px] mx-auto px-6 py-4 flex flex-col gap-1">
            {profile && (
              <li className="py-2">
                <Link
                  href="/submit"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center px-3 py-1 text-[11px] font-mono tracking-wider bg-stone-200/60 text-stone-700 rounded-full border border-stone-300/60"
                >
                  @{profile.username}
                </Link>
              </li>
            )}
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block w-full py-3 text-sm uppercase tracking-[0.18em] text-stone-700 hover:text-[#0F3460] transition-colors duration-300 font-medium"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                href="/submit"
                onClick={() => setIsOpen(false)}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-[#0F3460] bg-transparent px-6 py-2.5 text-[12px] uppercase tracking-[0.2em] text-[#0F3460] font-semibold hover:bg-[#0F3460] hover:text-[#FAF8F5] transition-all duration-300"
              >
                Submit Frame
              </Link>
            </li>
            {isKnownContributor && (
              <li className="mt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  className="w-full sm:w-auto inline-flex items-center justify-center py-3 text-[11px] uppercase tracking-[0.18em] text-stone-500 hover:text-red-700 transition-colors duration-300 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Log out"
                >
                  {loggingOut ? "Signing out…" : "Log Out"}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
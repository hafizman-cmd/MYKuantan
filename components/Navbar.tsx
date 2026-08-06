"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
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
  { label: "My Trip", href: "/collection" },
];

const LIGHT_PAGES = ["/", "/submit"];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // When the navbar is transparent over a light cream page (top of page),
  // text must switch to dark navy for legibility. Once scrolled the bar
  // becomes a dark frosted overlay, so text reverts to light.
  const isLightPage = LIGHT_PAGES.includes(pathname ?? "");
  const lightMode = isLightPage && !scrolled;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      setIsLogoutModalOpen(false);
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
      className={`rounded-full border px-3 py-1 font-mono text-[11px] tracking-wider transition-colors duration-300 ${
        lightMode
          ? "border-[#0a1726]/20 bg-[#0a1726]/10 !text-[#0a1726] hover:bg-[#0a1726]/20"
          : "border-white/15 bg-white/10 text-stone-100 hover:bg-white/20 hover:text-white"
      }`}
    >
      @{profile.username}
    </Link>
  ) : null;

  const submitBtn = (
    <Link
      href="/submit"
      onClick={() => setIsOpen(false)}
      className={`hidden sm:inline-flex items-center rounded-full border bg-transparent px-6 py-2.5 text-[12px] uppercase tracking-[0.2em] font-semibold transition-all duration-300 ${
        lightMode
          ? "border-[#0a1726] !text-[#0a1726] hover:bg-[#0a1726] hover:!text-[#F5F0E8]"
          : "border-stone-100/80 text-stone-100 hover:bg-stone-100 hover:text-[#0B192C]"
      }`}
    >
      Submit
    </Link>
  );

  const logOutBtn = (
    <button
      type="button"
      onClick={() => setIsLogoutModalOpen(true)}
      disabled={loggingOut}
      className={`hidden md:inline-flex items-center text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
        lightMode
          ? "!text-[#0a1726] hover:underline"
          : "text-stone-300 hover:text-red-300"
      }`}
      aria-label="Log out"
    >
      {loggingOut ? "…" : "Log Out"}
    </button>
  );

  const modalContent = isLogoutModalOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => {
        if (!loggingOut) setIsLogoutModalOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        className="w-full max-w-md border border-white/20 bg-[#0B192C] p-8 text-stone-100 shadow-2xl shadow-black/50 md:p-10"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber-300/80">
          Account
        </p>
        <h2
          id="logout-dialog-title"
          className="mt-3 break-words font-display text-3xl font-semibold leading-tight text-white"
        >
          Leave your session?
        </h2>
        <p
          id="logout-dialog-description"
          className="mt-3 text-sm leading-6 text-stone-300"
        >
          You will need to sign in again to contribute to the lookbook.
        </p>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(false)}
            disabled={loggingOut}
            className="border border-white/40 bg-white/5 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Stay signed in
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={loggingOut}
            className="border border-red-200 bg-red-300 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B192C] transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? "Signing out..." : "Log out"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[1000] w-full text-stone-100 transition-all duration-300 ease-in-out ${
        scrolled
          ? "border-b border-white/10 bg-[#0B192C]/85 backdrop-blur-md shadow-lg"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="w-full max-w-[1600px] mx-auto px-6 lg:px-16 h-20 md:h-24 flex items-center justify-between">
        {/* LEFT: brand + contributor handle badge */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/"
            className={`font-display font-extrabold tracking-tight text-3xl md:text-4xl leading-none select-none transition-colors duration-300 ${
              lightMode ? "!text-[#0a1726]" : "text-white"
            }`}
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
                  className={`text-[13px] uppercase tracking-[0.18em] transition-opacity duration-300 font-medium ${
                    lightMode
                      ? "!text-[#0a1726] hover:opacity-70"
                      : "text-stone-100 hover:text-amber-300"
                  }`}
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
            <span className={`block h-[2px] w-6 ${lightMode ? "bg-[#0a1726]" : "bg-stone-100"}`} />
            <span className={`block h-[2px] w-4 ${lightMode ? "bg-[#0a1726]" : "bg-stone-100"}`} />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown drawer — hidden on md+ screens */}
      {isOpen && (
        <div className="md:hidden w-full border-b border-white/10 bg-[#0B192C]/98 text-stone-100 backdrop-blur-md">
          <ul className="w-full max-w-[1600px] mx-auto px-6 py-4 flex flex-col gap-1">
            {profile && (
              <li className="py-2">
                <Link
                  href="/submit"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 font-mono text-[11px] tracking-wider text-stone-100"
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
                  className="block w-full py-3 text-sm uppercase tracking-[0.18em] text-stone-100 hover:text-amber-300 transition-colors duration-300 font-medium"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                href="/submit"
                onClick={() => setIsOpen(false)}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-stone-100/80 bg-transparent px-6 py-2.5 text-[12px] uppercase tracking-[0.2em] text-stone-100 font-semibold hover:bg-stone-100 hover:text-[#0B192C] transition-all duration-300"
              >
                Submit Frame
              </Link>
            </li>
            {isKnownContributor && (
              <li className="mt-1">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  disabled={loggingOut}
                  className="w-full sm:w-auto inline-flex items-center justify-center py-3 text-[11px] uppercase tracking-[0.18em] text-stone-300 hover:text-red-300 transition-colors duration-300 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Log out"
                >
                  {loggingOut ? "Signing out…" : "Log Out"}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      {mounted && modalContent
        ? createPortal(modalContent, document.body)
        : null}
    </header>
  );
}

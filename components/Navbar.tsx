"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Lookbook", href: "#lookbook" },
  { label: "Stories", href: "#stories" },
  { label: "Gallery", href: "#gallery" },
  { label: "Visit", href: "#visit" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#FAF8F5]/80 backdrop-blur-md border-b border-stone-200/60">
      <nav className="w-full max-w-[1600px] mx-auto px-6 lg:px-16 h-20 md:h-24 flex items-center justify-between">
        <a
          href="#top"
          className="font-display font-extrabold tracking-tight text-stone-900 text-3xl md:text-4xl leading-none select-none"
        >
          Kuantan
        </a>

        <div className="flex items-center gap-8 md:gap-10">
          <ul className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-[13px] uppercase tracking-[0.18em] text-stone-700 hover:text-[#0F3460] transition-colors duration-300 font-medium"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <Link
            href="/submit"
            className="hidden sm:inline-flex items-center rounded-full border border-[#0F3460] bg-transparent px-6 py-2.5 text-[12px] uppercase tracking-[0.2em] text-[#0F3460] font-semibold hover:bg-[#0F3460] hover:text-[#FAF8F5] transition-all duration-300"
          >
            Submit
          </Link>
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
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block w-full py-3 text-sm uppercase tracking-[0.18em] text-stone-700 hover:text-[#0F3460] transition-colors duration-300 font-medium"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/submit"
                onClick={() => setIsOpen(false)}
                className="mt-2 inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-[#0F3460] bg-transparent px-6 py-2.5 text-[12px] uppercase tracking-[0.2em] text-[#0F3460] font-semibold hover:bg-[#0F3460] hover:text-[#FAF8F5] transition-all duration-300"
              >
                Submit
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

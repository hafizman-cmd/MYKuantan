import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full overflow-hidden block bg-stone-900 relative">
      <div className="w-full max-w-[1600px] mx-auto py-8 px-6 md:px-12">
        <div className="w-full flex flex-col items-center justify-center text-center space-y-3">
          <div className="flex flex-col items-center gap-2">
            <span className="text-lg font-serif tracking-tight text-[#F5F0E8]">
              Kuantan
            </span>
            <p className="max-w-md text-xs text-stone-500 font-light leading-relaxed">
              An editorial celebration of Kuantan, Pahang — light, tide, and
              tradition, framed.
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              { label: "Lookbook", href: "/" },
              { label: "Gallery", href: "/gallery" },
              { label: "Stories", href: "/stories" },
              { label: "Visit", href: "/visit" },
              { label: "Submit", href: "/submit" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs uppercase tracking-[0.2em] text-stone-500 hover:text-[#F5F0E8] transition-colors duration-300"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="w-12 h-px bg-stone-700" />

          <div className="flex flex-col md:flex-row items-center justify-center gap-2 text-xs text-stone-500">
            <span>© {year} MYKuantan. All rights reserved.</span>
            <span className="hidden md:inline text-stone-700">·</span>
            <span>Crafted in Pahang, Malaysia.</span>
          </div>
        </div>

        <Link
          href="/admin"
          aria-label="Editorial access"
          title="Editorial access"
          className="absolute bottom-2 right-2 w-4 h-4 opacity-0 cursor-default"
        >
          ·
        </Link>
      </div>
    </footer>
  );
}
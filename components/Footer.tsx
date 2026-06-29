export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full overflow-hidden block bg-stone-900">
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-16 py-16 md:py-20">
        <div className="w-full flex flex-col items-center justify-center text-center gap-10">
          <div className="flex flex-col items-center gap-4">
            <span className="font-display text-[#F5F0E8] text-4xl md:text-5xl font-extrabold tracking-tight">
              Kuantan
            </span>
            <p className="max-w-md text-sm text-stone-400 font-light leading-relaxed">
              An editorial celebration of Kuantan, Pahang — light, tide, and
              tradition, framed.
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              { label: "Lookbook", href: "#lookbook" },
              { label: "Gallery", href: "#gallery" },
              { label: "Stories", href: "#stories" },
              { label: "Visit", href: "#visit" },
              { label: "Submit", href: "#submit" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[12px] uppercase tracking-[0.2em] text-stone-400 hover:text-[#F5F0E8] transition-colors duration-300"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="w-16 h-px bg-stone-700" />

          <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-stone-500 text-xs">
            <span>© {year} MYKuantan. All rights reserved.</span>
            <span className="hidden md:inline text-stone-700">·</span>
            <span>Crafted in Pahang, Malaysia.</span>
          </div>

          <a
            href="/admin"
            aria-label="Editorial access"
            title="Editorial access"
            className="mt-2 inline-block px-4 py-2 text-stone-700 hover:text-stone-400 transition-colors duration-300 text-xs leading-none"
          >
            ·
          </a>
        </div>
      </div>
    </footer>
  );
}
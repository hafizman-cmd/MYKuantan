"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";

const TYPE_INTERVAL_MS = 22;
const ERA_PAUSE_MS = 650;

function CompassChartSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
      className="h-32 w-32 mx-auto stroke-amber-200/40"
    >
      <circle cx="100" cy="100" r="82" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="64" strokeWidth="1" strokeDasharray="3 6" />
      <circle cx="100" cy="100" r="6" strokeWidth="1.5" />
      <path
        d="M100 22 L111 100 L100 178 L89 100 Z"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M22 100 L100 89 L178 100 L100 111 Z"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M100 6 v10 M100 184 v10 M6 100 h10 M184 100 h10"
        strokeWidth="1.5"
      />
      <path
        d="M18 178 L64 148 M182 22 L136 52"
        strokeWidth="1"
        strokeDasharray="2 5"
      />
    </svg>
  );
}

function WaveRouteSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
      className="h-32 w-32 mx-auto stroke-blue-300/30"
    >
      <path d="M0 58 Q25 44 50 58 T100 58 T150 58 T200 58" strokeWidth="1.5" />
      <path d="M0 88 Q25 74 50 88 T100 88 T150 88 T200 88" strokeWidth="1.5" />
      <path
        d="M0 118 Q25 104 50 118 T100 118 T150 118 T200 118"
        strokeWidth="1.5"
      />
      <path
        d="M0 148 Q25 134 50 148 T100 148 T150 148 T200 148"
        strokeWidth="1.5"
      />
      <path
        d="M0 178 Q25 164 50 178 T100 178 T150 178 T200 178"
        strokeWidth="1.5"
      />
      <path
        d="M22 186 C60 150 84 112 112 76 C132 50 158 32 184 18"
        strokeWidth="1.5"
        strokeDasharray="4 7"
      />
      <circle cx="22" cy="186" r="5" strokeWidth="1.5" />
      <circle cx="184" cy="18" r="5" strokeWidth="1.5" />
    </svg>
  );
}

function BlueprintSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
      className="h-32 w-32 mx-auto stroke-slate-300/30"
    >
      <rect x="18" y="76" width="48" height="106" strokeWidth="1.5" />
      <rect x="78" y="42" width="56" height="140" strokeWidth="1.5" />
      <rect x="146" y="96" width="36" height="86" strokeWidth="1.5" />
      <path
        d="M26 90 h14 M26 106 h14 M26 122 h14 M44 90 h14 M44 106 h14 M44 122 h14"
        strokeWidth="1"
      />
      <path
        d="M86 56 h16 M86 74 h16 M86 92 h16 M112 56 h14 M112 74 h14 M112 92 h14"
        strokeWidth="1"
      />
      <path d="M154 110 h20 M154 128 h20 M154 146 h20" strokeWidth="1" />
      <path d="M12 190 h176" strokeWidth="1" strokeDasharray="2 4" />
      <path d="M106 32 v-14 M106 18 l-5 6 M106 18 l5 6" strokeWidth="1" />
    </svg>
  );
}

function CityNetworkSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
      className="h-32 w-32 mx-auto stroke-amber-200/50"
    >
      <path
        d="M52 58 L142 40 M52 58 L100 122 M142 40 L100 122 M100 122 L162 142 M100 122 L46 162 M142 40 L162 142"
        strokeWidth="1"
      />
      <circle cx="52" cy="58" r="6" strokeWidth="1.5" />
      <circle cx="142" cy="40" r="6" strokeWidth="1.5" />
      <circle cx="162" cy="142" r="6" strokeWidth="1.5" />
      <circle cx="46" cy="162" r="6" strokeWidth="1.5" />
      <circle cx="100" cy="122" r="7" strokeWidth="1.5" />
      <circle cx="100" cy="122" r="20" strokeWidth="1" strokeDasharray="3 5" />
      <path
        d="M100 94 v-12 M100 150 v12 M72 122 h-12 M128 122 h12"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const ERA_ART = [
  { Svg: CompassChartSvg },
  { Svg: WaveRouteSvg },
  { Svg: BlueprintSvg },
  { Svg: CityNetworkSvg },
];

function EraSvgCard({ index, caption }: { index: number; caption: string }) {
  const art = ERA_ART[index];
  return (
    <div className="w-full max-w-[200px] aspect-square p-4 rounded-xl border border-white/10 bg-[#0d1f35]/80 backdrop-blur-sm shadow-xl transition-all duration-500 ease-in-out">
      <art.Svg />
      <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-stone-400">
        {caption}
      </p>
    </div>
  );
}

function EraPlaceholder() {
  return <div className="hidden lg:block" aria-hidden />;
}

export default function KuantanChronicles() {
  const { copy, language } = useLanguage();
  const chronicles = copy.stories.chronicles;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeEra, setActiveEra] = useState(0);
  const [typed, setTyped] = useState<string[]>(() => chronicles.map(() => ""));
  const [hasStarted, setHasStarted] = useState(false);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    setTyped(chronicles.map(() => ""));
    setActiveEra(0);
    let eraIndex = 0;
    let charIndex = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = chronicles[eraIndex];
      if (charIndex <= current.body.length) {
        setTyped((prev) => {
          const next = [...prev];
          next[eraIndex] = current.body.slice(0, charIndex);
          return next;
        });
        charIndex += 1;
        timer = setTimeout(tick, TYPE_INTERVAL_MS);
      } else if (eraIndex < chronicles.length - 1) {
        eraIndex += 1;
        charIndex = 0;
        setActiveEra(eraIndex);
        timer = setTimeout(tick, ERA_PAUSE_MS);
      }
    };

    timer = setTimeout(tick, ERA_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [chronicles, hasStarted, language]);

  // Cinematic auto-scroll: when a new step becomes active, gently pan the
  // viewport so the newly typing card stays centered. Skip the very first
  // activation so we don't fight the user's initial scroll into view.
  useEffect(() => {
    if (!hasStarted || activeEra === 0) return;
    const node = stepRefs.current[activeEra];
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeEra, hasStarted]);

  // Render every revealed step (0..activeEra) as a stacked timeline row.
  const revealedIndices = chronicles.map((_, i) => i).filter(
    (i) => i <= activeEra
  );

  return (
    <section
      id="stories"
      className="w-full min-h-screen flex flex-col justify-start items-center pt-28 md:pt-32 pb-16 bg-[#0F3460] text-stone-100"
    >
      <div className="w-full mb-8 px-6 text-center z-10">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-100 tracking-tight mb-2">
          {copy.stories.title}
        </h2>
        <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
          {copy.stories.description}
        </p>
      </div>

      <div
        ref={containerRef}
        className="w-full max-w-6xl mx-auto px-6 flex flex-col gap-8"
      >
        {revealedIndices.map((i) => {
          const item = chronicles[i];
          const isActive = i === activeEra;
          const isEven = i % 2 === 0;
          const isComplete = i < activeEra;

          return (
            <div
              key={item.era}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              className="grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] items-center gap-6 w-full"
            >
              {/* LEFT — SVG on even steps */}
              {isEven ? (
                <div className="hidden lg:flex justify-center">
                    <EraSvgCard
                      index={i}
                      caption={copy.stories.artCaptions[i]}
                    />
                </div>
              ) : (
                <EraPlaceholder />
              )}

              {/* CENTER — revealed narrative card */}
              <div className="max-w-xl mx-auto w-full">
                <article
                    data-cursor={copy.stories.readStory.toUpperCase()}
                  className={`w-full rounded-xl bg-slate-900/70 p-6 border overflow-hidden transition-all duration-500 ${
                    isActive
                      ? "border-amber-400/40 shadow-[0_10px_40px_rgba(251,191,36,0.08)]"
                      : "border-slate-800"
                  } ${isComplete ? "opacity-80" : "opacity-100"}`}
                >
                  <p className="text-xs font-mono font-semibold tracking-wider text-amber-400 uppercase mb-1">
                    {item.era}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-serif text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="min-h-[5rem] text-xs sm:text-sm text-stone-300 leading-relaxed">
                    {typed[i]}
                    {isActive && hasStarted && (
                      <span
                        aria-hidden
                        className="inline-block align-middle w-2 h-4 md:h-5 ml-1 bg-amber-400 animate-pulse"
                      />
                    )}
                  </p>
                </article>

                {/* Step indicator for the active row */}
                {isActive && (
                  <div className="mt-5 flex items-center justify-center gap-2">
                    {chronicles.map((c, idx) => (
                      <span
                        key={c.era}
                        aria-hidden
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === activeEra
                            ? "w-8 bg-amber-400"
                            : idx < activeEra
                              ? "w-2 bg-amber-400/40"
                              : "w-2 bg-stone-500/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT — SVG on odd steps */}
              {isEven ? (
                <EraPlaceholder />
              ) : (
                <div className="hidden lg:flex justify-center">
                    <EraSvgCard
                      index={i}
                      caption={copy.stories.artCaptions[i]}
                    />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

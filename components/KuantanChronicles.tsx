"use client";

import { useEffect, useRef, useState } from "react";

interface ChronicleEra {
  era: string;
  title: string;
  body: string;
}

const CHRONICLES: ChronicleEra[] = [
  {
    era: "1850s // ILHAM AWAL",
    title: "Petempatan Awal",
    body: "Petempatan awal Kuantan mula diasaskan sekitar tahun 1850-an oleh Haji Senik bersama pengikutnya. Kawasan penumpuan asal ini asalnya dikenali sebagai Kampung Teruntum, yang terletak berhampiran muara Teruntum River.",
  },
  {
    era: "1851 // CATATAN MUNSHI",
    title: "Pelayaran Abdullah",
    body: "Nama Kuantan secara rasminya direkodkan dalam lembaran sejarah tamadun Melayu moden oleh tokoh sastera Abdullah Abdul Kadir Munshi dalam kisah pelayaran terkenal beliau ke Pantai Timur sekitar tahun 1851.",
  },
  {
    era: "1955 // IBU NEGERI PAHANG",
    title: "Pusat Pentadbiran",
    body: "Titik perubahan geo-politik Kuantan berlaku secara gemilang pada 27 Ogos 1955 apabila pusat pentadbiran rasmi bagi ibu negeri Pahang telah dipindahkan dari Kuala Lipis terus menuju ke kawasan pesisiran pantai Kuantan.",
  },
  {
    era: "2021 // STATUS BANDAR RAYA",
    title: "Bandar Raya Moden",
    body: "Setelah melalui evolusi perlombongan bijih di Lembing serta perkembangan industri pelabuhan Gebeng, Kuantan secara rasminya dinaikkan taraf kedaulatan kepada sebuah Bandar Raya moden pada 21 Februari 2021.",
  },
];

const TYPE_INTERVAL_MS = 22;
const ERA_PAUSE_MS = 650;

export default function KuantanChronicles() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeEra, setActiveEra] = useState(0);
  const [typed, setTyped] = useState<string[]>(CHRONICLES.map(() => ""));
  const [hasStarted, setHasStarted] = useState(false);

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
    let eraIndex = 0;
    let charIndex = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = CHRONICLES[eraIndex];
      if (charIndex <= current.body.length) {
        setTyped((prev) => {
          const next = [...prev];
          next[eraIndex] = current.body.slice(0, charIndex);
          return next;
        });
        charIndex += 1;
        timer = setTimeout(tick, TYPE_INTERVAL_MS);
      } else if (eraIndex < CHRONICLES.length - 1) {
        eraIndex += 1;
        charIndex = 0;
        setActiveEra(eraIndex);
        timer = setTimeout(tick, ERA_PAUSE_MS);
      }
    };

    timer = setTimeout(tick, ERA_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [hasStarted]);

  return (
    <section id="stories" className="w-full block bg-[#0F3460]">
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-16 pt-20 md:pt-28 pb-20 md:pb-28">
        <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center mx-auto mb-12 md:mb-16">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F5F0E8]/25 bg-white/5 px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-[#F5F0E8]/80 backdrop-blur-md">
            The Chronicles
          </span>
          <h2 className="font-display text-[#F5F0E8] text-4xl md:text-6xl font-extrabold leading-[0.95] tracking-tight">
            Stories of Kuantan
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#F5F0E8]/70 font-light">
            A museum-grade timeline of the coastal capital — printed line by
            line as you arrive.
          </p>
        </div>

        <div
          ref={containerRef}
          className="mx-auto max-w-3xl bg-[#FAF8F5] rounded-2xl border border-stone-200 shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden"
        >
          {CHRONICLES.map((item, i) => {
            const isActive = i === activeEra;
            const isComplete = i < activeEra;
            return (
              <article
                key={item.era}
                className={`px-6 md:px-10 py-8 md:py-10 border-b border-stone-200 last:border-b-0 transition-opacity duration-500 ${
                  isActive || isComplete ? "opacity-100" : "opacity-40"
                }`}
              >
                <p className="text-amber-600 font-sans tracking-widest text-[11px] uppercase font-bold mb-2">
                  {item.era}
                </p>
                <h3 className="font-display text-stone-900 text-2xl md:text-3xl font-bold leading-tight mb-3">
                  {item.title}
                </h3>
                <p className="text-stone-800 font-serif text-base md:text-lg leading-relaxed">
                  {typed[i]}
                  {isActive && hasStarted && (
                    <span
                      aria-hidden
                      className="inline-block align-middle w-2 h-4 md:h-5 ml-1 bg-amber-600 animate-pulse"
                    />
                  )}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
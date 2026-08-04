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
    <section
      id="stories"
      className="w-full max-w-6xl mx-auto px-6 pt-28 md:pt-32 pb-8 flex flex-col justify-start items-center min-h-screen overflow-visible block bg-[#FAF8F5] text-stone-900"
    >
      <div className="w-full mb-6 text-center overflow-visible z-10">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight mb-2 block">
          Stories of Kuantan
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto block leading-relaxed">
          A museum-grade timeline of the coastal capital — printed line by
          line as you arrive.
        </p>
      </div>

      <div
        ref={containerRef}
        className="w-full max-w-3xl h-[52vh] max-h-[520px] overflow-y-auto pr-3 custom-scrollbar snap-y snap-mandatory rounded-2xl bg-white/80 p-4 border border-stone-200/80 shadow-sm space-y-4"
      >
        {CHRONICLES.map((item, i) => {
          const isActive = i === activeEra;
          const isComplete = i < activeEra;
          return (
            <article
              key={item.era}
              className={`snap-start snap-always w-full rounded-xl bg-white p-6 border border-stone-200/80 shadow-sm hover:border-stone-300 transition-all duration-200 ${
                isActive || isComplete ? "opacity-100" : "opacity-60"
              }`}
            >
              <p className="text-xs font-mono font-semibold tracking-wider text-amber-700 uppercase mb-1">
                {item.era}
              </p>
              <h3 className="text-xl sm:text-2xl font-serif text-stone-900 mb-3">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
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
    </section>
  );
}
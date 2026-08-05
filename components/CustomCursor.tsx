"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, type MotionStyle } from "framer-motion";

type CursorMode =
  | { kind: "hidden" }
  | { kind: "idle" }
  | { kind: "hover" }
  | { kind: "label"; label: string };

const SPRING = { stiffness: 400, damping: 28, mass: 0.4 };

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  if ("ontouchstart" in window) return true;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

// Returns true when the element lives inside a Leaflet map canvas or any
// element explicitly opting into the native browser cursor.
function isNativeCursorZone(target: HTMLElement): boolean {
  if (target.closest(".leaflet-container")) return true;
  if (target.closest(".leaflet-interactive")) return true;
  if (target.closest('[data-native-cursor="true"]')) return true;
  return false;
}

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<CursorMode>({ kind: "idle" });

  // Raw pointer coordinates.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // Smoothed position via spring physics.
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);

  useEffect(() => {
    if (isTouchDevice()) return;

    setEnabled(true);

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Suppress the custom cursor entirely over Leaflet maps / native zones
      // so the browser's native grab/grabbing cursor takes over.
      if (isNativeCursorZone(target)) {
        setMode({ kind: "hidden" });
        return;
      }

      const tagged = target.closest<HTMLElement>("[data-cursor]");
      if (tagged) {
        setMode({ kind: "label", label: tagged.dataset.cursor || "" });
        return;
      }
      const interactive = target.closest(
        "a, button, [role='button'], input, textarea, select, label"
      );
      setMode(interactive ? { kind: "hover" } : { kind: "idle" });
    };

    const onOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related && related.closest("[data-cursor]")) return;
      if (related && isNativeCursorZone(related)) return;
      setMode({ kind: "idle" });
    };

    const onLeave = () => {
      x.set(-100);
      y.set(-100);
      setMode({ kind: "idle" });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mouseout", onOut, { passive: true });
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [x, y]);

  if (!enabled) return null;

  const isHidden = mode.kind === "hidden";
  const isLabel = mode.kind === "label";
  const isHover = mode.kind === "hover";

  const ringStyle: MotionStyle = {
    x: springX,
    y: springY,
    translateX: "-50%",
    translateY: "-50%",
  };

  return (
    <motion.div
      aria-hidden
      style={ringStyle}
      className="pointer-events-none fixed top-0 left-0 z-[9999]"
    >
      {/* Ring / hover halo */}
      <motion.div
        animate={{
          width: isHidden || isLabel ? 0 : isHover ? 44 : 0,
          height: isHidden || isLabel ? 0 : isHover ? 44 : 0,
          opacity: isHidden || isLabel ? 0 : isHover ? 1 : 0,
          borderWidth: isHidden || isLabel ? 0 : isHover ? 1.5 : 1,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.3 }}
        className="rounded-full border-stone-900"
      />
      {/* Default / inactive cursor dot — solid, opaque, no blend modes */}
      <motion.div
        animate={{
          opacity: isHidden || isLabel ? 0 : 1,
          scale: isHover ? 0.4 : 1,
        }}
        transition={{ type: "spring", stiffness: 600, damping: 30 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-stone-900 border border-stone-100/50 rounded-full shadow-md pointer-events-none"
      />

      {/* Text pill badge — for content data-cursor values (VIEW FRAME / READ STORY) */}
      <motion.div
        animate={{
          opacity: isHidden ? 0 : isLabel ? 1 : 0,
          scale: isLabel ? 1 : 0.6,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.4 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="bg-stone-900 text-stone-100 border border-stone-700/80 shadow-2xl px-3.5 py-1.5 rounded-full flex items-center justify-center pointer-events-none select-none">
          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase text-stone-100 whitespace-nowrap">
            {isLabel ? (mode as { label: string }).label : ""}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
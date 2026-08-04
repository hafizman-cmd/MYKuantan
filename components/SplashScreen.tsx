"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type SplashScreenProps = {
  onComplete?: () => void;
};

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isRendered, setIsRendered] = useState(true);
  const [progressComplete, setProgressComplete] = useState(false);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("mykuantan_splash_seen");
    if (hasSeenSplash) {
      setIsRendered(false);
      onComplete?.();
      return;
    }

    const progressTimer = setTimeout(() => {
      setProgressComplete(true);
    }, 1300);

    const exitTimer = setTimeout(() => {
      setIsRendered(false);
      sessionStorage.setItem("mykuantan_splash_seen", "true");
      onComplete?.();
    }, 1900);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isRendered && (
        <motion.div
          className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-[#FAF8F5]"
          initial={{ opacity: 1 }}
          animate={{
            opacity: progressComplete ? 0 : 1,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[11px] text-stone-400 font-mono mb-2 tracking-[0.3em] uppercase">
              MYKUANTAN // EDITORIAL ARCHIVE
            </span>
            <span className="text-xs md:text-sm font-mono tracking-[0.2em] text-stone-800">
              3.8077° N, 103.3260° E
            </span>

            <div className="w-48 md:w-64 h-[1.5px] bg-stone-200/80 overflow-hidden relative mt-6">
              <motion.div
                className="h-full bg-[#0F3460]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
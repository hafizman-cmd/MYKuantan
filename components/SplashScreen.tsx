"use client";

import { useEffect, useState, useRef } from "react";

export default function SplashScreen() {
  const [isRendered, setIsRendered] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Check if the user has already seen the intro
    const hasSeenSplash = sessionStorage.getItem("mykuantan_splash_seen");
    if (hasSeenSplash) {
      setIsRendered(false);
      return;
    }

    // 2. Set device state instantly on mount
    setIsMobile(window.innerWidth < 768);

    // 3. Perfect 4-second hold timeline
    timeoutRef.current = setTimeout(() => {
      setIsRendered(false);
      sessionStorage.setItem("mykuantan_splash_seen", "true");
    }, 4000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!isRendered) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#FAF8F5]">
      {/* Only render the player once device width is verified */}
      {isMobile !== null && (
        <video
          src={isMobile ? "/loading_mobile.mp4" : "/loading_desktop.mp4"}
          autoPlay
          muted
          playsInline
          loop
          preload="auto" // 🔥 CRUCIAL: Forces the device to cache and decode frames instantly
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
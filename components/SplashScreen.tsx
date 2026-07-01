"use client";

import { useEffect, useState, useRef } from "react";

export default function SplashScreen() {
  const [isRendered, setIsRendered] = useState(true);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Session Storage Gatekeeper
    const hasSeenSplash = sessionStorage.getItem("mykuantan_splash_seen");
    if (hasSeenSplash) {
      setIsRendered(false);
      return;
    }

    // 2. Smart Device Detection
    // Checks screen width on load: under 768px gets mobile, over gets desktop
    const isMobileDevice = window.innerWidth < 768;
    setVideoSrc(isMobileDevice ? "/loading_mobile.mp4" : "/loading_desktop.mp4");

    // 3. Absolute Hold Timer (4.0 Seconds)
    // Holds the video perfectly on screen, then unmounts instantly and cleanly
    timeoutRef.current = setTimeout(() => {
      setIsRendered(false);
      sessionStorage.setItem("mykuantan_splash_seen", "true");
    }, 4000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Prevent rendering on Server-Side (SSR) to avoid Next.js hydration errors
  if (!isRendered || !videoSrc) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#FAF8F5]">
      <video
        src={videoSrc}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
}
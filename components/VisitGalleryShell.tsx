"use client";

import { useState } from "react";
import type { Photo } from "@/types/photo";
import type { RouteCategory } from "@/lib/routes";
import VisitTracks from "@/components/VisitTracks";
import Gallery from "@/components/Gallery";

interface VisitGalleryShellProps {
  photos: Photo[];
}

export default function VisitGalleryShell({ photos }: VisitGalleryShellProps) {
  const [activeRouteFilter, setActiveRouteFilter] =
    useState<RouteCategory | null>(null);

  return (
    <>
      <Gallery photos={photos} activeRouteFilter={activeRouteFilter} />
      <VisitTracks
        photos={photos}
        activeRouteFilter={activeRouteFilter}
        setActiveRouteFilter={setActiveRouteFilter}
      />
    </>
  );
}
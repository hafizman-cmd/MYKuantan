"use client";

import type { Photo } from "@/types/photo";
import VisitTracks from "@/components/VisitTracks";
import Gallery from "@/components/Gallery";

interface VisitGalleryShellProps {
  photos: Photo[];
}

export default function VisitGalleryShell({ photos }: VisitGalleryShellProps) {
  return (
    <>
      <Gallery photos={photos} />
      <VisitTracks photos={photos} />
    </>
  );
}

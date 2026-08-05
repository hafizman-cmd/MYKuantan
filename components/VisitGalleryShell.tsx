"use client";

import type { Photo } from "@/types/photo";
import VisitTracks from "@/components/VisitTracks";

interface VisitGalleryShellProps {
  photos: Photo[];
}

export default function VisitGalleryShell({ photos }: VisitGalleryShellProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-28 md:pt-36 pb-12">
      <VisitTracks photos={photos} />
    </div>
  );
}

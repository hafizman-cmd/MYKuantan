"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Photo } from "@/types/photo";
import { locationCoords, locationRouteMap, type RouteCategory } from "@/lib/routes";

// 2. Custom HTML Marker Pin (Avoids broken Leaflet asset-loading image paths in Next.js)
function createCustomMarker(isActive: boolean): L.DivIcon {
  return L.divIcon({
    className: "kuantan-pulse-marker",
    html: `
      <div class="relative flex items-center justify-center w-6 h-6">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${
          isActive ? "bg-amber-400/40" : "bg-white/10"
        } opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 ${
          isActive ? "bg-amber-400 scale-150" : "bg-white shadow-md"
        } transition-all duration-300"></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// 3. Nested Camera Logic Controller (Fixes the React Context Trap)
function MapUpdater({ activeLocation }: { activeLocation: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (activeLocation && locationCoords[activeLocation]) {
      const targetCoords = locationCoords[activeLocation];
      map.flyTo(targetCoords, 14, {
        animate: true,
        duration: 0.8,
        easeLinearity: 0.25,
      });
    }
  }, [activeLocation, map]);
  return null;
}

interface EditorialMapProps {
  activeLocation: string | null;
  photos: Photo[];
  activeRouteFilter?: RouteCategory | null;
}

// 4. Main Exported Map Component Container
export default function EditorialMap({
  activeLocation,
  photos,
  activeRouteFilter = null,
}: EditorialMapProps) {
  const defaultCenter: [number, number] = [3.808, 103.325];
  const filteredPhotos = photos.filter((photo) => {
    if (!activeRouteFilter) return true;
    return locationRouteMap[photo.location] === activeRouteFilter;
  });
  return (
    <div className="w-full h-[65vh] md:h-[78vh] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-slate-800/10 bg-slate-950">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full"
        zoomControl
        dragging={typeof window !== "undefined" && window.innerWidth > 768}
        touchZoom="center"
        {...({ tap: true } as { tap?: boolean })}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        />
        <MapUpdater activeLocation={activeLocation} />
        {filteredPhotos.map((photo) => {
          let coordinates: [number, number] | null = null;
          if (photo.latitude != null && photo.longitude != null) {
            coordinates = [photo.latitude, photo.longitude];
          } else if (locationCoords[photo.location]) {
            coordinates = locationCoords[photo.location];
          }
          if (!coordinates) return null;
          const isActive = activeLocation === photo.location;
          return (
            <Marker
              key={photo.id}
              position={coordinates}
              icon={createCustomMarker(isActive)}
              eventHandlers={{
                click: () => {
                  const [lat, lng] = coordinates;
                  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                  window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
                },
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
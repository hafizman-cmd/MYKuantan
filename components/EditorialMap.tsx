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
import { locationRouteMap, type RouteCategory } from "@/lib/routes";

// 1. Master Coordinate Dictionary for Kuantan Hotspots
const locationCoords: Record<string, [number, number]> = {
  "Bandar Kuantan": [3.808, 103.325],
  "Bukit Panorama": [3.915889608189525, 103.03655704954012],
  "Pantai Berserah": [3.8614, 103.3674],
  "Pantai Sepat": [3.7388, 103.3323],
  "Teluk Cempedak": [3.8114, 103.3725],
  "Sungai Kuantan": [3.8016, 103.3275],
  "Tanjung Lumpur": [3.807015563173489, 103.3404958696269],
  "Air Terjun Pelangi": [3.922173525732795, 102.94733952401076],
  "Bandar Sungai Lembing": [3.9148912029592844, 103.0326275272876],
  "Pantai Balok": [3.9317, 103.3742],
  "Masjid Sultan Ahmad Shah": [3.8078, 103.3262],
  "Pesisir Sungai Ular": [4.048433018193487, 103.39626490192093],
  "Air Terjun Panching": [3.791, 103.145],
  "Bukit Pelindung": [3.8254210748616564, 103.35797912349821],
  "Pantai Batu Hitam": [3.89, 103.37],
  "UMPSA Gambang": [3.7215527630536913, 103.12389109264338],
  "Bandar Gambang": [3.7061512771021405, 103.09869270361182],
};

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
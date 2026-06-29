"use client";

import { useEffect, useMemo } from "react";
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

const KUANTAN_CENTER: [number, number] = [3.808, 103.325];

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

function MiniMapFitter({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  useEffect(() => {
    if (coordinates.length === 0) {
      map.setView(KUANTAN_CENTER, 11, { animate: true, duration: 0.6 });
      return;
    }
    if (coordinates.length === 1) {
      map.flyTo(coordinates[0], 13, {
        animate: true,
        duration: 0.8,
        easeLinearity: 0.25,
      });
      return;
    }
    const bounds = L.latLngBounds(coordinates);
    map.flyToBounds(bounds, {
      padding: [50, 50],
      animate: true,
      duration: 0.8,
      easeLinearity: 0.25,
    });
  }, [coordinates, map]);

  return null;
}

interface VisitMiniMapProps {
  photos: Photo[];
  activeRouteFilter: RouteCategory | null;
}

export default function VisitMiniMap({
  photos,
  activeRouteFilter,
}: VisitMiniMapProps) {
  const filteredPhotos = useMemo(() => {
    if (!activeRouteFilter) return photos;
    return photos.filter(
      (photo) => locationRouteMap[photo.location] === activeRouteFilter
    );
  }, [photos, activeRouteFilter]);

  const coordinates = useMemo<[number, number][]>(() => {
    return filteredPhotos
      .map((photo): [number, number] | null => {
        if (photo.latitude != null && photo.longitude != null) {
          return [photo.latitude, photo.longitude];
        }
        if (locationCoords[photo.location]) {
          return locationCoords[photo.location];
        }
        return null;
      })
      .filter((c): c is [number, number] => c !== null);
  }, [filteredPhotos]);

  const pinIsActive = activeRouteFilter !== null;

  return (
    <div className="w-full h-full">
      <MapContainer
        center={KUANTAN_CENTER}
        zoom={11}
        className="w-full h-full"
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        />
        <MiniMapFitter coordinates={coordinates} />
        {filteredPhotos.map((photo) => {
          let pinCoords: [number, number] | null = null;
          if (photo.latitude != null && photo.longitude != null) {
            pinCoords = [photo.latitude, photo.longitude];
          } else if (locationCoords[photo.location]) {
            pinCoords = locationCoords[photo.location];
          }
          if (!pinCoords) return null;
          return (
            <Marker
              key={photo.id}
              position={pinCoords}
              icon={createCustomMarker(pinIsActive)}
              eventHandlers={{
                click: () => {
                  const [lat, lng] = pinCoords as [number, number];
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

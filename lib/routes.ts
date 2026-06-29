export type RouteCategory = "Coastline" | "Highlands" | "Heritage";

export const locationRouteMap: Record<string, RouteCategory> = {
  "Pantai Sepat": "Coastline",
  "Teluk Cempedak": "Coastline",
  "Pantai Berserah": "Coastline",
  "Pantai Balok": "Coastline",
  "Pantai Batu Hitam": "Coastline",
  "Pesisir Sungai Ular": "Coastline",
  "Bukit Pelindung": "Highlands",
  "Bukit Panorama": "Highlands",
  "Air Terjun Pelangi": "Highlands",
  "Air Terjun Panching": "Highlands",
  "Bandar Sungai Lembing": "Highlands",
  "Bandar Kuantan": "Heritage",
  "Tanjung Lumpur": "Heritage",
  "Sungai Kuantan": "Heritage",
  "Masjid Sultan Ahmad Shah": "Heritage",
  "UMPSA Gambang": "Heritage",
  "Bandar Gambang": "Heritage",
};

export interface RouteItineraryPoint {
  time: string;
  detail: string;
}

export interface RouteTrack {
  id: RouteCategory;
  title: string;
  description: string;
  itinerary: RouteItineraryPoint[];
}

export const ROUTE_TRACKS: RouteTrack[] = [
  {
    id: "Coastline",
    title: "The Coastline Escape",
    description:
      "A sun-drenched journey tracing the turquoise tides and sand transitions of Pahang.",
    itinerary: [
      { time: "07:30 AM", detail: "Pantai Sepat peaceful morning walk" },
      { time: "12:30 PM", detail: "Seafood lunch stopover at Pantai Berserah" },
      {
        time: "05:30 PM",
        detail: "Sunset views and dynamic coastline tracking at Teluk Cempedak",
      },
    ],
  },
  {
    id: "Highlands",
    title: "The Historic Mist",
    description:
      "An elevated excursion through the emerald mountain peaks and morning fog layers.",
    itinerary: [
      { time: "05:45 AM", detail: "Catch the mountain fog sea sunrise at Bukit Panorama" },
      {
        time: "08:30 AM",
        detail: "Local breakfast and mining heritage walk inside Bandar Sungai Lembing",
      },
      { time: "10:30 AM", detail: "Trek out to capture the pristine cascades at Air Terjun Pelangi" },
    ],
  },
  {
    id: "Heritage",
    title: "The Town Heritage",
    description:
      "A deep dive into the historical heart, landmark architecture, and culinary hubs.",
    itinerary: [
      { time: "09:00 AM", detail: "Explore historical roots and city infrastructure across Bandar Kuantan" },
      { time: "11:00 AM", detail: "Architectural study of the majestic Masjid Sultan Ahmad Shah" },
      { time: "02:00 PM", detail: "Traditional charcoal-grilled dining stops at Tanjung Lumpur" },
    ],
  },
];
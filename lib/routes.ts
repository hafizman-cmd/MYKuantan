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

export const locationCoords: Record<string, [number, number]> = {
  "Bandar Kuantan": [3.808, 103.325],
  "Bukit Panorama": [3.915889608189525, 103.03655704954012],
  "Pantai Berserah": [3.8614, 103.3674],
  "Pantai Sepat": [3.7388, 103.3323],
  "Teluk Cempedak": [3.8114, 103.3725],
  "Sungai Kuantan": [3.8016, 103.3275],
  "Tanjung Lumpur": [3.807015563173489, 103.3404958696269],
  "Air Terjun Pelangi": [3.922173525732795, 102.94733952401076],
  "Bandar Sungai Lembing": [3.9148912029592844, 103.0326275272876],
  "Pantai Balok": [3.9206831895577343, 103.36987703363683],
  "Masjid Sultan Ahmad Shah": [3.8078, 103.3262],
  "Pesisir Sungai Ular": [4.048433018193487, 103.39626490192093],
  "Air Terjun Panching": [3.791, 103.145],
  "Bukit Pelindung": [3.8254210748616564, 103.35797912349821],
  "Pantai Batu Hitam": [3.89, 103.37],
  "UMPSA Gambang": [3.7215527630536913, 103.12389109264338],
  "Bandar Gambang": [3.7061512771021405, 103.09869270361182],
  "Air Terjun Berkelah": [3.713992687425194, 102.97971084588619],
  "Menara Kuantan 188": [3.804230922728427, 103.32749614292663],
  "Sungai Cherating": [4.130924564885717, 103.37750583565749],
  "Taman Bandar Kuantan": [3.838639664419374, 103.29665568603603],
  "Taman Gelora": [3.809137374774888, 103.34920197150475],
  "Zoo Mini Teruntum": [3.809333279914874, 103.36570464265381],
  "Natural Batik Village": [3.9232462774622388, 103.36670370064806],
  "Muzium Sungai Lembing": [3.9140399724660857, 103.03226555833075],
  "Pantai Cherating": [4.125718781360976, 103.39369981864908],
  "Petrosains Kuantan": [3.796567682578261, 103.32078300041634],
  "East Coast Mall": [3.8183380030710774, 103.32630905835704],
  "Pantai Pelindung": [3.837425173805904, 103.37526302930134],
  "Gua Charas": [3.9100652619518224, 103.14701640046665],
  "Kuantan City Mall": [3.8179138082944855, 103.32804680062372],
  "Santuari Penyu": [4.145027012011781, 103.40836967408727],
  "Muzium Seni Pahang": [3.807398080298974, 103.32601037152855],
  "Esplanade Kuantan": [3.8038392653416535, 103.32732022919114],
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
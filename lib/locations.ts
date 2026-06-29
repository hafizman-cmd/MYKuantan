export interface KuantanLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export const KUANTAN_LOCATIONS: KuantanLocation[] = [
  { name: "Bandar Kuantan", latitude: 3.808, longitude: 103.325 },
  { name: "Bukit Panorama", latitude: 3.915889608189525, longitude: 103.03655704954012 },
  { name: "Pantai Berserah", latitude: 3.8614, longitude: 103.3674 },
  { name: "Pantai Sepat", latitude: 3.7388, longitude: 103.3323 },
  { name: "Teluk Cempedak", latitude: 3.8114, longitude: 103.3725 },
  { name: "Sungai Kuantan", latitude: 3.8016, longitude: 103.3275 },
  { name: "Tanjung Lumpur", latitude: 3.807015563173489, longitude: 103.3404958696269 },
  { name: "Air Terjun Pelangi", latitude: 3.922173525732795, longitude: 102.94733952401076 },
  { name: "Bandar Sungai Lembing", latitude: 3.9148912029592844, longitude: 103.0326275272876 },
  { name: "Pantai Balok", latitude: 3.9317, longitude: 103.3742 },
  { name: "Masjid Sultan Ahmad Shah", latitude: 3.8078, longitude: 103.3262 },
  { name: "Pesisir Sungai Ular", latitude: 4.048433018193487, longitude: 103.39626490192093 },
  { name: "Air Terjun Panching", latitude: 3.791, longitude: 103.145 },
  { name: "Bukit Pelindung", latitude: 3.8254210748616564, longitude: 103.35797912349821 },
  { name: "Pantai Batu Hitam", latitude: 3.89, longitude: 103.37 },
  { name: "UMPSA Gambang", latitude: 3.7215527630536913, longitude: 103.12389109264338 },
  { name: "Bandar Gambang", latitude: 3.7061512771021405, longitude: 103.09869270361182 },
];

export const KUANTAN_CENTER: [number, number] = [3.8078, 103.3262];

export function getCoordinatesByName(name: string): [number, number] | null {
  const match = KUANTAN_LOCATIONS.find((l) => l.name === name);
  if (!match) return null;
  return [match.latitude, match.longitude];
}

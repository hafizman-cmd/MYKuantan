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
  { name: "Pantai Balok", latitude: 3.9206831895577343, longitude: 103.36987703363683 },
  { name: "Masjid Sultan Ahmad Shah", latitude: 3.8078, longitude: 103.3262 },
  { name: "Pesisir Sungai Ular", latitude: 4.048433018193487, longitude: 103.39626490192093 },
  { name: "Air Terjun Panching", latitude: 3.791, longitude: 103.145 },
  { name: "Bukit Pelindung", latitude: 3.8254210748616564, longitude: 103.35797912349821 },
  { name: "Pantai Batu Hitam", latitude: 3.89, longitude: 103.37 },
  { name: "UMPSA Gambang", latitude: 3.7215527630536913, longitude: 103.12389109264338 },
  { name: "Bandar Gambang", latitude: 3.7061512771021405, longitude: 103.09869270361182 },
  { name: "Air Terjun Berkelah", latitude: 3.713992687425194, longitude: 102.97971084588619 },
  { name: "Menara Kuantan 188", latitude: 3.804230922728427, longitude: 103.32749614292663 },
  { name: "Sungai Cherating", latitude: 4.130924564885717, longitude: 103.37750583565749 },
  { name: "Taman Bandar Kuantan", latitude: 3.838639664419374, longitude: 103.29665568603603 },
  { name: "Taman Gelora", latitude: 3.809137374774888, longitude: 103.34920197150475 },
  { name: "Zoo Mini Teruntum", latitude: 3.809333279914874, longitude: 103.36570464265381 },
  { name: "Natural Batik Village", latitude: 3.9232462774622388, longitude: 103.36670370064806 },
  { name: "Muzium Sungai Lembing", latitude: 3.9140399724660857, longitude: 103.03226555833075 },
  { name: "Pantai Cherating", latitude: 4.125718781360976, longitude: 103.39369981864908 },
  { name: "Petrosains Kuantan", latitude: 3.796567682578261, longitude: 103.32078300041634 },
  { name: "East Coast Mall", latitude: 3.8183380030710774, longitude: 103.32630905835704 },
  { name: "Pantai Pelindung", latitude: 3.837425173805904, longitude: 103.37526302930134 },
  { name: "Gua Charas", latitude: 3.9100652619518224, longitude: 103.14701640046665 },
  { name: "Kuantan City Mall", latitude: 3.8179138082944855, longitude: 103.32804680062372 },
  { name: "Santuari Penyu", latitude: 4.145027012011781, longitude: 103.40836967408727 },
  { name: "Muzium Seni Pahang", latitude: 3.807398080298974, longitude: 103.32601037152855 },
  { name: "Esplanade Kuantan", latitude: 3.8038392653416535, longitude: 103.32732022919114 },
];

export const KUANTAN_CENTER: [number, number] = [3.8078, 103.3262];

export function getCoordinatesByName(name: string): [number, number] | null {
  const match = KUANTAN_LOCATIONS.find((l) => l.name === name);
  if (!match) return null;
  return [match.latitude, match.longitude];
}

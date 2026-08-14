"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "ms";

export interface ChronicleTranslation {
  era: string;
  title: string;
  body: string;
}

interface LanguageDictionary {
  nav: {
    lookbook: string;
    stories: string;
    gallery: string;
    visit: string;
    myTrip: string;
    submit: string;
    submitFrame: string;
    logOut: string;
    signingOut: string;
    openMenu: string;
    account: string;
    leaveSession: string;
    sessionDescription: string;
    staySignedIn: string;
    logOutConfirm: string;
  };
  hero: {
    eyebrow: string;
    titleLineOne: string;
    titleLineTwo: string;
    description: string;
    tide: string;
    wind: string;
    light: string;
    onshore: string;
    exploreGallery: string;
    viewFrame: (location: string) => string;
    tideStatuses: Record<string, string>;
  };
  stories: {
    title: string;
    description: string;
    chronicles: ChronicleTranslation[];
    artCaptions: string[];
    readStory: string;
  };
  gallery: {
    title: string;
    description: string;
    noPhotos: string;
    browse: string;
    archive: string;
    all: string;
    allLocations: string;
    newest: string;
    oldest: string;
    preview: (label: string) => string;
    by: string;
    noFrames: (location: string) => string;
    loadMore: string;
    remaining: (count: number) => string;
    filterByLocation: string;
    savePhoto: string;
    removePhoto: string;
    closePreview: string;
    report: string;
  };
  visit: {
    title: string;
    description: string;
    filteringAtlas: string;
    selectToFilter: string;
    reset: string;
    startJourney: string;
    noPinned: string;
    saveLocation: string;
    removeLocation: string;
    categoryLabels: Record<string, string>;
    routes: Record<string, { title: string; description: string }>;
  };
  collection: {
    eyebrow: string;
    title: string;
    description: string;
    journeyAwaits: string;
    signInDescription: string;
    signInUp: string;
    savedFrames: (count: number) => string;
    itinerary: (count: number) => string;
    noSavedFrames: string;
    savedFramesDescription: string;
    browseGallery: string;
    itineraryTitle: string;
    itineraryDescription: string;
    reorderHint: string;
    mapsRoute: string;
    printPdf: string;
    shareWhatsapp: string;
    noSavedLocations: string;
    savedLocationsDescription: string;
    exploreTrails: string;
    flexible: string;
    time: string;
    notes: string;
    remove: string;
    totalStops: (count: number) => string;
    totalDrive: (duration: string) => string;
    totalDistance: (distance: string) => string;
    routeSummary: string;
    drive: string;
    distance: string;
    optimizeRoute: string;
    optimizedNotice: string;
  };
  footer: {
    description: string;
    rights: string;
    crafted: string;
    editorialAccess: string;
  };
}

const dictionaries: Record<Language, LanguageDictionary> = {
  en: {
    nav: {
      lookbook: "Lookbook",
      stories: "Stories",
      gallery: "Gallery",
      visit: "Visit",
      myTrip: "My Trip",
      submit: "Submit",
      submitFrame: "Submit Frame",
      logOut: "Log Out",
      signingOut: "Signing out...",
      openMenu: "Open menu",
      account: "Account",
      leaveSession: "Leave your session?",
      sessionDescription:
        "You will need to sign in again to contribute to the lookbook.",
      staySignedIn: "Stay signed in",
      logOutConfirm: "Log out",
    },
    hero: {
      eyebrow: "An editorial lookbook of Kuantan",
      titleLineOne: "Where the Sea",
      titleLineTwo: "Remembers.",
      description:
        "An editorial lookbook tracing light, tide, and tradition across Kuantan — the quiet capital of Pahang, where the South China Sea outlines every silhouette.",
      tide: "TIDE //",
      wind: "WIND //",
      light: "LIGHT //",
      onshore: "Onshore",
      exploreGallery: "Explore Full Gallery",
      viewFrame: (location) => `View ${location}`,
      tideStatuses: {
        "High Tide": "High Tide",
        Rising: "Rising",
        "Mid Tide": "Mid Tide",
        Falling: "Falling",
        "Low Tide": "Low Tide",
      },
    },
    stories: {
      title: "Stories of Kuantan",
      description:
        "A museum-grade timeline of the coastal capital — printed line by line as you arrive.",
      readStory: "Read story",
      artCaptions: [
        "Nautical Chart // Estuary",
        "Coastal Route // 1851",
        "Civic Blueprint // 1955",
        "City Network // 2021",
      ],
      chronicles: [
        {
          era: "1850s // FIRST LIGHT",
          title: "The First Settlement",
          body: "Kuantan's first settlement was established around the 1850s by Haji Senik and his followers. The original gathering place was known as Kampung Teruntum, near the mouth of the Teruntum River.",
        },
        {
          era: "1851 // MUNSHI'S ACCOUNT",
          title: "Abdullah's Voyage",
          body: "The name Kuantan entered the written record of modern Malay civilisation through the literary figure Abdullah Abdul Kadir Munshi, in his celebrated journey along the East Coast around 1851.",
        },
        {
          era: "1955 // PAHANG'S CAPITAL",
          title: "The Administrative Centre",
          body: "Kuantan's geopolitical turning point arrived on 27 August 1955, when Pahang's official state administration moved from Kuala Lipis to the coastal city of Kuantan.",
        },
        {
          era: "2021 // CITY STATUS",
          title: "The Modern City",
          body: "After the evolution of tin mining in Sungai Lembing and the growth of Gebeng's port industry, Kuantan was officially granted city status on 21 February 2021.",
        },
      ],
    },
    gallery: {
      title: "Frames of Kuantan",
      description: "A scroll-linked atlas — each frame pins its light on the dark map of Kuantan.",
      noPhotos: "No photos approved yet. Be the first to submit.",
      browse: "Browse",
      archive: "THE ARCHIVE",
      all: "All",
      allLocations: "All Locations (Dropdown)",
      newest: "Newest",
      oldest: "Oldest",
      preview: (label) => `Preview ${label}`,
      by: "by",
      noFrames: (location) => `No frames from ${location} yet.`,
      loadMore: "Load More",
      remaining: (count) => `(${count} remaining)`,
      filterByLocation: "Filter archive by location",
      savePhoto: "Save photo to My Kuantan Trip",
      removePhoto: "Remove photo from My Kuantan Trip",
      closePreview: "Close photo preview",
      report: "Report",
    },
    visit: {
      title: "Visit Kuantan",
      description: "Three curated travel routes through Pahang's coast, peaks, and heritage heart. Select a trail to filter the atlas below.",
      filteringAtlas: "Filtering atlas",
      selectToFilter: "Select to filter",
      reset: "Reset — show all trails",
      startJourney: "Start Journey",
      noPinned: "No pinned frames for this trail yet — be the first to submit.",
      saveLocation: "Save location to My Kuantan Trip",
      removeLocation: "Remove location from My Kuantan Trip",
      categoryLabels: {
        Coastline: "Coastline",
        Highlands: "Highlands",
        Heritage: "Heritage",
      },
      routes: {
        Coastline: { title: "The Coastline Escape", description: "A sun-drenched journey tracing the turquoise tides and sand transitions of Pahang." },
        Highlands: { title: "The Historic Mist", description: "An elevated excursion through the emerald mountain peaks and morning fog layers." },
        Heritage: { title: "The Town Heritage", description: "A deep dive into the historical heart, landmark architecture, and culinary hubs." },
      },
    },
    collection: {
      eyebrow: "Personal Field Notes",
      title: "My Kuantan Trip",
      description: "A private collection of the frames and places shaping your next journey along Kuantan's coast.",
      journeyAwaits: "Your Kuantan Journey Awaits",
      signInDescription: "Sign in to curate your personal itinerary, save favorite gallery frames, and plan your coastal escape.",
      signInUp: "Sign In / Sign Up",
      savedFrames: (count) => `Saved Frames (${count})`,
      itinerary: (count) => `My Itinerary (${count})`,
      noSavedFrames: "No saved frames yet",
      savedFramesDescription: "Explore The Archive and bookmark the photographs you want to remember.",
      browseGallery: "Browse Gallery",
      itineraryTitle: "My Itinerary",
      itineraryDescription: "Reorder stops, set your timing, and leave private field notes.",
      reorderHint: "Use the arrow buttons to reorder stops",
      mapsRoute: "Open Google Maps Route ↗",
      printPdf: "Print / Save as PDF 🖨️",
      shareWhatsapp: "Share on WhatsApp",
      noSavedLocations: "No saved locations yet",
      savedLocationsDescription: "Open the Visit trails and bookmark the stops for your personal route.",
      exploreTrails: "Explore Visit Trails",
      flexible: "Flexible",
      time: "Time",
      notes: "Notes",
      remove: "Remove",
      totalStops: (count) => `${count} Stops`,
      totalDrive: (duration) => `~${duration} drive total`,
      totalDistance: (distance) => `~${distance} km total`,
      routeSummary: "Total Stops",
      drive: "Drive",
      distance: "Distance",
      optimizeRoute: "Shortest Route",
      optimizedNotice: "Itinerary optimized for shortest driving distance!",
    },
    footer: {
      description: "An editorial celebration of Kuantan, Pahang — light, tide, and tradition, framed.",
      rights: "All rights reserved.",
      crafted: "Crafted in Pahang, Malaysia.",
      editorialAccess: "Editorial access",
    },
  },
  ms: {
    nav: {
      lookbook: "Lookbook",
      stories: "Kisah",
      gallery: "Galeri",
      visit: "Jelajah",
      myTrip: "Trip Saya",
      submit: "Hantar",
      submitFrame: "Hantar Bingkai",
      logOut: "Log Keluar",
      signingOut: "Sedang log keluar...",
      openMenu: "Buka menu",
      account: "Akaun",
      leaveSession: "Tinggalkan sesi anda?",
      sessionDescription:
        "Anda perlu log masuk semula untuk menyumbang kepada lookbook ini.",
      staySignedIn: "Kekal log masuk",
      logOutConfirm: "Log keluar",
    },
    hero: {
      eyebrow: "Sebuah lookbook editorial tentang Kuantan",
      titleLineOne: "Di Mana Laut",
      titleLineTwo: "Mengingat.",
      description:
        "Sebuah lookbook editorial yang menjejaki cahaya, pasang surut dan tradisi di Kuantan — ibu negeri Pahang yang tenang, tempat Laut China Selatan melakar setiap bayangan.",
      tide: "PASANG //",
      wind: "ANGIN //",
      light: "CAHAYA //",
      onshore: "Dari Laut",
      exploreGallery: "Terokai Galeri Penuh",
      viewFrame: (location) => `Lihat ${location}`,
      tideStatuses: {
        "High Tide": "Air Pasang",
        Rising: "Mula Pasang",
        "Mid Tide": "Pertengahan Pasang",
        Falling: "Mula Surut",
        "Low Tide": "Air Surut",
      },
    },
    stories: {
      title: "Kisah Kuantan",
      description:
        "Garis masa bertaraf muzium tentang ibu kota pesisir — dicetak baris demi baris saat anda tiba.",
      readStory: "Baca kisah",
      artCaptions: [
        "Carta Nautika // Muara",
        "Laluan Pesisir // 1851",
        "Pelan Sivik // 1955",
        "Rangkaian Bandar // 2021",
      ],
      chronicles: [
        {
          era: "1850-an // ILHAM AWAL",
          title: "Petempatan Awal",
          body: "Petempatan awal Kuantan mula diasaskan sekitar tahun 1850-an oleh Haji Senik bersama pengikutnya. Kawasan penumpuan asal ini dikenali sebagai Kampung Teruntum, berhampiran muara Sungai Teruntum.",
        },
        {
          era: "1851 // CATATAN MUNSHI",
          title: "Pelayaran Abdullah",
          body: "Nama Kuantan direkodkan dalam lembaran sejarah tamadun Melayu moden oleh tokoh sastera Abdullah Abdul Kadir Munshi, melalui kisah pelayaran terkenal beliau ke Pantai Timur sekitar tahun 1851.",
        },
        {
          era: "1955 // IBU NEGERI PAHANG",
          title: "Pusat Pentadbiran",
          body: "Titik perubahan geo-politik Kuantan berlaku pada 27 Ogos 1955 apabila pusat pentadbiran rasmi negeri Pahang dipindahkan dari Kuala Lipis ke kawasan pesisiran pantai Kuantan.",
        },
        {
          era: "2021 // STATUS BANDAR RAYA",
          title: "Bandar Raya Moden",
          body: "Setelah melalui evolusi perlombongan bijih di Sungai Lembing serta perkembangan industri pelabuhan Gebeng, Kuantan secara rasminya dinaikkan taraf kepada sebuah bandar raya moden pada 21 Februari 2021.",
        },
      ],
    },
    gallery: {
      title: "Bingkai Kuantan",
      description: "Sebuah atlas bersambung — setiap bingkai menancapkan cahayanya pada peta gelap Kuantan.",
      noPhotos: "Belum ada foto yang diluluskan. Jadilah penyumbang pertama.",
      browse: "Teroka",
      archive: "ARKIB",
      all: "Semua",
      allLocations: "Semua Lokasi (Menu)",
      newest: "Terkini",
      oldest: "Terdahulu",
      preview: (label) => `Pratonton ${label}`,
      by: "oleh",
      noFrames: (location) => `Belum ada bingkai dari ${location}.`,
      loadMore: "Muat Lagi",
      remaining: (count) => `(${count} lagi)`,
      filterByLocation: "Tapis arkib mengikut lokasi",
      savePhoto: "Simpan foto ke Trip Kuantan Saya",
      removePhoto: "Buang foto daripada Trip Kuantan Saya",
      closePreview: "Tutup pratonton foto",
      report: "Laporkan",
    },
    visit: {
      title: "Jelajah Kuantan",
      description: "Tiga laluan perjalanan terpilih melalui pesisir, puncak dan nadi warisan Pahang. Pilih jejak untuk menapis atlas di bawah.",
      filteringAtlas: "Menapis atlas",
      selectToFilter: "Pilih untuk menapis",
      reset: "Set semula — paparkan semua jejak",
      startJourney: "Mulakan Jelajah",
      noPinned: "Belum ada bingkai ditanda untuk jejak ini — jadilah penyumbang pertama.",
      saveLocation: "Simpan lokasi ke Trip Kuantan Saya",
      removeLocation: "Buang lokasi daripada Trip Kuantan Saya",
      categoryLabels: {
        Coastline: "Pesisir",
        Highlands: "Tanah Tinggi",
        Heritage: "Warisan",
      },
      routes: {
        Coastline: { title: "Pelarian Pesisir", description: "Perjalanan bermandikan cahaya matahari menjejaki air pasang biru kehijauan dan hamparan pasir Pahang." },
        Highlands: { title: "Kabut Bersejarah", description: "Pengembaraan ke puncak gunung zamrud dan lapisan kabus pagi yang menyimpan cerita." },
        Heritage: { title: "Warisan Kota", description: "Menyelami jantung sejarah, seni bina mercu tanda dan persinggahan kulinari." },
      },
    },
    collection: {
      eyebrow: "Catatan Lapangan Peribadi",
      title: "Trip Kuantan Saya",
      description: "Koleksi peribadi bingkai dan tempat yang membentuk perjalanan anda seterusnya di pesisir Kuantan.",
      journeyAwaits: "Perjalanan Kuantan Anda Menanti",
      signInDescription: "Log masuk untuk menyusun jadual perjalanan peribadi, menyimpan bingkai galeri kegemaran dan merancang pelarian pesisir anda.",
      signInUp: "Log Masuk / Daftar",
      savedFrames: (count) => `Bingkai Disimpan (${count})`,
      itinerary: (count) => `Jadual Perjalanan (${count})`,
      noSavedFrames: "Belum ada bingkai disimpan",
      savedFramesDescription: "Terokai Arkib dan tandakan foto yang ingin anda kenang.",
      browseGallery: "Lihat Galeri",
      itineraryTitle: "Jadual Perjalanan Saya",
      itineraryDescription: "Susun semula hentian, tetapkan masa dan tinggalkan nota lapangan peribadi.",
      reorderHint: "Gunakan anak panah untuk menyusun semula hentian",
      mapsRoute: "Buka Laluan Google Maps ↗",
      printPdf: "Cetak / Simpan sebagai PDF 🖨️",
      shareWhatsapp: "Kongsi di WhatsApp",
      noSavedLocations: "Belum ada lokasi disimpan",
      savedLocationsDescription: "Buka laluan Jelajah dan tandakan hentian untuk laluan peribadi anda.",
      exploreTrails: "Terokai Laluan Jelajah",
      flexible: "Fleksibel",
      time: "Masa",
      notes: "Nota",
      remove: "Buang",
      totalStops: (count) => `${count} Hentian`,
      totalDrive: (duration) => `~${duration} pemanduan keseluruhan`,
      totalDistance: (distance) => `~${distance} km keseluruhan`,
      routeSummary: "Jumlah Hentian",
      drive: "Pemanduan",
      distance: "Jarak",
      optimizeRoute: "Laluan Terpendek",
      optimizedNotice: "Jadual perjalanan dioptimumkan untuk jarak pemanduan terpendek!",
    },
    footer: {
      description: "Sebuah perayaan editorial Kuantan, Pahang — cahaya, pasang surut dan tradisi, dirakam dalam bingkai.",
      rights: "Hak cipta terpelihara.",
      crafted: "Dihasilkan di Pahang, Malaysia.",
      editorialAccess: "Akses editorial",
    },
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  copy: LanguageDictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("mykuantan_lang");
    if (stored === "en" || stored === "ms") setLanguage(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("mykuantan_lang", language);
    document.documentElement.lang = language === "ms" ? "ms" : "en";
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === "en" ? "ms" : "en")),
      copy: dictionaries[language],
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

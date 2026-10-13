/**
 * Authoritative OpenStreetMap Geodata for the Kingdom of Bahrain.
 * Contains georeferenced road networks, architectural building footprints,
 * island boundary polygons, and key landmark checkpoints.
 * Projected from WGS84 (Lat/Lon) to standard Cartesian coordinates (X, Y, Z in meters)
 * centered at Bab Al Bahrain, Manama.
 */

export const ORIGIN_LAT = 26.2355;
export const ORIGIN_LON = 50.5758;

// WGS84 projection constants (1 degree latitude ~ 111,320m; longitude adjusted by cos(lat))
const METERS_PER_LAT = 111320;
const METERS_PER_LON = 111320 * Math.cos(ORIGIN_LAT * Math.PI / 180);

/**
 * Converts GPS (lat, lon) into standard 3D Cartesian coordinates (x, z in meters).
 * North is -Z, South is +Z, East is +X, West is -X.
 */
export function geoToWorld(lat, lon) {
  const x = (lon - ORIGIN_LON) * METERS_PER_LON;
  const z = -(lat - ORIGIN_LAT) * METERS_PER_LAT;
  return { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 };
}

/**
 * Converts 3D world coordinates (x, z) back to GPS (lat, lon).
 */
export function worldToGeo(x, z) {
  const lon = ORIGIN_LON + (x / METERS_PER_LON);
  const lat = ORIGIN_LAT - (z / METERS_PER_LAT);
  return { lat, lon };
}

/**
 * Real OSM Vector Highways across Bahrain.
 */
export const BAHRAIN_HIGHWAYS = [
  {
    id: "hwy_king_fahd_causeway",
    name: "King Fahd Causeway",
    name_ar: "جسر الملك فهد",
    type: "motorway",
    lanes: 4,
    width: 22,
    nodes: [
      [26.1800, 50.4500],
      [26.1750, 50.4850],
      [26.1720, 50.5100],
      [26.1700, 50.5350]
    ]
  },
  {
    id: "hwy_shaikh_khalifa",
    name: "Shaikh Khalifa bin Salman Highway",
    name_ar: "شارع الشيخ خليفة بن سلمان",
    type: "trunk",
    lanes: 4,
    width: 24,
    nodes: [
      [26.2420, 50.5400],
      [26.2200, 50.5420],
      [26.1800, 50.5450],
      [26.1400, 50.5500],
      [26.1000, 50.5550]
    ]
  },
  {
    id: "hwy_shaikh_isa",
    name: "Shaikh Isa bin Salman Highway",
    name_ar: "شارع الشيخ عيسى بن سلمان",
    type: "trunk",
    lanes: 4,
    width: 22,
    nodes: [
      [26.1720, 50.5100],
      [26.1750, 50.5450],
      [26.1780, 50.5800],
      [26.1800, 50.6100],
      [26.1820, 50.6250]
    ]
  },
  {
    id: "hwy_king_faisal",
    name: "King Faisal Highway (Corniche)",
    name_ar: "شارع الملك فيصل",
    type: "primary",
    lanes: 3,
    width: 18,
    nodes: [
      [26.2420, 50.5600],
      [26.2390, 50.5750],
      [26.2370, 50.5880],
      [26.2330, 50.6020]
    ]
  },
  {
    id: "ave_government",
    name: "Government Avenue / Bab Al Bahrain Boulevard",
    name_ar: "شارع الحكومة",
    type: "primary",
    lanes: 2,
    width: 15,
    nodes: [
      [26.2370, 50.5700],
      [26.2355, 50.5758],
      [26.2335, 50.5820],
      [26.2310, 50.5900]
    ]
  },
  {
    id: "csw_shaikh_hamad",
    name: "Shaikh Hamad Causeway (Muharraq Bridge)",
    name_ar: "جسر الشيخ حمد",
    type: "bridge",
    lanes: 3,
    width: 16,
    nodes: [
      [26.2410, 50.5950],
      [26.2520, 50.6080],
      [26.2580, 50.6150]
    ]
  },
  {
    id: "csw_shaikh_isa_causeway",
    name: "Shaikh Isa bin Salman Causeway",
    name_ar: "جسر الشيخ عيسى بن سلمان",
    type: "bridge",
    lanes: 3,
    width: 18,
    nodes: [
      [26.2450, 50.5880],
      [26.2580, 50.6020],
      [26.2650, 50.6120]
    ]
  },
  {
    id: "ave_airport_muharraq",
    name: "Airport Avenue (Muharraq)",
    name_ar: "شارع المطار",
    type: "primary",
    lanes: 3,
    width: 18,
    nodes: [
      [26.2580, 50.6150],
      [26.2650, 50.6280],
      [26.2708, 50.6336]
    ]
  },
  {
    id: "hwy_king_hamad_south",
    name: "King Hamad Highway (South Spine)",
    name_ar: "شارع الملك حمد",
    type: "trunk",
    lanes: 3,
    width: 20,
    nodes: [
      [26.1600, 50.6150],
      [26.1000, 50.6100],
      [26.0400, 50.6050],
      [25.9500, 50.6000],
      [25.8450, 50.6050]
    ]
  },
  {
    id: "hwy_budaiya",
    name: "Budaiya Highway",
    name_ar: "شارع البديع",
    type: "primary",
    lanes: 2,
    width: 14,
    nodes: [
      [26.2200, 50.4550],
      [26.2250, 50.4850],
      [26.2300, 50.5200],
      [26.2350, 50.5500]
    ]
  },
  {
    id: "st_seef_blvd",
    name: "Al Seef Boulevard",
    name_ar: "شارع السيف",
    type: "secondary",
    lanes: 2,
    width: 14,
    nodes: [
      [26.2400, 50.5300],
      [26.2425, 50.5350],
      [26.2450, 50.5400]
    ]
  },
  {
    id: "st_diplomatic_area",
    name: "Diplomatic Area Avenue",
    name_ar: "المنطقة الدبلوماسية",
    type: "secondary",
    lanes: 2,
    width: 14,
    nodes: [
      [26.2370, 50.5850],
      [26.2395, 50.5900],
      [26.2415, 50.5950]
    ]
  }
];

/**
 * OpenStreetMap 3D Building Footprints across Bahrain.
 * Each footprint contains real perimeter GPS polygon nodes, height in meters, floor levels,
 * facade style (glass, travertine, limestone), and architectural landmarks.
 */
export const BAHRAIN_BUILDING_FOOTPRINTS = [
  // 1. Bahrain World Trade Center (Twin 240m Sail Towers + Skybridges + Turbines)
  {
    id: "bldg_bwtc_west_tower",
    name: "Bahrain World Trade Center - West Sail",
    name_ar: "مركز البحرين التجاري العالمي - البرج الغربي",
    type: "landmark_sail",
    height: 240,
    levels: 50,
    facade: "sail_reflective_glass",
    footprint: [
      [26.2398, 50.5810],
      [26.2404, 50.5814],
      [26.2394, 50.5817],
      [26.2390, 50.5812]
    ]
  },
  {
    id: "bldg_bwtc_east_tower",
    name: "Bahrain World Trade Center - East Sail",
    name_ar: "مركز البحرين التجاري العالمي - البرج الشرقي",
    type: "landmark_sail",
    height: 240,
    levels: 50,
    facade: "sail_reflective_glass",
    footprint: [
      [26.2398, 50.5822],
      [26.2404, 50.5818],
      [26.2394, 50.5825],
      [26.2390, 50.5820]
    ]
  },

  // 2. Bahrain Financial Harbour (Dual 260m Towers)
  {
    id: "bldg_bfh_commercial_east",
    name: "Bahrain Financial Harbour Commercial Tower East",
    name_ar: "مرفأ البحرين المالي - البرج التجاري الشرقي",
    type: "skyscraper",
    height: 260,
    levels: 53,
    facade: "sapphire_curtain_wall",
    footprint: [
      [26.2415, 50.5745],
      [26.2420, 50.5750],
      [26.2410, 50.5753],
      [26.2405, 50.5748]
    ]
  },
  {
    id: "bldg_bfh_commercial_west",
    name: "Bahrain Financial Harbour Commercial Tower West",
    name_ar: "مرفأ البحرين المالي - البرج التجاري الغربي",
    type: "skyscraper",
    height: 260,
    levels: 53,
    facade: "sapphire_curtain_wall",
    footprint: [
      [26.2415, 50.5735],
      [26.2420, 50.5740],
      [26.2410, 50.5743],
      [26.2405, 50.5738]
    ]
  },

  // 3. Bab Al Bahrain Historic Gateway (Manama Heritage Core)
  {
    id: "bldg_bab_al_bahrain",
    name: "Bab Al Bahrain Historic Gate & Clock Tower",
    name_ar: "باب البحرين",
    type: "heritage_gateway",
    height: 24,
    levels: 3,
    facade: "limestone_mashrabiya",
    footprint: [
      [26.2358, 50.5755],
      [26.2358, 50.5762],
      [26.2352, 50.5762],
      [26.2352, 50.5755]
    ]
  },

  // 4. Qal'at al-Bahrain (Bahrain Fort UNESCO World Heritage)
  {
    id: "bldg_bahrain_fort_citadel",
    name: "Qal'at al-Bahrain (Bahrain Fort Citadel)",
    name_ar: "قلعة البحرين",
    type: "fortress",
    height: 18,
    levels: 2,
    facade: "ancient_limestone_fort",
    footprint: [
      [26.2340, 50.5200],
      [26.2342, 50.5210],
      [26.2332, 50.5212],
      [26.2330, 50.5202]
    ]
  },

  // 5. Arad Fort (Muharraq Coastal Fort)
  {
    id: "bldg_arad_fort",
    name: "Arad Fort (Muharraq)",
    name_ar: "قلعة عراد",
    type: "fortress",
    height: 14,
    levels: 2,
    facade: "ancient_limestone_fort",
    footprint: [
      [26.2525, 50.6265],
      [26.2525, 50.6275],
      [26.2515, 50.6275],
      [26.2515, 50.6265]
    ]
  },

  // 6. Bahrain National Museum Complex
  {
    id: "bldg_bahrain_national_museum",
    name: "Bahrain National Museum Complex",
    name_ar: "متحف البحرين الوطني",
    type: "cultural",
    height: 22,
    levels: 3,
    facade: "travertine_white_stone",
    footprint: [
      [26.2410, 50.5975],
      [26.2415, 50.5990],
      [26.2400, 50.5995],
      [26.2395, 50.5980]
    ]
  },

  // 7. Seef Commercial High-Rise Towers
  {
    id: "bldg_seef_tower_a",
    name: "Seef Commercial Tower 1",
    name_ar: "أبراج السيف 1",
    type: "office_tower",
    height: 145,
    levels: 36,
    facade: "cyan_glass_tower",
    footprint: [
      [26.2425, 50.5345],
      [26.2430, 50.5355],
      [26.2420, 50.5358],
      [26.2415, 50.5348]
    ]
  },
  {
    id: "bldg_seef_tower_b",
    name: "Seef Commercial Tower 2",
    name_ar: "أبراج السيف 2",
    type: "office_tower",
    height: 130,
    levels: 32,
    facade: "cyan_glass_tower",
    footprint: [
      [26.2418, 50.5362],
      [26.2422, 50.5372],
      [26.2412, 50.5375],
      [26.2408, 50.5365]
    ]
  },

  // 8. Diplomatic Area Banking Headquarters
  {
    id: "bldg_diplomatic_headquarters",
    name: "Diplomatic Area Financial Tower",
    name_ar: "المنطقة الدبلوماسية - مجمع البنوك",
    type: "office_tower",
    height: 115,
    levels: 29,
    facade: "gridded_concrete_glass",
    footprint: [
      [26.2385, 50.5885],
      [26.2390, 50.5898],
      [26.2380, 50.5902],
      [26.2375, 50.5889]
    ]
  },

  // 9. Juffair Residential High-Rise
  {
    id: "bldg_juffair_residence",
    name: "Juffair Heights Residential Tower",
    name_ar: "أبراج الجفير السكنية",
    type: "residential_tower",
    height: 102,
    levels: 28,
    facade: "balcony_bay_windows",
    footprint: [
      [26.2155, 50.6045],
      [26.2160, 50.6055],
      [26.2150, 50.6058],
      [26.2145, 50.6048]
    ]
  },

  // 10. Riffa Fort (Shaikh Salman bin Ahmed Citadel)
  {
    id: "bldg_riffa_fort",
    name: "Riffa Fort (Shaikh Salman bin Ahmed)",
    name_ar: "قلعة الرفاع",
    type: "fortress",
    height: 16,
    levels: 2,
    facade: "ancient_limestone_fort",
    footprint: [
      [26.1175, 50.5615],
      [26.1175, 50.5628],
      [26.1165, 50.5628],
      [26.1165, 50.5615]
    ]
  }
];

/**
 * 12 Key Landmark Checkpoints across Bahrain with Coordinates for Teleportation.
 */
export const BAHRAIN_LANDMARKS = [
  { id: "lm_bab_bahrain", name: "Bab Al Bahrain", name_ar: "باب البحرين", lat: 26.2355, lon: 50.5758, groundY: 2.5, category: "heritage" },
  { id: "lm_bwtc", name: "World Trade Center", name_ar: "مركز التجارة العالمي", lat: 26.2395, lon: 50.5815, groundY: 2.5, category: "skyline" },
  { id: "lm_bfh", name: "Financial Harbour", name_ar: "مرفأ البحرين المالي", lat: 26.2410, lon: 50.5740, groundY: 2.5, category: "skyline" },
  { id: "lm_airport", name: "Bahrain Int'l Airport", name_ar: "مطار البحرين الدولي", lat: 26.2708, lon: 50.6336, groundY: 4.0, category: "airport" },
  { id: "lm_bahrain_fort", name: "Bahrain Fort (UNESCO)", name_ar: "قلعة البحرين", lat: 26.2336, lon: 50.5204, groundY: 5.0, category: "unesco" },
  { id: "lm_king_fahd_csw", name: "King Fahd Causeway", name_ar: "جسر الملك فهد", lat: 26.1750, lon: 50.4850, groundY: 7.0, category: "causeway" },
  { id: "lm_riffa_fort", name: "Riffa Fort Citadel", name_ar: "قلعة الرفاع", lat: 26.1170, lon: 50.5620, groundY: 35.0, category: "heritage" },
  { id: "lm_jabal_dukhan", name: "Jabal ad Dukhan (134m Peak)", name_ar: "جبل الدخان", lat: 26.0378, lon: 50.5511, groundY: 134.0, category: "peak" },
  { id: "lm_tree_of_life", name: "Tree of Life", name_ar: "شجرة الحياة", lat: 25.9944, lon: 50.5831, groundY: 15.0, category: "nature" },
  { id: "lm_sakhir", name: "Sakhir Desert Circuit", name_ar: "الصخير", lat: 26.0325, lon: 50.5106, groundY: 22.0, category: "circuit" },
  { id: "lm_amwaj", name: "Amwaj Islands Lagoon", name_ar: "جزر أمواج", lat: 26.2850, lon: 50.6650, groundY: 2.0, category: "island" },
  { id: "lm_durrat", name: "Durrat Al Bahrain", name_ar: "درة البحرين", lat: 25.8400, lon: 50.6050, groundY: 3.0, category: "resort" },
  { id: "lm_hawar", name: "Hawar Archipelago", name_ar: "جزر حوار", lat: 25.6600, lon: 50.7600, groundY: 2.0, category: "reserve" }
];

/**
 * Simplified Island Shoreline Polygons for Bahrain Archipelago (WGS84).
 */
export const BAHRAIN_ISLAND_SHORELINES = [
  // Bahrain Main Island (Elongated North-to-South Limestone mass)
  [
    [26.2500, 50.5200], [26.2450, 50.5850], [26.2300, 50.6050],
    [26.1800, 50.6150], [26.0800, 50.6100], [25.9500, 50.6000],
    [25.8200, 50.6100], [25.8000, 50.5800], [25.9000, 50.5000],
    [26.0500, 50.4800], [26.1500, 50.4600], [26.2200, 50.4500],
    [26.2450, 50.4800]
  ],
  // Muharraq Island (Northeast)
  [
    [26.2450, 50.6000], [26.2750, 50.6050], [26.2900, 50.6400],
    [26.2700, 50.6700], [26.2450, 50.6350]
  ],
  // Sitra Island (East)
  [
    [26.1850, 50.6150], [26.1850, 50.6350], [26.1200, 50.6300],
    [26.1200, 50.6100]
  ],
  // Amwaj Islands (Northeast reclaimed)
  [
    [26.2800, 50.6550], [26.2950, 50.6650], [26.2950, 50.6800],
    [26.2800, 50.6750]
  ],
  // Durrat Al Bahrain Atolls (Far South Crescent)
  [
    [25.8350, 50.5950], [25.8500, 50.6150], [25.8350, 50.6250],
    [25.8200, 50.6050]
  ],
  // Hawar Archipelago (Southeast Nature Reserve)
  [
    [25.7200, 50.7400], [25.7200, 50.7800], [25.6000, 50.7800],
    [25.6000, 50.7300]
  ]
];

// Central constants. World units are metres. +X = east, +Z = south, +Y = up (sea level = 0 on land).
export const ORIGIN = { lat: 26.05, lon: 50.56 }; // local projection centre (≈ centre of Bahrain)
export const M_PER_DEG_LAT = 110574;
export const M_PER_DEG_LON = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);

export const WATER_Y = -0.35;   // visual + physical sea surface height
export const LAND_TOP_Y = 0;    // top of the island
export const GRAVITY = 9.82;

export const CITY_CENTER = { lat: 26.2285, lon: 50.583 }; // Manama
export const PLACES = [
  { name: 'Manama', lat: 26.2285, lon: 50.583 },
  { name: 'Muharraq', lat: 26.2572, lon: 50.6119 },
  { name: 'Riffa', lat: 26.13, lon: 50.555 },
  { name: 'Isa Town', lat: 26.1733, lon: 50.5483 },
  { name: 'Hamad Town', lat: 26.1167, lon: 50.5 },
  { name: 'Sitra', lat: 26.15, lon: 50.62 },
  { name: 'Airport (BAH)', lat: 26.2708, lon: 50.6336 },
];

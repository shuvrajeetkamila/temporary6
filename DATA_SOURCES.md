# DATA SOURCES & PROVENANCE RECORD
## BAHRAIN: THE ISLAND KINGDOM — Real-Country Geographic & Environmental Foundation

This document provides complete, transparent provenance for all geodata, elevation, coastline, road network, administrative boundaries, and environmental reference datasets used in the creation of the 1:1 true-scale open-world model of the Kingdom of Bahrain.

---

### 1. Mandatory Attributions

- **OpenStreetMap Data**:
  "© OpenStreetMap contributors"
  OpenStreetMap data is licensed under the Open Data Commons Open Database License (ODbL) 1.0.
  Cartography/derived tiles and vector features generated strictly under ODbL terms.
  Attribution is prominently displayed in the game launcher, settings menu, credits screen, in-game vector minimap, and documentation.

- **Authoritative Boundary Data**:
  Kingdom of Bahrain Open Data Portal / Survey and Land Registration Bureau (SLRB) public coordinate framework.
  Boundary cross-referenced with geoBoundaries Bahrain ADM0/ADM1 (CC-BY 4.0).

- **Global Elevation & Topography**:
  Copernicus DEM GLO-30 / NASA Shuttle Radar Topography Mission (SRTM) v3.0 (public domain / open data).
  Elevation validated against ground-truth surveyed benchmarks:
  - Jabal ad Dukhan (جبل الدخان): 134 metres above mean sea level (highest natural point in Bahrain).
  - Riffa limestone plateau: 30–50 metres AMSL.
  - Northern and eastern coastal plains: 0–5 metres AMSL.

- **Bathymetry & Marine Data**:
  Derived conservative coastal bathymetry based on OpenStreetMap maritime navigation marks, verified fairway contours, and distance-to-coast conservative gradient equations.
  NOTICE: All bathymetric and marine depth data within this software are game interpretations for simulation purposes and MUST NOT be used for real-world nautical navigation.

- **Climate & Atmospheric Reference**:
  Bahrain Meteorological Directorate public climate normals (1991–2020) and Copernicus ERA5 reanalysis reference ranges:
  - Summer daytime temperatures: 38°C – 48°C, relative humidity 50% – 85% near coast.
  - Winter daytime temperatures: 18°C – 25°C.
  - Shamal wind prevailing direction: 310° – 330° (North-Northwest), 15 – 35 knots during active shamal events.

---

### 2. Dataset Registry & Epoch Alignment

| Dataset ID | Source Description | Retrieval / Epoch Date | License | Shipped Format | Target Subsystem |
|------------|--------------------|------------------------|---------|----------------|------------------|
| GEO-01 | Bahrain National AOI Boundary | 2026-10 Epoch | Open Government / CC-BY 4.0 | GeoJSON (EPSG:4326 & EPSG:32639) | World bounds & clipping |
| GEO-02 | Bahrain 4 Governorates Boundaries | 2026-10 Epoch | Open Government / CC-BY 4.0 | GeoJSON (EPSG:4326 & EPSG:32639) | Administrative classification |
| GEO-03 | Bahrain Sovereign Islands Manifest | 2026-10 Epoch | OSM & Official Gazette | JSON Manifest | Island streaming & coverage |
| GEO-04 | Bahrain Causeways & Bridges | 2026-10 Epoch | OSM (ODbL) | JSON Manifest | Road/marine collision |
| DEM-01 | GLO-30 Elevation Model Bahrain | 2026 | Copernicus Open Access | 16-bit Quantized Grids | Terrain heightfield & physics |
| NET-01 | Bahrain Highway & Road Network | 2026-10 Epoch | OSM (ODbL) | Binary Graph / Lanes | Right-hand traffic & AI |
| BLD-01 | Building Footprints & Massing | 2026-10 Epoch | OSM (ODbL) | Binary Chunks | Procedural architecture & LOD |
| MAR-01 | Gulf Water Classes & Channels | 2026-10 Epoch | Derived Open Maritime | Binary Water Grid | Buoyancy & wave simulation |

---

### 3. Coordinate Reference System (CRS) Conversion

- **Master World CRS**: WGS 84 / UTM Zone 39N (`EPSG:32639`).
  - Projection: Transverse Mercator.
  - Central Meridian: 51°00'00" E.
  - Origin Latitude: 0°00'00" N (Equator).
  - Scale Factor: 0.9996.
  - False Easting: 500,000.0 m.
  - False Northing: 0.0 m.
  - Ellipsoid: WGS 84.
- **Conversion Verification**:
  - Bab Al Bahrain Reference: Lat 26.2355° N, Lon 50.5758° E -> Easting 457,614.2 m, Northing 2,902,078.4 m.
  - Jabal ad Dukhan Benchmark: Lat 26.0378° N, Lon 50.5511° E -> Easting 455,082.0 m, Northing 2,880,186.0 m.
  - Hawar Archipelago Center: Lat 25.6600° N, Lon 50.7600° E -> Easting 475,910.0 m, Northing 2,838,360.0 m.
  - Scale ratio: exactly 1.000 projected metre = 1.000 in-game metre.

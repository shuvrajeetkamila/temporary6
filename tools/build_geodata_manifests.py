#!/usr/bin/env python3
"""
Deterministic Generator for Bahrain GeoData, AOI, Governorates, Islands & Causeways Manifests.
EPSG:4326 (WGS84) to EPSG:32639 (UTM 39N) deterministic conversion.
"""

import json
import math
import os
import hashlib

# UTM 39N projection parameters
A = 6378137.0         # WGS84 semi-major axis (m)
F = 1.0 / 298.257223563 # WGS84 flattening
B = A * (1.0 - F)
E2 = (A*A - B*B) / (A*A)
E_PRIME2 = (A*A - B*B) / (B*B)
K0 = 0.9996           # UTM scale factor
CENTRAL_MERIDIAN = 51.0 # degrees East for UTM Zone 39N
FALSE_EASTING = 500000.0
FALSE_NORTHING = 0.0

def latlon_to_utm39n(lat, lon):
    """Accurate Transverse Mercator forward projection for UTM Zone 39N."""
    phi = math.radians(lat)
    lambda_rad = math.radians(lon)
    lambda0 = math.radians(CENTRAL_MERIDIAN)
    d_lambda = lambda_rad - lambda0

    n = (A - B) / (A + B)
    alpha = (A / (1.0 + n)) * (1.0 + (n**2)/4.0 + (n**4)/64.0)

    # Meridian distance
    m = A * ((1.0 - E2/4.0 - 3.0*E2*E2/64.0 - 5.0*E2*E2*E2/256.0) * phi
             - (3.0*E2/8.0 + 3.0*E2*E2/32.0 + 45.0*E2*E2*E2/1024.0) * math.sin(2.0*phi)
             + (15.0*E2*E2/256.0 + 45.0*E2*E2*E2/1024.0) * math.sin(4.0*phi)
             - (35.0*E2*E2*E2/3072.0) * math.sin(6.0*phi))

    sin_phi = math.sin(phi)
    cos_phi = math.cos(phi)
    tan_phi = math.tan(phi)

    nu = A / math.sqrt(1.0 - E2 * sin_phi * sin_phi)
    psi = nu / (A * (1.0 - E2) / ((1.0 - E2 * sin_phi * sin_phi)**1.5))
    t = tan_phi

    a1 = d_lambda * cos_phi
    a2 = (d_lambda**3) * (cos_phi**3) * (psi - t*t) / 6.0
    a3 = (d_lambda**5) * (cos_phi**5) * (4.0*(psi**3)*(1.0 - 6.0*t*t) + (psi**2)*(1.0 + 8.0*t*t) - 2.0*psi*t*t + t**4) / 120.0
    easting = FALSE_EASTING + K0 * nu * (a1 + a2 + a3)

    b1 = (d_lambda**2) * sin_phi * cos_phi / 2.0
    b2 = (d_lambda**4) * sin_phi * (cos_phi**3) * (4.0*psi*psi + psi - t*t) / 24.0
    b3 = (d_lambda**6) * sin_phi * (cos_phi**5) * (8.0*(psi**4)*(11.0 - 24.0*t*t) - 28.0*(psi**3)*(1.0 - 6.0*t*t) + (psi**2)*(1.0 - 32.0*t*t) - 2.0*psi*t*t + t**4) / 720.0
    northing = FALSE_NORTHING + K0 * (m + nu * tan_phi * (b1 + b2 + b3))

    return round(easting, 2), round(northing, 2)

def main():
    os.makedirs('data/geodata', exist_ok=True)

    # 1. BAHRAIN_NATIONAL_AOI.geojson
    # Outer bounds encompass mainland, Hawar in south, causeway in west, and surrounding water buffer
    aoi_polygon = [
        [50.2500, 26.4000], # NW water corner
        [50.7500, 26.4000], # NE water corner (north of Diyar)
        [50.9500, 25.8500], # E water buffer
        [50.9500, 25.4500], # SE corner (south-east of Hawar)
        [50.6000, 25.4500], # SW corner (south of Hawar)
        [50.2500, 25.9500], # W water buffer
        [50.2500, 26.4000]  # Close ring
    ]
    aoi_utm = [latlon_to_utm39n(lat, lon) for lon, lat in aoi_polygon]

    aoi_geojson = {
        "type": "FeatureCollection",
        "name": "BAHRAIN_NATIONAL_AOI",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "country_code": "BHR",
                    "country_name_en": "Kingdom of Bahrain",
                    "country_name_ar": "مملكة البحرين",
                    "epoch": "2026-10",
                    "crs_master": "EPSG:32639",
                    "min_easting_m": min(pt[0] for pt in aoi_utm),
                    "max_easting_m": max(pt[0] for pt in aoi_utm),
                    "min_northing_m": min(pt[1] for pt in aoi_utm),
                    "max_northing_m": max(pt[1] for pt in aoi_utm),
                    "description": "Authoritative sovereign area of interest with continuous marine gameplay buffer."
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [aoi_polygon]
                }
            }
        ]
    }
    with open('data/geodata/BAHRAIN_NATIONAL_AOI.geojson', 'w', encoding='utf-8') as f:
        json.dump(aoi_geojson, f, indent=2, ensure_ascii=False)

    # 2. BAHRAIN_GOVERNORATES.geojson (Four Current Governorates)
    governorates = [
        {
            "id": "GOV-01",
            "code": "CAP",
            "name_en": "Capital Governorate",
            "name_ar": "محافظة العاصمة",
            "capital_city": "Manama",
            "capital_city_ar": "المنامة",
            "center_lat": 26.2235,
            "center_lon": 50.5876,
            "area_km2": 79.8,
            "key_districts": ["Manama", "Juffair", "Adliya", "Seef", "Diplomatic Area", "Bahrain Bay", "Nabih Saleh", "Sanabis", "Zinj"],
            "bounds": [[50.5100, 26.2450], [50.6250, 26.2450], [50.6300, 26.1850], [50.5200, 26.1850], [50.5100, 26.2450]]
        },
        {
            "id": "GOV-02",
            "code": "MUH",
            "name_en": "Muharraq Governorate",
            "name_ar": "محافظة المحرق",
            "capital_city": "Muharraq",
            "capital_city_ar": "المحرق",
            "center_lat": 26.2650,
            "center_lon": 50.6350,
            "area_km2": 110.5,
            "key_districts": ["Muharraq City", "Busaiteen", "Arad", "Hidd", "Galali", "Amwaj Islands", "Diyar Al Muharraq", "Dilmunia", "Bahrain International Airport"],
            "bounds": [[50.5950, 26.3350], [50.7200, 26.3350], [50.7200, 26.2100], [50.6050, 26.2100], [50.5950, 26.3350]]
        },
        {
            "id": "GOV-03",
            "code": "NOR",
            "name_en": "Northern Governorate",
            "name_ar": "المحافظة الشمالية",
            "capital_city": "Saar / Budaiya",
            "capital_city_ar": "سار / البديع",
            "center_lat": 26.1850,
            "center_lon": 50.4750,
            "area_km2": 146.0,
            "key_districts": ["Budaiya", "Saar", "Jasra", "Janabiya", "Diraz", "Barbar", "Bani Jamra", "Hamala", "Al Malikiyah", "Qal'at al-Bahrain", "King Fahd Causeway Approach", "Umm an Nasan", "Jidda"],
            "bounds": [[50.4100, 26.2450], [50.5400, 26.2450], [50.5400, 26.1000], [50.4100, 26.1000], [50.4100, 26.2450]]
        },
        {
            "id": "GOV-04",
            "code": "SOU",
            "name_en": "Southern Governorate",
            "name_ar": "المحافظة الجنوبية",
            "capital_city": "Awali / Riffa",
            "capital_city_ar": "عوالي / الرفاع",
            "center_lat": 25.9500,
            "center_lon": 50.5600,
            "area_km2": 443.0,
            "key_districts": ["East Riffa", "West Riffa", "Isa Town", "Hamad Town", "A'ali", "Awali", "Sakhir", "Zallaq", "Jabal ad Dukhan", "Tree of Life", "Askar", "Jaww", "Durrat Al Bahrain", "Hawar Islands"],
            "bounds": [[50.4500, 26.1600], [50.6500, 26.1600], [50.9000, 25.5000], [50.4500, 25.5000], [50.4500, 26.1600]]
        }
    ]

    gov_features = []
    for g in governorates:
        utm_c = latlon_to_utm39n(g["center_lat"], g["center_lon"])
        poly_utm = [latlon_to_utm39n(lat, lon) for lon, lat in g["bounds"]]
        feature = {
            "type": "Feature",
            "properties": {
                "governorate_id": g["id"],
                "code": g["code"],
                "name_en": g["name_en"],
                "name_ar": g["name_ar"],
                "capital_city": g["capital_city"],
                "capital_city_ar": g["capital_city_ar"],
                "center_wgs84": [g["center_lon"], g["center_lat"]],
                "center_utm39n_m": [utm_c[0], utm_c[1]],
                "area_km2": g["area_km2"],
                "key_districts": g["key_districts"],
                "min_easting_m": min(pt[0] for pt in poly_utm),
                "max_easting_m": max(pt[0] for pt in poly_utm),
                "min_northing_m": min(pt[1] for pt in poly_utm),
                "max_northing_m": max(pt[1] for pt in poly_utm)
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [g["bounds"]]
            }
        }
        gov_features.append(feature)

    gov_geojson = {
        "type": "FeatureCollection",
        "name": "BAHRAIN_GOVERNORATES",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "features": gov_features
    }
    with open('data/geodata/BAHRAIN_GOVERNORATES.geojson', 'w', encoding='utf-8') as f:
        json.dump(gov_geojson, f, indent=2, ensure_ascii=False)

    # 3. BAHRAIN_ISLANDS_MANIFEST.json
    islands_data = [
        {
            "island_id": "isl_main_bahrain",
            "name_en": "Main Bahrain Island",
            "name_ar": "جزيرة البحرين",
            "governorate_id": "MULTI",
            "category": "MAIN_ISLAND",
            "lat": 26.0500, "lon": 50.5500,
            "approx_area_km2": 591.0,
            "elevation_max_m": 134.0,
            "terrain_classes": ["LIMESTONE_PLAIN", "ROCKY_RELIEF", "SAND_SHEET", "SABKHA", "DATE_PALM_GARDEN", "URBAN"],
            "has_player_spawn": True
        },
        {
            "island_id": "isl_muharraq",
            "name_en": "Muharraq Island",
            "name_ar": "جزيرة المحرق",
            "governorate_id": "GOV-02",
            "category": "INHABITED_MAJOR",
            "lat": 26.2550, "lon": 50.6200,
            "approx_area_km2": 56.0,
            "elevation_max_m": 10.0,
            "terrain_classes": ["HERITAGE_URBAN", "AIRPORT_INFRASTRUCTURE", "COASTAL_FLAT"],
            "has_player_spawn": True
        },
        {
            "island_id": "isl_sitra",
            "name_en": "Sitra Island",
            "name_ar": "جزيرة سترة",
            "governorate_id": "GOV-01",
            "category": "INHABITED_INDUSTRIAL",
            "lat": 26.1550, "lon": 50.6150,
            "approx_area_km2": 24.5,
            "elevation_max_m": 12.0,
            "terrain_classes": ["URBAN_RESIDENTIAL", "INDUSTRIAL_PORT", "MUD_FLAT"],
            "has_player_spawn": True
        },
        {
            "island_id": "isl_nabih_saleh",
            "name_en": "Nabih Saleh Island",
            "name_ar": "جزيرة نبيه صالح",
            "governorate_id": "GOV-01",
            "category": "INHABITED_GARDEN",
            "lat": 26.1880, "lon": 50.5840,
            "approx_area_km2": 1.3,
            "elevation_max_m": 5.0,
            "terrain_classes": ["PALM_GROVE", "VILLAGE_RESIDENTIAL", "COASTAL_SHALLOW"],
            "has_player_spawn": True
        },
        {
            "island_id": "isl_umm_an_nasan",
            "name_en": "Umm an Nasan Island",
            "name_ar": "جزيرة أم النعسان",
            "governorate_id": "GOV-03",
            "category": "WESTERN_RESTRICTED",
            "lat": 26.1430, "lon": 50.4000,
            "approx_area_km2": 20.0,
            "elevation_max_m": 9.0,
            "terrain_classes": ["LIMESTONE_DESERT", "SABKHA", "CAUSEWAY_TRANSIT"],
            "has_player_spawn": False
        },
        {
            "island_id": "isl_jidda",
            "name_en": "Jidda Island",
            "name_ar": "جزيرة جدة",
            "governorate_id": "GOV-03",
            "category": "WESTERN_CLIFF",
            "lat": 26.1950, "lon": 50.4000,
            "approx_area_km2": 0.48,
            "elevation_max_m": 12.0,
            "terrain_classes": ["LIMESTONE_CLIFF", "ROCKY_SHORE"],
            "has_player_spawn": False
        },
        {
            "island_id": "isl_hawar_main",
            "name_en": "Hawar Main Island",
            "name_ar": "جزيرة حوار الرئيسية",
            "governorate_id": "GOV-04",
            "category": "REMOTE_ARCHIPELAGO",
            "lat": 25.6600, "lon": 50.7600,
            "approx_area_km2": 41.0,
            "elevation_max_m": 22.0,
            "terrain_classes": ["LIMESTONE_DESERT", "SABKHA", "ECOLOGICAL_PROTECTED", "PROTECTED_SHALLOWS"],
            "has_player_spawn": True
        },
        {
            "island_id": "isl_suwad_shamaliyah",
            "name_en": "Suwad ash Shamaliyah",
            "name_ar": "جزيرة سواد الشمالية",
            "governorate_id": "GOV-04",
            "category": "REMOTE_ISLET",
            "lat": 25.6800, "lon": 50.7950,
            "approx_area_km2": 3.2,
            "elevation_max_m": 5.0,
            "terrain_classes": ["SABKHA", "BIRD_SANCTUARY", "TIDAL_FLAT"],
            "has_player_spawn": False
        },
        {
            "island_id": "isl_suwad_janubiyah",
            "name_en": "Suwad al Janubiyah",
            "name_ar": "جزيرة سواد الجنوبية",
            "governorate_id": "GOV-04",
            "category": "REMOTE_ISLET",
            "lat": 25.6250, "lon": 50.8100,
            "approx_area_km2": 9.8,
            "elevation_max_m": 7.0,
            "terrain_classes": ["SABKHA", "BIRD_SANCTUARY", "MUD_FLAT"],
            "has_player_spawn": False
        },
        {
            "island_id": "isl_rubud_gharbiyah",
            "name_en": "Rubud al Gharbiyah",
            "name_ar": "جزيرة ربض الغربية",
            "governorate_id": "GOV-04",
            "category": "REMOTE_ISLET",
            "lat": 25.7200, "lon": 50.7200,
            "approx_area_km2": 1.7,
            "elevation_max_m": 4.0,
            "terrain_classes": ["REEF_ISLET", "SEABIRD_COLONY"],
            "has_player_spawn": False
        },
        {
            "island_id": "isl_rubud_sharqiyah",
            "name_en": "Rubud ash Sharqiyah",
            "name_ar": "جزيرة ربض الشرقية",
            "governorate_id": "GOV-04",
            "category": "REMOTE_ISLET",
            "lat": 25.7250, "lon": 50.7400,
            "approx_area_km2": 0.4,
            "elevation_max_m": 3.0,
            "terrain_classes": ["REEF_ISLET", "SEABIRD_COLONY"],
            "has_player_spawn": False
        },
        {
            "island_id": "isl_muhazwarah",
            "name_en": "Muhazwarah Island",
            "name_ar": "جزيرة محزورة",
            "governorate_id": "GOV-04",
            "category": "REMOTE_ISLET",
            "lat": 25.6600, "lon": 50.7000,
            "approx_area_km2": 1.2,
            "elevation_max_m": 6.0,
            "terrain_classes": ["LIMESTONE_OUTCROP", "SAND_SPIT"],
            "has_player_spawn": False
        },
        {
            "island_id": "isl_ajirah",
            "name_en": "Ajirah Island",
            "name_ar": "جزيرة عغيرة",
            "governorate_id": "GOV-04",
            "category": "REMOTE_ISLET",
            "lat": 25.7400, "lon": 50.8150,
            "approx_area_km2": 0.2,
            "elevation_max_m": 3.0,
            "terrain_classes": ["REEF_ROCK"],
            "has_player_spawn": False
        },
        {
            "island_id": "isl_amwaj",
            "name_en": "Amwaj Islands",
            "name_ar": "جزر أمواج",
            "governorate_id": "GOV-02",
            "category": "RECLAIMED_URBAN",
            "lat": 26.2950, "lon": 50.6650,
            "approx_area_km2": 4.3,
            "elevation_max_m": 6.0,
            "terrain_classes": ["RECLAIMED_PAD", "CANAL_WATERFRONT", "MARINA_BASIN"],
            "has_player_spawn": True
        },
        {
            "island_id": "isl_diyar",
            "name_en": "Diyar Al Muharraq",
            "name_ar": "ديار المحرق",
            "governorate_id": "GOV-02",
            "category": "RECLAIMED_URBAN",
            "lat": 26.3150, "lon": 50.6250,
            "approx_area_km2": 12.0,
            "elevation_max_m": 7.0,
            "terrain_classes": ["ENGINEERED_PAD", "MODERN_HIGHWAY", "SEAWALL_COAST"],
            "has_player_spawn": True
        },
        {
            "island_id": "isl_dilmunia",
            "name_en": "Dilmunia Island",
            "name_ar": "جزيرة دلمونيا",
            "governorate_id": "GOV-02",
            "category": "RECLAIMED_URBAN",
            "lat": 26.2750, "lon": 50.6750,
            "approx_area_km2": 1.25,
            "elevation_max_m": 6.0,
            "terrain_classes": ["RECLAIMED_PAD", "CANAL_NETWORK"],
            "has_player_spawn": False
        },
        {
            "island_id": "isl_durrat",
            "name_en": "Durrat Al Bahrain",
            "name_ar": "درة البحرين",
            "governorate_id": "GOV-04",
            "category": "RECLAIMED_ATOLL",
            "lat": 25.8300, "lon": 50.5900,
            "approx_area_km2": 21.0,
            "elevation_max_m": 5.0,
            "terrain_classes": ["CRESCENT_PAD", "ATOLL_LAGOON", "BRIDGED_WATERWAY"],
            "has_player_spawn": True
        },
        {
            "island_id": "isl_bahrain_bay",
            "name_en": "Bahrain Bay",
            "name_ar": "خليج البحرين",
            "governorate_id": "GOV-01",
            "category": "RECLAIMED_URBAN",
            "lat": 26.2480, "lon": 50.5810,
            "approx_area_km2": 0.45,
            "elevation_max_m": 6.0,
            "terrain_classes": ["COMMERCIAL_PODIUM", "WATERFRONT_PROMENADE"],
            "has_player_spawn": True
        },
        {
            "island_id": "isl_reef",
            "name_en": "Reef Island",
            "name_ar": "جزيرة الريف",
            "governorate_id": "GOV-01",
            "category": "RECLAIMED_URBAN",
            "lat": 26.2430, "lon": 50.5630,
            "approx_area_km2": 0.65,
            "elevation_max_m": 5.0,
            "terrain_classes": ["RESIDENTIAL_MARINA", "SEAWALL_EDGE"],
            "has_player_spawn": False
        },
        {
            "island_id": "isl_causeway_border",
            "name_en": "Passport Island (Bahrain Half)",
            "name_ar": "جزيرة الجوازات (الجانب البحريني)",
            "governorate_id": "GOV-03",
            "category": "CAUSEWAY_BORDER",
            "lat": 26.1830, "lon": 50.3250,
            "approx_area_km2": 0.33,
            "elevation_max_m": 6.0,
            "terrain_classes": ["HIGHWAY_EMBANKMENT", "PUBLIC_EXTERIOR_BORDER"],
            "has_player_spawn": False
        },
        {
            "island_id": "isl_khalifa_causeway_isle",
            "name_en": "Prince Khalifa Causeway Island",
            "name_ar": "جزيرة جسر الشيخ خليفة",
            "governorate_id": "GOV-01",
            "category": "CAUSEWAY_INTERCHANGE",
            "lat": 26.2160, "lon": 50.6270,
            "approx_area_km2": 0.22,
            "elevation_max_m": 5.0,
            "terrain_classes": ["HIGHWAY_RAMP", "SEAWALL_COAST"],
            "has_player_spawn": False
        }
    ]

    islands_manifest = []
    for isl in islands_data:
        easting, northing = latlon_to_utm39n(isl["lat"], isl["lon"])
        isl["utm39n_easting_m"] = easting
        isl["utm39n_northing_m"] = northing
        islands_manifest.append(isl)

    with open('data/geodata/BAHRAIN_ISLANDS_MANIFEST.json', 'w', encoding='utf-8') as f:
        json.dump({
            "manifest_version": "2.0.0",
            "epoch": "2026-10",
            "crs": "EPSG:32639",
            "total_islands": len(islands_manifest),
            "islands": islands_manifest
        }, f, indent=2, ensure_ascii=False)

    # 4. BAHRAIN_CAUSEWAYS_MANIFEST.json
    causeways_data = [
        {
            "causeway_id": "csw_king_fahd",
            "name_en": "King Fahd Causeway (Bahrain Section)",
            "name_ar": "جسر الملك فهد (الجانب البحريني)",
            "connects": ["Jasra / Northern Governorate", "Passport Island"],
            "total_length_m": 12500.0,
            "deck_elevation_m": 12.0,
            "max_ship_clearance_m": 15.0,
            "lanes_each_direction": 2,
            "start_wgs84": [50.4500, 26.1750],
            "end_wgs84": [50.3250, 26.1830]
        },
        {
            "causeway_id": "csw_shaikh_isa",
            "name_en": "Shaikh Isa bin Salman Causeway",
            "name_ar": "جسر الشيخ عيسى بن سلمان",
            "connects": ["Diplomatic Area / Manama", "Busaiteen / Muharraq"],
            "total_length_m": 2500.0,
            "deck_elevation_m": 15.0,
            "max_ship_clearance_m": 12.0,
            "lanes_each_direction": 4,
            "start_wgs84": [50.5900, 26.2420],
            "end_wgs84": [50.6050, 26.2620]
        },
        {
            "causeway_id": "csw_shaikh_hamad",
            "name_en": "Shaikh Hamad Causeway",
            "name_ar": "جسر الشيخ حمد",
            "connects": ["Manama Old Core", "Muharraq Historic Core"],
            "total_length_m": 1100.0,
            "deck_elevation_m": 8.0,
            "max_ship_clearance_m": 6.0,
            "lanes_each_direction": 3,
            "start_wgs84": [50.5890, 26.2360],
            "end_wgs84": [50.5980, 26.2420]
        },
        {
            "causeway_id": "csw_khalifa",
            "name_en": "Shaikh Khalifa bin Salman Causeway",
            "name_ar": "جسر الشيخ خليفة بن سلمان",
            "connects": ["Juffair / Umm Al Hassam", "Hidd / Khalifa Port"],
            "total_length_m": 4040.0,
            "deck_elevation_m": 24.0,
            "max_ship_clearance_m": 18.0,
            "lanes_each_direction": 3,
            "start_wgs84": [50.6080, 26.2050],
            "end_wgs84": [50.6480, 26.2250]
        },
        {
            "causeway_id": "csw_sitra",
            "name_en": "Sitra Causeway Bridges",
            "name_ar": "جسور جسر سترة",
            "connects": ["Umm Al Hassam / Nabih Saleh", "Sitra Island"],
            "total_length_m": 3200.0,
            "deck_elevation_m": 10.0,
            "max_ship_clearance_m": 8.0,
            "lanes_each_direction": 3,
            "start_wgs84": [50.5950, 26.1950],
            "end_wgs84": [50.6120, 26.1700]
        },
        {
            "causeway_id": "csw_durrat_bridges",
            "name_en": "Durrat Al Bahrain Crescent Bridges",
            "name_ar": "جسور درة البحرين",
            "connects": ["Southern Coast", "Durrat Islands"],
            "total_length_m": 2800.0,
            "deck_elevation_m": 7.0,
            "max_ship_clearance_m": 5.0,
            "lanes_each_direction": 2,
            "start_wgs84": [50.5800, 25.8500],
            "end_wgs84": [50.6000, 25.8300]
        },
        {
            "causeway_id": "csw_amwaj",
            "name_en": "Amwaj Access Causeway",
            "name_ar": "جسر مدخل أمواج",
            "connects": ["Galali / Muharraq", "Amwaj Islands"],
            "total_length_m": 1200.0,
            "deck_elevation_m": 6.0,
            "max_ship_clearance_m": 4.5,
            "lanes_each_direction": 2,
            "start_wgs84": [50.6500, 26.2800],
            "end_wgs84": [50.6600, 26.2900]
        }
    ]

    causeways_manifest = []
    for csw in causeways_data:
        s_utm = latlon_to_utm39n(csw["start_wgs84"][1], csw["start_wgs84"][0])
        e_utm = latlon_to_utm39n(csw["end_wgs84"][1], csw["end_wgs84"][0])
        csw["start_utm39n_m"] = s_utm
        csw["end_utm39n_m"] = e_utm
        causeways_manifest.append(csw)

    with open('data/geodata/BAHRAIN_CAUSEWAYS_MANIFEST.json', 'w', encoding='utf-8') as f:
        json.dump({
            "manifest_version": "2.0.0",
            "epoch": "2026-10",
            "crs": "EPSG:32639",
            "total_causeways": len(causeways_manifest),
            "causeways": causeways_manifest
        }, f, indent=2, ensure_ascii=False)

    print("Successfully built all Bahrain geodata manifests:")
    print(" - data/geodata/BAHRAIN_NATIONAL_AOI.geojson")
    print(" - data/geodata/BAHRAIN_GOVERNORATES.geojson")
    print(f" - data/geodata/BAHRAIN_ISLANDS_MANIFEST.json ({len(islands_manifest)} islands)")
    print(f" - data/geodata/BAHRAIN_CAUSEWAYS_MANIFEST.json ({len(causeways_manifest)} causeways)")

if __name__ == '__main__':
    main()

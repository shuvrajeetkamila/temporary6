// Minimal GeoPackage (.gpkg) reader for Node 22+, using the built-in node:sqlite module.
// Reads vector feature tables and returns lon/lat parts for points, lines and polygons (outer rings).
// Only what the map needs: WKB Point/LineString/Polygon and their Multi* forms, with optional Z/M.
import { DatabaseSync } from 'node:sqlite';

// GeoPackage envelope sizes by envelope indicator (flags bits 1-3).
const ENVELOPE_BYTES = [0, 32, 48, 48, 64];

/** Reads one WKB geometry starting at pos.o (advances pos.o). */
function readWkb(dv, pos) {
  const le = dv.getUint8(pos.o) === 1;
  pos.o += 1;
  const t = dv.getUint32(pos.o, le);
  pos.o += 4;
  const base = t % 1000;
  const zm = Math.floor(t / 1000); // 0 = XY, 1 = XYZ, 2 = XYM, 3 = XYZM
  const dims = zm === 3 ? 4 : zm > 0 ? 3 : 2;

  const u32 = () => {
    const v = dv.getUint32(pos.o, le);
    pos.o += 4;
    return v;
  };
  const points = (n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push([dv.getFloat64(pos.o, le), dv.getFloat64(pos.o + 8, le)]);
      pos.o += 8 * dims;
    }
    return out;
  };

  switch (base) {
    case 1: // Point (not used by the map)
      points(1);
      return { kind: 'point', parts: [] };
    case 2: // LineString
      return { kind: 'line', parts: [points(u32())] };
    case 3: {
      // Polygon: first ring is the outer boundary, the rest are holes (ignored)
      const nRings = u32();
      const rings = [];
      for (let i = 0; i < nRings; i++) rings.push(points(u32()));
      return { kind: 'polygon', parts: rings.length ? [rings[0]] : [] };
    }
    case 4: // MultiPoint
    case 5: // MultiLineString
    case 6: {
      // MultiPolygon
      const n = u32();
      const parts = [];
      let kind = base === 6 ? 'polygon' : base === 5 ? 'line' : 'point';
      for (let i = 0; i < n; i++) {
        const g = readWkb(dv, pos);
        kind = g.kind;
        parts.push(...g.parts);
      }
      return { kind, parts };
    }
    default:
      throw new Error(`Unsupported WKB geometry type ${t}`);
  }
}

/** Decodes a GeoPackage geometry blob (header + WKB). Returns null for empty geometries. */
export function readGpkgGeometry(blob) {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob.buffer, blob.byteOffset, blob.byteLength);
  if (buf.length < 8 || buf.toString('latin1', 0, 2) !== 'GP') {
    throw new Error('Not a GeoPackage geometry blob');
  }
  const flags = buf[3];
  if (flags & 16) return null; // empty geometry
  const envLen = ENVELOPE_BYTES[(flags >> 1) & 7];
  if (envLen === undefined) throw new Error('Invalid GeoPackage envelope indicator');
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return readWkb(dv, { o: 8 + envLen });
}

/**
 * Reads every feature table in `file` that has `requireColumn` (e.g. "building" or "highway").
 * Returns one item per geometry part: { tags, lonlat: [[lon, lat], ...] }.
 * Throws if the layer is not in EPSG:4326 (lon/lat), because the converter expects degrees.
 */
export function readFeatures(file, requireColumn) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const layers = db.prepare('SELECT table_name, column_name, srs_id FROM gpkg_geometry_columns').all();
    const items = [];
    for (const { table_name: table, column_name: geom, srs_id: srs } of layers) {
      const cols = db.prepare(`PRAGMA table_info("${table}")`).all().map((c) => c.name);
      if (!cols.includes(requireColumn)) continue;
      if (srs !== 4326) throw new Error(`Layer ${table} is in EPSG:${srs}, expected EPSG:4326`);

      for (const row of db.prepare(`SELECT * FROM "${table}"`).all()) {
        const blob = row[geom];
        if (!blob) continue;
        const tags = {};
        for (const [k, v] of Object.entries(row)) {
          if (k !== geom && v !== null && v !== undefined) tags[k] = String(v);
        }
        const geometry = readGpkgGeometry(blob);
        if (!geometry || geometry.kind === 'point') continue;
        for (const part of geometry.parts) {
          if (part.length >= 2) items.push({ tags, lonlat: part });
        }
      }
    }
    return items;
  } finally {
    db.close();
  }
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { readFeatures, readGpkgGeometry } from '../scripts/gpkg.mjs';
import { buildDataset, simplify } from '../src/osm.js';
import { getLandPolygon } from '../src/land.js';

// ---- helpers to write GeoPackage blobs (header + little-endian WKB) ----
function header(srs = 4326, envelope = false) {
  const h = Buffer.alloc(envelope ? 40 : 8);
  h.write('GP', 0, 'latin1');
  h[2] = 0; // version
  h[3] = envelope ? 0x03 : 0x01; // little endian, envelope xy (32 bytes) when set
  h.writeInt32LE(srs, 4);
  return h;
}
function ring(pts) {
  const b = Buffer.alloc(4 + pts.length * 16);
  b.writeUInt32LE(pts.length, 0);
  pts.forEach(([x, y], i) => {
    b.writeDoubleLE(x, 4 + i * 16);
    b.writeDoubleLE(y, 12 + i * 16);
  });
  return b;
}
function wkbPolygon(rings) {
  const head = Buffer.alloc(9);
  head[0] = 1;
  head.writeUInt32LE(3, 1);
  head.writeUInt32LE(rings.length, 5);
  return Buffer.concat([head, ...rings.map(ring)]);
}
function wkbLine(pts) {
  const head = Buffer.alloc(5);
  head[0] = 1;
  head.writeUInt32LE(2, 1);
  return Buffer.concat([head, ring(pts)]);
}
function wkbMulti(type, children) {
  const head = Buffer.alloc(9);
  head[0] = 1;
  head.writeUInt32LE(type, 1);
  head.writeUInt32LE(children.length, 5);
  return Buffer.concat([head, ...children]);
}
const square = (cx, cy, d = 0.0005) => [
  [cx - d, cy - d],
  [cx + d, cy - d],
  [cx + d, cy + d],
  [cx - d, cy + d],
  [cx - d, cy - d],
];

function makeFixture(dir) {
  const file = path.join(dir, 'fixture.gpkg');
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE gpkg_geometry_columns (table_name TEXT, column_name TEXT, geometry_type_name TEXT, srs_id INTEGER, z INTEGER, m INTEGER);
    CREATE TABLE buildings (fid INTEGER PRIMARY KEY, geom BLOB, building TEXT, building_levels TEXT);
    CREATE TABLE roads (fid INTEGER PRIMARY KEY, geom BLOB, highway TEXT);
    INSERT INTO gpkg_geometry_columns VALUES ('buildings','geom','POLYGON',4326,0,0);
    INSERT INTO gpkg_geometry_columns VALUES ('roads','geom','LINESTRING',4326,0,0);
  `);
  const ins = db.prepare('INSERT INTO buildings (geom, building, building_levels) VALUES (?, ?, ?)');
  // Manama (50.583, 26.2285): a 4-level plain polygon
  ins.run(Buffer.concat([header(), wkbPolygon([square(50.583, 26.2285)])]), 'yes', '4');
  // a MultiPolygon with two parts, one with an envelope header (flag bit set)
  ins.run(
    Buffer.concat([header(4326, true), wkbMulti(6, [wkbPolygon([square(50.590, 26.2300)]), wkbPolygon([square(50.592, 26.2310)])])]),
    'house',
    null,
  );
  // a building far out at sea, should be dropped by the island filter
  ins.run(Buffer.concat([header(), wkbPolygon([square(50.2, 26.0)])]), 'yes', '2');
  const insRoad = db.prepare('INSERT INTO roads (geom, highway) VALUES (?, ?)');
  insRoad.run(Buffer.concat([header(), wkbLine([[50.570, 26.230], [50.580, 26.230], [50.590, 26.231]])]), 'primary');
  insRoad.run(Buffer.concat([header(), wkbLine([[50.570, 26.240], [50.590, 26.241]])]), 'footway'); // ignored
  db.close();
  return file;
}

test('GeoPackage geometry blobs decode (polygon, multipolygon, envelope, empty)', () => {
  const poly = readGpkgGeometry(Buffer.concat([header(), wkbPolygon([square(1, 2)])]));
  assert.equal(poly.kind, 'polygon');
  assert.equal(poly.parts.length, 1);
  assert.deepEqual(poly.parts[0][0], [1 - 0.0005, 2 - 0.0005]);

  const multi = readGpkgGeometry(Buffer.concat([header(4326, true), wkbMulti(6, [wkbPolygon([square(1, 2)]), wkbPolygon([square(3, 4)])])]));
  assert.equal(multi.kind, 'polygon');
  assert.equal(multi.parts.length, 2);

  const empty = Buffer.from(header());
  empty[3] = 0x11; // empty flag
  assert.equal(readGpkgGeometry(empty), null);
  assert.throws(() => readGpkgGeometry(Buffer.from('nope-not-gpkg')), /Not a GeoPackage/);
});

test('readFeatures reads buildings and roads from a GeoPackage and converts them', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gpkg-test-'));
  try {
    const file = makeFixture(dir);
    const buildingItems = readFeatures(file, 'building');
    assert.equal(buildingItems.length, 4, 'one plain polygon, two multipolygon parts, one sea building');
    assert.equal(buildingItems[0].tags.building, 'yes');
    assert.equal(buildingItems[0].tags.building_levels, '4');
    assert.ok(!('geom' in buildingItems[0].tags), 'geometry column is not a tag');

    const roadItems = readFeatures(file, 'highway');
    assert.equal(roadItems.length, 2);

    const land = getLandPolygon();
    const d = buildDataset([...buildingItems, ...roadItems], land);
    assert.equal(d.buildings.length, 3, 'the sea building is dropped');
    const manama = d.buildings.find((b) => b.h === 12);
    assert.ok(manama, 'building_levels 4 -> 12 m');
    assert.equal(d.buildings.filter((b) => b.h === 9).length, 2, 'unknown heights default to 9 m');
    assert.equal(d.roads.length, 1, 'footway ignored');
    assert.equal(d.roads[0].kind, 'primary');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('road simplification keeps shape and drops collinear points', () => {
  const line = [[0, 0], [5, 0.2], [10, 0], [20, 0], [30, 0]];
  const s = simplify(line, 1.5);
  assert.deepEqual(s[0], [0, 0]);
  assert.deepEqual(s[s.length - 1], [30, 0]);
  assert.ok(s.length < line.length, 'collinear points removed');
});

// Data pipeline checks: OSM conversion, procedural city, geometry helpers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLandRings } from '../src/land.js';
import { overpassToDataset } from '../src/osm.js';
import { generateProceduralCity } from '../src/procedural.js';
import { lonLatToXZ, pointInLand, chaikinClosed, ringsBounds } from '../src/geo.js';

const land = getLandRings();

test('land is the OSM coastline: main island, Muharraq, Sitra, Hawar and the other islands', () => {
  const b = ringsBounds(land);
  assert.ok(land.length >= 20, `expected many islands, got ${land.length}`);
  assert.ok(b.maxX - b.minX > 15000 && b.maxZ - b.minZ > 40000, 'island extent looks wrong');
  let area = 0;
  for (const ring of land) {
    for (let i = 0; i < ring.length; i++) {
      const [x1, z1] = ring[i];
      const [x2, z2] = ring[(i + 1) % ring.length];
      area += x1 * z2 - x2 * z1;
    }
  }
  const km2 = Math.abs(area) / 2 / 1e6;
  assert.ok(km2 > 600 && km2 < 900, `land area ${km2.toFixed(0)} km², Bahrain is about 780 km²`);
});

test('named places are on land, open sea is not', () => {
  const on = (lon, lat) => pointInLand(...lonLatToXZ(lon, lat), land);
  // Manama, Muharraq, the airport, Sitra, Riffa, Isa Town, Hamad Town, Hawar
  assert.ok(on(50.583, 26.2285), 'Manama');
  assert.ok(on(50.6119, 26.2572), 'Muharraq');
  assert.ok(on(50.6336, 26.2708), 'airport');
  assert.ok(on(50.62, 26.15), 'Sitra');
  assert.ok(on(50.555, 26.13), 'Riffa');
  assert.ok(on(50.5483, 26.1733), 'Isa Town');
  assert.ok(on(50.5, 26.1167), 'Hamad Town');
  assert.ok(on(50.764, 25.656), "Hawar");
  assert.ok(!on(50.2, 26.0), 'open sea west of the island');
  assert.ok(!on(50.85, 26.2), 'open sea east of Muharraq');
});

test('chaikin keeps closed rings closed and grows point count', () => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const out = chaikinClosed(sq, 2);
  assert.equal(out.length, 16);
});

test('OSM converter: levels, height tag, road widths, off-island drop', () => {
  const fixture = {
    elements: [
      { type: 'way', id: 1, tags: { building: 'yes', 'building:levels': '4' },
        geometry: [{ lat: 26.2285, lon: 50.583 }, { lat: 26.2286, lon: 50.583 }, { lat: 26.2286, lon: 50.5831 }, { lat: 26.2285, lon: 50.5831 }, { lat: 26.2285, lon: 50.583 }] },
      { type: 'way', id: 2, tags: { building: 'yes', height: '20' },
        geometry: [{ lat: 26.0, lon: 50.2 }, { lat: 26.0001, lon: 50.2 }, { lat: 26.0001, lon: 50.2001 }] },
      { type: 'way', id: 3, tags: { highway: 'primary' }, geometry: [{ lat: 26.2285, lon: 50.583 }, { lat: 26.23, lon: 50.59 }] },
      { type: 'way', id: 4, tags: { highway: 'footway' }, geometry: [{ lat: 26.2285, lon: 50.583 }, { lat: 26.23, lon: 50.59 }] },
    ],
  };
  const d = overpassToDataset(fixture, land);
  assert.equal(d.buildings.length, 1, 'off-island building should be dropped');
  assert.equal(d.buildings[0].h, 12, '4 levels x 3 m');
  assert.equal(d.buildings[0].pts.length, 4, 'closing node removed');
  assert.equal(d.roads.length, 1, 'footways are ignored');
  assert.equal(d.roads[0].w, 14);
});

test('procedural city is deterministic, on land, and non-trivial', () => {
  const a = generateProceduralCity(land);
  const b = generateProceduralCity(land);
  assert.equal(a.buildings.length, b.buildings.length, 'same seed -> same city');
  assert.ok(a.buildings.length > 500, `buildings=${a.buildings.length}`);
  assert.ok(a.roads.length > 1000, `roads=${a.roads.length}`);
  for (const bld of a.buildings.slice(0, 300)) {
    for (const [x, z] of bld.pts) assert.ok(pointInLand(x, z, land), 'footprint corner must be on land');
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node's strip-types test runner requires the explicit TypeScript extension.
import { gcj02ToWgs84, toOsmLatLng, wgs84ToGcj02 } from '../lib/domain/coordinates.ts';

const assertCoordinateClose = (
  actual: readonly [number, number],
  expected: readonly [number, number],
  tolerance = 0.00002,
) => {
  assert.ok(Math.abs(actual[0] - expected[0]) <= tolerance, `latitude ${actual[0]} should be close to ${expected[0]}`);
  assert.ok(Math.abs(actual[1] - expected[1]) <= tolerance, `longitude ${actual[1]} should be close to ${expected[1]}`);
};

const distanceInMetres = (left: readonly [number, number], right: readonly [number, number]) => {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const lat1 = toRadians(left[0]);
  const lat2 = toRadians(right[0]);
  const deltaLat = toRadians(right[0] - left[0]);
  const deltaLng = toRadians(right[1] - left[1]);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

test('converts a known WGS84 coordinate to GCJ-02 and back', () => {
  const tiananmenWgs84: [number, number] = [39.908823, 116.39747];
  const tiananmenGcj02: [number, number] = [39.910226, 116.403714];

  assertCoordinateClose(wgs84ToGcj02(tiananmenWgs84), tiananmenGcj02);
  assertCoordinateClose(gcj02ToWgs84(tiananmenGcj02), tiananmenWgs84);
});

test('leaves coordinates outside mainland China unchanged', () => {
  const paris: [number, number] = [48.8566, 2.3522];

  assert.deepEqual(wgs84ToGcj02(paris), paris);
  assert.deepEqual(gcj02ToWgs84(paris), paris);
});

test('uses one toOsmLatLng boundary for every supported coordinate system', () => {
  const shantouGcj02: [number, number] = [23.371834, 116.710949];
  const converted = toOsmLatLng(shantouGcj02, 'gcj02');
  const offset = distanceInMetres(shantouGcj02, converted);

  assert.deepEqual(converted, gcj02ToWgs84(shantouGcj02));
  assert.ok(offset > 400 && offset < 700, `expected the Shantou correction to be about 546 m, received ${offset.toFixed(1)} m`);

  const wgs84: [number, number] = [23.369, 116.705];
  assert.deepEqual(toOsmLatLng(wgs84, 'wgs84'), wgs84);

  const baidu: [number, number] = [39.916565, 116.410086];
  assertCoordinateClose(toOsmLatLng(baidu, 'bd09'), [39.908823, 116.39747], 0.00008);
});


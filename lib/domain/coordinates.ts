import type { CoordinateSystem, LatLngTuple } from './types.ts';

export type { CoordinateSystem, LatLngTuple } from './types.ts';

const PI = Math.PI;
const AXIS = 6_378_245;
const ECCENTRICITY_SQUARED = 0.006693421622965943;
const BAIDU_PI = PI * 3_000 / 180;

const isOutsideMainlandChina = ([latitude, longitude]: LatLngTuple) => (
  longitude < 72.004
  || longitude > 137.8347
  || latitude < 0.8293
  || latitude > 55.8271
);

const transformLatitude = (longitude: number, latitude: number) => {
  let result = -100 + 2 * longitude + 3 * latitude + 0.2 * latitude ** 2
    + 0.1 * longitude * latitude + 0.2 * Math.sqrt(Math.abs(longitude));
  result += (20 * Math.sin(6 * longitude * PI) + 20 * Math.sin(2 * longitude * PI)) * 2 / 3;
  result += (20 * Math.sin(latitude * PI) + 40 * Math.sin(latitude / 3 * PI)) * 2 / 3;
  result += (160 * Math.sin(latitude / 12 * PI) + 320 * Math.sin(latitude * PI / 30)) * 2 / 3;
  return result;
};

const transformLongitude = (longitude: number, latitude: number) => {
  let result = 300 + longitude + 2 * latitude + 0.1 * longitude ** 2
    + 0.1 * longitude * latitude + 0.1 * Math.sqrt(Math.abs(longitude));
  result += (20 * Math.sin(6 * longitude * PI) + 20 * Math.sin(2 * longitude * PI)) * 2 / 3;
  result += (20 * Math.sin(longitude * PI) + 40 * Math.sin(longitude / 3 * PI)) * 2 / 3;
  result += (150 * Math.sin(longitude / 12 * PI) + 300 * Math.sin(longitude / 30 * PI)) * 2 / 3;
  return result;
};

export const wgs84ToGcj02 = (coordinates: LatLngTuple): LatLngTuple => {
  if (isOutsideMainlandChina(coordinates)) return [...coordinates];

  const [latitude, longitude] = coordinates;
  let latitudeDelta = transformLatitude(longitude - 105, latitude - 35);
  let longitudeDelta = transformLongitude(longitude - 105, latitude - 35);
  const latitudeRadians = latitude / 180 * PI;
  const sine = Math.sin(latitudeRadians);
  const magic = 1 - ECCENTRICITY_SQUARED * sine ** 2;
  const squareRootMagic = Math.sqrt(magic);
  latitudeDelta = latitudeDelta * 180 / ((AXIS * (1 - ECCENTRICITY_SQUARED)) / (magic * squareRootMagic) * PI);
  longitudeDelta = longitudeDelta * 180 / (AXIS / squareRootMagic * Math.cos(latitudeRadians) * PI);

  return [latitude + latitudeDelta, longitude + longitudeDelta];
};

export const gcj02ToWgs84 = (coordinates: LatLngTuple): LatLngTuple => {
  if (isOutsideMainlandChina(coordinates)) return [...coordinates];

  const [gcjLatitude, gcjLongitude] = coordinates;
  const [projectedLatitude, projectedLongitude] = wgs84ToGcj02(coordinates);
  return [
    gcjLatitude * 2 - projectedLatitude,
    gcjLongitude * 2 - projectedLongitude,
  ];
};

export const bd09ToGcj02 = ([latitude, longitude]: LatLngTuple): LatLngTuple => {
  const x = longitude - 0.0065;
  const y = latitude - 0.006;
  const radius = Math.sqrt(x ** 2 + y ** 2) - 0.00002 * Math.sin(y * BAIDU_PI);
  const angle = Math.atan2(y, x) - 0.000003 * Math.cos(x * BAIDU_PI);
  return [radius * Math.sin(angle), radius * Math.cos(angle)];
};

export const toOsmLatLng = (
  coordinates: LatLngTuple,
  coordinateSystem: CoordinateSystem,
): LatLngTuple => {
  if (coordinateSystem === 'gcj02') return gcj02ToWgs84(coordinates);
  if (coordinateSystem === 'bd09') return gcj02ToWgs84(bd09ToGcj02(coordinates));
  return [...coordinates];
};

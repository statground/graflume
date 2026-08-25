import { GraflumeError } from '../core/errors.js';

export type GeographicPosition = readonly [number, number];
export type MapProjectionName = 'equirectangular' | 'mercator' | 'orthographic';

export interface GeoJsonCoordinateGeometry {
  readonly type:
    'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon';
  readonly coordinates: unknown;
}

export interface GeoJsonGeometryCollection {
  readonly type: 'GeometryCollection';
  readonly geometries: readonly GeoJsonGeometry[];
}

export type GeoJsonGeometry = GeoJsonCoordinateGeometry | GeoJsonGeometryCollection;

export interface GeoJsonFeature {
  readonly type: 'Feature';
  readonly id?: string | number;
  readonly properties?: Readonly<Record<string, unknown>> | null;
  readonly geometry: GeoJsonGeometry | null;
}

export interface GeoJsonFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly features: readonly GeoJsonFeature[];
}

export interface TopologyTransform {
  readonly scale: readonly [number, number];
  readonly translate: readonly [number, number];
}

export interface TopologyObject {
  readonly type: string;
  readonly arcs?: unknown;
  readonly coordinates?: unknown;
  readonly geometries?: readonly TopologyObject[];
  readonly id?: string | number;
  readonly properties?: Readonly<Record<string, unknown>>;
}

export interface Topology {
  readonly type: 'Topology';
  readonly arcs: readonly (readonly GeographicPosition[])[];
  readonly objects: Readonly<Record<string, TopologyObject>>;
  readonly transform?: TopologyTransform;
}

function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GraflumeError('INVALID_DATA', `${path} must be a finite number.`, { path });
  }
  return value;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function longitude(value: unknown, path: string): number {
  const resolved = finite(value, path);
  if (resolved < -540 || resolved > 540)
    throw new GraflumeError('INVALID_DATA', `${path} is outside the supported longitude range.`);
  return resolved;
}

function latitude(value: unknown, path: string): number {
  const resolved = finite(value, path);
  if (resolved < -90 || resolved > 90)
    throw new GraflumeError('INVALID_DATA', `${path} must be from -90 to 90.`);
  return resolved;
}

export function wrapLongitude(value: number): number {
  const finiteValue = longitude(value, '$.longitude');
  return ((((finiteValue + 180) % 360) + 360) % 360) - 180;
}

function position(value: unknown, path: string): GeographicPosition {
  if (!Array.isArray(value) || value.length < 2)
    throw new GraflumeError('INVALID_DATA', `${path} must be [longitude, latitude].`, { path });
  return [longitude(value[0], `${path}[0]`), latitude(value[1], `${path}[1]`)];
}

function positions(value: unknown, depth: number, path: string): unknown {
  if (depth === 0) return position(value, path);
  if (!Array.isArray(value))
    throw new GraflumeError('INVALID_DATA', `${path} must be an array.`, { path });
  return value.map((entry, index) => positions(entry, depth - 1, `${path}[${index}]`));
}

function normalizeGeometry(value: unknown, path: string): GeoJsonGeometry {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new GraflumeError('INVALID_DATA', `${path} must be a GeoJSON geometry.`);
  const candidate = value as {
    readonly type?: unknown;
    readonly coordinates?: unknown;
    readonly geometries?: unknown;
  };
  if (candidate.type === 'GeometryCollection') {
    if (!Array.isArray(candidate.geometries))
      throw new GraflumeError('INVALID_DATA', `${path}.geometries must be an array.`, {
        path: `${path}.geometries`,
      });
    return {
      type: 'GeometryCollection',
      geometries: candidate.geometries.map((geometry, index) =>
        normalizeGeometry(geometry, `${path}.geometries[${index}]`),
      ),
    };
  }
  const depth = new Map<string, number>([
    ['Point', 0],
    ['MultiPoint', 1],
    ['LineString', 1],
    ['MultiLineString', 2],
    ['Polygon', 2],
    ['MultiPolygon', 3],
  ]).get(String(candidate.type));
  if (depth === undefined) throw new GraflumeError('INVALID_DATA', `${path}.type is unsupported.`);
  return {
    type: candidate.type as GeoJsonCoordinateGeometry['type'],
    coordinates: positions(candidate.coordinates, depth, `${path}.coordinates`),
  };
}

/** Validates GeoJSON and returns a closed, normalized FeatureCollection. */
export function normalizeGeoJson(value: unknown): GeoJsonFeatureCollection {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new GraflumeError('INVALID_DATA', 'GeoJSON must be an object.');
  const candidate = value as {
    readonly type?: unknown;
    readonly features?: unknown;
    readonly geometry?: unknown;
    readonly properties?: unknown;
    readonly id?: unknown;
  };
  const inputs =
    candidate.type === 'FeatureCollection'
      ? Array.isArray(candidate.features)
        ? candidate.features
        : (() => {
            throw new GraflumeError('INVALID_DATA', '$.features must be an array.');
          })()
      : [
          candidate.type === 'Feature'
            ? candidate
            : { type: 'Feature', geometry: candidate, properties: null },
        ];
  const features = inputs.map((entry, index): GeoJsonFeature => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry))
      throw new GraflumeError('INVALID_DATA', `$.features[${index}] must be an object.`);
    const feature = entry as {
      readonly type?: unknown;
      readonly id?: unknown;
      readonly properties?: unknown;
      readonly geometry?: unknown;
    };
    if (feature.type !== 'Feature')
      throw new GraflumeError('INVALID_DATA', `$.features[${index}].type must be Feature.`);
    const properties =
      feature.properties == null
        ? null
        : typeof feature.properties === 'object' && !Array.isArray(feature.properties)
          ? (feature.properties as Readonly<Record<string, unknown>>)
          : (() => {
              throw new GraflumeError(
                'INVALID_DATA',
                `$.features[${index}].properties must be an object or null.`,
              );
            })();
    return {
      type: 'Feature',
      ...(typeof feature.id === 'string' || typeof feature.id === 'number'
        ? { id: feature.id }
        : {}),
      properties,
      geometry:
        feature.geometry === null
          ? null
          : normalizeGeometry(feature.geometry, `$.features[${index}].geometry`),
    };
  });
  return { type: 'FeatureCollection', features };
}

function decodedArcs(topology: Topology): GeographicPosition[][] {
  const transform = topology.transform;
  if (transform !== undefined) {
    transform.scale.forEach((value, index) => finite(value, `$.transform.scale[${index}]`));
    transform.translate.forEach((value, index) => finite(value, `$.transform.translate[${index}]`));
  }
  return topology.arcs.map((arc, arcIndex) => {
    let x = 0;
    let y = 0;
    return arc.map((entry, pointIndex) => {
      if (!Array.isArray(entry) || entry.length < 2)
        throw new GraflumeError(
          'INVALID_DATA',
          `$.arcs[${arcIndex}][${pointIndex}] must be a pair.`,
        );
      if (transform === undefined) return position(entry, `$.arcs[${arcIndex}][${pointIndex}]`);
      x += finite(entry[0], `$.arcs[${arcIndex}][${pointIndex}][0]`);
      y += finite(entry[1], `$.arcs[${arcIndex}][${pointIndex}][1]`);
      return position(
        [
          x * transform.scale[0] + transform.translate[0],
          y * transform.scale[1] + transform.translate[1],
        ],
        `$.arcs[${arcIndex}][${pointIndex}]`,
      );
    });
  });
}

function topoArc(reference: number, arcs: readonly GeographicPosition[][]): GeographicPosition[] {
  const index = reference < 0 ? ~reference : reference;
  const arc = arcs[index];
  if (arc === undefined)
    throw new GraflumeError('INVALID_DATA', `Topology references unknown arc ${reference}.`);
  return reference < 0 ? [...arc].reverse() : [...arc];
}

function joinTopoArcs(
  references: unknown,
  arcs: readonly GeographicPosition[][],
  path: string,
): GeographicPosition[] {
  if (!Array.isArray(references))
    throw new GraflumeError('INVALID_DATA', `${path} must be an arc array.`);
  const output: GeographicPosition[] = [];
  references.forEach((reference, index) => {
    if (!Number.isInteger(reference))
      throw new GraflumeError('INVALID_DATA', `${path}[${index}] must be an integer.`);
    const arc = topoArc(reference as number, arcs);
    output.push(...(output.length === 0 ? arc : arc.slice(1)));
  });
  return output;
}

function topologyGeometry(
  object: TopologyObject,
  arcs: readonly GeographicPosition[][],
  path: string,
): GeoJsonFeature[] {
  if (object.type === 'GeometryCollection') {
    if (!Array.isArray(object.geometries))
      throw new GraflumeError('INVALID_DATA', `${path}.geometries must be an array.`);
    return object.geometries.flatMap((geometry, index) =>
      topologyGeometry(geometry, arcs, `${path}.geometries[${index}]`),
    );
  }
  let geometry: GeoJsonGeometry;
  if (object.type === 'Point')
    geometry = { type: 'Point', coordinates: position(object.coordinates, `${path}.coordinates`) };
  else if (object.type === 'MultiPoint')
    geometry = {
      type: 'MultiPoint',
      coordinates: positions(object.coordinates, 1, `${path}.coordinates`),
    };
  else if (object.type === 'LineString')
    geometry = { type: 'LineString', coordinates: joinTopoArcs(object.arcs, arcs, `${path}.arcs`) };
  else if (object.type === 'MultiLineString') {
    if (!Array.isArray(object.arcs))
      throw new GraflumeError('INVALID_DATA', `${path}.arcs must be an array.`);
    geometry = {
      type: 'MultiLineString',
      coordinates: object.arcs.map((references, index) =>
        joinTopoArcs(references, arcs, `${path}.arcs[${index}]`),
      ),
    };
  } else if (object.type === 'Polygon') {
    if (!Array.isArray(object.arcs))
      throw new GraflumeError('INVALID_DATA', `${path}.arcs must be an array.`);
    geometry = {
      type: 'Polygon',
      coordinates: object.arcs.map((references, index) =>
        joinTopoArcs(references, arcs, `${path}.arcs[${index}]`),
      ),
    };
  } else if (object.type === 'MultiPolygon') {
    if (!Array.isArray(object.arcs))
      throw new GraflumeError('INVALID_DATA', `${path}.arcs must be an array.`);
    geometry = {
      type: 'MultiPolygon',
      coordinates: object.arcs.map((polygon, polygonIndex) => {
        if (!Array.isArray(polygon))
          throw new GraflumeError(
            'INVALID_DATA',
            `${path}.arcs[${polygonIndex}] must be an array.`,
          );
        return polygon.map((references, ringIndex) =>
          joinTopoArcs(references, arcs, `${path}.arcs[${polygonIndex}][${ringIndex}]`),
        );
      }),
    };
  } else throw new GraflumeError('INVALID_DATA', `${path}.type is unsupported.`);
  return [
    {
      type: 'Feature',
      ...(object.id === undefined ? {} : { id: object.id }),
      properties: object.properties ?? null,
      geometry,
    },
  ];
}

/** Decodes delta/arcs/reversed-arcs TopoJSON into normalized GeoJSON features. */
export function topologyToGeoJson(
  topology: Topology,
  objectName?: string,
): GeoJsonFeatureCollection {
  if (topology.type !== 'Topology')
    throw new GraflumeError('INVALID_DATA', 'Topology type must be Topology.');
  const arcs = decodedArcs(topology);
  const names = objectName === undefined ? Object.keys(topology.objects) : [objectName];
  const features = names.flatMap((name) => {
    const object = topology.objects[name];
    if (object === undefined)
      throw new GraflumeError('INVALID_SPEC', `Unknown topology object "${name}".`);
    return topologyGeometry(object, arcs, `$.objects.${name}`);
  });
  return normalizeGeoJson({ type: 'FeatureCollection', features });
}

export interface MapProjectionOptions {
  readonly name?: MapProjectionName;
  readonly rotate?: readonly [number, number];
  readonly clip?: readonly [number, number, number, number];
}

export interface MapProjectionState {
  readonly name: MapProjectionName;
  readonly rotate?: readonly [number, number];
  readonly clip?: readonly [number, number, number, number];
}

/** Closes and snapshots the mutable input used by the persistent map runtime. */
export function normalizeMapProjection(
  value: MapProjectionOptions = {},
  path = '$.projection',
): MapProjectionState {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new GraflumeError('INVALID_SPEC', `${path} must be an object.`, { path });
  const unknown = Object.keys(value).find((key) => !['name', 'rotate', 'clip'].includes(key));
  if (unknown !== undefined)
    throw new GraflumeError('INVALID_SPEC', `Unknown map projection property "${unknown}".`, {
      path: `${path}.${unknown}`,
    });
  const name = value.name ?? 'equirectangular';
  if (!['equirectangular', 'mercator', 'orthographic'].includes(name))
    throw new GraflumeError('INVALID_SPEC', `${path}.name is unsupported.`, {
      path: `${path}.name`,
    });
  let rotate: readonly [number, number] | undefined;
  if (value.rotate !== undefined) {
    if (!Array.isArray(value.rotate) || value.rotate.length !== 2)
      throw new GraflumeError('INVALID_SPEC', `${path}.rotate must be [longitude, latitude].`, {
        path: `${path}.rotate`,
      });
    rotate = Object.freeze([
      longitude(value.rotate[0], `${path}.rotate[0]`),
      latitude(value.rotate[1], `${path}.rotate[1]`),
    ]);
  }
  let clip: readonly [number, number, number, number] | undefined;
  if (value.clip !== undefined) {
    if (!Array.isArray(value.clip) || value.clip.length !== 4)
      throw new GraflumeError('INVALID_SPEC', `${path}.clip must be [west, south, east, north].`, {
        path: `${path}.clip`,
      });
    const west = longitude(value.clip[0], `${path}.clip[0]`);
    const south = latitude(value.clip[1], `${path}.clip[1]`);
    const east = longitude(value.clip[2], `${path}.clip[2]`);
    const north = latitude(value.clip[3], `${path}.clip[3]`);
    if (west > east || south > north)
      throw new GraflumeError('INVALID_SPEC', `${path}.clip bounds must be ordered.`, {
        path: `${path}.clip`,
      });
    clip = Object.freeze([west, south, east, north]);
  }
  return Object.freeze({
    name,
    ...(rotate === undefined ? {} : { rotate }),
    ...(clip === undefined ? {} : { clip }),
  });
}

export interface ProjectedPosition {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
}

const ANTIMERIDIAN_EPSILON = 1e-9;
const WORLD_CLIP = Object.freeze([-180, -90, 180, 90] as const);
const ORTHOGRAPHIC_HORIZON_CLIP = Object.freeze([-90, -90, 90, 90] as const);

function projectionPosition(
  point: GeographicPosition,
  rotate: readonly [number, number] | undefined,
): GeographicPosition {
  return [
    wrapLongitude(longitude(point[0], '$.point[0]') + (rotate?.[0] ?? 0)),
    clamp(latitude(point[1], '$.point[1]') + (rotate?.[1] ?? 0), -90, 90),
  ];
}

function effectiveGeographicClip(
  clip: readonly [number, number, number, number],
): readonly [number, number, number, number] | null {
  const west = Math.max(-180, clip[0]);
  const south = Math.max(-90, clip[1]);
  const east = Math.min(180, clip[2]);
  const north = Math.min(90, clip[3]);
  return west > east || south > north ? null : [west, south, east, north];
}

function effectiveProjectionClip(
  projection: MapProjectionState,
): readonly [number, number, number, number] | null {
  const base = projection.name === 'orthographic' ? ORTHOGRAPHIC_HORIZON_CLIP : WORLD_CLIP;
  const authored = projection.clip ?? WORLD_CLIP;
  return effectiveGeographicClip([
    Math.max(base[0], authored[0]),
    Math.max(base[1], authored[1]),
    Math.min(base[2], authored[2]),
    Math.min(base[3], authored[3]),
  ]);
}

function sameGeographicPosition(left: GeographicPosition, right: GeographicPosition): boolean {
  return Math.abs(left[0] - right[0]) <= 1e-10 && Math.abs(left[1] - right[1]) <= 1e-10;
}

function appendGeographicPosition(output: GeographicPosition[], point: GeographicPosition): void {
  if (output.length === 0 || !sameGeographicPosition(output[output.length - 1]!, point))
    output.push(point);
}

function projectionSafeLongitude(value: number): number {
  return Math.abs(value - 180) <= 1e-10 ? 180 - ANTIMERIDIAN_EPSILON : value;
}

/**
 * Splits a wrapped geographic line at the antimeridian. Returned positions have already had
 * projection rotation applied, so callers must project them without applying rotation again.
 */
function splitAntimeridianLine(points: readonly GeographicPosition[]): GeographicPosition[][] {
  if (points.length === 0) return [];
  const paths: GeographicPosition[][] = [];
  let current: GeographicPosition[] = [points[0]!];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const next = points[index]!;
    const delta = next[0] - previous[0];
    if (Math.abs(delta) <= 180) {
      appendGeographicPosition(current, next);
      continue;
    }
    const crossesEast = delta < -180;
    const unwrappedNext = next[0] + (crossesEast ? 360 : -360);
    const boundary = crossesEast ? 180 : -180;
    const denominator = unwrappedNext - previous[0];
    const t = denominator === 0 ? 0 : (boundary - previous[0]) / denominator;
    const latitudeAtBoundary = previous[1] + (next[1] - previous[1]) * t;
    appendGeographicPosition(current, [
      crossesEast ? 180 - ANTIMERIDIAN_EPSILON : -180,
      latitudeAtBoundary,
    ]);
    if (current.length > 1) paths.push(current);
    current = [[crossesEast ? -180 : 180 - ANTIMERIDIAN_EPSILON, latitudeAtBoundary]];
    appendGeographicPosition(current, next);
  }
  if (current.length > 1) paths.push(current);
  return paths;
}

function liangBarskySegment(
  start: GeographicPosition,
  end: GeographicPosition,
  clip: readonly [number, number, number, number],
): readonly [GeographicPosition, GeographicPosition] | null {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const p = [-dx, dx, -dy, dy];
  const q = [start[0] - clip[0], clip[2] - start[0], start[1] - clip[1], clip[3] - start[1]];
  let enter = 0;
  let exit = 1;
  for (let index = 0; index < 4; index += 1) {
    const direction = p[index]!;
    const distance = q[index]!;
    if (Math.abs(direction) <= Number.EPSILON) {
      if (distance < 0) return null;
      continue;
    }
    const ratio = distance / direction;
    if (direction < 0) enter = Math.max(enter, ratio);
    else exit = Math.min(exit, ratio);
    if (enter > exit) return null;
  }
  const interpolate = (amount: number): GeographicPosition => [
    projectionSafeLongitude(start[0] + dx * amount),
    start[1] + dy * amount,
  ];
  return [interpolate(enter), interpolate(exit)];
}

function clipLinePath(
  points: readonly GeographicPosition[],
  clip: readonly [number, number, number, number],
): GeographicPosition[][] {
  const paths: GeographicPosition[][] = [];
  let current: GeographicPosition[] = [];
  const flush = () => {
    if (current.length > 1) paths.push(current);
    current = [];
  };
  for (let index = 1; index < points.length; index += 1) {
    const segment = liangBarskySegment(points[index - 1]!, points[index]!, clip);
    if (segment === null) {
      flush();
      continue;
    }
    if (current.length > 0 && !sameGeographicPosition(current[current.length - 1]!, segment[0]))
      flush();
    appendGeographicPosition(current, segment[0]);
    appendGeographicPosition(current, segment[1]);
  }
  flush();
  return paths;
}

/**
 * Applies projection rotation/wrap, antimeridian splitting, and rectangular Liang-Barsky
 * clipping. Orthographic paths are intersected with the visible hemisphere before projection,
 * so a segment crossing the horizon keeps its exact boundary point instead of disappearing.
 * Boundary intersections are retained and disjoint visible runs remain subpaths.
 */
export function clipMapLine(
  points: readonly GeographicPosition[],
  options: MapProjectionOptions = {},
): readonly (readonly GeographicPosition[])[] {
  const projection = normalizeMapProjection(options);
  const split = splitAntimeridianLine(
    points.map((point) => projectionPosition(point, projection.rotate)),
  );
  if (projection.clip === undefined && projection.name !== 'orthographic') return split;
  const clip = effectiveProjectionClip(projection);
  return clip === null ? [] : split.flatMap((path) => clipLinePath(path, clip));
}

type PolygonBoundary = {
  readonly inside: (point: GeographicPosition) => boolean;
  readonly intersect: (start: GeographicPosition, end: GeographicPosition) => GeographicPosition;
};

function clipPolygonBoundary(
  input: readonly GeographicPosition[],
  boundary: PolygonBoundary,
): GeographicPosition[] {
  if (input.length === 0) return [];
  const output: GeographicPosition[] = [];
  let start = input[input.length - 1]!;
  let startInside = boundary.inside(start);
  for (const end of input) {
    const endInside = boundary.inside(end);
    if (endInside) {
      if (!startInside) appendGeographicPosition(output, boundary.intersect(start, end));
      appendGeographicPosition(output, end);
    } else if (startInside) appendGeographicPosition(output, boundary.intersect(start, end));
    start = end;
    startInside = endInside;
  }
  if (output.length > 1 && sameGeographicPosition(output[0]!, output[output.length - 1]!))
    output.pop();
  return output;
}

function sutherlandHodgmanRing(
  ring: readonly GeographicPosition[],
  clip: readonly [number, number, number, number],
): GeographicPosition[] {
  const verticalIntersection =
    (longitude: number) =>
    (start: GeographicPosition, end: GeographicPosition): GeographicPosition => {
      const amount = (longitude - start[0]) / (end[0] - start[0]);
      return [projectionSafeLongitude(longitude), start[1] + (end[1] - start[1]) * amount];
    };
  const horizontalIntersection =
    (latitude: number) =>
    (start: GeographicPosition, end: GeographicPosition): GeographicPosition => {
      const amount = (latitude - start[1]) / (end[1] - start[1]);
      return [projectionSafeLongitude(start[0] + (end[0] - start[0]) * amount), latitude];
    };
  const boundaries: readonly PolygonBoundary[] = [
    { inside: ([lon]) => lon >= clip[0], intersect: verticalIntersection(clip[0]) },
    { inside: ([lon]) => lon <= clip[2], intersect: verticalIntersection(clip[2]) },
    { inside: ([, lat]) => lat >= clip[1], intersect: horizontalIntersection(clip[1]) },
    { inside: ([, lat]) => lat <= clip[3], intersect: horizontalIntersection(clip[3]) },
  ];
  return boundaries.reduce(clipPolygonBoundary, [...ring]);
}

function unwrapPolygonRing(points: readonly GeographicPosition[]): GeographicPosition[] {
  if (points.length === 0) return [];
  const output: GeographicPosition[] = [points[0]!];
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]!;
    const previous = output[output.length - 1]!;
    let longitude = point[0];
    while (longitude - previous[0] > 180) longitude -= 360;
    while (longitude - previous[0] < -180) longitude += 360;
    appendGeographicPosition(output, [longitude, point[1]]);
  }
  if (output.length > 1 && sameGeographicPosition(output[0]!, output[output.length - 1]!))
    output.pop();
  return output;
}

/**
 * Applies projection rotation/wrap and Sutherland-Hodgman clipping to a polygon ring. A ring
 * crossing the antimeridian can return two scene-ready rings, one beside each world edge.
 */
export function clipMapPolygonRing(
  points: readonly GeographicPosition[],
  options: MapProjectionOptions = {},
): readonly (readonly GeographicPosition[])[] {
  const projection = normalizeMapProjection(options);
  const clip = effectiveProjectionClip(projection);
  if (clip === null) return [];
  const transformed = points.map((point) => projectionPosition(point, projection.rotate));
  const ring = unwrapPolygonRing(transformed);
  if (ring.length < 3) return [];
  const longitudes = ring.map(([lon]) => lon);
  const minimumLongitude = Math.min(...longitudes);
  const maximumLongitude = Math.max(...longitudes);
  const minimumShift = Math.ceil((clip[0] - maximumLongitude) / 360);
  const maximumShift = Math.floor((clip[2] - minimumLongitude) / 360);
  const output: GeographicPosition[][] = [];
  const keys = new Set<string>();
  for (let shift = minimumShift; shift <= maximumShift; shift += 1) {
    const shifted = ring.map(([lon, lat]) => [lon + shift * 360, lat] as GeographicPosition);
    const clipped = sutherlandHodgmanRing(shifted, clip);
    if (clipped.length < 3) continue;
    const normalized = clipped.map(
      ([lon, lat]) => [projectionSafeLongitude(lon), lat] as GeographicPosition,
    );
    const key = normalized.map(([lon, lat]) => `${lon.toFixed(9)},${lat.toFixed(9)}`).join(';');
    if (!keys.has(key)) {
      keys.add(key);
      output.push(normalized);
    }
  }
  return output;
}

/** Projects longitude/latitude with rotation, clipping and back-face visibility. */
export function projectMapPosition(
  point: GeographicPosition,
  options: MapProjectionOptions = {},
): ProjectedPosition {
  const projection = normalizeMapProjection(options);
  let [lon, lat] = projectionPosition(point, projection.rotate);
  const clip = projection.clip;
  const insideClip =
    clip === undefined || (lon >= clip[0] && lon <= clip[2] && lat >= clip[1] && lat <= clip[3]);
  const name = projection.name;
  if (name === 'mercator') {
    lat = clamp(lat, -85.05112878, 85.05112878);
    return {
      x: (lon + 180) / 360,
      y: (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2,
      visible: insideClip,
    };
  }
  if (name === 'orthographic') {
    const lambda = (lon * Math.PI) / 180;
    const phi = (lat * Math.PI) / 180;
    const cosine = Math.cos(phi) * Math.cos(lambda);
    return {
      x: 0.5 + Math.cos(phi) * Math.sin(lambda) * 0.5,
      y: 0.5 - Math.sin(phi) * 0.5,
      visible: insideClip && cosine >= 0,
    };
  }
  return { x: (lon + 180) / 360, y: (90 - lat) / 180, visible: insideClip };
}

function geometryPositions(geometry: GeoJsonGeometry): GeographicPosition[] {
  if (geometry.type === 'GeometryCollection') return geometry.geometries.flatMap(geometryPositions);
  const depth = new Map<GeoJsonGeometry['type'], number>([
    ['Point', 0],
    ['MultiPoint', 1],
    ['LineString', 1],
    ['MultiLineString', 2],
    ['Polygon', 2],
    ['MultiPolygon', 3],
  ]).get(geometry.type)!;
  const flatten = (value: unknown, current: number): GeographicPosition[] =>
    current === 0
      ? [value as GeographicPosition]
      : (value as unknown[]).flatMap((entry) => flatten(entry, current - 1));
  return flatten(geometry.coordinates, depth);
}

export interface MapBounds {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}

/** Computes geographic bounds, choosing the shorter dateline-wrapped span. */
export function mapBounds(collection: GeoJsonFeatureCollection): MapBounds {
  const points = collection.features.flatMap(({ geometry }) =>
    geometry === null ? [] : geometryPositions(geometry),
  );
  if (points.length === 0)
    throw new GraflumeError('INVALID_DATA', 'Cannot fit an empty map source.');
  const latitudes = points.map(([, lat]) => lat);
  const longitudes = points.map(([lon]) => wrapLongitude(lon)).sort((a, b) => a - b);
  let largestGap = -1;
  let gapIndex = 0;
  for (let index = 0; index < longitudes.length; index += 1) {
    const current = longitudes[index]!;
    const next = index + 1 < longitudes.length ? longitudes[index + 1]! : longitudes[0]! + 360;
    if (next - current > largestGap) {
      largestGap = next - current;
      gapIndex = index;
    }
  }
  const west = longitudes[(gapIndex + 1) % longitudes.length]!;
  let east = longitudes[gapIndex]!;
  if (east < west) east += 360;
  return { west, south: Math.min(...latitudes), east, north: Math.max(...latitudes) };
}

export interface MapFit {
  readonly center: GeographicPosition;
  readonly zoom: number;
  readonly bounds: MapBounds;
}

/** Fits bounds into a viewport with padding using an explicit projection. */
export function fitMapBounds(
  bounds: MapBounds,
  viewport: { readonly width: number; readonly height: number },
  padding = 20,
  projection: MapProjectionName = 'mercator',
): MapFit {
  const width = finite(viewport.width, '$.viewport.width');
  const height = finite(viewport.height, '$.viewport.height');
  if (width <= padding * 2 || height <= padding * 2)
    throw new GraflumeError('INVALID_SPEC', 'Map viewport must exceed its padding.');
  const west = longitude(bounds.west, '$.bounds.west');
  const east = longitude(bounds.east, '$.bounds.east');
  const south = latitude(bounds.south, '$.bounds.south');
  const north = latitude(bounds.north, '$.bounds.north');
  if (west > east || south > north)
    throw new GraflumeError('INVALID_SPEC', '$.bounds must be ordered.');
  const longitudeSpan = Math.min(360, east - west);
  const centerLon = wrapLongitude((west + east) / 2);
  const centerLat = (south + north) / 2;
  const latitudeProjection = [
    projectMapPosition([0, south], { name: projection }),
    projectMapPosition([0, north], { name: projection }),
  ];
  const spanX = Math.max(
    1e-9,
    projection === 'orthographic'
      ? longitudeSpan >= 180
        ? 1
        : Math.abs(
            projectMapPosition([longitudeSpan / 2, centerLat], { name: projection }).x -
              projectMapPosition([-longitudeSpan / 2, centerLat], { name: projection }).x,
          )
      : longitudeSpan / 360,
  );
  const spanY = Math.max(1e-9, Math.abs(latitudeProjection[1]!.y - latitudeProjection[0]!.y));
  const scale = Math.min(
    (width - padding * 2) / (width * spanX),
    (height - padding * 2) / (height * spanY),
  );
  return {
    center: [centerLon, centerLat],
    zoom: Math.log2(Math.max(scale, Number.EPSILON)),
    bounds,
  };
}

/** Great-circle route interpolation with dateline-safe spherical linear interpolation. */
export function geodesicPath(
  start: GeographicPosition,
  end: GeographicPosition,
  segments = 64,
): readonly GeographicPosition[] {
  const count = Math.floor(finite(segments, '$.segments'));
  if (count < 1 || count > 10_000)
    throw new GraflumeError('INVALID_SPEC', '$.segments must be from 1 to 10000.');
  const vector = ([lon, lat]: GeographicPosition) => {
    const lambda = (lon * Math.PI) / 180;
    const phi = (lat * Math.PI) / 180;
    return [
      Math.cos(phi) * Math.cos(lambda),
      Math.cos(phi) * Math.sin(lambda),
      Math.sin(phi),
    ] as const;
  };
  const a = vector(start);
  const b = vector(end);
  const omega = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
  return Array.from({ length: count + 1 }, (_, index) => {
    const t = index / count;
    const denominator = Math.sin(omega);
    const left = omega < 1e-12 ? 1 - t : Math.sin((1 - t) * omega) / denominator;
    const right = omega < 1e-12 ? t : Math.sin(t * omega) / denominator;
    const x = a[0] * left + b[0] * right;
    const y = a[1] * left + b[1] * right;
    const z = a[2] * left + b[2] * right;
    return [
      wrapLongitude((Math.atan2(y, x) * 180) / Math.PI),
      (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI,
    ] as const;
  });
}

/** Generates longitude/latitude graticules as ordinary map line features. */
export function mapGraticule(step: readonly [number, number] = [30, 30]): GeoJsonFeatureCollection {
  const lonStep = finite(step[0], '$.step[0]');
  const latStep = finite(step[1], '$.step[1]');
  if (lonStep <= 0 || latStep <= 0)
    throw new GraflumeError('INVALID_SPEC', 'Graticule steps must be positive.');
  const features: GeoJsonFeature[] = [];
  for (let lon = -180; lon <= 180; lon += lonStep)
    features.push({
      type: 'Feature',
      properties: { kind: 'longitude', value: lon },
      geometry: {
        type: 'LineString',
        coordinates: Array.from({ length: 181 }, (_, index) => [lon, -90 + index] as const),
      },
    });
  for (let lat = -90 + latStep; lat < 90; lat += latStep)
    features.push({
      type: 'Feature',
      properties: { kind: 'latitude', value: lat },
      geometry: {
        type: 'LineString',
        coordinates: Array.from({ length: 361 }, (_, index) => [-180 + index, lat] as const),
      },
    });
  return { type: 'FeatureCollection', features };
}

export interface MapLayerDefinition {
  readonly id: string;
  readonly source: string;
  readonly type: 'fill' | 'line' | 'circle' | 'symbol' | 'raster';
  readonly visible?: boolean;
  readonly minimumZoom?: number;
  readonly maximumZoom?: number;
  readonly attribution?: string;
}

/** Closed source/layer lifecycle with explicit ordering and visibility. */
export class MapLayerRegistry {
  readonly #sources = new Map<string, GeoJsonFeatureCollection | TileSourceDefinition>();
  readonly #layers: MapLayerDefinition[] = [];
  #revision = 0;

  addSource(id: string, source: GeoJsonFeatureCollection | TileSourceDefinition): void {
    const normalized = id.trim();
    if (normalized === '' || this.#sources.has(normalized))
      throw new GraflumeError('INVALID_SPEC', `Map source "${id}" is empty or already registered.`);
    this.#sources.set(normalized, source);
    this.#revision += 1;
  }

  removeSource(id: string): void {
    if (this.#layers.some(({ source }) => source === id))
      throw new GraflumeError('INVALID_SPEC', `Map source "${id}" is still used by a layer.`);
    if (!this.#sources.delete(id))
      throw new GraflumeError('INVALID_SPEC', `Unknown map source "${id}".`);
    this.#revision += 1;
  }

  addLayer(layer: MapLayerDefinition, before?: string): void {
    if (this.#layers.some(({ id }) => id === layer.id))
      throw new GraflumeError('INVALID_SPEC', `Duplicate map layer "${layer.id}".`);
    if (!this.#sources.has(layer.source))
      throw new GraflumeError('INVALID_SPEC', `Unknown map source "${layer.source}".`);
    const index =
      before === undefined
        ? this.#layers.length
        : this.#layers.findIndex(({ id }) => id === before);
    if (index < 0) throw new GraflumeError('INVALID_SPEC', `Unknown before-layer "${before}".`);
    this.#layers.splice(index, 0, Object.freeze({ ...layer }));
    this.#revision += 1;
  }

  removeLayer(id: string): void {
    const index = this.#layers.findIndex((layer) => layer.id === id);
    if (index < 0) throw new GraflumeError('INVALID_SPEC', `Unknown map layer "${id}".`);
    this.#layers.splice(index, 1);
    this.#revision += 1;
  }

  setVisibility(id: string, visible: boolean): void {
    const index = this.#layers.findIndex((layer) => layer.id === id);
    if (index < 0) throw new GraflumeError('INVALID_SPEC', `Unknown map layer "${id}".`);
    this.#layers[index] = Object.freeze({ ...this.#layers[index]!, visible });
    this.#revision += 1;
  }

  source(id: string): GeoJsonFeatureCollection | TileSourceDefinition | null {
    return this.#sources.get(id) ?? null;
  }

  layer(id: string): MapLayerDefinition | null {
    return this.#layers.find((layer) => layer.id === id) ?? null;
  }

  snapshot(): {
    readonly revision: number;
    readonly sources: readonly string[];
    readonly layers: readonly MapLayerDefinition[];
    readonly attributions: readonly string[];
  } {
    return Object.freeze({
      revision: this.#revision,
      sources: Object.freeze([...this.#sources.keys()]),
      layers: Object.freeze(this.#layers.map((layer) => Object.freeze({ ...layer }))),
      attributions: Object.freeze([
        ...new Set(
          this.#layers.flatMap(({ attribution }) =>
            attribution === undefined ? [] : [attribution],
          ),
        ),
      ]),
    });
  }
}

export interface TileSourceDefinition {
  readonly type: 'raster' | 'vector';
  readonly template: string;
  readonly attribution: string;
  readonly minimumZoom?: number;
  readonly maximumZoom?: number;
  readonly tileSize?: 256 | 512;
  readonly subdomains?: readonly string[];
}

export interface TileCoordinate {
  readonly z: number;
  readonly x: number;
  readonly y: number;
}
export interface TileResponse {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  readonly expiresAt?: number;
}
export type TileFetcher = (url: string, signal: AbortSignal) => Promise<TileResponse>;

export interface MapTileManagerOptions {
  readonly maximumEntries?: number;
  readonly maximumConcurrent?: number;
  readonly fetcher?: TileFetcher;
}

function normalizeTile(tile: TileCoordinate): TileCoordinate {
  const z = Math.floor(finite(tile.z, '$.tile.z'));
  const x = Math.floor(finite(tile.x, '$.tile.x'));
  const y = Math.floor(finite(tile.y, '$.tile.y'));
  if (z < 0 || z > 24) throw new GraflumeError('INVALID_SPEC', 'Tile zoom must be from 0 to 24.');
  const count = 2 ** z;
  if (y < 0 || y >= count)
    throw new GraflumeError('INVALID_SPEC', 'Tile y is outside the zoom pyramid.');
  return { z, x: ((x % count) + count) % count, y };
}

export function tileUrl(source: TileSourceDefinition, tile: TileCoordinate): string {
  const normalized = normalizeTile(tile);
  if (
    !source.template.includes('{z}') ||
    !source.template.includes('{x}') ||
    !source.template.includes('{y}')
  )
    throw new GraflumeError('INVALID_SPEC', 'Tile template must contain {z}, {x}, and {y}.');
  const subdomains = source.subdomains ?? [];
  const subdomain =
    subdomains.length === 0 ? '' : subdomains[(normalized.x + normalized.y) % subdomains.length]!;
  return source.template
    .replaceAll('{z}', String(normalized.z))
    .replaceAll('{x}', String(normalized.x))
    .replaceAll('{y}', String(normalized.y))
    .replaceAll('{s}', subdomain);
}

/** Provider-backed tile loader with request deduplication, abort, bounded LRU cache, expiry and attribution. */
export class MapTileManager {
  readonly #source: TileSourceDefinition;
  readonly #fetcher: TileFetcher;
  readonly #maximumEntries: number;
  readonly #maximumConcurrent: number;
  readonly #cache = new Map<string, TileResponse>();
  readonly #pending = new Map<string, Promise<TileResponse>>();
  readonly #controllers = new Map<string, AbortController>();
  #destroyed = false;

  constructor(
    source: TileSourceDefinition,
    fetcher: TileFetcher,
    maximumEntries = 128,
    maximumConcurrent = 8,
  ) {
    if (source.attribution.trim() === '')
      throw new GraflumeError('INVALID_SPEC', 'Provider-backed tiles require attribution.');
    this.#source = Object.freeze({ ...source });
    this.#fetcher = fetcher;
    this.#maximumEntries = Math.floor(finite(maximumEntries, '$.maximumEntries'));
    if (this.#maximumEntries < 1 || this.#maximumEntries > 4_096)
      throw new GraflumeError('INVALID_SPEC', '$.maximumEntries must be from 1 to 4096.');
    this.#maximumConcurrent = Math.floor(finite(maximumConcurrent, '$.maximumConcurrent'));
    if (this.#maximumConcurrent < 1 || this.#maximumConcurrent > 64)
      throw new GraflumeError('INVALID_SPEC', '$.maximumConcurrent must be from 1 to 64.');
  }

  get attribution(): string {
    return this.#source.attribution;
  }

  async load(tile: TileCoordinate, signal?: AbortSignal): Promise<TileResponse> {
    if (this.#destroyed)
      throw new GraflumeError('INVALID_DATA', 'Map tile manager has been destroyed.');
    const url = tileUrl(this.#source, tile);
    const cached = this.#cache.get(url);
    if (cached !== undefined && (cached.expiresAt === undefined || cached.expiresAt > Date.now())) {
      this.#cache.delete(url);
      this.#cache.set(url, cached);
      return cached;
    }
    this.#cache.delete(url);
    const existing = this.#pending.get(url);
    if (existing !== undefined) return existing;
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted === true) controller.abort(signal.reason);
    else signal?.addEventListener('abort', abort, { once: true });
    const request = this.#fetcher(url, controller.signal)
      .then((response) => {
        if (
          !(response.bytes instanceof Uint8Array) ||
          response.bytes.length === 0 ||
          response.mimeType.trim() === ''
        )
          throw new GraflumeError('INVALID_DATA', 'Tile provider returned an invalid response.');
        const frozen = Object.freeze({ ...response, bytes: response.bytes.slice() });
        this.#cache.set(url, frozen);
        while (this.#cache.size > this.#maximumEntries)
          this.#cache.delete(this.#cache.keys().next().value!);
        return frozen;
      })
      .finally(() => {
        signal?.removeEventListener('abort', abort);
        this.#pending.delete(url);
        this.#controllers.delete(url);
      });
    this.#pending.set(url, request);
    this.#controllers.set(url, controller);
    return request;
  }

  /** Loads a bounded tile set with stable output order and explicit concurrency. */
  async loadMany(
    tiles: readonly TileCoordinate[],
    signal?: AbortSignal,
  ): Promise<readonly TileResponse[]> {
    if (tiles.length > this.#maximumEntries * 4)
      throw new GraflumeError(
        'INVALID_SPEC',
        `Tile batch has ${tiles.length} entries; the bounded limit is ${this.#maximumEntries * 4}.`,
      );
    const output = new Array<TileResponse>(tiles.length);
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < tiles.length) {
        const index = cursor;
        cursor += 1;
        output[index] = await this.load(tiles[index]!, signal);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(this.#maximumConcurrent, tiles.length) }, () => worker()),
    );
    return Object.freeze(output);
  }

  clear(): void {
    this.#cache.clear();
  }

  /** Aborts every provider request and permanently releases this manager. */
  destroy(reason: unknown = new DOMException('Map tile manager destroyed.', 'AbortError')): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    for (const controller of this.#controllers.values()) controller.abort(reason);
    this.#controllers.clear();
    this.#pending.clear();
    this.#cache.clear();
  }

  state(): {
    readonly cached: number;
    readonly pending: number;
    readonly maximumEntries: number;
    readonly maximumConcurrent: number;
    readonly destroyed: boolean;
  } {
    return Object.freeze({
      cached: this.#cache.size,
      pending: this.#pending.size,
      maximumEntries: this.#maximumEntries,
      maximumConcurrent: this.#maximumConcurrent,
      destroyed: this.#destroyed,
    });
  }
}

/** Default browser/server fetch adapter with cache expiry derived from response headers. */
export const fetchMapTile: TileFetcher = async (url, signal) => {
  if (typeof fetch !== 'function')
    throw new GraflumeError(
      'UNSUPPORTED_RENDERER',
      'Provider-backed tiles require fetch or an injected TileFetcher.',
    );
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new GraflumeError('INVALID_DATA', `Tile provider returned HTTP ${response.status}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type')?.split(';', 1)[0]?.trim() ?? '';
  const cacheControl = response.headers.get('cache-control') ?? '';
  const maxAge = /(?:^|,)\s*max-age=(\d+)/i.exec(cacheControl)?.[1];
  return {
    bytes,
    mimeType,
    ...(maxAge === undefined ? {} : { expiresAt: Date.now() + Number(maxAge) * 1_000 }),
  };
};

export function createMapTileManager(
  source: TileSourceDefinition,
  options: MapTileManagerOptions = {},
): MapTileManager {
  return new MapTileManager(
    source,
    options.fetcher ?? fetchMapTile,
    options.maximumEntries,
    options.maximumConcurrent,
  );
}

export interface MapRuntimeOptions extends MapTileManagerOptions {
  readonly projection?: MapProjectionOptions;
}

function cloneMapProjection(projection: MapProjectionState): MapProjectionState {
  return Object.freeze({
    name: projection.name,
    ...(projection.rotate === undefined
      ? {}
      : { rotate: Object.freeze([...projection.rotate] as [number, number]) }),
    ...(projection.clip === undefined
      ? {}
      : {
          clip: Object.freeze([...projection.clip] as [number, number, number, number]),
        }),
  });
}

/**
 * Persistent source/layer runtime that binds ordered layer state to real
 * provider requests. It is renderer-neutral and can be shared by custom map
 * controls, server prefetchers, or a Canvas chart lifecycle.
 */
export class MapRuntime {
  readonly layers = new MapLayerRegistry();
  readonly #options: MapRuntimeOptions;
  readonly #managers = new Map<string, MapTileManager>();
  #projection: MapProjectionState;
  #revision = 0;
  #destroyed = false;

  constructor(options: MapRuntimeOptions = {}) {
    const { projection, ...tileOptions } = options;
    this.#options = { ...tileOptions };
    this.#projection = normalizeMapProjection(projection);
  }

  addSource(id: string, source: GeoJsonFeatureCollection | TileSourceDefinition): this {
    this.#assertAlive();
    this.layers.addSource(id, source);
    this.#revision += 1;
    return this;
  }

  removeSource(id: string): this {
    this.#assertAlive();
    this.layers.removeSource(id);
    this.#managers.get(id)?.destroy();
    this.#managers.delete(id);
    this.#revision += 1;
    return this;
  }

  addLayer(layer: MapLayerDefinition, before?: string): this {
    this.#assertAlive();
    this.layers.addLayer(layer, before);
    this.#revision += 1;
    return this;
  }

  removeLayer(id: string): this {
    this.#assertAlive();
    this.layers.removeLayer(id);
    this.#revision += 1;
    return this;
  }

  setVisibility(id: string, visible: boolean): this {
    this.#assertAlive();
    this.layers.setVisibility(id, visible);
    this.#revision += 1;
    return this;
  }

  getProjection(): MapProjectionState {
    return cloneMapProjection(this.#projection);
  }

  setProjection(projection: MapProjectionOptions): this {
    this.#assertAlive();
    const normalized = normalizeMapProjection(projection);
    if (JSON.stringify(normalized) !== JSON.stringify(this.#projection)) {
      this.#projection = normalized;
      this.#revision += 1;
    }
    return this;
  }

  project(point: GeographicPosition): ProjectedPosition {
    this.#assertAlive();
    return projectMapPosition(point, this.#projection);
  }

  async loadLayerTiles(
    layerId: string,
    tiles: readonly TileCoordinate[],
    signal?: AbortSignal,
  ): Promise<readonly TileResponse[]> {
    this.#assertAlive();
    const layer = this.layers.layer(layerId);
    if (layer === null) throw new GraflumeError('INVALID_SPEC', `Unknown map layer "${layerId}".`);
    if (layer.visible === false) return Object.freeze([]);
    const source = this.layers.source(layer.source);
    if (source === null || !('template' in source))
      throw new GraflumeError(
        'INVALID_SPEC',
        `Map layer "${layerId}" is not backed by a tile provider.`,
      );
    let manager = this.#managers.get(layer.source);
    if (manager === undefined) {
      manager = createMapTileManager(source, this.#options);
      this.#managers.set(layer.source, manager);
    }
    return manager.loadMany(tiles, signal);
  }

  snapshot(): {
    readonly destroyed: boolean;
    readonly revision: number;
    readonly projection: MapProjectionState;
    readonly registry: ReturnType<MapLayerRegistry['snapshot']>;
    readonly providers: Readonly<Record<string, ReturnType<MapTileManager['state']>>>;
  } {
    return Object.freeze({
      destroyed: this.#destroyed,
      revision: this.#revision,
      projection: cloneMapProjection(this.#projection),
      registry: this.layers.snapshot(),
      providers: Object.freeze(
        Object.fromEntries([...this.#managers].map(([id, manager]) => [id, manager.state()])),
      ),
    });
  }

  destroy(reason?: unknown): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    for (const manager of this.#managers.values()) manager.destroy(reason);
    this.#managers.clear();
  }

  #assertAlive(): void {
    if (this.#destroyed) throw new GraflumeError('INVALID_DATA', 'Map runtime has been destroyed.');
  }
}

export function createMapRuntime(options: MapRuntimeOptions = {}): MapRuntime {
  return new MapRuntime(options);
}

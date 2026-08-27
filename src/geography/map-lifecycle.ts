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

export type MapScopeLevel = 'country' | 'region' | 'feature';
export type MapScopeValue = string | number | boolean;

/**
 * Function-free feature selection shared by built-in countries and arbitrary
 * GeoJSON/TopoJSON boundary sources. `values` are OR-ed and an optional parent
 * constraint is AND-ed, which covers one or many countries and one or many
 * subdivisions without constructing executable predicates.
 */
export interface MapFeatureScope {
  readonly level?: MapScopeLevel;
  /** GeoJSON property to match, or `$id` for Feature.id. Built-in countries ignore this field. */
  readonly property?: string;
  readonly values: readonly MapScopeValue[];
  readonly parentProperty?: string;
  readonly parentValues?: readonly MapScopeValue[];
  readonly caseSensitive?: boolean;
  /** Reject misspelled requested values by default instead of silently drawing a partial map. */
  readonly unmatched?: 'error' | 'ignore';
  /** Empty results reject by default; `allow` is useful for intentionally empty filtered states. */
  readonly empty?: 'error' | 'allow';
}

export interface NormalizedMapFeatureScope {
  readonly level: MapScopeLevel;
  readonly property: string;
  readonly values: readonly MapScopeValue[];
  readonly parentProperty?: string;
  readonly parentValues?: readonly MapScopeValue[];
  readonly caseSensitive: boolean;
  readonly unmatched: 'error' | 'ignore';
  readonly empty: 'error' | 'allow';
}

export const MAXIMUM_MAP_SCOPE_VALUES = 50_000;

const unsafeMapPropertyNames = new Set(['__proto__', 'prototype', 'constructor']);

function mapScopeProperty(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 256)
    throw new GraflumeError(
      'INVALID_SPEC',
      `${path} must be a non-empty string up to 256 characters.`,
      {
        path,
      },
    );
  const property = value.trim();
  if (property !== '$id' && unsafeMapPropertyNames.has(property))
    throw new GraflumeError('INVALID_SPEC', `${path} is not a safe GeoJSON property.`, { path });
  return property;
}

function mapScopeValues(value: unknown, path: string): readonly MapScopeValue[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAXIMUM_MAP_SCOPE_VALUES)
    throw new GraflumeError(
      'INVALID_SPEC',
      `${path} must contain from 1 to ${MAXIMUM_MAP_SCOPE_VALUES} string, number, or boolean values.`,
      { path },
    );
  const output: MapScopeValue[] = [];
  const keys = new Set<string>();
  value.forEach((entry, index) => {
    if (!(
      typeof entry === 'string' ||
      (typeof entry === 'number' && Number.isFinite(entry)) ||
      typeof entry === 'boolean'
    ))
      throw new GraflumeError(
        'INVALID_SPEC',
        `${path}[${index}] must be a string, finite number, or boolean.`,
        { path: `${path}[${index}]` },
      );
    if (typeof entry === 'string' && entry.length > 512)
      throw new GraflumeError('INVALID_SPEC', `${path}[${index}] is longer than 512 characters.`, {
        path: `${path}[${index}]`,
      });
    const key = `${typeof entry}:${String(entry)}`;
    if (!keys.has(key)) {
      keys.add(key);
      output.push(entry);
    }
  });
  return Object.freeze(output);
}

/** Validates and snapshots a closed map feature-scope object. */
export function normalizeMapFeatureScope(
  value: unknown,
  path = '$.mapScope',
): NormalizedMapFeatureScope {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new GraflumeError('INVALID_SPEC', `${path} must be an object.`, { path });
  const candidate = value as Readonly<Record<string, unknown>>;
  const allowed = new Set([
    'level',
    'property',
    'values',
    'parentProperty',
    'parentValues',
    'caseSensitive',
    'unmatched',
    'empty',
  ]);
  const unknown = Object.keys(candidate).find((key) => !allowed.has(key));
  if (unknown !== undefined)
    throw new GraflumeError('INVALID_SPEC', `Unknown map scope property "${unknown}".`, {
      path: `${path}.${unknown}`,
    });
  const level = candidate.level ?? 'feature';
  if (level !== 'country' && level !== 'region' && level !== 'feature')
    throw new GraflumeError('INVALID_SPEC', `${path}.level is unsupported.`, {
      path: `${path}.level`,
    });
  const property = mapScopeProperty(candidate.property ?? '$id', `${path}.property`);
  const values = mapScopeValues(candidate.values, `${path}.values`);
  const parentProperty =
    candidate.parentProperty === undefined
      ? undefined
      : mapScopeProperty(candidate.parentProperty, `${path}.parentProperty`);
  const parentValues =
    candidate.parentValues === undefined
      ? undefined
      : mapScopeValues(candidate.parentValues, `${path}.parentValues`);
  if ((parentProperty === undefined) !== (parentValues === undefined))
    throw new GraflumeError(
      'INVALID_SPEC',
      `${path}.parentProperty and ${path}.parentValues must be provided together.`,
      { path },
    );
  const caseSensitive = candidate.caseSensitive ?? false;
  if (typeof caseSensitive !== 'boolean')
    throw new GraflumeError('INVALID_SPEC', `${path}.caseSensitive must be boolean.`, {
      path: `${path}.caseSensitive`,
    });
  const unmatched = candidate.unmatched ?? 'error';
  if (unmatched !== 'error' && unmatched !== 'ignore')
    throw new GraflumeError('INVALID_SPEC', `${path}.unmatched is unsupported.`, {
      path: `${path}.unmatched`,
    });
  const empty = candidate.empty ?? 'error';
  if (empty !== 'error' && empty !== 'allow')
    throw new GraflumeError('INVALID_SPEC', `${path}.empty is unsupported.`, {
      path: `${path}.empty`,
    });
  return Object.freeze({
    level,
    property,
    values,
    ...(parentProperty === undefined ? {} : { parentProperty, parentValues: parentValues! }),
    caseSensitive,
    unmatched,
    empty,
  });
}

function mapScopeComparable(value: unknown, caseSensitive: boolean): string | null {
  if (!(
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    typeof value === 'boolean'
  ))
    return null;
  const text = `${typeof value}:${String(value).trim()}`;
  return caseSensitive || typeof value !== 'string' ? text : text.toLocaleUpperCase('en-US');
}

function mapFeatureScopeValue(feature: GeoJsonFeature, property: string): unknown {
  return property === '$id' ? feature.id : feature.properties?.[property];
}

function requestedMapScopeKeys(
  values: readonly MapScopeValue[],
  caseSensitive: boolean,
): ReadonlySet<string> {
  return new Set(
    values.flatMap((entry) => {
      const value = mapScopeComparable(entry, caseSensitive);
      return value === null ? [] : [value];
    }),
  );
}

/**
 * Selects any number of features with bounded Set lookups. Requested values are
 * matched exactly (case-insensitive for strings by default), source order is
 * preserved, and partial or empty matches fail closed unless explicitly allowed.
 */
export function scopeGeoJsonFeatures(
  collection: GeoJsonFeatureCollection,
  scopeInput: MapFeatureScope | NormalizedMapFeatureScope,
): GeoJsonFeatureCollection {
  const scope = normalizeMapFeatureScope(scopeInput);
  const requested = requestedMapScopeKeys(scope.values, scope.caseSensitive);
  const requestedParents = requestedMapScopeKeys(scope.parentValues ?? [], scope.caseSensitive);
  const matched = new Set<string>();
  const matchedParents = new Set<string>();
  const features = collection.features.filter((feature) => {
    const value = mapScopeComparable(
      mapFeatureScopeValue(feature, scope.property),
      scope.caseSensitive,
    );
    if (value === null || !requested.has(value)) return false;
    if (scope.parentProperty === undefined) {
      matched.add(value);
      return true;
    }
    const parent = mapScopeComparable(
      mapFeatureScopeValue(feature, scope.parentProperty),
      scope.caseSensitive,
    );
    if (parent === null || !requestedParents.has(parent)) return false;
    matched.add(value);
    matchedParents.add(parent);
    return true;
  });
  if (scope.unmatched === 'error') {
    const missing = [...requested].filter((value) => !matched.has(value));
    const missingParents = [...requestedParents].filter((value) => !matchedParents.has(value));
    if (missing.length > 0 || missingParents.length > 0)
      throw new GraflumeError(
        'INVALID_DATA',
        `Map scope did not match ${missing.length + missingParents.length} requested value(s).`,
        {
          details: {
            missing: Object.freeze(missing),
            missingParents: Object.freeze(missingParents),
          },
        },
      );
  }
  if (features.length === 0 && scope.empty === 'error')
    throw new GraflumeError('INVALID_DATA', 'Map scope selected no features.');
  return Object.freeze({ type: 'FeatureCollection', features: Object.freeze(features) });
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

function forEachGeometryPosition(
  geometry: GeoJsonGeometry,
  visit: (position: GeographicPosition) => void,
): void {
  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach((entry) => forEachGeometryPosition(entry, visit));
    return;
  }
  const depth = new Map<GeoJsonGeometry['type'], number>([
    ['Point', 0],
    ['MultiPoint', 1],
    ['LineString', 1],
    ['MultiLineString', 2],
    ['Polygon', 2],
    ['MultiPolygon', 3],
  ]).get(geometry.type)!;
  const walk = (value: unknown, current: number): void => {
    if (current === 0) {
      visit(value as GeographicPosition);
      return;
    }
    (value as unknown[]).forEach((entry) => walk(entry, current - 1));
  };
  walk(geometry.coordinates, depth);
}

export type MapGeometryDetail = 'auto' | 'low' | 'medium' | 'high' | 'full';

export interface MapGeometryPreparationOptions {
  readonly detail?: MapGeometryDetail;
  /** Upper bound used by automatic detail. Must be from 1,000 to 1,000,000 positions. */
  readonly maximumPositions?: number;
}

export interface MapGeometryPreparationPlan {
  readonly detail: MapGeometryDetail;
  readonly sourceFeatures: number;
  readonly renderedFeatures: number;
  readonly sourcePositions: number;
  readonly renderedPositions: number;
  readonly maximumPositions: number;
  readonly tolerance: number;
}

export interface PreparedMapGeometry {
  readonly collection: GeoJsonFeatureCollection;
  readonly plan: MapGeometryPreparationPlan;
}

/** Counts coordinate pairs without spreading large arrays onto the call stack. */
export function mapFeaturePositionCount(collection: GeoJsonFeatureCollection): number {
  let count = 0;
  for (const feature of collection.features) {
    if (feature.geometry !== null) forEachGeometryPosition(feature.geometry, () => (count += 1));
  }
  return count;
}

function simplifyPositions(
  positions: readonly GeographicPosition[],
  tolerance: number,
  minimum: number,
): readonly GeographicPosition[] {
  if (tolerance <= 0 || positions.length <= minimum) return positions;
  const closed =
    positions.length > 1 &&
    positions[0]![0] === positions[positions.length - 1]![0] &&
    positions[0]![1] === positions[positions.length - 1]![1];
  const source = closed ? positions.slice(0, -1) : positions;
  if (source.length <= minimum) return positions;
  const output: GeographicPosition[] = [];
  for (const point of source) {
    const snapped = Object.freeze([
      Math.round(point[0] / tolerance) * tolerance,
      Math.round(point[1] / tolerance) * tolerance,
    ]) as GeographicPosition;
    const previous = output[output.length - 1];
    if (previous === undefined || previous[0] !== snapped[0] || previous[1] !== snapped[1])
      output.push(snapped);
  }
  if (output.length > 1) {
    const first = output[0]!;
    const last = output[output.length - 1]!;
    if (first[0] === last[0] && first[1] === last[1]) output.pop();
  }
  if (output.length < minimum) return positions;
  if (closed && output.length >= minimum) output.push(output[0]!);
  return output.length >= minimum ? Object.freeze(output) : positions;
}

function simplifyMapGeometry(geometry: GeoJsonGeometry, tolerance: number): GeoJsonGeometry {
  if (geometry.type === 'GeometryCollection')
    return Object.freeze({
      type: 'GeometryCollection',
      geometries: Object.freeze(
        geometry.geometries.map((entry) => simplifyMapGeometry(entry, tolerance)),
      ),
    });
  if (geometry.type === 'Point') return geometry;
  if (geometry.type === 'MultiPoint') return geometry;
  if (geometry.type === 'LineString')
    return Object.freeze({
      type: 'LineString',
      coordinates: simplifyPositions(
        geometry.coordinates as readonly GeographicPosition[],
        tolerance,
        2,
      ),
    });
  if (geometry.type === 'MultiLineString')
    return Object.freeze({
      type: 'MultiLineString',
      coordinates: Object.freeze(
        (geometry.coordinates as readonly (readonly GeographicPosition[])[]).map((line) =>
          simplifyPositions(line, tolerance, 2),
        ),
      ),
    });
  if (geometry.type === 'Polygon')
    return Object.freeze({
      type: 'Polygon',
      coordinates: Object.freeze(
        (geometry.coordinates as readonly (readonly GeographicPosition[])[]).map((ring) =>
          simplifyPositions(ring, tolerance, 3),
        ),
      ),
    });
  return Object.freeze({
    type: 'MultiPolygon',
    coordinates: Object.freeze(
      (geometry.coordinates as readonly (readonly (readonly GeographicPosition[])[])[]).map(
        (polygon) => Object.freeze(polygon.map((ring) => simplifyPositions(ring, tolerance, 3))),
      ),
    ),
  });
}

function simplifyMapCollection(
  collection: GeoJsonFeatureCollection,
  tolerance: number,
): GeoJsonFeatureCollection {
  if (tolerance <= 0) return collection;
  return Object.freeze({
    type: 'FeatureCollection',
    features: Object.freeze(
      collection.features.map((feature) =>
        feature.geometry === null
          ? feature
          : Object.freeze({
              ...feature,
              geometry: simplifyMapGeometry(feature.geometry, tolerance),
            }),
      ),
    ),
  });
}

function mapDetailBudget(detail: MapGeometryDetail, maximum: number): number {
  if (detail === 'low') return Math.min(maximum, 12_000);
  if (detail === 'medium') return Math.min(maximum, 35_000);
  if (detail === 'high') return Math.min(maximum, 100_000);
  return maximum;
}

/**
 * Deterministically reduces coordinate density while preserving every selected
 * feature and source order. It never samples away a country or subdivision.
 */
export function prepareMapGeometry(
  collection: GeoJsonFeatureCollection,
  options: MapGeometryPreparationOptions = {},
): PreparedMapGeometry {
  const detail = options.detail ?? 'auto';
  if (!['auto', 'low', 'medium', 'high', 'full'].includes(detail))
    throw new GraflumeError('INVALID_SPEC', '$.detail is unsupported.', { path: '$.detail' });
  const requestedMaximum = options.maximumPositions ?? 100_000;
  if (
    !Number.isInteger(requestedMaximum) ||
    requestedMaximum < 1_000 ||
    requestedMaximum > 1_000_000
  )
    throw new GraflumeError(
      'INVALID_SPEC',
      '$.maximumPositions must be an integer from 1000 to 1000000.',
      { path: '$.maximumPositions' },
    );
  const sourcePositions = mapFeaturePositionCount(collection);
  const maximumPositions = mapDetailBudget(detail, requestedMaximum);
  if (detail === 'full' && sourcePositions > maximumPositions)
    throw new GraflumeError(
      'INVALID_DATA',
      `Full map detail contains ${sourcePositions} positions, above the ${maximumPositions} geometry budget.`,
    );
  if (detail === 'full' || sourcePositions <= maximumPositions)
    return Object.freeze({
      collection,
      plan: Object.freeze({
        detail,
        sourceFeatures: collection.features.length,
        renderedFeatures: collection.features.length,
        sourcePositions,
        renderedPositions: sourcePositions,
        maximumPositions,
        tolerance: 0,
      }),
    });
  const bounds = mapBounds(collection);
  const span = Math.max(1e-9, bounds.east - bounds.west, bounds.north - bounds.south);
  let tolerance =
    (span / Math.sqrt(maximumPositions)) *
    Math.max(1, Math.sqrt(sourcePositions / maximumPositions)) *
    0.2;
  let prepared = simplifyMapCollection(collection, tolerance);
  let renderedPositions = mapFeaturePositionCount(prepared);
  for (let attempt = 0; attempt < 12 && renderedPositions > maximumPositions; attempt += 1) {
    tolerance *= 1.75;
    prepared = simplifyMapCollection(collection, tolerance);
    renderedPositions = mapFeaturePositionCount(prepared);
  }
  if (renderedPositions > maximumPositions)
    throw new GraflumeError(
      'INVALID_DATA',
      `Map geometry cannot satisfy the ${maximumPositions} position budget without removing a feature or valid ring.`,
    );
  return Object.freeze({
    collection: prepared,
    plan: Object.freeze({
      detail,
      sourceFeatures: collection.features.length,
      renderedFeatures: prepared.features.length,
      sourcePositions,
      renderedPositions,
      maximumPositions,
      tolerance,
    }),
  });
}

export interface MapBounds {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}

/** Computes geographic bounds, choosing the shorter dateline-wrapped span. */
export function mapBounds(collection: GeoJsonFeatureCollection): MapBounds {
  const longitudes: number[] = [];
  let south = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  collection.features.forEach(({ geometry }) => {
    if (geometry === null) return;
    forEachGeometryPosition(geometry, ([longitude, latitude]) => {
      longitudes.push(wrapLongitude(longitude));
      south = Math.min(south, latitude);
      north = Math.max(north, latitude);
    });
  });
  if (longitudes.length === 0)
    throw new GraflumeError('INVALID_DATA', 'Cannot fit an empty map source.');
  longitudes.sort((a, b) => a - b);
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
  return { west, south, east, north };
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

export type MapBoundaryLevel = 'country' | 'region';

export interface MapBoundaryPackSource {
  readonly id: string;
  readonly level: MapBoundaryLevel;
  /** ISO-like country identifiers covered by this shard. Omit for a global source. */
  readonly countries?: readonly string[];
  readonly url: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly format: 'geojson' | 'topojson';
  readonly topologyObject?: string;
}

/** Versioned, data-only index for lazily hosted country and ADM1 boundary shards. */
export interface MapBoundaryPackManifest {
  readonly schemaVersion: '1';
  readonly id: string;
  readonly revision: string;
  readonly attribution: string;
  readonly sources: readonly MapBoundaryPackSource[];
}

export interface MapBoundarySelection {
  readonly level: MapBoundaryLevel;
  readonly countries?: readonly string[];
  /** Optional exact shard ids for custom pack hosts; every id must match `level`. */
  readonly sourceIds?: readonly string[];
}

export interface MapBoundaryResponse {
  readonly bytes: Uint8Array;
  readonly mimeType?: string;
}

export interface MapBoundaryLoadResult {
  readonly collection: GeoJsonFeatureCollection;
  readonly manifestId: string;
  readonly revision: string;
  readonly attribution: string;
  readonly sourceIds: readonly string[];
  readonly byteLength: number;
}

export type MapBoundaryFetcher = (
  source: MapBoundaryPackSource,
  signal: AbortSignal,
) => Promise<MapBoundaryResponse>;
export type MapBoundaryManifestFetcher = (
  url: string,
  signal: AbortSignal,
) => Promise<MapBoundaryResponse>;
export type MapBoundaryDigest = (bytes: Uint8Array) => Promise<string>;

export interface MapBoundaryLoaderOptions {
  /** Absolute HTTPS URL used to resolve relative source URLs from a fetched manifest. */
  readonly baseURL?: string;
  readonly fetcher?: MapBoundaryFetcher;
  readonly manifestFetcher?: MapBoundaryManifestFetcher;
  readonly digest?: MapBoundaryDigest;
  readonly maximumEntries?: number;
  readonly maximumConcurrent?: number;
  readonly maximumManifestBytes?: number;
  readonly maximumSourceBytes?: number;
  readonly maximumTotalBytes?: number;
}

const mapBoundaryText = (value: unknown, path: string, maximum = 256): string => {
  if (typeof value !== 'string' || value.trim() === '' || value.length > maximum)
    throw new GraflumeError('INVALID_SPEC', `${path} must be a non-empty bounded string.`, {
      path,
    });
  return value.trim();
};

function mapBoundaryLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === 'localhost' || normalized === '[::1]') return true;
  const parts = normalized.split('.');
  return (
    parts.length === 4 &&
    parts[0] === '127' &&
    parts.every((part) => /^\d{1,3}$/u.test(part) && Number(part) <= 255)
  );
}

function mapBoundaryURLAllowed(url: URL): boolean {
  return (
    url.username === '' &&
    url.password === '' &&
    (url.protocol === 'https:' ||
      (url.protocol === 'http:' && mapBoundaryLoopbackHost(url.hostname)))
  );
}

function absoluteMapBoundaryURL(value: string, path: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new GraflumeError(
      'INVALID_SPEC',
      `${path} must be an absolute HTTPS URL or an explicit loopback HTTP URL.`,
      { path },
    );
  }
  if (!mapBoundaryURLAllowed(parsed))
    throw new GraflumeError(
      'INVALID_SPEC',
      `${path} must use HTTPS; HTTP is allowed only for localhost, 127.0.0.0/8, or [::1], without credentials.`,
      { path },
    );
  return parsed;
}

function normalizeMapBoundarySource(value: unknown, path: string): MapBoundaryPackSource {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new GraflumeError('INVALID_SPEC', `${path} must be an object.`, { path });
  const candidate = value as Readonly<Record<string, unknown>>;
  const allowed = new Set([
    'id',
    'level',
    'countries',
    'url',
    'sha256',
    'byteLength',
    'format',
    'topologyObject',
  ]);
  const unknown = Object.keys(candidate).find((key) => !allowed.has(key));
  if (unknown !== undefined)
    throw new GraflumeError('INVALID_SPEC', `Unknown boundary source property "${unknown}".`, {
      path: `${path}.${unknown}`,
    });
  const id = mapBoundaryText(candidate.id, `${path}.id`);
  const level = candidate.level;
  if (level !== 'country' && level !== 'region')
    throw new GraflumeError('INVALID_SPEC', `${path}.level is unsupported.`, {
      path: `${path}.level`,
    });
  const url = mapBoundaryText(candidate.url, `${path}.url`, 2_048);
  let parsed: URL;
  try {
    parsed = new URL(url, 'https://graflume.invalid/');
  } catch {
    throw new GraflumeError('INVALID_SPEC', `${path}.url is invalid.`, { path: `${path}.url` });
  }
  if (parsed.origin !== 'https://graflume.invalid' && !mapBoundaryURLAllowed(parsed))
    throw new GraflumeError(
      'INVALID_SPEC',
      `${path}.url must be relative or HTTPS; HTTP is allowed only on an explicit loopback host.`,
      { path: `${path}.url` },
    );
  const sha256 = mapBoundaryText(candidate.sha256, `${path}.sha256`, 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(sha256))
    throw new GraflumeError('INVALID_SPEC', `${path}.sha256 must be 64 hexadecimal characters.`, {
      path: `${path}.sha256`,
    });
  const byteLength = candidate.byteLength;
  if (
    !Number.isInteger(byteLength) ||
    (byteLength as number) < 2 ||
    (byteLength as number) > 1_000_000_000
  )
    throw new GraflumeError('INVALID_SPEC', `${path}.byteLength is outside the supported range.`, {
      path: `${path}.byteLength`,
    });
  const format = candidate.format;
  if (format !== 'geojson' && format !== 'topojson')
    throw new GraflumeError('INVALID_SPEC', `${path}.format is unsupported.`, {
      path: `${path}.format`,
    });
  const topologyObject =
    candidate.topologyObject === undefined
      ? undefined
      : mapBoundaryText(candidate.topologyObject, `${path}.topologyObject`);
  if (format === 'geojson' && topologyObject !== undefined)
    throw new GraflumeError(
      'INVALID_SPEC',
      `${path}.topologyObject is only valid for TopoJSON sources.`,
      { path: `${path}.topologyObject` },
    );
  let countries: readonly string[] | undefined;
  if (candidate.countries !== undefined) {
    if (
      !Array.isArray(candidate.countries) ||
      candidate.countries.length === 0 ||
      candidate.countries.length > MAXIMUM_MAP_SCOPE_VALUES
    )
      throw new GraflumeError('INVALID_SPEC', `${path}.countries has an invalid length.`, {
        path: `${path}.countries`,
      });
    countries = Object.freeze([
      ...new Set(
        candidate.countries.map((entry, index) =>
          mapBoundaryText(entry, `${path}.countries[${index}]`, 32).toUpperCase(),
        ),
      ),
    ]);
  }
  return Object.freeze({
    id,
    level,
    ...(countries === undefined ? {} : { countries }),
    url,
    sha256,
    byteLength: byteLength as number,
    format,
    ...(topologyObject === undefined ? {} : { topologyObject }),
  });
}

/** Validates a boundary-pack manifest without fetching any asset. */
export function normalizeMapBoundaryManifest(value: unknown): MapBoundaryPackManifest {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new GraflumeError('INVALID_SPEC', 'Map boundary manifest must be an object.');
  const candidate = value as Readonly<Record<string, unknown>>;
  const allowed = new Set(['schemaVersion', 'id', 'revision', 'attribution', 'sources']);
  const unknown = Object.keys(candidate).find((key) => !allowed.has(key));
  if (unknown !== undefined)
    throw new GraflumeError('INVALID_SPEC', `Unknown map boundary manifest property "${unknown}".`);
  if (candidate.schemaVersion !== '1')
    throw new GraflumeError('INVALID_SPEC', 'Map boundary manifest schemaVersion must be "1".');
  if (
    !Array.isArray(candidate.sources) ||
    candidate.sources.length === 0 ||
    candidate.sources.length > 4_096
  )
    throw new GraflumeError(
      'INVALID_SPEC',
      'Map boundary manifest must contain from 1 to 4096 sources.',
    );
  const sources = Object.freeze(
    candidate.sources.map((source, index) =>
      normalizeMapBoundarySource(source, `$.sources[${index}]`),
    ),
  );
  if (new Set(sources.map(({ id }) => id)).size !== sources.length)
    throw new GraflumeError('INVALID_SPEC', 'Map boundary manifest source ids must be unique.');
  for (const level of ['country', 'region'] as const) {
    const levelSources = sources.filter((source) => source.level === level);
    const globalSources = levelSources.filter(({ countries }) => countries === undefined);
    if (globalSources.length > 1 || (globalSources.length === 1 && levelSources.length > 1))
      throw new GraflumeError(
        'INVALID_SPEC',
        `Boundary manifest level "${level}" must use either one global source or non-overlapping country shards.`,
      );
    const declared = new Set<string>();
    for (const source of levelSources) {
      for (const country of source.countries ?? []) {
        if (declared.has(country))
          throw new GraflumeError(
            'INVALID_SPEC',
            `Boundary manifest level "${level}" declares country "${country}" in multiple shards.`,
          );
        declared.add(country);
      }
    }
  }
  return Object.freeze({
    schemaVersion: '1',
    id: mapBoundaryText(candidate.id, '$.id'),
    revision: mapBoundaryText(candidate.revision, '$.revision'),
    attribution: mapBoundaryText(candidate.attribution, '$.attribution', 1_024),
    sources,
  });
}

/** Selects the smallest declared shard set that covers a requested country list. */
export function selectMapBoundarySources(
  manifestInput: MapBoundaryPackManifest,
  selection: MapBoundarySelection,
): readonly MapBoundaryPackSource[] {
  const manifest = normalizeMapBoundaryManifest(manifestInput);
  if (selection.level !== 'country' && selection.level !== 'region')
    throw new GraflumeError('INVALID_SPEC', '$.selection.level is unsupported.');
  const countries = selection.countries ?? [];
  if (countries.length > MAXIMUM_MAP_SCOPE_VALUES)
    throw new GraflumeError(
      'INVALID_SPEC',
      `$.selection.countries exceeds ${MAXIMUM_MAP_SCOPE_VALUES} entries.`,
    );
  const requested = new Set(
    countries.map((country, index) =>
      mapBoundaryText(country, `$.selection.countries[${index}]`, 32).toUpperCase(),
    ),
  );
  const levelSources = manifest.sources.filter((source) => source.level === selection.level);
  let explicitSources: readonly MapBoundaryPackSource[] | undefined;
  if (selection.sourceIds !== undefined) {
    if (
      !Array.isArray(selection.sourceIds) ||
      selection.sourceIds.length === 0 ||
      selection.sourceIds.length > 4_096
    )
      throw new GraflumeError(
        'INVALID_SPEC',
        '$.selection.sourceIds must contain from 1 to 4096 source ids.',
      );
    const ids = [
      ...new Set(
        selection.sourceIds.map((id, index) =>
          mapBoundaryText(id, `$.selection.sourceIds[${index}]`),
        ),
      ),
    ];
    const byId = new Map(manifest.sources.map((source) => [source.id, source]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0)
      throw new GraflumeError(
        'INVALID_DATA',
        'Boundary manifest does not contain every source id.',
        {
          details: { missing: Object.freeze(missing) },
        },
      );
    explicitSources = Object.freeze(ids.map((id) => byId.get(id)!));
    if (explicitSources.some(({ level }) => level !== selection.level))
      throw new GraflumeError(
        'INVALID_SPEC',
        'Every explicit boundary source id must match $.selection.level.',
      );
  }
  const global = levelSources.find(({ countries: coverage }) => coverage === undefined);
  const sources =
    explicitSources !== undefined
      ? explicitSources
      : requested.size === 0
        ? levelSources
        : global === undefined
          ? levelSources.filter(({ countries: coverage }) =>
              coverage?.some((country) => requested.has(country)),
            )
          : [global];
  if (sources.length === 0)
    throw new GraflumeError(
      'INVALID_DATA',
      'Boundary manifest has no source for the requested level and countries.',
    );
  if (requested.size > 0) {
    const covered = new Set(
      sources.flatMap(({ countries: coverage }) => coverage ?? [...requested]),
    );
    const missing = [...requested].filter((country) => !covered.has(country));
    if (missing.length > 0)
      throw new GraflumeError(
        'INVALID_DATA',
        'Boundary manifest does not cover every requested country.',
        {
          details: { missing: Object.freeze(missing) },
        },
      );
  }
  return Object.freeze(sources);
}

export const fetchMapBoundary: MapBoundaryFetcher = async (source, signal) => {
  if (typeof fetch !== 'function')
    throw new GraflumeError(
      'UNSUPPORTED_RENDERER',
      'Map boundary loading requires fetch or an injected MapBoundaryFetcher.',
    );
  const requestedURL = absoluteMapBoundaryURL(source.url, '$.source.url');
  const response = await fetch(requestedURL.href, { signal });
  if (response.url !== '' && !mapBoundaryURLAllowed(new URL(response.url)))
    throw new GraflumeError('INVALID_DATA', 'Boundary source redirected to an unsafe URL.');
  if (!response.ok)
    throw new GraflumeError('INVALID_DATA', `Boundary source returned HTTP ${response.status}.`);
  const mimeType = response.headers.get('content-type')?.split(';', 1)[0]?.trim();
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    ...(mimeType === undefined ? {} : { mimeType }),
  };
};

/** Default HTTPS adapter used by MapBoundaryLoader.loadFromURL(). */
export const fetchMapBoundaryManifest: MapBoundaryManifestFetcher = async (url, signal) => {
  if (typeof fetch !== 'function')
    throw new GraflumeError(
      'UNSUPPORTED_RENDERER',
      'Map boundary manifest loading requires fetch or an injected manifestFetcher.',
    );
  const requestedURL = absoluteMapBoundaryURL(url, '$.manifestURL');
  const response = await fetch(requestedURL.href, { signal });
  if (response.url !== '' && !mapBoundaryURLAllowed(new URL(response.url)))
    throw new GraflumeError('INVALID_DATA', 'Boundary manifest redirected to an unsafe URL.');
  if (!response.ok)
    throw new GraflumeError('INVALID_DATA', `Boundary manifest returned HTTP ${response.status}.`);
  const mimeType = response.headers.get('content-type')?.split(';', 1)[0]?.trim();
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    ...(mimeType === undefined ? {} : { mimeType }),
  };
};

export const sha256MapBoundary: MapBoundaryDigest = async (bytes) => {
  if (globalThis.crypto?.subtle === undefined)
    throw new GraflumeError(
      'UNSUPPORTED_RENDERER',
      'Boundary SHA-256 verification requires Web Crypto or an injected digest function.',
    );
  const stableBytes = new Uint8Array(bytes);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', stableBytes));
  return [...digest].map((value) => value.toString(16).padStart(2, '0')).join('');
};

/** Lazy, integrity-checked, bounded loader for versioned external boundary packs. */
export class MapBoundaryLoader {
  readonly #options: Required<
    Omit<MapBoundaryLoaderOptions, 'baseURL' | 'fetcher' | 'manifestFetcher' | 'digest'>
  >;
  readonly #baseURL?: string;
  readonly #fetcher: MapBoundaryFetcher;
  readonly #manifestFetcher: MapBoundaryManifestFetcher;
  readonly #digest: MapBoundaryDigest;
  readonly #cache = new Map<string, GeoJsonFeatureCollection>();

  constructor(options: MapBoundaryLoaderOptions = {}) {
    this.#fetcher = options.fetcher ?? fetchMapBoundary;
    this.#manifestFetcher = options.manifestFetcher ?? fetchMapBoundaryManifest;
    this.#digest = options.digest ?? sha256MapBoundary;
    this.#options = {
      maximumEntries: options.maximumEntries ?? 64,
      maximumConcurrent: options.maximumConcurrent ?? 4,
      maximumManifestBytes: options.maximumManifestBytes ?? 4 * 1024 * 1024,
      maximumSourceBytes: options.maximumSourceBytes ?? 32 * 1024 * 1024,
      maximumTotalBytes: options.maximumTotalBytes ?? 128 * 1024 * 1024,
    };
    if (options.baseURL !== undefined) {
      const baseURL = mapBoundaryText(options.baseURL, '$.baseURL', 2_048);
      const parsed = absoluteMapBoundaryURL(baseURL, '$.baseURL');
      this.#baseURL = parsed.href;
    }
    const {
      maximumEntries,
      maximumConcurrent,
      maximumManifestBytes,
      maximumSourceBytes,
      maximumTotalBytes,
    } = this.#options;
    if (!Number.isInteger(maximumEntries) || maximumEntries < 1 || maximumEntries > 1_024)
      throw new GraflumeError('INVALID_SPEC', '$.maximumEntries must be from 1 to 1024.');
    if (!Number.isInteger(maximumConcurrent) || maximumConcurrent < 1 || maximumConcurrent > 16)
      throw new GraflumeError('INVALID_SPEC', '$.maximumConcurrent must be from 1 to 16.');
    if (
      !Number.isInteger(maximumManifestBytes) ||
      maximumManifestBytes < 1_024 ||
      maximumManifestBytes > 16 * 1024 * 1024
    )
      throw new GraflumeError(
        'INVALID_SPEC',
        '$.maximumManifestBytes is outside the supported range.',
      );
    if (
      !Number.isInteger(maximumSourceBytes) ||
      maximumSourceBytes < 1_024 ||
      maximumSourceBytes > 256 * 1024 * 1024
    )
      throw new GraflumeError(
        'INVALID_SPEC',
        '$.maximumSourceBytes is outside the supported range.',
      );
    if (
      !Number.isInteger(maximumTotalBytes) ||
      maximumTotalBytes < maximumSourceBytes ||
      maximumTotalBytes > 512 * 1024 * 1024
    )
      throw new GraflumeError(
        'INVALID_SPEC',
        '$.maximumTotalBytes is outside the supported range.',
      );
  }

  async load(
    manifestInput: MapBoundaryPackManifest,
    selection: MapBoundarySelection,
    signal?: AbortSignal,
  ): Promise<MapBoundaryLoadResult> {
    const manifest = normalizeMapBoundaryManifest(manifestInput);
    return this.#load(manifest, selection, signal, this.#baseURL);
  }

  /**
   * Fetches a versioned manifest and resolves its relative shard URLs against
   * that manifest URL, unless the loader was given an explicit baseURL.
   */
  async loadFromURL(
    manifestURL: string,
    selection: MapBoundarySelection,
    signal?: AbortSignal,
  ): Promise<MapBoundaryLoadResult> {
    const text = mapBoundaryText(manifestURL, '$.manifestURL', 2_048);
    const parsedURL = absoluteMapBoundaryURL(text, '$.manifestURL');
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted === true) controller.abort(signal.reason);
    else signal?.addEventListener('abort', abort, { once: true });
    try {
      const response = await this.#manifestFetcher(parsedURL.href, controller.signal);
      if (
        !(response.bytes instanceof Uint8Array) ||
        response.bytes.length === 0 ||
        response.bytes.length > this.#options.maximumManifestBytes
      )
        throw new GraflumeError(
          'INVALID_DATA',
          'Boundary manifest response exceeds maximumManifestBytes or is empty.',
        );
      if (
        response.mimeType !== undefined &&
        !response.mimeType.toLowerCase().includes('json') &&
        response.mimeType.toLowerCase() !== 'application/octet-stream'
      )
        throw new GraflumeError(
          'INVALID_DATA',
          `Boundary manifest returned unsupported MIME ${response.mimeType}.`,
        );
      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder().decode(response.bytes));
      } catch {
        throw new GraflumeError('INVALID_DATA', 'Boundary manifest is not valid JSON.');
      }
      const manifest = normalizeMapBoundaryManifest(parsed);
      return this.#load(manifest, selection, signal, this.#baseURL ?? parsedURL.href);
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  }

  async #load(
    manifest: MapBoundaryPackManifest,
    selection: MapBoundarySelection,
    signal: AbortSignal | undefined,
    baseURL: string | undefined,
  ): Promise<MapBoundaryLoadResult> {
    const sources = selectMapBoundarySources(manifest, selection);
    const totalBytes = sources.reduce((sum, source) => sum + source.byteLength, 0);
    if (sources.some(({ byteLength }) => byteLength > this.#options.maximumSourceBytes))
      throw new GraflumeError(
        'INVALID_SPEC',
        'A selected boundary source exceeds maximumSourceBytes.',
      );
    if (totalBytes > this.#options.maximumTotalBytes)
      throw new GraflumeError(
        'INVALID_SPEC',
        'Selected boundary sources exceed maximumTotalBytes.',
      );
    const collections = new Array<GeoJsonFeatureCollection>(sources.length);
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < sources.length) {
        const index = cursor++;
        collections[index] = await this.#loadSource(sources[index]!, signal, baseURL);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(this.#options.maximumConcurrent, sources.length) }, () =>
        worker(),
      ),
    );
    const collection = Object.freeze({
      type: 'FeatureCollection',
      features: Object.freeze(collections.flatMap(({ features }) => features)),
    });
    return Object.freeze({
      collection,
      manifestId: manifest.id,
      revision: manifest.revision,
      attribution: manifest.attribution,
      sourceIds: Object.freeze(sources.map(({ id }) => id)),
      byteLength: totalBytes,
    });
  }

  clear(): void {
    this.#cache.clear();
  }

  state(): { readonly cached: number; readonly maximumEntries: number } {
    return Object.freeze({
      cached: this.#cache.size,
      maximumEntries: this.#options.maximumEntries,
    });
  }

  async #loadSource(
    source: MapBoundaryPackSource,
    signal?: AbortSignal,
    baseURL?: string,
  ): Promise<GeoJsonFeatureCollection> {
    const key = `${source.id}:${source.sha256}:${source.format}:${source.topologyObject ?? ''}`;
    const cached = this.#cache.get(key);
    if (cached !== undefined) {
      this.#cache.delete(key);
      this.#cache.set(key, cached);
      return cached;
    }
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted === true) controller.abort(signal.reason);
    else signal?.addEventListener('abort', abort, { once: true });
    try {
      let resolvedSource = source;
      try {
        const resolvedURL = absoluteMapBoundaryURL(source.url, '$.source.url');
        resolvedSource = Object.freeze({ ...source, url: resolvedURL.href });
      } catch {
        if (baseURL === undefined)
          throw new GraflumeError(
            'INVALID_SPEC',
            `Boundary source "${source.id}" uses a relative URL but the loader has no baseURL.`,
          );
        const resolvedURL = new URL(source.url, baseURL);
        if (!mapBoundaryURLAllowed(resolvedURL))
          throw new GraflumeError(
            'INVALID_SPEC',
            `Boundary source "${source.id}" resolves to an unsafe URL.`,
          );
        resolvedSource = Object.freeze({ ...source, url: resolvedURL.href });
      }
      const response = await this.#fetcher(resolvedSource, controller.signal);
      if (!(response.bytes instanceof Uint8Array) || response.bytes.length !== source.byteLength)
        throw new GraflumeError(
          'INVALID_DATA',
          `Boundary source "${source.id}" byte length changed.`,
        );
      if (
        response.mimeType !== undefined &&
        !response.mimeType.toLowerCase().includes('json') &&
        response.mimeType.toLowerCase() !== 'application/octet-stream'
      )
        throw new GraflumeError(
          'INVALID_DATA',
          `Boundary source "${source.id}" returned unsupported MIME ${response.mimeType}.`,
        );
      const digest = (await this.#digest(response.bytes)).toLowerCase();
      if (digest !== source.sha256)
        throw new GraflumeError(
          'INVALID_DATA',
          `Boundary source "${source.id}" failed SHA-256 verification.`,
        );
      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder().decode(response.bytes));
      } catch {
        throw new GraflumeError(
          'INVALID_DATA',
          `Boundary source "${source.id}" is not valid JSON.`,
        );
      }
      const collection =
        source.format === 'topojson'
          ? topologyToGeoJson(parsed as Topology, source.topologyObject)
          : normalizeGeoJson(parsed);
      this.#cache.set(key, collection);
      while (this.#cache.size > this.#options.maximumEntries)
        this.#cache.delete(this.#cache.keys().next().value!);
      return collection;
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  }
}

export function createMapBoundaryLoader(options: MapBoundaryLoaderOptions = {}): MapBoundaryLoader {
  return new MapBoundaryLoader(options);
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

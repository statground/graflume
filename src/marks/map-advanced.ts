import type { MarkCompiler, MarkCompileContext } from '../compiler/types.js';
import { GraflumeError } from '../core/errors.js';
import {
  clipMapLine,
  clipMapPolygonRing,
  fitMapBounds,
  geodesicPath,
  mapBounds,
  normalizeMapFeatureScope,
  mapGraticule,
  MapLayerRegistry,
  normalizeGeoJson,
  prepareMapGeometry,
  projectMapPosition,
  scopeGeoJsonFeatures,
  tileUrl,
  topologyToGeoJson,
  wrapLongitude,
  type GeoJsonFeature,
  type GeoJsonFeatureCollection,
  type GeoJsonGeometry,
  type GeographicPosition,
  type MapGeometryDetail,
  type MapProjectionName,
  type TileCoordinate,
  type TileSourceDefinition,
  type Topology,
} from '../geography/map-lifecycle.js';
import { nodeBase } from '../scene/factory.js';
import type { Point, SceneNode, TextNode } from '../scene/types.js';
import { categoricalColor, colorWithOpacity } from '../theme/color.js';
import { compileMapMark } from './structured.js';
import { mappedContinuousColor, numericDataValue } from './utils.js';

function stringOption(context: MarkCompileContext, name: string): string | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'string' ? value : undefined;
}

function numberOption(context: MarkCompileContext, name: string): number | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanOption(context: MarkCompileContext, name: string): boolean | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'boolean' ? value : undefined;
}

function geometryDetailOption(context: MarkCompileContext): MapGeometryDetail {
  const value = context.layer.mark.options.geometryDetail;
  if (value === undefined) return 'auto';
  if (
    value === 'auto' ||
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'full'
  )
    return value;
  throw new GraflumeError('INVALID_SPEC', `Unsupported map geometryDetail "${String(value)}".`);
}

function numberArray(value: unknown, length: number): number[] | undefined {
  return Array.isArray(value) &&
    value.length === length &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
    ? [...value]
    : undefined;
}

function sourceCollection(context: MarkCompileContext): GeoJsonFeatureCollection | null {
  const geojson = context.layer.mark.options.geojson;
  if (geojson !== undefined) return normalizeGeoJson(geojson);
  const topology = context.layer.mark.options.topojson;
  if (topology !== undefined) {
    const object = stringOption(context, 'topologyObject');
    return topologyToGeoJson(topology as unknown as Topology, object);
  }
  return null;
}

function projectionName(context: MarkCompileContext): MapProjectionName {
  const value = stringOption(context, 'projection');
  return value === 'mercator' || value === 'orthographic' ? value : 'equirectangular';
}

function textNode(
  context: MarkCompileContext,
  id: string,
  x: number,
  y: number,
  text: string,
  align: CanvasTextAlign = 'left',
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, { zIndex: context.layer.zIndex + 10 }),
    x,
    y,
    text,
    fill: context.theme.colors.mutedText,
    fontFamily: context.theme.typography.fontFamily,
    fontSize: 9,
    fontWeight: 500,
    align,
    baseline: 'bottom',
    rotation: 0,
  };
}

type MapGeometryPart =
  | { readonly kind: 'point'; readonly points: readonly GeographicPosition[] }
  | { readonly kind: 'line'; readonly points: readonly GeographicPosition[] }
  | {
      readonly kind: 'polygon';
      readonly outer: readonly GeographicPosition[];
      readonly holes: readonly (readonly GeographicPosition[])[];
    };

function geometryPaths(geometry: GeoJsonGeometry): MapGeometryPart[] {
  if (geometry.type === 'GeometryCollection') return geometry.geometries.flatMap(geometryPaths);
  if (geometry.type === 'Point')
    return [{ kind: 'point', points: [geometry.coordinates as GeographicPosition] }];
  if (geometry.type === 'MultiPoint')
    return (geometry.coordinates as GeographicPosition[]).map((point) => ({
      kind: 'point',
      points: [point],
    }));
  if (geometry.type === 'LineString')
    return [{ kind: 'line', points: geometry.coordinates as GeographicPosition[] }];
  if (geometry.type === 'MultiLineString')
    return (geometry.coordinates as GeographicPosition[][]).map((points) => ({
      kind: 'line',
      points,
    }));
  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates as GeographicPosition[][]]
      : (geometry.coordinates as GeographicPosition[][][]);
  return polygons.flatMap((rings) => {
    const outer = rings[0];
    return outer === undefined ? [] : [{ kind: 'polygon' as const, outer, holes: rings.slice(1) }];
  });
}

function tileSourceOption(context: MarkCompileContext): TileSourceDefinition | null {
  const value = context.layer.mark.options.tileSource;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const template = Reflect.get(value, 'template');
  const attribution = Reflect.get(value, 'attribution');
  if (typeof template !== 'string' || typeof attribution !== 'string') return null;
  const type = Reflect.get(value, 'type');
  const subdomains = Reflect.get(value, 'subdomains');
  const tileSize = Reflect.get(value, 'tileSize');
  return {
    type: type === 'vector' ? 'vector' : 'raster',
    template,
    attribution,
    ...(Array.isArray(subdomains) && subdomains.every((entry) => typeof entry === 'string')
      ? { subdomains: [...subdomains] }
      : {}),
    ...(tileSize === 512 ? { tileSize } : tileSize === 256 ? { tileSize } : {}),
  };
}

function tileCoordinates(context: MarkCompileContext): TileCoordinate[] {
  const value = context.layer.mark.options.tiles;
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const z = Reflect.get(entry, 'z');
    const x = Reflect.get(entry, 'x');
    const y = Reflect.get(entry, 'y');
    return [z, x, y].every((part) => typeof part === 'number' && Number.isInteger(part))
      ? [{ z: z as number, x: x as number, y: y as number }]
      : [];
  });
}

function propertyValue(feature: GeoJsonFeature, field: string | undefined): unknown {
  return field === undefined || feature.properties === null || feature.properties === undefined
    ? undefined
    : feature.properties[field];
}

interface MapLabelSettings {
  readonly field?: string;
  readonly longitudeField?: string;
  readonly latitudeField?: string;
  readonly maximum: number;
  readonly fontSize: number;
  readonly padding: number;
  readonly collision: 'hide' | 'none';
}

function mapLabelSettings(context: MarkCompileContext): MapLabelSettings | null {
  const value = context.layer.mark.options.labels;
  if (value === undefined || value === false) return null;
  if (value === true) return { maximum: 120, fontSize: 10, padding: 3, collision: 'hide' };
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new GraflumeError('INVALID_SPEC', 'Map labels must be boolean or an options object.');
  const candidate = value as Readonly<Record<string, unknown>>;
  const allowed = new Set([
    'field',
    'longitudeField',
    'latitudeField',
    'maximum',
    'fontSize',
    'padding',
    'collision',
  ]);
  const unknown = Object.keys(candidate).find((key) => !allowed.has(key));
  if (unknown !== undefined)
    throw new GraflumeError('INVALID_SPEC', `Unknown map labels property "${unknown}".`);
  const field = candidate.field;
  if (
    field !== undefined &&
    (typeof field !== 'string' || field.trim() === '' || field.length > 256)
  )
    throw new GraflumeError(
      'INVALID_SPEC',
      'Map labels.field must be a non-empty string up to 256 characters.',
    );
  const integer = (
    input: unknown,
    fallback: number,
    minimum: number,
    maximum: number,
    path: string,
  ) => {
    const output = input ?? fallback;
    if (!Number.isInteger(output) || (output as number) < minimum || (output as number) > maximum)
      throw new GraflumeError(
        'INVALID_SPEC',
        `${path} must be an integer from ${minimum} to ${maximum}.`,
      );
    return output as number;
  };
  const collision = candidate.collision ?? 'hide';
  if (collision !== 'hide' && collision !== 'none')
    throw new GraflumeError('INVALID_SPEC', 'Map labels.collision must be "hide" or "none".');
  const coordinateField = (name: 'longitudeField' | 'latitudeField'): string | undefined => {
    const coordinate = candidate[name];
    if (
      coordinate !== undefined &&
      (typeof coordinate !== 'string' || coordinate.trim() === '' || coordinate.length > 256)
    )
      throw new GraflumeError(
        'INVALID_SPEC',
        `Map labels.${name} must be a non-empty string up to 256 characters.`,
      );
    return typeof coordinate === 'string' ? coordinate.trim() : undefined;
  };
  const longitudeField = coordinateField('longitudeField');
  const latitudeField = coordinateField('latitudeField');
  if ((longitudeField === undefined) !== (latitudeField === undefined))
    throw new GraflumeError(
      'INVALID_SPEC',
      'Map labels.longitudeField and labels.latitudeField must be provided together.',
    );
  return {
    ...(typeof field === 'string' ? { field: field.trim() } : {}),
    ...(longitudeField === undefined ? {} : { longitudeField, latitudeField: latitudeField! }),
    maximum: integer(candidate.maximum, 120, 1, 1_000, 'Map labels.maximum'),
    fontSize: integer(candidate.fontSize, 10, 6, 40, 'Map labels.fontSize'),
    padding: integer(candidate.padding, 3, 0, 24, 'Map labels.padding'),
    collision,
  };
}

function polygonArea(points: readonly GeographicPosition[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    area += current[0] * next[1] - next[0] * current[1];
  }
  return Math.abs(area) / 2;
}

function unwrapLabelRing(
  points: readonly GeographicPosition[],
  referenceLongitude?: number,
): readonly GeographicPosition[] {
  if (points.length === 0) return points;
  const output: GeographicPosition[] = [points[0]!];
  for (const point of points.slice(1)) {
    const previous = output[output.length - 1]!;
    let longitude = point[0];
    while (longitude - previous[0] > 180) longitude -= 360;
    while (longitude - previous[0] < -180) longitude += 360;
    output.push([longitude, point[1]]);
  }
  if (referenceLongitude !== undefined) {
    const mean = output.reduce((sum, [longitude]) => sum + longitude, 0) / output.length;
    let shift = 0;
    while (mean + shift - referenceLongitude > 180) shift -= 360;
    while (mean + shift - referenceLongitude < -180) shift += 360;
    if (shift !== 0) return output.map(([longitude, latitude]) => [longitude + shift, latitude]);
  }
  return output;
}

function polygonAnchor(points: readonly GeographicPosition[]): GeographicPosition {
  let area = 0;
  let longitude = 0;
  let latitude = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    const cross = current[0] * next[1] - next[0] * current[1];
    area += cross;
    longitude += (current[0] + next[0]) * cross;
    latitude += (current[1] + next[1]) * cross;
  }
  if (Math.abs(area) < 1e-12) {
    const total = points.reduce(
      (sum, point) => [sum[0] + point[0], sum[1] + point[1]] as GeographicPosition,
      [0, 0] as GeographicPosition,
    );
    return [total[0] / points.length, total[1] / points.length];
  }
  return [longitude / (3 * area), latitude / (3 * area)];
}

function pointInRing(point: GeographicPosition, ring: readonly GeographicPosition[]): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index]!;
    const prior = ring[previous]!;
    if (
      current[1] > point[1] !== prior[1] > point[1] &&
      point[0] <
        ((prior[0] - current[0]) * (point[1] - current[1])) / (prior[1] - current[1]) + current[0]
    )
      inside = !inside;
  }
  return inside;
}

function pointSegmentDistance(
  point: GeographicPosition,
  start: GeographicPosition,
  end: GeographicPosition,
): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const denominator = dx * dx + dy * dy;
  const amount =
    denominator === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / denominator),
        );
  return Math.hypot(point[0] - (start[0] + dx * amount), point[1] - (start[1] + dy * amount));
}

function polygonRepresentativePoint(
  outer: readonly GeographicPosition[],
  holes: readonly (readonly GeographicPosition[])[],
): GeographicPosition {
  const centroid = polygonAnchor(outer);
  const inside = (point: GeographicPosition) =>
    pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole));
  if (inside(centroid)) return centroid;
  let west = outer[0]![0];
  let east = west;
  let south = outer[0]![1];
  let north = south;
  for (const [longitude, latitude] of outer) {
    west = Math.min(west, longitude);
    east = Math.max(east, longitude);
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
  }
  let best: GeographicPosition | null = null;
  let bestDistance = -1;
  for (let row = 0; row < 12; row += 1) {
    for (let column = 0; column < 12; column += 1) {
      const candidate = [
        west + ((column + 0.5) / 12) * (east - west),
        south + ((row + 0.5) / 12) * (north - south),
      ] as GeographicPosition;
      if (!inside(candidate)) continue;
      const rings = [outer, ...holes];
      let distance = Number.POSITIVE_INFINITY;
      for (const ring of rings)
        for (let index = 0; index < ring.length; index += 1)
          distance = Math.min(
            distance,
            pointSegmentDistance(candidate, ring[index]!, ring[(index + 1) % ring.length]!),
          );
      if (distance > bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
  }
  return best ?? outer[0]!;
}

function featureAnchor(
  feature: GeoJsonFeature,
  settings: MapLabelSettings,
): { readonly point: GeographicPosition; readonly area: number } | null {
  if (feature.geometry === null) return null;
  const parts = geometryPaths(feature.geometry);
  const polygons = parts
    .filter((part) => part.kind === 'polygon')
    .map((part) => {
      const outer = unwrapLabelRing(part.outer);
      const reference = outer.reduce((sum, [longitude]) => sum + longitude, 0) / outer.length;
      return {
        outer,
        holes: part.holes.map((hole) => unwrapLabelRing(hole, reference)),
      };
    });
  const largestArea =
    polygons.length === 0 ? 0 : Math.max(...polygons.map(({ outer }) => polygonArea(outer)));
  const defaultLongitude =
    feature.properties?.LABEL_X ??
    feature.properties?.label_x ??
    feature.properties?.labelLongitude;
  const defaultLatitude =
    feature.properties?.LABEL_Y ?? feature.properties?.label_y ?? feature.properties?.labelLatitude;
  const longitude =
    settings.longitudeField === undefined
      ? defaultLongitude
      : feature.properties?.[settings.longitudeField];
  const latitude =
    settings.latitudeField === undefined
      ? defaultLatitude
      : feature.properties?.[settings.latitudeField];
  if (
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  )
    return { point: [longitude, latitude], area: largestArea };
  if (polygons.length > 0) {
    const largest = polygons.reduce((best, candidate) =>
      polygonArea(candidate.outer) > polygonArea(best.outer) ? candidate : best,
    );
    return {
      point: (() => {
        const [longitude, latitude] = polygonRepresentativePoint(largest.outer, largest.holes);
        return [wrapLongitude(longitude), latitude] as GeographicPosition;
      })(),
      area: polygonArea(largest.outer),
    };
  }
  const points = parts.flatMap((part) => (part.kind === 'polygon' ? part.outer : part.points));
  const point = points[Math.floor(points.length / 2)];
  return point === undefined ? null : { point, area: 0 };
}

function featureLabel(feature: GeoJsonFeature, field: string | undefined): string | null {
  const value =
    field === '$id'
      ? feature.id
      : field === undefined
        ? (feature.properties?.name ??
          feature.properties?.NAME ??
          feature.properties?.name_en ??
          feature.properties?.NAME_EN ??
          feature.id)
        : feature.properties?.[field];
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  return text === '' ? null : text.slice(0, 120);
}

function mapFeatureLabelNodes(
  context: MarkCompileContext,
  collection: GeoJsonFeatureCollection,
  settings: MapLabelSettings,
  map: (position: GeographicPosition) => Point | null,
): readonly TextNode[] {
  const capacity = Math.max(1, Math.floor((context.plot.width * context.plot.height) / 2_800));
  const maximum = Math.min(
    settings.maximum,
    settings.collision === 'none' ? settings.maximum : capacity,
  );
  const occupied: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  }[] = [];
  const candidates = collection.features.flatMap((feature, featureIndex) => {
    const label = featureLabel(feature, settings.field);
    const anchor = featureAnchor(feature, settings);
    const point = anchor === null ? null : map(anchor.point);
    return label === null ||
      anchor === null ||
      point === null ||
      point.x < context.plot.x ||
      point.x > context.plot.x + context.plot.width ||
      point.y < context.plot.y ||
      point.y > context.plot.y + context.plot.height
      ? []
      : [{ feature, featureIndex, label, point, area: anchor.area }];
  });
  candidates.sort(
    (left, right) => right.area - left.area || left.featureIndex - right.featureIndex,
  );
  const nodes: TextNode[] = [];
  for (const candidate of candidates) {
    if (nodes.length >= maximum) break;
    const widthUnits = Array.from(candidate.label).reduce(
      (sum, character) =>
        sum +
        (/\p{Extended_Pictographic}|\p{Script=Han}|\p{Script=Hangul}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(
          character,
        )
          ? 1
          : 0.58),
      0,
    );
    const width = Math.max(settings.fontSize, widthUnits * settings.fontSize);
    const box = {
      left: candidate.point.x - width / 2 - settings.padding,
      right: candidate.point.x + width / 2 + settings.padding,
      top: candidate.point.y - settings.fontSize / 2 - settings.padding,
      bottom: candidate.point.y + settings.fontSize / 2 + settings.padding,
    };
    if (
      settings.collision === 'hide' &&
      occupied.some(
        (entry) =>
          box.left < entry.right &&
          box.right > entry.left &&
          box.top < entry.bottom &&
          box.bottom > entry.top,
      )
    )
      continue;
    occupied.push(box);
    nodes.push({
      type: 'text',
      ...nodeBase(`${context.layer.id}:map-label:${candidate.featureIndex}`, {
        zIndex: context.layer.zIndex + 8,
      }),
      x: candidate.point.x,
      y: candidate.point.y,
      text: candidate.label,
      fill: context.theme.colors.text,
      fontFamily: context.theme.typography.fontFamily,
      fontSize: settings.fontSize,
      fontWeight: 600,
      align: 'center',
      baseline: 'middle',
      rotation: 0,
    });
  }
  return nodes;
}

interface MapFeatureJoinEntry {
  readonly rowIndex: number;
  readonly value: number | null;
}

interface MapFeatureJoin {
  readonly featureField: string;
  readonly dataField: string;
  readonly valueField?: string;
  readonly entries: ReadonlyMap<string, MapFeatureJoinEntry>;
  readonly minimum: number;
  readonly maximum: number;
  readonly unmatched: 'show' | 'hide' | 'error';
  readonly caseSensitive: boolean;
}

function mapJoinKey(value: unknown, caseSensitive: boolean): string | null {
  if (!(
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    typeof value === 'boolean'
  ))
    return null;
  const key = `${typeof value}:${String(value).trim()}`;
  return caseSensitive || typeof value !== 'string' ? key : key.toLocaleUpperCase('en-US');
}

function mapFeatureJoin(context: MarkCompileContext): MapFeatureJoin | null {
  const featureField = context.layer.mark.fields.featureKey;
  const dataField = context.layer.mark.fields.dataKey;
  if (featureField === undefined && dataField === undefined) return null;
  if (featureField === undefined || dataField === undefined)
    throw new GraflumeError(
      'INVALID_SPEC',
      'Map feature joins require both mark.fields.featureKey and mark.fields.dataKey.',
    );
  if (!context.table.has(dataField))
    throw new GraflumeError('INVALID_DATA', `Map data join field "${dataField}" is missing.`);
  const caseSensitive = booleanOption(context, 'joinCaseSensitive') ?? false;
  const duplicate = stringOption(context, 'joinDuplicate') ?? 'error';
  if (duplicate !== 'error' && duplicate !== 'first' && duplicate !== 'last')
    throw new GraflumeError(
      'INVALID_SPEC',
      'Map joinDuplicate must be "error", "first", or "last".',
    );
  const unmatched = stringOption(context, 'joinUnmatched') ?? 'show';
  if (unmatched !== 'show' && unmatched !== 'hide' && unmatched !== 'error')
    throw new GraflumeError(
      'INVALID_SPEC',
      'Map joinUnmatched must be "show", "hide", or "error".',
    );
  const valueField = context.layer.mark.fields.color;
  if (valueField !== undefined && !context.table.has(valueField))
    throw new GraflumeError('INVALID_DATA', `Map join color field "${valueField}" is missing.`);
  const entries = new Map<string, MapFeatureJoinEntry>();
  for (let rowIndex = 0; rowIndex < context.table.length; rowIndex += 1) {
    const key = mapJoinKey(context.table.value(rowIndex, dataField), caseSensitive);
    if (key === null) continue;
    const value =
      valueField === undefined ? null : numericDataValue(context.table.value(rowIndex, valueField));
    if (entries.has(key)) {
      if (duplicate === 'error')
        throw new GraflumeError('INVALID_DATA', `Map data join contains duplicate key "${key}".`);
      if (duplicate === 'first') continue;
    }
    entries.set(key, { rowIndex, value });
  }
  const values = [...entries.values()].flatMap(({ value }) => (value === null ? [] : [value]));
  let minimum = values[0] ?? 0;
  let maximum = values[0] ?? 0;
  for (const value of values) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return {
    featureField,
    dataField,
    ...(valueField === undefined ? {} : { valueField }),
    entries,
    minimum,
    maximum,
    unmatched,
    caseSensitive,
  };
}

function joinedMapFeature(
  feature: GeoJsonFeature,
  join: MapFeatureJoin | null,
): MapFeatureJoinEntry | null {
  if (join === null) return null;
  return (
    join.entries.get(
      mapJoinKey(
        join.featureField === '$id' ? feature.id : feature.properties?.[join.featureField],
        join.caseSensitive,
      ) ?? '',
    ) ?? null
  );
}

function densifyGeodesicLine(
  points: readonly GeographicPosition[],
  segments: number,
): readonly GeographicPosition[] {
  if (points.length < 2) return points;
  return points.slice(1).flatMap((point, index) => {
    const segment = geodesicPath(points[index]!, point, segments);
    return index === 0 ? segment : segment.slice(1);
  });
}

/** GeoJSON/TopoJSON map compiler with lifecycle, fit/clip/projection, geodesics, and provider tiles. */
export const compileAdvancedMapMark: MarkCompiler = (context) => {
  const source = sourceCollection(context);
  const tileSource = tileSourceOption(context);
  if (source === null && tileSource === null) return compileMapMark(context);
  const scopeInput = context.layer.mark.options.mapScope;
  if (source === null && scopeInput !== undefined)
    throw new GraflumeError(
      'INVALID_SPEC',
      'Map feature scope requires GeoJSON or TopoJSON when a tile source is used.',
    );
  const scope = scopeInput === undefined ? undefined : normalizeMapFeatureScope(scopeInput);
  const selected =
    source === null ? null : scope === undefined ? source : scopeGeoJsonFeatures(source, scope);
  const join = mapFeatureJoin(context);
  const unmatched =
    selected === null || join === null
      ? []
      : selected.features.filter((feature) => joinedMapFeature(feature, join) === null);
  if (join?.unmatched === 'error' && unmatched.length > 0)
    throw new GraflumeError(
      'INVALID_DATA',
      `Map feature join left ${unmatched.length} selected feature(s) without data.`,
    );
  const visible =
    selected === null || join?.unmatched !== 'hide'
      ? selected
      : Object.freeze({
          type: 'FeatureCollection' as const,
          features: Object.freeze(
            selected.features.filter((feature) => joinedMapFeature(feature, join) !== null),
          ),
        });
  if (visible !== null && visible.features.length === 0)
    throw new GraflumeError('INVALID_DATA', 'Map feature join selected no visible features.');
  const maximumFeatures = numberOption(context, 'maximumFeatures') ?? 50_000;
  if (!Number.isInteger(maximumFeatures) || maximumFeatures < 1 || maximumFeatures > 50_000)
    throw new GraflumeError(
      'INVALID_SPEC',
      'Map maximumFeatures must be an integer from 1 to 50000.',
    );
  if (visible !== null && visible.features.length > maximumFeatures)
    throw new GraflumeError(
      'INVALID_DATA',
      `Map scope selected ${visible.features.length} features, above the ${maximumFeatures} feature budget.`,
    );
  const geometryBudget =
    numberOption(context, 'geometryBudget') ?? context.performance.maxLinePoints;
  const prepared =
    visible === null
      ? null
      : prepareMapGeometry(visible, {
          detail: geometryDetailOption(context),
          maximumPositions: Math.max(1_000, Math.min(1_000_000, Math.floor(geometryBudget))),
        });
  const collection = prepared?.collection ?? null;
  const registry = new MapLayerRegistry();
  if (collection !== null) registry.addSource('features', collection);
  if (tileSource !== null) registry.addSource('provider', tileSource);
  if (tileSource !== null)
    registry.addLayer({
      id: 'provider',
      source: 'provider',
      type: 'raster',
      attribution: tileSource.attribution,
    });
  const attribution = stringOption(context, 'attribution');
  if (collection !== null)
    registry.addLayer({
      id: 'features',
      source: 'features',
      type: 'fill',
      visible: true,
      ...(attribution === undefined ? {} : { attribution }),
    });
  const lifecycle = registry.snapshot();
  const projection = projectionName(context);
  const rotate = numberArray(context.layer.mark.options.rotate, 2);
  const clip = numberArray(context.layer.mark.options.clip, 4);
  const rotation = rotate === undefined ? undefined : ([rotate[0]!, rotate[1]!] as const);
  const geographicClip =
    clip === undefined ? undefined : ([clip[0]!, clip[1]!, clip[2]!, clip[3]!] as const);
  const projectionOptions = {
    name: projection,
    ...(rotation === undefined ? {} : { rotate: rotation }),
    ...(geographicClip === undefined ? {} : { clip: geographicClip }),
  } as const;
  const preparedProjectionOptions = {
    name: projection,
    ...(geographicClip === undefined ? {} : { clip: geographicClip }),
  } as const;
  const padding = numberOption(context, 'fitPadding') ?? 18;
  const fitEnabled = booleanOption(context, 'fit') !== false;
  const fitted =
    collection === null || !fitEnabled
      ? null
      : fitMapBounds(
          mapBounds(collection),
          { width: context.plot.width, height: context.plot.height },
          padding,
          projection,
        );
  const centerProjected = projectMapPosition(fitted?.center ?? [0, 0], projectionOptions);
  const zoom = fitEnabled ? 2 ** (fitted?.zoom ?? 0) : 1;
  const mapProjected = (projected: ReturnType<typeof projectMapPosition>): Point | null => {
    if (!projected.visible) return null;
    let horizontalOffset = projected.x - centerProjected.x;
    if (projection !== 'orthographic') {
      if (horizontalOffset > 0.5) horizontalOffset -= 1;
      else if (horizontalOffset < -0.5) horizontalOffset += 1;
    }
    return {
      x: context.plot.x + context.plot.width / 2 + horizontalOffset * context.plot.width * zoom,
      y:
        context.plot.y +
        context.plot.height / 2 +
        (projected.y - centerProjected.y) * context.plot.height * zoom,
    };
  };
  const map = (position: GeographicPosition): Point | null =>
    mapProjected(projectMapPosition(position, projectionOptions));
  const mapPrepared = (position: GeographicPosition): Point | null =>
    mapProjected(projectMapPosition(position, preparedProjectionOptions));
  const projectOpenPaths = (paths: readonly (readonly GeographicPosition[])[]): Point[][] => {
    const output: Point[][] = [];
    for (const path of paths) {
      let current: Point[] = [];
      const flush = () => {
        if (current.length > 1) output.push(current);
        current = [];
      };
      for (const position of path) {
        const point = mapPrepared(position);
        if (point === null) flush();
        else current.push(point);
      }
      flush();
    }
    return output;
  };
  const projectClosedPaths = (paths: readonly (readonly GeographicPosition[])[]): Point[][] =>
    paths.flatMap((path) => {
      const projected = path.flatMap((position) => {
        const point = mapPrepared(position);
        return point === null ? [] : [point];
      });
      return projected.length < 3 ? [] : [projected];
    });
  const nodes: SceneNode[] = [];
  if (booleanOption(context, 'graticule') === true) {
    const step = numberArray(context.layer.mark.options.graticuleStep, 2) ?? [30, 30];
    mapGraticule([step[0]!, step[1]!]).features.forEach((feature, index) => {
      if (feature.geometry === null) return;
      geometryPaths(feature.geometry).forEach((path, pathIndex) => {
        if (path.kind !== 'line') return;
        const projectedPaths = projectOpenPaths(clipMapLine(path.points, projectionOptions));
        const points = projectedPaths[0];
        if (points === undefined) return;
        nodes.push({
          type: 'path',
          ...nodeBase(`${context.layer.id}:graticule:${index}:${pathIndex}`, {
            zIndex: context.layer.zIndex - 4,
            opacity: 0.5,
          }),
          points,
          ...(projectedPaths.length > 1 ? { subpaths: projectedPaths.slice(1) } : {}),
          closed: false,
          stroke: context.theme.colors.axis,
          lineWidth: 0.6,
          dash: [3, 3],
        });
      });
    });
  }
  if (tileSource !== null) {
    const tiles = tileCoordinates(context);
    const count = Math.max(1, Math.ceil(Math.sqrt(tiles.length)));
    tiles.forEach((tile, index) => {
      const column = index % count;
      const row = Math.floor(index / count);
      const width = context.plot.width / count;
      const height = context.plot.height / Math.max(1, Math.ceil(tiles.length / count));
      const url = tileUrl(tileSource, tile);
      nodes.push({
        type: 'rect',
        ...nodeBase(`${context.layer.id}:provider-tile:${tile.z}:${tile.x}:${tile.y}`, {
          zIndex: context.layer.zIndex - 3,
          opacity: 1,
          interactive: context.performance.enableHitTesting,
          datum: {
            layerId: context.layer.id,
            rowIndex: index,
            datum: { z: tile.z, x: tile.x, y: tile.y, url, attribution: tileSource.attribution },
            tooltip: {
              provider: tileSource.type,
              z: tile.z,
              x: tile.x,
              y: tile.y,
              url,
              attribution: tileSource.attribution,
              lifecycle: 'provider request',
            },
          },
        }),
        x: context.plot.x + column * width,
        y: context.plot.y + row * height,
        width,
        height,
        providerTile: { source: tileSource, tile },
        fill: context.theme.colors.surface,
        stroke: context.theme.colors.axis,
        lineWidth: 0.5,
        cornerRadius: 0,
      });
    });
  }
  const colorField = context.layer.mark.fields.color;
  collection?.features.forEach((feature, featureIndex) => {
    if (feature.geometry === null) return;
    const joined = joinedMapFeature(feature, join);
    const value = join === null ? propertyValue(feature, colorField) : joined?.value;
    const numeric = typeof value === 'number' && Number.isFinite(value) ? value : null;
    const colorIndex = numeric === null ? featureIndex : Math.abs(Math.floor(numeric));
    const ratio =
      numeric === null || join === null || join.maximum === join.minimum
        ? null
        : (numeric - join.minimum) / (join.maximum - join.minimum);
    const rawJoinKey =
      join === null
        ? null
        : join.featureField === '$id'
          ? feature.id
          : feature.properties?.[join.featureField];
    const tooltipJoinKey =
      rawJoinKey === null ||
      typeof rawJoinKey === 'string' ||
      typeof rawJoinKey === 'number' ||
      typeof rawJoinKey === 'boolean'
        ? rawJoinKey
        : rawJoinKey === undefined
          ? null
          : JSON.stringify(rawJoinKey).slice(0, 512);
    const color =
      context.layer.mark.fill ??
      (ratio === null
        ? categoricalColor(context.theme, colorIndex, collection.features.length)
        : mappedContinuousColor(context.theme, ratio, 'endpoints'));
    geometryPaths(feature.geometry).forEach((path, pathIndex) => {
      const geodesicApplied =
        booleanOption(context, 'geodesic') === true &&
        path.kind === 'line' &&
        path.points.length >= 2;
      const sourcePoints = geodesicApplied
        ? densifyGeodesicLine(path.points, numberOption(context, 'geodesicSegments') ?? 64)
        : path.kind === 'polygon'
          ? path.outer
          : path.points;
      const rowIndex = joined?.rowIndex ?? featureIndex;
      const sourceDatum = joined === null ? null : context.table.row(joined.rowIndex);
      const datum = {
        layerId: context.layer.id,
        rowIndex,
        datum: {
          ...(sourceDatum ?? {}),
          featureIndex,
          geometry: feature.geometry?.type ?? 'null',
          properties: JSON.stringify(feature.properties),
          scope: scope?.level ?? 'all',
          selectedFeatures: collection.features.length,
          sourcePositions: prepared?.plan.sourcePositions ?? 0,
          renderedPositions: prepared?.plan.renderedPositions ?? 0,
          detail: prepared?.plan.detail ?? 'none',
          joinValue: numeric,
        },
        tooltip: {
          featureIndex,
          geometry: feature.geometry?.type ?? 'null',
          properties: JSON.stringify(feature.properties),
          projection,
          fitCenter: fitted?.center.join(', ') ?? 'none',
          fitZoom: fitted?.zoom ?? 0,
          clipped: clip !== undefined,
          geodesic: geodesicApplied,
          source: 'features',
          layer: 'features',
          holes: path.kind === 'polygon' ? path.holes.length : 0,
          ...(join === null
            ? {}
            : {
                joinKey: tooltipJoinKey,
                joinValue: numeric,
              }),
        },
      };
      if (path.kind === 'point') {
        const projected = map(sourcePoints[0]!);
        if (projected === null) return;
        nodes.push({
          type: 'circle',
          ...nodeBase(`${context.layer.id}:map-feature:${featureIndex}:${pathIndex}`, {
            zIndex: context.layer.zIndex + 2,
            opacity: context.layer.mark.opacity,
            interactive: context.performance.enableHitTesting,
            datum,
          }),
          cx: projected.x,
          cy: projected.y,
          radius: context.layer.mark.radius ?? 5,
          fill: color,
          stroke: context.theme.colors.background,
          lineWidth: 1,
        });
      } else if (path.kind === 'line') {
        const projectedPaths = projectOpenPaths(clipMapLine(sourcePoints, projectionOptions));
        const projected = projectedPaths[0];
        if (projected === undefined) return;
        nodes.push({
          type: 'path',
          ...nodeBase(`${context.layer.id}:map-feature:${featureIndex}:${pathIndex}`, {
            zIndex: context.layer.zIndex + 1,
            opacity: context.layer.mark.opacity,
            interactive: context.performance.enableHitTesting,
            datum,
          }),
          points: projected,
          ...(projectedPaths.length > 1 ? { subpaths: projectedPaths.slice(1) } : {}),
          closed: false,
          stroke: context.layer.mark.stroke ?? color,
          lineWidth: context.layer.mark.lineWidth ?? 1.8,
          lineCap: 'round',
          lineJoin: 'round',
        });
      } else {
        const outerPaths = projectClosedPaths(clipMapPolygonRing(sourcePoints, projectionOptions));
        const projected = outerPaths[0];
        if (projected === undefined) return;
        const holePaths = path.holes.flatMap((hole) =>
          projectClosedPaths(clipMapPolygonRing(hole, projectionOptions)),
        );
        const subpaths = [...outerPaths.slice(1), ...holePaths];
        nodes.push({
          type: 'path',
          ...nodeBase(`${context.layer.id}:map-feature:${featureIndex}:${pathIndex}`, {
            zIndex: context.layer.zIndex + 1,
            opacity: context.layer.mark.opacity,
            interactive: context.performance.enableHitTesting,
            datum: {
              ...datum,
              datum: { ...datum.datum, renderedRings: 1 + subpaths.length },
              tooltip: { ...datum.tooltip, renderedRings: 1 + subpaths.length },
            },
          }),
          points: projected,
          ...(subpaths.length > 0 ? { subpaths } : {}),
          closed: true,
          fill: colorWithOpacity(color, 0.55),
          fillRule: 'evenodd',
          stroke: context.layer.mark.stroke ?? color,
          lineWidth: context.layer.mark.lineWidth ?? 1,
          lineCap: 'round',
          lineJoin: 'round',
        });
      }
    });
  });
  const labels = mapLabelSettings(context);
  if (collection !== null && labels !== null)
    nodes.push(...mapFeatureLabelNodes(context, collection, labels, map));
  lifecycle.attributions.forEach((attribution, index) =>
    nodes.push(
      textNode(
        context,
        `${context.layer.id}:map-attribution:${index}`,
        context.plot.x + context.plot.width - 4,
        context.plot.y + context.plot.height - 3 - index * 11,
        attribution,
        'right',
      ),
    ),
  );
  return nodes;
};

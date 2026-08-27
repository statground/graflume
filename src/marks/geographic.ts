import type { MarkCompileContext } from '../compiler/types.js';
import { GraflumeError } from '../core/errors.js';
import {
  naturalEarthCountries110m,
  type NaturalEarthCountry,
  type NaturalEarthPolygon,
} from '../geography/natural-earth-world-110m.generated.js';
import {
  mapBounds,
  normalizeMapFeatureScope,
  type GeoJsonFeatureCollection,
  type MapBounds,
} from '../geography/map-lifecycle.js';
import { nodeBase } from '../scene/factory.js';
import type { PathNode, Point, Rect, SceneNode, TextNode } from '../scene/types.js';
import type { DataRow } from '../spec/types.js';
import { colorWithOpacity, mixColor } from '../theme/color.js';
import { mappedContinuousColor } from './utils.js';

const WORLD_ASPECT_RATIO = 2;
const DEFAULT_BASEMAP = 'natural-earth';

function optionBoolean(context: MarkCompileContext, name: string, fallback: boolean): boolean {
  const value = context.layer.mark.options[name];
  return typeof value === 'boolean' ? value : fallback;
}

function optionNumber(context: MarkCompileContext, name: string, fallback: number): number {
  const value = context.layer.mark.options[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionString(context: MarkCompileContext, name: string, fallback: string): string {
  const value = context.layer.mark.options[name];
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

/**
 * Returns the undistorted 2:1 equirectangular viewport centered inside a chart plot.
 */
export interface GeographicMapView {
  readonly countries: readonly NaturalEarthCountry[];
  /** Geographic membership bounds retained even when `fit: false` uses the world camera. */
  readonly scopeBounds?: MapBounds;
  readonly bounds?: MapBounds;
  readonly scopeLevel: 'all' | 'country';
  readonly padding?: number;
}

export function geographicViewport(
  plot: MarkCompileContext['plot'],
  view?: GeographicMapView,
): Rect {
  const padding =
    view?.padding === undefined
      ? Math.min(8, plot.width * 0.02, plot.height * 0.04)
      : Math.min(view.padding, plot.width * 0.45, plot.height * 0.45);
  const availableWidth = Math.max(1, plot.width - padding * 2);
  const availableHeight = Math.max(1, plot.height - padding * 2);
  const longitudeSpan =
    view?.bounds === undefined ? 360 : Math.max(1e-9, view.bounds.east - view.bounds.west);
  const latitudeSpan =
    view?.bounds === undefined ? 180 : Math.max(1e-9, view.bounds.north - view.bounds.south);
  const aspectRatio = longitudeSpan / latitudeSpan;
  const width = Math.min(availableWidth, availableHeight * aspectRatio);
  const height = width / aspectRatio;
  return {
    x: plot.x + (plot.width - width) / 2,
    y: plot.y + (plot.height - height) / 2,
    width,
    height,
  };
}

export function isGeographicPosition(longitude: number, latitude: number): boolean {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

export function projectGeographicPosition(
  plot: MarkCompileContext['plot'],
  longitude: number,
  latitude: number,
  view?: GeographicMapView,
): Point {
  const viewport = geographicViewport(plot, view);
  const bounds = view?.bounds ?? { west: -180, south: -90, east: 180, north: 90 };
  let unwrappedLongitude = longitude;
  while (unwrappedLongitude < bounds.west) unwrappedLongitude += 360;
  while (unwrappedLongitude > bounds.east && unwrappedLongitude - 360 >= bounds.west)
    unwrappedLongitude -= 360;
  return {
    x:
      viewport.x +
      ((unwrappedLongitude - bounds.west) / (bounds.east - bounds.west)) * viewport.width,
    y: viewport.y + ((bounds.north - latitude) / (bounds.north - bounds.south)) * viewport.height,
  };
}

function normalizedCountryKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')
    .toUpperCase();
}

let countryIndex: ReadonlyMap<string, NaturalEarthCountry> | undefined;
let exactCountryIndex: ReadonlyMap<string, NaturalEarthCountry> | undefined;

const compatibilityCountryAliases: Readonly<Record<string, string>> = {
  AMERICA: 'USA',
  KOREA: 'KOR',
  REPUBLICOFKOREA: 'KOR',
  SOUTHKOREA: 'KOR',
  대한민국: 'KOR',
  UK: 'GBR',
  UNITEDKINGDOM: 'GBR',
  UNITEDSTATES: 'USA',
};

function naturalEarthCountryIndex(): ReadonlyMap<string, NaturalEarthCountry> {
  if (countryIndex !== undefined) return countryIndex;
  const index = new Map<string, NaturalEarthCountry>();
  for (const country of naturalEarthCountries110m()) {
    for (const alias of country[7]) {
      const key = normalizedCountryKey(alias);
      if (key !== '' && !index.has(key)) index.set(key, country);
    }
  }
  for (const [alias, canonical] of Object.entries(compatibilityCountryAliases)) {
    const country = index.get(canonical);
    if (country !== undefined) index.set(normalizedCountryKey(alias), country);
  }
  countryIndex = index;
  return index;
}

function naturalEarthCountryExact(value: string): NaturalEarthCountry | undefined {
  if (exactCountryIndex === undefined) {
    const index = new Map<string, NaturalEarthCountry>();
    for (const country of naturalEarthCountries110m())
      for (const alias of country[7]) if (!index.has(alias)) index.set(alias, country);
    for (const [alias, canonical] of Object.entries(compatibilityCountryAliases)) {
      const country = naturalEarthCountryIndex().get(canonical);
      if (country !== undefined && !index.has(alias)) index.set(alias, country);
    }
    exactCountryIndex = index;
  }
  return exactCountryIndex.get(value);
}

export function naturalEarthCountry(
  value: string,
  caseSensitive = false,
): NaturalEarthCountry | undefined {
  return caseSensitive
    ? naturalEarthCountryExact(value)
    : naturalEarthCountryIndex().get(normalizedCountryKey(value));
}

function naturalEarthCollection(
  countries: readonly NaturalEarthCountry[],
): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: countries.map((country) => ({
      type: 'Feature',
      id: country[0],
      properties: {
        id: country[0],
        iso2: country[1],
        iso3: country[2],
        numeric: country[3],
        name: country[4],
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: country[8],
      },
    })),
  };
}

/** Resolves the built-in Admin-0 scope without loading or embedding subdivisions. */
export function resolveGeographicMapView(context: MarkCompileContext): GeographicMapView {
  const input = context.layer.mark.options.mapScope;
  if (input === undefined)
    return Object.freeze({
      countries: naturalEarthCountries110m(),
      scopeLevel: 'all',
    });
  const scope = normalizeMapFeatureScope(input);
  if (scope.level !== 'country')
    throw new GraflumeError(
      'INVALID_SPEC',
      'Built-in Natural Earth basemaps accept mapScope.level "country"; region scopes require loaded GeoJSON or TopoJSON.',
    );
  if (scope.parentProperty !== undefined)
    throw new GraflumeError(
      'INVALID_SPEC',
      'Built-in country scope does not accept parentProperty or parentValues.',
    );
  const selected: NaturalEarthCountry[] = [];
  const missing: string[] = [];
  for (const value of scope.values) {
    const country = naturalEarthCountry(String(value), scope.caseSensitive);
    if (country === undefined) missing.push(String(value));
    else if (!selected.some((entry) => entry[0] === country[0])) selected.push(country);
  }
  if (missing.length > 0 && scope.unmatched === 'error')
    throw new GraflumeError(
      'INVALID_DATA',
      `Built-in country scope did not match ${missing.length} requested value(s).`,
      { details: { missing: Object.freeze(missing) } },
    );
  if (selected.length === 0 && scope.empty === 'error')
    throw new GraflumeError('INVALID_DATA', 'Built-in country scope selected no countries.');
  const scopeBounds =
    selected.length === 0 ? undefined : mapBounds(naturalEarthCollection(selected));
  const authoredPadding = context.layer.mark.options.fitPadding;
  if (
    authoredPadding !== undefined &&
    (typeof authoredPadding !== 'number' ||
      !Number.isFinite(authoredPadding) ||
      authoredPadding < 0)
  )
    throw new GraflumeError('INVALID_SPEC', 'Map fitPadding must be a nonnegative finite number.');
  const fit = context.layer.mark.options.fit;
  if (fit !== undefined && typeof fit !== 'boolean')
    throw new GraflumeError('INVALID_SPEC', 'Map fit must be boolean.');
  return Object.freeze({
    countries: Object.freeze(selected),
    ...(scopeBounds === undefined ? {} : { scopeBounds }),
    ...(scopeBounds === undefined || fit === false ? {} : { bounds: scopeBounds }),
    scopeLevel: 'country',
    padding: typeof authoredPadding === 'number' ? authoredPadding : 18,
  });
}

export function geographicPositionInView(
  longitude: number,
  latitude: number,
  view: GeographicMapView,
): boolean {
  if (view.scopeLevel === 'country' && view.countries.length === 0) return false;
  const bounds = view.scopeBounds ?? view.bounds;
  if (bounds === undefined) return isGeographicPosition(longitude, latitude);
  let unwrapped = longitude;
  while (unwrapped < bounds.west) unwrapped += 360;
  while (unwrapped > bounds.east && unwrapped - 360 >= bounds.west) unwrapped -= 360;
  return (
    unwrapped >= bounds.west &&
    unwrapped <= bounds.east &&
    latitude >= bounds.south &&
    latitude <= bounds.north
  );
}

function projectedPolygon(
  plot: MarkCompileContext['plot'],
  polygon: NaturalEarthPolygon,
  view?: GeographicMapView,
): { readonly points: readonly Point[]; readonly subpaths?: readonly (readonly Point[])[] } | null {
  const rings = polygon
    .map((ring) =>
      ring
        .filter(([longitude, latitude]) => isGeographicPosition(longitude, latitude))
        .map(([longitude, latitude]) => projectGeographicPosition(plot, longitude, latitude, view)),
    )
    .filter((ring) => ring.length >= 3);
  const points = rings[0];
  if (points === undefined) return null;
  return {
    points,
    ...(rings.length > 1 ? { subpaths: rings.slice(1) } : {}),
  };
}

function countryPathNodes(
  context: MarkCompileContext,
  country: NaturalEarthCountry,
  options: {
    readonly idPrefix: string;
    readonly zIndex: number;
    readonly fill: string;
    readonly stroke: string;
    readonly lineWidth: number;
    readonly opacity?: number;
    readonly interactive?: boolean;
    readonly rowIndex?: number;
    readonly datum?: DataRow;
    readonly view?: GeographicMapView;
  },
): PathNode[] {
  const nodes: PathNode[] = [];
  country[8].forEach((polygon, polygonIndex) => {
    const projected = projectedPolygon(context.plot, polygon, options.view);
    if (projected === null) return;
    const hasDatum = options.rowIndex !== undefined && options.datum !== undefined;
    nodes.push({
      type: 'path',
      ...nodeBase(`${options.idPrefix}:${country[0]}:${polygonIndex}`, {
        zIndex: options.zIndex,
        opacity: options.opacity ?? 1,
        interactive: options.interactive ?? false,
        ...(hasDatum
          ? {
              datum: {
                layerId: context.layer.id,
                rowIndex: options.rowIndex as number,
                datum: options.datum as DataRow,
              },
            }
          : {}),
      }),
      points: projected.points,
      ...(projected.subpaths === undefined ? {} : { subpaths: projected.subpaths }),
      closed: true,
      fillRule: 'evenodd',
      fill: options.fill,
      stroke: options.stroke,
      lineWidth: options.lineWidth,
      lineJoin: 'round',
    });
  });
  return nodes;
}

function scopedGraticuleValues(minimum: number, maximum: number): readonly number[] {
  const span = maximum - minimum;
  const candidates = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 30, 45, 60, 90];
  const step = candidates.find((candidate) => span / candidate <= 7) ?? 90;
  const first = Math.ceil(minimum / step) * step;
  const values: number[] = [];
  for (let value = first; value <= maximum + step * 1e-9; value += step)
    if (value > minimum + step * 1e-9 && value < maximum - step * 1e-9)
      values.push(Number(value.toFixed(10)));
  return values;
}

function builtInCountryLabelNodes(
  context: MarkCompileContext,
  view: GeographicMapView,
): readonly TextNode[] {
  const input = context.layer.mark.options.labels;
  if (input === undefined || input === false) return [];
  if (input !== true && (input === null || typeof input !== 'object' || Array.isArray(input)))
    throw new GraflumeError('INVALID_SPEC', 'Map labels must be boolean or an options object.');
  const options = input === true ? {} : (input as Readonly<Record<string, unknown>>);
  const allowed = new Set([
    'field',
    'longitudeField',
    'latitudeField',
    'maximum',
    'fontSize',
    'padding',
    'collision',
  ]);
  const unknown = Object.keys(options).find((key) => !allowed.has(key));
  if (unknown !== undefined)
    throw new GraflumeError('INVALID_SPEC', `Unknown map labels property "${unknown}".`);
  const field = typeof options.field === 'string' ? options.field : 'name';
  if (!['id', 'iso2', 'iso3', 'numeric', 'name'].includes(field))
    throw new GraflumeError(
      'INVALID_SPEC',
      'Built-in country labels.field must be id, iso2, iso3, numeric, or name.',
    );
  const boundedInteger = (
    value: unknown,
    fallback: number,
    minimum: number,
    maximum: number,
    name: string,
  ): number => {
    const resolved = value ?? fallback;
    if (
      !Number.isInteger(resolved) ||
      (resolved as number) < minimum ||
      (resolved as number) > maximum
    )
      throw new GraflumeError(
        'INVALID_SPEC',
        `Map labels.${name} must be an integer from ${minimum} to ${maximum}.`,
      );
    return resolved as number;
  };
  const maximum = boundedInteger(options.maximum, 120, 1, 1_000, 'maximum');
  const fontSize = boundedInteger(options.fontSize, 10, 6, 40, 'fontSize');
  const padding = boundedInteger(options.padding, 3, 0, 24, 'padding');
  const collision = options.collision ?? 'hide';
  if (collision !== 'hide' && collision !== 'none')
    throw new GraflumeError('INVALID_SPEC', 'Map labels.collision must be "hide" or "none".');
  const viewport = geographicViewport(context.plot, view);
  const capacity = Math.max(1, Math.floor((viewport.width * viewport.height) / 2_800));
  const limit = Math.min(maximum, collision === 'none' ? maximum : capacity);
  const fieldIndex = { id: 0, iso2: 1, iso3: 2, numeric: 3, name: 4 }[field]!;
  const occupied: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  }[] = [];
  const countries = [...view.countries].sort((left, right) => {
    const area = (country: NaturalEarthCountry) =>
      country[8].reduce(
        (sum, polygon) =>
          sum +
          polygon[0]!.reduce((value, point, index, ring) => {
            const next = ring[(index + 1) % ring.length]!;
            return value + point[0] * next[1] - next[0] * point[1];
          }, 0),
        0,
      );
    return Math.abs(area(right)) - Math.abs(area(left));
  });
  const nodes: TextNode[] = [];
  for (const country of countries) {
    if (nodes.length >= limit) break;
    const point = projectGeographicPosition(context.plot, country[5], country[6], view);
    if (
      point.x < viewport.x ||
      point.x > viewport.x + viewport.width ||
      point.y < viewport.y ||
      point.y > viewport.y + viewport.height
    )
      continue;
    const text = String(country[fieldIndex] ?? country[4]);
    const units = Array.from(text).reduce(
      (sum, character) =>
        sum +
        (/\p{Extended_Pictographic}|\p{Script=Han}|\p{Script=Hangul}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(
          character,
        )
          ? 1
          : 0.58),
      0,
    );
    const width = Math.max(fontSize, units * fontSize);
    const box = {
      left: point.x - width / 2 - padding,
      right: point.x + width / 2 + padding,
      top: point.y - fontSize / 2 - padding,
      bottom: point.y + fontSize / 2 + padding,
    };
    if (
      collision === 'hide' &&
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
      ...nodeBase(`${context.layer.id}:natural-earth:label:${country[0]}`, {
        zIndex: context.layer.zIndex + 6,
      }),
      x: point.x,
      y: point.y,
      text,
      fill: context.theme.colors.text,
      fontFamily: context.theme.typography.fontFamily,
      fontSize,
      fontWeight: 600,
      align: 'center',
      baseline: 'middle',
      rotation: 0,
    });
  }
  return nodes;
}

export function worldBasemapNodes(
  context: MarkCompileContext,
  view: GeographicMapView = resolveGeographicMapView(context),
): SceneNode[] {
  const { layer, plot, theme } = context;
  if (optionString(context, 'basemap', DEFAULT_BASEMAP) === 'none') return [];

  const viewport = geographicViewport(plot, view);
  const oceanFill = optionString(
    context,
    'oceanFill',
    mixColor(theme.colors.background, mappedContinuousColor(theme, 0), 0.2),
  );
  const landFill = optionString(
    context,
    'landFill',
    mixColor(theme.colors.surface, theme.colors.grid, theme.mode === 'dark' ? 0.3 : 0.48),
  );
  const countryStroke = optionString(
    context,
    'countryStroke',
    colorWithOpacity(theme.colors.axis, theme.mode === 'dark' ? 0.62 : 0.48),
  );
  const countryLineWidth = Math.max(0, optionNumber(context, 'countryLineWidth', 0.55));
  const nodes: SceneNode[] = [
    {
      type: 'rect',
      ...nodeBase(`${layer.id}:natural-earth:surface`, { zIndex: layer.zIndex - 4 }),
      x: viewport.x,
      y: viewport.y,
      width: viewport.width,
      height: viewport.height,
      fill: oceanFill,
      stroke: theme.colors.grid,
      lineWidth: 0.8,
      cornerRadius: 8,
    },
  ];

  if (optionBoolean(context, 'graticule', false)) {
    const longitudes =
      view.bounds === undefined
        ? [-120, -60, 0, 60, 120]
        : scopedGraticuleValues(view.bounds.west, view.bounds.east);
    const latitudes =
      view.bounds === undefined
        ? [-60, -30, 0, 30, 60]
        : scopedGraticuleValues(view.bounds.south, view.bounds.north);
    for (const longitude of longitudes) {
      const top = projectGeographicPosition(plot, longitude, view.bounds?.north ?? 90, view);
      const bottom = projectGeographicPosition(plot, longitude, view.bounds?.south ?? -90, view);
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:natural-earth:longitude:${longitude}`, {
          zIndex: layer.zIndex - 3.5,
          opacity: 0.5,
        }),
        x1: top.x,
        y1: top.y,
        x2: bottom.x,
        y2: bottom.y,
        stroke: theme.colors.grid,
        lineWidth: 0.6,
      });
    }
    for (const latitude of latitudes) {
      const left = projectGeographicPosition(plot, view.bounds?.west ?? -180, latitude, view);
      const right = projectGeographicPosition(plot, view.bounds?.east ?? 180, latitude, view);
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:natural-earth:latitude:${latitude}`, {
          zIndex: layer.zIndex - 3.5,
          opacity: 0.5,
        }),
        x1: left.x,
        y1: left.y,
        x2: right.x,
        y2: right.y,
        stroke: theme.colors.grid,
        lineWidth: 0.6,
      });
    }
  }

  for (const country of view.countries) {
    nodes.push(
      ...countryPathNodes(context, country, {
        idPrefix: `${layer.id}:natural-earth:country`,
        zIndex: layer.zIndex - 3,
        fill: landFill,
        stroke: countryStroke,
        lineWidth: countryLineWidth,
        view,
      }),
    );
  }

  nodes.push(...builtInCountryLabelNodes(context, view));

  if (optionBoolean(context, 'attribution', true)) {
    const attribution: TextNode = {
      type: 'text',
      ...nodeBase(`${layer.id}:natural-earth:attribution`, {
        zIndex: layer.zIndex - 1.5,
        opacity: 0.76,
      }),
      x: viewport.x + viewport.width - 5,
      y: viewport.y + viewport.height - 4,
      text: 'Natural Earth · 1:110m',
      fill: theme.colors.mutedText,
      fontFamily: theme.typography.fontFamily,
      fontSize: Math.max(8, theme.typography.fontSize - 3),
      fontWeight: 500,
      align: 'right',
      baseline: 'bottom',
      rotation: 0,
    };
    nodes.push(attribution);
  }
  return nodes;
}

export function worldCountryOverlayNodes(
  context: MarkCompileContext,
  country: NaturalEarthCountry,
  rowIndex: number,
  fill: string,
  view?: GeographicMapView,
): readonly PathNode[] {
  return countryPathNodes(context, country, {
    idPrefix: `${context.layer.id}:natural-earth:region`,
    zIndex: context.layer.zIndex,
    fill,
    stroke: context.layer.mark.stroke ?? context.theme.colors.background,
    lineWidth: context.layer.mark.lineWidth ?? 0.8,
    opacity: context.layer.mark.opacity,
    interactive: context.performance.enableHitTesting,
    rowIndex,
    datum: context.table.row(rowIndex),
    ...(view === undefined ? {} : { view }),
  });
}

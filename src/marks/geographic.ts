import type { MarkCompileContext } from '../compiler/types.js';
import {
  naturalEarthCountries110m,
  type NaturalEarthCountry,
  type NaturalEarthPolygon,
} from '../geography/natural-earth-world-110m.generated.js';
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
export function geographicViewport(plot: MarkCompileContext['plot']): Rect {
  const padding = Math.min(8, plot.width * 0.02, plot.height * 0.04);
  const availableWidth = Math.max(1, plot.width - padding * 2);
  const availableHeight = Math.max(1, plot.height - padding * 2);
  const width = Math.min(availableWidth, availableHeight * WORLD_ASPECT_RATIO);
  const height = width / WORLD_ASPECT_RATIO;
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
): Point {
  const viewport = geographicViewport(plot);
  return {
    x: viewport.x + ((longitude + 180) / 360) * viewport.width,
    y: viewport.y + ((90 - latitude) / 180) * viewport.height,
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

function naturalEarthCountryIndex(): ReadonlyMap<string, NaturalEarthCountry> {
  if (countryIndex !== undefined) return countryIndex;
  const index = new Map<string, NaturalEarthCountry>();
  for (const country of naturalEarthCountries110m()) {
    for (const alias of country[7]) {
      const key = normalizedCountryKey(alias);
      if (key !== '' && !index.has(key)) index.set(key, country);
    }
  }
  const aliases: Readonly<Record<string, string>> = {
    AMERICA: 'USA',
    KOREA: 'KOR',
    REPUBLICOFKOREA: 'KOR',
    SOUTHKOREA: 'KOR',
    대한민국: 'KOR',
    UK: 'GBR',
    UNITEDKINGDOM: 'GBR',
    UNITEDSTATES: 'USA',
  };
  for (const [alias, canonical] of Object.entries(aliases)) {
    const country = index.get(canonical);
    if (country !== undefined) index.set(normalizedCountryKey(alias), country);
  }
  countryIndex = index;
  return index;
}

export function naturalEarthCountry(value: string): NaturalEarthCountry | undefined {
  return naturalEarthCountryIndex().get(normalizedCountryKey(value));
}

function projectedPolygon(
  plot: MarkCompileContext['plot'],
  polygon: NaturalEarthPolygon,
): { readonly points: readonly Point[]; readonly subpaths?: readonly (readonly Point[])[] } | null {
  const rings = polygon
    .map((ring) =>
      ring
        .filter(([longitude, latitude]) => isGeographicPosition(longitude, latitude))
        .map(([longitude, latitude]) => projectGeographicPosition(plot, longitude, latitude)),
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
  },
): PathNode[] {
  const nodes: PathNode[] = [];
  country[8].forEach((polygon, polygonIndex) => {
    const projected = projectedPolygon(context.plot, polygon);
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

export function worldBasemapNodes(context: MarkCompileContext): SceneNode[] {
  const { layer, plot, theme } = context;
  if (optionString(context, 'basemap', DEFAULT_BASEMAP) === 'none') return [];

  const viewport = geographicViewport(plot);
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
    for (let longitude = -120; longitude <= 120; longitude += 60) {
      const top = projectGeographicPosition(plot, longitude, 90);
      const bottom = projectGeographicPosition(plot, longitude, -90);
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
    for (let latitude = -60; latitude <= 60; latitude += 30) {
      const left = projectGeographicPosition(plot, -180, latitude);
      const right = projectGeographicPosition(plot, 180, latitude);
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

  for (const country of naturalEarthCountries110m()) {
    nodes.push(
      ...countryPathNodes(context, country, {
        idPrefix: `${layer.id}:natural-earth:country`,
        zIndex: layer.zIndex - 3,
        fill: landFill,
        stroke: countryStroke,
        lineWidth: countryLineWidth,
      }),
    );
  }

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
  });
}

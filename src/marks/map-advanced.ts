import type { MarkCompiler, MarkCompileContext } from '../compiler/types.js';
import {
  clipMapLine,
  clipMapPolygonRing,
  fitMapBounds,
  geodesicPath,
  mapBounds,
  mapGraticule,
  MapLayerRegistry,
  normalizeGeoJson,
  projectMapPosition,
  tileUrl,
  topologyToGeoJson,
  type GeoJsonFeature,
  type GeoJsonFeatureCollection,
  type GeoJsonGeometry,
  type GeographicPosition,
  type MapProjectionName,
  type TileCoordinate,
  type TileSourceDefinition,
  type Topology,
} from '../geography/map-lifecycle.js';
import { nodeBase } from '../scene/factory.js';
import type { Point, SceneNode, TextNode } from '../scene/types.js';
import { categoricalColor, colorWithOpacity } from '../theme/color.js';
import { compileMapMark } from './structured.js';

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
  const collection = sourceCollection(context);
  const tileSource = tileSourceOption(context);
  if (collection === null && tileSource === null) return compileMapMark(context);
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
    const value = propertyValue(feature, colorField);
    const colorIndex = typeof value === 'number' ? Math.abs(Math.floor(value)) : featureIndex;
    const color =
      context.layer.mark.fill ??
      categoricalColor(context.theme, colorIndex, collection.features.length);
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
      const datum = {
        layerId: context.layer.id,
        rowIndex: featureIndex,
        datum: {
          featureIndex,
          geometry: feature.geometry?.type ?? 'null',
          properties: JSON.stringify(feature.properties),
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

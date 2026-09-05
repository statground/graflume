import type { Scene, SceneNode, GroupNode, DatumReference } from '../scene/types.js';

export interface SVGImportOptions {
  readonly title?: string;
  readonly maxNodes?: number;
  readonly maxPoints?: number;
}

/** Import bounded R/SVG vector geometry into a Graflume Scene, never live markup. */
export function sceneFromSVG(source: string, options: SVGImportOptions = {}): Scene {
  if (
    typeof source !== 'string' ||
    source.length > 8_000_000 ||
    /<!DOCTYPE|<!ENTITY/i.test(source)
  ) {
    throw new Error('Invalid SVG document');
  }
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = document.documentElement;
  if (root.localName !== 'svg' || document.querySelector('parsererror'))
    throw new Error('Invalid SVG document');
  const numbers = (value: string | null): number[] =>
    (value?.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
  const viewBox = numbers(root.getAttribute('viewBox'));
  const width = viewBox[2] ?? parseFloat(root.getAttribute('width') ?? '864');
  const height = viewBox[3] ?? parseFloat(root.getAttribute('height') ?? '540');
  if (!(width > 0 && width <= 32_768 && height > 0 && height <= 32_768))
    throw new Error('Invalid SVG dimensions');
  const limit = (value: number | undefined, fallback: number, cap: number) => {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
      throw new Error('Invalid SVG budget');
    return Math.min(value ?? fallback, cap);
  };
  const maxNodes = limit(options.maxNodes, 30_000, 50_000),
    maxPoints = limit(options.maxPoints, 250_000, 500_000);
  const length = (raw: string, reference: number): number => {
    const match = raw
      .trim()
      .match(/^([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)(%|px|pt|pc|in|cm|mm)?$/);
    if (match === null) throw new Error('Unsupported SVG length');
    const units: Record<string, number> = {
      px: 1,
      pt: 96 / 72,
      pc: 16,
      in: 96,
      cm: 96 / 2.54,
      mm: 96 / 25.4,
    };
    const value =
      Number(match[1]) * (match[2] === '%' ? reference / 100 : units[match[2] ?? 'px']!);
    if (!Number.isFinite(value)) throw new Error('Invalid SVG length');
    return value;
  };
  const rules: { selector: string; style: CSSStyleDeclaration }[] = [];
  for (const sheet of Array.from(root.querySelectorAll('style'))) {
    const css = sheet.textContent || '';
    if (/@import|@font-face|url\s*\(/i.test(css))
      throw new Error('External SVG styles are unsupported');
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const probe = globalThis.document.createElement('span');
      probe.style.cssText = match[2]!;
      for (const selector of match[1]!.split(','))
        rules.push({ selector: selector.trim(), style: probe.style });
    }
  }
  let nodeCount = 0,
    pointCount = 0;
  const safeColor = (value: string | undefined, fallback?: string): string | undefined => {
    if (!value || value === 'inherit') return fallback;
    if (value === 'none' || value === 'transparent') return undefined;
    if (/url\s*\(|[<>]|[\u0000-\u001f]/i.test(value))
      throw new Error('External SVG paint is unsupported');
    return value;
  };
  const alphaColor = (value: string | undefined, raw: string | undefined): string | undefined => {
    if (!value || raw === undefined) return value;
    const alpha = Number(raw);
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1)
      throw new Error('Invalid SVG paint opacity');
    if (alpha === 1) return value;
    const probe = globalThis.document.createElement('span');
    probe.style.color = value;
    probe.style.display = 'none';
    if (!probe.style.color) throw new Error('Invalid SVG color');
    globalThis.document.documentElement.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    const channels = numbers(color);
    if (!/^rgba?\(/i.test(color) || channels.length < 3)
      throw new Error('Unsupported SVG alpha color');
    return `rgba(${channels[0]},${channels[1]},${channels[2]},${(channels[3] ?? 1) * alpha})`;
  };
  const base = () => {
    nodeCount++;
    if (nodeCount > maxNodes) throw new Error('SVG node limit exceeded');
    return { id: `svg-${nodeCount}`, zIndex: nodeCount, opacity: 1, visible: true };
  };
  const point = (matrix: DOMMatrix, x: number, y: number) => {
    pointCount++;
    if (pointCount > maxPoints) throw new Error('SVG point limit exceeded');
    const value = new DOMPoint(x, y).matrixTransform(matrix);
    if (![value.x, value.y].every(Number.isFinite)) throw new Error('Invalid SVG geometry');
    return { x: value.x, y: value.y };
  };
  const visit = (
    node: Element,
    parent: DOMMatrix,
    inherited: Record<string, string>,
    seen: Set<Element>,
    inheritedDatum?: DatumReference,
  ): SceneNode[] => {
    if (seen.size > 64 || seen.has(node)) throw new Error('Invalid recursive SVG reference');
    const nextSeen = new Set(seen);
    nextSeen.add(node);
    const tag = node.localName;
    if (
      ['script', 'foreignObject', 'image', 'iframe', 'audio', 'video', 'animate', 'set'].includes(
        tag,
      )
    )
      throw new Error('Active or raster SVG content is unsupported');
    if (['defs', 'style', 'title', 'desc', 'metadata', 'clipPath'].includes(tag)) return [];
    const style = { ...inherited };
    delete style.opacity;
    for (const key of [
      'fill',
      'stroke',
      'stroke-width',
      'stroke-dasharray',
      'stroke-linecap',
      'stroke-linejoin',
      'fill-rule',
      'fill-opacity',
      'stroke-opacity',
      'opacity',
      'font-size',
      'font-family',
      'font-weight',
      'font-style',
      'text-anchor',
      'display',
      'visibility',
    ]) {
      for (const rule of rules) {
        try {
          if (node.matches(rule.selector) && rule.style.getPropertyValue(key))
            style[key] = rule.style.getPropertyValue(key);
        } catch (_) {
          throw new Error('Unsupported SVG selector');
        }
      }
      const value = (node as SVGElement).style?.getPropertyValue(key) || node.getAttribute(key);
      if (value) style[key] = value;
    }
    if (style.display === 'none' || style.visibility === 'hidden') return [];
    let matrix = parent;
    const transforms = (node as SVGGraphicsElement).transform?.baseVal;
    if (transforms?.numberOfItems) {
      const m = transforms.consolidate()?.matrix;
      if (m) matrix = parent.multiply(new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]));
    }
    const id = node.getAttribute('data-id') || node.getAttribute('data_id');
    const tooltip =
      node.getAttribute('data-tooltip') ||
      node.getAttribute('tooltip') ||
      node.querySelector(':scope > title')?.textContent;
    const datum: DatumReference | undefined =
      id || tooltip
        ? {
            layerId: 'svg',
            rowIndex: nodeCount,
            datum: { id: id || '', tooltip: tooltip || '' },
            tooltip: { id: id || '', tooltip: tooltip || '' },
          }
        : inheritedDatum;
    const common = {
      ...base(),
      opacity: Math.max(0, Math.min(1, Number(style.opacity ?? 1))),
      ...(datum ? { interactive: true, datum } : {}),
    };
    const fill = alphaColor(safeColor(style.fill, '#000'), style['fill-opacity']),
      stroke = alphaColor(safeColor(style.stroke), style['stroke-opacity']);
    const lineWidth =
      Math.max(0, length(style['stroke-width'] ?? '1', Math.hypot(width, height) / Math.SQRT2)) *
      Math.hypot(matrix.a, matrix.b);
    const paint = {
      ...(fill ? { fill } : {}),
      ...(stroke ? { stroke } : {}),
      lineWidth,
      dash: numbers(style['stroke-dasharray'] || null),
    };
    const num = (name: string, fallback = 0) =>
      length(
        node.getAttribute(name) ?? String(fallback),
        ['x', 'x1', 'x2', 'cx', 'rx', 'width'].includes(name)
          ? width
          : ['y', 'y1', 'y2', 'cy', 'ry', 'height'].includes(name)
            ? height
            : Math.hypot(width, height) / Math.SQRT2,
      );
    if (tag === 'use') {
      const href =
        node.getAttribute('href') || node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (!href || !/^#[^\s]+$/.test(href))
        throw new Error('External SVG references are unsupported');
      const target = document.getElementById(href.slice(1));
      if (!target) throw new Error('Missing SVG reference');
      return [
        {
          ...common,
          type: 'group',
          children: visit(target, matrix.translate(num('x'), num('y')), style, nextSeen, datum),
        },
      ];
    }
    if (['svg', 'g', 'symbol', 'a'].includes(tag)) {
      const children = Array.from(node.children).flatMap((child) =>
        visit(child, matrix, style, nextSeen, datum),
      );
      const group: GroupNode = { ...common, type: 'group', children };
      const clip = node.getAttribute('clip-path')?.match(/^url\(#([^\s)]+)\)$/)?.[1];
      if (clip) {
        const definition = document.getElementById(clip);
        const rect = definition?.querySelector('rect');
        if (rect) {
          if (matrix.b || matrix.c) throw new Error('Rotated SVG clips are unsupported');
          const p = point(
            matrix,
            Number(rect.getAttribute('x') || 0),
            Number(rect.getAttribute('y') || 0),
          );
          return [
            {
              ...group,
              clip: {
                x: p.x,
                y: p.y,
                width: Number(rect.getAttribute('width')) * Math.abs(matrix.a),
                height: Number(rect.getAttribute('height')) * Math.abs(matrix.d),
              },
            },
          ];
        }
        const d = definition?.querySelector('path')?.getAttribute('d') || '';
        const sections = d.trim().split('Z');
        const outline = sections[0] ?? '';
        const commands = outline.match(/[ML]/g)?.join('');
        const values = numbers(outline);
        // Cairo appends an empty moveto at the rectangle origin after closing its clip.
        const tail = sections[1]?.trim() ?? '';
        const tailValues = numbers(tail);
        if (
          !/^[\s\d.,+eE\-MLZ]+$/.test(d) ||
          sections.length !== 2 ||
          (commands !== 'MLLL' && commands !== 'MLLLL') ||
          (tail !== '' &&
            (tail.match(/[ML]/g)?.join('') !== 'M' ||
              tailValues.length !== 2 ||
              tailValues[0] !== values[0] ||
              tailValues[1] !== values[1])) ||
          matrix.b ||
          matrix.c
        )
          throw new Error('Unsupported SVG clip');
        if (values.length === 10 && values[8] === values[0] && values[9] === values[1])
          values.splice(8, 2);
        if (values.length !== 8) throw new Error('Unsupported SVG clip');
        const xs = [values[0]!, values[2]!, values[4]!, values[6]!],
          ys = [values[1]!, values[3]!, values[5]!, values[7]!];
        if (
          new Set(xs).size !== 2 ||
          new Set(ys).size !== 2 ||
          xs.some((x, i) => x !== xs[(i + 1) % 4] && ys[i] !== ys[(i + 1) % 4])
        )
          throw new Error('Unsupported SVG clip');
        const a = point(matrix, Math.min(...xs), Math.min(...ys)),
          b = point(matrix, Math.max(...xs), Math.max(...ys));
        return [
          {
            ...group,
            clip: {
              x: Math.min(a.x, b.x),
              y: Math.min(a.y, b.y),
              width: Math.abs(b.x - a.x),
              height: Math.abs(b.y - a.y),
            },
          },
        ];
      }
      return [group];
    }
    if (tag === 'text') {
      const p = point(matrix, num('x'), num('y'));
      return [
        {
          ...common,
          type: 'text',
          ...p,
          text: node.textContent || '',
          fill: fill || 'transparent',
          fontFamily: style['font-family'] || 'sans-serif',
          fontSize: parseFloat(style['font-size'] || '12') * Math.hypot(matrix.a, matrix.b),
          fontWeight: style['font-weight'] || 'normal',
          fontStyle: style['font-style'] === 'italic' ? 'italic' : 'normal',
          align:
            style['text-anchor'] === 'middle'
              ? 'center'
              : style['text-anchor'] === 'end'
                ? 'right'
                : 'left',
          baseline: 'alphabetic',
          rotation: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
        },
      ];
    }
    if (tag === 'line') {
      const a = point(matrix, num('x1'), num('y1')),
        b = point(matrix, num('x2'), num('y2'));
      return [
        {
          ...common,
          type: 'line',
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          stroke: stroke || '#000',
          lineWidth,
          dash: paint.dash,
        },
      ];
    }
    let paths: { x: number; y: number }[][] = [],
      closed = false;
    if (tag === 'rect') {
      const x = num('x'),
        y = num('y'),
        w = num('width'),
        h = num('height');
      closed = true;
      paths = [
        [
          point(matrix, x, y),
          point(matrix, x + w, y),
          point(matrix, x + w, y + h),
          point(matrix, x, y + h),
        ],
      ];
    } else if (tag === 'circle' || tag === 'ellipse') {
      const cx = num('cx'),
        cy = num('cy'),
        rx = num(tag === 'circle' ? 'r' : 'rx'),
        ry = num(tag === 'circle' ? 'r' : 'ry');
      closed = true;
      paths = [
        Array.from({ length: 48 }, (_, i) =>
          point(
            matrix,
            cx + rx * Math.cos((i * Math.PI) / 24),
            cy + ry * Math.sin((i * Math.PI) / 24),
          ),
        ),
      ];
    } else if (tag === 'polygon' || tag === 'polyline') {
      const values = numbers(node.getAttribute('points'));
      closed = tag === 'polygon';
      paths = [
        Array.from({ length: Math.floor(values.length / 2) }, (_, i) =>
          point(matrix, values[i * 2]!, values[i * 2 + 1]!),
        ),
      ];
    } else if (tag === 'path') {
      const d = node.getAttribute('d') || '';
      // Separate absolute moveto subpaths so glyph holes do not acquire connecting lines.
      const segments = d.match(/[Mm][^Mm]*/g) || [];
      let endpoint = { x: 0, y: 0 };
      for (let segment of segments) {
        if (segment[0] === 'm') {
          const first = segment.match(
            /^m\s*([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)[\s,]*([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/,
          );
          if (!first) throw new Error('Invalid SVG moveto');
          const rest = segment.slice(first[0].length).trim().replace(/^,\s*/, '');
          segment = `M ${endpoint.x + Number(first[1])} ${endpoint.y + Number(first[2])} ${/^[-+.\d]/.test(rest) ? 'l ' : ''}${rest}`;
        }
        const path = globalThis.document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', segment);
        let length: number;
        try {
          length = path.getTotalLength();
        } catch (_) {
          throw new Error('Invalid SVG path');
        }
        if (!Number.isFinite(length) || length > 1_000_000)
          throw new Error('Invalid SVG path length');
        const count = Math.min(
          8192,
          Math.max(2, Math.ceil((length * Math.max(1, Math.hypot(matrix.a, matrix.b))) / 0.65)),
        );
        paths.push(
          Array.from({ length: count + 1 }, (_, i) => {
            const p = path.getPointAtLength((length * i) / count);
            return point(matrix, p.x, p.y);
          }),
        );
        endpoint = path.getPointAtLength(length);
        closed ||= /[zZ]\s*$/.test(segment);
      }
    } else {
      throw new Error(`Unsupported SVG geometry: ${tag}`);
    }
    return paths.length
      ? [
          {
            ...common,
            ...paint,
            type: 'path',
            points: paths[0]!,
            ...(paths.length > 1 ? { subpaths: paths.slice(1) } : {}),
            closed,
            fillRule: style['fill-rule'] === 'evenodd' ? 'evenodd' : 'nonzero',
          },
        ]
      : [];
  };
  const matrix = new DOMMatrix().translate(-(viewBox[0] || 0), -(viewBox[1] || 0));
  const nodes = visit(root, matrix, {}, new Set());
  return {
    width,
    height,
    background: '#fff',
    root: { ...base(), type: 'group', children: nodes },
    accessibility: {
      label: options.title || root.querySelector('title')?.textContent || 'R chart',
    },
    semanticIndex: [],
    metadata: {
      rowCount: nodeCount,
      renderedNodeCount: nodeCount,
      performanceProfile: 'standard',
      hitTestingEnabled: true,
    },
  };
}

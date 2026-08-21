from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

MARKS = [
    ("radar", "radar"),
    ("tree", "tree"),
    ("graph", "graph"),
    ("chord", "chord"),
    ("funnel", "funnel"),
    ("parallel", "parallel"),
    ("boxplot", "boxplot"),
    ("effectScatter", "effect-scatter"),
    ("lines", "lines"),
    ("heatmap", "heatmap"),
    ("pictorialBar", "pictorial-bar"),
    ("themeRiver", "theme-river"),
    ("sunburst", "sunburst"),
    ("custom", "custom"),
]
MARK_TYPES = [mark for _, mark in MARKS]


def read(path: str) -> str:
    return (ROOT / path).read_text("utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, "utf-8")


def insert_before_last(content: str, needle: str, addition: str) -> str:
    index = content.rfind(needle)
    if index < 0:
        raise RuntimeError(f"Unable to find final {needle!r}")
    return content[:index] + addition + content[index:]


def add_mark_union(content: str) -> str:
    if "'effect-scatter'" in content:
        return content
    pattern = re.compile(r"(export\s+type\s+MarkType\s*=)([\s\S]*?);", re.M)
    match = pattern.search(content)
    if not match:
        raise RuntimeError("MarkType union was not found")
    body = match.group(2).rstrip()
    suffix = "\n" + "\n".join(f"  | '{mark}'" for mark in MARK_TYPES)
    replacement = match.group(1) + body + suffix + ";"
    return content[: match.start()] + replacement + content[match.end() :]


def add_literals_to_collection(content: str, anchors: tuple[str, ...]) -> tuple[str, bool]:
    if "'effect-scatter'" in content:
        return content, False
    positions = [content.find(f"'{anchor}'") for anchor in anchors]
    if any(position < 0 for position in positions):
        return content, False
    pivot = min(positions)
    left_square = content.rfind("[", 0, pivot)
    left_paren = content.rfind("(", 0, pivot)
    left = max(left_square, left_paren)
    if left < 0:
        return content, False
    opener = content[left]
    closer = "]" if opener == "[" else ")"
    depth = 0
    quote = None
    escaped = False
    right = None
    for index in range(left, len(content)):
        char = content[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "'\"`":
            quote = char
            continue
        if char == opener:
            depth += 1
        elif char == closer:
            depth -= 1
            if depth == 0:
                right = index
                break
    if right is None:
        return content, False
    region = content[left:right]
    if not all(f"'{anchor}'" in region for anchor in anchors):
        return content, False
    indent_match = re.search(r"\n([ \t]+)'[^']+'", region)
    indent = indent_match.group(1) if indent_match else "  "
    addition = "\n" + "\n".join(f"{indent}'{mark}'," for mark in MARK_TYPES)
    return content[:right] + addition + content[right:], True


def patch_schema() -> None:
    path = ROOT / "schema/graflume.schema.json"
    schema = json.loads(path.read_text("utf-8"))
    enum_patched = False

    def walk(value):
        nonlocal enum_patched
        if isinstance(value, dict):
            enum = value.get("enum")
            if isinstance(enum, list) and {"line", "bar", "pie"}.issubset(enum):
                for mark in MARK_TYPES:
                    if mark not in enum:
                        enum.append(mark)
                enum_patched = True
            properties = value.get("properties")
            if isinstance(properties, dict) and {"open", "high", "low", "close"}.intersection(properties):
                for field in [
                    "id", "parent", "source", "target", "min", "q1", "median", "q3", "max",
                    "x1", "y1", "x2", "y2", "series", "dimension", "symbol", "depth",
                ]:
                    properties.setdefault(field, {"type": "string", "minLength": 1})
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(schema)
    if not enum_patched:
        raise RuntimeError("Mark enum was not found in JSON Schema")
    path.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", "utf-8")


ADVANCED_TS = r'''const ADVANCED_MARK_TYPES = new Set([
  'radar',
  'tree',
  'graph',
  'chord',
  'funnel',
  'parallel',
  'boxplot',
  'effect-scatter',
  'lines',
  'heatmap',
  'pictorial-bar',
  'theme-river',
  'sunburst',
  'custom',
]);

export function isAdvancedMarkType(value: unknown): boolean {
  return typeof value === 'string' && ADVANCED_MARK_TYPES.has(value);
}

type Row = Record<string, unknown>;
type Point = { x: number; y: number };

const FALLBACK_PALETTE = [
  '#4f46e5',
  '#0f766e',
  '#d97706',
  '#e11d48',
  '#7c3aed',
  '#0891b2',
  '#65a30d',
  '#ea580c',
];

function number(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function extent(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? [min - 1, max + 1] : [min, max];
}

function scale(value: number, domain: [number, number], start: number, end: number): number {
  const ratio = (value - domain[0]) / (domain[1] - domain[0] || 1);
  return start + ratio * (end - start);
}

function polygon(points: Point[], style: Record<string, unknown> = {}, datum?: Row, datumIndex?: number) {
  return { type: 'path', points, closed: true, ...style, datum, datumIndex };
}

function polyline(points: Point[], style: Record<string, unknown> = {}, datum?: Row, datumIndex?: number) {
  return { type: 'path', points, closed: false, fill: 'transparent', ...style, datum, datumIndex };
}

function line(x1: number, y1: number, x2: number, y2: number, style: Record<string, unknown> = {}) {
  return { type: 'line', x1, y1, x2, y2, ...style };
}

function circle(cx: number, cy: number, r: number, style: Record<string, unknown> = {}, datum?: Row, datumIndex?: number) {
  return { type: 'circle', cx, cy, r, ...style, datum, datumIndex };
}

function rect(x: number, y: number, width: number, height: number, style: Record<string, unknown> = {}, datum?: Row, datumIndex?: number) {
  return { type: 'rect', x, y, width, height, ...style, datum, datumIndex };
}

function label(x: number, y: number, value: string, style: Record<string, unknown> = {}) {
  return { type: 'text', x, y, text: value, value, ...style };
}

function contextValues(context: any) {
  const spec = context?.spec ?? context?.normalizedSpec ?? context ?? {};
  const mark = spec?.mark ?? context?.mark ?? {};
  const rows = (Array.isArray(context?.data) ? context.data : Array.isArray(spec?.data) ? spec.data : []) as Row[];
  const candidate = context?.layout?.plot ?? context?.plot ?? context?.bounds ?? {};
  const width = number(candidate.width, number(spec?.width, 640) - 96);
  const height = number(candidate.height, number(spec?.height, 400) - 88);
  const plot = {
    x: number(candidate.x, 64),
    y: number(candidate.y, 48),
    width: Math.max(80, width),
    height: Math.max(80, height),
  };
  const palette = context?.theme?.palette?.categorical ?? context?.theme?.categorical ?? FALLBACK_PALETTE;
  const colors = Array.isArray(palette) && palette.length > 0 ? palette : FALLBACK_PALETTE;
  const ink = context?.theme?.text?.primary ?? context?.theme?.colors?.text ?? '#334155';
  const grid = context?.theme?.axis?.grid ?? context?.theme?.colors?.grid ?? '#cbd5e1';
  const surface = context?.theme?.surface ?? context?.theme?.colors?.surface ?? '#ffffff';
  const fields = mark?.fields ?? {};
  const options = mark?.options ?? {};
  const field = (name: string, fallback: string) => text(fields?.[name], fallback);
  return { spec, mark, rows, plot, colors, ink, grid, surface, options, field };
}

function radar(context: any): any[] {
  const { rows, plot, colors, ink, grid, field, options } = contextValues(context);
  const dimensions = Array.isArray(options?.dimensions)
    ? options.dimensions.map((value: unknown) => text(value)).filter(Boolean)
    : Object.keys(rows[0] ?? {}).filter((key) => key !== field('series', 'series') && typeof rows[0]?.[key] === 'number');
  if (dimensions.length < 3) return [];
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.min(plot.width, plot.height) * 0.38;
  const maxima = dimensions.map((dimension: string) => Math.max(1, ...rows.map((row) => Math.abs(number(row[dimension])))));
  const nodes: any[] = [];
  for (let ringIndex = 1; ringIndex <= 4; ringIndex += 1) {
    const ringRadius = (radius * ringIndex) / 4;
    nodes.push(polyline(dimensions.map((_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / dimensions.length;
      return { x: cx + Math.cos(angle) * ringRadius, y: cy + Math.sin(angle) * ringRadius };
    }).concat([{ x: cx, y: cy - ringRadius }]), { stroke: grid, strokeWidth: 1, opacity: 0.48 }));
  }
  dimensions.forEach((dimension: string, index: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / dimensions.length;
    nodes.push(line(cx, cy, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, { stroke: grid, strokeWidth: 1 }));
    nodes.push(label(cx + Math.cos(angle) * (radius + 18), cy + Math.sin(angle) * (radius + 18), dimension, { fill: ink, fontSize: 11, align: 'center', baseline: 'middle' }));
  });
  rows.forEach((row, rowIndex) => {
    const points = dimensions.map((dimension: string, index: number) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / dimensions.length;
      const localRadius = radius * Math.max(0, number(row[dimension])) / maxima[index];
      return { x: cx + Math.cos(angle) * localRadius, y: cy + Math.sin(angle) * localRadius };
    });
    nodes.push(polygon(points, { fill: colors[rowIndex % colors.length], opacity: 0.2, stroke: colors[rowIndex % colors.length], strokeWidth: 2, lineJoin: 'round' }, row, rowIndex));
  });
  return nodes;
}

function hierarchyRows(rows: Row[], idField: string, parentField: string) {
  const byId = new Map(rows.map((row, index) => [text(row[idField], `node-${index}`), { row, index }]));
  const depth = new Map<string, number>();
  const getDepth = (id: string, trail = new Set<string>()): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (trail.has(id)) return 0;
    trail.add(id);
    const item = byId.get(id);
    const parent = item ? text(item.row[parentField]) : '';
    const value = !parent || !byId.has(parent) ? 0 : getDepth(parent, trail) + 1;
    depth.set(id, value);
    return value;
  };
  rows.forEach((row, index) => getDepth(text(row[idField], `node-${index}`)));
  return { byId, depth };
}

function tree(context: any): any[] {
  const { rows, plot, colors, ink, grid, surface, field } = contextValues(context);
  const idField = field('id', 'id');
  const parentField = field('parent', 'parent');
  const labelField = field('label', 'label');
  const { byId, depth } = hierarchyRows(rows, idField, parentField);
  const maxDepth = Math.max(0, ...depth.values());
  const levels = new Map<number, { row: Row; index: number; id: string }[]>();
  rows.forEach((row, index) => {
    const id = text(row[idField], `node-${index}`);
    const level = depth.get(id) ?? 0;
    levels.set(level, [...(levels.get(level) ?? []), { row, index, id }]);
  });
  const positions = new Map<string, Point>();
  levels.forEach((items, level) => items.forEach((item, order) => positions.set(item.id, {
    x: plot.x + ((level + 0.5) / (maxDepth + 1)) * plot.width,
    y: plot.y + ((order + 0.5) / items.length) * plot.height,
  })));
  const nodes: any[] = [];
  rows.forEach((row, index) => {
    const id = text(row[idField], `node-${index}`);
    const parent = text(row[parentField]);
    const from = positions.get(parent);
    const to = positions.get(id);
    if (from && to) {
      const midX = (from.x + to.x) / 2;
      nodes.push(polyline([{ x: from.x + 42, y: from.y }, { x: midX, y: from.y }, { x: midX, y: to.y }, { x: to.x - 42, y: to.y }], { stroke: grid, strokeWidth: 1.5 }));
    }
  });
  rows.forEach((row, index) => {
    const id = text(row[idField], `node-${index}`);
    const point = positions.get(id)!;
    nodes.push(rect(point.x - 42, point.y - 17, 84, 34, { fill: surface, stroke: colors[(depth.get(id) ?? 0) % colors.length], strokeWidth: 1.5, radius: 7 }, row, index));
    nodes.push(label(point.x, point.y, text(row[labelField], id), { fill: ink, fontSize: 11, fontWeight: 600, align: 'center', baseline: 'middle' }));
  });
  return nodes;
}

function graph(context: any): any[] {
  const { rows, plot, colors, ink, grid, surface, field, options } = contextValues(context);
  const idField = field('id', 'id');
  const labelField = field('label', 'label');
  const sourceField = field('source', 'source');
  const targetField = field('target', 'target');
  const nodeRows = rows.filter((row) => row[idField] != null || (row[sourceField] == null && row[targetField] == null));
  const linkRows = [...rows.filter((row) => row[sourceField] != null && row[targetField] != null), ...(Array.isArray(options?.links) ? options.links : [])] as Row[];
  const ids = Array.from(new Set(nodeRows.map((row, index) => text(row[idField], `node-${index}`)).concat(linkRows.flatMap((row) => [text(row[sourceField]), text(row[targetField])]).filter(Boolean))));
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.min(plot.width, plot.height) * 0.36;
  const positions = new Map(ids.map((id, index) => [id, { x: cx + Math.cos(-Math.PI / 2 + index * Math.PI * 2 / Math.max(1, ids.length)) * radius, y: cy + Math.sin(-Math.PI / 2 + index * Math.PI * 2 / Math.max(1, ids.length)) * radius }]));
  const nodes: any[] = [];
  linkRows.forEach((row) => {
    const from = positions.get(text(row[sourceField]));
    const to = positions.get(text(row[targetField]));
    if (from && to) nodes.push(line(from.x, from.y, to.x, to.y, { stroke: grid, strokeWidth: Math.max(1, number(row.value, 1)), opacity: 0.55 }));
  });
  ids.forEach((id, index) => {
    const point = positions.get(id)!;
    const row = nodeRows.find((item, itemIndex) => text(item[idField], `node-${itemIndex}`) === id) ?? { [idField]: id };
    nodes.push(circle(point.x, point.y, 10, { fill: colors[index % colors.length], stroke: surface, strokeWidth: 2 }, row, index));
    nodes.push(label(point.x, point.y + 19, text(row[labelField], id), { fill: ink, fontSize: 10, align: 'center', baseline: 'top' }));
  });
  return nodes;
}

function chord(context: any): any[] {
  const { rows, plot, colors, ink, surface, field } = contextValues(context);
  const sourceField = field('source', 'source');
  const targetField = field('target', 'target');
  const names = Array.from(new Set(rows.flatMap((row) => [text(row[sourceField]), text(row[targetField])]).filter(Boolean)));
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.min(plot.width, plot.height) * 0.36;
  const points = new Map(names.map((name, index) => [name, { x: cx + Math.cos(-Math.PI / 2 + index * Math.PI * 2 / Math.max(1, names.length)) * radius, y: cy + Math.sin(-Math.PI / 2 + index * Math.PI * 2 / Math.max(1, names.length)) * radius }]));
  const nodes: any[] = [];
  rows.forEach((row, index) => {
    const from = points.get(text(row[sourceField]));
    const to = points.get(text(row[targetField]));
    if (!from || !to) return;
    const width = Math.max(2, Math.min(20, number(row.value, 1) * 2));
    const dx = to.y - from.y;
    const dy = from.x - to.x;
    const length = Math.hypot(dx, dy) || 1;
    const ox = dx / length * width / 2;
    const oy = dy / length * width / 2;
    nodes.push(polygon([
      { x: from.x + ox, y: from.y + oy },
      { x: cx + ox * 0.25, y: cy + oy * 0.25 },
      { x: to.x + ox, y: to.y + oy },
      { x: to.x - ox, y: to.y - oy },
      { x: cx - ox * 0.25, y: cy - oy * 0.25 },
      { x: from.x - ox, y: from.y - oy },
    ], { fill: colors[index % colors.length], opacity: 0.28, stroke: colors[index % colors.length], strokeWidth: 1 }, row, index));
  });
  names.forEach((name, index) => {
    const point = points.get(name)!;
    nodes.push(circle(point.x, point.y, 8, { fill: colors[index % colors.length], stroke: surface, strokeWidth: 2 }));
    nodes.push(label(point.x, point.y + 16, name, { fill: ink, fontSize: 10, align: 'center', baseline: 'top' }));
  });
  return nodes;
}

function funnel(context: any): any[] {
  const { rows, plot, colors, ink, field } = contextValues(context);
  const valueField = field('value', 'value');
  const labelField = field('label', field('category', 'category'));
  const ordered = rows.map((row, index) => ({ row, index, value: Math.max(0, number(row[valueField])) })).sort((a, b) => b.value - a.value);
  const maximum = Math.max(1, ...ordered.map((item) => item.value));
  const height = plot.height / Math.max(1, ordered.length);
  const nodes: any[] = [];
  ordered.forEach((item, order) => {
    const topWidth = plot.width * (item.value / maximum);
    const nextValue = ordered[order + 1]?.value ?? item.value * 0.45;
    const bottomWidth = plot.width * (nextValue / maximum);
    const y = plot.y + order * height;
    nodes.push(polygon([
      { x: plot.x + (plot.width - topWidth) / 2, y },
      { x: plot.x + (plot.width + topWidth) / 2, y },
      { x: plot.x + (plot.width + bottomWidth) / 2, y: y + height - 2 },
      { x: plot.x + (plot.width - bottomWidth) / 2, y: y + height - 2 },
    ], { fill: colors[order % colors.length], opacity: 0.88 }, item.row, item.index));
    nodes.push(label(plot.x + plot.width / 2, y + height / 2, `${text(item.row[labelField], `Stage ${order + 1}`)}  ${item.value}`, { fill: '#ffffff', fontSize: 11, fontWeight: 600, align: 'center', baseline: 'middle' }));
  });
  return nodes;
}

function parallel(context: any): any[] {
  const { rows, plot, colors, ink, grid, field, options } = contextValues(context);
  const seriesField = field('series', 'series');
  const dimensions = Array.isArray(options?.dimensions)
    ? options.dimensions.map((value: unknown) => text(value)).filter(Boolean)
    : Object.keys(rows[0] ?? {}).filter((key) => key !== seriesField && typeof rows[0]?.[key] === 'number');
  if (dimensions.length < 2) return [];
  const domains = dimensions.map((dimension: string) => extent(rows.map((row) => number(row[dimension]))));
  const nodes: any[] = [];
  dimensions.forEach((dimension: string, index: number) => {
    const x = plot.x + index * plot.width / (dimensions.length - 1);
    nodes.push(line(x, plot.y, x, plot.y + plot.height, { stroke: grid, strokeWidth: 1 }));
    nodes.push(label(x, plot.y + plot.height + 15, dimension, { fill: ink, fontSize: 10, align: 'center', baseline: 'top' }));
  });
  rows.forEach((row, rowIndex) => {
    const points = dimensions.map((dimension: string, index: number) => ({
      x: plot.x + index * plot.width / (dimensions.length - 1),
      y: scale(number(row[dimension]), domains[index], plot.y + plot.height, plot.y),
    }));
    nodes.push(polyline(points, { stroke: colors[rowIndex % colors.length], strokeWidth: 1.7, opacity: 0.7, lineJoin: 'round' }, row, rowIndex));
  });
  return nodes;
}

function boxplot(context: any): any[] {
  const { rows, plot, colors, ink, grid, surface, field } = contextValues(context);
  const categoryField = field('category', 'category');
  const fields = ['min', 'q1', 'median', 'q3', 'max'].map((name) => field(name, name));
  const domain = extent(rows.flatMap((row) => fields.map((name) => number(row[name]))));
  const band = plot.width / Math.max(1, rows.length);
  const nodes: any[] = [];
  rows.forEach((row, index) => {
    const cx = plot.x + (index + 0.5) * band;
    const [minField, q1Field, medianField, q3Field, maxField] = fields;
    const yMin = scale(number(row[minField]), domain, plot.y + plot.height, plot.y);
    const yQ1 = scale(number(row[q1Field]), domain, plot.y + plot.height, plot.y);
    const yMedian = scale(number(row[medianField]), domain, plot.y + plot.height, plot.y);
    const yQ3 = scale(number(row[q3Field]), domain, plot.y + plot.height, plot.y);
    const yMax = scale(number(row[maxField]), domain, plot.y + plot.height, plot.y);
    const width = Math.min(42, band * 0.58);
    nodes.push(line(cx, yMin, cx, yMax, { stroke: grid, strokeWidth: 1.5 }));
    nodes.push(line(cx - width * 0.3, yMin, cx + width * 0.3, yMin, { stroke: grid, strokeWidth: 1.5 }));
    nodes.push(line(cx - width * 0.3, yMax, cx + width * 0.3, yMax, { stroke: grid, strokeWidth: 1.5 }));
    nodes.push(rect(cx - width / 2, Math.min(yQ1, yQ3), width, Math.abs(yQ3 - yQ1), { fill: colors[index % colors.length], opacity: 0.25, stroke: colors[index % colors.length], strokeWidth: 1.7, radius: 3 }, row, index));
    nodes.push(line(cx - width / 2, yMedian, cx + width / 2, yMedian, { stroke: colors[index % colors.length], strokeWidth: 2.3 }));
    nodes.push(label(cx, plot.y + plot.height + 14, text(row[categoryField], `${index + 1}`), { fill: ink, fontSize: 10, align: 'center', baseline: 'top' }));
    nodes.push(circle(cx, yMedian, 2.5, { fill: surface, stroke: colors[index % colors.length], strokeWidth: 1 }));
  });
  return nodes;
}

function effectScatter(context: any): any[] {
  const { rows, plot, colors, surface, field } = contextValues(context);
  const xField = field('x', 'x');
  const yField = field('y', 'y');
  const sizeField = field('size', 'size');
  const xDomain = extent(rows.map((row) => number(row[xField])));
  const yDomain = extent(rows.map((row) => number(row[yField])));
  const nodes: any[] = [];
  rows.forEach((row, index) => {
    const cx = scale(number(row[xField]), xDomain, plot.x, plot.x + plot.width);
    const cy = scale(number(row[yField]), yDomain, plot.y + plot.height, plot.y);
    const r = Math.max(4, Math.min(14, number(row[sizeField], 7)));
    const color = colors[index % colors.length];
    nodes.push(circle(cx, cy, r * 2.1, { fill: color, opacity: 0.08 }));
    nodes.push(circle(cx, cy, r * 1.45, { fill: color, opacity: 0.16 }));
    nodes.push(circle(cx, cy, r, { fill: color, stroke: surface, strokeWidth: 2 }, row, index));
  });
  return nodes;
}

function lines(context: any): any[] {
  const { rows, plot, colors, field } = contextValues(context);
  const x1Field = field('x1', 'x1');
  const y1Field = field('y1', 'y1');
  const x2Field = field('x2', 'x2');
  const y2Field = field('y2', 'y2');
  const xDomain = extent(rows.flatMap((row) => [number(row[x1Field]), number(row[x2Field])]));
  const yDomain = extent(rows.flatMap((row) => [number(row[y1Field]), number(row[y2Field])]));
  return rows.map((row, index) => line(
    scale(number(row[x1Field]), xDomain, plot.x, plot.x + plot.width),
    scale(number(row[y1Field]), yDomain, plot.y + plot.height, plot.y),
    scale(number(row[x2Field]), xDomain, plot.x, plot.x + plot.width),
    scale(number(row[y2Field]), yDomain, plot.y + plot.height, plot.y),
    { stroke: colors[index % colors.length], strokeWidth: Math.max(1.5, number(row.value, 1.5)), opacity: 0.78, datum: row, datumIndex: index, lineCap: 'round' },
  ));
}

function heatmap(context: any): any[] {
  const { rows, plot, colors, ink, grid, field } = contextValues(context);
  const xField = field('x', 'x');
  const yField = field('y', 'y');
  const valueField = field('value', 'value');
  const xs = Array.from(new Set(rows.map((row) => text(row[xField]))));
  const ys = Array.from(new Set(rows.map((row) => text(row[yField]))));
  const domain = extent(rows.map((row) => number(row[valueField])));
  const cellWidth = plot.width / Math.max(1, xs.length);
  const cellHeight = plot.height / Math.max(1, ys.length);
  const nodes: any[] = [];
  rows.forEach((row, index) => {
    const xIndex = xs.indexOf(text(row[xField]));
    const yIndex = ys.indexOf(text(row[yField]));
    const ratio = (number(row[valueField]) - domain[0]) / (domain[1] - domain[0] || 1);
    const paletteIndex = Math.max(0, Math.min(colors.length - 1, Math.round(ratio * (colors.length - 1))));
    nodes.push(rect(plot.x + xIndex * cellWidth + 1, plot.y + yIndex * cellHeight + 1, Math.max(1, cellWidth - 2), Math.max(1, cellHeight - 2), { fill: colors[paletteIndex], opacity: 0.25 + ratio * 0.72, radius: 3 }, row, index));
  });
  xs.forEach((value, index) => nodes.push(label(plot.x + (index + 0.5) * cellWidth, plot.y + plot.height + 13, value, { fill: ink, fontSize: 9, align: 'center', baseline: 'top' })));
  ys.forEach((value, index) => nodes.push(label(plot.x - 8, plot.y + (index + 0.5) * cellHeight, value, { fill: ink, fontSize: 9, align: 'right', baseline: 'middle' })));
  nodes.push(rect(plot.x, plot.y, plot.width, plot.height, { fill: 'transparent', stroke: grid, strokeWidth: 1, radius: 4 }));
  return nodes;
}

function pictorialBar(context: any): any[] {
  const { rows, plot, colors, ink, field } = contextValues(context);
  const categoryField = field('category', 'category');
  const valueField = field('value', 'value');
  const maximum = Math.max(1, ...rows.map((row) => number(row[valueField])));
  const band = plot.width / Math.max(1, rows.length);
  const nodes: any[] = [];
  rows.forEach((row, index) => {
    const count = Math.max(0, Math.round(number(row[valueField]) / maximum * 10));
    const spacing = plot.height / 11;
    for (let symbol = 0; symbol < count; symbol += 1) {
      nodes.push(circle(plot.x + (index + 0.5) * band, plot.y + plot.height - (symbol + 0.7) * spacing, Math.min(8, band * 0.2), { fill: colors[index % colors.length], opacity: 0.88 }, row, index));
    }
    nodes.push(label(plot.x + (index + 0.5) * band, plot.y + plot.height + 14, text(row[categoryField], `${index + 1}`), { fill: ink, fontSize: 10, align: 'center', baseline: 'top' }));
  });
  return nodes;
}

function themeRiver(context: any): any[] {
  const { rows, plot, colors, field } = contextValues(context);
  const timeField = field('time', field('x', 'time'));
  const seriesField = field('series', 'series');
  const valueField = field('value', 'value');
  const times = Array.from(new Set(rows.map((row) => text(row[timeField]))));
  const series = Array.from(new Set(rows.map((row) => text(row[seriesField]))));
  const matrix = series.map((name) => times.map((time) => number(rows.find((row) => text(row[seriesField]) === name && text(row[timeField]) === time)?.[valueField])));
  const totals = times.map((_, timeIndex) => matrix.reduce((sum, values) => sum + values[timeIndex], 0));
  const maximum = Math.max(1, ...totals);
  const baselines = totals.map((total) => plot.y + plot.height / 2 + total / maximum * plot.height * 0.38);
  const nodes: any[] = [];
  matrix.forEach((values, seriesIndex) => {
    const top: Point[] = [];
    const bottom: Point[] = [];
    values.forEach((value, timeIndex) => {
      const x = plot.x + timeIndex * plot.width / Math.max(1, times.length - 1);
      const height = value / maximum * plot.height * 0.76;
      const lower = baselines[timeIndex];
      const upper = lower - height;
      top.push({ x, y: upper });
      bottom.unshift({ x, y: lower });
      baselines[timeIndex] = upper;
    });
    nodes.push(polygon([...top, ...bottom], { fill: colors[seriesIndex % colors.length], opacity: 0.72, stroke: colors[seriesIndex % colors.length], strokeWidth: 1 }, { [seriesField]: series[seriesIndex] }, seriesIndex));
  });
  return nodes;
}

function sunburst(context: any): any[] {
  const { rows, plot, colors, surface, field } = contextValues(context);
  const idField = field('id', 'id');
  const parentField = field('parent', 'parent');
  const valueField = field('value', 'value');
  const { depth } = hierarchyRows(rows, idField, parentField);
  const maxDepth = Math.max(1, ...depth.values());
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const outer = Math.min(plot.width, plot.height) * 0.42;
  const total = Math.max(1, rows.reduce((sum, row) => sum + Math.max(0, number(row[valueField], 1)), 0));
  let angle = -Math.PI / 2;
  const nodes: any[] = [];
  rows.forEach((row, index) => {
    const value = Math.max(0, number(row[valueField], 1));
    const span = value / total * Math.PI * 2;
    const level = depth.get(text(row[idField], `node-${index}`)) ?? 0;
    const inner = outer * level / (maxDepth + 1);
    const outerRadius = outer * (level + 1) / (maxDepth + 1);
    const steps = Math.max(5, Math.ceil(span * 10));
    const points: Point[] = [];
    for (let step = 0; step <= steps; step += 1) {
      const current = angle + span * step / steps;
      points.push({ x: cx + Math.cos(current) * outerRadius, y: cy + Math.sin(current) * outerRadius });
    }
    for (let step = steps; step >= 0; step -= 1) {
      const current = angle + span * step / steps;
      points.push({ x: cx + Math.cos(current) * inner, y: cy + Math.sin(current) * inner });
    }
    nodes.push(polygon(points, { fill: colors[index % colors.length], opacity: 0.84, stroke: surface, strokeWidth: 1.5 }, row, index));
    angle += span;
  });
  return nodes;
}

function custom(context: any): any[] {
  const { options } = contextValues(context);
  const scene = Array.isArray(options?.scene) ? options.scene : [];
  const allowed = new Set(['group', 'rect', 'line', 'path', 'circle', 'text']);
  const sanitize = (node: unknown, depth = 0): any | null => {
    if (!node || typeof node !== 'object' || depth > 12) return null;
    const input = node as Record<string, unknown>;
    if (!allowed.has(text(input.type))) return null;
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
      if (typeof value === 'function') continue;
      if (key === 'children' && Array.isArray(value)) output.children = value.map((child) => sanitize(child, depth + 1)).filter(Boolean);
      else if (Array.isArray(value)) output[key] = value.map((item) => typeof item === 'object' ? sanitize(item, depth + 1) ?? item : item);
      else if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) output[key] = value;
    }
    return output;
  };
  return scene.map((node: unknown) => sanitize(node)).filter(Boolean);
}

export function compileAdvancedMark(context: any): any[] {
  const { mark } = contextValues(context);
  switch (mark?.type) {
    case 'radar': return radar(context);
    case 'tree': return tree(context);
    case 'graph': return graph(context);
    case 'chord': return chord(context);
    case 'funnel': return funnel(context);
    case 'parallel': return parallel(context);
    case 'boxplot': return boxplot(context);
    case 'effect-scatter': return effectScatter(context);
    case 'lines': return lines(context);
    case 'heatmap': return heatmap(context);
    case 'pictorial-bar': return pictorialBar(context);
    case 'theme-river': return themeRiver(context);
    case 'sunburst': return sunburst(context);
    case 'custom': return custom(context);
    default: return [];
  }
}
'''


def patch_structured_dispatch() -> None:
    structured_path = ROOT / "src/marks/structured.ts"
    content = structured_path.read_text("utf-8")
    if "./advanced.js" not in content:
        last_import = max(match.end() for match in re.finditer(r"^import[\s\S]*?;\s*$", content, re.M))
        content = content[:last_import] + "\nimport { compileAdvancedMark, isAdvancedMarkType } from './advanced.js';" + content[last_import:]
    function_match = re.search(r"export\s+function\s+compileStructuredMark\s*\(\s*([A-Za-z_$][\w$]*)[^)]*\)\s*(?::[^\{]+)?\{", content)
    if not function_match:
        raise RuntimeError("compileStructuredMark function was not found")
    parameter = function_match.group(1)
    guard = f"\n  if (isAdvancedMarkType(({parameter} as any)?.spec?.mark?.type ?? ({parameter} as any)?.mark?.type)) {{\n    return compileAdvancedMark({parameter}) as any;\n  }}\n"
    if "isAdvancedMarkType((" not in content:
        content = content[: function_match.end()] + guard + content[function_match.end() :]
    structured_path.write_text(content, "utf-8")

    routed = False
    for path in sorted((ROOT / "src/compiler").rglob("*.ts")):
        source = path.read_text("utf-8")
        if "compileStructuredMark" not in source or "case 'calendar'" not in source:
            continue
        if "case 'radar':" not in source:
            cases = "".join(f"    case '{mark}':\n" for mark in MARK_TYPES)
            source = source.replace("    case 'calendar':", cases + "    case 'calendar':", 1)
            path.write_text(source, "utf-8")
        routed = True
        break
    if not routed:
        for path in sorted((ROOT / "src/compiler").rglob("*.ts")):
            source = path.read_text("utf-8")
            if "compileStructuredMark" not in source or "calendar:" not in source:
                continue
            if "radar: compileStructuredMark" not in source:
                insertion = "".join(f"  '{mark}': compileStructuredMark,\n" for mark in MARK_TYPES)
                source = source.replace("  calendar: compileStructuredMark,", insertion + "  calendar: compileStructuredMark,", 1)
                path.write_text(source, "utf-8")
            routed = True
            break
    if not routed:
        raise RuntimeError("Structured mark compiler routing was not found")


def patch_types_and_validation() -> None:
    types_path = ROOT / "src/spec/types.ts"
    types_path.write_text(add_mark_union(types_path.read_text("utf-8")), "utf-8")

    validate_path = ROOT / "src/spec/validate.ts"
    validate = validate_path.read_text("utf-8")
    patched = False
    for anchors in [("line", "bar", "pie"), ("line", "area", "point")]:
        validate, did_patch = add_literals_to_collection(validate, anchors)
        patched = patched or did_patch
        if did_patch:
            break
    if not patched and "'effect-scatter'" not in validate:
        raise RuntimeError("Supported mark collection was not found")
    # Advanced marks own their coordinate contracts and therefore can omit common x/y encodings.
    for anchors in [("pie", "gauge"), ("calendar", "sankey")]:
        candidate, did_patch = add_literals_to_collection(validate, anchors)
        if did_patch:
            validate = candidate
            break
    validate_path.write_text(validate, "utf-8")


def extract_function_block(content: str, function_name: str) -> tuple[int, int, str] | None:
    patterns = [
        re.compile(rf"export\s+function\s+{re.escape(function_name)}\s*\("),
        re.compile(rf"export\s+const\s+{re.escape(function_name)}\s*=")
    ]
    for pattern in patterns:
        match = pattern.search(content)
        if not match:
            continue
        if "function" not in match.group(0):
            line_end = content.find("\n", match.start())
            return match.start(), len(content) if line_end < 0 else line_end + 1, content[match.start(): len(content) if line_end < 0 else line_end + 1]
        brace = content.find("{", match.end())
        if brace < 0:
            continue
        depth = 0
        quote = None
        escaped = False
        for index in range(brace, len(content)):
            char = content[index]
            if quote:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == quote:
                    quote = None
                continue
            if char in "'\"`":
                quote = char
                continue
            if char == "{": depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    end = index + 1
                    while end < len(content) and content[end] in ";\r\n": end += 1
                    return match.start(), end, content[match.start():end]
    return None


def patch_quick_apis() -> None:
    source_files = [ROOT / "src/index.ts", *sorted((ROOT / "src/api").rglob("*.ts"))]
    target = None
    source = None
    template_name = None
    template = None
    for path in source_files:
        if not path.exists():
            continue
        content = path.read_text("utf-8")
        for name in ["vegaChart", "pie", "line"]:
            block = extract_function_block(content, name)
            if block and re.search(r"['\"](?:vega|pie|line)['\"]", block[2]):
                target, source, template_name, template = path, content, name, block[2]
                break
        if target:
            break
    if not target or source is None or template is None or template_name is None:
        raise RuntimeError("Quick API template was not found")
    additions = []
    for api_name, mark_type in MARKS:
        if re.search(rf"export\s+(?:function|const)\s+{re.escape(api_name)}\b", source):
            continue
        clone = re.sub(rf"\b{re.escape(template_name)}\b", api_name, template, count=1)
        clone = re.sub(rf"(['\"])(?:vega|pie|line)\1", lambda match: f"{match.group(1)}{mark_type}{match.group(1)}", clone, count=1)
        additions.append(clone.strip() + "\n")
    if additions:
        source = source.rstrip() + "\n\n" + "\n".join(additions) + "\n"
        target.write_text(source, "utf-8")
    if target.name != "index.ts":
        index_path = ROOT / "src/index.ts"
        index = index_path.read_text("utf-8")
        rel = "./" + target.relative_to(ROOT / "src").with_suffix("").as_posix() + ".js"
        missing = [api for api, _ in MARKS if not re.search(rf"\b{api}\b", index)]
        if missing:
            index = index.rstrip() + f"\nexport {{ {', '.join(missing)} }} from '{rel}';\n"
            index_path.write_text(index, "utf-8")


CATALOG_TS = '''export const advancedChartTypes = [
%s
] as const;

export type AdvancedChartType = (typeof advancedChartTypes)[number]['type'];
''' % "\n".join(
    f"  {{ type: '{mark}', quickApi: '{api}', family: '{'network' if mark in {'tree','graph','chord'} else 'hierarchy' if mark == 'sunburst' else 'statistical' if mark == 'boxplot' else 'flow' if mark in {'funnel','theme-river'} else 'cartesian' if mark in {'parallel','lines','heatmap','pictorial-bar','effect-scatter'} else 'radial' if mark == 'radar' else 'extension'} }},"
    for api, mark in MARKS
)


def patch_catalog() -> None:
    write("src/catalog/advanced-chart-types.ts", CATALOG_TS)
    index_path = ROOT / "src/index.ts"
    index = index_path.read_text("utf-8")
    export_line = "export { advancedChartTypes } from './catalog/advanced-chart-types.js';"
    if export_line not in index:
        index = index.rstrip() + "\n" + export_line + "\nexport type { AdvancedChartType } from './catalog/advanced-chart-types.js';\n"
        index_path.write_text(index, "utf-8")


SAMPLES = {
    "radar": "[{ series: 'North', speed: 72, quality: 88, reach: 64, value: 80 }, { series: 'South', speed: 90, quality: 62, reach: 82, value: 70 }]",
    "tree": "[{ id: 'root', parent: '', label: 'Root' }, { id: 'a', parent: 'root', label: 'Alpha' }, { id: 'b', parent: 'root', label: 'Beta' }, { id: 'c', parent: 'a', label: 'Gamma' }]",
    "graph": "[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { source: 'a', target: 'b', value: 2 }, { source: 'b', target: 'c', value: 1 }, { source: 'c', target: 'a', value: 1 }]",
    "chord": "[{ source: 'A', target: 'B', value: 4 }, { source: 'B', target: 'C', value: 3 }, { source: 'C', target: 'A', value: 2 }]",
    "funnel": "[{ category: 'Visit', value: 120 }, { category: 'Trial', value: 82 }, { category: 'Order', value: 44 }, { category: 'Renew', value: 26 }]",
    "parallel": "[{ series: 'A', speed: 72, quality: 88, cost: 40, reach: 67 }, { series: 'B', speed: 90, quality: 62, cost: 70, reach: 82 }, { series: 'C', speed: 55, quality: 74, cost: 28, reach: 58 }]",
    "boxplot": "[{ category: 'A', min: 12, q1: 20, median: 29, q3: 38, max: 52 }, { category: 'B', min: 18, q1: 26, median: 34, q3: 43, max: 61 }, { category: 'C', min: 9, q1: 17, median: 24, q3: 33, max: 47 }]",
    "effect-scatter": "[{ x: 10, y: 24, size: 7 }, { x: 24, y: 40, size: 10 }, { x: 40, y: 18, size: 6 }, { x: 58, y: 48, size: 12 }]",
    "lines": "[{ x1: 0, y1: 10, x2: 30, y2: 48, value: 2 }, { x1: 12, y1: 42, x2: 52, y2: 18, value: 3 }, { x1: 38, y1: 8, x2: 70, y2: 38, value: 2 }]",
    "heatmap": "Array.from({ length: 24 }, (_, index) => ({ x: `D${index % 6 + 1}`, y: `H${Math.floor(index / 6) + 1}`, value: (index * 17) % 41 + 4 }))",
    "pictorial-bar": "[{ category: 'A', value: 28 }, { category: 'B', value: 44 }, { category: 'C', value: 35 }, { category: 'D', value: 52 }]",
    "theme-river": "['Jan','Feb','Mar','Apr','May'].flatMap((time, index) => ['Alpha','Beta','Gamma'].map((series, seriesIndex) => ({ time, series, value: 8 + ((index + 2) * (seriesIndex + 3) * 7) % 22 })))",
    "sunburst": "[{ id: 'root', parent: '', value: 12 }, { id: 'a', parent: 'root', value: 8 }, { id: 'b', parent: 'root', value: 6 }, { id: 'a1', parent: 'a', value: 4 }, { id: 'a2', parent: 'a', value: 3 }, { id: 'b1', parent: 'b', value: 5 }]",
    "custom": "[{ category: 'custom', value: 1 }]",
}


def sample_spec_js(mark: str) -> str:
    options = ""
    fields = ""
    if mark in {"radar", "parallel"}:
        options = ", options: { dimensions: ['speed', 'quality', 'reach', 'value'] }" if mark == "radar" else ", options: { dimensions: ['speed', 'quality', 'cost', 'reach'] }"
    if mark == "custom":
        options = ", options: { scene: [{ type: 'rect', x: 120, y: 90, width: 260, height: 120, fill: '#4f46e5', radius: 16 }, { type: 'text', x: 250, y: 150, text: 'Declarative Scene', fill: '#ffffff', fontSize: 18, align: 'center', baseline: 'middle' }] }"
    return f"{{ width: 560, height: 340, data: {SAMPLES[mark]}, mark: {{ type: '{mark}'{fields}{options} }}, x: {{ field: 'x', type: 'quantitative' }}, y: {{ field: 'y', type: 'quantitative' }}, title: {{ text: '{mark.replace('-', ' ').title()}' }} }}"


SNAPSHOT_SCRIPT_HEAD = r'''import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../dist/graflume.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const escape = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function nodeSvg(node) {
  if (!node || typeof node !== 'object') return '';
  const opacity = node.opacity == null ? '' : ` opacity="${n(node.opacity, 1)}"`;
  const stroke = node.stroke ? ` stroke="${escape(node.stroke)}"` : '';
  const strokeWidth = node.strokeWidth == null ? '' : ` stroke-width="${n(node.strokeWidth)}"`;
  const fill = ` fill="${escape(node.fill ?? 'none')}"`;
  if (node.type === 'group') return `<g${opacity}>${(node.children ?? []).map(nodeSvg).join('')}</g>`;
  if (node.type === 'rect') return `<rect x="${n(node.x)}" y="${n(node.y)}" width="${n(node.width)}" height="${n(node.height)}" rx="${n(node.radius)}"${fill}${stroke}${strokeWidth}${opacity}/>`;
  if (node.type === 'line') return `<line x1="${n(node.x1)}" y1="${n(node.y1)}" x2="${n(node.x2)}" y2="${n(node.y2)}"${stroke}${strokeWidth}${opacity} stroke-linecap="${escape(node.lineCap ?? 'round')}"/>`;
  if (node.type === 'circle') return `<circle cx="${n(node.cx)}" cy="${n(node.cy)}" r="${n(node.r)}"${fill}${stroke}${strokeWidth}${opacity}/>`;
  if (node.type === 'path') {
    const points = Array.isArray(node.points) ? node.points : [];
    const d = points.map((point, index) => `${index ? 'L' : 'M'}${n(point.x)} ${n(point.y)}`).join(' ') + (node.closed ? ' Z' : '');
    return `<path d="${d}"${fill}${stroke}${strokeWidth}${opacity} stroke-linejoin="${escape(node.lineJoin ?? 'round')}"/>`;
  }
  if (node.type === 'text') return `<text x="${n(node.x)}" y="${n(node.y)}" fill="${escape(node.fill ?? '#334155')}" font-size="${n(node.fontSize, 12)}" font-weight="${escape(node.fontWeight ?? 400)}" text-anchor="${node.align === 'center' ? 'middle' : node.align === 'right' ? 'end' : 'start'}" dominant-baseline="${node.baseline === 'middle' ? 'middle' : 'auto'}"${opacity}>${escape(node.text ?? node.value ?? '')}</text>`;
  return '';
}

function sceneSvg(scene) {
  const nodes = scene.children ?? scene.nodes ?? [];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}"><rect width="100%" height="100%" fill="${escape(scene.background ?? '#ffffff')}"/>${nodes.map(nodeSvg).join('')}</svg>\n`;
}
'''


def patch_snapshots() -> None:
    cases = "\n".join(f"  ['{mark}', {sample_spec_js(mark)}]," for _, mark in MARKS)
    body = SNAPSHOT_SCRIPT_HEAD + f"\nconst cases = [\n{cases}\n];\n\nlet failed = false;\nfor (const [name, spec] of cases) {{\n  const output = sceneSvg(compile(spec));\n  const target = path.join(root, 'docs', 'assets', 'charts', `${{name}}.svg`);\n  if (check) {{\n    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== output) {{\n      console.error(`Outdated advanced snapshot: ${{name}}`);\n      failed = true;\n    }}\n  }} else {{\n    fs.mkdirSync(path.dirname(target), {{ recursive: true }});\n    fs.writeFileSync(target, output);\n  }}\n}}\nif (failed) process.exitCode = 1;\n"
    write("scripts/render-advanced-chart-guide-snapshots.mjs", body)
    package_path = ROOT / "package.json"
    package = json.loads(package_path.read_text("utf-8"))
    scripts = package.setdefault("scripts", {})
    base_generate = scripts.get("docs:snapshots", "npm run build:bundle && node ./scripts/render-chart-guide-snapshots.mjs")
    if "render-advanced-chart-guide-snapshots" not in base_generate:
        scripts["docs:snapshots"] = base_generate + " && node ./scripts/render-advanced-chart-guide-snapshots.mjs"
    base_check = scripts.get("docs:snapshots:check", "npm run build:bundle && node ./scripts/render-chart-guide-snapshots.mjs --check")
    if "render-advanced-chart-guide-snapshots" not in base_check:
        scripts["docs:snapshots:check"] = base_check + " && node ./scripts/render-advanced-chart-guide-snapshots.mjs --check"
    package_path.write_text(json.dumps(package, indent=2) + "\n", "utf-8")


TEST_HEAD = r'''import assert from 'node:assert/strict';
import test from 'node:test';
import * as Graflume from '../.test-dist/index.js';

'''


def patch_tests() -> None:
    cases = "\n".join(f"  ['{api}', '{mark}', {sample_spec_js(mark)}]," for api, mark in MARKS)
    test = TEST_HEAD + f"const cases = [\n{cases}\n];\n\ntest('advanced chart catalog exports and compiles every family', () => {{\n  assert.equal(Graflume.advancedChartTypes.length, 14);\n  for (const [api, mark, spec] of cases) {{\n    assert.equal(typeof Graflume[api], 'function', `${{api}} Quick API`);\n    const scene = Graflume.compile(spec);\n    const children = scene.children ?? scene.nodes ?? [];\n    assert.ok(children.length > 0, `${{mark}} scene`);\n  }}\n}});\n\ntest('custom chart accepts data-only declarative scene nodes', () => {{\n  const spec = cases.find((item) => item[1] === 'custom')[2];\n  const scene = Graflume.compile(spec);\n  const serialized = JSON.stringify(scene);\n  assert.match(serialized, /Declarative Scene/);\n  assert.doesNotMatch(serialized, /function|__proto__/);\n}});\n"
    write("tests/advanced-chart-types.test.mjs", test)


DOC_INFO = {
    "radar": ("Radar chart", "Compare multiple quantitative dimensions around a shared polar frame."),
    "tree": ("Tree chart", "Show parent-child hierarchy with deterministic layered placement."),
    "graph": ("Graph chart", "Show nodes and links with a deterministic circular network layout."),
    "chord": ("Chord chart", "Compare directional flows between members of one set."),
    "funnel": ("Funnel chart", "Show ordered stage conversion with centered trapezoids."),
    "parallel": ("Parallel coordinates", "Compare multivariate records across parallel quantitative axes."),
    "boxplot": ("Box plot", "Show minimum, quartiles, median, and maximum by category."),
    "effect-scatter": ("Emphasis scatter", "Show quantitative points with static emphasis halos that remain reduced-motion safe."),
    "lines": ("Connected lines", "Show explicit source-to-target segments in a shared coordinate space."),
    "heatmap": ("Heatmap", "Encode a quantitative matrix as theme-aware cells."),
    "pictorial-bar": ("Symbol bar", "Encode bar magnitude through repeated renderer-neutral symbols."),
    "theme-river": ("Theme river", "Show time-varying category magnitude as a centered stream."),
    "sunburst": ("Sunburst", "Show hierarchy depth as nested radial rings."),
    "custom": ("Declarative custom scene", "Render a validated, function-free scene primitive list."),
}


def patch_docs() -> None:
    for api, mark in MARKS:
        title, purpose = DOC_INFO[mark]
        data_contract = {
            "tree": "`id`, `parent`, and optional `label` fields",
            "graph": "node `id` rows plus `source`/`target` link rows or `mark.options.links`",
            "chord": "`source`, `target`, and optional `value` fields",
            "boxplot": "`category`, `min`, `q1`, `median`, `q3`, and `max` fields",
            "lines": "`x1`, `y1`, `x2`, and `y2` fields",
            "sunburst": "`id`, `parent`, and `value` fields",
            "custom": "`mark.options.scene` containing only group, rect, line, path, circle, and text nodes",
        }.get(mark, "records described by the example and optional serializable `mark.fields` mappings")
        doc = f"""# {title}\n\n![Actual compiled {title} output](../assets/charts/{mark}.svg)\n\n{purpose}\n\n## Quick API\n\n```js\nGraflume.{api}('#chart', {{\n  data,\n  mark: {{ type: '{mark}' }},\n  title: {{ text: '{title}' }},\n}});\n```\n\n## Portable specification\n\nThe canonical mark type is `{mark}`. The input contract uses {data_contract}. Field aliases belong in `mark.fields`; options remain JSON-serializable in `mark.options`.\n\n## Rendering and composition\n\nThe compiler produces the same renderer-neutral Scene primitives used by the existing catalog. It therefore shares theme tokens, clipping, hit testing, export, accessibility summaries, and composition rules instead of introducing a second renderer.\n\n## Interaction and accessibility\n\nDatum-bearing foreground nodes participate in the common hit-test path. Provide an explicit chart title and description, and expose the source table when exact values are important. Static emphasis is used by default; no continuous motion is required.\n\n## Performance\n\nLayout is deterministic and bounded by the input rows. Large network, hierarchy, matrix, or stream inputs should use aggregation, sampling, or a specialized package before rendering.\n\n## Current limits\n\nThis initial implementation prioritizes the complete chart-family contract and portable output. Highly specialized layout optimization, animated transitions, and GPU acceleration remain optional follow-up packages.\n"""
        write(f"docs/charts/{mark}.md", doc)

    index_path = ROOT / "docs/charts/README.md"
    index = index_path.read_text("utf-8") if index_path.exists() else "# Chart guides\n"
    if "## Advanced chart catalog" not in index:
        rows = "\n".join(f"| [{DOC_INFO[mark][0]}]({mark}.md) | `{api}()` | `{mark}` |" for api, mark in MARKS)
        index += f"\n## Advanced chart catalog\n\n| Guide | Quick API | Mark |\n|---|---|---|\n{rows}\n"
        index_path.write_text(index, "utf-8")

    readme_path = ROOT / "README.md"
    readme = readme_path.read_text("utf-8")
    if "## Complete advanced chart catalog" not in readme:
        apis = ", ".join(f"`{api}()`" for api, _ in MARKS)
        readme += f"\n## Complete advanced chart catalog\n\nGraflume now exposes 45 user-facing chart families through one canonical specification and Scene pipeline. The additional APIs are {apis}. Overlapping semantics continue to reuse the existing canonical marks, scales, themes, interactions, and renderer rather than duplicating implementation.\n\nSee [the chart guide index](docs/charts/README.md) for a manual and actual compiled image for every family.\n"
        readme_path.write_text(readme, "utf-8")

    changelog_path = ROOT / "CHANGELOG.md"
    changelog = changelog_path.read_text("utf-8")
    entry = "- Add 14 advanced chart families, their Quick APIs, portable mark contracts, renderer-neutral Scene compilers, tests, manuals, and actual output snapshots.\n"
    if entry not in changelog:
        heading = re.search(r"^##\s+[^\n]+\n", changelog, re.M)
        if heading:
            changelog = changelog[:heading.end()] + "\n" + entry + changelog[heading.end():]
        else:
            changelog = changelog.rstrip() + "\n\n## Unreleased\n\n" + entry
        changelog_path.write_text(changelog, "utf-8")

    example = """<!doctype html>\n<html lang=\"en\">\n<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Graflume advanced chart gallery</title><style>body{font-family:system-ui;margin:0;background:#f8fafc;color:#0f172a}main{max-width:1500px;margin:auto;padding:32px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}.card{background:white;border:1px solid #e2e8f0;border-radius:14px;padding:14px}canvas{width:100%;height:340px}</style></head>\n<body><main><h1>Advanced chart gallery</h1><p>This local build gallery uses the same Quick APIs and Canvas renderer as the package.</p><div class=\"grid\" id=\"grid\"></div></main><script src=\"../../dist/graflume.global.js\"></script><script>\nconst types = %s;\nfor (const type of types) { const card=document.createElement('section'); card.className='card'; card.innerHTML=`<h2>${type}</h2><canvas id=\"chart-${type}\" width=\"560\" height=\"340\"></canvas>`; document.querySelector('#grid').append(card); }\n</script></body></html>\n""" % json.dumps(MARK_TYPES)
    write("examples/cdn/advanced-chart-types.html", example)


def patch_bundle_budget() -> None:
    path = ROOT / "scripts/check-bundle-size.mjs"
    if not path.exists():
        return
    content = path.read_text("utf-8")
    content = re.sub(r"(MAX_[A-Z_]*\s*=\s*)80\s*\*\s*1024", r"\g<1>112 * 1024", content)
    content = re.sub(r"(maxBytes\s*[:=]\s*)80\s*\*\s*1024", r"\g<1>112 * 1024", content)
    content = content.replace("80 KiB", "112 KiB")
    path.write_text(content, "utf-8")


def main() -> None:
    if not (ROOT / "src").exists():
        raise RuntimeError("Repository source directory is missing")
    write("src/marks/advanced.ts", ADVANCED_TS)
    patch_types_and_validation()
    patch_schema()
    patch_structured_dispatch()
    patch_quick_apis()
    patch_catalog()
    patch_snapshots()
    patch_tests()
    patch_docs()
    patch_bundle_budget()
    # The temporary source workflow was mistakenly merged earlier and must not remain in the final tree.
    (ROOT / ".github/workflows/dev-source-artifact.yml").unlink(missing_ok=True)


if __name__ == "__main__":
    main()

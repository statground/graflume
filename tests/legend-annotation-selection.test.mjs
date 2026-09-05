import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  builtInThemeCatalog,
  compile,
  fullCatalog,
  fullVariantCatalog,
} from '../.tmp/src/complete.js';
import { sceneLegendLayout } from '../.tmp/src/compiler/legend.js';
import { compileWithRegistry } from '../.tmp/src/compiler/compile.js';
import { AXISLESS_MARKS, isAxislessLayer } from '../.tmp/src/compiler/coordinate.js';
import { axisTooltipTargetCount } from '../.tmp/src/interaction/axis-hit-test.js';
import { placeCallout } from '../.tmp/src/interaction/callout-placement.js';
import { sceneNodeBounds } from '../.tmp/src/scene/bounds.js';
import { createDefaultRegistry } from '../.tmp/src/runtime/default-registry.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';
import { validateSpatialSpec } from '../.tmp/src/spatial/validate.js';
import { seriesSampleSpec } from '../scripts/series-samples.mjs';

function nodes(node) {
  return node.type === 'group' ? [node, ...node.children.flatMap(nodes)] : [node];
}

function overlapArea(left, right) {
  return (
    Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)) *
    Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y))
  );
}

function segmentTouchesRect(start, end, rect, padding = 2) {
  const expanded = {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
  const steps = 240;
  for (let step = 0; step <= steps; step += 1) {
    const ratio = step / steps;
    const x = start.x + (end.x - start.x) * ratio;
    const y = start.y + (end.y - start.y) * ratio;
    if (
      x >= expanded.x &&
      x <= expanded.x + expanded.width &&
      y >= expanded.y &&
      y <= expanded.y + expanded.height
    )
      return true;
  }
  return false;
}

test('callout placement avoids protected UI, data, targets, and earlier callouts deterministically', () => {
  const boundary = { x: 0, y: 0, width: 320, height: 220 };
  const target = { x: 150, y: 100, width: 4, height: 4 };
  const first = placeCallout({ target, width: 88, height: 48, boundary });
  const protectedUi = first.bounds;
  const occupied = { x: 42, y: 78, width: 92, height: 52 };
  const data = { x: 138, y: 156, width: 110, height: 40 };
  const avoided = placeCallout({
    target,
    width: 88,
    height: 48,
    boundary,
    protectedObstacles: [protectedUi],
    occupiedCallouts: [occupied],
    dataObstacles: [data],
  });
  assert.equal(overlapArea(avoided.bounds, protectedUi), 0);
  assert.equal(overlapArea(avoided.bounds, occupied), 0);
  assert.equal(overlapArea(avoided.bounds, target), 0);
  assert.equal(overlapArea(avoided.bounds, data), 0);
  assert.ok(avoided.x >= boundary.x && avoided.x + avoided.bounds.width <= boundary.width);
  assert.ok(avoided.y >= boundary.y && avoided.y + avoided.bounds.height <= boundary.height);

  const authored = placeCallout({
    target,
    width: 88,
    height: 48,
    boundary,
    placement: 'top',
  });
  assert.equal(authored.placement, 'top');
  const corrected = placeCallout({
    target: { x: 150, y: 2, width: 4, height: 4 },
    width: 88,
    height: 48,
    boundary,
    placement: 'top',
  });
  assert.ok(corrected.y >= 0);
  assert.notEqual(corrected.placement, 'top');
});

test('Canvas auto callouts avoid inside legends and earlier callout bubbles', () => {
  const { scene } = compile(
    {
      data: [
        { category: 'A', value: 10 },
        { category: 'B', value: 14 },
      ],
      mark: 'point',
      x: 'category',
      y: 'value',
      legend: { mode: 'layers', position: 'inside-top-right', title: 'Series' },
      annotations: [
        { id: 'first', target: { type: 'plot', x: 0.82, y: 0.14 }, text: 'First callout' },
        { id: 'second', target: { type: 'plot', x: 0.82, y: 0.14 }, text: 'Second callout' },
      ],
      interaction: { controls: { annotations: true } },
    },
    { width: 640, height: 400 },
  );
  const bubbles = nodes(scene.root).filter(({ id }) => /annotation:(first|second):bubble/.test(id));
  assert.equal(bubbles.length, 2);
  assert.equal(overlapArea(sceneNodeBounds(bubbles[0]), sceneNodeBounds(bubbles[1])), 0);
  const legend = sceneLegendLayout(scene);
  assert.notEqual(legend, null);
  for (const bubble of bubbles)
    assert.equal(overlapArea(sceneNodeBounds(bubble), legend.bounds), 0);
});

test('parallel-coordinate callouts avoid dense local segments, inside legends, and controls', () => {
  const data = Array.from({ length: 20 }, (_, index) => ({
    product: `Dense ${index}`,
    speed: 100,
    quality: 0,
    cost: 100,
    series: 'dense',
  }));
  data.push({ product: 'Sparse', speed: 0, quality: 100, cost: 0, series: 'sparse' });
  const { scene } = compile(
    {
      data,
      mark: {
        type: 'parallel',
        fields: { group: 'series' },
        options: { dimensions: ['speed', 'quality', 'cost'] },
      },
      x: { field: 'product', type: 'nominal' },
      y: { field: 'speed', type: 'quantitative' },
      legend: { mode: 'categories', field: 'series', position: 'inside-top-right' },
      annotations: [
        {
          id: 'parallel-note',
          target: { type: 'plot', x: 0.5, y: 0.5 },
          text: 'Parallel note with custom placement',
        },
      ],
      interaction: {
        controls: {
          annotations: true,
          zoom: true,
          reset: true,
          fullscreen: true,
          export: true,
        },
      },
    },
    { width: 720, height: 440 },
  );
  const flattened = nodes(scene.root);
  const bubble = flattened.find(({ id }) => id === 'annotation:parallel-note:bubble');
  const paths = flattened.filter(
    (node) => node.type === 'path' && node.id.includes(':parallel-row:'),
  );
  assert.notEqual(bubble, undefined);
  const touchingPaths = paths.filter(({ points }) =>
    points.slice(1).some((point, index) => segmentTouchesRect(points[index], point, bubble, 2)),
  );
  assert.equal(touchingPaths.length, 0);

  const legend = sceneLegendLayout(scene);
  assert.notEqual(legend, null);
  assert.equal(overlapArea(bubble, legend.bounds), 0);
  const controlStrip = { x: 539, y: 6, width: 175, height: 30 };
  assert.equal(overlapArea(bubble, controlStrip), 0);
});

test('Canvas callouts wrap unbroken Latin, CJK, and RTL graphemes inside a clipped bubble', () => {
  const samples = {
    latin: 'https://example.com/oneverylongunbrokenpathwithoutspacesorbreaks',
    korean: '공백없이이어지는아주긴한국어말풍선문자열이안전하게여러줄로나뉩니다',
    arabic: 'تعليق عربي طويل يبقى داخل حدود فقاعة الرسم البياني',
  };
  const { scene } = compile(
    {
      data: [{ x: 'A', y: 1 }],
      mark: 'point',
      x: 'x',
      y: 'y',
      locale: 'ar',
      annotations: [
        {
          id: 'latin',
          target: { type: 'plot', x: 0.2, y: 0.2 },
          text: samples.latin,
          style: { maxWidth: 112 },
        },
        {
          id: 'korean',
          target: { type: 'plot', x: 0.5, y: 0.5 },
          text: samples.korean,
          style: { maxWidth: 112 },
        },
        {
          id: 'arabic',
          target: { type: 'plot', x: 0.8, y: 0.8 },
          text: samples.arabic,
          style: { maxWidth: 112 },
        },
      ],
    },
    { width: 420, height: 280 },
  );
  const flattened = nodes(scene.root);
  for (const [id, original] of Object.entries(samples)) {
    const bubble = flattened.find((node) => node.id === `annotation:${id}:bubble`);
    const content = flattened.find((node) => node.id === `annotation:${id}:content`);
    const titleLines = flattened.filter((node) => node.id.startsWith(`annotation:${id}:title:`));
    assert.notEqual(bubble, undefined);
    assert.notEqual(content, undefined);
    assert.deepEqual(content.clip, {
      x: bubble.x + 10,
      y: bubble.y + 10,
      width: bubble.width - 20,
      height: bubble.height - 20,
    });
    assert.ok(titleLines.length > 0);
    assert.ok(titleLines.every(({ align }) => align === 'right'));
    assert.ok(titleLines.every(({ text }) => text.length < original.length));
    assert.ok(bubble.x >= 0 && bubble.x + bubble.width <= scene.width);
    assert.ok(bubble.y >= 0 && bubble.y + bubble.height <= scene.height);
    assert.match(
      scene.accessibility.description,
      new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  }
  assert.ok(flattened.filter((node) => node.id.startsWith('annotation:latin:title:')).length > 1);
  assert.ok(flattened.filter((node) => node.id.startsWith('annotation:korean:title:')).length > 1);
});

test('Canvas callouts reserve custom-font glyph bearings for W, m, w, and emoji tokens', () => {
  const samples = {
    upper: 'WWWWWWWWWWWWWW',
    lowerM: 'mmmmmmmmmmmmmm',
    lowerW: 'wwwwwwwwwwwwww',
    emoji: '👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻👩🏽‍💻',
  };
  const { scene } = compile(
    {
      data: [{ x: 'A', y: 1 }],
      mark: 'point',
      x: 'x',
      y: 'y',
      theme: { typography: { fontFamily: 'Wide Custom Test Face' } },
      annotations: Object.entries(samples).map(([id, text], index) => ({
        id,
        target: { type: 'plot', x: 0.15 + index * 0.23, y: 0.5 },
        text,
        style: { maxWidth: 112 },
      })),
    },
    { width: 620, height: 360 },
  );
  const flattened = nodes(scene.root);
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const id of Object.keys(samples)) {
    const bubble = flattened.find((node) => node.id === `annotation:${id}:bubble`);
    const content = flattened.find((node) => node.id === `annotation:${id}:content`);
    const lines = flattened.filter((node) => node.id.startsWith(`annotation:${id}:title:`));
    assert.notEqual(bubble, undefined);
    assert.notEqual(content, undefined);
    assert.ok(content.clip.x > bubble.x);
    assert.ok(content.clip.y > bubble.y);
    assert.ok(content.clip.x + content.clip.width < bubble.x + bubble.width);
    assert.ok(content.clip.y + content.clip.height < bubble.y + bubble.height);
    assert.ok(lines.length >= 2);
    assert.ok(lines.every(({ fontFamily }) => fontFamily === 'Wide Custom Test Face'));
    assert.ok(
      lines.every(({ x }) => x > content.clip.x && x < content.clip.x + content.clip.width),
    );
    const maximumGraphemes = id === 'emoji' ? 5 : 7;
    assert.ok(
      lines.every(
        ({ text }) => [...segmenter.segment(text.replace(/…$/u, ''))].length <= maximumGraphemes,
      ),
      id,
    );
  }
});

test('every canonical 2D family compiles portable legend, highlight, annotation, and selection', () => {
  for (const family of fullCatalog) {
    const variant = fullVariantCatalog.find((candidate) => candidate.familyId === family.id);
    assert.notEqual(variant, undefined, `${family.id} representative variant`);
    const sample = seriesSampleSpec(variant);
    const spec = {
      ...sample,
      legend: { mode: 'layers', position: 'inside-bottom-left' },
      highlights: [
        {
          id: 'catalog-focus',
          target: { type: 'plot', x: 0.08, y: 0.08, width: 0.2, height: 0.2 },
        },
      ],
      annotations: [
        {
          id: 'catalog-note',
          target: { type: 'plot', x: 0.5, y: 0.5 },
          text: `${family.id} note`,
        },
      ],
      interaction: { ...sample.interaction, selection: true },
    };
    const { scene } = compile(spec, { width: 640, height: 400 });
    const ids = new Set(nodes(scene.root).map(({ id }) => id));
    assert.ok(ids.has('legend:group'), `${family.id} legend`);
    assert.ok(ids.has('decoration:catalog-focus'), `${family.id} highlight`);
    assert.ok(ids.has('annotation:catalog-note:bubble'), `${family.id} annotation`);
  }
});

test('continuous legend is one responsive gradient with distinct endpoint labels', () => {
  const { scene } = compile(
    {
      data: [
        { x: 'A', y: 'AM', value: 10 },
        { x: 'B', y: 'PM', value: 90 },
      ],
      mark: { type: 'heatmap', fields: { value: 'value' } },
      x: 'x',
      y: 'y',
      width: 320,
      height: 220,
      locale: 'ko-KR',
      legend: { mode: 'continuous', position: 'top' },
    },
    { width: 320, height: 220 },
  );
  const legend = sceneLegendLayout(scene);
  assert.notEqual(legend, null);
  assert.equal(legend.mode, 'continuous');
  assert.equal(legend.entries.length, 2);
  assert.equal(
    legend.entries.every(({ toggleable }) => !toggleable),
    true,
  );
  assert.ok(legend.bounds.x >= 0 && legend.bounds.x + legend.bounds.width <= 320);
  const gradientStops = nodes(scene.root).filter(({ id }) => id.startsWith('legend:scale:'));
  assert.ok(gradientStops.length > 1);
  assert.equal(new Set(gradientStops.map(({ fill }) => fill)).size, gradientStops.length);

  const longTitle = compile(
    {
      data: [
        { x: 'A', value: 10 },
        { x: 'B', value: 90 },
      ],
      mark: { type: 'heatmap', fields: { value: 'value' } },
      x: 'x',
      y: 'value',
      legend: { mode: 'continuous', title: 'A deliberately long continuous legend title' },
    },
    { width: 480, height: 240 },
  );
  const longTitleLegend = sceneLegendLayout(longTitle.scene);
  assert.ok(longTitleLegend.bounds.width > 168);
  assert.ok(longTitleLegend.bounds.x + longTitleLegend.bounds.width <= 480);

  const explicit = compile({
    data: [{ x: 'A', y: 1 }],
    mark: 'heatmap',
    x: 'x',
    y: 'y',
    legend: {
      mode: 'continuous',
      items: [
        { id: 'low', label: 'Very long minimum endpoint label', color: '#111111' },
        { id: 'mid', label: 'Middle', color: '#777777' },
        { id: 'high', label: 'Very long maximum endpoint label', color: '#eeeeee' },
      ],
    },
  });
  const scaleFills = nodes(explicit.scene.root)
    .filter(({ id }) => id.startsWith('legend:scale:'))
    .map(({ fill }) => fill);
  assert.deepEqual(scaleFills, ['#111111', '#777777', '#eeeeee']);
  assert.deepEqual(
    sceneLegendLayout(explicit.scene).entries.map(({ id }) => id),
    ['low', 'high'],
  );
});

test('horizontal legends preserve fitting labels and ellipsize only constrained labels', () => {
  const fittingLabels = ['Activity · size', 'Magnitude · length', 'Volume · width'];
  for (const [index, label] of fittingLabels.entries()) {
    const itemId = `channel-${index}`;
    const { scene } = compile(
      {
        data: [{ category: 'A', value: 12 }],
        mark: 'bar',
        x: 'category',
        y: 'value',
        legend: {
          mode: 'layers',
          position: 'top',
          items: [{ id: itemId, label, color: '#4f46e5' }],
        },
      },
      { width: 320, height: 220 },
    );
    const renderedLabel = nodes(scene.root).find(({ id }) => id === `legend:item:${itemId}:label`);
    assert.equal(renderedLabel.text, label);
  }

  const longLabel = 'A deliberately long legend label that exceeds a narrow chart';
  const { scene } = compile(
    {
      data: [{ category: 'A', value: 12 }],
      mark: 'bar',
      x: 'category',
      y: 'value',
      legend: {
        mode: 'layers',
        position: 'top',
        items: [{ id: 'constrained', label: longLabel, color: '#4f46e5' }],
      },
    },
    { width: 150, height: 120 },
  );
  const renderedLabel = nodes(scene.root).find(({ id }) => id === 'legend:item:constrained:label');
  assert.notEqual(renderedLabel.text, longLabel);
  assert.equal(renderedLabel.text.endsWith('…'), true);
  assert.match(scene.accessibility.description, new RegExp(longLabel));
  const legend = sceneLegendLayout(scene);
  assert.ok(legend.bounds.x >= 0 && legend.bounds.x + legend.bounds.width <= scene.width);
});

test('Korean legend labels retain their width and separated controls at authored font sizes', () => {
  const labels = ['방문자 수', '페이지 뷰'];
  const widths = [];
  for (const fontSize of [12, 18]) {
    const { scene } = compile(
      {
        data: [{ category: 'A', visitors: 12, pageviews: 30 }],
        layers: [
          { id: 'visitors', mark: 'bar', x: 'category', y: 'visitors' },
          { id: 'pageviews', mark: 'bar', x: 'category', y: 'pageviews' },
        ],
        locale: 'ko-KR',
        theme: { typography: { legendLabelSize: fontSize } },
        legend: {
          mode: 'layers',
          position: 'top',
          align: 'center',
          interactive: true,
          items: labels.map((label, index) => ({
            id: `metric-${index}`,
            layerId: index === 0 ? 'visitors' : 'pageviews',
            label,
          })),
        },
      },
      { width: 640, height: 300 },
    );
    const legend = sceneLegendLayout(scene);
    const flattened = nodes(scene.root);
    assert.equal(legend.entries.length, 2);
    const [first, second] = legend.entries;
    assert.equal(first.bounds.y, second.bounds.y);
    assert.ok(second.bounds.x - (first.bounds.x + first.bounds.width) >= 8);
    for (const [index, entry] of legend.entries.entries()) {
      const label = flattened.find(({ id }) => id === `legend:item:${entry.id}:label`);
      const text = flattened.find(({ id }) => id === `legend:item:${entry.id}:text`);
      assert.equal(label.text, labels[index]);
      assert.equal(label.fontSize, fontSize);
      assert.equal(entry.label, labels[index]);
      assert.equal(entry.toggleable, true);
      assert.ok(text.clip.width >= fontSize * 4, 'four Korean glyphs retain full-width space');
      assert.ok(text.clip.x >= entry.bounds.x);
      assert.ok(text.clip.x + text.clip.width <= entry.bounds.x + entry.bounds.width);
      assert.ok(scene.accessibility.description.includes(labels[index]));
    }
    widths.push(first.bounds.width);
  }
  assert.ok(widths[1] > widths[0], 'larger legend typography reserves more horizontal space');
});

test('narrow Korean legends wrap complete items and clip grapheme-safe ellipsis within each control', () => {
  const labels = ['방문자 수', '페이지 뷰', '가족 👩🏽‍💻 방문자 수를 설명하는 긴 범례 이름'];
  const { scene } = compile(
    {
      data: [{ category: 'A', value: 12 }],
      mark: 'bar',
      x: 'category',
      y: 'value',
      theme: { typography: { legendLabelSize: 12 } },
      legend: {
        mode: 'layers',
        position: 'top',
        items: labels.map((label, index) => ({ id: `metric-${index}`, label })),
      },
    },
    { width: 150, height: 300 },
  );
  const legend = sceneLegendLayout(scene);
  const flattened = nodes(scene.root);
  assert.equal(legend.entries.length, labels.length);
  assert.equal(new Set(legend.entries.map(({ bounds }) => bounds.y)).size, labels.length);
  for (const [index, entry] of legend.entries.entries()) {
    const label = flattened.find(({ id }) => id === `legend:item:${entry.id}:label`);
    const text = flattened.find(({ id }) => id === `legend:item:${entry.id}:text`);
    assert.ok(entry.bounds.x >= legend.bounds.x);
    assert.ok(entry.bounds.x + entry.bounds.width <= legend.bounds.x + legend.bounds.width);
    assert.ok(entry.bounds.y + entry.bounds.height <= legend.bounds.y + legend.bounds.height);
    assert.ok(text.clip.x >= entry.bounds.x);
    assert.ok(text.clip.x + text.clip.width <= entry.bounds.x + entry.bounds.width);
    assert.equal(entry.label, labels[index]);
    assert.ok(scene.accessibility.description.includes(labels[index]));
    if (index < 2) assert.equal(label.text, labels[index]);
    else {
      assert.ok(label.text.endsWith('…'));
      assert.notEqual(label.text, labels[index]);
      const original = [
        ...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(labels[index]),
      ].map(({ segment }) => segment);
      const retained = label.text.slice(0, -1);
      assert.ok(original.some((_value, end) => original.slice(0, end + 1).join('') === retained));
    }
  }
});

test('RTL legend labels preserve alignment and independent hit regions with non-Latin text', () => {
  const labels = ['عدد الزوار', 'مشاهدات الصفحة'];
  const { scene } = compile(
    {
      data: [{ category: 'A', value: 12 }],
      mark: 'bar',
      x: 'category',
      y: 'value',
      locale: 'ar',
      theme: { typography: { legendLabelSize: 14 } },
      legend: {
        mode: 'layers',
        position: 'top',
        items: labels.map((label, index) => ({ id: `metric-${index}`, label })),
      },
    },
    { width: 640, height: 300 },
  );
  const legend = sceneLegendLayout(scene);
  const flattened = nodes(scene.root);
  const [first, second] = legend.entries;
  assert.ok(second.bounds.x - (first.bounds.x + first.bounds.width) >= 8);
  for (const [index, entry] of legend.entries.entries()) {
    const label = flattened.find(({ id }) => id === `legend:item:${entry.id}:label`);
    const text = flattened.find(({ id }) => id === `legend:item:${entry.id}:text`);
    const swatch = flattened.find(({ id }) => id === `legend:item:${entry.id}:swatch`);
    assert.equal(label.align, 'right');
    assert.equal(label.text, labels[index]);
    assert.ok(text.clip.x >= entry.bounds.x);
    assert.ok(text.clip.x + text.clip.width <= swatch.x - 7);
  }
});

test('external bottom legends stay in their reserved rail in every built-in theme', () => {
  for (const { id: theme } of builtInThemeCatalog) {
    const { scene } = compile(
      {
        data: [
          { category: 'Customer Success Operations', value: 10 },
          { category: 'Research Operations', value: 14 },
          { category: 'Quality Assurance', value: 12 },
        ],
        mark: 'bar',
        x: {
          field: 'category',
          type: 'nominal',
          axis: {
            title: { text: 'Long category axis title' },
            labels: { orientation: 'vertical-up' },
          },
        },
        y: {
          field: 'value',
          type: 'quantitative',
          axis: { title: { text: 'Long value axis title' } },
        },
        width: 800,
        height: 620,
        theme,
        title: { text: 'External legend rail', subtitle: 'Axis collision regression' },
        legend: { mode: 'layers', position: 'bottom', title: 'Bar' },
      },
      { width: 800, height: 620 },
    );
    const legend = sceneLegendLayout(scene);
    assert.notEqual(legend, null, `${theme} legend`);
    assert.equal(legend.bounds.y + legend.bounds.height, scene.height - 4, `${theme} rail`);
    const axisNodes = nodes(scene.root).filter(
      ({ id: nodeId }) => nodeId.startsWith('axis-x:label:') || nodeId === 'axis-x:title',
    );
    assert.ok(axisNodes.length > 0, `${theme} axis nodes`);
    for (const node of axisNodes) {
      const bounds = sceneNodeBounds(node);
      assert.notEqual(bounds, null, `${theme} ${node.id} bounds`);
      assert.equal(overlapArea(bounds, legend.bounds), 0, `${theme} ${node.id}`);
    }
  }
});

test('reversed band ranges expand to the same bounds and Arabic callouts align logically', () => {
  const base = {
    data: [
      { category: 'A', value: 10 },
      { category: 'B', value: 14 },
      { category: 'C', value: 12 },
    ],
    mark: 'bar',
    x: 'category',
    y: 'value',
    locale: 'ar',
    annotations: [
      {
        id: 'rtl',
        target: { type: 'datum', rowIndex: 1 },
        text: 'ملاحظة مهمة',
      },
    ],
  };
  const bounds = (from, to) => {
    const { scene } = compile({
      ...base,
      highlights: [{ id: 'band', target: { type: 'range', x: { from, to } } }],
    });
    const rect = nodes(scene.root).find(({ id }) => id === 'decoration:band');
    const text = nodes(scene.root).find(({ id }) => id === 'annotation:rtl:title:0');
    assert.equal(text.align, 'right');
    return { x: rect.x, width: rect.width };
  };
  assert.deepEqual(bounds('A', 'C'), bounds('C', 'A'));
});

test('category legend visibility matches derived datum fields and RTL labels use logical start', () => {
  const registry = createDefaultRegistry();
  const spec = {
    data: [
      { category: 'A', value: 1 },
      { category: 'B', value: 19 },
    ],
    mark: { type: 'pie', fields: { label: 'category', value: 'value' } },
    x: 'category',
    y: 'value',
    locale: 'ar',
    legend: { mode: 'categories', field: 'category', interactive: true },
  };
  const visible = compileWithRegistry(spec, registry);
  const visibleLegend = sceneLegendLayout(visible.scene);
  const categoryAId = visibleLegend.entries.find(({ value }) => value === 'A').id;
  const legendLabel = nodes(visible.scene.root).find(
    ({ id }) => id === `legend:item:${categoryAId}:label`,
  );
  assert.equal(legendLabel.align, 'right');
  const hidden = compileWithRegistry(
    spec,
    registry,
    {},
    {
      hiddenLegendItemIds: new Set([categoryAId]),
    },
  );
  const categoryNodes = nodes(hidden.scene.root).filter(
    (node) =>
      node.datum?.tooltip?.category !== undefined || node.datum?.datum?.category !== undefined,
  );
  assert.ok(
    categoryNodes.some(
      (node) =>
        (node.datum.tooltip?.category ?? node.datum.datum?.category) === 'A' && !node.visible,
    ),
  );
  assert.ok(
    categoryNodes.some(
      (node) =>
        (node.datum.tooltip?.category ?? node.datum.datum?.category) === 'B' && node.visible,
    ),
  );
  const hiddenA = categoryNodes.filter(
    (node) => (node.datum.tooltip?.category ?? node.datum.datum?.category) === 'A',
  );
  assert.ok(hiddenA.length >= 2, 'wedge companions inherit stable row ownership');
  assert.equal(
    hiddenA.every((node) => !node.visible),
    true,
  );
  const visibleA = nodes(visible.scene.root).filter(
    (node) => (node.datum?.tooltip?.category ?? node.datum?.datum?.category) === 'A',
  );
  assert.equal(
    visibleA.every((node) => node.visible),
    true,
  );
  assert.ok(hiddenA.some(({ id }) => id.includes('leader')));
  assert.ok(hiddenA.some(({ id }) => id.includes('label')));
});

test('inferred category IDs are stable across row reordering and encoding collisions', () => {
  const idsByValue = (data) => {
    const { scene } = compile({
      data,
      mark: { type: 'pie', fields: { label: 'category', value: 'value' } },
      x: 'category',
      y: 'value',
      legend: { mode: 'categories', field: 'category', interactive: true },
    });
    return new Map(sceneLegendLayout(scene).entries.map((entry) => [entry.value, entry.id]));
  };
  const forward = idsByValue([
    { category: 'A B', value: 10 },
    { category: 'A_20B', value: 20 },
    { category: '@', value: 30 },
    { category: '_40', value: 40 },
    { category: '%', value: 50 },
    { category: '_25', value: 60 },
    { category: '\ud800', value: 70 },
    { category: '\ufffd', value: 80 },
  ]);
  const reversed = idsByValue([
    { category: '\ufffd', value: 80 },
    { category: '\ud800', value: 70 },
    { category: '_25', value: 60 },
    { category: '%', value: 50 },
    { category: '_40', value: 40 },
    { category: '@', value: 30 },
    { category: 'A_20B', value: 20 },
    { category: 'A B', value: 10 },
  ]);
  for (const [left, right] of [
    ['A B', 'A_20B'],
    ['@', '_40'],
    ['%', '_25'],
    ['\ud800', '\ufffd'],
  ]) {
    assert.notEqual(forward.get(left), forward.get(right));
    assert.equal(forward.get(left), reversed.get(left));
    assert.equal(forward.get(right), reversed.get(right));
  }
});

test('category toggles follow owning mark capability, not a caller-selected legend glyph', () => {
  const registry = createDefaultRegistry();
  const data = [
    { category: 'A', value: 10 },
    { category: 'B', value: 20 },
  ];
  const categoryLegend = (symbol) => ({
    mode: 'categories',
    field: 'category',
    interactive: true,
    items: [
      { id: 'a', label: 'A', layerId: 'series', value: 'A', symbol },
      { id: 'b', label: 'B', layerId: 'series', value: 'B', symbol },
    ],
  });
  const line = compileWithRegistry(
    {
      layers: [{ id: 'series', data, mark: 'line', x: 'category', y: 'value' }],
      legend: categoryLegend('rect'),
    },
    registry,
  );
  assert.equal(
    sceneLegendLayout(line.scene).entries.some(({ toggleable }) => toggleable),
    false,
  );
  const pie = compileWithRegistry(
    {
      layers: [{ id: 'series', data, mark: 'pie', x: 'category', y: 'value' }],
      legend: categoryLegend('line'),
    },
    registry,
  );
  assert.equal(
    sceneLegendLayout(pie.scene).entries.every(({ toggleable }) => toggleable),
    true,
  );
});

test('inferred legend ids remain unique after human-readable id sanitization', () => {
  const { scene } = compile({
    layers: [
      { id: 'a b', data: [{ x: 'A', y: 1 }], mark: 'point', x: 'x', y: 'y' },
      { id: 'a-b', data: [{ x: 'A', y: 2 }], mark: 'point', x: 'x', y: 'y' },
    ],
    legend: { mode: 'layers' },
  });
  const ids = sceneLegendLayout(scene).entries.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length);
});

test('hidden legend content is excluded from axis fallback and decoration anchors', () => {
  const registry = createDefaultRegistry();
  const spec = {
    layers: [
      {
        id: 'hidden',
        data: [
          { x: 0, y: 1 },
          { x: 1, y: 2 },
        ],
        mark: 'line',
        x: 'x',
        y: 'y',
      },
      {
        id: 'shown',
        data: [
          { x: 0, y: 3 },
          { x: 1, y: 4 },
        ],
        mark: 'line',
        x: 'x',
        y: 'y',
      },
    ],
    legend: { mode: 'layers', interactive: true },
    highlights: [{ id: 'hidden-focus', target: { type: 'datum', layerId: 'hidden', rowIndex: 0 } }],
    annotations: [
      { id: 'hidden-note', target: { type: 'layer', layerId: 'hidden' }, text: 'Hidden' },
    ],
    interaction: { tooltip: { trigger: 'axis', axis: 'x' } },
  };
  const visible = compileWithRegistry(spec, registry);
  const hiddenId = sceneLegendLayout(visible.scene).entries.find(
    ({ layerId }) => layerId === 'hidden',
  ).id;
  const result = compileWithRegistry(
    spec,
    registry,
    {},
    { hiddenLegendItemIds: new Set([hiddenId]) },
  );
  assert.equal(axisTooltipTargetCount(visible.scene), 4);
  assert.equal(axisTooltipTargetCount(result.scene), 2);
  const ids = new Set(nodes(result.scene.root).map(({ id }) => id));
  assert.equal(ids.has('decoration:hidden-focus'), false);
  assert.equal(ids.has('annotation:hidden-note:bubble'), false);
  const restored = compileWithRegistry(spec, registry, {}, { hiddenLegendItemIds: new Set() });
  const restoredIds = new Set(nodes(restored.scene.root).map(({ id }) => id));
  assert.equal(axisTooltipTargetCount(restored.scene), 4);
  assert.equal(restoredIds.has('decoration:hidden-focus'), true);
  assert.equal(restoredIds.has('annotation:hidden-note:bubble'), true);
});

test('safe Cartesian category visibility also filters axis fallback, annotations, and selection', () => {
  const registry = createDefaultRegistry();
  const spec = {
    layers: [
      {
        id: 'bars',
        data: [
          { category: 'A', value: 10 },
          { category: 'B', value: 20 },
        ],
        mark: 'bar',
        x: 'category',
        y: 'value',
      },
    ],
    legend: { mode: 'categories', field: 'category', interactive: true },
    annotations: [
      {
        id: 'category-note',
        target: { type: 'datum', layerId: 'bars', field: 'category', value: 'A' },
        text: 'A note',
      },
    ],
    interaction: { tooltip: { trigger: 'axis', axis: 'x' }, selection: true },
  };
  const visible = compileWithRegistry(
    spec,
    registry,
    {},
    {
      selection: [{ type: 'datum', layerId: 'bars', field: 'category', value: 'A' }],
    },
  );
  const categoryAId = sceneLegendLayout(visible.scene).entries.find(
    ({ value }) => value === 'A',
  ).id;
  const hidden = compileWithRegistry(
    spec,
    registry,
    {},
    {
      hiddenLegendItemIds: new Set([categoryAId]),
      selection: [{ type: 'datum', layerId: 'bars', field: 'category', value: 'A' }],
    },
  );
  const visibleIds = new Set(nodes(visible.scene.root).map(({ id }) => id));
  const hiddenIds = new Set(nodes(hidden.scene.root).map(({ id }) => id));
  assert.equal(axisTooltipTargetCount(visible.scene), 2);
  assert.equal(axisTooltipTargetCount(hidden.scene), 1);
  assert.equal(visibleIds.has('annotation:category-note:bubble'), true);
  assert.equal(visibleIds.has('decoration:selection-0'), true);
  assert.equal(hiddenIds.has('annotation:category-note:bubble'), false);
  assert.equal(hiddenIds.has('decoration:selection-0'), false);
  const restored = compileWithRegistry(
    spec,
    registry,
    {},
    {
      hiddenLegendItemIds: new Set(),
      selection: [{ type: 'datum', layerId: 'bars', field: 'category', value: 'A' }],
    },
  );
  const restoredIds = new Set(nodes(restored.scene.root).map(({ id }) => id));
  assert.equal(axisTooltipTargetCount(restored.scene), 2);
  assert.equal(restoredIds.has('annotation:category-note:bubble'), true);
  assert.equal(restoredIds.has('decoration:selection-0'), true);
});

test('axisless coordinate policy is shared by axes and decoration fallbacks', () => {
  for (const mark of [
    'arc-diagram',
    'item',
    'solid-gauge',
    'tiled-map',
    'tilemap',
    'variable-pie',
  ]) {
    assert.equal(AXISLESS_MARKS.has(mark), true, mark);
  }
  assert.equal(
    isAxislessLayer({ mark: { type: 'pyramid', options: { variant: 'column-pyramid' } } }),
    false,
  );
  assert.equal(
    isAxislessLayer({ mark: { type: 'pyramid', options: { variant: 'pyramid' } } }),
    true,
  );

  const column = compile({
    data: [
      { category: 'A', value: 10 },
      { category: 'B', value: 20 },
    ],
    mark: { type: 'pyramid', options: { variant: 'column-pyramid' } },
    x: 'category',
    y: 'value',
  });
  const radial = compile({
    data: [
      { category: 'A', value: 10 },
      { category: 'B', value: 20 },
    ],
    mark: { type: 'pyramid', options: { variant: 'pyramid' } },
    x: 'category',
    y: 'value',
  });
  const columnIds = new Set(nodes(column.scene.root).map(({ id }) => id));
  const radialIds = new Set(nodes(radial.scene.root).map(({ id }) => id));
  assert.equal(columnIds.has('axis-x:line'), true);
  assert.equal(columnIds.has('axis-y:line'), true);
  assert.equal(radialIds.has('axis-x:line'), false);
  assert.equal(radialIds.has('axis-y:line'), false);
});

test('tiny charts clamp long RTL callouts and legend controls to scene bounds', () => {
  const { scene } = compile(
    {
      data: [{ category: 'فئة طويلة للغاية', value: 12 }],
      mark: 'bar',
      x: 'category',
      y: 'value',
      locale: 'ar',
      legend: {
        mode: 'layers',
        title: 'عنوان وسيلة إيضاح طويل للغاية للاختبار',
        items: [{ label: 'تسمية طويلة للغاية لا ينبغي أن تتجاوز السطح', layerId: 'layer-0' }],
      },
      annotations: [
        {
          id: 'tiny',
          target: { type: 'datum', rowIndex: 0 },
          text: 'ملاحظة طويلة للغاية يجب أن تبقى داخل الرسم البياني الصغير',
          detail: 'تفاصيل إضافية طويلة للغاية',
          style: { maxWidth: 2000, padding: 100, fontSize: 100 },
        },
      ],
    },
    { width: 150, height: 120 },
  );
  const bubble = nodes(scene.root).find(({ id }) => id === 'annotation:tiny:bubble');
  const bubbleBounds = sceneNodeBounds(bubble);
  assert.ok(bubbleBounds.x >= 0 && bubbleBounds.y >= 0);
  assert.ok(bubbleBounds.x + bubbleBounds.width <= scene.width);
  assert.ok(bubbleBounds.y + bubbleBounds.height <= scene.height);
  const content = nodes(scene.root).find(({ id }) => id === 'annotation:tiny:content');
  const padding = Math.min(100, Math.max(0, Math.min(bubble.width / 5, bubble.height / 6)));
  assert.deepEqual(content.clip, {
    x: bubble.x + padding,
    y: bubble.y + padding,
    width: bubble.width - padding * 2,
    height: bubble.height - padding * 2,
  });
  const legend = sceneLegendLayout(scene);
  assert.ok(legend.bounds.x >= 0 && legend.bounds.x + legend.bounds.width <= scene.width);
  assert.ok(
    legend.entries.every(
      ({ bounds }) =>
        bounds.x >= legend.bounds.x &&
        bounds.x + bounds.width <= legend.bounds.x + legend.bounds.width,
    ),
  );
  const visibleLabels = nodes(scene.root).filter(
    ({ id }) => id.startsWith('legend:item:') && id.endsWith(':label'),
  );
  assert.ok(visibleLabels.some(({ text }) => text.endsWith('…')));
  assert.match(scene.accessibility.description, /تسمية طويلة للغاية لا ينبغي/);
});

test('portable decoration validation rejects ambiguous, non-finite, and irrelevant targets', () => {
  const spec = {
    data: [{ x: 'A', y: 1 }],
    mark: 'point',
    x: 'x',
    y: 'y',
  };
  assert.ok(
    validateSpec({
      ...spec,
      highlights: [
        { target: { type: 'datum', field: 'x' } },
        { target: { type: 'datum', field: 'x', values: [Number.NaN] } },
        { target: { type: 'layer', layerId: 'layer-0', x: 0.5 } },
        { target: { type: 'range', x: { from: Number.POSITIVE_INFINITY, to: 2 } } },
      ],
    }).length >= 4,
  );
});

test('required legend, selection, and callout copy cannot be whitespace-only', () => {
  const chart = {
    data: [{ x: 'A', y: 1 }],
    mark: 'point',
    x: 'x',
    y: 'y',
    legend: { items: [{ label: '   ', layerId: 'layer-0' }] },
    annotations: [{ target: { type: 'datum', rowIndex: 0 }, text: '\t' }],
    interaction: { selection: { ariaLabel: '  ' } },
  };
  assert.ok(validateSpec(chart).length >= 3);
  assert.ok(
    validateSpatialSpec({
      layers: [{ id: 'points', mark: { type: 'scatter' }, data: { positions: [[0, 0, 0]] } }],
      legend: { items: [{ label: '  ', layerId: 'points' }] },
      annotations: [{ target: { type: 'datum', datumIndex: 0 }, text: '\n' }],
      interaction: { selection: { ariaLabel: '\t' } },
    }).length >= 3,
  );
});

test('selection selectors are sets and reject duplicate entries', () => {
  const chart = {
    data: [{ x: 'A', y: 1 }],
    mark: 'point',
    x: 'x',
    y: 'y',
  };
  assert.ok(
    validateSpec({
      ...chart,
      highlights: [{ target: { type: 'datum', rowIndex: [0, 0] } }],
    }).some(({ message }) => message.includes('unique')),
  );
  assert.ok(
    validateSpatialSpec({
      layers: [{ id: 'points', mark: { type: 'scatter' }, data: { positions: [[0, 0, 0]] } }],
      highlights: [{ target: { type: 'datum', datumIndex: [0, 0] } }],
    }).some(({ message }) => message.includes('unique')),
  );
});

test('portable schemas encode unsafe-field, set, and field/value parity constraints', async () => {
  const chartSchema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  const spatialSchema = JSON.parse(
    await readFile(new URL('../schema/graflume.spatial.schema.json', import.meta.url), 'utf8'),
  );
  for (const target of [chartSchema.$defs.datumTarget, spatialSchema.$defs.spatialDatumTarget]) {
    assert.equal(target.allOf[0].if.required[0], 'field');
    assert.equal(target.properties.values.uniqueItems, true);
    assert.deepEqual(target.properties.field.not.enum.sort(), [
      '__proto__',
      'constructor',
      'prototype',
    ]);
  }
  assert.equal(chartSchema.$defs.highlight.properties.dash.items.maximum, 256);
  for (const schema of [chartSchema, spatialSchema]) {
    assert.equal(schema.$defs.legendItem.properties.label.pattern, '\\S');
    assert.equal(schema.$defs.selection.properties.ariaLabel.pattern, '\\S');
    assert.equal(schema.$defs.annotation.properties.text.pattern, '\\S');
  }
});

test('legend and decoration layer references must resolve in 2D and spatial specs', () => {
  const chart = {
    data: [{ x: 'A', y: 1 }],
    mark: 'point',
    x: 'x',
    y: 'y',
  };
  const chartIssues = validateSpec({
    ...chart,
    legend: {
      layerId: 'missing',
      items: [
        { label: 'Semantic only', value: 'A' },
        { label: 'Missing', layerId: 'missing' },
      ],
    },
    highlights: [{ target: { type: 'layer', layerId: 'missing' } }],
    annotations: [{ target: { type: 'datum', layerId: 'missing', rowIndex: 0 }, text: 'Missing' }],
  });
  assert.deepEqual(
    chartIssues.filter(({ message }) => message.includes('does not exist')).map(({ path }) => path),
    [
      '$.legend.layerId',
      '$.legend.items[1].layerId',
      '$.highlights[0].target.layerId',
      '$.annotations[0].target.layerId',
    ],
  );
  assert.equal(
    validateSpec({ ...chart, legend: { items: [{ label: 'Semantic only', value: 'A' }] } }).length,
    0,
  );

  const spatial = {
    layers: [
      {
        id: 'terrain',
        mark: { type: 'surface' },
        data: { rows: 2, columns: 2, z: [0, 1, 1, 0] },
      },
    ],
  };
  const spatialIssues = validateSpatialSpec({
    ...spatial,
    legend: {
      mode: 'categories',
      layerId: 'missing',
      items: [
        { label: 'Semantic only', value: 'A' },
        { label: 'Missing', layerId: 'missing' },
      ],
    },
    highlights: [{ target: { type: 'layer', layerId: 'missing' } }],
    annotations: [
      { target: { type: 'datum', layerId: 'missing', datumIndex: 0 }, text: 'Missing' },
    ],
  });
  assert.deepEqual(
    spatialIssues
      .filter(({ message }) => message.includes('does not exist'))
      .map(({ path }) => path),
    [
      '$.legend.layerId',
      '$.legend.items[1].layerId',
      '$.highlights[0].target.layerId',
      '$.annotations[0].target.layerId',
    ],
  );
  assert.equal(
    validateSpatialSpec({
      ...spatial,
      legend: { mode: 'categories', items: [{ label: 'Semantic only', value: 'A' }] },
    }).length,
    0,
  );
});

test('explicit legend, highlight, annotation, and layer ids must be unique', () => {
  const chartIssues = validateSpec({
    layers: [
      { id: 'series', data: [{ x: 1, y: 2 }], mark: 'point', x: 'x', y: 'y' },
      { id: 'series', data: [{ x: 2, y: 3 }], mark: 'point', x: 'x', y: 'y' },
    ],
    legend: {
      items: [
        { id: 'same', label: 'A' },
        { id: 'same', label: 'B' },
      ],
    },
    highlights: [
      { id: 'same', target: { type: 'plot', x: 0.1, y: 0.1 } },
      { id: 'same', target: { type: 'plot', x: 0.2, y: 0.2 } },
    ],
    annotations: [
      { id: 'same', target: { type: 'plot', x: 0.1, y: 0.1 }, text: 'A' },
      { id: 'same', target: { type: 'plot', x: 0.2, y: 0.2 }, text: 'B' },
    ],
  });
  assert.equal(chartIssues.filter(({ message }) => message.includes('must be unique')).length, 4);

  const layer = {
    id: 'series',
    mark: { type: 'surface' },
    data: { rows: 2, columns: 2, z: [0, 1, 1, 0] },
  };
  const spatialIssues = validateSpatialSpec({
    layers: [layer, layer],
    legend: {
      items: [
        { id: 'same', label: 'A' },
        { id: 'same', label: 'B' },
      ],
    },
    highlights: [
      { id: 'same', target: { type: 'point', position: [0, 0, 0] } },
      { id: 'same', target: { type: 'point', position: [1, 1, 1] } },
    ],
    annotations: [
      { id: 'same', target: { type: 'point', position: [0, 0, 0] }, text: 'A' },
      { id: 'same', target: { type: 'point', position: [1, 1, 1] }, text: 'B' },
    ],
  });
  assert.equal(spatialIssues.filter(({ message }) => message.includes('must be unique')).length, 4);

  const resolvedIdIssues = validateSpec({
    data: [{ x: 'A', y: 1 }],
    mark: 'point',
    x: 'x',
    y: 'y',
    legend: { items: [{ id: 'item-1', label: 'A' }, { label: 'B' }] },
    highlights: [
      { id: 'highlight-1', target: { type: 'plot', x: 0, y: 0 } },
      { target: { type: 'plot', x: 1, y: 1 } },
    ],
    annotations: [
      { id: 'annotation-1', target: { type: 'plot', x: 0, y: 0 }, text: 'A' },
      { target: { type: 'plot', x: 1, y: 1 }, text: 'B' },
    ],
  });
  assert.equal(
    resolvedIdIssues.filter(({ message }) => message.includes('after defaults')).length,
    3,
  );
});

test('outside legend alignment preserves default origin and centers or ends along the plot edge', () => {
  for (const position of ['top', 'bottom', 'left', 'right']) {
    const render = (align) =>
      compile(
        {
          data: [{ category: 'A', value: 10 }],
          mark: { type: 'bar' },
          x: { field: 'category', type: 'nominal' },
          y: { field: 'value', type: 'quantitative' },
          legend: { position, ...(align === undefined ? {} : { align }) },
        },
        { width: 800, height: 600 },
      );
    const base = render();
    const start = sceneLegendLayout(render('start').scene).bounds;
    assert.deepEqual(sceneLegendLayout(base.scene).bounds, start);
    const horizontal = position === 'top' || position === 'bottom';
    const coordinate = horizontal ? 'x' : 'y';
    const size = horizontal ? 'width' : 'height';
    const plot = base.coordinates.plot;
    for (const [align, factor] of [
      ['center', 0.5],
      ['end', 1],
    ]) {
      const result = render(align);
      const legend = sceneLegendLayout(result.scene).bounds;
      assert.equal(legend[coordinate], plot[coordinate] + (plot[size] - legend[size]) * factor);
      assert.equal(result.spec.legend.align, align);
    }
  }
  assert.ok(
    validateSpec({
      data: [{ x: 'A', y: 1 }],
      mark: 'bar',
      x: 'x',
      y: 'y',
      legend: { align: 'middle' },
    }).some(({ path }) => path === '$.legend.align'),
  );
});

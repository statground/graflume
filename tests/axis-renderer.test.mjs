import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compileAxis,
  measureAxisGutter,
  measureAxisLabelGutter,
} from '../.tmp/src/compiler/axis.js';
import { formatAxisTick, truncateAxisLabel } from '../.tmp/src/compiler/axis-format.js';
import { BandScale } from '../.tmp/src/scale/band.js';
import { LinearScale } from '../.tmp/src/scale/linear.js';
import { graflumeLight } from '../.tmp/src/theme/defaults.js';
import { sceneNodeBounds } from '../.tmp/src/scene/bounds.js';

const plot = { x: 56, y: 24, width: 320, height: 200 };

function axis(position, overrides = {}) {
  const source = {
    visible: true,
    position,
    offset: 0,
    line: { visible: true, opacity: 1, dash: [] },
    grid: { visible: position === 'left', opacity: 0.82, dash: [] },
    ticks: { visible: true, opacity: 1, dash: [], spacing: 0 },
    labels: {
      visible: true,
      orientation: 'auto',
      align: 'auto',
      font: { style: 'normal' },
    },
    title: {
      visible: true,
      align: 'center',
      padding: position === 'left' || position === 'right' ? 46 : 32,
      font: { style: 'normal' },
    },
    format: {
      type: 'auto',
      notation: 'standard',
      useGrouping: true,
      currencyDisplay: 'symbol',
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
      prefix: '',
      suffix: '',
    },
  };
  return {
    ...source,
    ...overrides,
    line: { ...source.line, ...overrides.line },
    grid: { ...source.grid, ...overrides.grid },
    ticks: { ...source.ticks, ...overrides.ticks },
    labels: {
      ...source.labels,
      ...overrides.labels,
      font: { ...source.labels.font, ...overrides.labels?.font },
    },
    title: {
      ...source.title,
      ...overrides.title,
      font: { ...source.title.font, ...overrides.title?.font },
    },
    format: { ...source.format, ...overrides.format },
  };
}

test('generic primary axes preserve legacy positions and fit the existing gutters', () => {
  const xScale = new BandScale({ domain: ['Jan', 'Feb', 'Mar'], range: [56, 376] });
  const xContext = {
    id: 'x',
    axis: axis('bottom', { grid: { visible: false } }),
    scale: xScale,
    plot,
    theme: graflumeLight,
    locale: 'en-US',
    title: 'Month',
  };
  const xNodes = compileAxis(xContext);
  const xLine = xNodes.find((node) => node.id === 'axis-x:line');
  const xLabel = xNodes.find((node) => node.id === 'axis-x:label:0');
  const xTitle = xNodes.find((node) => node.id === 'axis-x:title');

  assert.equal(xLine?.type, 'line');
  assert.equal(xLine?.y1, 224);
  assert.equal(xLabel?.type, 'text');
  assert.equal(xLabel?.y, 233);
  assert.equal(xTitle?.type, 'text');
  assert.equal(xTitle?.y, 256);
  assert.equal(measureAxisGutter(xContext), 44);
  assert.equal(measureAxisLabelGutter(xContext), 21);

  const yContext = {
    id: 'y',
    axis: axis('left'),
    scale: new LinearScale({ domain: [0, 100], range: [224, 24], nice: false }),
    plot,
    theme: graflumeLight,
    locale: 'en-US',
    title: 'Value',
  };
  const yNodes = compileAxis(yContext);
  const yTitle = yNodes.find((node) => node.id === 'axis-y:title');
  assert.equal(yTitle?.type, 'text');
  assert.equal(yTitle?.x, 12);
  assert.equal(yTitle?.rotation, -90);
  assert.ok(measureAxisGutter(yContext) <= 56);

  const categoricalYContext = {
    ...yContext,
    scale: new BandScale({
      domain: ['Research', 'Implementation', 'Verification'],
      range: [24, 224],
    }),
  };
  assert.equal(measureAxisGutter(categoricalYContext), 56);
  assert.ok(
    measureAxisGutter({
      ...categoricalYContext,
      axis: axis('left', { labels: { font: { size: 18 } } }),
    }) > 56,
  );

  const verticalDownNodes = compileAxis({
    ...xContext,
    axis: axis('bottom', { labels: { orientation: 'vertical-down' } }),
  });
  const verticalDownLabel = verticalDownNodes.find((node) => node.id === 'axis-x:label:0');
  assert.equal(verticalDownLabel?.type, 'text');
  assert.equal(verticalDownLabel?.rotation, 90);
  assert.equal(verticalDownLabel?.align, 'left');
});

test('secondary axes apply offset, explicit ticks, styles, fonts and label truncation', () => {
  const context = {
    id: 'y2',
    axis: axis('right', {
      offset: 4,
      line: { color: '#123456', width: 2, opacity: 0.7, dash: [4, 2] },
      ticks: { values: [0, 0.5, 1], size: 6, color: '#234567', width: 2 },
      labels: {
        angle: -15,
        padding: 8,
        maxLength: 5,
        color: '#345678',
        font: { family: 'Test Sans', size: 14, weight: 'bold', style: 'italic' },
      },
      title: { text: 'Conversion', color: '#456789', font: { style: 'italic' } },
      format: { type: 'percent', fractionDigits: 1, prefix: '[', suffix: ']' },
    }),
    scale: new LinearScale({ domain: [0, 1], range: [224, 24], nice: false }),
    plot,
    theme: graflumeLight,
    locale: 'en-US',
    title: 'Fallback',
  };
  const nodes = compileAxis(context);
  const axisLine = nodes.find((node) => node.id === 'axis-y2:line');
  const tick = nodes.find((node) => node.id === 'axis-y2:tick:0');
  const label = nodes.find((node) => node.id === 'axis-y2:label:1');
  const title = nodes.find((node) => node.id === 'axis-y2:title');

  assert.equal(axisLine?.type, 'line');
  assert.equal(axisLine?.x1, 380);
  assert.deepEqual(axisLine?.dash, [4, 2]);
  assert.equal(tick?.type, 'line');
  assert.equal(tick?.x2, 386);
  assert.equal(label?.type, 'text');
  assert.equal(label?.x, 394);
  assert.equal(label?.text, '[50.…');
  assert.equal(label?.fontFamily, 'Test Sans');
  assert.equal(label?.fontWeight, 700);
  assert.equal(label?.fontStyle, 'italic');
  assert.equal(label?.rotation, -15);
  assert.equal(title?.type, 'text');
  assert.equal(title?.rotation, 90);
  assert.equal(title?.fontStyle, 'italic');
  assert.ok(measureAxisGutter(context) > 50);
});

test('axis formatting is declarative, locale-aware and safe for invalid Intl options', () => {
  const tick = { value: 12345.678, label: '12,345.678', position: 0 };
  const base = axis('bottom').format;

  assert.equal(
    formatAxisTick(tick, { ...base, type: 'number', fractionDigits: 1 }, 'en-US'),
    '12,345.7',
  );
  assert.equal(formatAxisTick(tick, { ...base, type: 'integer' }, 'en-US'), '12,346');
  assert.match(
    formatAxisTick(
      tick,
      { ...base, type: 'currency', currency: 'KRW', fractionDigits: 0 },
      'ko-KR',
    ),
    /12,346/,
  );
  assert.match(
    formatAxisTick({ ...tick, value: 0.256 }, { ...base, type: 'percent' }, 'en-US'),
    /25\.6%/,
  );
  assert.match(
    formatAxisTick(tick, { ...base, type: 'compact', fractionDigits: 1 }, 'en-US'),
    /12\.3K/,
  );
  assert.match(
    formatAxisTick(tick, { ...base, type: 'scientific', fractionDigits: 2 }, 'en-US'),
    /1\.23E4/,
  );
  const dateTick = { value: Date.UTC(2026, 7, 23, 9, 30), label: '', position: 0 };
  assert.equal(
    formatAxisTick(dateTick, { ...base, type: 'date', dateStyle: 'medium' }, 'en-US'),
    'Aug 23, 2026',
  );
  assert.match(
    formatAxisTick(dateTick, { ...base, type: 'time', timeStyle: 'short' }, 'en-US'),
    /9:30 AM/,
  );
  assert.doesNotThrow(() =>
    formatAxisTick(
      dateTick,
      { ...base, type: 'datetime', timeZone: 'Not/A_Time_Zone' },
      'not-a-locale',
    ),
  );
  assert.equal(
    formatAxisTick(
      { value: '2026-02-29', label: 'invalid date', position: 0 },
      { ...base, type: 'date' },
      'en-US',
    ),
    'invalid date',
  );
  assert.equal(truncateAxisLabel('가나다라마바사', 4), '가나다…');
  assert.equal(truncateAxisLabel('📈growth', 2), '📈…');
});

test('automatic category labels avoid appended endpoint collisions while preserving ticks', () => {
  const domain = Array.from(
    { length: 18 },
    (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`,
  );
  for (const reverse of [false, true]) {
    const scale = new BandScale({ domain, range: reverse ? [998, 60] : [60, 998] });
    const context = {
      id: 'x',
      axis: axis('bottom', { ticks: { size: 4 } }),
      scale,
      plot: { x: 60, y: 88, width: 938, height: 260 },
      theme: graflumeLight,
      title: '',
    };
    const nodes = compileAxis(context);
    const labels = nodes
      .filter((node) => node.type === 'text' && node.id.startsWith('axis-x:label:'))
      .sort((a, b) => a.x - b.x);
    assert.ok(labels.some((node) => node.text === domain[0]));
    assert.ok(labels.some((node) => node.text === domain.at(-1)));
    assert.ok(labels.length < scale.ticks(9).length);
    for (let index = 1; index < labels.length; index += 1) {
      const previous = sceneNodeBounds(labels[index - 1]);
      const current = sceneNodeBounds(labels[index]);
      assert.ok(
        previous.x + previous.width <= current.x,
        `${labels[index - 1].text} overlaps ${labels[index].text}`,
      );
    }
    const tickCount = nodes.filter((node) => node.id.startsWith('axis-x:tick:')).length;
    assert.equal(tickCount, scale.ticks(9).length);
    const authored = compileAxis({ ...context, axis: axis('bottom', { ticks: { count: 9 } }) });
    assert.equal(
      authored.filter((node) => node.type === 'text' && node.id.startsWith('axis-x:label:')).length,
      scale.ticks(9).length,
    );
  }
});

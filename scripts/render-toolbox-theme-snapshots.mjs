import { spawnSync } from 'node:child_process';

import { builtInThemeCatalog } from '../dist/graflume.js';

const checkOnly = process.argv.includes('--check');
const themes = builtInThemeCatalog.filter(({ snapshot }) => snapshot).map(({ id }) => id);
const groups = [
  {
    script: 'render-chart-guide-snapshots.mjs',
    only: [
      'annotation',
      'area',
      'bar',
      'bubble',
      'calendar',
      'candlestick',
      'combination',
      'difference',
      'pie',
      'timeline',
      'gauge',
      'map',
      'interval',
      'line',
      'motion',
      'hierarchy',
      'flow',
      'scatter',
      'table',
      'waterfall',
      'word-tree',
    ],
  },
  {
    script: 'render-additional-chart-snapshots.mjs',
    only: [
      'distribution',
      'polar',
      'network',
      'chord',
      'funnel',
      'parallel',
      'heatmap',
      'image',
      'ternary',
      'smith',
      'scatter-matrix',
      'carpet',
    ],
  },
  {
    script: 'render-series-chart-snapshots.mjs',
    only: [
      'contour',
      'item',
      'vector-field',
      'venn',
      'word-cloud',
      'price-blocks',
      'volume-profile',
      'technical-indicator',
    ],
  },
  {
    script: 'render-spatial-snapshots.mjs',
    only: ['surface', 'volume', 'vector-cone'],
  },
];

for (const theme of themes) {
  for (const group of groups) {
    const arguments_ = [
      new URL(group.script, import.meta.url).pathname,
      `--theme=${theme}`,
      `--only=${group.only.join(',')}`,
      ...(checkOnly ? ['--check'] : []),
    ];
    const result = spawnSync(process.execPath, arguments_, { stdio: 'inherit' });
    if (result.error !== undefined) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

const snapshotCount = themes.length * groups.reduce((total, group) => total + group.only.length, 0);
console.log(`${checkOnly ? 'Verified' : 'Rendered'} ${snapshotCount} Toolbox theme snapshots.`);

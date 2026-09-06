import assert from 'node:assert/strict';
import test from 'node:test';
import { hasRestrictedPublicName } from '../scripts/lib/neutral-names.mjs';

test('neutral naming distinguishes a legacy identifier prefix from unrelated snapshot APIs', () => {
  const prefix = ['e', 'Chart'].join('');
  for (const source of [prefix, `const ${prefix} = 1`, `_${prefix}Renderer`, `${prefix}Renderer()`])
    assert.equal(hasRestrictedPublicName(source), true);
  for (const source of ['captureChartSnapshot', 'restoreChartSnapshot', 'safeChartState'])
    assert.equal(hasRestrictedPublicName(source), false);
  const plural = ['E', 'Charts'].join('');
  assert.equal(hasRestrictedPublicName(`window.${plural}.create()`), true);
});

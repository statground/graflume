import assert from 'node:assert/strict';
import test from 'node:test';

import {
  initializeStaticToolbarIcons,
  staticToolbarIconReadiness,
} from '../rollup.spreadsheet.config.mjs';

const deferredInitializer = 'const [realIcon, setRealIcon] = useState("");';
const readyInitializer =
  'const [realIcon, setRealIcon] = useState(typeof icon === "string" ? icon : "");';

function sourceRegion(initializer = deferredInitializer) {
  return [
    '//#region src/components/custom-label/CustomLabel.tsx',
    'function CustomLabel(props) {',
    '  const { icon } = props;',
    `  ${initializer}`,
    '}',
    '//#endregion',
  ].join('\n');
}

function errorContext() {
  return {
    error(message) {
      throw new Error(message);
    },
  };
}

test('static toolbar icons initialize in the first render and remain idempotent', () => {
  const first = initializeStaticToolbarIcons(sourceRegion());
  assert.equal(first.matched, true);
  assert.equal(first.changed, true);
  assert.equal(first.code.includes(deferredInitializer), false);
  assert.equal(first.code.includes(readyInitializer), true);

  const second = initializeStaticToolbarIcons(first.code);
  assert.equal(second.matched, true);
  assert.equal(second.changed, false);
  assert.equal(second.code, first.code);
});

test('unrelated modules pass through without modification', () => {
  const source = 'export const unrelated = true;';
  assert.deepEqual(initializeStaticToolbarIcons(source), {
    code: source,
    matched: false,
    changed: false,
  });
});

test('static toolbar icon source drift fails closed', () => {
  assert.throws(
    () => initializeStaticToolbarIcons(sourceRegion('const realIcon = icon;')),
    /initializer must match exactly once; found 0/,
  );
  assert.throws(
    () =>
      initializeStaticToolbarIcons(sourceRegion(`${deferredInitializer}\n  ${readyInitializer}`)),
    /initializer must match exactly once; found 2/,
  );
  assert.throws(
    () => initializeStaticToolbarIcons(`${sourceRegion()}\n${sourceRegion(readyInitializer)}`),
    /source region must match exactly once; found 2/,
  );
  assert.throws(
    () =>
      initializeStaticToolbarIcons(
        sourceRegion().replace('//#endregion', '// missing region terminator'),
      ),
    /source region is not terminated/,
  );
});

test('build transform requires exactly one matching dependency module', () => {
  const missing = staticToolbarIconReadiness();
  missing.buildStart();
  assert.equal(missing.transform('export {};'), null);
  assert.throws(
    () => missing.buildEnd.call(errorContext()),
    /source region must occur in exactly one module; found 0/,
  );

  const exact = staticToolbarIconReadiness();
  exact.buildStart();
  assert.match(exact.transform(sourceRegion()).code, /typeof icon === "string"/);
  assert.doesNotThrow(() => exact.buildEnd.call(errorContext()));

  const duplicate = staticToolbarIconReadiness();
  duplicate.buildStart();
  duplicate.transform(sourceRegion());
  duplicate.transform(sourceRegion(readyInitializer));
  assert.throws(
    () => duplicate.buildEnd.call(errorContext()),
    /source region must occur in exactly one module; found 2/,
  );
});

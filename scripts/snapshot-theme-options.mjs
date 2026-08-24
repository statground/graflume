import { builtInThemeCatalog, defaultThemeId } from '../dist/graflume.js';

const supportedThemes = new Set(builtInThemeCatalog.map(({ id }) => id));

const themeArgument = process.argv.find((argument) => argument.startsWith('--theme='));
export const snapshotTheme = themeArgument?.slice('--theme='.length) ?? null;

if (snapshotTheme !== null && !supportedThemes.has(snapshotTheme)) {
  throw new Error(
    `Unsupported snapshot theme "${snapshotTheme}". Choose one of: ${[...supportedThemes].join(', ')}.`,
  );
}

const onlyArgument = process.argv.find((argument) => argument.startsWith('--only='));
const requestedSnapshots = new Set(
  (onlyArgument?.slice('--only='.length) ?? '')
    .split(',')
    .map((value) => value.trim().replace(/\.svg$/u, ''))
    .filter(Boolean),
);

export const checkOnly = process.argv.includes('--check');

export function snapshotOutputDirectory(metaUrl, family) {
  if (snapshotTheme === null || snapshotTheme === defaultThemeId) {
    return new URL(`../docs/assets/${family}/`, metaUrl);
  }
  return new URL(`../docs/assets/themes/${snapshotTheme}/${family}/`, metaUrl);
}

export function includeSnapshot(filename) {
  if (requestedSnapshots.size === 0) return true;
  return requestedSnapshots.has(filename.replace(/\.svg$/u, ''));
}

const markVisualKeys = new Set([
  'fill',
  'stroke',
  'lineWidth',
  'radius',
  'cornerRadius',
  'color',
  'colorLow',
  'colorHigh',
  'landColor',
  'oceanColor',
  'borderColor',
  'pointColor',
  'routeColor',
]);

function withoutKeys(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.has(key)));
}

function neutralAxis(value) {
  if (value === false || value === undefined || value === null || typeof value !== 'object') {
    return value;
  }
  const axis = { ...value };
  delete axis.grid;
  delete axis.line;
  delete axis.ticks;
  if (axis.labels !== false && typeof axis.labels === 'object') {
    axis.labels = withoutKeys(axis.labels, new Set(['color', 'font', 'padding']));
  }
  if (typeof axis.title === 'object') {
    axis.title = withoutKeys(axis.title, new Set(['color', 'font', 'padding']));
  }
  return axis;
}

function neutralEncoding(value) {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  return { ...value, ...(value.axis === undefined ? {} : { axis: neutralAxis(value.axis) }) };
}

function neutralLayer(value) {
  if (value === null || typeof value !== 'object') return value;
  return {
    ...value,
    ...(value.mark === undefined ? {} : { mark: withoutKeys(value.mark, markVisualKeys) }),
    ...(value.x === undefined ? {} : { x: neutralEncoding(value.x) }),
    ...(value.y === undefined ? {} : { y: neutralEncoding(value.y) }),
  };
}

/** Remove authored cosmetics only for generated cross-theme preview assets. */
function neutralThemePreview(spec) {
  const preview = {
    ...spec,
    ...(spec.mark === undefined ? {} : { mark: withoutKeys(spec.mark, markVisualKeys) }),
    ...(spec.x === undefined ? {} : { x: neutralEncoding(spec.x) }),
    ...(spec.y === undefined ? {} : { y: neutralEncoding(spec.y) }),
    ...(Array.isArray(spec.layers) ? { layers: spec.layers.map(neutralLayer) } : {}),
  };
  if (preview.axes !== undefined && preview.axes !== null && typeof preview.axes === 'object') {
    preview.axes = Object.fromEntries(
      Object.entries(preview.axes).map(([id, axis]) => [id, neutralAxis(axis)]),
    );
  }
  if (preview.legend !== false && typeof preview.legend === 'object') {
    preview.legend = {
      ...preview.legend,
      ...(Array.isArray(preview.legend.items)
        ? {
            items: preview.legend.items.map((item) =>
              withoutKeys(item, new Set(['color', 'fill', 'stroke'])),
            ),
          }
        : {}),
    };
  }
  return preview;
}

export function applySnapshotTheme(spec) {
  if (snapshotTheme === null) return spec;
  if (snapshotTheme === defaultThemeId) return { ...spec, theme: snapshotTheme };
  const { background: _authoredBackground, ...themePreviewSpec } = spec;
  return { ...neutralThemePreview(themePreviewSpec), theme: snapshotTheme };
}

export function assertAllRequestedSnapshotsRendered(renderedFilenames) {
  if (requestedSnapshots.size === 0) return;
  const rendered = new Set(renderedFilenames.map((filename) => filename.replace(/\.svg$/u, '')));
  const missing = [...requestedSnapshots].filter((filename) => !rendered.has(filename));
  if (missing.length > 0) {
    throw new Error(`Requested snapshots were not found: ${missing.join(', ')}`);
  }
}

export function snapshotThemeLabel() {
  return snapshotTheme === null ? '' : ` for ${snapshotTheme}`;
}

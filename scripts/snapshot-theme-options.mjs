const supportedThemes = new Set(['graflume-light', 'graflume-dark', 'ggplot']);

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
  if (snapshotTheme === null || snapshotTheme === 'graflume-light') {
    return new URL(`../docs/assets/${family}/`, metaUrl);
  }
  return new URL(`../docs/assets/themes/${snapshotTheme}/${family}/`, metaUrl);
}

export function includeSnapshot(filename) {
  if (requestedSnapshots.size === 0) return true;
  return requestedSnapshots.has(filename.replace(/\.svg$/u, ''));
}

export function applySnapshotTheme(spec) {
  if (snapshotTheme === null) return spec;
  if (snapshotTheme === 'graflume-light') return { ...spec, theme: snapshotTheme };
  const { background: _authoredBackground, ...themePreviewSpec } = spec;
  return { ...themePreviewSpec, theme: snapshotTheme };
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

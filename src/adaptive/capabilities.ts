import type {
  AccessibilitySpec,
  AxisLabelSpec,
  AxisSpec,
  AxisTickSpec,
  ChartSpec,
  ControlsSpec,
  DataInput,
  InteractionSpec,
  LegendSpec,
  PlaybackSpec,
} from '../spec/types.js';

export const adaptiveContractVersion = '0.1' as const;

/**
 * Capability profiles are intentionally not user-agent or device-name checks.
 * One environment can activate several profiles at once (for example a round,
 * coarse-pointer, low-resource viewport with slow monochrome updates).
 */
export type AdaptiveCapabilityId =
  | 'zoom-reflow'
  | 'foldable-dual'
  | 'tv-remote'
  | 'print-paged'
  | 'forced-colors'
  | 'reduced-effects'
  | 'coarse-touch'
  | 'keyboard-switch'
  | 'low-resource'
  | 'rtl'
  | 'vertical-writing'
  | 'ultrawide-projection'
  | 'screenreader-braille'
  | 'no-script'
  | 'spatial-xr'
  | 'cutout-round'
  | 'virtual-keyboard';

export type AdaptiveCapabilityCategory =
  'layout' | 'input' | 'display' | 'motion' | 'resource' | 'accessibility' | 'runtime';

export interface AdaptiveCapabilityDefinition {
  readonly id: AdaptiveCapabilityId;
  readonly category: AdaptiveCapabilityCategory;
  readonly signals: readonly string[];
  readonly behavior: readonly string[];
}

const capability = (
  id: AdaptiveCapabilityId,
  category: AdaptiveCapabilityCategory,
  signals: readonly string[],
  behavior: readonly string[],
): AdaptiveCapabilityDefinition =>
  Object.freeze({
    id,
    category,
    signals: Object.freeze([...signals]),
    behavior: Object.freeze([...behavior]),
  });

/** Stable source of truth shared by Canvas, Spatial and host-side device examples. */
export const adaptiveCapabilityCatalog = Object.freeze([
  capability(
    'zoom-reflow',
    'layout',
    ['small CSS viewport', 'page zoom'],
    ['compact gutters', 'wrapped legend rail', 'inspection zoom'],
  ),
  capability(
    'foldable-dual',
    'layout',
    ['multiple viewport segments'],
    ['segment-safe reflow', 'avoid hinge/cutout insets'],
  ),
  capability(
    'tv-remote',
    'input',
    ['large viewport', 'no pointer hover', 'remote navigation'],
    ['large focus targets', 'keyboard-equivalent navigation'],
  ),
  capability(
    'print-paged',
    'display',
    ['print media', 'paged block overflow'],
    ['static frame', 'visible semantic table recommendation'],
  ),
  capability(
    'forced-colors',
    'display',
    ['forced-colors', 'increased contrast preference'],
    ['high-contrast theme override', 'visible focus and outlines'],
  ),
  capability(
    'reduced-effects',
    'motion',
    ['reduced motion/transparency', 'slow or static update'],
    ['no autoplay', 'no interpolation', 'opaque chrome'],
  ),
  capability(
    'coarse-touch',
    'input',
    ['coarse pointer'],
    ['44 CSS pixel targets', 'pinch and vertical-scroll-safe gestures'],
  ),
  capability(
    'keyboard-switch',
    'input',
    ['keyboard-only', 'switch control'],
    ['roving focus', 'zoom/reset keyboard parity'],
  ),
  capability(
    'low-resource',
    'resource',
    ['save-data', 'small memory/CPU budget', 'grid/static display'],
    ['bounded pixel ratio', 'bounded effects', 'semantic fallback'],
  ),
  capability('rtl', 'layout', ['right-to-left direction'], ['logical chrome and text direction']),
  capability(
    'vertical-writing',
    'layout',
    ['vertical writing mode'],
    ['vertical-safe axis labels', 'logical layout metadata'],
  ),
  capability(
    'ultrawide-projection',
    'layout',
    ['ultrawide aspect ratio', 'projection surface'],
    ['bounded content measure', 'readable typography and controls'],
  ),
  capability(
    'screenreader-braille',
    'accessibility',
    ['explicit assistive-technology host signal'],
    ['visible semantic table', 'complete keyboard navigation'],
  ),
  capability(
    'no-script',
    'runtime',
    ['scripting unavailable or initial-only'],
    ['static image and semantic table fallback required'],
  ),
  capability(
    'spatial-xr',
    'input',
    ['explicit immersive/XR host signal'],
    ['programmatic camera parity', 'non-immersive semantic fallback'],
  ),
  capability(
    'cutout-round',
    'layout',
    ['round display', 'non-zero safe-area inset'],
    ['safe inset padding', 'scrollable compact controls'],
  ),
  capability(
    'virtual-keyboard',
    'layout',
    ['virtual keyboard inset', 'visual viewport contraction'],
    ['height reflow', 'focused controls remain reachable'],
  ),
] as const satisfies readonly AdaptiveCapabilityDefinition[]);

export type AdaptiveViewportClass = 'wide' | 'compact' | 'narrow' | 'micro';
export type AdaptiveDisplayClass = 'color' | 'high-contrast' | 'monochrome' | 'e-ink' | 'grid';
export type AdaptiveInputClass = 'fine' | 'coarse' | 'keyboard' | 'remote' | 'nonvisual';
export type AdaptiveMotionClass = 'full' | 'reduced' | 'static';
export type AdaptiveResourceClass = 'standard' | 'constrained';

export interface AdaptiveSafeAreaInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface AdaptiveEnvironment {
  readonly width: number;
  readonly height: number;
  readonly rowCount: number;
  readonly pixelRatio: number;
  readonly zoom: number;
  readonly pointer: 'fine' | 'coarse' | 'none';
  readonly hover: boolean;
  readonly keyboard: boolean;
  readonly switchControl: boolean;
  readonly remoteControl: boolean;
  readonly update: 'fast' | 'slow' | 'none';
  readonly monochromeBits: number;
  readonly grid: boolean;
  readonly viewportSegments: number;
  readonly forcedColors: boolean;
  readonly contrast: 'normal' | 'more' | 'less' | 'custom';
  readonly reducedMotion: boolean;
  readonly reducedTransparency: boolean;
  readonly reducedData: boolean;
  readonly scripting: 'enabled' | 'initial-only' | 'none';
  readonly media: 'screen' | 'print';
  readonly paged: boolean;
  readonly direction: 'ltr' | 'rtl';
  readonly writingMode: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
  readonly deviceMemoryGB?: number;
  readonly hardwareConcurrency?: number;
  readonly saveData: boolean;
  readonly screenReader: boolean;
  readonly braille: boolean;
  readonly spatialXR: boolean;
  readonly roundDisplay: boolean;
  readonly safeArea: AdaptiveSafeAreaInsets;
  readonly virtualKeyboardInset: number;
  readonly projection: boolean;
}

export type AdaptiveEnvironmentInput = Partial<AdaptiveEnvironment> &
  Pick<AdaptiveEnvironment, 'width' | 'height'>;

export interface AdaptiveProfileDefinition {
  readonly id: string;
  readonly order: number;
  readonly kind: 'scenario' | 'capability';
  readonly category: AdaptiveCapabilityCategory | 'scenario';
  readonly label: string;
  readonly compactLabel: string;
  readonly summary: string;
  readonly capabilities: readonly AdaptiveCapabilityId[];
  readonly environment: Partial<AdaptiveEnvironment>;
  readonly presentation: {
    readonly width: number;
    readonly height: number;
    readonly shape: 'rectangle' | 'round' | 'dual' | 'paged' | 'nonvisual';
    readonly display: AdaptiveDisplayClass;
    readonly input: AdaptiveInputClass;
    readonly motion: AdaptiveMotionClass;
    readonly renderer: 'canvas-spatial' | 'static-fallback';
  };
}

function capabilityEnvironment(id: AdaptiveCapabilityId): Partial<AdaptiveEnvironment> {
  switch (id) {
    case 'zoom-reflow':
      return { width: 320, height: 480, zoom: 2 };
    case 'foldable-dual':
      return { width: 720, height: 640, viewportSegments: 2 };
    case 'tv-remote':
      return { width: 1_920, height: 1_080, pointer: 'none', hover: false, remoteControl: true };
    case 'print-paged':
      return { width: 794, height: 1_123, media: 'print', paged: true, update: 'none' };
    case 'forced-colors':
      return { forcedColors: true, contrast: 'more' };
    case 'reduced-effects':
      return { reducedMotion: true, reducedTransparency: true };
    case 'coarse-touch':
      return { width: 390, height: 844, pointer: 'coarse', hover: false };
    case 'keyboard-switch':
      return { pointer: 'none', keyboard: true, switchControl: true };
    case 'low-resource':
      return { deviceMemoryGB: 1, hardwareConcurrency: 2, saveData: true };
    case 'rtl':
      return { direction: 'rtl' };
    case 'vertical-writing':
      return { writingMode: 'vertical-rl' };
    case 'ultrawide-projection':
      return { width: 1_920, height: 720, projection: true };
    case 'screenreader-braille':
      return { pointer: 'none', keyboard: true, screenReader: true, braille: true };
    case 'no-script':
      return { scripting: 'none', update: 'none' };
    case 'spatial-xr':
      return { spatialXR: true, pointer: 'none', keyboard: false };
    case 'cutout-round':
      return {
        width: 184,
        height: 224,
        roundDisplay: true,
        safeArea: { top: 18, right: 18, bottom: 18, left: 18 },
      };
    case 'virtual-keyboard':
      return { width: 390, height: 560, virtualKeyboardInset: 280 };
  }
}

function profile<const T extends AdaptiveProfileDefinition>(entry: T): T {
  Object.freeze(entry.capabilities);
  if (entry.environment.safeArea !== undefined) Object.freeze(entry.environment.safeArea);
  Object.freeze(entry.environment);
  Object.freeze(entry.presentation);
  return Object.freeze(entry);
}

/**
 * Ordered adaptive registry consumed by generated catalog assets and hosts.
 * The first six entries reproduce the explicitly requested device examples;
 * the remaining entries expose orthogonal capability cases. Consumers discover
 * entries from this registry instead of copying an ID allowlist.
 */
export const adaptiveProfileCatalog = Object.freeze([
  profile({
    id: 'responsive-fluid',
    order: 0,
    kind: 'scenario',
    category: 'scenario',
    label: 'Responsive fluid viewport',
    compactLabel: 'Responsive',
    summary: 'A fluid container that continuously reflows axes, legends, controls, and plots.',
    capabilities: ['zoom-reflow'],
    environment: { width: 960, height: 540 },
    presentation: {
      width: 960,
      height: 540,
      shape: 'rectangle',
      display: 'color',
      input: 'fine',
      motion: 'full',
      renderer: 'canvas-spatial',
    },
  }),
  profile({
    id: 'mobile-touch',
    order: 1,
    kind: 'scenario',
    category: 'scenario',
    label: 'Mobile touch viewport',
    compactLabel: 'Mobile',
    summary: 'A narrow coarse-pointer viewport with scroll-safe gestures and 44px controls.',
    capabilities: ['zoom-reflow', 'coarse-touch', 'virtual-keyboard'],
    environment: {
      width: 390,
      height: 844,
      pointer: 'coarse',
      hover: false,
      virtualKeyboardInset: 280,
    },
    presentation: {
      width: 390,
      height: 844,
      shape: 'rectangle',
      display: 'color',
      input: 'coarse',
      motion: 'full',
      renderer: 'canvas-spatial',
    },
  }),
  profile({
    id: 'smartwatch',
    order: 2,
    kind: 'scenario',
    category: 'scenario',
    label: 'Smartwatch viewport',
    compactLabel: 'Watch',
    summary: 'A round micro viewport with safe insets, touch targets, and inspection zoom.',
    capabilities: [
      'zoom-reflow',
      'reduced-effects',
      'coarse-touch',
      'low-resource',
      'cutout-round',
    ],
    environment: {
      width: 184,
      height: 224,
      pointer: 'coarse',
      hover: false,
      roundDisplay: true,
      reducedMotion: true,
      safeArea: { top: 18, right: 18, bottom: 18, left: 18 },
      deviceMemoryGB: 1,
    },
    presentation: {
      width: 184,
      height: 224,
      shape: 'round',
      display: 'color',
      input: 'coarse',
      motion: 'reduced',
      renderer: 'canvas-spatial',
    },
  }),
  profile({
    id: 'ebook-paper',
    order: 3,
    kind: 'scenario',
    category: 'scenario',
    label: 'Electronic paper reader',
    compactLabel: 'E-paper',
    summary: 'A paged monochrome display with slow refresh and static semantic output.',
    capabilities: ['print-paged', 'reduced-effects', 'low-resource'],
    environment: {
      width: 758,
      height: 1_024,
      update: 'slow',
      monochromeBits: 4,
      paged: true,
      pointer: 'none',
      keyboard: true,
      reducedMotion: true,
    },
    presentation: {
      width: 758,
      height: 1_024,
      shape: 'paged',
      display: 'e-ink',
      input: 'keyboard',
      motion: 'static',
      renderer: 'canvas-spatial',
    },
  }),
  profile({
    id: 'monochrome',
    order: 4,
    kind: 'scenario',
    category: 'scenario',
    label: 'Monochrome display',
    compactLabel: 'Monochrome',
    summary: 'A colorless display using contrast, outlines, and ordered gray ramps.',
    capabilities: ['reduced-effects'],
    environment: { width: 640, height: 400, monochromeBits: 8 },
    presentation: {
      width: 640,
      height: 400,
      shape: 'rectangle',
      display: 'monochrome',
      input: 'fine',
      motion: 'reduced',
      renderer: 'canvas-spatial',
    },
  }),
  profile({
    id: 'dot-matrix',
    order: 5,
    kind: 'scenario',
    category: 'scenario',
    label: 'Dot matrix or grid display',
    compactLabel: 'Dot matrix',
    summary: 'A low-resolution grid display with pixelated, static, high-contrast output.',
    capabilities: ['zoom-reflow', 'reduced-effects', 'keyboard-switch', 'low-resource'],
    environment: {
      width: 320,
      height: 240,
      pointer: 'none',
      keyboard: true,
      grid: true,
      update: 'none',
      monochromeBits: 1,
    },
    presentation: {
      width: 320,
      height: 240,
      shape: 'rectangle',
      display: 'grid',
      input: 'keyboard',
      motion: 'static',
      renderer: 'canvas-spatial',
    },
  }),
  ...adaptiveCapabilityCatalog.map((entry, index) => {
    const environment = capabilityEnvironment(entry.id);
    return profile({
      id: entry.id,
      order: index + 6,
      kind: 'capability' as const,
      category: entry.category,
      label: entry.id
        .split('-')
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(' '),
      compactLabel: entry.id,
      summary: entry.behavior.join('; '),
      capabilities: [entry.id],
      environment,
      presentation: {
        width: environment.width ?? 640,
        height: environment.height ?? 400,
        shape:
          entry.id === 'cutout-round'
            ? ('round' as const)
            : entry.id === 'foldable-dual'
              ? ('dual' as const)
              : entry.id === 'print-paged'
                ? ('paged' as const)
                : entry.id === 'screenreader-braille' || entry.id === 'no-script'
                  ? ('nonvisual' as const)
                  : ('rectangle' as const),
        display: entry.id === 'forced-colors' ? ('high-contrast' as const) : ('color' as const),
        input:
          entry.id === 'coarse-touch'
            ? ('coarse' as const)
            : entry.id === 'tv-remote'
              ? ('remote' as const)
              : entry.id === 'screenreader-braille'
                ? ('nonvisual' as const)
                : entry.id === 'keyboard-switch'
                  ? ('keyboard' as const)
                  : ('fine' as const),
        motion:
          entry.id === 'reduced-effects'
            ? ('reduced' as const)
            : entry.id === 'print-paged' || entry.id === 'no-script'
              ? ('static' as const)
              : ('full' as const),
        renderer:
          entry.id === 'no-script' ? ('static-fallback' as const) : ('canvas-spatial' as const),
      },
    });
  }),
] as const satisfies readonly AdaptiveProfileDefinition[]);

export type AdaptiveProfileId = (typeof adaptiveProfileCatalog)[number]['id'];

export interface AdaptiveOptions {
  readonly enabled?: boolean;
  /** Auto-detect by capabilities, or provide an exact reproducible capability set. */
  readonly profiles?: 'auto' | AdaptiveProfileId | readonly AdaptiveProfileId[];
  readonly largeDataNavigation?: boolean;
  readonly largeDataThreshold?: number;
  readonly layout?: boolean;
  readonly colorAdaptation?: boolean;
  /** Runtime-only overrides used by embedded hosts and deterministic examples. */
  readonly environment?: Partial<AdaptiveEnvironment>;
}

export interface NormalizedAdaptiveOptions {
  readonly enabled: boolean;
  readonly profiles: 'auto' | readonly AdaptiveProfileId[];
  readonly largeDataNavigation: boolean;
  readonly largeDataThreshold: number;
  readonly layout: boolean;
  readonly colorAdaptation: boolean;
  readonly environment: Partial<AdaptiveEnvironment>;
}

export interface AdaptiveState {
  readonly version: typeof adaptiveContractVersion;
  readonly enabled: boolean;
  readonly profiles: readonly AdaptiveProfileId[];
  readonly capabilities: readonly AdaptiveCapabilityId[];
  readonly viewport: AdaptiveViewportClass;
  readonly display: AdaptiveDisplayClass;
  readonly input: AdaptiveInputClass;
  readonly motion: AdaptiveMotionClass;
  readonly resources: AdaptiveResourceClass;
  readonly rowCount: number;
  readonly largeData: boolean;
  readonly layout: {
    readonly reflow: boolean;
    readonly axisTickSpacing: number;
    readonly axisLabelMaxLength: number;
    readonly legend: 'preserve' | 'bottom-flow';
    readonly controlTarget: number;
    readonly safeArea: AdaptiveSafeAreaInsets;
  };
  readonly rendering: {
    readonly colorAdaptation: boolean;
    readonly pixelRatioCap: number;
    readonly imageRendering: 'auto' | 'pixelated';
    readonly filter: string;
  };
  readonly interaction: {
    readonly inspectionZoom: boolean;
    readonly maxZoom: number;
    readonly wheel: 'modifier';
    readonly drag: true;
    readonly pinch: true;
    readonly keyboard: true;
  };
  readonly accessibility: {
    readonly tableRecommended: boolean;
    readonly staticFallbackRequired: boolean;
  };
}

export const adaptiveMediaQueries = Object.freeze([
  '(forced-colors: active)',
  '(prefers-contrast: more)',
  '(prefers-reduced-motion: reduce)',
  '(prefers-reduced-transparency: reduce)',
  '(prefers-reduced-data: reduce)',
  '(pointer: coarse)',
  '(pointer: none)',
  '(hover: hover)',
  '(update: slow)',
  '(update: none)',
  '(monochrome)',
  '(grid: 1)',
  '(overflow-block: paged)',
  '(scripting: none)',
  '(scripting: initial-only)',
  '(shape: round)',
  '(horizontal-viewport-segments: 2)',
  '(vertical-viewport-segments: 2)',
  'print',
] as const);

const zeroSafeArea = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

function finiteAtLeast(value: number | undefined, minimum: number, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? Math.max(minimum, value) : fallback;
}

export function createAdaptiveEnvironment(input: AdaptiveEnvironmentInput): AdaptiveEnvironment {
  const safeArea = input.safeArea ?? zeroSafeArea;
  return Object.freeze({
    width: finiteAtLeast(input.width, 1, 640),
    height: finiteAtLeast(input.height, 1, 400),
    rowCount: Math.round(finiteAtLeast(input.rowCount, 0, 0)),
    pixelRatio: finiteAtLeast(input.pixelRatio, 0.25, 1),
    zoom: finiteAtLeast(input.zoom, 0.25, 1),
    pointer: input.pointer ?? 'fine',
    hover: input.hover ?? true,
    keyboard: input.keyboard ?? true,
    switchControl: input.switchControl ?? false,
    remoteControl: input.remoteControl ?? false,
    update: input.update ?? 'fast',
    monochromeBits: Math.round(finiteAtLeast(input.monochromeBits, 0, 0)),
    grid: input.grid ?? false,
    viewportSegments: Math.round(finiteAtLeast(input.viewportSegments, 1, 1)),
    forcedColors: input.forcedColors ?? false,
    contrast: input.contrast ?? 'normal',
    reducedMotion: input.reducedMotion ?? false,
    reducedTransparency: input.reducedTransparency ?? false,
    reducedData: input.reducedData ?? false,
    scripting: input.scripting ?? 'enabled',
    media: input.media ?? 'screen',
    paged: input.paged ?? false,
    direction: input.direction ?? 'ltr',
    writingMode: input.writingMode ?? 'horizontal-tb',
    ...(input.deviceMemoryGB === undefined
      ? {}
      : { deviceMemoryGB: finiteAtLeast(input.deviceMemoryGB, 0, 0) }),
    ...(input.hardwareConcurrency === undefined
      ? {}
      : { hardwareConcurrency: Math.round(finiteAtLeast(input.hardwareConcurrency, 0, 0)) }),
    saveData: input.saveData ?? false,
    screenReader: input.screenReader ?? false,
    braille: input.braille ?? false,
    spatialXR: input.spatialXR ?? false,
    roundDisplay: input.roundDisplay ?? false,
    safeArea: Object.freeze({
      top: finiteAtLeast(safeArea.top, 0, 0),
      right: finiteAtLeast(safeArea.right, 0, 0),
      bottom: finiteAtLeast(safeArea.bottom, 0, 0),
      left: finiteAtLeast(safeArea.left, 0, 0),
    }),
    virtualKeyboardInset: finiteAtLeast(input.virtualKeyboardInset, 0, 0),
    projection: input.projection ?? false,
  });
}

function normalizedMedia(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

function mediaMatches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    const result = window.matchMedia(query);
    // Deterministic DOM test doubles often return one MediaQueryList for every
    // query. Ignore such a result when it explicitly names a different query.
    return (
      result.matches &&
      (result.media === '' || normalizedMedia(result.media) === normalizedMedia(query))
    );
  } catch {
    return false;
  }
}

interface NavigatorRuntimeHints {
  readonly deviceMemory?: number;
  readonly hardwareConcurrency?: number;
  readonly connection?: { readonly saveData?: boolean };
  readonly virtualKeyboard?: { readonly boundingRect?: { readonly height?: number } };
}

export function detectBrowserAdaptiveEnvironment(
  input: Pick<AdaptiveEnvironment, 'width' | 'height'> &
    Partial<Pick<AdaptiveEnvironment, 'rowCount' | 'direction' | 'writingMode'>>,
  overrides: Partial<AdaptiveEnvironment> = {},
): AdaptiveEnvironment {
  const runtimeNavigator =
    typeof navigator === 'undefined' ? undefined : (navigator as NavigatorRuntimeHints);
  const update = mediaMatches('(update: none)')
    ? 'none'
    : mediaMatches('(update: slow)')
      ? 'slow'
      : 'fast';
  const pointer = mediaMatches('(pointer: none)')
    ? 'none'
    : mediaMatches('(pointer: coarse)')
      ? 'coarse'
      : 'fine';
  const visualViewportHeight =
    typeof window === 'undefined' ? undefined : window.visualViewport?.height;
  const virtualKeyboardInset = Math.max(
    0,
    runtimeNavigator?.virtualKeyboard?.boundingRect?.height ?? 0,
    typeof window === 'undefined' || visualViewportHeight === undefined
      ? 0
      : window.innerHeight - visualViewportHeight,
  );
  return createAdaptiveEnvironment({
    ...input,
    pixelRatio: typeof window === 'undefined' ? 1 : (window.devicePixelRatio ?? 1),
    pointer,
    hover: mediaMatches('(hover: hover)'),
    update,
    monochromeBits: mediaMatches('(monochrome)') ? 1 : 0,
    grid: mediaMatches('(grid: 1)'),
    viewportSegments:
      mediaMatches('(horizontal-viewport-segments: 2)') ||
      mediaMatches('(vertical-viewport-segments: 2)')
        ? 2
        : 1,
    forcedColors: mediaMatches('(forced-colors: active)'),
    contrast: mediaMatches('(prefers-contrast: more)') ? 'more' : 'normal',
    reducedMotion: mediaMatches('(prefers-reduced-motion: reduce)'),
    reducedTransparency: mediaMatches('(prefers-reduced-transparency: reduce)'),
    reducedData: mediaMatches('(prefers-reduced-data: reduce)'),
    scripting: mediaMatches('(scripting: none)')
      ? 'none'
      : mediaMatches('(scripting: initial-only)')
        ? 'initial-only'
        : 'enabled',
    media: mediaMatches('print') ? 'print' : 'screen',
    paged: mediaMatches('(overflow-block: paged)'),
    ...(runtimeNavigator?.deviceMemory === undefined
      ? {}
      : { deviceMemoryGB: runtimeNavigator.deviceMemory }),
    ...(runtimeNavigator?.hardwareConcurrency === undefined
      ? {}
      : { hardwareConcurrency: runtimeNavigator.hardwareConcurrency }),
    saveData: runtimeNavigator?.connection?.saveData ?? false,
    roundDisplay: mediaMatches('(shape: round)'),
    virtualKeyboardInset,
    ...overrides,
  });
}

function normalizeProfiles(
  input: AdaptiveOptions['profiles'],
): 'auto' | readonly AdaptiveProfileId[] {
  if (input === undefined || input === 'auto') return 'auto';
  const values = typeof input === 'string' ? [input] : [...input];
  const known = new Set<string>(adaptiveProfileCatalog.map(({ id }) => id));
  for (const id of values) {
    if (!known.has(id)) throw new RangeError(`Unknown adaptive capability "${id}".`);
  }
  return Object.freeze(
    adaptiveProfileCatalog.flatMap(({ id }) =>
      new Set<AdaptiveProfileId>(values).has(id) ? [id] : [],
    ),
  );
}

export function normalizeAdaptiveOptions(
  input: boolean | AdaptiveOptions | undefined,
): NormalizedAdaptiveOptions {
  const options = typeof input === 'object' ? input : {};
  const threshold = options.largeDataThreshold ?? 50_000;
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 10_000_000) {
    throw new RangeError('Adaptive largeDataThreshold must be an integer from 1 to 10,000,000.');
  }
  const environment = options.environment ?? {};
  return Object.freeze({
    enabled: input !== false && options.enabled !== false,
    profiles: normalizeProfiles(options.profiles),
    largeDataNavigation: options.largeDataNavigation ?? true,
    largeDataThreshold: threshold,
    layout: options.layout ?? true,
    colorAdaptation: options.colorAdaptation ?? true,
    environment: Object.freeze({
      ...environment,
      ...(environment.safeArea === undefined
        ? {}
        : { safeArea: Object.freeze({ ...environment.safeArea }) }),
    }),
  });
}

function detectedCapabilities(environment: AdaptiveEnvironment): Set<AdaptiveCapabilityId> {
  const result = new Set<AdaptiveCapabilityId>();
  const aspectRatio = environment.width / Math.max(1, environment.height);
  const safeArea = Object.values(environment.safeArea).some((value) => value > 0);
  if (environment.width <= 560 || environment.zoom >= 2 || environment.grid)
    result.add('zoom-reflow');
  if (environment.viewportSegments > 1) result.add('foldable-dual');
  if (
    environment.remoteControl ||
    (environment.width >= 1_280 && environment.pointer === 'none' && !environment.hover)
  )
    result.add('tv-remote');
  if (environment.media === 'print' || environment.paged) result.add('print-paged');
  if (environment.forcedColors || environment.contrast === 'more') result.add('forced-colors');
  if (
    environment.reducedMotion ||
    environment.reducedTransparency ||
    environment.update !== 'fast' ||
    environment.monochromeBits > 0
  )
    result.add('reduced-effects');
  if (environment.pointer === 'coarse') result.add('coarse-touch');
  if (environment.switchControl || (environment.keyboard && environment.pointer === 'none'))
    result.add('keyboard-switch');
  if (
    environment.saveData ||
    environment.reducedData ||
    environment.grid ||
    environment.update === 'none' ||
    (environment.deviceMemoryGB !== undefined && environment.deviceMemoryGB <= 2) ||
    (environment.hardwareConcurrency !== undefined && environment.hardwareConcurrency <= 2)
  )
    result.add('low-resource');
  if (environment.direction === 'rtl') result.add('rtl');
  if (environment.writingMode !== 'horizontal-tb') result.add('vertical-writing');
  if (environment.projection || aspectRatio >= 2.3) result.add('ultrawide-projection');
  if (environment.screenReader || environment.braille) result.add('screenreader-braille');
  if (environment.scripting !== 'enabled') result.add('no-script');
  if (environment.spatialXR) result.add('spatial-xr');
  if (environment.roundDisplay || safeArea) result.add('cutout-round');
  if (environment.virtualKeyboardInset > 0) result.add('virtual-keyboard');
  return result;
}

function viewportClass(width: number): AdaptiveViewportClass {
  if (width <= 220) return 'micro';
  if (width <= 360) return 'narrow';
  if (width <= 720) return 'compact';
  return 'wide';
}

function displayClass(environment: AdaptiveEnvironment): AdaptiveDisplayClass {
  if (environment.forcedColors || environment.contrast === 'more') return 'high-contrast';
  if (environment.grid) return 'grid';
  if (environment.monochromeBits > 0 && environment.update !== 'fast') return 'e-ink';
  if (environment.monochromeBits > 0) return 'monochrome';
  return 'color';
}

function inputClass(environment: AdaptiveEnvironment): AdaptiveInputClass {
  if (environment.screenReader || environment.braille) return 'nonvisual';
  if (environment.remoteControl) return 'remote';
  if (environment.pointer === 'coarse') return 'coarse';
  if (environment.pointer === 'none' && environment.keyboard) return 'keyboard';
  return 'fine';
}

export function resolveAdaptiveProfile(
  input: AdaptiveEnvironmentInput,
  optionsInput: boolean | AdaptiveOptions | NormalizedAdaptiveOptions | undefined = undefined,
): AdaptiveState {
  const options =
    typeof optionsInput === 'object' &&
    'largeDataThreshold' in optionsInput &&
    'profiles' in optionsInput &&
    'environment' in optionsInput &&
    'enabled' in optionsInput
      ? (optionsInput as NormalizedAdaptiveOptions)
      : normalizeAdaptiveOptions(optionsInput as boolean | AdaptiveOptions | undefined);
  const selectedDefinitions =
    options.profiles === 'auto'
      ? []
      : adaptiveProfileCatalog.filter(({ id }) => options.profiles.includes(id));
  const profileEnvironment = Object.assign(
    {},
    ...selectedDefinitions.map(({ environment }) => environment),
  );
  const environment = createAdaptiveEnvironment({
    ...input,
    ...profileEnvironment,
    width: input.width,
    height: input.height,
    ...(input.rowCount === undefined ? {} : { rowCount: input.rowCount }),
    ...options.environment,
  });
  const capabilities = options.enabled
    ? options.profiles === 'auto'
      ? detectedCapabilities(environment)
      : new Set(selectedDefinitions.flatMap(({ capabilities: values }) => values))
    : new Set<AdaptiveCapabilityId>();
  const orderedCapabilities = adaptiveCapabilityCatalog.flatMap(({ id }) =>
    capabilities.has(id) ? [id] : [],
  );
  const profiles = options.enabled
    ? options.profiles === 'auto'
      ? adaptiveProfileCatalog.flatMap(({ id, kind, capabilities: values }) =>
          kind === 'capability' && values.every((id) => capabilities.has(id)) ? [id] : [],
        )
      : [...options.profiles]
    : [];
  const viewport = viewportClass(environment.width);
  const display = displayClass(environment);
  const inputClassValue = inputClass(environment);
  const motion: AdaptiveMotionClass = !options.enabled
    ? 'full'
    : environment.update === 'none' || capabilities.has('print-paged')
      ? 'static'
      : capabilities.has('reduced-effects')
        ? 'reduced'
        : 'full';
  const resources: AdaptiveResourceClass = capabilities.has('low-resource')
    ? 'constrained'
    : 'standard';
  const largeData = environment.rowCount >= options.largeDataThreshold;
  const reflow =
    options.enabled &&
    options.layout &&
    (capabilities.has('zoom-reflow') ||
      capabilities.has('foldable-dual') ||
      capabilities.has('cutout-round') ||
      capabilities.has('virtual-keyboard'));
  const axisTickSpacing =
    viewport === 'micro' ? 56 : viewport === 'narrow' ? 44 : viewport === 'compact' ? 32 : 24;
  const axisLabelMaxLength =
    viewport === 'micro' ? 6 : viewport === 'narrow' ? 10 : viewport === 'compact' ? 16 : 24;
  const controlTarget =
    inputClassValue === 'coarse' || inputClassValue === 'remote' || inputClassValue === 'keyboard'
      ? 44
      : viewport === 'micro'
        ? 36
        : 28;
  const pixelRatioCap = !options.enabled
    ? 3
    : display === 'grid' || display === 'e-ink' || resources === 'constrained'
      ? 1
      : viewport === 'micro'
        ? 2
        : 3;
  const filter =
    !options.enabled || !options.colorAdaptation
      ? ''
      : display === 'grid'
        ? 'grayscale(1) contrast(2)'
        : display === 'e-ink'
          ? 'grayscale(1) contrast(1.35)'
          : display === 'monochrome'
            ? 'grayscale(1) contrast(1.2)'
            : display === 'high-contrast'
              ? 'contrast(1.35)'
              : '';
  const inspectionZoom =
    options.enabled &&
    ((options.largeDataNavigation && largeData) ||
      capabilities.has('zoom-reflow') ||
      capabilities.has('cutout-round'));
  const tableRecommended =
    capabilities.has('screenreader-braille') ||
    capabilities.has('print-paged') ||
    capabilities.has('no-script');
  return Object.freeze({
    version: adaptiveContractVersion,
    enabled: options.enabled,
    profiles: Object.freeze(profiles),
    capabilities: Object.freeze(orderedCapabilities),
    viewport,
    display,
    input: inputClassValue,
    motion,
    resources,
    rowCount: environment.rowCount,
    largeData,
    layout: Object.freeze({
      reflow,
      axisTickSpacing,
      axisLabelMaxLength,
      legend: reflow && viewport !== 'wide' ? 'bottom-flow' : 'preserve',
      controlTarget,
      safeArea: Object.freeze({ ...environment.safeArea }),
    }),
    rendering: Object.freeze({
      colorAdaptation: options.enabled && options.colorAdaptation,
      pixelRatioCap,
      imageRendering: options.enabled && display === 'grid' ? 'pixelated' : 'auto',
      filter,
    }),
    interaction: Object.freeze({
      inspectionZoom,
      maxZoom: 6,
      wheel: 'modifier',
      drag: true,
      pinch: true,
      keyboard: true,
    }),
    accessibility: Object.freeze({
      tableRecommended,
      staticFallbackRequired: capabilities.has('no-script'),
    }),
  });
}

function inputRowCount(data: DataInput | undefined): number {
  if (data === undefined) return 0;
  if (Array.isArray(data)) return data.length;
  const columnar = data as Exclude<DataInput, readonly unknown[]>;
  if (
    typeof columnar.length === 'number' &&
    Number.isInteger(columnar.length) &&
    columnar.length >= 0
  )
    return columnar.length;
  const lengths = Object.values(columnar.columns).map(({ length }) => length);
  return lengths.length === 0 ? 0 : Math.min(...lengths);
}

/** Fast source-size estimate used before the first potentially expensive compile. */
export function estimateSpecRowCount(spec: ChartSpec): number {
  let total = inputRowCount(spec.data);
  for (const layer of spec.layers ?? []) total += inputRowCount(layer.data);
  for (const child of [
    ...(spec.layer ?? []),
    ...(spec.hconcat ?? []),
    ...(spec.vconcat ?? []),
    ...(spec.concat ?? []),
  ])
    total += estimateSpecRowCount(child);
  if (spec.spec !== undefined) total += estimateSpecRowCount(spec.spec);
  if (spec.inset !== undefined) {
    total += estimateSpecRowCount(spec.inset.base) + estimateSpecRowCount(spec.inset.view);
  }
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, total));
}

function mergeAxisBooleanObject<T extends object>(
  input: boolean | T | undefined,
  defaults: T,
): boolean | T {
  if (input === false) return false;
  if (input === true || input === undefined) return { ...defaults };
  return { ...defaults, ...input };
}

function adaptiveAxis(
  input: AxisSpec | false | undefined,
  state: AdaptiveState,
  channel: 'x' | 'y',
): AxisSpec | false {
  if (input === false) return false;
  const axis = input ?? {};
  const ticks = mergeAxisBooleanObject<AxisTickSpec>(axis.ticks, {
    spacing: state.layout.axisTickSpacing,
  });
  const labels = mergeAxisBooleanObject<AxisLabelSpec>(axis.labels, {
    orientation: 'auto',
    maxLength:
      channel === 'x' ? state.layout.axisLabelMaxLength : state.layout.axisLabelMaxLength + 4,
  });
  return { ...axis, ticks, labels };
}

function adaptiveLegend(input: ChartSpec['legend'], state: AdaptiveState): ChartSpec['legend'] {
  if (state.layout.legend !== 'bottom-flow' || input === undefined || input === false) return input;
  const legend: LegendSpec = input === true ? {} : input;
  if (legend.position !== undefined) return input;
  return {
    ...legend,
    position: 'bottom',
    orientation:
      legend.orientation === undefined || legend.orientation === 'auto'
        ? 'horizontal'
        : legend.orientation,
  };
}

const grayscalePalette = [
  '#000000',
  '#2b2b2b',
  '#555555',
  '#777777',
  '#999999',
  '#bbbbbb',
  '#dddddd',
  '#4a4a4a',
] as const;

/** Apply display capability colors without mutating or registering the authored theme. */
export function adaptiveTheme(
  input: ChartSpec['theme'],
  state: AdaptiveState,
): NonNullable<ChartSpec['theme']> {
  const base =
    typeof input === 'object'
      ? input
      : { extends: input ?? 'graflume-light', name: `adaptive:${input ?? 'graflume-light'}` };
  const reducedMotion = state.motion !== 'full';
  const adaptColor = state.rendering.colorAdaptation && state.display !== 'color';
  if (!adaptColor && !reducedMotion) return input ?? 'graflume-light';
  const priorColors = typeof base === 'object' ? (base.colors ?? {}) : {};
  const priorAxis = typeof base === 'object' ? (base.axis ?? {}) : {};
  const priorMark = typeof base === 'object' ? (base.mark ?? {}) : {};
  if (!adaptColor) {
    return {
      ...base,
      name: 'adaptive:motion',
      motion: { duration: 0, easing: 'linear' as const },
    };
  }
  const colors = {
    ...priorColors,
    background: '#ffffff',
    surface: '#ffffff',
    panel: '#ffffff',
    text: '#000000',
    mutedText: '#202020',
    subtitle: '#000000',
    axisTitle: '#000000',
    axis: '#000000',
    grid: state.display === 'grid' ? '#000000' : '#8a8a8a',
    minorGrid: '#bcbcbc',
    focus: '#000000',
    palette: grayscalePalette,
    paletteMode: 'fixed' as const,
    continuousInterpolation: state.display === 'grid' ? ('step' as const) : ('rgb' as const),
    sequential: ['#ffffff', '#d9d9d9', '#a6a6a6', '#595959', '#000000'],
    diverging: ['#000000', '#737373', '#ffffff', '#bdbdbd', '#404040'],
  };
  return {
    ...base,
    name: `adaptive:${state.display}`,
    colors,
    axis: {
      ...priorAxis,
      lineWidth: Math.max(1, priorAxis.lineWidth ?? 1),
      gridLineWidth: Math.max(1, priorAxis.gridLineWidth ?? 1),
    },
    mark: {
      ...priorMark,
      lineWidth: Math.max(2, priorMark.lineWidth ?? 2),
      pointStroke: '#000000',
      pointStrokeWidth: Math.max(1, priorMark.pointStrokeWidth ?? 1),
      barStroke: '#000000',
      barStrokeWidth: Math.max(1, priorMark.barStrokeWidth ?? 1),
      pieStroke: '#000000',
      pieStrokeWidth: Math.max(1, priorMark.pieStrokeWidth ?? 1),
    },
    ...(reducedMotion ? { motion: { duration: 0, easing: 'linear' as const } } : {}),
  };
}

function adaptiveControls(
  input: InteractionSpec['controls'],
  navigation: boolean,
): InteractionSpec['controls'] {
  if (!navigation || input === false || input === true) return input;
  const controls: ControlsSpec = input ?? {};
  return {
    ...controls,
    zoom: controls.zoom ?? true,
    reset: controls.reset ?? true,
  };
}

function adaptivePlayback(
  input: InteractionSpec['playback'],
  state: AdaptiveState,
): InteractionSpec['playback'] {
  if (input === undefined || input === false || state.motion === 'full') return input;
  const playback: PlaybackSpec = input;
  return { ...playback, autoplay: false, transition: false };
}

function adaptiveAccessibility(
  input: ChartSpec['accessibility'],
  state: AdaptiveState,
): ChartSpec['accessibility'] {
  if (!state.accessibility.tableRecommended) return input;
  const accessibility: AccessibilitySpec = input ?? {};
  return {
    ...accessibility,
    table: accessibility.table ?? 'visible',
    navigation: accessibility.navigation ?? true,
    explorer: accessibility.explorer ?? true,
  };
}

/**
 * Produce an ephemeral runtime spec. The authored ChartSpec returned by
 * Chart#getSpec remains byte-for-byte untouched.
 */
export function adaptChartSpec(spec: ChartSpec, state: AdaptiveState): ChartSpec {
  if (!state.enabled) return spec;
  const interaction: InteractionSpec = spec.interaction ?? {};
  const domainNavigationEnabled =
    interaction.domainNavigation !== undefined && interaction.domainNavigation !== false;
  const analyticSelection =
    typeof interaction.selection === 'object' &&
    (interaction.selection.kind ?? 'point') !== 'point';
  const markLabelAuthoring =
    typeof spec.markLabels === 'object' &&
    spec.markLabels.authoring !== undefined &&
    spec.markLabels.authoring !== false;
  const enableNavigation =
    state.interaction.inspectionZoom &&
    interaction.navigation === undefined &&
    !domainNavigationEnabled &&
    !analyticSelection &&
    !markLabelAuthoring;
  const navigation = enableNavigation
    ? {
        minZoom: 1,
        maxZoom: state.interaction.maxZoom,
        wheel: state.interaction.wheel,
        drag: state.interaction.drag,
        pinch: state.interaction.pinch,
        keyboard: state.interaction.keyboard,
      }
    : interaction.navigation;
  const axes = state.layout.reflow
    ? Object.fromEntries(
        [...new Set(['x', 'x2', 'y', 'y2', ...Object.keys(spec.axes ?? {})])].map((id) => {
          const authored = spec.axes?.[id];
          const channel =
            (authored !== false ? authored?.channel : undefined) ??
            (id === 'x' || id === 'x2' ? 'x' : 'y');
          return [id, adaptiveAxis(authored, state, channel)] as const;
        }),
      )
    : spec.axes;
  const controls = adaptiveControls(
    interaction.controls,
    navigation !== undefined && navigation !== false,
  );
  const playback = adaptivePlayback(interaction.playback, state);
  const legend = adaptiveLegend(spec.legend, state);
  const accessibility = adaptiveAccessibility(spec.accessibility, state);
  const includeInteraction =
    spec.interaction !== undefined ||
    navigation !== undefined ||
    controls !== undefined ||
    playback !== undefined;
  const safe = state.layout.safeArea;
  const compactPadding =
    spec.padding !== undefined || !state.layout.reflow
      ? spec.padding
      : state.viewport === 'micro'
        ? {
            top: Math.max(12, safe.top),
            right: Math.max(8, safe.right),
            bottom: Math.max(42, safe.bottom),
            left: Math.max(42, safe.left),
          }
        : {
            top: Math.max(16, safe.top),
            right: Math.max(12, safe.right),
            bottom: Math.max(48, safe.bottom),
            left: Math.max(48, safe.left),
          };
  return {
    ...spec,
    ...(compactPadding === undefined ? {} : { padding: compactPadding }),
    ...(axes === undefined ? {} : { axes }),
    ...(legend === undefined ? {} : { legend }),
    theme: adaptiveTheme(spec.theme, state),
    ...(includeInteraction
      ? {
          interaction: {
            ...interaction,
            ...(navigation === undefined ? {} : { navigation }),
            ...(controls === undefined ? {} : { controls }),
            ...(playback === undefined ? {} : { playback }),
          },
        }
      : {}),
    ...(accessibility === undefined ? {} : { accessibility }),
  };
}

export function adaptiveStateSignature(state: AdaptiveState): string {
  return JSON.stringify([
    state.enabled,
    state.profiles,
    state.capabilities,
    state.viewport,
    state.display,
    state.input,
    state.motion,
    state.resources,
    state.largeData,
    state.layout,
    state.rendering,
    state.interaction,
    state.accessibility,
  ]);
}

/** Synchronize observable host metadata and non-semantic output-device hints. */
export function applyAdaptiveSurface(
  host: HTMLElement,
  surface: HTMLElement | null,
  state: AdaptiveState,
): void {
  host.dataset.graflumeAdaptive = state.enabled ? adaptiveContractVersion : 'off';
  host.dataset.graflumeAdaptiveProfiles = state.profiles.join(' ');
  host.dataset.graflumeAdaptiveCapabilities = state.capabilities.join(' ');
  host.dataset.graflumeAdaptiveViewport = state.enabled ? state.viewport : 'off';
  host.dataset.graflumeAdaptiveDisplay = state.enabled ? state.display : 'off';
  host.dataset.graflumeAdaptiveInput = state.enabled ? state.input : 'off';
  host.dataset.graflumeAdaptiveMotion = state.enabled ? state.motion : 'off';
  host.dataset.graflumeAdaptiveResources = state.enabled ? state.resources : 'off';
  host.dataset.graflumeAdaptiveLargeData = String(state.enabled && state.largeData);
  host.style.setProperty?.('--graflume-control-target', `${state.layout.controlTarget}px`);
  if (surface !== null) {
    surface.style.filter = state.rendering.filter;
    surface.style.imageRendering = state.rendering.imageRendering;
  }
}

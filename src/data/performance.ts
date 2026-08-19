import type { PerformanceProfile } from '../spec/types.js';

export interface PerformanceSettings {
  readonly profile: Exclude<PerformanceProfile, 'auto'>;
  readonly maxLinePoints: number;
  readonly maxPointMarks: number;
  readonly maxBarMarks: number;
  readonly enableHitTesting: boolean;
  readonly enableAnimation: boolean;
}

const SETTINGS: Readonly<Record<Exclude<PerformanceProfile, 'auto'>, PerformanceSettings>> = {
  standard: {
    profile: 'standard',
    maxLinePoints: 100_000,
    maxPointMarks: 25_000,
    maxBarMarks: 25_000,
    enableHitTesting: true,
    enableAnimation: true,
  },
  large: {
    profile: 'large',
    maxLinePoints: 30_000,
    maxPointMarks: 20_000,
    maxBarMarks: 12_000,
    enableHitTesting: false,
    enableAnimation: false,
  },
  ultra: {
    profile: 'ultra',
    maxLinePoints: 8_000,
    maxPointMarks: 8_000,
    maxBarMarks: 5_000,
    enableHitTesting: false,
    enableAnimation: false,
  },
};

export function resolvePerformanceSettings(
  preference: PerformanceProfile,
  rowCount: number,
  viewportWidth: number,
): PerformanceSettings {
  const profile =
    preference === 'auto'
      ? rowCount < 50_000
        ? 'standard'
        : rowCount < 1_000_000
          ? 'large'
          : 'ultra'
      : preference;
  const base = SETTINGS[profile];
  if (profile === 'standard') return base;
  const pointsPerPixel = profile === 'ultra' ? 2 : 4;
  const minimum = profile === 'ultra' ? 2_000 : 10_000;
  const pixelAwareLineLimit = Math.max(minimum, Math.round(viewportWidth * pointsPerPixel));
  return {
    ...base,
    maxLinePoints: Math.min(base.maxLinePoints, pixelAwareLineLimit),
  };
}

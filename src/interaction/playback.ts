import { DataTable } from '../data/table.js';
import { GraflumeError } from '../core/errors.js';
import type {
  ChartSpec,
  DataInput,
  DataRow,
  DataValue,
  MarkInput,
  NormalizedPlaybackSpec,
  PlaybackFrameReference,
} from '../spec/types.js';

export interface ResolvedPlaybackNamedFrame {
  readonly name: string;
  readonly value: string | number | boolean;
  readonly index: number;
}

export interface ResolvedPlaybackRange {
  readonly start: number;
  readonly end: number;
}

export interface ResolvedPlaybackTimeline {
  readonly namedFrames: readonly ResolvedPlaybackNamedFrame[];
  readonly range: ResolvedPlaybackRange;
}

export function playbackFrameKey(value: DataValue): string {
  if (value instanceof Date) return `date:${value.getTime()}`;
  return `${typeof value}:${String(value)}`;
}

function markType(mark: MarkInput | undefined): string | undefined {
  return typeof mark === 'string' ? mark : mark?.type;
}

function tableRows(input: DataInput): readonly DataRow[] {
  if (Array.isArray(input)) return input;
  const table = DataTable.from(input);
  return Array.from({ length: table.length }, (_, index) => table.row(index));
}

function matchingLayer(requestedLayerId: string | undefined, layerId: string): boolean {
  return requestedLayerId === undefined || requestedLayerId === layerId;
}

export function collectPlaybackFrames(
  spec: ChartSpec,
  playback: NormalizedPlaybackSpec,
): readonly DataValue[] {
  const frames = new Map<string, DataValue>();
  const add = (input: DataInput | undefined): void => {
    if (input === undefined) return;
    const table = DataTable.from(input);
    if (!table.has(playback.field)) return;
    for (let index = 0; index < table.length; index += 1) {
      const value = table.value(index, playback.field);
      if (value === null || value === undefined) continue;
      const key = playbackFrameKey(value);
      if (!frames.has(key)) frames.set(key, value);
    }
  };

  if (spec.layers === undefined) {
    if (matchingLayer(playback.layerId, 'layer-0')) add(spec.data);
  } else {
    spec.layers.forEach((layer, index) => {
      if (matchingLayer(playback.layerId, layer.id ?? `layer-${index}`)) {
        add(layer.data ?? spec.data);
      }
    });
  }
  return [...frames.values()];
}

function resolvedRangeBound(
  reference: PlaybackFrameReference | undefined,
  fallback: number,
  namedFrames: ReadonlyMap<string, ResolvedPlaybackNamedFrame>,
  frameCount: number,
  path: string,
): number {
  if (reference === undefined) return fallback;
  const index = typeof reference === 'string' ? namedFrames.get(reference)?.index : reference;
  if (index === undefined) {
    throw new GraflumeError('INVALID_SPEC', `Unknown playback frame name "${reference}".`, {
      path,
    });
  }
  if (!Number.isInteger(index) || index < 0 || index >= frameCount) {
    throw new GraflumeError(
      'INVALID_SPEC',
      `Playback range index ${String(index)} is outside the available frame range.`,
      { path, details: { frameCount } },
    );
  }
  return index;
}

/** Resolve portable names and inclusive range references against collected frame values. */
export function resolvePlaybackTimeline(
  frames: readonly DataValue[],
  playback: NormalizedPlaybackSpec,
): ResolvedPlaybackTimeline {
  const frameIndices = new Map<string, number>();
  frames.forEach((frame, index) => frameIndices.set(playbackFrameKey(frame), index));
  const namedFrames: ResolvedPlaybackNamedFrame[] = [];
  const names = new Map<string, ResolvedPlaybackNamedFrame>();
  playback.namedFrames.forEach((namedFrame, authoredIndex) => {
    if (names.has(namedFrame.name)) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Duplicate playback frame name "${namedFrame.name}".`,
        {
          path: `$.interaction.playback.namedFrames[${authoredIndex}].name`,
        },
      );
    }
    const index = frameIndices.get(playbackFrameKey(namedFrame.value));
    if (index === undefined) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Named playback frame "${namedFrame.name}" does not match a collected frame value.`,
        {
          path: `$.interaction.playback.namedFrames[${authoredIndex}].value`,
          details: { value: namedFrame.value },
        },
      );
    }
    const resolved = { ...namedFrame, index };
    namedFrames.push(resolved);
    names.set(namedFrame.name, resolved);
  });

  if (frames.length === 0) {
    if (playback.range !== false) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'Playback range cannot be resolved because the selected source has no frames.',
        { path: '$.interaction.playback.range' },
      );
    }
    return { namedFrames, range: { start: 0, end: -1 } };
  }

  const authoredRange = playback.range === false ? {} : playback.range;
  const start = resolvedRangeBound(
    authoredRange.start,
    0,
    names,
    frames.length,
    '$.interaction.playback.range.start',
  );
  const end = resolvedRangeBound(
    authoredRange.end,
    frames.length - 1,
    names,
    frames.length,
    '$.interaction.playback.range.end',
  );
  if (start > end) {
    throw new GraflumeError('INVALID_SPEC', 'Playback range start must not exceed its end.', {
      path: '$.interaction.playback.range',
      details: { start, end },
    });
  }
  return { namedFrames, range: { start, end } };
}

function visibleFrameKeys(
  frames: readonly DataValue[],
  index: number,
  playback: NormalizedPlaybackSpec,
  rangeStart: number,
): ReadonlySet<string> {
  const start =
    playback.mode === 'frame'
      ? index
      : playback.mode === 'window'
        ? Math.max(rangeStart, index - playback.windowSize + 1)
        : rangeStart;
  return new Set(frames.slice(start, index + 1).map(playbackFrameKey));
}

function filterInput(input: DataInput, field: string, visible: ReadonlySet<string>): DataInput {
  return tableRows(input).filter((row) => visible.has(playbackFrameKey(row[field])));
}

function withMotionFrame(mark: MarkInput, field: string, frame: DataValue | undefined): MarkInput {
  const source = typeof mark === 'string' ? { type: mark } : mark;
  const options = { ...source.options } as Record<string, unknown>;
  if (frame === undefined) delete options.frame;
  else options.frame = frame;
  return {
    ...source,
    fields: { ...source.fields, time: field },
    options: options as NonNullable<typeof source.options>,
  };
}

export function playbackSpec(
  base: ChartSpec,
  playback: NormalizedPlaybackSpec,
  frames: readonly DataValue[],
  index: number,
  rangeStart = 0,
): ChartSpec {
  const frame = frames[index];
  if (frame === undefined) return base;
  const visible = visibleFrameKeys(frames, index, playback, rangeStart);

  if (base.layers === undefined) {
    if (!matchingLayer(playback.layerId, 'layer-0') || base.mark === undefined) return base;
    const motion = markType(base.mark) === 'motion';
    const filter = playback.filter || (motion && playback.mode !== 'frame');
    return {
      ...base,
      ...(filter && base.data !== undefined
        ? { data: filterInput(base.data, playback.field, visible) }
        : {}),
      ...(motion
        ? {
            mark: withMotionFrame(
              base.mark,
              playback.field,
              playback.mode === 'frame' ? frame : undefined,
            ),
          }
        : {}),
    };
  }

  return {
    ...base,
    layers: base.layers.map((layer, layerIndex) => {
      const layerId = layer.id ?? `layer-${layerIndex}`;
      if (!matchingLayer(playback.layerId, layerId)) return layer;
      const source = layer.data ?? base.data;
      if (source === undefined || !DataTable.from(source).has(playback.field)) return layer;
      const motion = markType(layer.mark) === 'motion';
      const filter = playback.filter || (motion && playback.mode !== 'frame');
      return {
        ...layer,
        ...(filter ? { data: filterInput(source, playback.field, visible) } : {}),
        ...(motion
          ? {
              mark: withMotionFrame(
                layer.mark,
                playback.field,
                playback.mode === 'frame' ? frame : undefined,
              ),
            }
          : {}),
      };
    }),
  };
}

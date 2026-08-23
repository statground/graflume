import { DataTable } from '../data/table.js';
import type {
  ChartSpec,
  DataInput,
  DataRow,
  DataValue,
  MarkInput,
  NormalizedPlaybackSpec,
} from '../spec/types.js';

function valueKey(value: DataValue): string {
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
      const key = valueKey(value);
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

function visibleFrameKeys(
  frames: readonly DataValue[],
  index: number,
  playback: NormalizedPlaybackSpec,
): ReadonlySet<string> {
  const start =
    playback.mode === 'frame'
      ? index
      : playback.mode === 'window'
        ? Math.max(0, index - playback.windowSize + 1)
        : 0;
  return new Set(frames.slice(start, index + 1).map(valueKey));
}

function filterInput(input: DataInput, field: string, visible: ReadonlySet<string>): DataInput {
  return tableRows(input).filter((row) => visible.has(valueKey(row[field])));
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
): ChartSpec {
  const frame = frames[index];
  if (frame === undefined) return base;
  const visible = visibleFrameKeys(frames, index, playback);

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

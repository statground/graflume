export function strideSampleIndices(length: number, target: number): readonly number[] {
  if (length <= target || target <= 0) return Array.from({ length }, (_, index) => index);
  const step = length / target;
  const indices: number[] = [];
  for (let cursor = 0; cursor < target; cursor += 1) {
    indices.push(Math.min(length - 1, Math.floor(cursor * step)));
  }
  if (indices.at(-1) !== length - 1) indices.push(length - 1);
  return indices;
}

export function minMaxSampleIndices(
  values: ArrayLike<number | null>,
  target: number,
): readonly number[] {
  const length = values.length;
  if (length <= target || target < 4) return strideSampleIndices(length, Math.max(1, target));

  const bucketCount = Math.max(1, Math.floor((target - 2) / 2));
  const bucketSize = (length - 2) / bucketCount;
  const selected = new Set<number>([0, length - 1]);

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.max(1, Math.floor(1 + bucket * bucketSize));
    const end = Math.min(length - 1, Math.ceil(1 + (bucket + 1) * bucketSize));
    let minIndex = -1;
    let maxIndex = -1;
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;

    for (let index = start; index < end; index += 1) {
      const value = values[index];
      if (value === null || value === undefined || !Number.isFinite(value)) continue;
      if (value < minValue) {
        minValue = value;
        minIndex = index;
      }
      if (value > maxValue) {
        maxValue = value;
        maxIndex = index;
      }
    }

    if (minIndex >= 0) selected.add(minIndex);
    if (maxIndex >= 0) selected.add(maxIndex);
  }

  return [...selected].sort((left, right) => left - right);
}

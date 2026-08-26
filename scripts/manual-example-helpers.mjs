function addField(fields, value) {
  if (typeof value === 'string' && value.length > 0) fields.add(value);
}

function fieldsFromMark(fields, mark) {
  if (typeof mark !== 'object' || mark === null || Array.isArray(mark)) return;
  for (const field of Object.values(mark.fields ?? {})) addField(fields, field);
  for (const field of mark.options?.fields ?? []) addField(fields, field);
  for (const field of mark.options?.columns ?? []) addField(fields, field);
  for (const field of mark.options?.dimensions ?? []) addField(fields, field);
}

/** Convert a portable chart spec into the third Quick API argument. */
export function quickOptions(spec) {
  const { data: _data, mark, ...rest } = spec;
  if (spec.layers !== undefined) return rest;
  if (typeof mark === 'object' && mark !== null && !Array.isArray(mark)) {
    const { type: _type, ...markOptions } = mark;
    return Object.keys(markOptions).length > 0 ? { ...rest, mark: markOptions } : rest;
  }
  return rest;
}

/** Keep point geometry visible in the compact Area-family guide examples. */
export function pointEnabledOptions(spec, options) {
  const markType =
    typeof spec.mark === 'object' && spec.mark !== null && !Array.isArray(spec.mark)
      ? spec.mark.type
      : spec.mark;
  if (markType !== 'area' && markType !== 'stepped-area') return options;
  return {
    ...options,
    mark: { ...(options.mark ?? {}), point: true },
  };
}

/** Ordered field names used by the Quick API example and its semantic table. */
export function fieldsForSpec(spec) {
  const fields = new Set();
  addField(fields, spec.x?.field);
  addField(fields, spec.y?.field);
  fieldsFromMark(fields, spec.mark);
  for (const layer of spec.layers ?? []) {
    addField(fields, layer.x?.field);
    addField(fields, layer.y?.field);
    fieldsFromMark(fields, layer.mark);
  }
  return fields;
}

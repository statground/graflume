import type { HitResult } from './hit-test.js';
import type {
  DataValue,
  NormalizedChartSpec,
  NormalizedEncodingSpec,
  NormalizedTooltipFieldSpec,
  TooltipValueFormat,
} from '../spec/types.js';
import { createId } from '../utils/id.js';

export interface TooltipRow {
  readonly field: string;
  readonly label: string;
  readonly value: string;
}

export interface TooltipContent {
  readonly title: string;
  readonly rows: readonly TooltipRow[];
}

const inferredFieldLimit = 8;
const tooltipTextLimit = 240;

function hasOwn(value: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function boundedText(value: unknown, limit = tooltipTextLimit): string {
  const text = String(value);
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1))}…`;
}

function humanizeField(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function inferredFormat(
  field: string,
  layer: NormalizedChartSpec['layers'][number] | undefined,
): TooltipValueFormat {
  const encoding: NormalizedEncodingSpec | undefined =
    layer?.x.field === field ? layer.x : layer?.y.field === field ? layer.y : undefined;
  return encoding?.type === 'temporal' ? 'date' : 'auto';
}

function inferredFields(
  hit: HitResult,
  spec: NormalizedChartSpec,
): readonly NormalizedTooltipFieldSpec[] {
  const layer = spec.layers.find(({ id }) => id === hit.layerId);
  const fields = new Map<string, NormalizedTooltipFieldSpec>();
  const add = (field: unknown, label?: string): void => {
    if (typeof field !== 'string' || field.length === 0 || fields.has(field)) return;
    fields.set(field, {
      field,
      label: label ?? humanizeField(field),
      format: inferredFormat(field, layer),
      prefix: '',
      suffix: '',
    });
  };

  if (layer !== undefined) {
    add(layer.x.field, layer.x.title);
    add(layer.y.field, layer.y.title);
    for (const [channel, field] of Object.entries(layer.mark.fields))
      add(field, humanizeField(channel));
    for (const option of ['fields', 'dimensions', 'columns']) {
      const values = layer.mark.options[option];
      if (Array.isArray(values)) for (const field of values) add(field);
    }
  }
  for (const field of Object.keys(hit.tooltip ?? {})) add(field);
  for (const field of Object.keys(hit.datum)) add(field);
  return [...fields.values()].slice(0, inferredFieldLimit);
}

function finiteFractionDigits(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.max(0, Math.min(6, Math.trunc(value)));
}

function numberFormatter(
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return new Intl.NumberFormat(undefined, options);
  }
}

function dateFormatter(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return new Intl.DateTimeFormat(undefined, options);
  }
}

function dateOnlyValue(value: DataValue): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function formatValue(
  value: DataValue,
  field: NormalizedTooltipFieldSpec,
  locale: string | undefined,
): string {
  if (value === null || value === undefined) return '—';
  const fractionDigits = finiteFractionDigits(field.fractionDigits);
  let formatted: string;

  if (field.format === 'date' || field.format === 'datetime') {
    const dateOnly = field.format === 'date' ? dateOnlyValue(value) : null;
    const date = dateOnly ?? (value instanceof Date ? value : new Date(String(value)));
    formatted = Number.isFinite(date.getTime())
      ? dateFormatter(
          locale,
          field.format === 'datetime'
            ? { dateStyle: 'medium', timeStyle: 'short' }
            : { dateStyle: 'medium', ...(dateOnly === null ? {} : { timeZone: 'UTC' }) },
        ).format(date)
      : String(value);
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    const options: Intl.NumberFormatOptions =
      field.format === 'percent'
        ? {
            style: 'percent',
            maximumFractionDigits: fractionDigits ?? 1,
            ...(fractionDigits === undefined ? {} : { minimumFractionDigits: fractionDigits }),
          }
        : field.format === 'integer'
          ? { maximumFractionDigits: 0 }
          : {
              maximumFractionDigits: fractionDigits ?? 3,
              ...(fractionDigits === undefined ? {} : { minimumFractionDigits: fractionDigits }),
            };
    formatted = numberFormatter(locale, options).format(value);
  } else {
    formatted = value instanceof Date ? value.toISOString() : boundedText(value);
  }
  return boundedText(`${field.prefix}${formatted}${field.suffix}`);
}

function datumValue(hit: HitResult, field: string): DataValue {
  if (hit.tooltip !== undefined) return hit.tooltip[field];
  return hit.datum[field];
}

function hasDatumValue(hit: HitResult, field: string): boolean {
  return hit.tooltip === undefined ? hasOwn(hit.datum, field) : hasOwn(hit.tooltip, field);
}

export function resolveTooltipContent(hit: HitResult, spec: NormalizedChartSpec): TooltipContent {
  const configured = spec.interaction.tooltip;
  if (configured === false) return { title: '', rows: [] };
  const layer = spec.layers.find(({ id }) => id === hit.layerId);
  const fields = configured.fields.length > 0 ? configured.fields : inferredFields(hit, spec);
  const rows = fields
    .filter((field) => hasDatumValue(hit, field.field))
    .map((field) => {
      const format =
        field.format === 'auto' && inferredFormat(field.field, layer) === 'date'
          ? 'date'
          : field.format;
      const resolvedField = format === field.format ? field : { ...field, format };
      return {
        field: field.field,
        label: boundedText(field.label, 80),
        value: formatValue(datumValue(hit, field.field), resolvedField, spec.locale),
      };
    });
  return {
    title: boundedText(
      configured.title ?? spec.title?.text ?? humanizeField(layer?.mark.type ?? 'Datum'),
      120,
    ),
    rows,
  };
}

export class TooltipController {
  readonly #id = createId('graflume-tooltip');
  #element: HTMLDivElement | null = null;
  #surface: HTMLElement | null = null;
  #nodeId = '';

  show(
    content: TooltipContent,
    hit: HitResult,
    sourceEvent: PointerEvent,
    surface: HTMLElement,
    host: HTMLElement,
  ): void {
    this.showAt(content, hit, sourceEvent.clientX, sourceEvent.clientY, surface, host);
  }

  /** Show the same text-only tooltip for keyboard or other non-pointer semantic focus. */
  showAt(
    content: TooltipContent,
    hit: HitResult,
    clientX: number,
    clientY: number,
    surface: HTMLElement,
    host: HTMLElement,
  ): void {
    if (content.rows.length === 0) {
      this.hide();
      return;
    }
    const element = this.#ensureElement(host);
    if (this.#nodeId !== hit.nodeId) {
      this.#nodeId = hit.nodeId;
      this.#renderContent(element, content);
    }
    this.#surface = surface;
    const describedBy = new Set(
      (surface.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
    );
    describedBy.add(this.#id);
    surface.setAttribute('aria-describedby', [...describedBy].join(' '));
    element.hidden = false;
    this.#position(element, host, clientX, clientY);
  }

  hide(): void {
    this.#nodeId = '';
    if (this.#element !== null) this.#element.hidden = true;
    if (this.#surface !== null) {
      const describedBy = (this.#surface.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter((id) => id !== '' && id !== this.#id);
      if (describedBy.length === 0) this.#surface.removeAttribute('aria-describedby');
      else this.#surface.setAttribute('aria-describedby', describedBy.join(' '));
    }
    this.#surface = null;
  }

  destroy(): void {
    this.hide();
    this.#element?.remove();
    this.#element = null;
  }

  #ensureElement(host: HTMLElement): HTMLDivElement {
    if (this.#element !== null) {
      if (this.#element.parentElement !== host) host.append(this.#element);
      return this.#element;
    }
    const element = host.ownerDocument.createElement('div');
    element.id = this.#id;
    element.dataset.graflumeTooltip = 'true';
    element.setAttribute('role', 'tooltip');
    element.setAttribute('dir', 'auto');
    element.hidden = true;
    element.style.cssText =
      'position:absolute;z-index:20;max-width:min(280px,calc(100% - 24px));padding:10px 12px;pointer-events:none;color:var(--graflume-tooltip-color,#f8fafc);background:var(--graflume-tooltip-background,rgba(15,23,42,.96));border:1px solid var(--graflume-tooltip-border,rgba(148,163,184,.35));border-radius:10px;box-shadow:0 12px 30px rgba(15,23,42,.24);font:12px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:normal';
    host.append(element);
    this.#element = element;
    return element;
  }

  #renderContent(element: HTMLDivElement, content: TooltipContent): void {
    const ownerDocument = element.ownerDocument;
    const title = ownerDocument.createElement('div');
    title.textContent = content.title;
    title.style.cssText = 'margin:0 0 6px;font-weight:700;color:#fff';
    const list = ownerDocument.createElement('dl');
    list.style.cssText =
      'display:grid;grid-template-columns:minmax(56px,auto) minmax(0,1fr);gap:3px 12px;margin:0';
    for (const row of content.rows) {
      const term = ownerDocument.createElement('dt');
      term.textContent = row.label;
      term.style.cssText = 'margin:0;color:#cbd5e1';
      const detail = ownerDocument.createElement('dd');
      detail.textContent = row.value;
      detail.style.cssText =
        'margin:0;text-align:end;font-weight:650;color:#fff;overflow-wrap:anywhere';
      list.append(term, detail);
    }
    element.replaceChildren(title, list);
  }

  #position(element: HTMLDivElement, host: HTMLElement, clientX: number, clientY: number): void {
    const margin = 8;
    const offset = 12;
    const hostBounds = host.getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    const localX = clientX - hostBounds.left;
    const localY = clientY - hostBounds.top;
    let left = localX + offset;
    let top = localY + offset;
    if (left + bounds.width + margin > hostBounds.width) left = localX - bounds.width - offset;
    if (top + bounds.height + margin > hostBounds.height) top = localY - bounds.height - offset;
    element.style.left = `${Math.max(margin, Math.min(left, hostBounds.width - bounds.width - margin))}px`;
    element.style.top = `${Math.max(margin, Math.min(top, hostBounds.height - bounds.height - margin))}px`;
  }
}

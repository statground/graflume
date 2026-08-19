/*! Graflume v0.1.0-alpha.0 | https://github.com/statground/graflume */
var Graflume = (function (exports) {
    'use strict';

    function quickChart(createChart, type, target, data, options) {
        const { x, y, mark, create, ...chartOptions } = options;
        return createChart(target, {
            ...chartOptions,
            data,
            mark: { type, ...mark },
            x,
            y,
        }, create);
    }

    const SETTINGS = {
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
    function resolvePerformanceSettings(preference, rowCount, viewportWidth) {
        const profile = preference === 'auto'
            ? rowCount < 50_000
                ? 'standard'
                : rowCount < 1_000_000
                    ? 'large'
                    : 'ultra'
            : preference;
        const base = SETTINGS[profile];
        if (profile === 'standard')
            return base;
        const pointsPerPixel = profile === 'ultra' ? 2 : 4;
        const minimum = profile === 'ultra' ? 2_000 : 10_000;
        const pixelAwareLineLimit = Math.max(minimum, Math.round(viewportWidth * pointsPerPixel));
        return {
            ...base,
            maxLinePoints: Math.min(base.maxLinePoints, pixelAwareLineLimit),
        };
    }

    function nodeBase(id, options = {}) {
        return {
            id,
            zIndex: options.zIndex ?? 0,
            opacity: options.opacity ?? 1,
            visible: options.visible ?? true,
            ...(options.interactive === undefined ? {} : { interactive: options.interactive }),
            ...(options.datum === undefined ? {} : { datum: options.datum }),
        };
    }
    function group(id, children, options = {}) {
        return {
            type: 'group',
            ...nodeBase(id, options),
            children,
            ...(options.clip === undefined ? {} : { clip: options.clip }),
        };
    }

    function flattenScene(root) {
        const output = [];
        const visit = (node) => {
            if (!node.visible)
                return;
            if (node.type === 'group') {
                const sorted = [...node.children].sort((left, right) => left.zIndex - right.zIndex);
                sorted.forEach(visit);
                return;
            }
            output.push(node);
        };
        visit(root);
        return output;
    }
    function countSceneNodes(root) {
        let count = 1;
        for (const child of root.children) {
            count += child.type === 'group' ? countSceneNodes(child) : 1;
        }
        return count;
    }

    const version = '0.1.0-alpha.0';
    const specVersion = '0.1';

    class GraflumeError extends Error {
        code;
        path;
        details;
        constructor(code, message, options = {}) {
            super(message, options.cause === undefined ? undefined : { cause: options.cause });
            this.name = 'GraflumeError';
            this.code = code;
            if (options.path !== undefined)
                this.path = options.path;
            if (options.details !== undefined)
                this.details = options.details;
        }
    }

    const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
    function assertSafeKey(key, path = key) {
        if (UNSAFE_KEYS.has(key)) {
            throw new GraflumeError('UNSAFE_KEY', `Unsafe key "${key}" is not allowed.`, { path });
        }
    }
    function isPlainObject(value) {
        if (value === null || typeof value !== 'object')
            return false;
        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }
    function deepMerge(base, override) {
        const output = { ...base };
        for (const [key, overrideValue] of Object.entries(override)) {
            assertSafeKey(key);
            if (overrideValue === undefined)
                continue;
            const baseValue = output[key];
            if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
                output[key] = deepMerge(baseValue, overrideValue);
            }
            else if (Array.isArray(overrideValue)) {
                output[key] = [...overrideValue];
            }
            else {
                output[key] = overrideValue;
            }
        }
        return output;
    }
    function ownValue(record, key) {
        assertSafeKey(key, `data.${key}`);
        return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : null;
    }
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    function finiteNumber(value) {
        if (value instanceof Date) {
            const timestamp = value.getTime();
            return Number.isFinite(timestamp) ? timestamp : null;
        }
        if (typeof value !== 'number')
            return null;
        return Number.isFinite(value) ? value : null;
    }

    const UNSAFE_FIELDS = new Set(['__proto__', 'prototype', 'constructor']);
    function validateEncoding(value, path, issues) {
        if (typeof value === 'string') {
            if (value.trim() === '')
                issues.push({ path, message: 'Field name must not be empty.' });
            if (UNSAFE_FIELDS.has(value))
                issues.push({ path, message: `Unsafe field "${value}" is forbidden.` });
            return;
        }
        if (!isPlainObject(value) || typeof value.field !== 'string') {
            issues.push({ path, message: 'Encoding must be a field name or an object with a field.' });
            return;
        }
        if (value.field.trim() === '')
            issues.push({ path: `${path}.field`, message: 'Field must not be empty.' });
        if (UNSAFE_FIELDS.has(value.field)) {
            issues.push({ path: `${path}.field`, message: `Unsafe field "${value.field}" is forbidden.` });
        }
    }
    function validateMark(value, path, issues) {
        if (typeof value === 'string') {
            if (value.trim() === '')
                issues.push({ path, message: 'Mark type must not be empty.' });
            return;
        }
        if (!isPlainObject(value) || typeof value.type !== 'string' || value.type.trim() === '') {
            issues.push({ path, message: 'Mark must be a type string or an object with a type.' });
        }
    }
    function validateLayer(layer, path, hasParentData, issues) {
        if (!isPlainObject(layer)) {
            issues.push({ path, message: 'Layer must be an object.' });
            return;
        }
        validateMark(layer.mark, `${path}.mark`, issues);
        validateEncoding(layer.x, `${path}.x`, issues);
        validateEncoding(layer.y, `${path}.y`, issues);
        if (!hasParentData && layer.data === undefined) {
            issues.push({ path: `${path}.data`, message: 'Layer data is required when chart-level data is absent.' });
        }
    }
    function findFunctions(value, path, issues, seen) {
        if (typeof value === 'function') {
            issues.push({ path, message: 'Functions are not allowed in the portable chart spec.' });
            return;
        }
        if (value === null || typeof value !== 'object' || value instanceof Date)
            return;
        if (ArrayBuffer.isView(value))
            return;
        if (seen.has(value))
            return;
        seen.add(value);
        if (Array.isArray(value)) {
            value.forEach((item, index) => findFunctions(item, `${path}[${index}]`, issues, seen));
            return;
        }
        for (const [key, child] of Object.entries(value)) {
            if (UNSAFE_FIELDS.has(key)) {
                issues.push({ path: `${path}.${key}`, message: `Unsafe key "${key}" is forbidden.` });
                continue;
            }
            findFunctions(child, `${path}.${key}`, issues, seen);
        }
    }
    function validateSpec(input) {
        const issues = [];
        if (!isPlainObject(input)) {
            return [{ path: '$', message: 'Chart spec must be an object.' }];
        }
        if (input.specVersion !== undefined && input.specVersion !== '0.1') {
            issues.push({ path: '$.specVersion', message: 'Only specVersion "0.1" is supported.' });
        }
        const layers = input.layers;
        const hasShorthand = input.mark !== undefined || input.x !== undefined || input.y !== undefined;
        if (layers === undefined && !hasShorthand) {
            issues.push({ path: '$', message: 'Provide layers or the mark/x/y shorthand.' });
        }
        if (layers !== undefined) {
            if (!Array.isArray(layers) || layers.length === 0) {
                issues.push({ path: '$.layers', message: 'Layers must be a non-empty array.' });
            }
            else {
                layers.forEach((layer, index) => validateLayer(layer, `$.layers[${index}]`, input.data !== undefined, issues));
            }
        }
        if (hasShorthand) {
            validateMark(input.mark, '$.mark', issues);
            validateEncoding(input.x, '$.x', issues);
            validateEncoding(input.y, '$.y', issues);
            if (input.data === undefined) {
                issues.push({ path: '$.data', message: 'Chart-level data is required for shorthand charts.' });
            }
        }
        findFunctions(input, '$', issues, new WeakSet());
        return issues;
    }
    function assertValidSpec(input) {
        const issues = validateSpec(input);
        if (issues.length === 0)
            return;
        const first = issues[0];
        throw new GraflumeError('INVALID_SPEC', first?.message ?? 'Invalid chart spec.', {
            path: first?.path ?? '$',
            details: { issues },
        });
    }

    function normalizePadding(input) {
        if (typeof input === 'number') {
            return { top: input, right: input, bottom: input, left: input };
        }
        return {
            top: input?.top ?? 24,
            right: input?.right ?? 24,
            bottom: input?.bottom ?? 44,
            left: input?.left ?? 56,
        };
    }
    function normalizeTitle(input) {
        if (input === undefined)
            return undefined;
        if (typeof input === 'string')
            return { text: input, align: 'left' };
        return { ...input, align: input.align ?? 'left' };
    }
    function normalizeAxis(input) {
        if (input === false)
            return false;
        return {
            visible: input?.visible ?? true,
            grid: input?.grid ?? true,
            ...(input?.title === undefined ? {} : { title: input.title }),
            ...(input?.tickCount === undefined ? {} : { tickCount: input.tickCount }),
            ...(input?.format === undefined ? {} : { format: input.format }),
            ...(input?.labelAngle === undefined ? {} : { labelAngle: input.labelAngle }),
        };
    }
    function normalizeEncoding(input, fallbackAxis) {
        const encoding = typeof input === 'string' ? { field: input } : input;
        return {
            field: encoding.field,
            ...(encoding.type === undefined ? {} : { type: encoding.type }),
            title: encoding.title ?? encoding.field,
            scale: { ...encoding.scale },
            axis: encoding.axis === undefined ? fallbackAxis : normalizeAxis(encoding.axis),
        };
    }
    function normalizeMark(input) {
        const mark = typeof input === 'string' ? { type: input } : input;
        return {
            type: mark.type,
            ...(mark.stroke === undefined ? {} : { stroke: mark.stroke }),
            ...(mark.fill === undefined ? {} : { fill: mark.fill }),
            opacity: mark.opacity ?? 1,
            ...(mark.lineWidth === undefined ? {} : { lineWidth: mark.lineWidth }),
            ...(mark.radius === undefined ? {} : { radius: mark.radius }),
            ...(mark.cornerRadius === undefined ? {} : { cornerRadius: mark.cornerRadius }),
            point: mark.point ?? false,
            position: mark.position ?? 'overlay',
        };
    }
    function normalizeLayer(layer, index, parentData, chartAxes) {
        const data = layer.data ?? parentData;
        if (data === undefined) {
            throw new Error('Spec validation should guarantee layer data.');
        }
        return {
            id: layer.id ?? `layer-${index}`,
            data,
            mark: normalizeMark(layer.mark),
            x: normalizeEncoding(layer.x, chartAxes.x),
            y: normalizeEncoding(layer.y, chartAxes.y),
            visible: layer.visible ?? true,
            zIndex: layer.zIndex ?? index,
        };
    }
    function normalizeSpec(input) {
        assertValidSpec(input);
        const axes = {
            x: normalizeAxis(input.axes?.x),
            y: normalizeAxis(input.axes?.y),
        };
        const shorthandLayer = input.mark === undefined || input.x === undefined || input.y === undefined
            ? undefined
            : {
                ...(input.data === undefined ? {} : { data: input.data }),
                mark: input.mark,
                x: input.x,
                y: input.y,
            };
        const sourceLayers = input.layers ?? (shorthandLayer === undefined ? [] : [shorthandLayer]);
        const layers = sourceLayers.map((layer, index) => normalizeLayer(layer, index, input.data, axes));
        const title = normalizeTitle(input.title);
        const normalized = {
            specVersion,
            layers,
            width: input.width ?? 'container',
            height: input.height ?? 400,
            padding: normalizePadding(input.padding),
            renderer: input.renderer ?? 'auto',
            performance: input.performance ?? 'auto',
            theme: input.theme ?? 'graflume-light',
            axes,
            interaction: {
                hover: input.interaction?.hover ?? true,
                click: input.interaction?.click ?? true,
            },
            accessibility: {
                ...(input.accessibility?.label === undefined
                    ? {}
                    : { label: input.accessibility.label }),
                ...(input.accessibility?.description === undefined
                    ? {}
                    : { description: input.accessibility.description }),
            },
            ...(title === undefined ? {} : { title }),
            ...(input.description === undefined ? {} : { description: input.description }),
            ...(input.locale === undefined ? {} : { locale: input.locale }),
        };
        return normalized;
    }

    function line$1(id, x1, y1, x2, y2, stroke, lineWidth, zIndex) {
        return {
            type: 'line',
            ...nodeBase(id, { zIndex }),
            x1,
            y1,
            x2,
            y2,
            stroke,
            lineWidth,
        };
    }
    function text(id, x, y, value, theme, options = {}) {
        return {
            type: 'text',
            ...nodeBase(id, { zIndex: 110 }),
            x,
            y,
            text: value,
            fill: theme.colors.mutedText,
            fontFamily: theme.typography.fontFamily,
            fontSize: options.fontSize ?? theme.typography.fontSize,
            fontWeight: options.fontWeight ?? 400,
            align: options.align ?? 'center',
            baseline: options.baseline ?? 'top',
            rotation: options.rotation ?? 0,
        };
    }
    function compileXAxis(context) {
        const { axis, scale, plot, theme, locale, title } = context;
        if (axis === false || axis.visible === false)
            return [];
        const nodes = [];
        const axisY = plot.y + plot.height;
        const ticks = scale.ticks(axis.tickCount ?? Math.max(2, Math.floor(plot.width / 90)), locale);
        const angle = axis.labelAngle ?? (scale.kind === 'band' && ticks.length > 10 ? -35 : 0);
        nodes.push(line$1('axis-x:line', plot.x, axisY, plot.x + plot.width, axisY, theme.colors.axis, theme.axis.lineWidth, 100));
        ticks.forEach((tick, index) => {
            if (axis.grid !== false) {
                nodes.push(line$1(`axis-x:grid:${index}`, tick.position, plot.y, tick.position, axisY, theme.colors.grid, theme.axis.gridLineWidth, -20));
            }
            nodes.push(line$1(`axis-x:tick:${index}`, tick.position, axisY, tick.position, axisY + theme.axis.tickLength, theme.colors.axis, theme.axis.lineWidth, 100));
            nodes.push(text(`axis-x:label:${index}`, tick.position, axisY + theme.axis.tickLength + theme.axis.labelPadding, tick.label, theme, {
                align: angle === 0 ? 'center' : 'right',
                baseline: 'top',
                rotation: angle,
            }));
        });
        if (axis.title !== '' && title !== '') {
            nodes.push(text('axis-x:title', plot.x + plot.width / 2, axisY + 34, axis.title ?? title, theme, {
                align: 'center',
                baseline: 'top',
                fontWeight: 600,
            }));
        }
        return nodes;
    }
    function compileYAxis(context) {
        const { axis, scale, plot, theme, locale, title } = context;
        if (axis === false || axis.visible === false)
            return [];
        const nodes = [];
        const axisX = plot.x;
        const ticks = scale.ticks(axis.tickCount ?? Math.max(2, Math.floor(plot.height / 60)), locale);
        nodes.push(line$1('axis-y:line', axisX, plot.y, axisX, plot.y + plot.height, theme.colors.axis, theme.axis.lineWidth, 100));
        ticks.forEach((tick, index) => {
            if (axis.grid !== false) {
                nodes.push(line$1(`axis-y:grid:${index}`, axisX, tick.position, plot.x + plot.width, tick.position, theme.colors.grid, theme.axis.gridLineWidth, -20));
            }
            nodes.push(line$1(`axis-y:tick:${index}`, axisX - theme.axis.tickLength, tick.position, axisX, tick.position, theme.colors.axis, theme.axis.lineWidth, 100));
            nodes.push(text(`axis-y:label:${index}`, axisX - theme.axis.tickLength - theme.axis.labelPadding, tick.position, tick.label, theme, { align: 'right', baseline: 'middle' }));
        });
        if (axis.title !== '' && title !== '') {
            nodes.push(text('axis-y:title', Math.max(12, axisX - 46), plot.y + plot.height / 2, axis.title ?? title, theme, {
                align: 'center',
                baseline: 'middle',
                rotation: -90,
                fontWeight: 600,
            }));
        }
        return nodes;
    }

    function isColumnarData(input) {
        return !Array.isArray(input);
    }
    function inferColumnarLength(input) {
        const entries = Object.entries(input.columns);
        if (entries.length === 0)
            return input.length ?? 0;
        const inferred = input.length ?? entries[0]?.[1].length ?? 0;
        for (const [name, column] of entries) {
            assertSafeKey(name, `data.columns.${name}`);
            if (column.length !== inferred) {
                throw new GraflumeError('INVALID_DATA', `Column "${name}" has length ${column.length}; expected ${inferred}.`, { path: `data.columns.${name}` });
            }
        }
        return inferred;
    }
    class DataTable {
        #columns = new Map();
        #length = 0;
        static from(input) {
            return isColumnarData(input) ? DataTable.fromColumns(input) : DataTable.fromRows(input);
        }
        static fromRows(rows) {
            const table = new DataTable();
            const fieldOrder = [];
            const fields = new Set();
            for (const row of rows) {
                for (const key of Object.keys(row)) {
                    assertSafeKey(key, `data.${key}`);
                    if (!fields.has(key)) {
                        fields.add(key);
                        fieldOrder.push(key);
                    }
                }
            }
            for (const field of fieldOrder) {
                const column = rows.map((row) => ownValue(row, field));
                table.#columns.set(field, column);
            }
            table.#length = rows.length;
            return table;
        }
        static fromColumns(input) {
            const table = new DataTable();
            table.#length = inferColumnarLength(input);
            for (const [name, column] of Object.entries(input.columns)) {
                assertSafeKey(name, `data.columns.${name}`);
                table.#columns.set(name, column);
            }
            return table;
        }
        get length() {
            return this.#length;
        }
        fields() {
            return [...this.#columns.keys()];
        }
        has(field) {
            assertSafeKey(field, `data.${field}`);
            return this.#columns.has(field);
        }
        column(field) {
            assertSafeKey(field, `data.${field}`);
            const column = this.#columns.get(field);
            if (column === undefined) {
                throw new GraflumeError('INVALID_DATA', `Data field "${field}" does not exist.`, {
                    path: `data.${field}`,
                    details: { availableFields: this.fields() },
                });
            }
            return column;
        }
        value(rowIndex, field) {
            if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= this.#length) {
                throw new GraflumeError('INVALID_DATA', `Row index ${rowIndex} is out of bounds.`, {
                    path: `data[${rowIndex}]`,
                });
            }
            return this.column(field)[rowIndex];
        }
        numericValue(rowIndex, field) {
            const value = this.value(rowIndex, field);
            if (typeof value === 'string') {
                const timestamp = Date.parse(value);
                return Number.isFinite(timestamp) ? timestamp : null;
            }
            return finiteNumber(value);
        }
        extent(field, asTemporal = false) {
            const column = this.column(field);
            let min = Number.POSITIVE_INFINITY;
            let max = Number.NEGATIVE_INFINITY;
            for (let index = 0; index < this.#length; index += 1) {
                const raw = column[index];
                let value;
                if (asTemporal && typeof raw === 'string') {
                    const timestamp = Date.parse(raw);
                    value = Number.isFinite(timestamp) ? timestamp : null;
                }
                else {
                    value = finiteNumber(raw);
                }
                if (value === null)
                    continue;
                min = Math.min(min, value);
                max = Math.max(max, value);
            }
            return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : null;
        }
        unique(field) {
            const column = this.column(field);
            const values = new Set();
            for (let index = 0; index < this.#length; index += 1) {
                const value = column[index];
                if (value === null || value === undefined)
                    continue;
                values.add(value instanceof Date ? value.toISOString() : String(value));
            }
            return [...values];
        }
        row(index) {
            if (!Number.isInteger(index) || index < 0 || index >= this.#length) {
                throw new GraflumeError('INVALID_DATA', `Row index ${index} is out of bounds.`);
            }
            const row = Object.create(null);
            for (const [field, column] of this.#columns)
                row[field] = column[index];
            return row;
        }
        append(rows) {
            if (rows.length === 0)
                return;
            const allFields = new Set(this.fields());
            for (const row of rows) {
                for (const field of Object.keys(row)) {
                    assertSafeKey(field, `data.${field}`);
                    allFields.add(field);
                }
            }
            for (const field of allFields) {
                const existing = this.#columns.get(field);
                const mutable = existing === undefined ? Array(this.#length).fill(null) : Array.from(existing);
                for (const row of rows)
                    mutable.push(ownValue(row, field));
                this.#columns.set(field, mutable);
            }
            this.#length += rows.length;
        }
    }

    const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}(?:T|$)/;
    function inferFieldType(table, field) {
        const column = table.column(field);
        for (let index = 0; index < table.length; index += 1) {
            const value = column[index];
            if (value === null || value === undefined)
                continue;
            if (value instanceof Date)
                return 'temporal';
            if (typeof value === 'number')
                return 'quantitative';
            if (typeof value === 'string' && ISO_DATE_PREFIX.test(value) && Number.isFinite(Date.parse(value))) {
                return 'temporal';
            }
            return 'nominal';
        }
        return 'nominal';
    }

    class BandScale {
        kind = 'band';
        #domain;
        #positions = new Map();
        bandwidth;
        constructor(options) {
            this.#domain = [...options.domain];
            const paddingInner = clamp(options.paddingInner ?? 0.1, 0, 1);
            const paddingOuter = Math.max(0, options.paddingOuter ?? 0.05);
            const [start, end] = options.range;
            const direction = end >= start ? 1 : -1;
            const span = Math.abs(end - start);
            const denominator = Math.max(1, this.#domain.length - paddingInner + paddingOuter * 2);
            const step = span / denominator;
            this.bandwidth = step * (1 - paddingInner);
            this.#domain.forEach((value, index) => {
                const position = start + direction * step * (paddingOuter + index);
                this.#positions.set(value, position);
            });
        }
        domain() {
            return this.#domain;
        }
        map(input) {
            const value = input instanceof Date ? input.toISOString() : String(input);
            const position = this.#positions.get(value);
            return position === undefined ? Number.NaN : position + this.bandwidth / 2;
        }
        start(input) {
            return this.map(input) - this.bandwidth / 2;
        }
        ticks(count) {
            const step = Math.max(1, Math.ceil(this.#domain.length / Math.max(1, count)));
            const ticks = [];
            for (let index = 0; index < this.#domain.length; index += step) {
                const value = this.#domain[index];
                if (value === undefined)
                    continue;
                ticks.push({ value, label: value, position: this.map(value) });
            }
            const last = this.#domain.at(-1);
            if (last !== undefined && ticks.at(-1)?.value !== last) {
                ticks.push({ value: last, label: last, position: this.map(last) });
            }
            return ticks;
        }
    }

    function tickStep(start, stop, count) {
        const span = Math.abs(stop - start);
        if (span === 0 || count <= 0)
            return 0;
        const raw = span / count;
        const power = Math.floor(Math.log10(raw));
        const magnitude = 10 ** power;
        const error = raw / magnitude;
        const factor = error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1;
        return factor * magnitude;
    }
    function niceDomain(domain, count = 5) {
        let [start, stop] = domain;
        if (start === stop) {
            const delta = start === 0 ? 1 : Math.abs(start) * 0.05;
            return [start - delta, stop + delta];
        }
        const step = tickStep(start, stop, count);
        if (step === 0)
            return domain;
        const reverse = stop < start;
        if (reverse)
            [start, stop] = [stop, start];
        const niceStart = Math.floor(start / step) * step;
        const niceStop = Math.ceil(stop / step) * step;
        return reverse ? [niceStop, niceStart] : [niceStart, niceStop];
    }
    class LinearScale {
        kind;
        bandwidth = 0;
        #domain;
        #range;
        #clamp;
        constructor(options) {
            this.kind = options.kind ?? 'linear';
            this.#domain = options.nice === false ? options.domain : niceDomain(options.domain);
            this.#range = options.range;
            this.#clamp = options.clamp ?? false;
        }
        domain() {
            return this.#domain;
        }
        map(input) {
            const value = input instanceof Date ? input.getTime() : typeof input === 'string' ? Date.parse(input) : input;
            if (!Number.isFinite(value))
                return Number.NaN;
            const [domainStart, domainEnd] = this.#domain;
            const [rangeStart, rangeEnd] = this.#range;
            const denominator = domainEnd - domainStart;
            const ratio = denominator === 0 ? 0.5 : (value - domainStart) / denominator;
            const normalized = this.#clamp ? clamp(ratio, 0, 1) : ratio;
            return rangeStart + normalized * (rangeEnd - rangeStart);
        }
        invert(position) {
            const [domainStart, domainEnd] = this.#domain;
            const [rangeStart, rangeEnd] = this.#range;
            const denominator = rangeEnd - rangeStart;
            const ratio = denominator === 0 ? 0.5 : (position - rangeStart) / denominator;
            const normalized = this.#clamp ? clamp(ratio, 0, 1) : ratio;
            return domainStart + normalized * (domainEnd - domainStart);
        }
        ticks(count, locale) {
            const [start, stop] = this.#domain;
            const step = tickStep(start, stop, Math.max(1, count));
            if (step === 0) {
                const position = this.map(start);
                return [{ value: start, label: this.#format(start, locale), position }];
            }
            const first = Math.ceil(Math.min(start, stop) / step) * step;
            const last = Math.floor(Math.max(start, stop) / step) * step;
            const values = [];
            for (let value = first; value <= last + step / 2; value += step)
                values.push(value);
            if (stop < start)
                values.reverse();
            return values.map((value) => ({
                value,
                label: this.#format(value, locale),
                position: this.map(value),
            }));
        }
        #format(value, locale) {
            if (this.kind === 'time') {
                return new Intl.DateTimeFormat(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                }).format(new Date(value));
            }
            return new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(value);
        }
    }

    function typeFamily(type) {
        if (type === 'nominal' || type === 'ordinal')
            return 'categorical';
        return type === 'temporal' ? 'temporal' : 'numeric';
    }
    function resolveCommonType(types, axis) {
        const families = new Set(types.map(typeFamily));
        if (families.size > 1) {
            throw new GraflumeError('INCOMPATIBLE_SCALE', `Layers use incompatible ${axis}-axis field types: ${[...families].join(', ')}.`, { path: `$.layers[].${axis}.type` });
        }
        const first = types[0] ?? 'nominal';
        if (families.has('categorical'))
            return first === 'ordinal' ? 'ordinal' : 'nominal';
        return first;
    }
    function explicitNumericDomain(layers, axis) {
        for (const { layer } of layers) {
            const domain = layer[axis].scale.domain;
            if (domain?.length === 2 && typeof domain[0] === 'number' && typeof domain[1] === 'number') {
                return [domain[0], domain[1]];
            }
        }
        return null;
    }
    function numericDomain(layers, axis, fieldType) {
        const explicit = explicitNumericDomain(layers, axis);
        if (explicit !== null)
            return explicit;
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        let includeZero = false;
        for (const { layer, table } of layers) {
            const encoding = layer[axis];
            const extent = table.extent(encoding.field, fieldType === 'temporal');
            if (extent !== null) {
                min = Math.min(min, extent[0]);
                max = Math.max(max, extent[1]);
            }
            if (axis === 'y' &&
                (encoding.scale.zero === true || layer.mark.type === 'bar' || layer.mark.type === 'area')) {
                includeZero = true;
            }
        }
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            throw new GraflumeError('INVALID_DATA', `No numeric values are available for the ${axis}-axis.`, {
                path: `$.layers[].${axis}.field`,
            });
        }
        if (includeZero && fieldType !== 'temporal') {
            min = Math.min(0, min);
            max = Math.max(0, max);
        }
        if (min === max) {
            const delta = min === 0 ? 1 : Math.abs(min) * 0.05;
            min -= delta;
            max += delta;
        }
        return [min, max];
    }
    function categoricalDomain(layers, axis) {
        const seen = new Set();
        const domain = [];
        for (const { layer, table } of layers) {
            const explicit = layer[axis].scale.domain;
            const values = explicit?.map(String) ?? table.unique(layer[axis].field);
            for (const value of values) {
                if (seen.has(value))
                    continue;
                seen.add(value);
                domain.push(value);
            }
        }
        return domain;
    }
    function resolveScales(spec, plot) {
        const layers = spec.layers
            .filter((layer) => layer.visible)
            .map((layer) => {
            const table = DataTable.from(layer.data);
            return {
                layer,
                table,
                xType: layer.x.type ?? inferFieldType(table, layer.x.field),
                yType: layer.y.type ?? inferFieldType(table, layer.y.field),
            };
        });
        if (layers.length === 0) {
            throw new GraflumeError('INVALID_SPEC', 'At least one visible layer is required.', {
                path: '$.layers',
            });
        }
        const xType = resolveCommonType(layers.map((layer) => layer.xType), 'x');
        const yType = resolveCommonType(layers.map((layer) => layer.yType), 'y');
        if (typeFamily(yType) === 'categorical') {
            throw new GraflumeError('INCOMPATIBLE_SCALE', 'The initial Graflume runtime requires a quantitative or temporal y-axis.', { path: '$.layers[].y.type' });
        }
        const xScale = typeFamily(xType) === 'categorical'
            ? new BandScale({
                domain: categoricalDomain(layers, 'x'),
                range: [plot.x, plot.x + plot.width],
                ...(layers[0]?.layer.x.scale.paddingInner === undefined
                    ? {}
                    : { paddingInner: layers[0].layer.x.scale.paddingInner }),
                ...(layers[0]?.layer.x.scale.paddingOuter === undefined
                    ? {}
                    : { paddingOuter: layers[0].layer.x.scale.paddingOuter }),
            })
            : new LinearScale({
                domain: numericDomain(layers, 'x', xType),
                range: [plot.x, plot.x + plot.width],
                kind: xType === 'temporal' ? 'time' : 'linear',
                ...(layers[0]?.layer.x.scale.nice === undefined
                    ? {}
                    : { nice: layers[0].layer.x.scale.nice }),
                ...(layers[0]?.layer.x.scale.clamp === undefined
                    ? {}
                    : { clamp: layers[0].layer.x.scale.clamp }),
            });
        const yScale = new LinearScale({
            domain: numericDomain(layers, 'y', yType),
            range: [plot.y + plot.height, plot.y],
            kind: yType === 'temporal' ? 'time' : 'linear',
            ...(layers[0]?.layer.y.scale.nice === undefined
                ? {}
                : { nice: layers[0].layer.y.scale.nice }),
            ...(layers[0]?.layer.y.scale.clamp === undefined
                ? {}
                : { clamp: layers[0].layer.y.scale.clamp }),
        });
        return { layers, xType, yType, xScale, yScale };
    }

    function createLayout(spec, width, height, theme) {
        const titleBlock = spec.title === undefined ? 0 : theme.typography.titleSize + (spec.title.subtitle ? 22 : 10);
        const plotX = spec.padding.left;
        const plotY = spec.padding.top + titleBlock;
        const plotWidth = Math.max(1, width - spec.padding.left - spec.padding.right);
        const plotHeight = Math.max(1, height - plotY - spec.padding.bottom);
        return {
            width,
            height,
            plot: { x: plotX, y: plotY, width: plotWidth, height: plotHeight },
            titleY: spec.padding.top,
            subtitleY: spec.padding.top + theme.typography.titleSize + 4,
        };
    }

    function titleNodes(spec, theme, width, titleY, subtitleY) {
        if (spec.title === undefined)
            return [];
        const align = spec.title.align ?? 'left';
        const x = align === 'left' ? spec.padding.left : align === 'right' ? width - spec.padding.right : width / 2;
        const canvasAlign = align;
        const nodes = [
            {
                type: 'text',
                ...nodeBase('chart:title', { zIndex: 200 }),
                x,
                y: titleY,
                text: spec.title.text,
                fill: theme.colors.text,
                fontFamily: theme.typography.fontFamily,
                fontSize: theme.typography.titleSize,
                fontWeight: 700,
                align: canvasAlign,
                baseline: 'top',
                rotation: 0,
            },
        ];
        if (spec.title.subtitle !== undefined) {
            nodes.push({
                type: 'text',
                ...nodeBase('chart:subtitle', { zIndex: 200 }),
                x,
                y: subtitleY,
                text: spec.title.subtitle,
                fill: theme.colors.mutedText,
                fontFamily: theme.typography.fontFamily,
                fontSize: theme.typography.subtitleSize,
                fontWeight: 400,
                align: canvasAlign,
                baseline: 'top',
                rotation: 0,
            });
        }
        return nodes;
    }
    function accessibilityLabel(spec, rowCount) {
        if (spec.accessibility.label !== undefined)
            return spec.accessibility.label;
        const title = spec.title?.text ?? 'Graflume chart';
        const layerSummary = `${spec.layers.length} ${spec.layers.length === 1 ? 'layer' : 'layers'}`;
        const rowSummary = `${rowCount.toLocaleString()} ${rowCount === 1 ? 'row' : 'rows'}`;
        return `${title}. ${layerSummary}, ${rowSummary}.`;
    }
    function compileWithRegistry(input, registry, options = {}) {
        const spec = normalizeSpec(input);
        const width = Math.max(1, spec.width === 'container' ? (options.width ?? 640) : spec.width);
        const height = Math.max(1, spec.height === 'container' ? (options.height ?? 400) : spec.height);
        const theme = registry.themes.resolve(spec.theme);
        const layout = createLayout(spec, width, height, theme);
        const scales = resolveScales(spec, layout.plot);
        const totalRows = scales.layers.reduce((sum, layer) => sum + layer.table.length, 0);
        const performance = resolvePerformanceSettings(spec.performance, totalRows, layout.plot.width);
        const axisNodes = [
            ...compileXAxis({
                axis: scales.layers[0]?.layer.x.axis ?? spec.axes.x,
                scale: scales.xScale,
                plot: layout.plot,
                theme,
                title: scales.layers[0]?.layer.x.title ?? '',
                ...(spec.locale === undefined ? {} : { locale: spec.locale }),
            }),
            ...compileYAxis({
                axis: scales.layers[0]?.layer.y.axis ?? spec.axes.y,
                scale: scales.yScale,
                plot: layout.plot,
                theme,
                title: scales.layers[0]?.layer.y.title ?? '',
                ...(spec.locale === undefined ? {} : { locale: spec.locale }),
            }),
        ];
        const barLayers = scales.layers.filter(({ layer }) => layer.mark.type === 'bar' && layer.mark.position === 'group');
        const layerGroups = scales.layers.map((layerData, layerIndex) => {
            const color = theme.colors.palette[layerIndex % theme.colors.palette.length] ?? theme.colors.focus;
            const barGroupIndex = barLayers.findIndex(({ layer }) => layer.id === layerData.layer.id);
            const compiler = registry.mark(layerData.layer.mark.type);
            const children = compiler({
                ...layerData,
                xScale: scales.xScale,
                yScale: scales.yScale,
                plot: layout.plot,
                theme,
                color,
                performance,
                barGroup: {
                    count: barGroupIndex < 0 ? 1 : barLayers.length,
                    index: Math.max(0, barGroupIndex),
                },
            });
            return group(`${layerData.layer.id}:group`, children, {
                zIndex: layerData.layer.zIndex,
                clip: layout.plot,
            });
        });
        const children = [
            ...axisNodes,
            ...layerGroups,
            ...titleNodes(spec, theme, width, layout.titleY, layout.subtitleY),
        ];
        const root = group('scene:root', children);
        const scene = {
            width,
            height,
            background: theme.colors.background,
            root,
            accessibility: {
                label: accessibilityLabel(spec, totalRows),
                ...(spec.accessibility.description === undefined
                    ? spec.description === undefined
                        ? {}
                        : { description: spec.description }
                    : { description: spec.accessibility.description }),
            },
            metadata: {
                rowCount: totalRows,
                renderedNodeCount: countSceneNodes(root),
                performanceProfile: performance.profile,
            },
        };
        return { scene, spec, theme };
    }

    class EventEmitter {
        #listeners = new Map();
        on(type, listener) {
            let listeners = this.#listeners.get(type);
            if (listeners === undefined) {
                listeners = new Set();
                this.#listeners.set(type, listeners);
            }
            listeners.add(listener);
            return () => this.off(type, listener);
        }
        off(type, listener) {
            const listeners = this.#listeners.get(type);
            listeners?.delete(listener);
            if (listeners?.size === 0)
                this.#listeners.delete(type);
        }
        emit(type, event) {
            for (const listener of this.#listeners.get(type) ?? []) {
                listener(event);
            }
        }
        clear() {
            this.#listeners.clear();
        }
    }

    function distanceToSegment(x, y, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0)
            return Math.hypot(x - x1, y - y1);
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
    }
    function pathDistance(node, x, y) {
        let minimum = Number.POSITIVE_INFINITY;
        for (let index = 1; index < node.points.length; index += 1) {
            const first = node.points[index - 1];
            const second = node.points[index];
            if (first === undefined || second === undefined)
                continue;
            minimum = Math.min(minimum, distanceToSegment(x, y, first.x, first.y, second.x, second.y));
        }
        return minimum;
    }
    function nodeDistance(node, x, y) {
        switch (node.type) {
            case 'circle':
                return Math.max(0, Math.hypot(x - node.cx, y - node.cy) - node.radius);
            case 'rect': {
                const dx = Math.max(node.x - x, 0, x - (node.x + node.width));
                const dy = Math.max(node.y - y, 0, y - (node.y + node.height));
                return Math.hypot(dx, dy);
            }
            case 'line':
                return distanceToSegment(x, y, node.x1, node.y1, node.x2, node.y2);
            case 'path':
                return pathDistance(node, x, y);
            case 'text':
            case 'group':
                return Number.POSITIVE_INFINITY;
        }
    }
    function hitTestScene(scene, x, y, tolerance = 8) {
        const nodes = [...flattenScene(scene.root)].reverse();
        let best = null;
        for (const node of nodes) {
            if (node.interactive !== true || node.datum === undefined)
                continue;
            const distance = nodeDistance(node, x, y);
            if (distance > tolerance || (best !== null && distance >= best.distance))
                continue;
            best = {
                ...node.datum,
                nodeId: node.id,
                x,
                y,
                distance,
            };
        }
        return best;
    }

    class RenderScheduler {
        #handle = null;
        schedule(task) {
            this.cancel();
            if (typeof requestAnimationFrame === 'function') {
                this.#handle = requestAnimationFrame(() => {
                    this.#handle = null;
                    task();
                });
            }
            else {
                this.#handle = setTimeout(() => {
                    this.#handle = null;
                    task();
                }, 0);
            }
        }
        cancel() {
            if (this.#handle === null)
                return;
            if (typeof this.#handle === 'number' && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(this.#handle);
            }
            else {
                clearTimeout(this.#handle);
            }
            this.#handle = null;
        }
    }

    function resolveTarget(target) {
        if (typeof target !== 'string')
            return target;
        if (typeof document === 'undefined') {
            throw new GraflumeError('MISSING_TARGET', 'A DOM target is required to create a chart.');
        }
        const element = document.querySelector(target);
        if (element === null) {
            throw new GraflumeError('MISSING_TARGET', `Chart target "${target}" was not found.`);
        }
        return element;
    }
    function dataRows(input) {
        if (Array.isArray(input))
            return input;
        const table = DataTable.from(input);
        return Array.from({ length: table.length }, (_, index) => table.row(index));
    }
    function appendInput(input, rows) {
        return [...dataRows(input), ...rows];
    }
    class Chart {
        #target;
        #registry;
        #events = new EventEmitter();
        #scheduler = new RenderScheduler();
        #options;
        #spec;
        #renderer = null;
        #rendererName = null;
        #result = null;
        #destroyed = false;
        #resizeObserver = null;
        #windowResizeListener = null;
        #manualWidth;
        #manualHeight;
        #pointerMoveListener = (event) => {
            if (!(event instanceof PointerEvent))
                return;
            this.#emitPointer('hover', event);
        };
        #clickListener = (event) => {
            if (!(event instanceof PointerEvent))
                return;
            this.#emitPointer('click', event);
        };
        constructor(target, spec, registry, options = {}) {
            this.#target = resolveTarget(target);
            this.#spec = spec;
            this.#registry = registry;
            this.#options = options;
            this.#manualWidth = options.width;
            this.#manualHeight = options.height;
            this.render();
            this.#configureResizeObserver();
        }
        on(type, listener) {
            this.#assertAlive();
            return this.#events.on(type, listener);
        }
        off(type, listener) {
            this.#events.off(type, listener);
        }
        getSpec() {
            return this.#spec;
        }
        getScene() {
            return this.#result?.scene ?? null;
        }
        setSpec(spec) {
            this.#assertAlive();
            this.#spec = spec;
            this.render();
            this.#configureResizeObserver();
            return this;
        }
        setData(data, layerId) {
            this.#assertAlive();
            if (layerId === undefined) {
                if (this.#spec.data !== undefined || this.#spec.layers === undefined) {
                    return this.setSpec({ ...this.#spec, data });
                }
                if (this.#spec.layers.length === 1) {
                    const onlyLayer = this.#spec.layers[0];
                    if (onlyLayer !== undefined) {
                        return this.setSpec({ ...this.#spec, layers: [{ ...onlyLayer, data }] });
                    }
                }
                throw new GraflumeError('INVALID_DATA', 'Specify layerId when replacing data in a multi-layer chart.');
            }
            let matched = false;
            const layers = this.#spec.layers?.map((layer, index) => {
                if ((layer.id ?? `layer-${index}`) !== layerId)
                    return layer;
                matched = true;
                return { ...layer, data };
            });
            if (!matched || layers === undefined) {
                throw new GraflumeError('INVALID_DATA', `Layer "${layerId}" was not found.`);
            }
            return this.setSpec({ ...this.#spec, layers });
        }
        appendData(rows, layerId) {
            this.#assertAlive();
            if (rows.length === 0)
                return this;
            if (layerId === undefined && this.#spec.data !== undefined) {
                return this.setSpec({ ...this.#spec, data: appendInput(this.#spec.data, rows) });
            }
            if (this.#spec.layers === undefined) {
                throw new GraflumeError('INVALID_DATA', 'The chart has no layer data to append to.');
            }
            const targetLayerId = layerId ?? (this.#spec.layers.length === 1 ? this.#spec.layers[0]?.id ?? 'layer-0' : undefined);
            if (targetLayerId === undefined) {
                throw new GraflumeError('INVALID_DATA', 'Specify layerId when appending to a multi-layer chart.');
            }
            let matched = false;
            const layers = this.#spec.layers.map((layer, index) => {
                if ((layer.id ?? `layer-${index}`) !== targetLayerId)
                    return layer;
                const source = layer.data ?? this.#spec.data;
                if (source === undefined) {
                    throw new GraflumeError('INVALID_DATA', `Layer "${targetLayerId}" has no data source.`);
                }
                matched = true;
                return { ...layer, data: appendInput(source, rows) };
            });
            if (!matched)
                throw new GraflumeError('INVALID_DATA', `Layer "${targetLayerId}" was not found.`);
            return this.setSpec({ ...this.#spec, layers });
        }
        resize(width, height) {
            this.#assertAlive();
            this.#manualWidth = width;
            this.#manualHeight = height;
            this.render();
            const scene = this.#result?.scene;
            if (scene !== undefined) {
                this.#events.emit('resize', { chart: this, width: scene.width, height: scene.height });
            }
            return this;
        }
        scheduleRender() {
            this.#assertAlive();
            this.#scheduler.schedule(() => {
                try {
                    this.render();
                }
                catch (error) {
                    this.#events.emit('error', { chart: this, error });
                }
            });
        }
        render() {
            this.#assertAlive();
            const dimensions = this.#measure();
            const result = compileWithRegistry(this.#spec, this.#registry, dimensions);
            const factory = this.#registry.resolveRenderer(result.spec.renderer);
            const pixelRatio = this.#pixelRatio();
            this.#detachSurfaceEvents();
            if (this.#renderer === null || this.#rendererName !== factory.name) {
                this.#renderer?.destroy();
                this.#renderer = factory.create();
                this.#rendererName = factory.name;
                this.#renderer.mount(this.#target, {
                    width: result.scene.width,
                    height: result.scene.height,
                    pixelRatio,
                    ariaLabel: result.scene.accessibility.label,
                    ...(result.scene.accessibility.description === undefined
                        ? {}
                        : { ariaDescription: result.scene.accessibility.description }),
                });
            }
            else {
                this.#renderer.resize(result.scene.width, result.scene.height, pixelRatio);
                const surface = this.#renderer.surface();
                surface?.setAttribute('aria-label', result.scene.accessibility.label);
                if (result.scene.accessibility.description === undefined) {
                    surface?.removeAttribute('aria-description');
                }
                else {
                    surface?.setAttribute('aria-description', result.scene.accessibility.description);
                }
            }
            this.#renderer.render(result.scene);
            this.#attachSurfaceEvents();
            this.#result = result;
            this.#events.emit('render', { chart: this, scene: result.scene });
            return this;
        }
        toDataURL(type, quality) {
            this.#assertAlive();
            if (this.#renderer?.toDataURL === undefined) {
                throw new GraflumeError('UNSUPPORTED_RENDERER', 'The active renderer cannot export a data URL.');
            }
            return this.#renderer.toDataURL(type, quality);
        }
        destroy() {
            if (this.#destroyed)
                return;
            this.#scheduler.cancel();
            this.#resizeObserver?.disconnect();
            this.#resizeObserver = null;
            if (this.#windowResizeListener !== null && typeof window !== 'undefined') {
                window.removeEventListener('resize', this.#windowResizeListener);
            }
            this.#windowResizeListener = null;
            this.#detachSurfaceEvents();
            this.#renderer?.destroy();
            this.#renderer = null;
            this.#result = null;
            this.#events.clear();
            this.#destroyed = true;
        }
        #measure() {
            const width = this.#manualWidth ??
                (typeof this.#spec.width === 'number' ? this.#spec.width : this.#target.clientWidth || 640);
            const height = this.#manualHeight ??
                (typeof this.#spec.height === 'number' ? this.#spec.height : this.#target.clientHeight || 400);
            return { width: Math.max(1, width), height: Math.max(1, height) };
        }
        #pixelRatio() {
            const ratio = this.#options.pixelRatio ?? (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
            return Math.max(1, Math.min(3, ratio));
        }
        #configureResizeObserver() {
            this.#resizeObserver?.disconnect();
            this.#resizeObserver = null;
            if (this.#windowResizeListener !== null && typeof window !== 'undefined') {
                window.removeEventListener('resize', this.#windowResizeListener);
                this.#windowResizeListener = null;
            }
            if (this.#options.autoResize === false)
                return;
            const responsive = this.#spec.width !== undefined ? this.#spec.width === 'container' : true;
            if (!responsive)
                return;
            if (typeof ResizeObserver === 'function') {
                let previousWidth = this.#target.clientWidth;
                let previousHeight = this.#target.clientHeight;
                this.#resizeObserver = new ResizeObserver(() => {
                    const width = this.#target.clientWidth;
                    const height = this.#target.clientHeight;
                    if (width === previousWidth && height === previousHeight)
                        return;
                    previousWidth = width;
                    previousHeight = height;
                    this.scheduleRender();
                });
                this.#resizeObserver.observe(this.#target);
            }
            else if (typeof window !== 'undefined') {
                this.#windowResizeListener = () => this.scheduleRender();
                window.addEventListener('resize', this.#windowResizeListener, { passive: true });
            }
        }
        #attachSurfaceEvents() {
            const surface = this.#renderer?.surface();
            if (surface === null || surface === undefined)
                return;
            if (this.#spec.interaction?.hover !== false) {
                surface.addEventListener('pointermove', this.#pointerMoveListener, { passive: true });
            }
            if (this.#spec.interaction?.click !== false) {
                surface.addEventListener('click', this.#clickListener, { passive: true });
            }
        }
        #detachSurfaceEvents() {
            const surface = this.#renderer?.surface();
            surface?.removeEventListener('pointermove', this.#pointerMoveListener);
            surface?.removeEventListener('click', this.#clickListener);
        }
        #emitPointer(type, sourceEvent) {
            const scene = this.#result?.scene;
            const surface = this.#renderer?.surface();
            if (scene === undefined || surface === null || surface === undefined)
                return;
            const bounds = surface.getBoundingClientRect();
            const x = ((sourceEvent.clientX - bounds.left) / Math.max(1, bounds.width)) * scene.width;
            const y = ((sourceEvent.clientY - bounds.top) / Math.max(1, bounds.height)) * scene.height;
            const hit = scene.metadata.performanceProfile === 'ultra' ? null : hitTestScene(scene, x, y);
            this.#events.emit(type, { chart: this, hit, sourceEvent });
        }
        #assertAlive() {
            if (this.#destroyed) {
                throw new GraflumeError('DESTROYED_CHART', 'This chart instance has been destroyed.');
            }
        }
    }

    function strideSampleIndices(length, target) {
        if (length <= target || target <= 0)
            return Array.from({ length }, (_, index) => index);
        const step = length / target;
        const indices = [];
        for (let cursor = 0; cursor < target; cursor += 1) {
            indices.push(Math.min(length - 1, Math.floor(cursor * step)));
        }
        if (indices.at(-1) !== length - 1)
            indices.push(length - 1);
        return indices;
    }
    function minMaxSampleIndices(values, target) {
        const length = values.length;
        if (length <= target || target < 4)
            return strideSampleIndices(length, Math.max(1, target));
        const bucketCount = Math.max(1, Math.floor((target - 2) / 2));
        const bucketSize = (length - 2) / bucketCount;
        const selected = new Set([0, length - 1]);
        for (let bucket = 0; bucket < bucketCount; bucket += 1) {
            const start = Math.max(1, Math.floor(1 + bucket * bucketSize));
            const end = Math.min(length - 1, Math.ceil(1 + (bucket + 1) * bucketSize));
            let minIndex = -1;
            let maxIndex = -1;
            let minValue = Number.POSITIVE_INFINITY;
            let maxValue = Number.NEGATIVE_INFINITY;
            for (let index = start; index < end; index += 1) {
                const value = values[index];
                if (value === null || value === undefined || !Number.isFinite(value))
                    continue;
                if (value < minValue) {
                    minValue = value;
                    minIndex = index;
                }
                if (value > maxValue) {
                    maxValue = value;
                    maxIndex = index;
                }
            }
            if (minIndex >= 0)
                selected.add(minIndex);
            if (maxIndex >= 0)
                selected.add(maxIndex);
        }
        return [...selected].sort((left, right) => left - right);
    }

    function scaleInput(value) {
        if (value === null || value === undefined || typeof value === 'boolean')
            return null;
        return value;
    }
    function numericDataValue(value, temporal = false) {
        if (value instanceof Date) {
            const timestamp = value.getTime();
            return Number.isFinite(timestamp) ? timestamp : null;
        }
        if (typeof value === 'number')
            return Number.isFinite(value) ? value : null;
        if (temporal && typeof value === 'string') {
            const timestamp = Date.parse(value);
            return Number.isFinite(timestamp) ? timestamp : null;
        }
        return null;
    }

    const compileAreaMark = (context) => {
        const { table, layer, xScale, yScale, color, theme, performance } = context;
        const yValues = Array.from({ length: table.length }, (_, index) => numericDataValue(table.value(index, layer.y.field), layer.y.type === 'temporal'));
        const indices = minMaxSampleIndices(yValues, performance.maxLinePoints);
        const baseline = yScale.map(0);
        const top = [];
        for (const rowIndex of indices) {
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            const yInput = scaleInput(table.value(rowIndex, layer.y.field));
            if (xInput === null || yInput === null)
                continue;
            const x = xScale.map(xInput);
            const y = yScale.map(yInput);
            if (Number.isFinite(x) && Number.isFinite(y))
                top.push({ x, y });
        }
        if (top.length === 0)
            return [];
        const first = top[0];
        const last = top.at(-1);
        if (first === undefined || last === undefined)
            return [];
        const points = [...top, { x: last.x, y: baseline }, { x: first.x, y: baseline }];
        const node = {
            type: 'path',
            ...nodeBase(`${layer.id}:area`, {
                zIndex: layer.zIndex,
                opacity: layer.mark.opacity,
            }),
            points,
            closed: true,
            fill: layer.mark.fill ?? color,
            stroke: layer.mark.stroke ?? color,
            lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth,
        };
        return [node];
    };

    const compileBarMark = (context) => {
        const { table, layer, xScale, yScale, color, theme, barGroup, performance, plot } = context;
        const baseline = yScale.map(0);
        const nodes = [];
        const slotWidth = xScale instanceof BandScale
            ? xScale.bandwidth / Math.max(1, barGroup.count)
            : Math.max(1, (plot.width / Math.max(1, table.length)) * 0.8 / Math.max(1, barGroup.count));
        const barWidth = Math.max(1, slotWidth * 0.86);
        const indices = strideSampleIndices(table.length, performance.maxBarMarks);
        for (const rowIndex of indices) {
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            const yInput = scaleInput(table.value(rowIndex, layer.y.field));
            if (xInput === null || yInput === null)
                continue;
            const xCenter = xScale.map(xInput);
            const yValue = yScale.map(yInput);
            if (!Number.isFinite(xCenter) || !Number.isFinite(yValue) || !Number.isFinite(baseline))
                continue;
            const groupOffset = layer.mark.position === 'group'
                ? (barGroup.index - (barGroup.count - 1) / 2) * slotWidth
                : 0;
            const x = xCenter + groupOffset - barWidth / 2;
            const y = Math.min(yValue, baseline);
            const height = Math.max(0.5, Math.abs(baseline - yValue));
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:bar:${rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                }),
                x,
                y,
                width: barWidth,
                height,
                fill: layer.mark.fill ?? color,
                ...(layer.mark.stroke === undefined ? {} : { stroke: layer.mark.stroke }),
                lineWidth: layer.mark.lineWidth ?? 0,
                cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
            });
        }
        return nodes;
    };

    const compileLineMark = (context) => {
        const { table, layer, xScale, yScale, color, theme, performance } = context;
        const yValues = Array.from({ length: table.length }, (_, index) => numericDataValue(table.value(index, layer.y.field), layer.y.type === 'temporal'));
        const indices = minMaxSampleIndices(yValues, performance.maxLinePoints);
        const nodes = [];
        const pointRows = new Set(strideSampleIndices(indices.length, performance.maxPointMarks)
            .map((sampleIndex) => indices[sampleIndex])
            .filter((rowIndex) => rowIndex !== undefined));
        const segments = [];
        let current = { points: [], rowIndices: [] };
        const flush = () => {
            if (current.points.length > 0)
                segments.push(current);
            current = { points: [], rowIndices: [] };
        };
        for (const rowIndex of indices) {
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            const yInput = scaleInput(table.value(rowIndex, layer.y.field));
            if (xInput === null || yInput === null) {
                flush();
                continue;
            }
            const x = xScale.map(xInput);
            const y = yScale.map(yInput);
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                flush();
                continue;
            }
            current.points.push({ x, y });
            current.rowIndices.push(rowIndex);
        }
        flush();
        const stroke = layer.mark.stroke ?? color;
        const lineWidth = layer.mark.lineWidth ?? theme.mark.lineWidth;
        segments.forEach((segment, segmentIndex) => {
            const path = {
                type: 'path',
                ...nodeBase(`${layer.id}:line:${segmentIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                }),
                points: segment.points,
                closed: false,
                stroke,
                lineWidth,
            };
            nodes.push(path);
            if (layer.mark.point) {
                segment.points.forEach((point, pointIndex) => {
                    const rowIndex = segment.rowIndices[pointIndex];
                    if (rowIndex === undefined || !pointRows.has(rowIndex))
                        return;
                    const circle = {
                        type: 'circle',
                        ...nodeBase(`${layer.id}:point:${rowIndex}`, {
                            zIndex: layer.zIndex + 0.1,
                            opacity: layer.mark.opacity,
                            interactive: performance.enableHitTesting,
                            datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                        }),
                        cx: point.x,
                        cy: point.y,
                        radius: layer.mark.radius ?? theme.mark.pointRadius,
                        fill: layer.mark.fill ?? theme.colors.background,
                        stroke,
                        lineWidth: Math.max(1, lineWidth),
                    };
                    nodes.push(circle);
                });
            }
        });
        return nodes;
    };

    const compilePointMark = (context) => {
        const { table, layer, xScale, yScale, color, theme, performance } = context;
        const indices = strideSampleIndices(table.length, performance.maxPointMarks);
        const nodes = [];
        for (const rowIndex of indices) {
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            const yInput = scaleInput(table.value(rowIndex, layer.y.field));
            if (xInput === null || yInput === null)
                continue;
            const cx = xScale.map(xInput);
            const cy = yScale.map(yInput);
            if (!Number.isFinite(cx) || !Number.isFinite(cy))
                continue;
            nodes.push({
                type: 'circle',
                ...nodeBase(`${layer.id}:point:${rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                }),
                cx,
                cy,
                radius: layer.mark.radius ?? theme.mark.pointRadius,
                fill: layer.mark.fill ?? color,
                ...(layer.mark.stroke === undefined ? {} : { stroke: layer.mark.stroke }),
                lineWidth: layer.mark.lineWidth ?? 1,
            });
        }
        return nodes;
    };

    const capabilities$1 = {
        vector: false,
        gpu: false,
        worker: false,
        exportFormats: ['image/png', 'image/jpeg', 'image/webp'],
    };
    function roundedRectPath(context, x, y, width, height, radius) {
        const resolvedRadius = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
        context.moveTo(x + resolvedRadius, y);
        context.lineTo(x + width - resolvedRadius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + resolvedRadius);
        context.lineTo(x + width, y + height - resolvedRadius);
        context.quadraticCurveTo(x + width, y + height, x + width - resolvedRadius, y + height);
        context.lineTo(x + resolvedRadius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - resolvedRadius);
        context.lineTo(x, y + resolvedRadius);
        context.quadraticCurveTo(x, y, x + resolvedRadius, y);
    }
    class CanvasRenderer {
        name = 'canvas';
        capabilities = capabilities$1;
        #root = null;
        #canvas = null;
        #context = null;
        #width = 0;
        #height = 0;
        #pixelRatio = 1;
        mount(target, options) {
            if (this.#root !== null)
                this.destroy();
            const root = document.createElement('div');
            root.dataset.graflumeRoot = 'true';
            root.style.position = 'relative';
            root.style.width = '100%';
            root.style.height = '100%';
            root.style.overflow = 'hidden';
            const canvas = document.createElement('canvas');
            canvas.dataset.graflumeSurface = 'canvas';
            canvas.style.display = 'block';
            canvas.style.width = `${options.width}px`;
            canvas.style.height = `${options.height}px`;
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', options.ariaLabel);
            if (options.ariaDescription !== undefined) {
                canvas.setAttribute('aria-description', options.ariaDescription);
            }
            const context = canvas.getContext('2d');
            if (context === null)
                throw new Error('Canvas 2D context is unavailable.');
            root.append(canvas);
            target.append(root);
            this.#root = root;
            this.#canvas = canvas;
            this.#context = context;
            this.resize(options.width, options.height, options.pixelRatio);
        }
        resize(width, height, pixelRatio) {
            if (this.#canvas === null || this.#context === null)
                return;
            this.#width = Math.max(1, width);
            this.#height = Math.max(1, height);
            this.#pixelRatio = Math.max(1, pixelRatio);
            this.#canvas.width = Math.round(this.#width * this.#pixelRatio);
            this.#canvas.height = Math.round(this.#height * this.#pixelRatio);
            this.#canvas.style.width = `${this.#width}px`;
            this.#canvas.style.height = `${this.#height}px`;
            this.#context.setTransform(this.#pixelRatio, 0, 0, this.#pixelRatio, 0, 0);
        }
        render(scene) {
            const context = this.#context;
            if (context === null)
                return;
            context.save();
            context.setTransform(this.#pixelRatio, 0, 0, this.#pixelRatio, 0, 0);
            context.clearRect(0, 0, this.#width, this.#height);
            context.fillStyle = scene.background;
            context.fillRect(0, 0, scene.width, scene.height);
            this.#drawNode(context, scene.root);
            context.restore();
        }
        surface() {
            return this.#canvas;
        }
        toDataURL(type = 'image/png', quality) {
            if (this.#canvas === null)
                throw new Error('Renderer is not mounted.');
            return this.#canvas.toDataURL(type, quality);
        }
        destroy() {
            this.#root?.remove();
            this.#root = null;
            this.#canvas = null;
            this.#context = null;
        }
        #drawNode(context, node) {
            if (!node.visible || node.opacity <= 0)
                return;
            context.save();
            context.globalAlpha *= node.opacity;
            switch (node.type) {
                case 'group':
                    this.#drawGroup(context, node);
                    break;
                case 'line':
                    this.#drawLine(context, node);
                    break;
                case 'path':
                    this.#drawPath(context, node);
                    break;
                case 'rect':
                    this.#drawRect(context, node);
                    break;
                case 'circle':
                    this.#drawCircle(context, node);
                    break;
                case 'text':
                    this.#drawText(context, node);
                    break;
            }
            context.restore();
        }
        #drawGroup(context, node) {
            if (node.clip !== undefined) {
                context.beginPath();
                context.rect(node.clip.x, node.clip.y, node.clip.width, node.clip.height);
                context.clip();
            }
            const children = [...node.children].sort((left, right) => left.zIndex - right.zIndex);
            for (const child of children)
                this.#drawNode(context, child);
        }
        #drawLine(context, node) {
            context.beginPath();
            context.moveTo(node.x1, node.y1);
            context.lineTo(node.x2, node.y2);
            context.strokeStyle = node.stroke;
            context.lineWidth = node.lineWidth;
            context.setLineDash(node.dash ?? []);
            context.stroke();
        }
        #drawPath(context, node) {
            const first = node.points[0];
            if (first === undefined)
                return;
            context.beginPath();
            context.moveTo(first.x, first.y);
            for (let index = 1; index < node.points.length; index += 1) {
                const point = node.points[index];
                if (point !== undefined)
                    context.lineTo(point.x, point.y);
            }
            if (node.closed)
                context.closePath();
            context.setLineDash(node.dash ?? []);
            if (node.fill !== undefined) {
                context.fillStyle = node.fill;
                context.fill();
            }
            if (node.stroke !== undefined && node.lineWidth > 0) {
                context.strokeStyle = node.stroke;
                context.lineWidth = node.lineWidth;
                context.stroke();
            }
        }
        #drawRect(context, node) {
            context.beginPath();
            roundedRectPath(context, node.x, node.y, node.width, node.height, node.cornerRadius);
            context.closePath();
            if (node.fill !== undefined) {
                context.fillStyle = node.fill;
                context.fill();
            }
            if (node.stroke !== undefined && node.lineWidth > 0) {
                context.strokeStyle = node.stroke;
                context.lineWidth = node.lineWidth;
                context.stroke();
            }
        }
        #drawCircle(context, node) {
            context.beginPath();
            context.arc(node.cx, node.cy, node.radius, 0, Math.PI * 2);
            if (node.fill !== undefined) {
                context.fillStyle = node.fill;
                context.fill();
            }
            if (node.stroke !== undefined && node.lineWidth > 0) {
                context.strokeStyle = node.stroke;
                context.lineWidth = node.lineWidth;
                context.stroke();
            }
        }
        #drawText(context, node) {
            context.translate(node.x, node.y);
            context.rotate((node.rotation * Math.PI) / 180);
            context.fillStyle = node.fill;
            context.font = `${node.fontWeight} ${node.fontSize}px ${node.fontFamily}`;
            context.textAlign = node.align;
            context.textBaseline = node.baseline;
            context.fillText(node.text, 0, 0);
        }
    }
    const canvasRendererFactory = {
        name: 'canvas',
        capabilities: capabilities$1,
        create: () => new CanvasRenderer(),
    };

    const pluginApiVersion = '0.1';

    const palette = [
        '#3b82f6',
        '#f97316',
        '#10b981',
        '#ef4444',
        '#8b5cf6',
        '#06b6d4',
        '#eab308',
        '#ec4899',
        '#64748b',
        '#84cc16',
    ];
    const graflumeLight = {
        name: 'graflume-light',
        mode: 'light',
        colors: {
            background: '#ffffff',
            surface: '#ffffff',
            text: '#172033',
            mutedText: '#5d6b82',
            axis: '#5d6b82',
            grid: '#e5eaf2',
            focus: '#2563eb',
            palette,
            sequential: ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
            diverging: ['#b91c1c', '#fca5a5', '#f8fafc', '#93c5fd', '#1d4ed8'],
        },
        typography: {
            fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 12,
            titleSize: 18,
            subtitleSize: 13,
            lineHeight: 1.4,
        },
        spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
        axis: { lineWidth: 1, tickLength: 5, labelPadding: 7, gridLineWidth: 1 },
        mark: { lineWidth: 2, pointRadius: 3.5, barRadius: 2, opacity: 1 },
        motion: { duration: 250, easing: 'ease-out' },
    };
    const graflumeDark = {
        ...graflumeLight,
        name: 'graflume-dark',
        mode: 'dark',
        colors: {
            ...graflumeLight.colors,
            background: '#101522',
            surface: '#171e2d',
            text: '#f1f5f9',
            mutedText: '#a8b3c7',
            axis: '#a8b3c7',
            grid: '#2c3547',
            focus: '#60a5fa',
            palette: [
                '#60a5fa',
                '#fb923c',
                '#34d399',
                '#f87171',
                '#a78bfa',
                '#22d3ee',
                '#facc15',
                '#f472b6',
                '#94a3b8',
                '#a3e635',
            ],
        },
    };

    class ThemeRegistry {
        #themes = new Map();
        constructor() {
            this.register(graflumeLight);
            this.register(graflumeDark);
        }
        register(theme) {
            if (theme.name.trim() === '') {
                throw new GraflumeError('INVALID_SPEC', 'Theme name must not be empty.', {
                    path: '$.theme.name',
                });
            }
            this.#themes.set(theme.name, theme);
        }
        has(name) {
            return this.#themes.has(name);
        }
        get(name) {
            const theme = this.#themes.get(name);
            if (theme === undefined) {
                throw new GraflumeError('INVALID_SPEC', `Unknown theme "${name}".`, {
                    path: '$.theme',
                    details: { availableThemes: this.names() },
                });
            }
            return theme;
        }
        names() {
            return [...this.#themes.keys()].sort();
        }
        resolve(input) {
            if (typeof input === 'string')
                return this.get(input);
            const baseName = input.extends ?? 'graflume-light';
            const { extends: _extends, ...overrides } = input;
            const merged = deepMerge(this.get(baseName), overrides);
            return {
                ...merged,
                name: merged.name || `custom:${baseName}`,
            };
        }
    }

    class RuntimeRegistry {
        themes = new ThemeRegistry();
        #marks = new Map();
        #renderers = new Map();
        #plugins = new Map();
        registerMark(type, compiler) {
            const normalized = type.trim().toLowerCase();
            if (normalized === '')
                throw new Error('Mark type must not be empty.');
            this.#marks.set(normalized, compiler);
        }
        mark(type) {
            const compiler = this.#marks.get(type.trim().toLowerCase());
            if (compiler === undefined) {
                throw new GraflumeError('UNSUPPORTED_MARK', `Unsupported mark type "${type}".`, {
                    path: '$.layers[].mark.type',
                    details: { availableMarks: this.markNames() },
                });
            }
            return compiler;
        }
        markNames() {
            return [...this.#marks.keys()].sort();
        }
        registerRenderer(factory) {
            this.#renderers.set(factory.name, factory);
        }
        renderer(name) {
            const factory = this.#renderers.get(name);
            if (factory === undefined) {
                throw new GraflumeError('UNSUPPORTED_RENDERER', `Unsupported renderer "${name}".`, {
                    path: '$.renderer',
                    details: { availableRenderers: this.rendererNames() },
                });
            }
            return factory;
        }
        resolveRenderer(preference) {
            if (preference === 'auto')
                return this.renderer('canvas');
            return this.renderer(preference);
        }
        rendererNames() {
            return [...this.#renderers.keys()].sort();
        }
        registerTheme(theme) {
            this.themes.register(theme);
        }
        use(plugin) {
            if (this.#plugins.has(plugin.name))
                return;
            if (plugin.apiVersion !== undefined && plugin.apiVersion !== pluginApiVersion) {
                throw new GraflumeError('INVALID_SPEC', `Plugin "${plugin.name}" requires API ${plugin.apiVersion}; runtime is ${pluginApiVersion}.`);
            }
            const context = {
                apiVersion: pluginApiVersion,
                registerMark: (type, compiler) => this.registerMark(type, compiler),
                registerRenderer: (factory) => this.registerRenderer(factory),
                registerTheme: (theme) => this.registerTheme(theme),
            };
            plugin.install(context);
            this.#plugins.set(plugin.name, plugin.version);
        }
        capabilities() {
            return {
                marks: this.markNames(),
                renderers: this.rendererNames(),
                themes: this.themes.names(),
                plugins: [...this.#plugins.keys()].sort(),
            };
        }
    }

    function createDefaultRegistry() {
        const registry = new RuntimeRegistry();
        registry.registerRenderer(canvasRendererFactory);
        registry.registerMark('line', compileLineMark);
        registry.registerMark('bar', compileBarMark);
        registry.registerMark('point', compilePointMark);
        registry.registerMark('area', compileAreaMark);
        return registry;
    }
    const defaultRegistry = createDefaultRegistry();

    function create(target, spec, options) {
        return new Chart(target, spec, defaultRegistry, options);
    }
    function compile(spec, options) {
        return compileWithRegistry(spec, defaultRegistry, options);
    }
    function line(target, data, options) {
        return quickChart(create, 'line', target, data, options);
    }
    function bar(target, data, options) {
        return quickChart(create, 'bar', target, data, options);
    }
    function point(target, data, options) {
        return quickChart(create, 'point', target, data, options);
    }
    function area(target, data, options) {
        return quickChart(create, 'area', target, data, options);
    }
    function registerTheme(theme) {
        defaultRegistry.registerTheme(theme);
    }
    function registerRenderer(factory) {
        defaultRegistry.registerRenderer(factory);
    }
    function registerMark(type, compiler) {
        defaultRegistry.registerMark(type, compiler);
    }
    function use(plugin) {
        defaultRegistry.use(plugin);
    }
    function capabilities() {
        return defaultRegistry.capabilities();
    }
    const createRegistry = createDefaultRegistry;

    exports.CanvasRenderer = CanvasRenderer;
    exports.Chart = Chart;
    exports.DataTable = DataTable;
    exports.GraflumeError = GraflumeError;
    exports.RuntimeRegistry = RuntimeRegistry;
    exports.area = area;
    exports.assertValidSpec = assertValidSpec;
    exports.bar = bar;
    exports.canvasRendererFactory = canvasRendererFactory;
    exports.capabilities = capabilities;
    exports.compile = compile;
    exports.create = create;
    exports.createRegistry = createRegistry;
    exports.graflumeDark = graflumeDark;
    exports.graflumeLight = graflumeLight;
    exports.hitTestScene = hitTestScene;
    exports.line = line;
    exports.normalizeSpec = normalizeSpec;
    exports.pluginApiVersion = pluginApiVersion;
    exports.point = point;
    exports.registerMark = registerMark;
    exports.registerRenderer = registerRenderer;
    exports.registerTheme = registerTheme;
    exports.specVersion = specVersion;
    exports.use = use;
    exports.validateSpec = validateSpec;
    exports.version = version;

    return exports;

})({});
//# sourceMappingURL=graflume.global.js.map

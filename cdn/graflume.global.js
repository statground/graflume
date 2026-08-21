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
    function quickCombo(createChart, target, data, options) {
        const { layers, create, ...chartOptions } = options;
        return createChart(target, { ...chartOptions, data, layers }, create);
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
            return;
        }
        if (value.fields !== undefined) {
            if (!isPlainObject(value.fields)) {
                issues.push({ path: `${path}.fields`, message: 'Mark fields must be an object.' });
            }
            else {
                for (const [name, field] of Object.entries(value.fields)) {
                    if (UNSAFE_FIELDS.has(name)) {
                        issues.push({
                            path: `${path}.fields.${name}`,
                            message: `Unsafe key "${name}" is forbidden.`,
                        });
                    }
                    if (typeof field !== 'string' || field.trim() === '') {
                        issues.push({
                            path: `${path}.fields.${name}`,
                            message: 'Named mark fields must be non-empty strings.',
                        });
                    }
                    else if (UNSAFE_FIELDS.has(field)) {
                        issues.push({
                            path: `${path}.fields.${name}`,
                            message: `Unsafe field "${field}" is forbidden.`,
                        });
                    }
                }
            }
        }
        if (value.options !== undefined && !isPlainObject(value.options)) {
            issues.push({ path: `${path}.options`, message: 'Mark options must be a JSON object.' });
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
            issues.push({
                path: `${path}.data`,
                message: 'Layer data is required when chart-level data is absent.',
            });
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
                issues.push({
                    path: '$.data',
                    message: 'Chart-level data is required for shorthand charts.',
                });
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
            orientation: mark.orientation ?? 'vertical',
            fields: { ...mark.fields },
            options: { ...mark.options },
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
                ...(input.accessibility?.label === undefined ? {} : { label: input.accessibility.label }),
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
            if (typeof value === 'string' &&
                ISO_DATE_PREFIX.test(value) &&
                Number.isFinite(Date.parse(value))) {
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
            const value = input instanceof Date
                ? input.getTime()
                : typeof input === 'string'
                    ? Date.parse(input)
                    : input;
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
                    timeZone: 'UTC',
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
            const fields = axis === 'y' && layer.mark.type === 'histogram' ? [] : [encoding.field];
            if (axis === 'x' && (layer.mark.type === 'timeline' || layer.mark.type === 'gantt')) {
                fields.push(layer.mark.fields.end ?? 'end');
            }
            if (axis === 'y' && layer.mark.type === 'candlestick') {
                fields.push(layer.mark.fields.open ?? 'open', layer.mark.fields.high ?? 'high', layer.mark.fields.low ?? 'low', layer.mark.fields.close ?? encoding.field);
            }
            if (axis === 'y' && layer.mark.type === 'interval') {
                fields.push(layer.mark.fields.low ?? 'low', layer.mark.fields.high ?? 'high');
            }
            if (axis === 'y' && layer.mark.type === 'diff') {
                fields.push(layer.mark.fields.old ?? 'old', layer.mark.fields.new ?? encoding.field);
            }
            for (const field of new Set(fields)) {
                if (!table.has(field))
                    continue;
                const extent = table.extent(field, fieldType === 'temporal');
                if (extent !== null) {
                    min = Math.min(min, extent[0]);
                    max = Math.max(max, extent[1]);
                }
            }
            if (axis === 'y' && layer.mark.type === 'histogram') {
                const binCount = Math.max(1, Math.min(100, Math.floor(typeof layer.mark.options.bins === 'number' ? layer.mark.options.bins : 10)));
                const sourceExtent = table.extent(layer.x.field, layer.x.type === 'temporal');
                if (sourceExtent !== null) {
                    const counts = Array.from({ length: binCount }, () => 0);
                    const span = sourceExtent[1] - sourceExtent[0] || 1;
                    for (let index = 0; index < table.length; index += 1) {
                        const value = table.numericValue(index, layer.x.field);
                        if (value === null)
                            continue;
                        const bin = Math.min(binCount - 1, Math.max(0, Math.floor(((value - sourceExtent[0]) / span) * binCount)));
                        counts[bin] = (counts[bin] ?? 0) + 1;
                    }
                    min = Math.min(min, 0);
                    max = Math.max(max, ...counts);
                }
            }
            if (axis === 'y' && layer.mark.type === 'waterfall') {
                let total = 0;
                min = Math.min(min, 0);
                max = Math.max(max, 0);
                for (let index = 0; index < table.length; index += 1) {
                    const value = table.numericValue(index, layer.y.field);
                    if (value === null)
                        continue;
                    const previous = total;
                    total += value;
                    min = Math.min(min, previous, total);
                    max = Math.max(max, previous, total);
                }
            }
            if (encoding.scale.zero === true ||
                (axis === 'y' &&
                    (layer.mark.type === 'bar' ||
                        layer.mark.type === 'area' ||
                        layer.mark.type === 'histogram' ||
                        layer.mark.type === 'waterfall')) ||
                (axis === 'x' && layer.mark.type === 'bar' && layer.mark.orientation === 'horizontal')) {
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
        const yScale = typeFamily(yType) === 'categorical'
            ? new BandScale({
                domain: categoricalDomain(layers, 'y'),
                range: [plot.y, plot.y + plot.height],
                ...(layers[0]?.layer.y.scale.paddingInner === undefined
                    ? {}
                    : { paddingInner: layers[0].layer.y.scale.paddingInner }),
                ...(layers[0]?.layer.y.scale.paddingOuter === undefined
                    ? {}
                    : { paddingOuter: layers[0].layer.y.scale.paddingOuter }),
            })
            : new LinearScale({
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

    const AXISLESS_MARKS = new Set([
        'calendar',
        'gauge',
        'geo',
        'map',
        'org',
        'pie',
        'sankey',
        'table',
        'treemap',
        'word-tree',
    ]);
    function titleNodes(spec, theme, width, titleY, subtitleY) {
        if (spec.title === undefined)
            return [];
        const align = spec.title.align ?? 'left';
        const x = align === 'left'
            ? spec.padding.left
            : align === 'right'
                ? width - spec.padding.right
                : width / 2;
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
        const showAxes = spec.layers.some((layer) => !AXISLESS_MARKS.has(layer.mark.type));
        const axisNodes = showAxes
            ? [
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
            ]
            : [];
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
        if (node.closed && node.points.length >= 3) {
            let inside = false;
            for (let index = 0, previous = node.points.length - 1; index < node.points.length; previous = index, index += 1) {
                const currentPoint = node.points[index];
                const previousPoint = node.points[previous];
                if (currentPoint === undefined || previousPoint === undefined)
                    continue;
                const crosses = currentPoint.y > y !== previousPoint.y > y &&
                    x <
                        ((previousPoint.x - currentPoint.x) * (y - currentPoint.y)) /
                            (previousPoint.y - currentPoint.y || Number.EPSILON) +
                            currentPoint.x;
                if (crosses)
                    inside = !inside;
            }
            if (inside)
                return 0;
        }
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
            const targetLayerId = layerId ??
                (this.#spec.layers.length === 1 ? (this.#spec.layers[0]?.id ?? 'layer-0') : undefined);
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
                (typeof this.#spec.height === 'number'
                    ? this.#spec.height
                    : this.#target.clientHeight || 400);
            return { width: Math.max(1, width), height: Math.max(1, height) };
        }
        #pixelRatio() {
            const ratio = this.#options.pixelRatio ??
                (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
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
        if (layer.mark.orientation === 'horizontal') {
            const baseline = xScale.map(0);
            const slotHeight = yScale instanceof BandScale
                ? yScale.bandwidth / Math.max(1, barGroup.count)
                : Math.max(1, ((plot.height / Math.max(1, table.length)) * 0.8) / Math.max(1, barGroup.count));
            const barHeight = Math.max(1, slotHeight * 0.86);
            const nodes = [];
            const indices = strideSampleIndices(table.length, performance.maxBarMarks);
            for (const rowIndex of indices) {
                const xInput = scaleInput(table.value(rowIndex, layer.x.field));
                const yInput = scaleInput(table.value(rowIndex, layer.y.field));
                if (xInput === null || yInput === null)
                    continue;
                const xValue = xScale.map(xInput);
                const yCenter = yScale.map(yInput);
                if (!Number.isFinite(xValue) || !Number.isFinite(yCenter) || !Number.isFinite(baseline))
                    continue;
                const groupOffset = layer.mark.position === 'group'
                    ? (barGroup.index - (barGroup.count - 1) / 2) * slotHeight
                    : 0;
                nodes.push({
                    type: 'rect',
                    ...nodeBase(`${layer.id}:bar:${rowIndex}`, {
                        zIndex: layer.zIndex,
                        opacity: layer.mark.opacity,
                        interactive: performance.enableHitTesting,
                        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                    }),
                    x: Math.min(xValue, baseline),
                    y: yCenter + groupOffset - barHeight / 2,
                    width: Math.max(0.5, Math.abs(baseline - xValue)),
                    height: barHeight,
                    fill: layer.mark.fill ?? color,
                    ...(layer.mark.stroke === undefined ? {} : { stroke: layer.mark.stroke }),
                    lineWidth: layer.mark.lineWidth ?? 0,
                    cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
                });
            }
            return nodes;
        }
        const baseline = yScale.map(0);
        const nodes = [];
        const slotWidth = xScale instanceof BandScale
            ? xScale.bandwidth / Math.max(1, barGroup.count)
            : Math.max(1, ((plot.width / Math.max(1, table.length)) * 0.8) / Math.max(1, barGroup.count));
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
            const groupOffset = layer.mark.position === 'group' ? (barGroup.index - (barGroup.count - 1) / 2) * slotWidth : 0;
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

    function optionNumber$2(options, name, fallback) {
        const value = options[name];
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }
    function optionString(options, name) {
        const value = options[name];
        return typeof value === 'string' ? value : undefined;
    }
    function textNode$1(id, x, y, text, context, options = {}) {
        return {
            type: 'text',
            ...nodeBase(id, { zIndex: context.layer.zIndex + 2 }),
            x,
            y,
            text,
            fill: context.theme.colors.text,
            fontFamily: context.theme.typography.fontFamily,
            fontSize: options.size ?? context.theme.typography.fontSize,
            fontWeight: options.weight ?? 500,
            align: options.align ?? 'center',
            baseline: options.baseline ?? 'middle',
            rotation: 0,
        };
    }
    const compileSteppedAreaMark = (context) => {
        const { table, layer, xScale, yScale, color, theme } = context;
        const top = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            const yInput = scaleInput(table.value(rowIndex, layer.y.field));
            if (xInput === null || yInput === null)
                continue;
            const x = xScale.map(xInput);
            const y = yScale.map(yInput);
            if (!Number.isFinite(x) || !Number.isFinite(y))
                continue;
            const previous = top.at(-1);
            if (previous !== undefined)
                top.push({ x, y: previous.y });
            top.push({ x, y });
        }
        const first = top[0];
        const last = top.at(-1);
        if (first === undefined || last === undefined)
            return [];
        const baseline = yScale.map(0);
        const area = {
            type: 'path',
            ...nodeBase(`${layer.id}:stepped-area`, { zIndex: layer.zIndex, opacity: layer.mark.opacity }),
            points: [...top, { x: last.x, y: baseline }, { x: first.x, y: baseline }],
            closed: true,
            fill: layer.mark.fill ?? color,
            stroke: layer.mark.stroke ?? color,
            lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth,
        };
        return [area];
    };
    const compileBubbleMark = (context) => {
        const { table, layer, xScale, yScale, theme, color, performance } = context;
        const sizeField = layer.mark.fields.size;
        const colorField = layer.mark.fields.color;
        const timeField = layer.mark.fields.time;
        const frame = layer.mark.options.frame;
        let minimum = Number.POSITIVE_INFINITY;
        let maximum = Number.NEGATIVE_INFINITY;
        if (sizeField !== undefined && table.has(sizeField)) {
            const extent = table.extent(sizeField);
            if (extent !== null)
                [minimum, maximum] = extent;
        }
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
            minimum = 1;
            maximum = 1;
        }
        const categoryColors = new Map();
        const nodes = [];
        const minimumRadius = optionNumber$2(layer.mark.options, 'minRadius', layer.mark.radius ?? 5);
        const maximumRadius = optionNumber$2(layer.mark.options, 'maxRadius', 24);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            if (timeField !== undefined &&
                frame !== undefined &&
                String(table.value(rowIndex, timeField)) !== String(frame)) {
                continue;
            }
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            const yInput = scaleInput(table.value(rowIndex, layer.y.field));
            if (xInput === null || yInput === null)
                continue;
            const cx = xScale.map(xInput);
            const cy = yScale.map(yInput);
            if (!Number.isFinite(cx) || !Number.isFinite(cy))
                continue;
            const size = sizeField === undefined ? maximum : numericDataValue(table.value(rowIndex, sizeField));
            const ratio = size === null || maximum === minimum
                ? 0.5
                : Math.max(0, Math.min(1, (size - minimum) / (maximum - minimum)));
            let fill = layer.mark.fill ?? color;
            if (colorField !== undefined) {
                const category = String(table.value(rowIndex, colorField) ?? '');
                let categoryColor = categoryColors.get(category);
                if (categoryColor === undefined) {
                    categoryColor =
                        theme.colors.palette[categoryColors.size % theme.colors.palette.length] ??
                            theme.colors.focus;
                    categoryColors.set(category, categoryColor);
                }
                fill = categoryColor;
            }
            nodes.push({
                type: 'circle',
                ...nodeBase(`${layer.id}:bubble:${rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                }),
                cx,
                cy,
                radius: minimumRadius + Math.sqrt(ratio) * (maximumRadius - minimumRadius),
                fill,
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 1.5,
            });
        }
        return nodes;
    };
    const compileCandlestickMark = (context) => {
        const { table, layer, xScale, yScale, plot, theme, performance } = context;
        const openField = layer.mark.fields.open ?? 'open';
        const highField = layer.mark.fields.high ?? 'high';
        const lowField = layer.mark.fields.low ?? 'low';
        const closeField = layer.mark.fields.close ?? layer.y.field;
        const width = Math.max(3, xScale instanceof BandScale
            ? xScale.bandwidth * 0.58
            : (plot.width / Math.max(1, table.length)) * 0.56);
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            const open = numericDataValue(table.value(rowIndex, openField));
            const high = numericDataValue(table.value(rowIndex, highField));
            const low = numericDataValue(table.value(rowIndex, lowField));
            const close = numericDataValue(table.value(rowIndex, closeField));
            if (xInput === null || open === null || high === null || low === null || close === null)
                continue;
            const x = xScale.map(xInput);
            const yOpen = yScale.map(open);
            const yHigh = yScale.map(high);
            const yLow = yScale.map(low);
            const yClose = yScale.map(close);
            if (![x, yOpen, yHigh, yLow, yClose].every(Number.isFinite))
                continue;
            const rising = close >= open;
            const fill = rising
                ? (optionString(layer.mark.options, 'risingColor') ?? theme.colors.palette[2] ?? '#10b981')
                : (optionString(layer.mark.options, 'fallingColor') ?? theme.colors.palette[3] ?? '#ef4444');
            const datum = { layerId: layer.id, rowIndex, datum: table.row(rowIndex) };
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:wick:${rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                }),
                x1: x,
                y1: yHigh,
                x2: x,
                y2: yLow,
                stroke: layer.mark.stroke ?? theme.colors.axis,
                lineWidth: layer.mark.lineWidth ?? 1.4,
            });
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:body:${rowIndex}`, {
                    zIndex: layer.zIndex + 0.1,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum,
                }),
                x: x - width / 2,
                y: Math.min(yOpen, yClose),
                width,
                height: Math.max(1.5, Math.abs(yOpen - yClose)),
                fill,
                stroke: layer.mark.stroke ?? fill,
                lineWidth: layer.mark.lineWidth ?? 1,
                cornerRadius: layer.mark.cornerRadius ?? 1,
            });
        }
        return nodes;
    };
    const compileHistogramMark = (context) => {
        const { table, layer, xScale, yScale, theme, color, performance } = context;
        const binCount = Math.max(1, Math.min(100, Math.floor(optionNumber$2(layer.mark.options, 'bins', 10))));
        const extent = table.extent(layer.x.field, layer.x.type === 'temporal');
        if (extent === null)
            return [];
        const span = extent[1] - extent[0] || 1;
        const bins = Array.from({ length: binCount }, () => 0);
        const rows = Array.from({ length: binCount }, () => []);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const value = numericDataValue(table.value(rowIndex, layer.x.field), layer.x.type === 'temporal');
            if (value === null)
                continue;
            const bin = Math.min(binCount - 1, Math.max(0, Math.floor(((value - extent[0]) / span) * binCount)));
            bins[bin] = (bins[bin] ?? 0) + 1;
            rows[bin]?.push(rowIndex);
        }
        const baseline = yScale.map(0);
        const nodes = [];
        bins.forEach((count, index) => {
            const start = extent[0] + (span * index) / binCount;
            const end = extent[0] + (span * (index + 1)) / binCount;
            const x1 = xScale.map(start);
            const x2 = xScale.map(end);
            const y = yScale.map(count);
            const rowIndex = rows[index]?.[0];
            if (![x1, x2, y, baseline].every(Number.isFinite))
                return;
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:bin:${index}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting && rowIndex !== undefined,
                    ...(rowIndex === undefined
                        ? {}
                        : { datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) } }),
                }),
                x: Math.min(x1, x2) + 1,
                y: Math.min(y, baseline),
                width: Math.max(1, Math.abs(x2 - x1) - 2),
                height: Math.max(0.5, Math.abs(baseline - y)),
                fill: layer.mark.fill ?? color,
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 1,
                cornerRadius: layer.mark.cornerRadius ?? 1,
            });
        });
        return nodes;
    };
    const compileIntervalMark = (context) => {
        const { table, layer, xScale, yScale, color, theme, performance } = context;
        const lowField = layer.mark.fields.low ?? 'low';
        const highField = layer.mark.fields.high ?? 'high';
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            const low = numericDataValue(table.value(rowIndex, lowField));
            const high = numericDataValue(table.value(rowIndex, highField));
            if (xInput === null || value === null || low === null || high === null)
                continue;
            const x = xScale.map(xInput);
            const y = yScale.map(value);
            const yLow = yScale.map(low);
            const yHigh = yScale.map(high);
            if (![x, y, yLow, yHigh].every(Number.isFinite))
                continue;
            const stroke = layer.mark.stroke ?? color;
            const cap = Math.max(4, (xScale instanceof BandScale ? xScale.bandwidth : 14) * 0.25);
            const base = `${layer.id}:interval:${rowIndex}`;
            const lineWidth = layer.mark.lineWidth ?? 2;
            const lines = [
                {
                    type: 'line',
                    ...nodeBase(`${base}:range`, { zIndex: layer.zIndex }),
                    x1: x,
                    y1: yHigh,
                    x2: x,
                    y2: yLow,
                    stroke,
                    lineWidth,
                },
                {
                    type: 'line',
                    ...nodeBase(`${base}:high`, { zIndex: layer.zIndex }),
                    x1: x - cap,
                    y1: yHigh,
                    x2: x + cap,
                    y2: yHigh,
                    stroke,
                    lineWidth,
                },
                {
                    type: 'line',
                    ...nodeBase(`${base}:low`, { zIndex: layer.zIndex }),
                    x1: x - cap,
                    y1: yLow,
                    x2: x + cap,
                    y2: yLow,
                    stroke,
                    lineWidth,
                },
            ];
            nodes.push(...lines);
            nodes.push({
                type: 'circle',
                ...nodeBase(`${base}:value`, {
                    zIndex: layer.zIndex + 0.1,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                }),
                cx: x,
                cy: y,
                radius: layer.mark.radius ?? theme.mark.pointRadius + 1,
                fill: layer.mark.fill ?? theme.colors.background,
                stroke,
                lineWidth,
            });
        }
        return nodes;
    };
    const compileTrendlineMark = (context) => {
        const { table, layer, xScale, yScale, color, theme } = context;
        const points = compilePointMark(context);
        const pairs = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const x = numericDataValue(table.value(rowIndex, layer.x.field), layer.x.type === 'temporal');
            const y = numericDataValue(table.value(rowIndex, layer.y.field), layer.y.type === 'temporal');
            if (x !== null && y !== null)
                pairs.push({ x, y });
        }
        if (pairs.length < 2)
            return points;
        const meanX = pairs.reduce((sum, point) => sum + point.x, 0) / pairs.length;
        const meanY = pairs.reduce((sum, point) => sum + point.y, 0) / pairs.length;
        const numerator = pairs.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
        const denominator = pairs.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0) || 1;
        const slope = numerator / denominator;
        const intercept = meanY - slope * meanX;
        const minimum = Math.min(...pairs.map((point) => point.x));
        const maximum = Math.max(...pairs.map((point) => point.x));
        const line = {
            type: 'path',
            ...nodeBase(`${layer.id}:trendline`, {
                zIndex: layer.zIndex + 0.2,
                opacity: layer.mark.opacity,
            }),
            points: [
                { x: xScale.map(minimum), y: yScale.map(intercept + slope * minimum) },
                { x: xScale.map(maximum), y: yScale.map(intercept + slope * maximum) },
            ],
            closed: false,
            stroke: layer.mark.stroke ?? color,
            lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth + 0.5,
            dash: [7, 4],
        };
        return [...points, line];
    };
    const compileWaterfallMark = (context) => {
        const { table, layer, xScale, yScale, theme, performance, plot } = context;
        const width = Math.max(3, xScale instanceof BandScale
            ? xScale.bandwidth * 0.62
            : (plot.width / Math.max(1, table.length)) * 0.6);
        const nodes = [];
        let total = 0;
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            const delta = numericDataValue(table.value(rowIndex, layer.y.field));
            if (xInput === null || delta === null)
                continue;
            const previous = total;
            total += delta;
            const x = xScale.map(xInput);
            const y1 = yScale.map(previous);
            const y2 = yScale.map(total);
            if (![x, y1, y2].every(Number.isFinite))
                continue;
            const fill = delta >= 0
                ? (optionString(layer.mark.options, 'positiveColor') ??
                    theme.colors.palette[2] ??
                    '#10b981')
                : (optionString(layer.mark.options, 'negativeColor') ??
                    theme.colors.palette[3] ??
                    '#ef4444');
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:waterfall:${rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                }),
                x: x - width / 2,
                y: Math.min(y1, y2),
                width,
                height: Math.max(1, Math.abs(y2 - y1)),
                fill,
                lineWidth: 0,
                cornerRadius: layer.mark.cornerRadius ?? 2,
            });
            const nextInput = rowIndex + 1 < table.length ? scaleInput(table.value(rowIndex + 1, layer.x.field)) : null;
            if (nextInput !== null) {
                const nextX = xScale.map(nextInput);
                nodes.push({
                    type: 'line',
                    ...nodeBase(`${layer.id}:connector:${rowIndex}`, { zIndex: layer.zIndex - 0.1 }),
                    x1: x + width / 2,
                    y1: y2,
                    x2: nextX - width / 2,
                    y2,
                    stroke: theme.colors.axis,
                    lineWidth: 1,
                    dash: [3, 3],
                });
            }
        }
        return nodes;
    };
    const compileDiffMark = (context) => {
        const { table, layer, xScale, yScale, theme, performance, plot } = context;
        const oldField = layer.mark.fields.old ?? 'old';
        const newField = layer.mark.fields.new ?? layer.y.field;
        const width = Math.max(4, xScale instanceof BandScale
            ? xScale.bandwidth * 0.64
            : (plot.width / Math.max(1, table.length)) * 0.62);
        const baseline = yScale.map(0);
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            const oldValue = numericDataValue(table.value(rowIndex, oldField));
            const newValue = numericDataValue(table.value(rowIndex, newField));
            if (xInput === null || oldValue === null || newValue === null)
                continue;
            const x = xScale.map(xInput);
            const oldY = yScale.map(oldValue);
            const newY = yScale.map(newValue);
            if (![x, oldY, newY, baseline].every(Number.isFinite))
                continue;
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:old:${rowIndex}`, { zIndex: layer.zIndex, opacity: 0.28 }),
                x: x - width / 2,
                y: Math.min(oldY, baseline),
                width,
                height: Math.max(1, Math.abs(baseline - oldY)),
                fill: optionString(layer.mark.options, 'oldColor') ?? theme.colors.mutedText,
                lineWidth: 0,
                cornerRadius: layer.mark.cornerRadius ?? 2,
            });
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:new:${rowIndex}`, {
                    zIndex: layer.zIndex + 0.1,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                }),
                x: x - width * 0.32,
                y: Math.min(newY, baseline),
                width: width * 0.64,
                height: Math.max(1, Math.abs(baseline - newY)),
                fill: layer.mark.fill ?? theme.colors.focus,
                lineWidth: 0,
                cornerRadius: layer.mark.cornerRadius ?? 2,
            });
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:delta:${rowIndex}`, { zIndex: layer.zIndex + 0.2 }),
                x1: x,
                y1: oldY,
                x2: x,
                y2: newY,
                stroke: theme.colors.text,
                lineWidth: 1.5,
            });
        }
        return nodes;
    };
    const compileAnnotationMark = (context) => {
        const nodes = [...compileLineMark(context)];
        const { table, layer, xScale, plot, theme } = context;
        const titleField = layer.mark.fields.annotation ?? 'annotation';
        const textField = layer.mark.fields.annotationText;
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            if (!table.has(titleField))
                break;
            const annotation = table.value(rowIndex, titleField);
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            if (annotation === null || annotation === undefined || annotation === '' || xInput === null)
                continue;
            const x = xScale.map(xInput);
            if (!Number.isFinite(x))
                continue;
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:annotation-line:${rowIndex}`, { zIndex: layer.zIndex + 0.5 }),
                x1: x,
                y1: plot.y,
                x2: x,
                y2: plot.y + plot.height,
                stroke: layer.mark.stroke ?? theme.colors.focus,
                lineWidth: 1.25,
                dash: [4, 3],
            });
            const suffix = textField !== undefined && table.has(textField)
                ? table.value(rowIndex, textField)
                : undefined;
            nodes.push(textNode$1(`${layer.id}:annotation-label:${rowIndex}`, Math.min(plot.x + plot.width - 4, x + 5), plot.y + 8, suffix === undefined || suffix === null
                ? String(annotation)
                : `${String(annotation)} — ${String(suffix)}`, context, { align: 'left', baseline: 'top', size: 10, weight: 650 }));
        }
        return nodes;
    };
    const compileVegaMark = (context) => {
        const mark = optionString(context.layer.mark.options, 'mark') ?? 'line';
        if (mark === 'bar')
            return compileBarMark(context);
        if (mark === 'area')
            return compileAreaMark(context);
        if (mark === 'point' || mark === 'circle')
            return compilePointMark(context);
        return compileLineMark(context);
    };

    function optionNumber$1(options, name, fallback) {
        const value = options[name];
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }
    function arcPoints(cx, cy, outerRadius, startAngle, endAngle, innerRadius) {
        const span = Math.abs(endAngle - startAngle);
        const steps = Math.max(8, Math.ceil((span / (Math.PI * 2)) * 72));
        const outer = Array.from({ length: steps + 1 }, (_, index) => {
            const angle = startAngle + ((endAngle - startAngle) * index) / steps;
            return { x: cx + Math.cos(angle) * outerRadius, y: cy + Math.sin(angle) * outerRadius };
        });
        if (innerRadius <= 0)
            return [{ x: cx, y: cy }, ...outer];
        const inner = Array.from({ length: steps + 1 }, (_, index) => {
            const angle = endAngle - ((endAngle - startAngle) * index) / steps;
            return { x: cx + Math.cos(angle) * innerRadius, y: cy + Math.sin(angle) * innerRadius };
        });
        return [...outer, ...inner];
    }
    function labelNode(id, x, y, text, context, fontSize = 12) {
        return {
            type: 'text',
            ...nodeBase(id, { zIndex: context.layer.zIndex + 1 }),
            x,
            y,
            text,
            fill: context.theme.colors.text,
            fontFamily: context.theme.typography.fontFamily,
            fontSize,
            fontWeight: 600,
            align: 'center',
            baseline: 'middle',
            rotation: 0,
        };
    }
    const compilePieMark = (context) => {
        const { table, layer, plot, theme, performance } = context;
        const values = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            const rawLabel = table.value(rowIndex, layer.x.field);
            if (value === null || value <= 0 || rawLabel === null || rawLabel === undefined)
                continue;
            values.push({ rowIndex, value, label: String(rawLabel) });
        }
        const total = values.reduce((sum, item) => sum + item.value, 0);
        if (total <= 0)
            return [];
        const cx = plot.x + plot.width / 2;
        const cy = plot.y + plot.height / 2;
        const radius = Math.max(8, Math.min(plot.width, plot.height) * 0.39);
        const innerRatio = Math.max(0, Math.min(0.9, optionNumber$1(layer.mark.options, 'innerRadius', 0)));
        const innerRadius = radius * innerRatio;
        const startOffset = optionNumber$1(layer.mark.options, 'startAngle', -Math.PI / 2);
        const labelLimit = Math.max(0, Math.floor(optionNumber$1(layer.mark.options, 'labelLimit', 8)));
        const nodes = [];
        let angle = startOffset;
        values.forEach((item, index) => {
            const next = angle + (item.value / total) * Math.PI * 2;
            const mid = (angle + next) / 2;
            const fill = theme.colors.palette[index % theme.colors.palette.length] ?? theme.colors.focus;
            const wedge = {
                type: 'path',
                ...nodeBase(`${layer.id}:slice:${item.rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
                }),
                points: arcPoints(cx, cy, radius, angle, next, innerRadius),
                closed: true,
                fill,
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 2,
            };
            nodes.push(wedge);
            if (index < labelLimit && next - angle >= 0.18) {
                const labelRadius = innerRadius > 0 ? (innerRadius + radius) / 2 : radius * 0.65;
                nodes.push(labelNode(`${layer.id}:label:${item.rowIndex}`, cx + Math.cos(mid) * labelRadius, cy + Math.sin(mid) * labelRadius, item.label, context, 11));
            }
            angle = next;
        });
        return nodes;
    };
    const compileGaugeMark = (context) => {
        const { table, layer, plot, theme, performance } = context;
        const minimum = optionNumber$1(layer.mark.options, 'min', 0);
        const maximum = optionNumber$1(layer.mark.options, 'max', 100);
        const span = maximum - minimum || 1;
        const count = Math.max(1, table.length);
        const slotWidth = plot.width / count;
        const radius = Math.max(12, Math.min(slotWidth * 0.42, plot.height * 0.36));
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            const label = table.value(rowIndex, layer.x.field);
            if (value === null || label === null || label === undefined)
                continue;
            const ratio = Math.max(0, Math.min(1, (value - minimum) / span));
            const cx = plot.x + slotWidth * (rowIndex + 0.5);
            const cy = plot.y + plot.height * 0.62;
            const inner = radius * 0.72;
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:gauge-background:${rowIndex}`, { zIndex: layer.zIndex }),
                points: arcPoints(cx, cy, radius, Math.PI, Math.PI * 2, inner),
                closed: true,
                fill: theme.colors.grid,
                lineWidth: 0,
            });
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:gauge-value:${rowIndex}`, {
                    zIndex: layer.zIndex + 0.1,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                }),
                points: arcPoints(cx, cy, radius, Math.PI, Math.PI + Math.PI * ratio, inner),
                closed: true,
                fill: layer.mark.fill ??
                    theme.colors.palette[rowIndex % theme.colors.palette.length] ??
                    theme.colors.focus,
                lineWidth: 0,
            });
            const needleAngle = Math.PI + Math.PI * ratio;
            const needle = {
                type: 'line',
                ...nodeBase(`${layer.id}:gauge-needle:${rowIndex}`, { zIndex: layer.zIndex + 0.5 }),
                x1: cx,
                y1: cy,
                x2: cx + Math.cos(needleAngle) * radius * 0.62,
                y2: cy + Math.sin(needleAngle) * radius * 0.62,
                stroke: theme.colors.text,
                lineWidth: 2,
            };
            nodes.push(needle);
            nodes.push(labelNode(`${layer.id}:gauge-value-label:${rowIndex}`, cx, cy + 18, String(value), context, 16));
            nodes.push(labelNode(`${layer.id}:gauge-label:${rowIndex}`, cx, cy + 39, String(label), context, 11));
        }
        return nodes;
    };

    function optionNumber(options, name, fallback) {
        const value = options[name];
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }
    function optionStrings(options, name) {
        const value = options[name];
        return Array.isArray(value) && value.every((item) => typeof item === 'string')
            ? value
            : undefined;
    }
    function textNode(id, x, y, text, context, options = {}) {
        return {
            type: 'text',
            ...nodeBase(id, { zIndex: context.layer.zIndex + 2 }),
            x,
            y,
            text,
            fill: options.fill ?? context.theme.colors.text,
            fontFamily: context.theme.typography.fontFamily,
            fontSize: options.size ?? context.theme.typography.fontSize,
            fontWeight: options.weight ?? 500,
            align: options.align ?? 'center',
            baseline: options.baseline ?? 'middle',
            rotation: 0,
        };
    }
    function hexChannel(color, index) {
        const normalized = color.replace('#', '');
        const offset = normalized.length === 3 ? index : index * 2;
        const raw = normalized.length === 3 ? normalized[offset]?.repeat(2) : normalized.slice(offset, offset + 2);
        return Number.parseInt(raw ?? '00', 16);
    }
    function mixColor(start, end, ratio) {
        const bounded = Math.max(0, Math.min(1, ratio));
        const channels = [0, 1, 2].map((index) => Math.round(hexChannel(start, index) + (hexChannel(end, index) - hexChannel(start, index)) * bounded));
        return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
    }
    const compileCalendarMark = (context) => {
        const { table, layer, plot, theme, performance } = context;
        const values = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const rawDate = table.value(rowIndex, layer.x.field);
            const date = rawDate instanceof Date ? rawDate : new Date(String(rawDate));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (!Number.isFinite(date.getTime()) || value === null)
                continue;
            values.push({ rowIndex, date, value });
        }
        if (values.length === 0)
            return [];
        values.sort((left, right) => left.date.getTime() - right.date.getTime());
        const minimum = Math.min(...values.map((item) => item.value));
        const maximum = Math.max(...values.map((item) => item.value));
        const first = values[0]?.date;
        if (first === undefined)
            return [];
        const start = new Date(Date.UTC(first.getUTCFullYear(), 0, 1));
        const day = 24 * 60 * 60 * 1000;
        const weekCount = Math.max(1, Math.ceil((Math.max(...values.map((item) => item.date.getTime())) - start.getTime()) / day / 7) + 1);
        const gap = 2;
        const cell = Math.max(3, Math.min((plot.width - 36) / weekCount - gap, (plot.height - 34) / 7 - gap));
        const originX = plot.x + 34;
        const originY = plot.y + 20;
        const nodes = [];
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((label, index) => nodes.push(textNode(`${layer.id}:weekday:${index}`, plot.x + 18, originY + index * (cell + gap) + cell / 2, label, context, { size: 9 })));
        values.forEach((item) => {
            const offset = Math.floor((item.date.getTime() - start.getTime()) / day);
            const week = Math.floor((offset + start.getUTCDay()) / 7);
            const weekday = item.date.getUTCDay();
            const ratio = maximum === minimum ? 0.6 : (item.value - minimum) / (maximum - minimum);
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:day:${item.rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
                }),
                x: originX + week * (cell + gap),
                y: originY + weekday * (cell + gap),
                width: cell,
                height: cell,
                fill: mixColor(theme.colors.sequential[0] ?? '#eff6ff', theme.colors.sequential.at(-1) ?? '#1e3a8a', ratio),
                stroke: theme.colors.background,
                lineWidth: 0.5,
                cornerRadius: Math.min(2, cell * 0.15),
            });
        });
        return nodes;
    };
    const countryCentroids = {
        KR: [127.8, 36.4],
        KOREA: [127.8, 36.4],
        US: [-98.5, 39.5],
        USA: [-98.5, 39.5],
        CA: [-106, 56],
        CANADA: [-106, 56],
        BR: [-51.9, -14.2],
        BRAZIL: [-51.9, -14.2],
        GB: [-3.4, 55.4],
        UK: [-3.4, 55.4],
        FR: [2.2, 46.2],
        DE: [10.4, 51.2],
        RU: [105.3, 61.5],
        RUSSIA: [105.3, 61.5],
        IN: [78.9, 20.6],
        INDIA: [78.9, 20.6],
        CN: [104.2, 35.9],
        CHINA: [104.2, 35.9],
        JP: [138.3, 36.2],
        JAPAN: [138.3, 36.2],
        AU: [133.8, -25.3],
        AUSTRALIA: [133.8, -25.3],
        ZA: [22.9, -30.6],
    };
    const continents = [
        [
            [-168, 72],
            [-52, 72],
            [-60, 15],
            [-100, 8],
            [-126, 30],
        ],
        [
            [-82, 12],
            [-34, 6],
            [-52, -56],
            [-76, -50],
        ],
        [
            [-12, 70],
            [42, 70],
            [55, 35],
            [15, 34],
            [-10, 45],
        ],
        [
            [-18, 35],
            [52, 35],
            [48, -35],
            [12, -35],
            [-5, 5],
        ],
        [
            [35, 72],
            [178, 70],
            [150, 5],
            [95, 2],
            [55, 28],
        ],
        [
            [112, -10],
            [155, -10],
            [153, -44],
            [116, -38],
        ],
    ];
    function project(plot, longitude, latitude) {
        return {
            x: plot.x + ((longitude + 180) / 360) * plot.width,
            y: plot.y + ((90 - latitude) / 180) * plot.height,
        };
    }
    function worldBackground(context) {
        return continents.map((polygon, index) => ({
            type: 'path',
            ...nodeBase(`${context.layer.id}:continent:${index}`, {
                zIndex: context.layer.zIndex - 2,
                opacity: 0.86,
            }),
            points: polygon.map(([longitude, latitude]) => project(context.plot, longitude, latitude)),
            closed: true,
            fill: context.theme.colors.grid,
            stroke: context.theme.colors.axis,
            lineWidth: 0.8,
        }));
    }
    const compileGeoMark = (context) => {
        const { table, layer, plot, theme, performance } = context;
        const nodes = worldBackground(context);
        const extent = table.extent(layer.y.field);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const region = String(table.value(rowIndex, layer.x.field) ?? '').trim();
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            const centroid = countryCentroids[region.toUpperCase()];
            if (centroid === undefined || value === null)
                continue;
            const ratio = extent === null || extent[1] === extent[0]
                ? 0.6
                : (value - extent[0]) / (extent[1] - extent[0]);
            const point = project(plot, centroid[0], centroid[1]);
            nodes.push({
                type: 'circle',
                ...nodeBase(`${layer.id}:region:${rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                }),
                cx: point.x,
                cy: point.y,
                radius: 5 + Math.sqrt(Math.max(0, ratio)) * 12,
                fill: layer.mark.fill ?? theme.colors.focus,
                stroke: theme.colors.background,
                lineWidth: 1.5,
            });
        }
        return nodes;
    };
    const compileMapMark = (context) => {
        const { table, layer, plot, theme, performance } = context;
        const nodes = worldBackground(context);
        const sizeField = layer.mark.fields.size;
        const extent = sizeField === undefined || !table.has(sizeField) ? null : table.extent(sizeField);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
            const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
            if (longitude === null || latitude === null)
                continue;
            const rawSize = sizeField === undefined ? null : numericDataValue(table.value(rowIndex, sizeField));
            const ratio = rawSize === null || extent === null || extent[1] === extent[0]
                ? 0.5
                : (rawSize - extent[0]) / (extent[1] - extent[0]);
            const point = project(plot, longitude, latitude);
            nodes.push({
                type: 'circle',
                ...nodeBase(`${layer.id}:map-point:${rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                }),
                cx: point.x,
                cy: point.y,
                radius: layer.mark.radius ?? 5 + Math.sqrt(Math.max(0, ratio)) * 10,
                fill: layer.mark.fill ?? theme.colors.focus,
                stroke: theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 1.5,
            });
        }
        return nodes;
    };
    function treeItems(context) {
        const { table, layer } = context;
        const parentField = layer.mark.fields.parent ?? layer.y.field;
        const weightField = layer.mark.fields.weight;
        const idField = layer.mark.fields.id ?? layer.x.field;
        const items = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const rawId = table.value(rowIndex, idField);
            if (rawId === null || rawId === undefined)
                continue;
            const rawParent = table.has(parentField) ? table.value(rowIndex, parentField) : null;
            const weight = weightField !== undefined && table.has(weightField)
                ? (numericDataValue(table.value(rowIndex, weightField)) ?? 1)
                : (numericDataValue(table.value(rowIndex, layer.y.field)) ?? 1);
            items.push({
                rowIndex,
                id: String(rawId),
                parent: rawParent === null || rawParent === undefined ? '' : String(rawParent),
                weight,
            });
        }
        return items;
    }
    function treeDepths(items) {
        const parents = new Map(items.map((item) => [item.id, item.parent]));
        const depths = new Map();
        const resolve = (id, trail) => {
            const existing = depths.get(id);
            if (existing !== undefined)
                return existing;
            const parent = parents.get(id);
            if (parent === undefined || parent === '' || !parents.has(parent) || trail.has(id)) {
                depths.set(id, 0);
                return 0;
            }
            const nextTrail = new Set(trail);
            nextTrail.add(id);
            const depth = resolve(parent, nextTrail) + 1;
            depths.set(id, depth);
            return depth;
        };
        items.forEach((item) => resolve(item.id, new Set()));
        return depths;
    }
    const compileOrgMark = (context) => {
        const { layer, plot, theme, table, performance } = context;
        const items = treeItems(context);
        const depths = treeDepths(items);
        const groups = new Map();
        items.forEach((item) => {
            const depth = depths.get(item.id) ?? 0;
            const group = groups.get(depth) ?? [];
            group.push(item);
            groups.set(depth, group);
        });
        const maxDepth = Math.max(0, ...groups.keys());
        const positions = new Map();
        const nodeWidth = Math.max(64, Math.min(128, plot.width / Math.max(2, Math.max(...[...groups.values()].map((group) => group.length))) - 16));
        const nodeHeight = Math.max(28, Math.min(44, plot.height / Math.max(2, maxDepth + 1) - 18));
        for (const [depth, group] of groups) {
            group.forEach((item, index) => {
                positions.set(item.id, {
                    x: plot.x + (plot.width * (index + 1)) / (group.length + 1),
                    y: plot.y + (plot.height * (depth + 0.5)) / Math.max(1, maxDepth + 1),
                });
            });
        }
        const nodes = [];
        items.forEach((item) => {
            const position = positions.get(item.id);
            const parent = positions.get(item.parent);
            if (position === undefined || parent === undefined)
                return;
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:edge:${item.rowIndex}`, { zIndex: layer.zIndex - 1 }),
                x1: parent.x,
                y1: parent.y + nodeHeight / 2,
                x2: position.x,
                y2: position.y - nodeHeight / 2,
                stroke: theme.colors.axis,
                lineWidth: 1.3,
            });
        });
        items.forEach((item) => {
            const position = positions.get(item.id);
            if (position === undefined)
                return;
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:node:${item.rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
                }),
                x: position.x - nodeWidth / 2,
                y: position.y - nodeHeight / 2,
                width: nodeWidth,
                height: nodeHeight,
                fill: layer.mark.fill ?? theme.colors.surface,
                stroke: layer.mark.stroke ?? theme.colors.focus,
                lineWidth: layer.mark.lineWidth ?? 1.5,
                cornerRadius: layer.mark.cornerRadius ?? 7,
            });
            nodes.push(textNode(`${layer.id}:node-label:${item.rowIndex}`, position.x, position.y, item.id, context, { size: 10, weight: 650 }));
        });
        return nodes;
    };
    const compileSankeyMark = (context) => {
        const { table, layer, plot, theme, performance } = context;
        const targetField = layer.mark.fields.target ?? 'target';
        const edges = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const source = table.value(rowIndex, layer.x.field);
            const target = table.has(targetField) ? table.value(rowIndex, targetField) : null;
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (source === null ||
                source === undefined ||
                target === null ||
                target === undefined ||
                value === null ||
                value <= 0)
                continue;
            edges.push({ rowIndex, source: String(source), target: String(target), value });
        }
        const sources = [...new Set(edges.map((edge) => edge.source))];
        const targets = [...new Set(edges.map((edge) => edge.target))];
        const sourceTotals = new Map(sources.map((source) => [
            source,
            edges.filter((edge) => edge.source === source).reduce((sum, edge) => sum + edge.value, 0),
        ]));
        const targetTotals = new Map(targets.map((target) => [
            target,
            edges.filter((edge) => edge.target === target).reduce((sum, edge) => sum + edge.value, 0),
        ]));
        const maxTotal = Math.max(1, ...sourceTotals.values(), ...targetTotals.values());
        const nodeWidth = 14;
        const sourcePositions = new Map();
        const targetPositions = new Map();
        const position = (names, totals, output) => {
            const gap = 12;
            const available = Math.max(1, plot.height - gap * Math.max(0, names.length - 1));
            const sum = names.reduce((total, name) => total + (totals.get(name) ?? 0), 0) || 1;
            let y = plot.y;
            names.forEach((name) => {
                const height = Math.max(10, ((totals.get(name) ?? 0) / sum) * available);
                output.set(name, { y, height });
                y += height + gap;
            });
        };
        position(sources, sourceTotals, sourcePositions);
        position(targets, targetTotals, targetPositions);
        const sourceOffsets = new Map();
        const targetOffsets = new Map();
        const nodes = [];
        edges.forEach((edge, index) => {
            const source = sourcePositions.get(edge.source);
            const target = targetPositions.get(edge.target);
            if (source === undefined || target === undefined)
                return;
            const sourceHeight = Math.max(2, (edge.value / (sourceTotals.get(edge.source) ?? maxTotal)) * source.height);
            const targetHeight = Math.max(2, (edge.value / (targetTotals.get(edge.target) ?? maxTotal)) * target.height);
            const sy = source.y + (sourceOffsets.get(edge.source) ?? 0);
            const ty = target.y + (targetOffsets.get(edge.target) ?? 0);
            sourceOffsets.set(edge.source, (sourceOffsets.get(edge.source) ?? 0) + sourceHeight);
            targetOffsets.set(edge.target, (targetOffsets.get(edge.target) ?? 0) + targetHeight);
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:flow:${edge.rowIndex}`, {
                    zIndex: layer.zIndex - 0.5,
                    opacity: Math.min(0.75, layer.mark.opacity * 0.55),
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex: edge.rowIndex, datum: table.row(edge.rowIndex) },
                }),
                points: [
                    { x: plot.x + nodeWidth, y: sy },
                    { x: plot.x + plot.width * 0.46, y: sy },
                    { x: plot.x + plot.width * 0.54, y: ty },
                    { x: plot.x + plot.width - nodeWidth, y: ty },
                    { x: plot.x + plot.width - nodeWidth, y: ty + targetHeight },
                    { x: plot.x + plot.width * 0.54, y: ty + targetHeight },
                    { x: plot.x + plot.width * 0.46, y: sy + sourceHeight },
                    { x: plot.x + nodeWidth, y: sy + sourceHeight },
                ],
                closed: true,
                fill: theme.colors.palette[index % theme.colors.palette.length] ?? theme.colors.focus,
                lineWidth: 0,
            });
        });
        sources.forEach((name, index) => {
            const item = sourcePositions.get(name);
            if (item === undefined)
                return;
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:source:${index}`, { zIndex: layer.zIndex }),
                x: plot.x,
                y: item.y,
                width: nodeWidth,
                height: item.height,
                fill: theme.colors.palette[index % theme.colors.palette.length] ?? theme.colors.focus,
                lineWidth: 0,
                cornerRadius: 2,
            });
            nodes.push(textNode(`${layer.id}:source-label:${index}`, plot.x + nodeWidth + 5, item.y + item.height / 2, name, context, { align: 'left', size: 10 }));
        });
        targets.forEach((name, index) => {
            const item = targetPositions.get(name);
            if (item === undefined)
                return;
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:target:${index}`, { zIndex: layer.zIndex }),
                x: plot.x + plot.width - nodeWidth,
                y: item.y,
                width: nodeWidth,
                height: item.height,
                fill: theme.colors.palette[(sources.length + index) % theme.colors.palette.length] ??
                    theme.colors.focus,
                lineWidth: 0,
                cornerRadius: 2,
            });
            nodes.push(textNode(`${layer.id}:target-label:${index}`, plot.x + plot.width - nodeWidth - 5, item.y + item.height / 2, name, context, { align: 'right', size: 10 }));
        });
        return nodes;
    };
    const compileTableMark = (context) => {
        const { table, layer, plot, theme, performance } = context;
        const columns = optionStrings(layer.mark.options, 'columns')?.filter((field) => table.has(field)) ?? [layer.x.field, layer.y.field];
        const uniqueColumns = [...new Set(columns)];
        const headerHeight = 30;
        const rowHeight = Math.max(22, optionNumber(layer.mark.options, 'rowHeight', 28));
        const maximumRows = Math.max(0, Math.floor((plot.height - headerHeight) / rowHeight));
        const visibleRows = Math.min(table.length, maximumRows);
        const columnWidth = plot.width / Math.max(1, uniqueColumns.length);
        const nodes = [];
        uniqueColumns.forEach((field, columnIndex) => {
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:header-cell:${columnIndex}`, { zIndex: layer.zIndex }),
                x: plot.x + columnIndex * columnWidth,
                y: plot.y,
                width: columnWidth,
                height: headerHeight,
                fill: theme.colors.grid,
                stroke: theme.colors.axis,
                lineWidth: 0.5,
                cornerRadius: 0,
            });
            nodes.push(textNode(`${layer.id}:header-label:${columnIndex}`, plot.x + columnIndex * columnWidth + 8, plot.y + headerHeight / 2, field, context, { align: 'left', size: 10, weight: 700 }));
        });
        for (let rowIndex = 0; rowIndex < visibleRows; rowIndex += 1) {
            uniqueColumns.forEach((field, columnIndex) => {
                const y = plot.y + headerHeight + rowIndex * rowHeight;
                nodes.push({
                    type: 'rect',
                    ...nodeBase(`${layer.id}:cell:${rowIndex}:${columnIndex}`, {
                        zIndex: layer.zIndex,
                        opacity: layer.mark.opacity,
                        interactive: performance.enableHitTesting,
                        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                    }),
                    x: plot.x + columnIndex * columnWidth,
                    y,
                    width: columnWidth,
                    height: rowHeight,
                    fill: rowIndex % 2 === 0 ? theme.colors.surface : theme.colors.background,
                    stroke: theme.colors.grid,
                    lineWidth: 0.5,
                    cornerRadius: 0,
                });
                nodes.push(textNode(`${layer.id}:cell-label:${rowIndex}:${columnIndex}`, plot.x + columnIndex * columnWidth + 8, y + rowHeight / 2, String(table.value(rowIndex, field) ?? ''), context, { align: 'left', size: 10 }));
            });
        }
        return nodes;
    };
    function compileTimeline(context, gantt) {
        const { table, layer, xScale, yScale, theme, performance } = context;
        const endField = layer.mark.fields.end ?? 'end';
        const progressField = layer.mark.fields.progress;
        const idField = layer.mark.fields.id;
        const dependencyField = layer.mark.fields.dependencies;
        const barHeight = Math.max(8, yScale instanceof BandScale ? yScale.bandwidth * 0.58 : 18);
        const nodes = [];
        const positions = new Map();
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const start = scaleInput(table.value(rowIndex, layer.x.field));
            const end = table.has(endField) ? scaleInput(table.value(rowIndex, endField)) : null;
            const row = scaleInput(table.value(rowIndex, layer.y.field));
            if (start === null || end === null || row === null)
                continue;
            const x1 = xScale.map(start);
            const x2 = xScale.map(end);
            const y = yScale.map(row);
            if (![x1, x2, y].every(Number.isFinite))
                continue;
            const fill = theme.colors.palette[rowIndex % theme.colors.palette.length] ?? theme.colors.focus;
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:${gantt ? 'task' : 'interval'}:${rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                }),
                x: Math.min(x1, x2),
                y: y - barHeight / 2,
                width: Math.max(2, Math.abs(x2 - x1)),
                height: barHeight,
                fill: layer.mark.fill ?? fill,
                ...(layer.mark.stroke === undefined ? {} : { stroke: layer.mark.stroke }),
                lineWidth: layer.mark.lineWidth ?? 0,
                cornerRadius: layer.mark.cornerRadius ?? 4,
            });
            if (gantt && progressField !== undefined && table.has(progressField)) {
                const progress = numericDataValue(table.value(rowIndex, progressField));
                if (progress !== null) {
                    nodes.push({
                        type: 'rect',
                        ...nodeBase(`${layer.id}:progress:${rowIndex}`, {
                            zIndex: layer.zIndex + 0.1,
                            opacity: 0.45,
                        }),
                        x: Math.min(x1, x2),
                        y: y - barHeight / 2,
                        width: Math.max(0, (Math.abs(x2 - x1) * Math.max(0, Math.min(100, progress))) / 100),
                        height: barHeight,
                        fill: theme.colors.text,
                        lineWidth: 0,
                        cornerRadius: layer.mark.cornerRadius ?? 4,
                    });
                }
            }
            if (idField !== undefined && table.has(idField)) {
                positions.set(String(table.value(rowIndex, idField)), {
                    x: Math.max(x1, x2),
                    y,
                    width: Math.abs(x2 - x1),
                });
            }
        }
        if (gantt &&
            dependencyField !== undefined &&
            idField !== undefined &&
            table.has(dependencyField)) {
            for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
                const id = String(table.value(rowIndex, idField) ?? '');
                const task = positions.get(id);
                const dependencies = String(table.value(rowIndex, dependencyField) ?? '')
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean);
                if (task === undefined)
                    continue;
                dependencies.forEach((dependency, index) => {
                    const parent = positions.get(dependency);
                    if (parent === undefined)
                        return;
                    nodes.push({
                        type: 'line',
                        ...nodeBase(`${layer.id}:dependency:${rowIndex}:${index}`, {
                            zIndex: layer.zIndex + 0.5,
                        }),
                        x1: parent.x,
                        y1: parent.y,
                        x2: task.x - task.width,
                        y2: task.y,
                        stroke: theme.colors.axis,
                        lineWidth: 1.2,
                        dash: [4, 2],
                    });
                });
            }
        }
        return nodes;
    }
    const compileTimelineMark = (context) => compileTimeline(context, false);
    const compileGanttMark = (context) => compileTimeline(context, true);
    const compileTreemapMark = (context) => {
        const { table, layer, plot, theme, performance } = context;
        const items = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const label = table.value(rowIndex, layer.x.field);
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (label === null || label === undefined || value === null || value <= 0)
                continue;
            items.push({ rowIndex, label: String(label), value });
        }
        const total = items.reduce((sum, item) => sum + item.value, 0);
        if (total <= 0)
            return [];
        const nodes = [];
        let x = plot.x;
        items.forEach((item, index) => {
            const width = index === items.length - 1 ? plot.x + plot.width - x : (item.value / total) * plot.width;
            const fill = theme.colors.palette[index % theme.colors.palette.length] ?? theme.colors.focus;
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:treemap:${item.rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
                }),
                x,
                y: plot.y,
                width: Math.max(1, width),
                height: plot.height,
                fill: layer.mark.fill ?? fill,
                stroke: theme.colors.background,
                lineWidth: 2,
                cornerRadius: layer.mark.cornerRadius ?? 3,
            });
            if (width > 42) {
                nodes.push(textNode(`${layer.id}:treemap-label:${item.rowIndex}`, x + width / 2, plot.y + plot.height / 2, item.label, context, { size: Math.max(9, Math.min(15, width / 8)), weight: 700, fill: '#ffffff' }));
            }
            x += width;
        });
        return nodes;
    };
    const compileWordTreeMark = (context) => {
        const { layer, plot, theme, table, performance } = context;
        const items = treeItems(context);
        const depths = treeDepths(items);
        const groups = new Map();
        items.forEach((item) => {
            const depth = depths.get(item.id) ?? 0;
            const group = groups.get(depth) ?? [];
            group.push(item);
            groups.set(depth, group);
        });
        const maxDepth = Math.max(0, ...groups.keys());
        const positions = new Map();
        for (const [depth, group] of groups) {
            group.forEach((item, index) => {
                positions.set(item.id, {
                    x: plot.x + (plot.width * (depth + 0.5)) / Math.max(1, maxDepth + 1),
                    y: plot.y + (plot.height * (index + 1)) / (group.length + 1),
                });
            });
        }
        const maximumWeight = Math.max(1, ...items.map((item) => item.weight));
        const nodes = [];
        items.forEach((item) => {
            const position = positions.get(item.id);
            const parent = positions.get(item.parent);
            if (position === undefined)
                return;
            if (parent !== undefined) {
                nodes.push({
                    type: 'line',
                    ...nodeBase(`${layer.id}:branch:${item.rowIndex}`, { zIndex: layer.zIndex - 1 }),
                    x1: parent.x,
                    y1: parent.y,
                    x2: position.x,
                    y2: position.y,
                    stroke: theme.colors.grid,
                    lineWidth: 1.5,
                });
            }
            const fontSize = 10 + Math.sqrt(item.weight / maximumWeight) * 16;
            const label = textNode(`${layer.id}:word:${item.rowIndex}`, position.x, position.y, item.id, context, {
                size: fontSize,
                weight: 650,
                fill: theme.colors.palette[(depths.get(item.id) ?? 0) % theme.colors.palette.length] ??
                    theme.colors.focus,
            });
            Object.assign(label, {
                interactive: performance.enableHitTesting,
                datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
            });
            nodes.push(label);
        });
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
        registry.registerMark('annotation', compileAnnotationMark);
        registry.registerMark('bubble', compileBubbleMark);
        registry.registerMark('calendar', compileCalendarMark);
        registry.registerMark('candlestick', compileCandlestickMark);
        registry.registerMark('diff', compileDiffMark);
        registry.registerMark('gantt', compileGanttMark);
        registry.registerMark('gauge', compileGaugeMark);
        registry.registerMark('geo', compileGeoMark);
        registry.registerMark('histogram', compileHistogramMark);
        registry.registerMark('interval', compileIntervalMark);
        registry.registerMark('map', compileMapMark);
        registry.registerMark('motion', compileBubbleMark);
        registry.registerMark('org', compileOrgMark);
        registry.registerMark('pie', compilePieMark);
        registry.registerMark('sankey', compileSankeyMark);
        registry.registerMark('stepped-area', compileSteppedAreaMark);
        registry.registerMark('table', compileTableMark);
        registry.registerMark('timeline', compileTimelineMark);
        registry.registerMark('treemap', compileTreemapMark);
        registry.registerMark('trendline', compileTrendlineMark);
        registry.registerMark('vega', compileVegaMark);
        registry.registerMark('waterfall', compileWaterfallMark);
        registry.registerMark('word-tree', compileWordTreeMark);
        return registry;
    }
    const defaultRegistry = createDefaultRegistry();

    const chartTypeCatalog = [
        { id: 'annotation', name: 'Annotation chart', quickApi: 'annotation', mark: 'annotation' },
        {
            id: 'annotated-timeline',
            name: 'Annotated timeline',
            quickApi: 'annotatedTimeline',
            mark: 'annotation',
        },
        { id: 'area', name: 'Area chart', quickApi: 'area', mark: 'area' },
        { id: 'bar', name: 'Bar chart', quickApi: 'horizontalBar', mark: 'bar' },
        { id: 'bubble', name: 'Bubble chart', quickApi: 'bubble', mark: 'bubble' },
        { id: 'calendar', name: 'Calendar chart', quickApi: 'calendar', mark: 'calendar' },
        { id: 'candlestick', name: 'Candlestick chart', quickApi: 'candlestick', mark: 'candlestick' },
        { id: 'column', name: 'Column chart', quickApi: 'column', mark: 'bar' },
        { id: 'combo', name: 'Combo chart', quickApi: 'combo', mark: 'multiple' },
        { id: 'diff', name: 'Diff chart', quickApi: 'diff', mark: 'diff' },
        { id: 'donut', name: 'Donut chart', quickApi: 'donut', mark: 'pie' },
        { id: 'gantt', name: 'Gantt chart', quickApi: 'gantt', mark: 'gantt' },
        { id: 'gauge', name: 'Gauge chart', quickApi: 'gauge', mark: 'gauge' },
        { id: 'geo', name: 'GeoChart', quickApi: 'geo', mark: 'geo' },
        { id: 'histogram', name: 'Histogram', quickApi: 'histogram', mark: 'histogram' },
        { id: 'intervals', name: 'Intervals', quickApi: 'intervals', mark: 'interval' },
        { id: 'line', name: 'Line chart', quickApi: 'line', mark: 'line' },
        { id: 'map', name: 'Map', quickApi: 'map', mark: 'map' },
        { id: 'motion', name: 'Motion chart', quickApi: 'motion', mark: 'motion' },
        { id: 'org', name: 'Organization chart', quickApi: 'org', mark: 'org' },
        { id: 'pie', name: 'Pie chart', quickApi: 'pie', mark: 'pie' },
        { id: 'sankey', name: 'Sankey diagram', quickApi: 'sankey', mark: 'sankey' },
        { id: 'scatter', name: 'Scatter chart', quickApi: 'scatter', mark: 'point' },
        { id: 'stepped-area', name: 'Stepped area chart', quickApi: 'steppedArea', mark: 'stepped-area' },
        { id: 'table', name: 'Table chart', quickApi: 'table', mark: 'table' },
        { id: 'timeline', name: 'Timeline', quickApi: 'timeline', mark: 'timeline' },
        { id: 'treemap', name: 'Tree map', quickApi: 'treemap', mark: 'treemap' },
        { id: 'trendline', name: 'Trendline', quickApi: 'trendline', mark: 'trendline' },
        { id: 'vega', name: 'VegaChart', quickApi: 'vegaChart', mark: 'vega' },
        { id: 'waterfall', name: 'Waterfall chart', quickApi: 'waterfall', mark: 'waterfall' },
        { id: 'word-tree', name: 'Word tree', quickApi: 'wordTree', mark: 'word-tree' },
    ];

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
    /**
     * Creates a scatter chart. This is the chart-oriented alias of `point()`;
     * both APIs compile to the portable `point` mark in ChartSpec 0.1.
     */
    function scatter(target, data, options) {
        return quickChart(create, 'point', target, data, options);
    }
    function area(target, data, options) {
        return quickChart(create, 'area', target, data, options);
    }
    function specialized(type, target, data, options, markDefaults = {}) {
        return quickChart(create, type, target, data, {
            ...options,
            mark: { ...markDefaults, ...options.mark },
        });
    }
    function annotation(target, data, options) {
        return specialized('annotation', target, data, options, { point: true });
    }
    function annotatedTimeline(target, data, options) {
        return annotation(target, data, options);
    }
    function horizontalBar(target, data, options) {
        return specialized('bar', target, data, options, { orientation: 'horizontal' });
    }
    function column(target, data, options) {
        return specialized('bar', target, data, options, { orientation: 'vertical' });
    }
    function bubble(target, data, options) {
        return specialized('bubble', target, data, options);
    }
    function calendar(target, data, options) {
        return specialized('calendar', target, data, options);
    }
    function candlestick(target, data, options) {
        return specialized('candlestick', target, data, options);
    }
    function combo(target, data, options) {
        return quickCombo(create, target, data, options);
    }
    function diff(target, data, options) {
        return specialized('diff', target, data, options);
    }
    function pie(target, data, options) {
        return specialized('pie', target, data, options);
    }
    function donut(target, data, options) {
        return specialized('pie', target, data, options, { options: { innerRadius: 0.56 } });
    }
    function gantt(target, data, options) {
        return specialized('gantt', target, data, options);
    }
    function gauge(target, data, options) {
        return specialized('gauge', target, data, options);
    }
    function geo(target, data, options) {
        return specialized('geo', target, data, options);
    }
    function histogram(target, data, options) {
        return specialized('histogram', target, data, options);
    }
    function intervals(target, data, options) {
        return specialized('interval', target, data, options);
    }
    const interval = intervals;
    function map(target, data, options) {
        return specialized('map', target, data, options);
    }
    function motion(target, data, options) {
        return specialized('motion', target, data, options);
    }
    function org(target, data, options) {
        return specialized('org', target, data, options);
    }
    function sankey(target, data, options) {
        return specialized('sankey', target, data, options);
    }
    function steppedArea(target, data, options) {
        return specialized('stepped-area', target, data, options);
    }
    function table(target, data, options) {
        return specialized('table', target, data, options);
    }
    function timeline(target, data, options) {
        return specialized('timeline', target, data, options);
    }
    function treemap(target, data, options) {
        return specialized('treemap', target, data, options);
    }
    function trendline(target, data, options) {
        return specialized('trendline', target, data, options);
    }
    function vegaChart(target, data, options) {
        return specialized('vega', target, data, options);
    }
    function waterfall(target, data, options) {
        return specialized('waterfall', target, data, options);
    }
    function wordTree(target, data, options) {
        return specialized('word-tree', target, data, options);
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
    exports.annotatedTimeline = annotatedTimeline;
    exports.annotation = annotation;
    exports.area = area;
    exports.assertValidSpec = assertValidSpec;
    exports.bar = bar;
    exports.bubble = bubble;
    exports.calendar = calendar;
    exports.candlestick = candlestick;
    exports.canvasRendererFactory = canvasRendererFactory;
    exports.capabilities = capabilities;
    exports.chartTypeCatalog = chartTypeCatalog;
    exports.column = column;
    exports.combo = combo;
    exports.compile = compile;
    exports.create = create;
    exports.createRegistry = createRegistry;
    exports.diff = diff;
    exports.donut = donut;
    exports.gantt = gantt;
    exports.gauge = gauge;
    exports.geo = geo;
    exports.graflumeDark = graflumeDark;
    exports.graflumeLight = graflumeLight;
    exports.histogram = histogram;
    exports.hitTestScene = hitTestScene;
    exports.horizontalBar = horizontalBar;
    exports.interval = interval;
    exports.intervals = intervals;
    exports.line = line;
    exports.map = map;
    exports.motion = motion;
    exports.normalizeSpec = normalizeSpec;
    exports.org = org;
    exports.pie = pie;
    exports.pluginApiVersion = pluginApiVersion;
    exports.point = point;
    exports.registerMark = registerMark;
    exports.registerRenderer = registerRenderer;
    exports.registerTheme = registerTheme;
    exports.sankey = sankey;
    exports.scatter = scatter;
    exports.specVersion = specVersion;
    exports.steppedArea = steppedArea;
    exports.table = table;
    exports.timeline = timeline;
    exports.treemap = treemap;
    exports.trendline = trendline;
    exports.use = use;
    exports.validateSpec = validateSpec;
    exports.vegaChart = vegaChart;
    exports.version = version;
    exports.waterfall = waterfall;
    exports.wordTree = wordTree;

    return exports;

})({});
//# sourceMappingURL=graflume.global.js.map

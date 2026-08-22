/*! Graflume v0.1.0-alpha.0 | https://github.com/statground/graflume */
var Graflume = (function (exports) {
    'use strict';

    function quickChart(chartFactory, type, target, data, options) {
        const { x, y, mark, create, ...chartOptions } = options;
        return chartFactory(target, {
            ...chartOptions,
            data,
            mark: { type, ...mark },
            x,
            y,
        }, create);
    }
    function quickCombo(chartFactory, target, data, options) {
        const { layers, create, ...chartOptions } = options;
        return chartFactory(target, { ...chartOptions, data, layers }, create);
    }

    const family$2 = (id, name, quickApi, mark) => ({
        id,
        name,
        quickApi,
        mark,
    });
    const variant$1 = (id, name, quickApi, mark, familyId, mode = 'default') => ({ id, name, quickApi, mark, familyId, mode });
    /** Distinct families added by the complete entrypoint. */
    const additionalChartTypeCatalog = [
        family$2('radar', 'Radar chart', 'radar', 'radar'),
        family$2('network', 'Network chart', 'network', 'graph'),
        family$2('chord', 'Chord diagram', 'chord', 'chord'),
        family$2('funnel', 'Funnel chart', 'funnel', 'funnel'),
        family$2('parallel', 'Parallel coordinates', 'parallel', 'parallel'),
        family$2('boxplot', 'Boxplot', 'boxplot', 'boxplot'),
        family$2('heatmap', 'Heatmap', 'heatmap', 'heatmap'),
    ];
    /** Existing advanced names retained as compatible presets. */
    const additionalChartVariantCatalog = [
        variant$1('radar', 'Radar chart', 'radar', 'radar', 'radar'),
        variant$1('tree', 'Tree chart', 'tree', 'tree', 'hierarchy', 'tree'),
        variant$1('graph', 'Graph chart', 'graph', 'graph', 'network', 'node-link'),
        variant$1('chord', 'Chord diagram', 'chord', 'chord', 'chord'),
        variant$1('funnel', 'Funnel chart', 'funnel', 'funnel', 'funnel'),
        variant$1('parallel', 'Parallel coordinates', 'parallel', 'parallel', 'parallel'),
        variant$1('boxplot', 'Boxplot', 'boxplot', 'boxplot', 'boxplot'),
        variant$1('effect-scatter', 'Effect scatter chart', 'effectScatter', 'effect-scatter', 'scatter', 'emphasis'),
        variant$1('lines', 'Connection lines', 'lines', 'lines', 'network', 'connections'),
        variant$1('heatmap', 'Heatmap', 'heatmap', 'heatmap', 'heatmap'),
        variant$1('pictorial-bar', 'Pictorial bar chart', 'pictorialBar', 'pictorial-bar', 'bar', 'pictorial'),
        variant$1('theme-river', 'Theme river chart', 'themeRiver', 'theme-river', 'area', 'stream'),
        variant$1('sunburst', 'Sunburst chart', 'sunburst', 'sunburst', 'hierarchy', 'sunburst'),
        variant$1('custom', 'Declarative custom chart', 'custom', 'custom', 'custom'),
    ];

    const family$1 = (id, name, quickApi, mark) => ({
        id,
        name,
        quickApi,
        mark,
    });
    const variant = (id, name, quickApi, mark, familyId, mode = 'default') => ({ id, name, quickApi, mark, familyId, mode });
    /** Established chart families shown in discovery surfaces. */
    const chartTypeCatalog = [
        family$1('annotation', 'Annotation chart', 'annotation', 'annotation'),
        family$1('area', 'Area chart', 'area', 'area'),
        family$1('bar', 'Bar chart', 'bar', 'bar'),
        family$1('bubble', 'Bubble chart', 'bubble', 'bubble'),
        family$1('calendar', 'Calendar chart', 'calendar', 'calendar'),
        family$1('candlestick', 'Candlestick chart', 'candlestick', 'candlestick'),
        family$1('combination', 'Combination chart', 'combo', 'multiple'),
        family$1('difference', 'Difference chart', 'diff', 'diff'),
        family$1('pie', 'Pie chart', 'pie', 'pie'),
        family$1('timeline', 'Timeline and range chart', 'timeline', 'timeline'),
        family$1('gauge', 'Gauge chart', 'gauge', 'gauge'),
        family$1('map', 'Map chart', 'map', 'map'),
        family$1('histogram', 'Histogram', 'histogram', 'histogram'),
        family$1('interval', 'Interval chart', 'intervals', 'interval'),
        family$1('line', 'Line chart', 'line', 'line'),
        family$1('motion', 'Motion chart', 'motion', 'motion'),
        family$1('hierarchy', 'Hierarchy chart', 'treemap', 'treemap'),
        family$1('flow', 'Flow diagram', 'sankey', 'sankey'),
        family$1('scatter', 'Scatter chart', 'scatter', 'point'),
        family$1('table', 'Table chart', 'table', 'table'),
        family$1('waterfall', 'Waterfall chart', 'waterfall', 'waterfall'),
        family$1('word-tree', 'Word tree', 'wordTree', 'word-tree'),
    ];
    /** Existing Quick API names retained as compatible presets. */
    const chartVariantCatalog = [
        variant('annotation', 'Annotation chart', 'annotation', 'annotation', 'annotation'),
        variant('annotated-timeline', 'Annotated timeline', 'annotatedTimeline', 'annotation', 'annotation', 'timeline'),
        variant('area', 'Area chart', 'area', 'area', 'area'),
        variant('bar', 'Bar chart', 'horizontalBar', 'bar', 'bar', 'horizontal'),
        variant('bubble', 'Bubble chart', 'bubble', 'bubble', 'bubble'),
        variant('calendar', 'Calendar chart', 'calendar', 'calendar', 'calendar'),
        variant('candlestick', 'Candlestick chart', 'candlestick', 'candlestick', 'candlestick'),
        variant('column', 'Column chart', 'column', 'bar', 'bar', 'vertical'),
        variant('combo', 'Combo chart', 'combo', 'multiple', 'combination'),
        variant('diff', 'Diff chart', 'diff', 'diff', 'difference'),
        variant('donut', 'Donut chart', 'donut', 'pie', 'pie', 'donut'),
        variant('gantt', 'Gantt chart', 'gantt', 'gantt', 'timeline', 'gantt'),
        variant('gauge', 'Gauge chart', 'gauge', 'gauge', 'gauge'),
        variant('geo', 'Geographic region chart', 'geo', 'geo', 'map', 'region'),
        variant('histogram', 'Histogram', 'histogram', 'histogram', 'histogram'),
        variant('intervals', 'Intervals', 'intervals', 'interval', 'interval'),
        variant('line', 'Line chart', 'line', 'line', 'line'),
        variant('map', 'Map', 'map', 'map', 'map'),
        variant('motion', 'Motion chart', 'motion', 'motion', 'motion'),
        variant('org', 'Organization chart', 'org', 'org', 'hierarchy', 'organization'),
        variant('pie', 'Pie chart', 'pie', 'pie', 'pie'),
        variant('sankey', 'Sankey diagram', 'sankey', 'sankey', 'flow'),
        variant('scatter', 'Scatter chart', 'scatter', 'point', 'scatter'),
        variant('stepped-area', 'Stepped area chart', 'steppedArea', 'stepped-area', 'area', 'stepped'),
        variant('table', 'Table chart', 'table', 'table', 'table'),
        variant('timeline', 'Timeline', 'timeline', 'timeline', 'timeline'),
        variant('treemap', 'Tree map', 'treemap', 'treemap', 'hierarchy', 'treemap'),
        variant('trendline', 'Trendline', 'trendline', 'trendline', 'line', 'trend'),
        variant('vega', 'Portable adapter chart', 'vegaChart', 'vega', 'custom', 'adapter'),
        variant('waterfall', 'Waterfall chart', 'waterfall', 'waterfall', 'waterfall'),
        variant('word-tree', 'Word tree', 'wordTree', 'word-tree', 'word-tree'),
    ];

    const variantFamilyOverrides = {
        'arc-diagram': 'network',
        'area-range': 'interval',
        'area-spline': 'area',
        'area-spline-range': 'interval',
        'bell-curve': 'histogram',
        bullet: 'bar',
        'column-pyramid': 'bar',
        'column-range': 'interval',
        cylinder: 'bar',
        'dependency-wheel': 'chord',
        dumbbell: 'interval',
        'error-bar': 'interval',
        'event-flags': 'annotation',
        'funnel-3d': 'funnel',
        'heikin-ashi': 'candlestick',
        'high-low-close': 'candlestick',
        'hollow-candlestick': 'candlestick',
        lollipop: 'bar',
        'network-graph': 'network',
        'open-high-low-close': 'candlestick',
        'organization-network': 'hierarchy',
        'packed-bubble': 'bubble',
        pareto: 'combination',
        'pictorial-column': 'bar',
        polygon: 'area',
        pyramid: 'funnel',
        'pyramid-3d': 'funnel',
        'scatter-3d': 'scatter',
        'solid-gauge': 'gauge',
        spline: 'line',
        streamgraph: 'area',
        'tile-map': 'heatmap',
        'tree-graph': 'hierarchy',
        'variable-pie': 'pie',
        'variable-width': 'bar',
        vector: 'vector-field',
        'volume-by-price': 'volume-profile',
        'wind-barb': 'vector-field',
        'x-range': 'timeline',
    };
    function familyIdFor(id, category) {
        const override = variantFamilyOverrides[id];
        if (override)
            return override;
        if (category === 'indicator')
            return 'technical-indicator';
        if (category === 'map')
            return 'map';
        if (id === 'point-and-figure' || id === 'renko')
            return 'price-blocks';
        return id;
    }
    const entry = (id, name, quickApi, mark, category, _legacyFamily = id) => {
        const familyId = familyIdFor(id, category);
        return {
            id,
            name,
            quickApi,
            mark,
            category,
            familyId,
            mode: familyId === id ? 'default' : id,
            canonicalFamily: familyId,
        };
    };
    /**
     * Specialized series that extend the established and advanced catalogs.
     * Existing families are represented once and reused through canonical aliases.
     */
    const seriesChartVariantCatalog = [
        entry('arc-diagram', 'Arc diagram', 'arcDiagram', 'arc-diagram', 'relationship'),
        entry('area-range', 'Area range chart', 'areaRange', 'range', 'cartesian'),
        entry('area-spline', 'Smooth area chart', 'areaSpline', 'smooth', 'cartesian'),
        entry('area-spline-range', 'Smooth area range chart', 'areaSplineRange', 'range', 'cartesian'),
        entry('bell-curve', 'Bell curve', 'bellCurve', 'distribution', 'distribution'),
        entry('bullet', 'Bullet chart', 'bullet', 'bullet', 'cartesian'),
        entry('column-pyramid', 'Column pyramid chart', 'columnPyramid', 'pyramid', 'cartesian'),
        entry('column-range', 'Column range chart', 'columnRange', 'range', 'cartesian'),
        entry('contour', 'Contour chart', 'contour', 'contour', 'distribution'),
        entry('cylinder', 'Cylinder chart', 'cylinder', 'cylinder', 'cartesian'),
        entry('dependency-wheel', 'Dependency wheel', 'dependencyWheel', 'chord', 'relationship', 'chord'),
        entry('dumbbell', 'Dumbbell chart', 'dumbbell', 'range', 'cartesian'),
        entry('error-bar', 'Error bar chart', 'errorBar', 'interval', 'cartesian', 'intervals'),
        entry('funnel-3d', 'Depth funnel chart', 'funnel3d', 'pyramid', 'radial'),
        entry('item', 'Item chart', 'itemChart', 'item', 'radial'),
        entry('lollipop', 'Lollipop chart', 'lollipop', 'lollipop', 'cartesian'),
        entry('network-graph', 'Network graph', 'networkGraph', 'graph', 'relationship', 'graph'),
        entry('organization-network', 'Organization network', 'organizationNetwork', 'org', 'relationship', 'org'),
        entry('packed-bubble', 'Packed bubble chart', 'packedBubble', 'packed-bubble', 'relationship'),
        entry('pareto', 'Pareto chart', 'pareto', 'pareto', 'distribution'),
        entry('pictorial-column', 'Pictorial column chart', 'pictorialColumn', 'pictorial-bar', 'cartesian', 'pictorial-bar'),
        entry('polygon', 'Polygon chart', 'polygon', 'polygon', 'cartesian'),
        entry('pyramid', 'Pyramid chart', 'pyramid', 'pyramid', 'radial'),
        entry('pyramid-3d', 'Depth pyramid chart', 'pyramid3d', 'pyramid', 'radial', 'pyramid'),
        entry('scatter-3d', 'Three-axis scatter chart', 'scatter3d', 'scatter-3d', 'cartesian'),
        entry('solid-gauge', 'Solid gauge', 'solidGauge', 'solid-gauge', 'radial'),
        entry('spline', 'Spline chart', 'spline', 'smooth', 'cartesian'),
        entry('streamgraph', 'Streamgraph', 'streamgraph', 'theme-river', 'distribution', 'theme-river'),
        entry('tile-map', 'Tile map', 'tileMap', 'tilemap', 'map'),
        entry('tree-graph', 'Tree graph', 'treeGraph', 'tree', 'relationship', 'tree'),
        entry('variable-pie', 'Variable radius pie chart', 'variablePie', 'variable-pie', 'radial'),
        entry('variable-width', 'Variable width column chart', 'variableWidth', 'variwide', 'cartesian'),
        entry('vector', 'Vector field chart', 'vector', 'vector', 'cartesian'),
        entry('venn', 'Venn diagram', 'venn', 'venn', 'relationship'),
        entry('wind-barb', 'Wind barb chart', 'windBarb', 'wind-barb', 'cartesian'),
        entry('word-cloud', 'Word cloud', 'wordCloud', 'word-cloud', 'relationship'),
        entry('x-range', 'Horizontal range chart', 'xRange', 'timeline', 'cartesian', 'timeline'),
        entry('acceleration-bands', 'Acceleration bands', 'accelerationBands', 'indicator', 'indicator'),
        entry('awesome-oscillator', 'Awesome oscillator', 'awesomeOscillator', 'indicator', 'indicator'),
        entry('absolute-price-oscillator', 'Absolute price oscillator', 'absolutePriceOscillator', 'indicator', 'indicator'),
        entry('aroon', 'Aroon indicator', 'aroon', 'indicator', 'indicator'),
        entry('aroon-oscillator', 'Aroon oscillator', 'aroonOscillator', 'indicator', 'indicator'),
        entry('average-true-range', 'Average true range', 'averageTrueRange', 'indicator', 'indicator'),
        entry('volatility-bands', 'Volatility bands', 'volatilityBands', 'indicator', 'indicator'),
        entry('commodity-channel-index', 'Commodity channel index', 'commodityChannelIndex', 'indicator', 'indicator'),
        entry('chaikin-oscillator', 'Chaikin oscillator', 'chaikinOscillator', 'indicator', 'indicator'),
        entry('chaikin-money-flow', 'Chaikin money flow', 'chaikinMoneyFlow', 'indicator', 'indicator'),
        entry('chande-momentum-oscillator', 'Chande momentum oscillator', 'chandeMomentumOscillator', 'indicator', 'indicator'),
        entry('double-exponential-average', 'Double exponential moving average', 'doubleExponentialMovingAverage', 'indicator', 'indicator'),
        entry('disparity-index', 'Disparity index', 'disparityIndex', 'indicator', 'indicator'),
        entry('directional-movement-index', 'Directional movement index', 'directionalMovementIndex', 'indicator', 'indicator'),
        entry('detrended-price-oscillator', 'Detrended price oscillator', 'detrendedPriceOscillator', 'indicator', 'indicator'),
        entry('exponential-moving-average', 'Exponential moving average', 'exponentialMovingAverage', 'indicator', 'indicator'),
        entry('event-flags', 'Event flags', 'eventFlags', 'flags', 'financial'),
        entry('heikin-ashi', 'Heikin-Ashi chart', 'heikinAshi', 'financial', 'financial'),
        entry('high-low-close', 'High-low-close chart', 'highLowClose', 'financial', 'financial'),
        entry('hollow-candlestick', 'Hollow candlestick chart', 'hollowCandlestick', 'financial', 'financial'),
        entry('ichimoku-cloud', 'Ichimoku cloud', 'ichimokuCloud', 'indicator', 'indicator'),
        entry('keltner-channels', 'Keltner channels', 'keltnerChannels', 'indicator', 'indicator'),
        entry('klinger-oscillator', 'Klinger oscillator', 'klingerOscillator', 'indicator', 'indicator'),
        entry('linear-regression', 'Linear regression', 'linearRegression', 'indicator', 'indicator'),
        entry('linear-regression-angle', 'Linear regression angle', 'linearRegressionAngle', 'indicator', 'indicator'),
        entry('linear-regression-intercept', 'Linear regression intercept', 'linearRegressionIntercept', 'indicator', 'indicator'),
        entry('linear-regression-slope', 'Linear regression slope', 'linearRegressionSlope', 'indicator', 'indicator'),
        entry('moving-average-convergence-divergence', 'Moving average convergence divergence', 'movingAverageConvergenceDivergence', 'indicator', 'indicator'),
        entry('money-flow-index', 'Money flow index', 'moneyFlowIndex', 'indicator', 'indicator'),
        entry('momentum', 'Momentum indicator', 'momentumIndicator', 'indicator', 'indicator'),
        entry('normalized-average-true-range', 'Normalized average true range', 'normalizedAverageTrueRange', 'indicator', 'indicator'),
        entry('on-balance-volume', 'On-balance volume', 'onBalanceVolume', 'indicator', 'indicator'),
        entry('open-high-low-close', 'Open-high-low-close chart', 'openHighLowClose', 'financial', 'financial'),
        entry('price-channel', 'Price channel', 'priceChannel', 'indicator', 'indicator'),
        entry('pivot-points', 'Pivot points', 'pivotPoints', 'indicator', 'indicator'),
        entry('point-and-figure', 'Point and figure chart', 'pointAndFigure', 'point-figure', 'financial'),
        entry('percentage-price-oscillator', 'Percentage price oscillator', 'percentagePriceOscillator', 'indicator', 'indicator'),
        entry('price-envelopes', 'Price envelopes', 'priceEnvelopes', 'indicator', 'indicator'),
        entry('parabolic-stop-and-reverse', 'Parabolic stop and reverse', 'parabolicStopAndReverse', 'indicator', 'indicator'),
        entry('renko', 'Renko chart', 'renko', 'renko', 'financial'),
        entry('rate-of-change', 'Rate of change', 'rateOfChange', 'indicator', 'indicator'),
        entry('relative-strength-index', 'Relative strength index', 'relativeStrengthIndex', 'indicator', 'indicator'),
        entry('slow-stochastic', 'Slow stochastic oscillator', 'slowStochastic', 'indicator', 'indicator'),
        entry('simple-moving-average', 'Simple moving average', 'simpleMovingAverage', 'indicator', 'indicator'),
        entry('stochastic', 'Stochastic oscillator', 'stochastic', 'indicator', 'indicator'),
        entry('supertrend', 'Supertrend', 'supertrend', 'indicator', 'indicator'),
        entry('triple-exponential-average', 'Triple exponential moving average', 'tripleExponentialMovingAverage', 'indicator', 'indicator'),
        entry('triple-exponential-oscillator', 'Triple exponential average oscillator', 'tripleExponentialAverageOscillator', 'indicator', 'indicator'),
        entry('volume-by-price', 'Volume by price', 'volumeByPrice', 'volume-profile', 'financial'),
        entry('volume-weighted-average-price', 'Volume weighted average price', 'volumeWeightedAveragePrice', 'indicator', 'indicator'),
        entry('williams-range', 'Williams range', 'williamsRange', 'indicator', 'indicator'),
        entry('weighted-moving-average', 'Weighted moving average', 'weightedMovingAverage', 'indicator', 'indicator'),
        entry('zigzag', 'Zigzag indicator', 'zigzag', 'indicator', 'indicator'),
        entry('flow-map', 'Flow map', 'flowMap', 'geo-flow', 'map'),
        entry('geo-heatmap', 'Geographic heatmap', 'geoHeatmap', 'geo-heatmap', 'map'),
        entry('map-bubble', 'Map bubble chart', 'mapBubble', 'map', 'map', 'map'),
        entry('map-line', 'Map line chart', 'mapLine', 'geo-line', 'map'),
        entry('map-point', 'Map point chart', 'mapPoint', 'map', 'map', 'map'),
        entry('tiled-map', 'Tiled map', 'tiledMap', 'tiled-map', 'map'),
    ];
    const family = (id, name, quickApi, mark, category) => ({ id, name, quickApi, mark, category });
    /** Specialized families that add a distinct data model or reading task. */
    const seriesChartTypeCatalog = [
        family('contour', 'Contour chart', 'contour', 'contour', 'distribution'),
        family('item', 'Item chart', 'itemChart', 'item', 'radial'),
        family('vector-field', 'Vector field chart', 'vectorField', 'vector', 'cartesian'),
        family('venn', 'Venn diagram', 'venn', 'venn', 'relationship'),
        family('word-cloud', 'Word cloud', 'wordCloud', 'word-cloud', 'relationship'),
        family('price-blocks', 'Price blocks chart', 'priceBlocks', 'renko', 'financial'),
        family('volume-profile', 'Volume profile chart', 'volumeProfile', 'volume-profile', 'financial'),
        family('technical-indicator', 'Technical indicator chart', 'technicalIndicator', 'indicator', 'indicator'),
    ];
    const directFamilyByVariant = {
        area: 'area',
        bar: 'bar',
        boxplot: 'boxplot',
        bubble: 'bubble',
        candlestick: 'candlestick',
        column: 'bar',
        funnel: 'funnel',
        gantt: 'timeline',
        gauge: 'gauge',
        heatmap: 'heatmap',
        histogram: 'histogram',
        line: 'line',
        map: 'map',
        pie: 'pie',
        sankey: 'flow',
        scatter: 'scatter',
        sunburst: 'hierarchy',
        timeline: 'timeline',
        treemap: 'hierarchy',
        trendline: 'line',
        waterfall: 'waterfall',
    };
    const seriesFamilyByVariant = new Map(seriesChartVariantCatalog.map(({ id, familyId }) => [id, familyId]));
    const compatibility = (identifier, variantId) => ({
        identifier,
        familyId: seriesFamilyByVariant.get(variantId) ?? directFamilyByVariant[variantId] ?? variantId,
        variantId,
    });
    /** Public series identifiers and the single catalog family that implements each one. */
    const seriesCompatibilityCatalog = [
        compatibility('abands', 'acceleration-bands'),
        compatibility('ao', 'awesome-oscillator'),
        compatibility('apo', 'absolute-price-oscillator'),
        compatibility('arcdiagram', 'arc-diagram'),
        compatibility('area', 'area'),
        compatibility('arearange', 'area-range'),
        compatibility('areaspline', 'area-spline'),
        compatibility('areasplinerange', 'area-spline-range'),
        compatibility('aroon', 'aroon'),
        compatibility('aroonoscillator', 'aroon-oscillator'),
        compatibility('atr', 'average-true-range'),
        compatibility('bar', 'bar'),
        compatibility('bb', 'volatility-bands'),
        compatibility('bellcurve', 'bell-curve'),
        compatibility('boxplot', 'boxplot'),
        compatibility('bubble', 'bubble'),
        compatibility('bullet', 'bullet'),
        compatibility('candlestick', 'candlestick'),
        compatibility('cci', 'commodity-channel-index'),
        compatibility('chaikin', 'chaikin-oscillator'),
        compatibility('cmf', 'chaikin-money-flow'),
        compatibility('cmo', 'chande-momentum-oscillator'),
        compatibility('column', 'column'),
        compatibility('columnpyramid', 'column-pyramid'),
        compatibility('columnrange', 'column-range'),
        compatibility('contour', 'contour'),
        compatibility('cylinder', 'cylinder'),
        compatibility('dema', 'double-exponential-average'),
        compatibility('dependencywheel', 'dependency-wheel'),
        compatibility('disparityindex', 'disparity-index'),
        compatibility('dmi', 'directional-movement-index'),
        compatibility('dpo', 'detrended-price-oscillator'),
        compatibility('dumbbell', 'dumbbell'),
        compatibility('ema', 'exponential-moving-average'),
        compatibility('errorbar', 'error-bar'),
        compatibility('flags', 'event-flags'),
        compatibility('flowmap', 'flow-map'),
        compatibility('funnel', 'funnel'),
        compatibility('funnel3d', 'funnel-3d'),
        compatibility('gantt', 'gantt'),
        compatibility('gauge', 'gauge'),
        compatibility('geoheatmap', 'geo-heatmap'),
        compatibility('heatmap', 'heatmap'),
        compatibility('heikinashi', 'heikin-ashi'),
        compatibility('histogram', 'histogram'),
        compatibility('hlc', 'high-low-close'),
        compatibility('hollowcandlestick', 'hollow-candlestick'),
        compatibility('ikh', 'ichimoku-cloud'),
        compatibility('item', 'item'),
        compatibility('keltnerchannels', 'keltner-channels'),
        compatibility('klinger', 'klinger-oscillator'),
        compatibility('line', 'line'),
        compatibility('linearregression', 'linear-regression'),
        compatibility('linearregressionangle', 'linear-regression-angle'),
        compatibility('linearregressionintercept', 'linear-regression-intercept'),
        compatibility('linearregressionslope', 'linear-regression-slope'),
        compatibility('lollipop', 'lollipop'),
        compatibility('macd', 'moving-average-convergence-divergence'),
        compatibility('map', 'map'),
        compatibility('mapbubble', 'map-bubble'),
        compatibility('mapline', 'map-line'),
        compatibility('mappoint', 'map-point'),
        compatibility('mfi', 'money-flow-index'),
        compatibility('momentum', 'momentum'),
        compatibility('natr', 'normalized-average-true-range'),
        compatibility('networkgraph', 'network-graph'),
        compatibility('obv', 'on-balance-volume'),
        compatibility('ohlc', 'open-high-low-close'),
        compatibility('organization', 'organization-network'),
        compatibility('packedbubble', 'packed-bubble'),
        compatibility('pareto', 'pareto'),
        compatibility('pc', 'price-channel'),
        compatibility('pictorial', 'pictorial-column'),
        compatibility('pie', 'pie'),
        compatibility('pivotpoints', 'pivot-points'),
        compatibility('pointandfigure', 'point-and-figure'),
        compatibility('polygon', 'polygon'),
        compatibility('ppo', 'percentage-price-oscillator'),
        compatibility('priceenvelopes', 'price-envelopes'),
        compatibility('psar', 'parabolic-stop-and-reverse'),
        compatibility('pyramid', 'pyramid'),
        compatibility('pyramid3d', 'pyramid-3d'),
        compatibility('renko', 'renko'),
        compatibility('roc', 'rate-of-change'),
        compatibility('rsi', 'relative-strength-index'),
        compatibility('sankey', 'sankey'),
        compatibility('scatter', 'scatter'),
        compatibility('scatter3d', 'scatter-3d'),
        compatibility('slowstochastic', 'slow-stochastic'),
        compatibility('sma', 'simple-moving-average'),
        compatibility('solidgauge', 'solid-gauge'),
        compatibility('spline', 'spline'),
        compatibility('stochastic', 'stochastic'),
        compatibility('streamgraph', 'streamgraph'),
        compatibility('sunburst', 'sunburst'),
        compatibility('supertrend', 'supertrend'),
        compatibility('tema', 'triple-exponential-average'),
        compatibility('tiledwebmap', 'tiled-map'),
        compatibility('tilemap', 'tile-map'),
        compatibility('timeline', 'timeline'),
        compatibility('treegraph', 'tree-graph'),
        compatibility('treemap', 'treemap'),
        compatibility('trendline', 'trendline'),
        compatibility('trix', 'triple-exponential-oscillator'),
        compatibility('variablepie', 'variable-pie'),
        compatibility('variwide', 'variable-width'),
        compatibility('vbp', 'volume-by-price'),
        compatibility('vector', 'vector'),
        compatibility('venn', 'venn'),
        compatibility('vwap', 'volume-weighted-average-price'),
        compatibility('waterfall', 'waterfall'),
        compatibility('williamsr', 'williams-range'),
        compatibility('windbarb', 'wind-barb'),
        compatibility('wma', 'weighted-moving-average'),
        compatibility('wordcloud', 'word-cloud'),
        compatibility('xrange', 'x-range'),
        compatibility('zigzag', 'zigzag'),
    ];
    const seriesCompatibilityIds = seriesCompatibilityCatalog.map(({ identifier }) => identifier);
    const compatibilityByIdentifier = new Map(seriesCompatibilityCatalog.map((item) => [item.identifier, item]));
    function resolveSeriesType(identifier) {
        const normalized = identifier
            .trim()
            .toLowerCase()
            .replaceAll(/[^a-z0-9]/g, '');
        return compatibilityByIdentifier.get(normalized);
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

    const indexByScene = new WeakMap();
    const coordinateEpsilon = 1e-6;
    function primary(target, axis) {
        return axis === 'x' ? target.x : target.y;
    }
    function perpendicular(target, axis) {
        return axis === 'x' ? target.y : target.x;
    }
    function registerAxisTooltipIndex(scene, registration) {
        const targets = registration.targets
            .filter((target) => Number.isFinite(target.x) && Number.isFinite(target.y))
            .sort((left, right) => {
            const coordinate = primary(left, registration.axis) - primary(right, registration.axis);
            if (Math.abs(coordinate) > coordinateEpsilon)
                return coordinate;
            if (left.order !== right.order)
                return right.order - left.order;
            return left.nodeId.localeCompare(right.nodeId);
        });
        indexByScene.set(scene, { ...registration, targets });
    }
    function insideActivationRegion(index, x, y) {
        const { plot, axis, axisVisible, axisStripSize } = index;
        const right = plot.x + plot.width;
        const bottom = plot.y + plot.height;
        if (axis === 'x') {
            const stripBottom = bottom + (axisVisible ? axisStripSize : 0);
            return x >= plot.x && x <= right && y >= plot.y && y <= stripBottom;
        }
        const stripLeft = plot.x - (axisVisible ? axisStripSize : 0);
        return x >= stripLeft && x <= right && y >= plot.y && y <= bottom;
    }
    function lowerBound(targets, axis, value) {
        let low = 0;
        let high = targets.length;
        while (low < high) {
            const middle = low + Math.floor((high - low) / 2);
            const target = targets[middle];
            if (target !== undefined && primary(target, axis) < value)
                low = middle + 1;
            else
                high = middle;
        }
        return low;
    }
    function nearestCoordinate(index, pointer) {
        const insertion = lowerBound(index.targets, index.axis, pointer);
        const before = index.targets[insertion - 1];
        const after = index.targets[insertion];
        if (before === undefined && after === undefined)
            return null;
        if (before === undefined)
            return primary(after, index.axis);
        if (after === undefined)
            return primary(before, index.axis);
        const beforeCoordinate = primary(before, index.axis);
        const afterCoordinate = primary(after, index.axis);
        return pointer - beforeCoordinate <= afterCoordinate - pointer
            ? beforeCoordinate
            : afterCoordinate;
    }
    function hitTestAxisTooltip(scene, x, y) {
        const index = indexByScene.get(scene);
        if (index === undefined ||
            index.targets.length === 0 ||
            !scene.metadata.hitTestingEnabled ||
            !insideActivationRegion(index, x, y)) {
            return null;
        }
        const pointerPrimary = index.axis === 'x' ? x : y;
        const pointerPerpendicular = index.axis === 'x' ? y : x;
        const coordinate = nearestCoordinate(index, pointerPrimary);
        if (coordinate === null)
            return null;
        const start = lowerBound(index.targets, index.axis, coordinate - coordinateEpsilon);
        let best = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let cursor = start; cursor < index.targets.length; cursor += 1) {
            const target = index.targets[cursor];
            if (target === undefined)
                continue;
            if (Math.abs(primary(target, index.axis) - coordinate) > coordinateEpsilon)
                break;
            const distance = Math.abs(perpendicular(target, index.axis) - pointerPerpendicular);
            if (distance < bestDistance - coordinateEpsilon ||
                (Math.abs(distance - bestDistance) <= coordinateEpsilon &&
                    (best === null || target.order > best.order))) {
                best = target;
                bestDistance = distance;
            }
        }
        if (best === null)
            return null;
        return {
            layerId: best.layerId,
            rowIndex: best.rowIndex,
            datum: best.datum,
            ...(best.tooltip === undefined ? {} : { tooltip: best.tooltip }),
            nodeId: best.nodeId,
            x,
            y,
            distance: Math.abs(pointerPrimary - coordinate),
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
    function clamp$2(value, min, max) {
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
    const TOOLTIP_FORMATS = new Set(['auto', 'number', 'integer', 'percent', 'date', 'datetime']);
    const TOOLTIP_KEYS = new Set(['trigger', 'axis', 'title', 'fields']);
    const TOOLTIP_FIELD_KEYS = new Set([
        'field',
        'label',
        'format',
        'fractionDigits',
        'prefix',
        'suffix',
    ]);
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
    function validateTooltipField(value, path, issues) {
        if (typeof value === 'string') {
            if (value.trim() === '')
                issues.push({ path, message: 'Tooltip field must not be empty.' });
            if (UNSAFE_FIELDS.has(value)) {
                issues.push({ path, message: `Unsafe field "${value}" is forbidden.` });
            }
            return;
        }
        if (!isPlainObject(value) || typeof value.field !== 'string' || value.field.trim() === '') {
            issues.push({ path, message: 'Tooltip field must be a field name or an object with a field.' });
            return;
        }
        for (const key of Object.keys(value)) {
            if (!TOOLTIP_FIELD_KEYS.has(key)) {
                issues.push({ path: `${path}.${key}`, message: `Unknown tooltip field property "${key}".` });
            }
        }
        if (UNSAFE_FIELDS.has(value.field)) {
            issues.push({ path: `${path}.field`, message: `Unsafe field "${value.field}" is forbidden.` });
        }
        if (value.label !== undefined && typeof value.label !== 'string') {
            issues.push({ path: `${path}.label`, message: 'Tooltip label must be a string.' });
        }
        if (value.format !== undefined &&
            (typeof value.format !== 'string' || !TOOLTIP_FORMATS.has(value.format))) {
            issues.push({ path: `${path}.format`, message: 'Tooltip format is not supported.' });
        }
        if (value.fractionDigits !== undefined &&
            (typeof value.fractionDigits !== 'number' ||
                !Number.isInteger(value.fractionDigits) ||
                value.fractionDigits < 0 ||
                value.fractionDigits > 6)) {
            issues.push({
                path: `${path}.fractionDigits`,
                message: 'Tooltip fractionDigits must be an integer from 0 to 6.',
            });
        }
        for (const key of ['prefix', 'suffix']) {
            if (value[key] !== undefined && typeof value[key] !== 'string') {
                issues.push({ path: `${path}.${key}`, message: `Tooltip ${key} must be a string.` });
            }
        }
    }
    function validateInteraction(value, path, issues) {
        if (value === undefined)
            return;
        if (!isPlainObject(value)) {
            issues.push({ path, message: 'Interaction must be an object.' });
            return;
        }
        for (const key of ['hover', 'click']) {
            if (value[key] !== undefined && typeof value[key] !== 'boolean') {
                issues.push({ path: `${path}.${key}`, message: `Interaction ${key} must be a boolean.` });
            }
        }
        const tooltip = value.tooltip;
        if (tooltip === undefined || typeof tooltip === 'boolean')
            return;
        if (!isPlainObject(tooltip)) {
            issues.push({ path: `${path}.tooltip`, message: 'Tooltip must be a boolean or an object.' });
            return;
        }
        for (const key of Object.keys(tooltip)) {
            if (!TOOLTIP_KEYS.has(key)) {
                issues.push({
                    path: `${path}.tooltip.${key}`,
                    message: `Unknown tooltip property "${key}".`,
                });
            }
        }
        if (tooltip.trigger !== undefined &&
            (typeof tooltip.trigger !== 'string' || !['mark', 'axis'].includes(tooltip.trigger))) {
            issues.push({
                path: `${path}.tooltip.trigger`,
                message: 'Tooltip trigger must be "mark" or "axis".',
            });
        }
        if (tooltip.axis !== undefined &&
            (typeof tooltip.axis !== 'string' || !['x', 'y'].includes(tooltip.axis))) {
            issues.push({
                path: `${path}.tooltip.axis`,
                message: 'Tooltip axis must be "x" or "y".',
            });
        }
        const trigger = tooltip.trigger ?? 'mark';
        if (trigger === 'axis' && tooltip.axis === undefined) {
            issues.push({
                path: `${path}.tooltip.axis`,
                message: 'Tooltip axis is required when trigger is "axis".',
            });
        }
        if (trigger !== 'axis' && tooltip.axis !== undefined) {
            issues.push({
                path: `${path}.tooltip.axis`,
                message: 'Tooltip axis is only valid when trigger is "axis".',
            });
        }
        if (tooltip.title !== undefined && typeof tooltip.title !== 'string') {
            issues.push({ path: `${path}.tooltip.title`, message: 'Tooltip title must be a string.' });
        }
        if (tooltip.fields !== undefined) {
            if (!Array.isArray(tooltip.fields) ||
                tooltip.fields.length === 0 ||
                tooltip.fields.length > 12) {
                issues.push({
                    path: `${path}.tooltip.fields`,
                    message: 'Tooltip fields must contain between 1 and 12 entries.',
                });
            }
            else {
                tooltip.fields.forEach((field, index) => validateTooltipField(field, `${path}.tooltip.fields[${index}]`, issues));
            }
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
        validateInteraction(input.interaction, '$.interaction', issues);
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
    function humanizeField$1(field) {
        return field
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/[-_]+/g, ' ')
            .replace(/^\w/, (letter) => letter.toUpperCase());
    }
    function normalizeTooltipField(input) {
        const field = typeof input === 'string' ? input : input.field;
        return {
            field,
            label: typeof input === 'string' ? humanizeField$1(field) : (input.label ?? humanizeField$1(field)),
            format: typeof input === 'string' ? 'auto' : (input.format ?? 'auto'),
            ...(typeof input === 'string' || input.fractionDigits === undefined
                ? {}
                : { fractionDigits: input.fractionDigits }),
            prefix: typeof input === 'string' ? '' : (input.prefix ?? ''),
            suffix: typeof input === 'string' ? '' : (input.suffix ?? ''),
        };
    }
    function normalizeInteraction(input) {
        const hover = input?.hover ?? true;
        const tooltipInput = input?.tooltip;
        const tooltip = !hover || tooltipInput === undefined || tooltipInput === false
            ? false
            : {
                trigger: typeof tooltipInput === 'object' ? (tooltipInput.trigger ?? 'mark') : 'mark',
                ...(typeof tooltipInput === 'object' && tooltipInput.axis !== undefined
                    ? { axis: tooltipInput.axis }
                    : {}),
                ...(typeof tooltipInput === 'object' && tooltipInput.title !== undefined
                    ? { title: tooltipInput.title }
                    : {}),
                fields: typeof tooltipInput === 'object'
                    ? (tooltipInput.fields ?? []).map(normalizeTooltipField)
                    : [],
            };
        return {
            hover,
            click: input?.click ?? true,
            tooltip,
        };
    }
    function normalizeAxis(input, defaultGrid) {
        if (input === false)
            return false;
        return {
            visible: input?.visible ?? true,
            grid: input?.grid ?? defaultGrid,
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
            axis: encoding.axis === undefined
                ? fallbackAxis
                : normalizeAxis(encoding.axis, fallbackAxis === false ? false : fallbackAxis.grid !== false),
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
            x: normalizeAxis(input.axes?.x, false),
            y: normalizeAxis(input.axes?.y, true),
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
            interaction: normalizeInteraction(input.interaction),
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

    function line$1(id, x1, y1, x2, y2, stroke, lineWidth, zIndex, opacity = 1) {
        return {
            type: 'line',
            ...nodeBase(id, { zIndex, opacity }),
            x1,
            y1,
            x2,
            y2,
            stroke,
            lineWidth,
            lineCap: 'round',
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
        const ticks = scale.ticks(axis.tickCount ?? Math.max(2, Math.floor(plot.width / 96)), locale);
        const angle = axis.labelAngle ?? (scale.kind === 'band' && ticks.length > 10 ? -35 : 0);
        nodes.push(line$1('axis-x:line', plot.x, axisY, plot.x + plot.width, axisY, theme.colors.axis, theme.axis.lineWidth, 100));
        ticks.forEach((tick, index) => {
            if (axis.grid !== false && Math.abs(tick.position - plot.x) > 0.5) {
                const isZero = typeof tick.value === 'number' && Math.abs(tick.value) < Number.EPSILON;
                nodes.push(line$1(`axis-x:grid:${index}`, tick.position, plot.y, tick.position, axisY, isZero ? theme.colors.axis : theme.colors.grid, isZero ? Math.max(1, theme.axis.gridLineWidth) : theme.axis.gridLineWidth, -20, isZero ? 0.9 : 0.82));
            }
            if (theme.axis.tickLength > 0) {
                nodes.push(line$1(`axis-x:tick:${index}`, tick.position, axisY, tick.position, axisY + theme.axis.tickLength, theme.colors.axis, theme.axis.lineWidth, 100));
            }
            nodes.push(text(`axis-x:label:${index}`, tick.position, axisY + theme.axis.tickLength + theme.axis.labelPadding, tick.label, theme, {
                align: angle === 0 ? 'center' : 'right',
                baseline: 'top',
                rotation: angle,
                fontWeight: 500,
            }));
        });
        if (axis.title !== '' && title !== '') {
            nodes.push(text('axis-x:title', plot.x + plot.width / 2, axisY + 32, axis.title ?? title, theme, {
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
        const ticks = scale.ticks(axis.tickCount ?? Math.max(2, Math.floor(plot.height / 58)), locale);
        nodes.push(line$1('axis-y:line', axisX, plot.y, axisX, plot.y + plot.height, theme.colors.axis, theme.axis.lineWidth, 100));
        ticks.forEach((tick, index) => {
            if (axis.grid !== false && Math.abs(tick.position - (plot.y + plot.height)) > 0.5) {
                const isZero = typeof tick.value === 'number' && Math.abs(tick.value) < Number.EPSILON;
                nodes.push(line$1(`axis-y:grid:${index}`, axisX, tick.position, plot.x + plot.width, tick.position, isZero ? theme.colors.axis : theme.colors.grid, isZero ? Math.max(1, theme.axis.gridLineWidth) : theme.axis.gridLineWidth, -20, isZero ? 0.9 : 0.82));
            }
            if (theme.axis.tickLength > 0) {
                nodes.push(line$1(`axis-y:tick:${index}`, axisX - theme.axis.tickLength, tick.position, axisX, tick.position, theme.colors.axis, theme.axis.lineWidth, 100));
            }
            nodes.push(text(`axis-y:label:${index}`, axisX - theme.axis.tickLength - theme.axis.labelPadding, tick.position, tick.label, theme, { align: 'right', baseline: 'middle', fontWeight: 500 }));
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

    const ROW_TARGET_MARKS = new Set(['area', 'line', 'smooth', 'stepped-area', 'trendline']);
    function anchor(node) {
        switch (node.type) {
            case 'circle':
                return { x: node.cx, y: node.cy };
            case 'rect':
                return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
            case 'line':
                return { x: (node.x1 + node.x2) / 2, y: (node.y1 + node.y2) / 2 };
            case 'text':
                return { x: node.x, y: node.y };
            case 'path': {
                if (node.points.length === 0)
                    return null;
                let minX = Number.POSITIVE_INFINITY;
                let maxX = Number.NEGATIVE_INFINITY;
                let minY = Number.POSITIVE_INFINITY;
                let maxY = Number.NEGATIVE_INFINITY;
                for (const point of node.points) {
                    minX = Math.min(minX, point.x);
                    maxX = Math.max(maxX, point.x);
                    minY = Math.min(minY, point.y);
                    maxY = Math.max(maxY, point.y);
                }
                return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
            }
        }
    }
    function bounds(node) {
        switch (node.type) {
            case 'circle':
                return {
                    x: node.cx - node.radius,
                    y: node.cy - node.radius,
                    width: node.radius * 2,
                    height: node.radius * 2,
                };
            case 'rect':
                return { x: node.x, y: node.y, width: node.width, height: node.height };
            case 'line':
                return {
                    x: Math.min(node.x1, node.x2),
                    y: Math.min(node.y1, node.y2),
                    width: Math.abs(node.x2 - node.x1),
                    height: Math.abs(node.y2 - node.y1),
                };
            case 'text':
                return { x: node.x, y: node.y, width: 0, height: 0 };
            case 'path': {
                const point = anchor(node);
                if (point === null)
                    return { x: 0, y: 0, width: 0, height: 0 };
                let minX = Number.POSITIVE_INFINITY;
                let maxX = Number.NEGATIVE_INFINITY;
                let minY = Number.POSITIVE_INFINITY;
                let maxY = Number.NEGATIVE_INFINITY;
                for (const current of node.points) {
                    minX = Math.min(minX, current.x);
                    maxX = Math.max(maxX, current.x);
                    minY = Math.min(minY, current.y);
                    maxY = Math.max(maxY, current.y);
                }
                return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
            }
        }
    }
    function intersectsPlot(plot, target) {
        return (target.x + target.width >= plot.x &&
            target.x <= plot.x + plot.width &&
            target.y + target.height >= plot.y &&
            target.y <= plot.y + plot.height);
    }
    function clampToPlot(plot, x, y) {
        return {
            x: Math.max(plot.x, Math.min(plot.x + plot.width, x)),
            y: Math.max(plot.y, Math.min(plot.y + plot.height, y)),
        };
    }
    function scaleValue(scale, value) {
        if (value === null ||
            value === undefined ||
            typeof value === 'boolean' ||
            (typeof value !== 'number' && typeof value !== 'string' && !(value instanceof Date))) {
            return null;
        }
        const position = scale.map(value);
        return Number.isFinite(position) ? position : null;
    }
    function collectAxisTooltipTargets(context) {
        if (!context.performance.enableHitTesting)
            return [];
        const { axis, scales, plot } = context;
        const layerDataById = new Map(scales.layers.map((layerData) => [layerData.layer.id, layerData]));
        const targets = [];
        const representedRows = new Set();
        let order = 0;
        const visit = (node, parentOpacity) => {
            const opacity = parentOpacity * node.opacity;
            if (!node.visible || opacity <= 0)
                return;
            if (node.type === 'group') {
                const children = [...node.children].sort((left, right) => left.zIndex - right.zIndex);
                for (const child of children)
                    visit(child, opacity);
                return;
            }
            if (node.interactive !== true || node.datum === undefined)
                return;
            const geometry = anchor(node);
            if (geometry === null || !intersectsPlot(plot, bounds(node)))
                return;
            const clippedGeometry = clampToPlot(plot, geometry.x, geometry.y);
            const layerData = layerDataById.get(node.datum.layerId);
            let x = clippedGeometry.x;
            let y = clippedGeometry.y;
            if (node.datum.tooltip === undefined && layerData !== undefined) {
                const encoding = axis === 'x' ? layerData.layer.x : layerData.layer.y;
                const scale = axis === 'x' ? scales.xScale : scales.yScale;
                const encoded = scaleValue(scale, node.datum.datum[encoding.field]);
                if (encoded !== null) {
                    if (axis === 'x')
                        x = encoded;
                    else
                        y = encoded;
                }
            }
            targets.push({
                ...node.datum,
                nodeId: `axis:${node.id}`,
                x,
                y,
                order,
            });
            representedRows.add(`${node.datum.layerId}\u0000${node.datum.rowIndex}`);
            order += 1;
        };
        for (const group of context.layerGroups)
            visit(group, 1);
        for (const layerData of scales.layers) {
            if (!ROW_TARGET_MARKS.has(layerData.layer.mark.type))
                continue;
            const indices = strideSampleIndices(layerData.table.length, context.performance.maxPointMarks);
            for (const rowIndex of indices) {
                if (representedRows.has(`${layerData.layer.id}\u0000${rowIndex}`))
                    continue;
                const datum = layerData.table.row(rowIndex);
                const x = scaleValue(scales.xScale, datum[layerData.layer.x.field]);
                const y = scaleValue(scales.yScale, datum[layerData.layer.y.field]);
                if (x === null || y === null)
                    continue;
                const position = clampToPlot(plot, x, y);
                targets.push({
                    layerId: layerData.layer.id,
                    rowIndex,
                    datum,
                    nodeId: `axis:${layerData.layer.id}:row:${rowIndex}`,
                    x: position.x,
                    y: position.y,
                    order,
                });
                order += 1;
            }
        }
        return targets;
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
            const paddingInner = clamp$2(options.paddingInner ?? 0.1, 0, 1);
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
            const normalized = this.#clamp ? clamp$2(ratio, 0, 1) : ratio;
            return rangeStart + normalized * (rangeEnd - rangeStart);
        }
        invert(position) {
            const [domainStart, domainEnd] = this.#domain;
            const [rangeStart, rangeEnd] = this.#range;
            const denominator = rangeEnd - rangeStart;
            const ratio = denominator === 0 ? 0.5 : (position - rangeStart) / denominator;
            const normalized = this.#clamp ? clamp$2(ratio, 0, 1) : ratio;
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
            const fields = axis === 'y' && (layer.mark.type === 'histogram' || layer.mark.type === 'theme-river')
                ? []
                : [encoding.field];
            if (axis === 'x' && (layer.mark.type === 'timeline' || layer.mark.type === 'gantt')) {
                fields.push(layer.mark.fields.end ?? 'end');
            }
            if (axis === 'x' && (layer.mark.type === 'lines' || layer.mark.type === 'custom')) {
                const x2 = layer.mark.fields.x2;
                if (x2 !== undefined)
                    fields.push(x2);
            }
            if (axis === 'y' && layer.mark.type === 'candlestick') {
                fields.push(layer.mark.fields.open ?? 'open', layer.mark.fields.high ?? 'high', layer.mark.fields.low ?? 'low', layer.mark.fields.close ?? encoding.field);
            }
            if (axis === 'y' &&
                (layer.mark.type === 'financial' ||
                    layer.mark.type === 'range' ||
                    layer.mark.type === 'bullet' ||
                    layer.mark.type === 'indicator' ||
                    layer.mark.type === 'volume-profile')) {
                fields.push(...Object.values(layer.mark.fields));
                const optionFields = layer.mark.options.fields;
                if (Array.isArray(optionFields)) {
                    fields.push(...optionFields.filter((field) => typeof field === 'string' && field.trim() !== ''));
                }
            }
            if (axis === 'y' && layer.mark.type === 'boxplot') {
                fields.push(layer.mark.fields.min ?? 'min', layer.mark.fields.q1 ?? 'q1', layer.mark.fields.median ?? encoding.field, layer.mark.fields.q3 ?? 'q3', layer.mark.fields.max ?? 'max');
            }
            if (axis === 'y' && (layer.mark.type === 'lines' || layer.mark.type === 'custom')) {
                const y2 = layer.mark.fields.y2;
                if (y2 !== undefined)
                    fields.push(y2);
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
            if (axis === 'y' && layer.mark.type === 'theme-river') {
                const totals = new Map();
                for (let index = 0; index < table.length; index += 1) {
                    const key = String(table.value(index, layer.x.field) ?? '');
                    const value = table.numericValue(index, layer.y.field);
                    if (value === null)
                        continue;
                    totals.set(key, (totals.get(key) ?? 0) + Math.max(0, value));
                }
                const maximumTotal = Math.max(1, ...totals.values());
                min = Math.min(min, -maximumTotal / 2);
                max = Math.max(max, maximumTotal / 2);
            }
            if (encoding.scale.zero === true ||
                (axis === 'y' &&
                    (layer.mark.type === 'bar' ||
                        layer.mark.type === 'area' ||
                        layer.mark.type === 'bullet' ||
                        layer.mark.type === 'cylinder' ||
                        layer.mark.type === 'histogram' ||
                        layer.mark.type === 'item' ||
                        layer.mark.type === 'lollipop' ||
                        layer.mark.type === 'packed-bubble' ||
                        layer.mark.type === 'pareto' ||
                        layer.mark.type === 'pictorial-bar' ||
                        layer.mark.type === 'pyramid' ||
                        layer.mark.type === 'solid-gauge' ||
                        layer.mark.type === 'theme-river' ||
                        layer.mark.type === 'variable-pie' ||
                        layer.mark.type === 'variwide' ||
                        layer.mark.type === 'volume-profile' ||
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
        const titleBlock = spec.title === undefined
            ? 0
            : theme.typography.titleSize +
                (spec.title.subtitle === undefined
                    ? theme.spacing.lg
                    : theme.typography.subtitleSize + theme.spacing.lg + theme.spacing.xs);
        const plotX = spec.padding.left;
        const plotY = spec.padding.top + titleBlock;
        const plotWidth = Math.max(1, width - spec.padding.left - spec.padding.right);
        const plotHeight = Math.max(1, height - plotY - spec.padding.bottom);
        return {
            width,
            height,
            plot: { x: plotX, y: plotY, width: plotWidth, height: plotHeight },
            titleY: spec.padding.top,
            subtitleY: spec.padding.top + theme.typography.titleSize + theme.spacing.xs,
        };
    }

    const AXISLESS_MARKS = new Set([
        'calendar',
        'chord',
        'funnel',
        'gauge',
        'graph',
        'geo',
        'map',
        'org',
        'parallel',
        'pie',
        'radar',
        'sankey',
        'sunburst',
        'table',
        'tree',
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
                hitTestingEnabled: performance.enableHitTesting,
            },
        };
        const tooltip = spec.interaction.tooltip;
        if (tooltip !== false && tooltip.trigger === 'axis' && tooltip.axis !== undefined) {
            const axis = tooltip.axis;
            const axisSpec = scales.layers[0]?.layer[axis].axis ?? spec.axes[axis];
            const axisVisible = showAxes && axisSpec !== false && axisSpec.visible !== false;
            const axisStripSize = axis === 'x'
                ? Math.min(spec.padding.bottom, theme.axis.tickLength + theme.axis.labelPadding + theme.typography.fontSize * 1.5)
                : Math.min(spec.padding.left, theme.axis.tickLength + theme.axis.labelPadding + theme.typography.fontSize * 4);
            registerAxisTooltipIndex(scene, {
                axis,
                plot: layout.plot,
                axisVisible,
                axisStripSize: Math.max(0, axisStripSize),
                targets: collectAxisTooltipTargets({
                    axis,
                    layerGroups,
                    scales,
                    plot: layout.plot,
                    performance,
                }),
            });
        }
        return { scene, spec, theme };
    }

    function normalizedHex(color) {
        const value = color.trim().replace(/^#/, '');
        if (/^[0-9a-f]{3}$/i.test(value)) {
            return value
                .split('')
                .map((channel) => `${channel}${channel}`)
                .join('');
        }
        return /^[0-9a-f]{6}$/i.test(value) ? value : null;
    }
    function channel(color, index) {
        return Number.parseInt(color.slice(index * 2, index * 2 + 2), 16);
    }
    function mixColor(start, end, ratio) {
        const startHex = normalizedHex(start);
        const endHex = normalizedHex(end);
        if (startHex === null || endHex === null)
            return ratio < 0.5 ? start : end;
        const bounded = Math.max(0, Math.min(1, ratio));
        const channels = [0, 1, 2].map((index) => Math.round(channel(startHex, index) + (channel(endHex, index) - channel(startHex, index)) * bounded));
        return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
    }
    function colorWithOpacity(color, opacity) {
        const hex = normalizedHex(color);
        if (hex === null)
            return color;
        const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
            .toString(16)
            .padStart(2, '0');
        return `#${hex}${alpha}`;
    }
    function readableTextColor(color, light, dark) {
        const hex = normalizedHex(color);
        if (hex === null)
            return light;
        const linear = [0, 1, 2].map((index) => {
            const value = channel(hex, index) / 255;
            return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        const luminance = 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
        return luminance > 0.42 ? dark : light;
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

    const TAU$1 = Math.PI * 2;
    function clamp$1(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    function finiteOption(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }
    function stringValue$1(value) {
        if (value === null || value === undefined)
            return null;
        if (value instanceof Date)
            return value.toISOString();
        return String(value);
    }
    function optionStrings$1(value) {
        if (!Array.isArray(value))
            return [];
        return value.filter((item) => typeof item === 'string' && item.trim() !== '');
    }
    function pointOnCircle$1(cx, cy, radius, angle) {
        return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    }
    function sampledArc$1(cx, cy, radius, startAngle, endAngle, segments = 24) {
        const count = Math.max(2, segments);
        return Array.from({ length: count + 1 }, (_, index) => {
            const ratio = index / count;
            return pointOnCircle$1(cx, cy, radius, startAngle + (endAngle - startAngle) * ratio);
        });
    }
    function annularSector$1(cx, cy, innerRadius, outerRadius, startAngle, endAngle) {
        const span = Math.abs(endAngle - startAngle);
        const segments = Math.max(4, Math.ceil((span / TAU$1) * 48));
        return [
            ...sampledArc$1(cx, cy, outerRadius, startAngle, endAngle, segments),
            ...sampledArc$1(cx, cy, innerRadius, endAngle, startAngle, segments),
        ];
    }
    function quadraticPoints$1(start, control, end, segments = 20) {
        return Array.from({ length: segments + 1 }, (_, index) => {
            const t = index / segments;
            const inverse = 1 - t;
            return {
                x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
                y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
            };
        });
    }
    function themeColor(context, index) {
        return (context.theme.colors.palette[index % context.theme.colors.palette.length] ??
            context.theme.colors.focus);
    }
    function textNode$3(id, x, y, text, context, options = {}) {
        return {
            type: 'text',
            ...nodeBase(id, { zIndex: options.zIndex ?? context.layer.zIndex + 2 }),
            x,
            y,
            text,
            fill: options.fill ?? context.theme.colors.text,
            fontFamily: context.theme.typography.fontFamily,
            fontSize: options.size ?? context.theme.typography.fontSize,
            fontWeight: options.weight ?? 500,
            align: options.align ?? 'center',
            baseline: options.baseline ?? 'middle',
            rotation: options.rotation ?? 0,
        };
    }
    function datumBase$1(context, id, rowIndex, zIndex = 0, tooltip) {
        return nodeBase(id, {
            zIndex: context.layer.zIndex + zIndex,
            opacity: context.layer.mark.opacity,
            interactive: context.performance.enableHitTesting,
            datum: {
                layerId: context.layer.id,
                rowIndex,
                datum: context.table.row(rowIndex),
                ...(tooltip === undefined ? {} : { tooltip }),
            },
        });
    }
    const compileRadarMark = (context) => {
        const { layer, table, plot, theme } = context;
        const categories = table.unique(layer.x.field);
        if (categories.length < 3)
            return [];
        const seriesField = layer.mark.fields.series;
        const seriesNames = seriesField === undefined ? ['Series'] : table.unique(seriesField);
        const maxOption = finiteOption(layer.mark.options.max, Number.NaN);
        let maximum = Number.isFinite(maxOption) && maxOption > 0 ? maxOption : 0;
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            maximum = Math.max(maximum, numericDataValue(table.value(rowIndex, layer.y.field)) ?? 0);
        }
        if (maximum <= 0)
            maximum = 1;
        const cx = plot.x + plot.width / 2;
        const cy = plot.y + plot.height / 2;
        const radius = Math.max(16, Math.min(plot.width, plot.height) * 0.34);
        const nodes = [];
        const rings = clamp$1(Math.floor(finiteOption(layer.mark.options.rings, 5)), 1, 8);
        for (let ring = 1; ring <= rings; ring += 1) {
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:radar-grid:${ring}`, { zIndex: layer.zIndex }),
                points: categories.map((_, index) => pointOnCircle$1(cx, cy, (radius * ring) / rings, -Math.PI / 2 + (index * TAU$1) / categories.length)),
                closed: true,
                stroke: colorWithOpacity(theme.colors.grid, ring === rings ? 0.9 : 0.7),
                lineWidth: ring === rings ? 1.2 : 1,
                lineJoin: 'round',
            });
        }
        categories.forEach((category, index) => {
            const angle = -Math.PI / 2 + (index * TAU$1) / categories.length;
            const edge = pointOnCircle$1(cx, cy, radius, angle);
            const label = pointOnCircle$1(cx, cy, radius + 18, angle);
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:radar-axis:${index}`, { zIndex: layer.zIndex }),
                x1: cx,
                y1: cy,
                x2: edge.x,
                y2: edge.y,
                stroke: theme.colors.grid,
                lineWidth: 1,
                lineCap: 'round',
            });
            nodes.push(textNode$3(`${layer.id}:radar-label:${index}`, label.x, label.y, category, context, {
                fill: theme.colors.mutedText,
                size: Math.max(9, theme.typography.fontSize - 1),
                weight: 600,
            }));
        });
        seriesNames.forEach((seriesName, seriesIndex) => {
            const rows = new Map();
            const rowIndexes = new Map();
            for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
                if (seriesField !== undefined &&
                    stringValue$1(table.value(rowIndex, seriesField)) !== seriesName) {
                    continue;
                }
                const category = stringValue$1(table.value(rowIndex, layer.x.field));
                const value = numericDataValue(table.value(rowIndex, layer.y.field));
                if (category === null || value === null)
                    continue;
                rows.set(category, value);
                rowIndexes.set(category, rowIndex);
            }
            const color = themeColor(context, seriesIndex);
            const points = categories.map((category, index) => {
                const ratio = clamp$1((rows.get(category) ?? 0) / maximum, 0, 1);
                return pointOnCircle$1(cx, cy, radius * ratio, -Math.PI / 2 + (index * TAU$1) / categories.length);
            });
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:radar-series:${seriesIndex}`, {
                    zIndex: layer.zIndex + 1,
                    opacity: layer.mark.opacity,
                }),
                points,
                closed: true,
                fill: colorWithOpacity(layer.mark.fill ?? color, 0.2),
                stroke: layer.mark.stroke ?? color,
                lineWidth: layer.mark.lineWidth ?? 2.25,
                lineJoin: 'round',
            });
            points.forEach((point, index) => {
                const rowIndex = rowIndexes.get(categories[index] ?? '');
                if (rowIndex === undefined)
                    return;
                nodes.push({
                    type: 'circle',
                    ...datumBase$1(context, `${layer.id}:radar-point:${seriesIndex}:${index}`, rowIndex, 2),
                    cx: point.x,
                    cy: point.y,
                    radius: layer.mark.radius ?? 3.6,
                    fill: theme.colors.background,
                    stroke: layer.mark.stroke ?? color,
                    lineWidth: 2,
                });
            });
        });
        return nodes;
    };
    function hierarchyItems(context) {
        const { layer, table } = context;
        const idField = layer.mark.fields.id ?? layer.x.field;
        const parentField = layer.mark.fields.parent ?? layer.y.field;
        const labelField = layer.mark.fields.label ?? idField;
        const valueField = layer.mark.fields.value;
        const items = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const id = stringValue$1(table.value(rowIndex, idField));
            if (id === null || id === '')
                continue;
            const parentRaw = stringValue$1(table.value(rowIndex, parentField));
            const label = stringValue$1(table.value(rowIndex, labelField)) ?? id;
            const value = valueField === undefined
                ? (numericDataValue(table.value(rowIndex, layer.y.field)) ?? 1)
                : (numericDataValue(table.value(rowIndex, valueField)) ?? 1);
            items.push({
                id,
                parent: parentRaw === null || parentRaw === '' || parentRaw === id ? null : parentRaw,
                label,
                rowIndex,
                value: Math.max(0, value),
            });
        }
        return items;
    }
    function hierarchyDepths(items) {
        const byId = new Map(items.map((item) => [item.id, item]));
        const depths = new Map();
        const visiting = new Set();
        const depthOf = (id) => {
            const known = depths.get(id);
            if (known !== undefined)
                return known;
            if (visiting.has(id))
                return 0;
            visiting.add(id);
            const item = byId.get(id);
            const depth = item?.parent === null || item?.parent === undefined ? 0 : depthOf(item.parent) + 1;
            visiting.delete(id);
            depths.set(id, depth);
            return depth;
        };
        items.forEach((item) => depthOf(item.id));
        return depths;
    }
    const compileTreeMark = (context) => {
        const { layer, plot, theme } = context;
        const items = hierarchyItems(context);
        if (items.length === 0)
            return [];
        const depths = hierarchyDepths(items);
        const maxDepth = Math.max(0, ...depths.values());
        const levels = Array.from({ length: maxDepth + 1 }, () => []);
        items.forEach((item) => levels[depths.get(item.id) ?? 0]?.push(item));
        const orientation = layer.mark.options.orientation === 'horizontal' ? 'horizontal' : 'vertical';
        const positions = new Map();
        levels.forEach((level, depth) => {
            level.forEach((item, index) => {
                const across = (index + 1) / (level.length + 1);
                const down = maxDepth === 0 ? 0.5 : depth / maxDepth;
                positions.set(item.id, orientation === 'horizontal'
                    ? {
                        x: plot.x + plot.width * (0.08 + down * 0.84),
                        y: plot.y + plot.height * across,
                    }
                    : {
                        x: plot.x + plot.width * across,
                        y: plot.y + plot.height * (0.08 + down * 0.84),
                    });
            });
        });
        const nodes = [];
        items.forEach((item) => {
            const child = positions.get(item.id);
            const parent = item.parent === null ? undefined : positions.get(item.parent);
            if (child === undefined || parent === undefined)
                return;
            const elbow = orientation === 'horizontal'
                ? { x: (parent.x + child.x) / 2, y: parent.y }
                : { x: parent.x, y: (parent.y + child.y) / 2 };
            const elbow2 = orientation === 'horizontal' ? { x: elbow.x, y: child.y } : { x: child.x, y: elbow.y };
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:tree-edge:${item.id}`, { zIndex: layer.zIndex }),
                points: [parent, elbow, elbow2, child],
                closed: false,
                stroke: colorWithOpacity(theme.colors.axis, 0.85),
                lineWidth: 1.5,
                lineCap: 'round',
                lineJoin: 'round',
            });
        });
        const cardWidth = clamp$1(plot.width / Math.max(3, Math.max(...levels.map((level) => level.length))), 66, 112);
        const cardHeight = 30;
        items.forEach((item, index) => {
            const position = positions.get(item.id);
            if (position === undefined)
                return;
            const color = themeColor(context, depths.get(item.id) ?? index);
            nodes.push({
                type: 'rect',
                ...datumBase$1(context, `${layer.id}:tree-node:${item.id}`, item.rowIndex, 1),
                x: position.x - cardWidth / 2,
                y: position.y - cardHeight / 2,
                width: cardWidth,
                height: cardHeight,
                fill: layer.mark.fill ?? theme.colors.surface,
                stroke: layer.mark.stroke ?? color,
                lineWidth: layer.mark.lineWidth ?? 1.5,
                cornerRadius: layer.mark.cornerRadius ?? 8,
            });
            nodes.push(textNode$3(`${layer.id}:tree-label:${item.id}`, position.x, position.y, item.label, context, {
                size: Math.max(9, theme.typography.fontSize - 1),
                weight: 650,
                zIndex: layer.zIndex + 2,
            }));
        });
        return nodes;
    };
    function graphData(context) {
        const { layer, table } = context;
        const idField = layer.mark.fields.id;
        const sourceField = layer.mark.fields.source ?? layer.x.field;
        const targetField = layer.mark.fields.target ?? layer.y.field;
        const labelField = layer.mark.fields.label ?? idField;
        const valueField = layer.mark.fields.value;
        const nodesById = new Map();
        const edges = [];
        const ensureNode = (id, rowIndex, label = id) => {
            const existing = nodesById.get(id);
            if (existing !== undefined)
                return existing;
            const node = { id, label, rowIndex, degree: 0 };
            nodesById.set(id, node);
            return node;
        };
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            if (idField !== undefined && table.has(idField)) {
                const id = stringValue$1(table.value(rowIndex, idField));
                if (id !== null && id !== '') {
                    ensureNode(id, rowIndex, labelField !== undefined && table.has(labelField)
                        ? (stringValue$1(table.value(rowIndex, labelField)) ?? id)
                        : id);
                }
            }
            if (!table.has(sourceField) || !table.has(targetField))
                continue;
            const source = stringValue$1(table.value(rowIndex, sourceField));
            const target = stringValue$1(table.value(rowIndex, targetField));
            if (source === null || target === null || source === '' || target === '')
                continue;
            const sourceNode = ensureNode(source, rowIndex);
            const targetNode = ensureNode(target, rowIndex);
            sourceNode.degree += 1;
            targetNode.degree += 1;
            const value = valueField !== undefined && table.has(valueField)
                ? (numericDataValue(table.value(rowIndex, valueField)) ?? 1)
                : (numericDataValue(table.value(rowIndex, layer.y.field)) ?? 1);
            edges.push({ source, target, value: Math.max(0, value), rowIndex });
        }
        return { nodes: [...nodesById.values()], edges };
    }
    const compileGraphMark = (context) => {
        const { layer, plot, theme } = context;
        const { nodes: graphNodes, edges } = graphData(context);
        if (graphNodes.length === 0)
            return [];
        const cx = plot.x + plot.width / 2;
        const cy = plot.y + plot.height / 2;
        const radius = Math.max(20, Math.min(plot.width, plot.height) * 0.34);
        const positions = new Map();
        graphNodes.forEach((node, index) => {
            positions.set(node.id, pointOnCircle$1(cx, cy, radius, -Math.PI / 2 + (index * TAU$1) / graphNodes.length));
        });
        const maxEdge = Math.max(1, ...edges.map((edge) => edge.value));
        const totals = new Map(graphNodes.map((node) => [node.id, 0]));
        edges.forEach((edge) => {
            totals.set(edge.source, (totals.get(edge.source) ?? 0) + edge.value);
            totals.set(edge.target, (totals.get(edge.target) ?? 0) + edge.value);
        });
        const nodes = [];
        edges.forEach((edge, index) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (source === undefined || target === undefined)
                return;
            nodes.push({
                type: 'line',
                ...datumBase$1(context, `${layer.id}:graph-edge:${index}`, edge.rowIndex, 0, {
                    kind: 'edge',
                    source: edge.source,
                    target: edge.target,
                    value: edge.value,
                }),
                x1: source.x,
                y1: source.y,
                x2: target.x,
                y2: target.y,
                stroke: colorWithOpacity(theme.colors.axis, 0.55),
                lineWidth: 1 + (edge.value / maxEdge) * 4,
                lineCap: 'round',
            });
        });
        const maxDegree = Math.max(1, ...graphNodes.map((node) => node.degree));
        graphNodes.forEach((node, index) => {
            const position = positions.get(node.id);
            if (position === undefined)
                return;
            const nodeRadius = (layer.mark.radius ?? 8) + (node.degree / maxDegree) * 6;
            const color = themeColor(context, index);
            nodes.push({
                type: 'circle',
                ...datumBase$1(context, `${layer.id}:graph-node:${node.id}`, node.rowIndex, 1, {
                    kind: 'node',
                    node: node.label,
                    degree: node.degree,
                    total: totals.get(node.id) ?? 0,
                }),
                cx: position.x,
                cy: position.y,
                radius: nodeRadius,
                fill: layer.mark.fill ?? color,
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 2,
            });
            const label = pointOnCircle$1(cx, cy, radius + 20, -Math.PI / 2 + (index * TAU$1) / graphNodes.length);
            nodes.push(textNode$3(`${layer.id}:graph-label:${node.id}`, label.x, label.y, node.label, context, {
                fill: theme.colors.mutedText,
                size: Math.max(9, theme.typography.fontSize - 1),
                weight: 600,
            }));
        });
        return nodes;
    };
    const compileChordMark = (context) => {
        const { layer, plot, theme } = context;
        const { nodes: graphNodes, edges } = graphData(context);
        if (graphNodes.length < 2)
            return [];
        const cx = plot.x + plot.width / 2;
        const cy = plot.y + plot.height / 2;
        const radius = Math.max(22, Math.min(plot.width, plot.height) * 0.34);
        const totals = new Map(graphNodes.map((node) => [node.id, 0]));
        edges.forEach((edge) => {
            totals.set(edge.source, (totals.get(edge.source) ?? 0) + edge.value);
            totals.set(edge.target, (totals.get(edge.target) ?? 0) + edge.value);
        });
        const grandTotal = Math.max(1, [...totals.values()].reduce((sum, value) => sum + value, 0));
        const gap = Math.min(0.06, TAU$1 / graphNodes.length / 4);
        let cursor = -Math.PI / 2;
        const spans = new Map();
        graphNodes.forEach((node) => {
            const rawSpan = (Math.max(1, totals.get(node.id) ?? 1) / grandTotal) * (TAU$1 - gap * graphNodes.length);
            const start = cursor;
            const end = start + rawSpan;
            spans.set(node.id, { start, end, mid: (start + end) / 2 });
            cursor = end + gap;
        });
        const maxEdge = Math.max(1, ...edges.map((edge) => edge.value));
        const nodes = [];
        edges.forEach((edge, index) => {
            const sourceSpan = spans.get(edge.source);
            const targetSpan = spans.get(edge.target);
            if (sourceSpan === undefined || targetSpan === undefined)
                return;
            const source = pointOnCircle$1(cx, cy, radius - 8, sourceSpan.mid);
            const target = pointOnCircle$1(cx, cy, radius - 8, targetSpan.mid);
            const control = { x: cx, y: cy };
            nodes.push({
                type: 'path',
                ...datumBase$1(context, `${layer.id}:chord-ribbon:${index}`, edge.rowIndex, 0, {
                    kind: 'flow',
                    source: edge.source,
                    target: edge.target,
                    value: edge.value,
                }),
                points: quadraticPoints$1(source, control, target, 24),
                closed: false,
                stroke: colorWithOpacity(themeColor(context, index), 0.42),
                lineWidth: 2 + (edge.value / maxEdge) * 9,
                lineCap: 'round',
                lineJoin: 'round',
            });
        });
        graphNodes.forEach((node, index) => {
            const span = spans.get(node.id);
            if (span === undefined)
                return;
            const color = themeColor(context, index);
            nodes.push({
                type: 'path',
                ...datumBase$1(context, `${layer.id}:chord-segment:${node.id}`, node.rowIndex, 1, {
                    kind: 'segment',
                    node: node.label,
                    total: totals.get(node.id) ?? 0,
                }),
                points: sampledArc$1(cx, cy, radius, span.start, span.end, 24),
                closed: false,
                stroke: layer.mark.stroke ?? color,
                lineWidth: layer.mark.lineWidth ?? 13,
                lineCap: 'round',
                lineJoin: 'round',
            });
            const label = pointOnCircle$1(cx, cy, radius + 20, span.mid);
            nodes.push(textNode$3(`${layer.id}:chord-label:${node.id}`, label.x, label.y, node.label, context, {
                fill: theme.colors.mutedText,
                size: Math.max(9, theme.typography.fontSize - 1),
                weight: 650,
            }));
        });
        return nodes;
    };
    const compileFunnelMark = (context) => {
        const { layer, table, plot, theme } = context;
        const items = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const label = stringValue$1(table.value(rowIndex, layer.x.field));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (label === null || value === null || value < 0)
                continue;
            items.push({ label, value, rowIndex });
        }
        if (layer.mark.options.sort !== false)
            items.sort((left, right) => right.value - left.value);
        if (items.length === 0)
            return [];
        const maxValue = Math.max(1, ...items.map((item) => item.value));
        const stageHeight = plot.height / items.length;
        const nodes = [];
        items.forEach((item, index) => {
            const next = items[index + 1];
            const topWidth = plot.width * clamp$1(item.value / maxValue, 0.08, 1);
            const bottomWidth = plot.width * clamp$1((next?.value ?? item.value * 0.78) / maxValue, 0.06, 1);
            const y1 = plot.y + index * stageHeight + 2;
            const y2 = plot.y + (index + 1) * stageHeight - 2;
            const cx = plot.x + plot.width / 2;
            const fill = layer.mark.fill ?? themeColor(context, index);
            nodes.push({
                type: 'path',
                ...datumBase$1(context, `${layer.id}:funnel:${index}`, item.rowIndex),
                points: [
                    { x: cx - topWidth / 2, y: y1 },
                    { x: cx + topWidth / 2, y: y1 },
                    { x: cx + bottomWidth / 2, y: y2 },
                    { x: cx - bottomWidth / 2, y: y2 },
                ],
                closed: true,
                fill,
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 2,
                lineJoin: 'round',
            });
            nodes.push(textNode$3(`${layer.id}:funnel-label:${index}`, cx, (y1 + y2) / 2, `${item.label}  ${item.value}`, context, {
                fill: readableTextColor(fill, '#ffffff', '#0f172a'),
                size: Math.max(10, theme.typography.fontSize),
                weight: 700,
            }));
        });
        return nodes;
    };
    function parallelDimensions(context) {
        const { layer, table } = context;
        const configured = optionStrings$1(layer.mark.options.dimensions);
        const candidates = configured.length > 0
            ? configured
            : [layer.x.field, layer.y.field, ...Object.values(layer.mark.fields)];
        const fields = candidates.filter((field, index, all) => table.has(field) && all.indexOf(field) === index);
        return fields.map((field) => {
            const extent = table.extent(field);
            const values = table.unique(field);
            return extent === null
                ? { field, values, min: 0, max: Math.max(1, values.length - 1), numeric: false }
                : { field, values, min: extent[0], max: extent[1], numeric: true };
        });
    }
    const compileParallelMark = (context) => {
        const { layer, table, plot, theme } = context;
        const dimensions = parallelDimensions(context);
        if (dimensions.length < 2)
            return [];
        const nodes = [];
        const xFor = (index) => plot.x +
            (dimensions.length === 1 ? plot.width / 2 : (index / (dimensions.length - 1)) * plot.width);
        dimensions.forEach((dimension, index) => {
            const x = xFor(index);
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:parallel-axis:${dimension.field}`, { zIndex: layer.zIndex }),
                x1: x,
                y1: plot.y,
                x2: x,
                y2: plot.y + plot.height,
                stroke: theme.colors.axis,
                lineWidth: 1.2,
                lineCap: 'round',
            });
            nodes.push(textNode$3(`${layer.id}:parallel-label:${dimension.field}`, x, plot.y + 10, dimension.field, context, {
                fill: theme.colors.mutedText,
                size: Math.max(9, theme.typography.fontSize - 1),
                weight: 650,
                baseline: 'top',
            }));
        });
        const colorField = layer.mark.fields.color ?? layer.mark.fields.group;
        const colorKeys = colorField === undefined ? [] : table.unique(colorField);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const points = [];
            dimensions.forEach((dimension, dimensionIndex) => {
                const raw = table.value(rowIndex, dimension.field);
                let ratio;
                if (dimension.numeric) {
                    const value = numericDataValue(raw);
                    if (value === null)
                        return;
                    ratio =
                        dimension.max === dimension.min
                            ? 0.5
                            : (value - dimension.min) / (dimension.max - dimension.min);
                }
                else {
                    const value = stringValue$1(raw);
                    const index = value === null ? -1 : dimension.values.indexOf(value);
                    if (index < 0)
                        return;
                    ratio = dimension.values.length <= 1 ? 0.5 : index / (dimension.values.length - 1);
                }
                points.push({ x: xFor(dimensionIndex), y: plot.y + plot.height * (1 - clamp$1(ratio, 0, 1)) });
            });
            if (points.length !== dimensions.length)
                continue;
            const key = colorField === undefined ? null : stringValue$1(table.value(rowIndex, colorField));
            const colorIndex = key === null ? rowIndex : Math.max(0, colorKeys.indexOf(key));
            nodes.push({
                type: 'path',
                ...datumBase$1(context, `${layer.id}:parallel-row:${rowIndex}`, rowIndex, 1),
                points,
                closed: false,
                stroke: layer.mark.stroke ?? themeColor(context, colorIndex),
                lineWidth: layer.mark.lineWidth ?? 1.8,
                lineCap: 'round',
                lineJoin: 'round',
            });
        }
        return nodes;
    };
    const compileBoxplotMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const minField = layer.mark.fields.min ?? 'min';
        const q1Field = layer.mark.fields.q1 ?? 'q1';
        const medianField = layer.mark.fields.median ?? layer.y.field;
        const q3Field = layer.mark.fields.q3 ?? 'q3';
        const maxField = layer.mark.fields.max ?? 'max';
        const nodes = [];
        const boxWidth = Math.max(8, xScale instanceof BandScale
            ? xScale.bandwidth * 0.55
            : context.plot.width / Math.max(3, table.length * 2));
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const values = [minField, q1Field, medianField, q3Field, maxField].map((field) => table.has(field) ? numericDataValue(table.value(rowIndex, field)) : null);
            if (xValue === null || values.some((value) => value === null))
                continue;
            const [min, q1, median, q3, max] = values;
            const x = xScale.map(xValue);
            const yMin = yScale.map(min);
            const yQ1 = yScale.map(q1);
            const yMedian = yScale.map(median);
            const yQ3 = yScale.map(q3);
            const yMax = yScale.map(max);
            if (![x, yMin, yQ1, yMedian, yQ3, yMax].every(Number.isFinite))
                continue;
            const fill = layer.mark.fill ?? colorWithOpacity(context.color, 0.22);
            const stroke = layer.mark.stroke ?? context.color;
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:boxplot-whisker:${rowIndex}`, { zIndex: layer.zIndex }),
                x1: x,
                y1: yMin,
                x2: x,
                y2: yMax,
                stroke,
                lineWidth: layer.mark.lineWidth ?? 1.5,
                lineCap: 'round',
            });
            [yMin, yMax].forEach((y, capIndex) => {
                nodes.push({
                    type: 'line',
                    ...nodeBase(`${layer.id}:boxplot-cap:${rowIndex}:${capIndex}`, {
                        zIndex: layer.zIndex + 0.5,
                    }),
                    x1: x - boxWidth * 0.3,
                    y1: y,
                    x2: x + boxWidth * 0.3,
                    y2: y,
                    stroke,
                    lineWidth: layer.mark.lineWidth ?? 1.5,
                    lineCap: 'round',
                });
            });
            nodes.push({
                type: 'rect',
                ...datumBase$1(context, `${layer.id}:boxplot-box:${rowIndex}`, rowIndex, 1),
                x: x - boxWidth / 2,
                y: Math.min(yQ1, yQ3),
                width: boxWidth,
                height: Math.max(1, Math.abs(yQ3 - yQ1)),
                fill,
                stroke,
                lineWidth: layer.mark.lineWidth ?? 1.8,
                cornerRadius: layer.mark.cornerRadius ?? 3,
            });
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:boxplot-median:${rowIndex}`, { zIndex: layer.zIndex + 2 }),
                x1: x - boxWidth / 2,
                y1: yMedian,
                x2: x + boxWidth / 2,
                y2: yMedian,
                stroke: mixColor(stroke, theme.colors.text, 0.22),
                lineWidth: 2.2,
                lineCap: 'round',
            });
        }
        return nodes;
    };
    const compileEffectScatterMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const sizeField = layer.mark.fields.size;
        let maxSize = 1;
        if (sizeField !== undefined && table.has(sizeField)) {
            const extent = table.extent(sizeField);
            maxSize = Math.max(1, extent?.[1] ?? 1);
        }
        const nodes = [];
        const ringCount = clamp$1(Math.floor(finiteOption(layer.mark.options.rings, 2)), 1, 4);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            if (xValue === null || yValue === null)
                continue;
            const x = xScale.map(xValue);
            const y = yScale.map(yValue);
            if (!Number.isFinite(x) || !Number.isFinite(y))
                continue;
            const size = sizeField === undefined || !table.has(sizeField)
                ? 1
                : (numericDataValue(table.value(rowIndex, sizeField)) ?? 1) / maxSize;
            const radius = (layer.mark.radius ?? 5.5) * (0.7 + Math.sqrt(Math.max(0, size)) * 0.8);
            const color = layer.mark.fill ?? context.color;
            for (let ring = ringCount; ring >= 1; ring -= 1) {
                nodes.push({
                    type: 'circle',
                    ...nodeBase(`${layer.id}:effect-ring:${rowIndex}:${ring}`, {
                        zIndex: layer.zIndex,
                        opacity: 0.08 + (ringCount - ring) * 0.05,
                    }),
                    cx: x,
                    cy: y,
                    radius: radius * (1.45 + ring * 0.48),
                    fill: colorWithOpacity(color, 0.16),
                    stroke: colorWithOpacity(color, 0.38),
                    lineWidth: 1,
                });
            }
            nodes.push({
                type: 'circle',
                ...datumBase$1(context, `${layer.id}:effect-point:${rowIndex}`, rowIndex, 2),
                cx: x,
                cy: y,
                radius,
                fill: color,
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 2,
            });
        }
        return nodes;
    };
    const compileLinesMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const x2Field = layer.mark.fields.x2 ?? 'x2';
        const y2Field = layer.mark.fields.y2 ?? 'y2';
        const valueField = layer.mark.fields.value;
        const curvature = clamp$1(finiteOption(layer.mark.options.curvature, 0.18), -1, 1);
        const nodes = [];
        let maxValue = 1;
        if (valueField !== undefined && table.has(valueField))
            maxValue = Math.max(1, table.extent(valueField)?.[1] ?? 1);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            if (!table.has(x2Field) || !table.has(y2Field))
                continue;
            const startX = scaleInput(table.value(rowIndex, layer.x.field));
            const startY = scaleInput(table.value(rowIndex, layer.y.field));
            const endX = scaleInput(table.value(rowIndex, x2Field));
            const endY = scaleInput(table.value(rowIndex, y2Field));
            if (startX === null || startY === null || endX === null || endY === null)
                continue;
            const start = { x: xScale.map(startX), y: yScale.map(startY) };
            const end = { x: xScale.map(endX), y: yScale.map(endY) };
            if (![start.x, start.y, end.x, end.y].every(Number.isFinite))
                continue;
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.hypot(dx, dy) || 1;
            const control = {
                x: (start.x + end.x) / 2 - (dy / length) * length * curvature,
                y: (start.y + end.y) / 2 + (dx / length) * length * curvature,
            };
            const points = Math.abs(curvature) < 0.001 ? [start, end] : quadraticPoints$1(start, control, end, 24);
            const value = valueField === undefined || !table.has(valueField)
                ? 1
                : (numericDataValue(table.value(rowIndex, valueField)) ?? 1);
            const stroke = layer.mark.stroke ?? context.color;
            nodes.push({
                type: 'path',
                ...datumBase$1(context, `${layer.id}:lines-path:${rowIndex}`, rowIndex),
                points,
                closed: false,
                stroke,
                lineWidth: (layer.mark.lineWidth ?? 1.8) + (value / maxValue) * 3,
                lineCap: 'round',
                lineJoin: 'round',
            });
            const previous = points.at(-2) ?? start;
            const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
            const arrowSize = 5 + (value / maxValue) * 3;
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:lines-arrow:${rowIndex}`, { zIndex: layer.zIndex + 1 }),
                points: [
                    end,
                    pointOnCircle$1(end.x, end.y, arrowSize, angle + Math.PI * 0.82),
                    pointOnCircle$1(end.x, end.y, arrowSize, angle - Math.PI * 0.82),
                ],
                closed: true,
                fill: stroke,
                lineWidth: 0,
            });
        }
        return nodes;
    };
    function heatmapCellSpan(positions, fallback, gap) {
        const sorted = [...new Set(positions.filter(Number.isFinite))].sort((left, right) => left - right);
        let minimum = Number.POSITIVE_INFINITY;
        for (let index = 1; index < sorted.length; index += 1) {
            minimum = Math.min(minimum, (sorted[index] ?? 0) - (sorted[index - 1] ?? 0));
        }
        const span = Number.isFinite(minimum) ? minimum : fallback;
        return Math.max(1, span - Math.min(gap, Math.max(0, span - 1)));
    }
    const compileHeatmapMark = (context) => {
        const { layer, table, plot, xScale, yScale, theme } = context;
        const valueField = layer.mark.fields.value ?? 'value';
        if (!table.has(valueField))
            return [];
        const values = [];
        const xPositions = [];
        const yPositions = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const value = numericDataValue(table.value(rowIndex, valueField));
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            if (value === null || xValue === null || yValue === null)
                continue;
            values.push(value);
            xPositions.push(xScale.map(xValue));
            yPositions.push(yScale.map(yValue));
        }
        if (values.length === 0)
            return [];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const cellGap = clamp$1(finiteOption(layer.mark.options.cellGap, 1), 0, 24);
        const xCellPositions = xScale instanceof BandScale ? xScale.domain().map((value) => xScale.map(value)) : xPositions;
        const yCellPositions = yScale instanceof BandScale ? yScale.domain().map((value) => yScale.map(value)) : yPositions;
        const cellWidth = heatmapCellSpan(xCellPositions, xScale instanceof BandScale ? plot.width / Math.max(1, xScale.domain().length) : 18, cellGap);
        const cellHeight = heatmapCellSpan(yCellPositions, yScale instanceof BandScale ? plot.height / Math.max(1, yScale.domain().length) : 18, cellGap);
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const value = numericDataValue(table.value(rowIndex, valueField));
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            if (value === null || xValue === null || yValue === null)
                continue;
            const x = xScale.map(xValue);
            const y = yScale.map(yValue);
            if (!Number.isFinite(x) || !Number.isFinite(y))
                continue;
            const ratio = max === min ? 0.5 : clamp$1((value - min) / (max - min), 0, 1);
            const palette = theme.colors.sequential;
            const color = layer.mark.fill ?? palette[Math.round(ratio * (palette.length - 1))] ?? theme.colors.focus;
            nodes.push({
                type: 'rect',
                ...datumBase$1(context, `${layer.id}:heatmap:${rowIndex}`, rowIndex),
                x: x - cellWidth / 2,
                y: y - cellHeight / 2,
                width: cellWidth,
                height: cellHeight,
                fill: color,
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 1,
                cornerRadius: layer.mark.cornerRadius ?? 1,
            });
            if (cellWidth >= 34 && cellHeight >= 24 && layer.mark.options.labels !== false) {
                nodes.push(textNode$3(`${layer.id}:heatmap-label:${rowIndex}`, x, y, String(value), context, {
                    fill: readableTextColor(color, '#ffffff', '#0f172a'),
                    size: Math.max(9, theme.typography.fontSize - 1),
                    weight: 650,
                }));
            }
        }
        return nodes;
    };
    const compilePictorialBarMark = (context) => {
        const { layer, table, xScale, yScale, plot, theme } = context;
        const maxSymbols = clamp$1(Math.floor(finiteOption(layer.mark.options.maxSymbols, 12)), 2, 40);
        let maxAbs = 0;
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            maxAbs = Math.max(maxAbs, Math.abs(numericDataValue(table.value(rowIndex, layer.y.field)) ?? 0));
        }
        const unit = Math.max(1e-9, finiteOption(layer.mark.options.unit, maxAbs / maxSymbols || 1));
        const symbol = typeof layer.mark.options.symbol === 'string' ? layer.mark.options.symbol : 'circle';
        const nodes = [];
        const zero = yScale.map(0);
        const band = xScale instanceof BandScale ? xScale.bandwidth : plot.width / Math.max(2, table.length * 1.5);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const category = scaleInput(table.value(rowIndex, layer.x.field));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (category === null || value === null)
                continue;
            const x = xScale.map(category);
            const end = yScale.map(value);
            if (![x, end, zero].every(Number.isFinite))
                continue;
            const count = Math.min(maxSymbols, Math.max(1, Math.ceil(Math.abs(value) / unit)));
            const step = Math.abs(end - zero) / count;
            const requestedSize = finiteOption(layer.mark.options.symbolSize, Number.NaN);
            const size = Number.isFinite(requestedSize)
                ? clamp$1(Math.abs(requestedSize), 3, Math.max(3, band * 0.9))
                : Math.max(3, Math.min(band * 0.62, step * 0.72, 18));
            const color = layer.mark.fill ?? themeColor(context, rowIndex);
            for (let index = 0; index < count; index += 1) {
                const y = zero + Math.sign(end - zero || -1) * step * (index + 0.5);
                const id = `${layer.id}:pictorial:${rowIndex}:${index}`;
                if (symbol === 'square') {
                    nodes.push({
                        type: 'rect',
                        ...datumBase$1(context, id, rowIndex),
                        x: x - size / 2,
                        y: y - size / 2,
                        width: size,
                        height: size,
                        fill: color,
                        stroke: layer.mark.stroke ?? theme.colors.background,
                        lineWidth: layer.mark.lineWidth ?? 1,
                        cornerRadius: layer.mark.cornerRadius ?? 2,
                    });
                }
                else if (symbol === 'diamond') {
                    nodes.push({
                        type: 'path',
                        ...datumBase$1(context, id, rowIndex),
                        points: [
                            { x, y: y - size / 2 },
                            { x: x + size / 2, y },
                            { x, y: y + size / 2 },
                            { x: x - size / 2, y },
                        ],
                        closed: true,
                        fill: color,
                        stroke: layer.mark.stroke ?? theme.colors.background,
                        lineWidth: layer.mark.lineWidth ?? 1,
                        lineJoin: 'round',
                    });
                }
                else {
                    nodes.push({
                        type: 'circle',
                        ...datumBase$1(context, id, rowIndex),
                        cx: x,
                        cy: y,
                        radius: size / 2,
                        fill: color,
                        stroke: layer.mark.stroke ?? theme.colors.background,
                        lineWidth: layer.mark.lineWidth ?? 1,
                    });
                }
            }
        }
        return nodes;
    };
    const compileThemeRiverMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const seriesField = layer.mark.fields.series ?? layer.mark.fields.category ?? 'series';
        if (!table.has(seriesField))
            return [];
        const points = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const series = stringValue$1(table.value(rowIndex, seriesField));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (xValue === null || series === null || value === null)
                continue;
            points.push({ xValue, series, value: Math.max(0, value), rowIndex });
        }
        const seriesNames = [...new Set(points.map((point) => point.series))];
        const xKeys = [
            ...new Map(points.map((point) => [String(point.xValue), point.xValue])).values(),
        ].sort((left, right) => xScale.map(left) - xScale.map(right));
        if (seriesNames.length === 0 || xKeys.length < 2)
            return [];
        const values = new Map();
        points.forEach((point) => values.set(`${String(point.xValue)}\u0000${point.series}`, point));
        const totals = new Map();
        xKeys.forEach((xValue) => {
            totals.set(String(xValue), seriesNames.reduce((sum, series) => sum + (values.get(`${String(xValue)}\u0000${series}`)?.value ?? 0), 0));
        });
        const lowerBySeries = new Map();
        const upperBySeries = new Map();
        xKeys.forEach((xValue, xIndex) => {
            let cursor = -(totals.get(String(xValue)) ?? 0) / 2;
            seriesNames.forEach((series) => {
                const value = values.get(`${String(xValue)}\u0000${series}`)?.value ?? 0;
                const lower = lowerBySeries.get(series) ?? Array.from({ length: xKeys.length }, () => 0);
                const upper = upperBySeries.get(series) ?? Array.from({ length: xKeys.length }, () => 0);
                lower[xIndex] = cursor;
                cursor += value;
                upper[xIndex] = cursor;
                lowerBySeries.set(series, lower);
                upperBySeries.set(series, upper);
            });
        });
        const nodes = [];
        seriesNames.forEach((series, seriesIndex) => {
            const lower = lowerBySeries.get(series) ?? [];
            const upper = upperBySeries.get(series) ?? [];
            const top = xKeys.map((xValue, index) => ({
                x: xScale.map(xValue),
                y: yScale.map(upper[index] ?? 0),
            }));
            const bottom = xKeys
                .map((xValue, index) => ({ x: xScale.map(xValue), y: yScale.map(lower[index] ?? 0) }))
                .reverse();
            if (![...top, ...bottom].every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)))
                return;
            const color = themeColor(context, seriesIndex);
            const datum = points.find((point) => point.series === series);
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:river:${seriesIndex}`, {
                    zIndex: layer.zIndex + seriesIndex / 100,
                    opacity: layer.mark.opacity,
                    interactive: context.performance.enableHitTesting,
                    ...(datum === undefined
                        ? {}
                        : {
                            datum: {
                                layerId: layer.id,
                                rowIndex: datum.rowIndex,
                                datum: table.row(datum.rowIndex),
                            },
                        }),
                }),
                points: [...top, ...bottom],
                closed: true,
                fill: colorWithOpacity(layer.mark.fill ?? color, theme.mode === 'dark' ? 0.72 : 0.62),
                stroke: layer.mark.stroke ?? color,
                lineWidth: layer.mark.lineWidth ?? 1.2,
                lineJoin: 'round',
            });
        });
        return nodes;
    };
    function sunburstTree(items) {
        const nodes = new Map();
        items.forEach((item) => nodes.set(item.id, { ...item, children: [], total: item.value }));
        const roots = [];
        nodes.forEach((node) => {
            const parent = node.parent === null ? undefined : nodes.get(node.parent);
            if (parent === undefined)
                roots.push(node);
            else
                parent.children.push(node);
        });
        const totalOf = (node, visiting = new Set()) => {
            if (visiting.has(node.id))
                return Math.max(1, node.value);
            visiting.add(node.id);
            const childTotal = node.children.reduce((sum, child) => sum + totalOf(child, visiting), 0);
            visiting.delete(node.id);
            node.total = node.value > 0 ? node.value : Math.max(1, childTotal);
            if (childTotal > node.total)
                node.total = childTotal;
            return node.total;
        };
        roots.forEach((root) => totalOf(root));
        return roots;
    }
    const compileSunburstMark = (context) => {
        const { layer, plot, theme } = context;
        const roots = sunburstTree(hierarchyItems(context));
        if (roots.length === 0)
            return [];
        const depths = hierarchyDepths(hierarchyItems(context));
        const maxDepth = Math.max(0, ...depths.values());
        const cx = plot.x + plot.width / 2;
        const cy = plot.y + plot.height / 2;
        const outerRadius = Math.max(20, Math.min(plot.width, plot.height) * 0.42);
        const innerHole = outerRadius * clamp$1(finiteOption(layer.mark.options.innerRadius, 0.12), 0, 0.7);
        const ringWidth = (outerRadius - innerHole) / Math.max(1, maxDepth + 1);
        const nodes = [];
        let colorIndex = 0;
        const drawNode = (node, start, end, depth) => {
            const inner = innerHole + depth * ringWidth + 1;
            const outer = innerHole + (depth + 1) * ringWidth - 1;
            const color = themeColor(context, colorIndex);
            colorIndex += 1;
            nodes.push({
                type: 'path',
                ...datumBase$1(context, `${layer.id}:sunburst:${node.id}`, node.rowIndex, depth / 100),
                points: annularSector$1(cx, cy, inner, outer, start, end),
                closed: true,
                fill: layer.mark.fill ?? mixColor(color, theme.colors.background, depth * 0.08),
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 1.5,
                lineJoin: 'round',
            });
            if (end - start > 0.18 && outer - inner > 18) {
                const angle = (start + end) / 2;
                const labelPoint = pointOnCircle$1(cx, cy, (inner + outer) / 2, angle);
                nodes.push(textNode$3(`${layer.id}:sunburst-label:${node.id}`, labelPoint.x, labelPoint.y, node.label, context, {
                    fill: readableTextColor(layer.mark.fill ?? color, '#ffffff', '#0f172a'),
                    size: Math.max(8, theme.typography.fontSize - 2),
                    weight: 650,
                    rotation: (angle * 180) / Math.PI + 90,
                }));
            }
            if (node.children.length === 0)
                return;
            const total = Math.max(1, node.children.reduce((sum, child) => sum + child.total, 0));
            let cursor = start;
            node.children.forEach((child) => {
                const childEnd = cursor + ((end - start) * child.total) / total;
                drawNode(child, cursor, childEnd, depth + 1);
                cursor = childEnd;
            });
        };
        const rootTotal = Math.max(1, roots.reduce((sum, root) => sum + root.total, 0));
        let cursor = -Math.PI / 2;
        roots.forEach((root) => {
            const end = cursor + (TAU$1 * root.total) / rootTotal;
            drawNode(root, cursor, end, 0);
            cursor = end;
        });
        return nodes;
    };
    const compileCustomMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const defaultPrimitive = typeof layer.mark.options.primitive === 'string' ? layer.mark.options.primitive : 'circle';
        const primitiveField = layer.mark.fields.primitive ?? layer.mark.fields.shape;
        const x2Field = layer.mark.fields.x2;
        const y2Field = layer.mark.fields.y2;
        const labelField = layer.mark.fields.label;
        const sizeField = layer.mark.fields.size;
        const widthField = layer.mark.fields.width;
        const heightField = layer.mark.fields.height;
        const radiusField = layer.mark.fields.radius;
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            if (xValue === null || yValue === null)
                continue;
            const x = xScale.map(xValue);
            const y = yScale.map(yValue);
            if (!Number.isFinite(x) || !Number.isFinite(y))
                continue;
            const primitive = primitiveField !== undefined && table.has(primitiveField)
                ? (stringValue$1(table.value(rowIndex, primitiveField)) ?? defaultPrimitive)
                : defaultPrimitive;
            const size = sizeField !== undefined && table.has(sizeField)
                ? Math.abs(numericDataValue(table.value(rowIndex, sizeField)) ?? 12)
                : Math.abs(finiteOption(layer.mark.options.size, 12));
            const fill = layer.mark.fill ?? themeColor(context, rowIndex);
            if (primitive === 'line' &&
                x2Field !== undefined &&
                y2Field !== undefined &&
                table.has(x2Field) &&
                table.has(y2Field)) {
                const x2Value = scaleInput(table.value(rowIndex, x2Field));
                const y2Value = scaleInput(table.value(rowIndex, y2Field));
                if (x2Value === null || y2Value === null)
                    continue;
                const x2 = xScale.map(x2Value);
                const y2 = yScale.map(y2Value);
                if (!Number.isFinite(x2) || !Number.isFinite(y2))
                    continue;
                nodes.push({
                    type: 'line',
                    ...datumBase$1(context, `${layer.id}:custom-line:${rowIndex}`, rowIndex),
                    x1: x,
                    y1: y,
                    x2,
                    y2,
                    stroke: layer.mark.stroke ?? fill,
                    lineWidth: layer.mark.lineWidth ?? 2,
                    lineCap: 'round',
                });
            }
            else if (primitive === 'rect' || primitive === 'round-rect' || primitive === 'square') {
                const width = widthField !== undefined && table.has(widthField)
                    ? (numericDataValue(table.value(rowIndex, widthField)) ?? size)
                    : primitive === 'square'
                        ? size
                        : finiteOption(layer.mark.options.width, size);
                const height = heightField !== undefined && table.has(heightField)
                    ? (numericDataValue(table.value(rowIndex, heightField)) ?? size)
                    : primitive === 'square'
                        ? size
                        : finiteOption(layer.mark.options.height, size);
                nodes.push({
                    type: 'rect',
                    ...datumBase$1(context, `${layer.id}:custom-rect:${rowIndex}`, rowIndex),
                    x: x - Math.abs(width) / 2,
                    y: y - Math.abs(height) / 2,
                    width: Math.abs(width),
                    height: Math.abs(height),
                    fill,
                    stroke: layer.mark.stroke ?? theme.colors.background,
                    lineWidth: layer.mark.lineWidth ?? 1,
                    cornerRadius: primitive === 'round-rect'
                        ? (layer.mark.cornerRadius ?? 6)
                        : (layer.mark.cornerRadius ?? 2),
                });
            }
            else if (primitive === 'diamond') {
                const radius = Math.max(1, size / 2);
                nodes.push({
                    type: 'path',
                    ...datumBase$1(context, `${layer.id}:custom-diamond:${rowIndex}`, rowIndex),
                    points: [
                        { x, y: y - radius },
                        { x: x + radius, y },
                        { x, y: y + radius },
                        { x: x - radius, y },
                    ],
                    closed: true,
                    fill,
                    stroke: layer.mark.stroke ?? theme.colors.background,
                    lineWidth: layer.mark.lineWidth ?? 1.5,
                    lineJoin: 'round',
                });
            }
            else if (primitive === 'text') {
                const label = labelField !== undefined && table.has(labelField)
                    ? (stringValue$1(table.value(rowIndex, labelField)) ?? '')
                    : String(layer.mark.options.label ?? '');
                nodes.push(textNode$3(`${layer.id}:custom-text:${rowIndex}`, x, y, label, context, {
                    fill: layer.mark.stroke ?? fill,
                    size: finiteOption(layer.mark.options.fontSize, Math.max(theme.typography.fontSize, size)),
                    weight: 650,
                }));
            }
            else {
                const radius = radiusField !== undefined && table.has(radiusField)
                    ? (numericDataValue(table.value(rowIndex, radiusField)) ?? layer.mark.radius ?? size / 2)
                    : (layer.mark.radius ?? finiteOption(layer.mark.options.radius, size / 2));
                nodes.push({
                    type: 'circle',
                    ...datumBase$1(context, `${layer.id}:custom-circle:${rowIndex}`, rowIndex),
                    cx: x,
                    cy: y,
                    radius: Math.max(0, Math.abs(radius)),
                    fill,
                    stroke: layer.mark.stroke ?? theme.colors.background,
                    lineWidth: layer.mark.lineWidth ?? 1.5,
                });
            }
            if (primitive !== 'text' &&
                layer.mark.options.labels !== false &&
                labelField !== undefined &&
                table.has(labelField)) {
                const label = stringValue$1(table.value(rowIndex, labelField));
                if (label !== null && label !== '') {
                    nodes.push(textNode$3(`${layer.id}:custom-label:${rowIndex}`, x, clamp$1(y - size / 2 - 8, context.plot.y + 8, context.plot.y + context.plot.height - 8), label, context, {
                        fill: theme.colors.mutedText,
                        size: Math.max(9, theme.typography.fontSize - 1),
                        weight: 600,
                        baseline: 'middle',
                    }));
                }
            }
        }
        return nodes;
    };

    const TAU = Math.PI * 2;
    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }
    function optionNumber$3(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }
    function optionString$2(value, fallback) {
        return typeof value === 'string' && value.trim() !== '' ? value : fallback;
    }
    function stringValue(value) {
        if (value === null || value === undefined)
            return null;
        return value instanceof Date ? value.toISOString() : String(value);
    }
    function paletteColor(context, index) {
        return (context.theme.colors.palette[index % context.theme.colors.palette.length] ??
            context.theme.colors.focus);
    }
    function datumBase(context, id, rowIndex, offset = 0, tooltip) {
        return nodeBase(id, {
            zIndex: context.layer.zIndex + offset,
            opacity: context.layer.mark.opacity,
            interactive: context.performance.enableHitTesting,
            datum: {
                layerId: context.layer.id,
                rowIndex,
                datum: context.table.row(rowIndex),
                ...(tooltip === undefined ? {} : { tooltip }),
            },
        });
    }
    function textNode$2(context, id, x, y, text, options = {}) {
        return {
            type: 'text',
            ...nodeBase(id, { zIndex: context.layer.zIndex + 3 }),
            x,
            y,
            text,
            fill: options.fill ?? context.theme.colors.text,
            fontFamily: context.theme.typography.fontFamily,
            fontSize: options.size ?? context.theme.typography.fontSize,
            fontWeight: options.weight ?? 600,
            align: options.align ?? 'center',
            baseline: options.baseline ?? 'middle',
            rotation: options.rotation ?? 0,
        };
    }
    function pointOnCircle(cx, cy, radius, angle) {
        return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    }
    function sampledArc(cx, cy, radius, start, end, segments = 32) {
        return Array.from({ length: segments + 1 }, (_, index) => pointOnCircle(cx, cy, radius, start + ((end - start) * index) / segments));
    }
    function annularSector(cx, cy, innerRadius, outerRadius, start, end) {
        const segments = Math.max(6, Math.ceil((Math.abs(end - start) / TAU) * 64));
        return [
            ...sampledArc(cx, cy, outerRadius, start, end, segments),
            ...sampledArc(cx, cy, innerRadius, end, start, segments),
        ];
    }
    function quadraticPoints(start, control, end, segments = 24) {
        return Array.from({ length: segments + 1 }, (_, index) => {
            const t = index / segments;
            const inverse = 1 - t;
            return {
                x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
                y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
            };
        });
    }
    function smoothPoints(points, subdivisions = 8) {
        if (points.length < 3)
            return [...points];
        const output = [];
        for (let index = 0; index < points.length - 1; index += 1) {
            const p0 = points[Math.max(0, index - 1)] ?? points[0];
            const p1 = points[index];
            const p2 = points[index + 1];
            const p3 = points[Math.min(points.length - 1, index + 2)] ?? p2;
            for (let step = 0; step < subdivisions; step += 1) {
                const t = step / subdivisions;
                const t2 = t * t;
                const t3 = t2 * t;
                output.push({
                    x: 0.5 *
                        (2 * p1.x +
                            (-p0.x + p2.x) * t +
                            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                    y: 0.5 *
                        (2 * p1.y +
                            (-p0.y + p2.y) * t +
                            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
                });
            }
        }
        output.push(points.at(-1));
        return output;
    }
    function validCartesianRows(context) {
        const { table, layer, xScale, yScale } = context;
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            if (xValue === null || yValue === null)
                continue;
            const x = xScale.map(xValue);
            const y = yScale.map(yValue);
            if (Number.isFinite(x) && Number.isFinite(y))
                rows.push({ rowIndex, x, y });
        }
        return rows;
    }
    const compileSmoothMark = (context) => {
        const rows = validCartesianRows(context);
        if (rows.length === 0)
            return [];
        const { layer, yScale, theme } = context;
        const stroke = layer.mark.stroke ?? context.color;
        const points = smoothPoints(rows.map(({ x, y }) => ({ x, y })));
        const nodes = [];
        if (layer.mark.options.area === true) {
            const baseline = yScale.map(optionNumber$3(layer.mark.options.baseline, 0));
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:smooth-area`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                }),
                points: [{ x: points[0].x, y: baseline }, ...points, { x: points.at(-1).x, y: baseline }],
                closed: true,
                fill: layer.mark.fill ?? colorWithOpacity(stroke, 0.24),
                lineWidth: 0,
            });
        }
        nodes.push({
            type: 'path',
            ...nodeBase(`${layer.id}:smooth-line`, {
                zIndex: layer.zIndex + 1,
                opacity: layer.mark.opacity,
            }),
            points,
            closed: false,
            stroke,
            lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth,
            lineCap: 'round',
            lineJoin: 'round',
        });
        if (layer.mark.point) {
            for (const row of rows) {
                nodes.push({
                    type: 'circle',
                    ...datumBase(context, `${layer.id}:smooth-point:${row.rowIndex}`, row.rowIndex, 2),
                    cx: row.x,
                    cy: row.y,
                    radius: layer.mark.radius ?? theme.mark.pointRadius,
                    fill: theme.colors.background,
                    stroke,
                    lineWidth: 2,
                });
            }
        }
        else {
            rows.forEach((row) => {
                nodes.push({
                    type: 'circle',
                    ...datumBase(context, `${layer.id}:smooth-hit:${row.rowIndex}`, row.rowIndex, 2),
                    cx: row.x,
                    cy: row.y,
                    radius: Math.max(2.5, layer.mark.radius ?? 3),
                    fill: stroke,
                    stroke: theme.colors.background,
                    lineWidth: 1,
                });
            });
        }
        return nodes;
    };
    const compileRangeMark = (context) => {
        const { layer, table, xScale, yScale, theme, plot } = context;
        const lowField = layer.mark.fields.low ?? 'low';
        const highField = layer.mark.fields.high ?? 'high';
        const mode = optionString$2(layer.mark.options.mode, 'area');
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const low = numericDataValue(table.value(rowIndex, lowField));
            const high = numericDataValue(table.value(rowIndex, highField));
            if (xValue === null || low === null || high === null)
                continue;
            const x = xScale.map(xValue);
            const yLow = yScale.map(low);
            const yHigh = yScale.map(high);
            if ([x, yLow, yHigh].every(Number.isFinite)) {
                rows.push({ rowIndex, x, low: yLow, high: yHigh });
            }
        }
        if (rows.length === 0)
            return [];
        const stroke = layer.mark.stroke ?? context.color;
        const nodes = [];
        if (mode === 'area') {
            const highPoints = rows.map((row) => ({ x: row.x, y: row.high }));
            const lowPoints = rows.map((row) => ({ x: row.x, y: row.low })).reverse();
            const smooth = layer.mark.options.smooth === true;
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:range-band`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                }),
                points: [
                    ...(smooth ? smoothPoints(highPoints) : highPoints),
                    ...(smooth ? smoothPoints(lowPoints) : lowPoints),
                ],
                closed: true,
                fill: layer.mark.fill ?? colorWithOpacity(stroke, 0.24),
                stroke,
                lineWidth: layer.mark.lineWidth ?? 1.5,
                lineJoin: 'round',
            });
            for (const row of rows) {
                nodes.push({
                    type: 'circle',
                    ...datumBase(context, `${layer.id}:range-hit:${row.rowIndex}`, row.rowIndex, 1),
                    cx: row.x,
                    cy: (row.low + row.high) / 2,
                    radius: Math.max(3, layer.mark.radius ?? 3.5),
                    fill: stroke,
                    stroke: theme.colors.background,
                    lineWidth: 1,
                });
            }
            return nodes;
        }
        const width = Math.max(5, xScale instanceof BandScale
            ? xScale.bandwidth * 0.55
            : (plot.width / Math.max(2, rows.length * 1.5)) * 0.55);
        for (const row of rows) {
            if (mode === 'column') {
                nodes.push({
                    type: 'rect',
                    ...datumBase(context, `${layer.id}:range-column:${row.rowIndex}`, row.rowIndex),
                    x: row.x - width / 2,
                    y: Math.min(row.low, row.high),
                    width,
                    height: Math.max(1, Math.abs(row.low - row.high)),
                    fill: layer.mark.fill ?? colorWithOpacity(stroke, 0.72),
                    stroke,
                    lineWidth: layer.mark.lineWidth ?? 1,
                    cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
                });
                continue;
            }
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:range-stem:${row.rowIndex}`, { zIndex: layer.zIndex }),
                x1: row.x,
                y1: row.low,
                x2: row.x,
                y2: row.high,
                stroke,
                lineWidth: layer.mark.lineWidth ?? 2,
                lineCap: 'round',
            });
            const radius = Math.max(3, layer.mark.radius ?? 5);
            for (const [suffix, y, fill] of [
                ['low', row.low, theme.colors.background],
                ['high', row.high, layer.mark.fill ?? stroke],
            ]) {
                nodes.push({
                    type: 'circle',
                    ...datumBase(context, `${layer.id}:${suffix}:${row.rowIndex}`, row.rowIndex, 1),
                    cx: row.x,
                    cy: y,
                    radius,
                    fill,
                    stroke,
                    lineWidth: 2,
                });
            }
        }
        return nodes;
    };
    const compileDistributionMark = (context) => {
        const { layer, table, plot, theme } = context;
        const sourceField = layer.mark.fields.value ?? layer.y.field;
        const values = [];
        for (let index = 0; index < table.length; index += 1) {
            const value = numericDataValue(table.value(index, sourceField));
            if (value !== null)
                values.push(value);
        }
        if (values.length < 2)
            return [];
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const deviation = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length - 1));
        const sigma = deviation || 1;
        const samples = clamp(Math.floor(optionNumber$3(layer.mark.options.samples, 72)), 24, 160);
        const densities = Array.from({ length: samples + 1 }, (_, index) => {
            const xValue = mean - sigma * 3.5 + (sigma * 7 * index) / samples;
            const density = Math.exp(-0.5 * ((xValue - mean) / sigma) ** 2) / (sigma * Math.sqrt(TAU));
            return { xValue, density };
        });
        const maximum = Math.max(...densities.map(({ density }) => density));
        const points = densities.map(({ xValue, density }) => ({
            x: plot.x + ((xValue - (mean - sigma * 3.5)) / (sigma * 7)) * plot.width,
            y: plot.y + plot.height - (density / maximum) * plot.height * 0.82,
        }));
        const baseline = plot.y + plot.height;
        const stroke = layer.mark.stroke ?? context.color;
        return [
            {
                type: 'path',
                ...datumBase(context, `${layer.id}:distribution-area`, 0),
                points: [{ x: points[0].x, y: baseline }, ...points, { x: points.at(-1).x, y: baseline }],
                closed: true,
                fill: layer.mark.fill ?? colorWithOpacity(stroke, 0.2),
                lineWidth: 0,
            },
            {
                type: 'path',
                ...nodeBase(`${layer.id}:distribution-line`, { zIndex: layer.zIndex + 1 }),
                points,
                closed: false,
                stroke,
                lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth + 0.5,
                lineCap: 'round',
                lineJoin: 'round',
            },
            textNode$2(context, `${layer.id}:distribution-mean`, plot.x + plot.width / 2, plot.y + 14, `μ ${mean.toFixed(2)} · σ ${sigma.toFixed(2)}`, {
                fill: theme.colors.mutedText,
                size: Math.max(9, theme.typography.fontSize - 1),
            }),
        ];
    };
    const compileBulletMark = (context) => {
        const { layer, table, xScale, yScale, theme, plot } = context;
        const targetField = layer.mark.fields.target ?? 'target';
        const nodes = [];
        const width = Math.max(8, xScale instanceof BandScale
            ? xScale.bandwidth * 0.62
            : plot.width / Math.max(3, table.length * 2));
        const ranges = Array.isArray(layer.mark.options.ranges)
            ? layer.mark.options.ranges.filter((value) => typeof value === 'number')
            : [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            const target = numericDataValue(table.value(rowIndex, targetField));
            if (xValue === null || value === null || target === null)
                continue;
            const x = xScale.map(xValue);
            const baseline = yScale.map(0);
            const rangeValues = ranges.length > 0 ? ranges : [value * 0.65, value * 0.85, Math.max(value, target) * 1.15];
            rangeValues
                .slice()
                .sort((left, right) => right - left)
                .forEach((range, index) => {
                const y = yScale.map(range);
                nodes.push({
                    type: 'rect',
                    ...nodeBase(`${layer.id}:bullet-range:${rowIndex}:${index}`, {
                        zIndex: layer.zIndex - 2 + index * 0.1,
                    }),
                    x: x - width / 2,
                    y: Math.min(y, baseline),
                    width,
                    height: Math.max(1, Math.abs(baseline - y)),
                    fill: mixColor(theme.colors.background, theme.colors.mutedText, 0.15 + index * 0.12),
                    lineWidth: 0,
                    cornerRadius: 2,
                });
            });
            const valueY = yScale.map(value);
            const targetY = yScale.map(target);
            nodes.push({
                type: 'rect',
                ...datumBase(context, `${layer.id}:bullet-value:${rowIndex}`, rowIndex),
                x: x - width * 0.22,
                y: Math.min(valueY, baseline),
                width: width * 0.44,
                height: Math.max(1, Math.abs(baseline - valueY)),
                fill: layer.mark.fill ?? context.color,
                lineWidth: 0,
                cornerRadius: layer.mark.cornerRadius ?? 2,
            });
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:bullet-target:${rowIndex}`, { zIndex: layer.zIndex + 2 }),
                x1: x - width * 0.42,
                y1: targetY,
                x2: x + width * 0.42,
                y2: targetY,
                stroke: layer.mark.stroke ?? theme.colors.text,
                lineWidth: layer.mark.lineWidth ?? 2.5,
                lineCap: 'round',
            });
        }
        return nodes;
    };
    const compileContourMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const valueField = layer.mark.fields.value ?? 'value';
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            const value = numericDataValue(table.value(rowIndex, valueField));
            if (xValue === null || yValue === null || value === null)
                continue;
            const x = xScale.map(xValue);
            const y = yScale.map(yValue);
            if (Number.isFinite(x) && Number.isFinite(y))
                rows.push({ rowIndex, x, y, value });
        }
        if (rows.length === 0)
            return [];
        const minimum = Math.min(...rows.map(({ value }) => value));
        const maximum = Math.max(...rows.map(({ value }) => value));
        const xValues = [...new Set(rows.map(({ x }) => x))].sort((left, right) => left - right);
        const yValues = [...new Set(rows.map(({ y }) => y))].sort((left, right) => left - right);
        const cellWidth = Math.max(5, ((xValues[1] ?? xValues[0] + 18) - xValues[0]) * 0.92);
        const cellHeight = Math.max(5, ((yValues[1] ?? yValues[0] + 18) - yValues[0]) * 0.92);
        const nodes = rows.map((row) => {
            const ratio = maximum === minimum ? 0.5 : (row.value - minimum) / (maximum - minimum);
            const index = Math.round(ratio * (theme.colors.sequential.length - 1));
            return {
                type: 'rect',
                ...datumBase(context, `${layer.id}:contour-cell:${row.rowIndex}`, row.rowIndex),
                x: row.x - cellWidth / 2,
                y: row.y - cellHeight / 2,
                width: cellWidth,
                height: cellHeight,
                fill: layer.mark.fill ?? theme.colors.sequential[index] ?? context.color,
                lineWidth: 0,
                cornerRadius: layer.mark.cornerRadius ?? 2,
            };
        });
        const levelCount = clamp(Math.floor(optionNumber$3(layer.mark.options.levels, 5)), 2, 10);
        for (let levelIndex = 1; levelIndex < levelCount; levelIndex += 1) {
            const target = minimum + ((maximum - minimum) * levelIndex) / levelCount;
            const candidates = rows.filter((row) => row.value >= target);
            if (candidates.length < 2)
                continue;
            const center = {
                x: candidates.reduce((sum, row) => sum + row.x, 0) / candidates.length,
                y: candidates.reduce((sum, row) => sum + row.y, 0) / candidates.length,
            };
            const radiusX = Math.max(...candidates.map((row) => Math.abs(row.x - center.x))) + cellWidth * 0.45;
            const radiusY = Math.max(...candidates.map((row) => Math.abs(row.y - center.y))) + cellHeight * 0.45;
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:contour-line:${levelIndex}`, { zIndex: layer.zIndex + 2 }),
                points: Array.from({ length: 37 }, (_, index) => {
                    const angle = (index / 36) * TAU;
                    return {
                        x: center.x + Math.cos(angle) * radiusX,
                        y: center.y + Math.sin(angle) * radiusY,
                    };
                }),
                closed: true,
                stroke: layer.mark.stroke ?? colorWithOpacity(theme.colors.text, 0.72),
                lineWidth: layer.mark.lineWidth ?? 1.2,
                lineJoin: 'round',
            });
        }
        return nodes;
    };
    const compileCylinderMark = (context) => {
        const { layer, table, xScale, yScale, plot, theme } = context;
        const width = Math.max(8, xScale instanceof BandScale
            ? xScale.bandwidth * 0.58
            : plot.width / Math.max(3, table.length * 1.8));
        const ellipseHeight = clamp(width * 0.28, 4, 18);
        const baseline = yScale.map(0);
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (xValue === null || value === null)
                continue;
            const x = xScale.map(xValue);
            const y = yScale.map(value);
            if (![x, y, baseline].every(Number.isFinite))
                continue;
            const top = Math.min(y, baseline);
            const bottom = Math.max(y, baseline);
            const color = layer.mark.fill ?? paletteColor(context, rowIndex);
            nodes.push({
                type: 'rect',
                ...datumBase(context, `${layer.id}:cylinder-body:${rowIndex}`, rowIndex),
                x: x - width / 2,
                y: top,
                width,
                height: Math.max(1, bottom - top),
                fill: color,
                stroke: layer.mark.stroke ?? mixColor(color, theme.colors.text, 0.25),
                lineWidth: layer.mark.lineWidth ?? 1,
                cornerRadius: 0,
            });
            for (const [suffix, centerY, fill] of [
                ['top', top, mixColor(color, '#ffffff', 0.22)],
                ['bottom', bottom, mixColor(color, theme.colors.text, 0.12)],
            ]) {
                const points = Array.from({ length: 25 }, (_, index) => {
                    const angle = (index / 24) * TAU;
                    return {
                        x: x + Math.cos(angle) * (width / 2),
                        y: centerY + Math.sin(angle) * (ellipseHeight / 2),
                    };
                });
                nodes.push({
                    type: 'path',
                    ...nodeBase(`${layer.id}:cylinder-${suffix}:${rowIndex}`, { zIndex: layer.zIndex + 1 }),
                    points,
                    closed: true,
                    fill,
                    stroke: layer.mark.stroke ?? mixColor(color, theme.colors.text, 0.25),
                    lineWidth: layer.mark.lineWidth ?? 1,
                });
            }
        }
        return nodes;
    };
    const compileArcDiagramMark = (context) => {
        const { layer, table, plot, theme } = context;
        const sourceField = layer.mark.fields.source ?? layer.x.field;
        const targetField = layer.mark.fields.target ?? 'target';
        const valueField = layer.mark.fields.value ?? layer.y.field;
        const names = [];
        const seen = new Set();
        const links = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const source = stringValue(table.value(rowIndex, sourceField));
            const target = table.has(targetField) ? stringValue(table.value(rowIndex, targetField)) : null;
            const value = numericDataValue(table.value(rowIndex, valueField)) ?? 1;
            if (source === null || target === null)
                continue;
            for (const name of [source, target]) {
                if (!seen.has(name)) {
                    seen.add(name);
                    names.push(name);
                }
            }
            links.push({ rowIndex, source, target, value: Math.max(0, value) });
        }
        if (names.length === 0)
            return [];
        const baseline = plot.y + plot.height * 0.78;
        const positions = new Map(names.map((name, index) => [
            name,
            plot.x + (plot.width * (index + 0.5)) / Math.max(1, names.length),
        ]));
        const maximum = Math.max(1, ...links.map(({ value }) => value));
        const nodes = [];
        for (const link of links) {
            const startX = positions.get(link.source);
            const endX = positions.get(link.target);
            if (startX === undefined || endX === undefined)
                continue;
            const height = Math.min(plot.height * 0.64, Math.abs(endX - startX) * 0.55 + 18);
            nodes.push({
                type: 'path',
                ...datumBase(context, `${layer.id}:arc-link:${link.rowIndex}`, link.rowIndex),
                points: quadraticPoints({ x: startX, y: baseline }, { x: (startX + endX) / 2, y: baseline - height }, { x: endX, y: baseline }, 32),
                closed: false,
                stroke: layer.mark.stroke ?? paletteColor(context, names.indexOf(link.source)),
                lineWidth: (layer.mark.lineWidth ?? 1.6) + (link.value / maximum) * 5,
                lineCap: 'round',
                lineJoin: 'round',
            });
        }
        names.forEach((name, index) => {
            const x = positions.get(name);
            nodes.push({
                type: 'circle',
                ...nodeBase(`${layer.id}:arc-node:${index}`, { zIndex: layer.zIndex + 2 }),
                cx: x,
                cy: baseline,
                radius: layer.mark.radius ?? 6,
                fill: paletteColor(context, index),
                stroke: theme.colors.background,
                lineWidth: 2,
            });
            nodes.push(textNode$2(context, `${layer.id}:arc-label:${index}`, x, baseline + 17, name, {
                fill: theme.colors.mutedText,
                size: Math.max(9, theme.typography.fontSize - 1),
            }));
        });
        return nodes;
    };
    const compileItemMark = (context) => {
        const { layer, table, plot, theme } = context;
        const values = [];
        let total = 0;
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const label = stringValue(table.value(rowIndex, layer.x.field));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (label === null || value === null || value <= 0)
                continue;
            values.push({ rowIndex, label, value });
            total += value;
        }
        if (values.length === 0 || total <= 0)
            return [];
        const count = clamp(Math.floor(optionNumber$3(layer.mark.options.items, 100)), 20, 400);
        const columns = Math.ceil(Math.sqrt((count * plot.width) / Math.max(1, plot.height)));
        const rows = Math.ceil(count / columns);
        const gap = 2;
        const size = Math.max(2, Math.min(plot.width / columns, plot.height / rows) - gap);
        const assignments = [];
        values.forEach((item, colorIndex) => {
            const itemCount = Math.max(1, Math.round((item.value / total) * count));
            for (let index = 0; index < itemCount && assignments.length < count; index += 1) {
                assignments.push({ rowIndex: item.rowIndex, colorIndex });
            }
        });
        while (assignments.length < count)
            assignments.push({ rowIndex: values[0].rowIndex, colorIndex: 0 });
        return assignments.map((assignment, index) => {
            const column = index % columns;
            const row = Math.floor(index / columns);
            return {
                type: 'circle',
                ...datumBase(context, `${layer.id}:item:${index}`, assignment.rowIndex),
                cx: plot.x + column * (size + gap) + size / 2,
                cy: plot.y + plot.height - row * (size + gap) - size / 2,
                radius: size / 2,
                fill: layer.mark.fill ?? paletteColor(context, assignment.colorIndex),
                stroke: theme.colors.background,
                lineWidth: 0.8,
            };
        });
    };
    const compileLollipopMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const baseline = yScale.map(optionNumber$3(layer.mark.options.baseline, 0));
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            if (xValue === null || yValue === null)
                continue;
            const x = xScale.map(xValue);
            const y = yScale.map(yValue);
            if (![x, y, baseline].every(Number.isFinite))
                continue;
            const color = layer.mark.fill ?? paletteColor(context, rowIndex);
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:lollipop-stem:${rowIndex}`, { zIndex: layer.zIndex }),
                x1: x,
                y1: baseline,
                x2: x,
                y2: y,
                stroke: layer.mark.stroke ?? mixColor(color, theme.colors.background, 0.18),
                lineWidth: layer.mark.lineWidth ?? 2,
                lineCap: 'round',
            });
            nodes.push({
                type: 'circle',
                ...datumBase(context, `${layer.id}:lollipop-head:${rowIndex}`, rowIndex, 1),
                cx: x,
                cy: y,
                radius: layer.mark.radius ?? 7,
                fill: color,
                stroke: theme.colors.background,
                lineWidth: 2,
            });
        }
        return nodes;
    };
    const compilePackedBubbleMark = (context) => {
        const { layer, table, plot, theme } = context;
        const values = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            const label = stringValue(table.value(rowIndex, layer.x.field));
            if (value !== null && value >= 0 && label !== null)
                values.push({ rowIndex, value, label });
        }
        if (values.length === 0)
            return [];
        const maximum = Math.max(1, ...values.map(({ value }) => value));
        const center = { x: plot.x + plot.width / 2, y: plot.y + plot.height / 2 };
        const maxRadius = Math.min(plot.width, plot.height) * 0.16;
        const golden = Math.PI * (3 - Math.sqrt(5));
        const placed = [];
        const nodes = [];
        values
            .slice()
            .sort((left, right) => right.value - left.value)
            .forEach((item, index) => {
            const radius = Math.max(8, Math.sqrt(item.value / maximum) * maxRadius);
            let position = center;
            for (let attempt = 0; attempt < 240; attempt += 1) {
                const distance = attempt === 0 ? 0 : Math.sqrt(attempt) * (radius * 0.62 + 4);
                const candidate = {
                    x: center.x + Math.cos(attempt * golden) * distance,
                    y: center.y + Math.sin(attempt * golden) * distance,
                };
                const fits = placed.every((other) => Math.hypot(candidate.x - other.x, candidate.y - other.y) >= radius + other.radius + 2);
                if (fits) {
                    position = candidate;
                    break;
                }
            }
            placed.push({ ...position, radius });
            const color = layer.mark.fill ?? paletteColor(context, index);
            nodes.push({
                type: 'circle',
                ...datumBase(context, `${layer.id}:packed:${item.rowIndex}`, item.rowIndex),
                cx: position.x,
                cy: position.y,
                radius,
                fill: colorWithOpacity(color, 0.86),
                stroke: theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 2,
            });
            if (radius >= 18) {
                nodes.push(textNode$2(context, `${layer.id}:packed-label:${item.rowIndex}`, position.x, position.y, item.label, {
                    fill: readableTextColor(color, '#ffffff', '#0f172a'),
                    size: clamp(radius * 0.34, 9, 14),
                }));
            }
        });
        return nodes;
    };
    const compileParetoMark = (context) => {
        const { layer, table, xScale, yScale, plot, theme } = context;
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (xValue === null || value === null)
                continue;
            const x = xScale.map(xValue);
            if (Number.isFinite(x))
                rows.push({ rowIndex, x, value: Math.max(0, value) });
        }
        if (rows.length === 0)
            return [];
        const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
        const baseline = yScale.map(0);
        const width = Math.max(5, xScale instanceof BandScale
            ? xScale.bandwidth * 0.62
            : plot.width / Math.max(3, rows.length * 1.6));
        let running = 0;
        const cumulative = [];
        const nodes = [];
        for (const row of rows) {
            const y = yScale.map(row.value);
            running += row.value;
            cumulative.push({ x: row.x, y: plot.y + plot.height * (1 - running / total) });
            nodes.push({
                type: 'rect',
                ...datumBase(context, `${layer.id}:pareto-bar:${row.rowIndex}`, row.rowIndex),
                x: row.x - width / 2,
                y: Math.min(y, baseline),
                width,
                height: Math.max(1, Math.abs(baseline - y)),
                fill: layer.mark.fill ?? context.color,
                stroke: theme.colors.background,
                lineWidth: 1,
                cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
            });
        }
        nodes.push({
            type: 'path',
            ...nodeBase(`${layer.id}:pareto-line`, { zIndex: layer.zIndex + 2 }),
            points: cumulative,
            closed: false,
            stroke: layer.mark.stroke ?? theme.colors.palette[3] ?? theme.colors.focus,
            lineWidth: layer.mark.lineWidth ?? 2.5,
            lineCap: 'round',
            lineJoin: 'round',
        });
        cumulative.forEach((point, index) => {
            const row = rows[index];
            nodes.push({
                type: 'circle',
                ...datumBase(context, `${layer.id}:pareto-point:${row.rowIndex}`, row.rowIndex, 3),
                cx: point.x,
                cy: point.y,
                radius: 3.5,
                fill: theme.colors.background,
                stroke: layer.mark.stroke ?? theme.colors.palette[3] ?? theme.colors.focus,
                lineWidth: 2,
            });
        });
        return nodes;
    };
    const compilePolygonMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const seriesField = layer.mark.fields.series;
        const groups = new Map();
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            if (xValue === null || yValue === null)
                continue;
            const point = { x: xScale.map(xValue), y: yScale.map(yValue) };
            if (![point.x, point.y].every(Number.isFinite))
                continue;
            const key = seriesField === undefined || !table.has(seriesField)
                ? 'Series'
                : (stringValue(table.value(rowIndex, seriesField)) ?? 'Series');
            const group = groups.get(key) ?? [];
            group.push({ rowIndex, point });
            groups.set(key, group);
        }
        const nodes = [];
        [...groups.entries()].forEach(([key, rows], groupIndex) => {
            if (rows.length < 3)
                return;
            const color = layer.mark.fill ?? paletteColor(context, groupIndex);
            nodes.push({
                type: 'path',
                ...datumBase(context, `${layer.id}:polygon:${groupIndex}`, rows[0].rowIndex),
                points: rows.map(({ point }) => point),
                closed: true,
                fill: colorWithOpacity(color, 0.24),
                stroke: layer.mark.stroke ?? color,
                lineWidth: layer.mark.lineWidth ?? 2,
                lineJoin: 'round',
            });
            rows.forEach(({ rowIndex, point }) => {
                nodes.push({
                    type: 'circle',
                    ...datumBase(context, `${layer.id}:polygon-point:${rowIndex}`, rowIndex, 1),
                    cx: point.x,
                    cy: point.y,
                    radius: layer.mark.radius ?? 3.5,
                    fill: theme.colors.background,
                    stroke: layer.mark.stroke ?? color,
                    lineWidth: 1.5,
                });
            });
            if (layer.mark.options.labels === true) {
                const center = rows.reduce((sum, row) => ({
                    x: sum.x + row.point.x / rows.length,
                    y: sum.y + row.point.y / rows.length,
                }), { x: 0, y: 0 });
                nodes.push(textNode$2(context, `${layer.id}:polygon-label:${groupIndex}`, center.x, center.y, key));
            }
        });
        return nodes;
    };
    const compilePyramidMark = (context) => {
        const { layer, table, plot, theme } = context;
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const label = stringValue(table.value(rowIndex, layer.x.field));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (label !== null && value !== null && value >= 0)
                rows.push({ rowIndex, label, value });
        }
        if (rows.length === 0)
            return [];
        const variant = optionString$2(layer.mark.options.variant, 'pyramid');
        const reverse = variant.includes('funnel');
        const depth = variant.includes('3d')
            ? clamp(optionNumber$3(layer.mark.options.depth, 12), 4, 24)
            : 0;
        const sorted = layer.mark.options.sort === false ? rows : rows.slice().sort((a, b) => b.value - a.value);
        const maximum = Math.max(1, ...sorted.map(({ value }) => value));
        const height = plot.height / sorted.length;
        const centerX = plot.x + plot.width / 2 - depth / 2;
        const maxWidth = plot.width * 0.82;
        const nodes = [];
        sorted.forEach((row, index) => {
            const currentRatio = clamp(row.value / maximum, 0.06, 1);
            const nextRatio = clamp((sorted[index + 1]?.value ?? 0) / maximum, 0.03, 1);
            const topRatio = reverse ? currentRatio : nextRatio;
            const bottomRatio = reverse ? nextRatio : currentRatio;
            const y1 = plot.y + index * height + 1;
            const y2 = plot.y + (index + 1) * height - 1;
            const color = layer.mark.fill ?? paletteColor(context, index);
            const front = [
                { x: centerX - (maxWidth * topRatio) / 2, y: y1 },
                { x: centerX + (maxWidth * topRatio) / 2, y: y1 },
                { x: centerX + (maxWidth * bottomRatio) / 2, y: y2 },
                { x: centerX - (maxWidth * bottomRatio) / 2, y: y2 },
            ];
            if (depth > 0) {
                nodes.push({
                    type: 'path',
                    ...nodeBase(`${layer.id}:pyramid-depth:${row.rowIndex}`, { zIndex: layer.zIndex }),
                    points: [
                        front[1],
                        { x: front[1].x + depth, y: front[1].y - depth * 0.45 },
                        { x: front[2].x + depth, y: front[2].y - depth * 0.45 },
                        front[2],
                    ],
                    closed: true,
                    fill: mixColor(color, theme.colors.text, 0.18),
                    lineWidth: 0,
                });
            }
            nodes.push({
                type: 'path',
                ...datumBase(context, `${layer.id}:pyramid:${row.rowIndex}`, row.rowIndex, 1),
                points: front,
                closed: true,
                fill: color,
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 1,
                lineJoin: 'round',
            });
            if (Math.min(maxWidth * topRatio, maxWidth * bottomRatio) > 62) {
                nodes.push(textNode$2(context, `${layer.id}:pyramid-label:${row.rowIndex}`, centerX, (y1 + y2) / 2, row.label, {
                    fill: readableTextColor(color, '#ffffff', '#0f172a'),
                    size: Math.max(9, theme.typography.fontSize - 1),
                }));
            }
        });
        return nodes;
    };
    const compileScatter3dMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const zField = layer.mark.fields.z ?? 'z';
        const extent = table.has(zField) ? table.extent(zField) : null;
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            const z = table.has(zField) ? numericDataValue(table.value(rowIndex, zField)) : 0;
            if (xValue === null || yValue === null || z === null)
                continue;
            const ratio = extent === null || extent[1] === extent[0] ? 0.5 : (z - extent[0]) / (extent[1] - extent[0]);
            const perspective = (ratio - 0.5) * clamp(optionNumber$3(layer.mark.options.perspective, 18), 0, 42);
            const x = xScale.map(xValue) + perspective;
            const y = yScale.map(yValue) - perspective * 0.55;
            const radius = (layer.mark.radius ?? 5) * (0.72 + ratio * 0.9);
            const color = layer.mark.fill ?? paletteColor(context, rowIndex);
            nodes.push({
                type: 'circle',
                ...nodeBase(`${layer.id}:scatter-shadow:${rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: 0.16,
                }),
                cx: x + 3,
                cy: y + 4,
                radius: radius * 1.05,
                fill: theme.colors.text,
                lineWidth: 0,
            });
            nodes.push({
                type: 'circle',
                ...datumBase(context, `${layer.id}:scatter-3d:${rowIndex}`, rowIndex, ratio),
                cx: x,
                cy: y,
                radius,
                fill: mixColor(color, '#ffffff', (1 - ratio) * 0.18),
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 1.5,
            });
        }
        return nodes;
    };
    const compileSolidGaugeMark = (context) => {
        const { layer, table, plot, theme } = context;
        const minimum = optionNumber$3(layer.mark.options.min, 0);
        const maximum = optionNumber$3(layer.mark.options.max, 100);
        const start = optionNumber$3(layer.mark.options.startAngle, -Math.PI * 0.75);
        const end = optionNumber$3(layer.mark.options.endAngle, Math.PI * 0.75);
        const cx = plot.x + plot.width / 2;
        const cy = plot.y + plot.height * 0.58;
        const outer = Math.min(plot.width, plot.height) * 0.38;
        const thickness = clamp(optionNumber$3(layer.mark.options.thickness, outer * 0.18), 6, outer * 0.45);
        const nodes = [
            {
                type: 'path',
                ...nodeBase(`${layer.id}:solid-track`, { zIndex: layer.zIndex }),
                points: annularSector(cx, cy, outer - thickness, outer, start, end),
                closed: true,
                fill: colorWithOpacity(theme.colors.grid, 0.62),
                lineWidth: 0,
            },
        ];
        const count = Math.max(1, table.length);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (value === null)
                continue;
            const ratio = clamp((value - minimum) / Math.max(1e-9, maximum - minimum), 0, 1);
            const ringOuter = outer - rowIndex * (thickness + 5);
            const ringInner = Math.max(4, ringOuter - thickness);
            const color = layer.mark.fill ?? paletteColor(context, rowIndex);
            nodes.push({
                type: 'path',
                ...datumBase(context, `${layer.id}:solid-value:${rowIndex}`, rowIndex, 1),
                points: annularSector(cx, cy, ringInner, ringOuter, start, start + (end - start) * ratio),
                closed: true,
                fill: color,
                stroke: theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 1,
            });
            if (rowIndex === count - 1) {
                nodes.push(textNode$2(context, `${layer.id}:solid-label`, cx, cy + outer * 0.2, `${Math.round(value)}`, {
                    size: clamp(outer * 0.2, 16, 30),
                    weight: 700,
                }));
            }
        }
        return nodes;
    };
    function tilePolygon(shape, x, y, width, height) {
        if (shape === 'diamond') {
            return [
                { x, y: y - height / 2 },
                { x: x + width / 2, y },
                { x, y: y + height / 2 },
                { x: x - width / 2, y },
            ];
        }
        return [
            { x: x - width / 2, y: y - height * 0.25 },
            { x, y: y - height / 2 },
            { x: x + width / 2, y: y - height * 0.25 },
            { x: x + width / 2, y: y + height * 0.25 },
            { x, y: y + height / 2 },
            { x: x - width / 2, y: y + height * 0.25 },
        ];
    }
    const compileTilemapMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const valueField = layer.mark.fields.value ?? 'value';
        const values = table.has(valueField) ? table.extent(valueField) : null;
        const shape = optionString$2(layer.mark.options.shape, 'hexagon');
        const width = xScale instanceof BandScale ? xScale.bandwidth * 0.92 : 24;
        const height = yScale instanceof BandScale ? yScale.bandwidth * 0.92 : 22;
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            const value = table.has(valueField) ? numericDataValue(table.value(rowIndex, valueField)) : 0;
            if (xValue === null || yValue === null || value === null)
                continue;
            const x = xScale.map(xValue);
            const y = yScale.map(yValue);
            const ratio = values === null || values[1] === values[0]
                ? 0.5
                : (value - values[0]) / (values[1] - values[0]);
            const color = layer.mark.fill ??
                theme.colors.sequential[Math.round(ratio * (theme.colors.sequential.length - 1))] ??
                context.color;
            if (shape === 'circle') {
                nodes.push({
                    type: 'circle',
                    ...datumBase(context, `${layer.id}:tile:${rowIndex}`, rowIndex),
                    cx: x,
                    cy: y,
                    radius: Math.min(width, height) / 2,
                    fill: color,
                    stroke: layer.mark.stroke ?? theme.colors.background,
                    lineWidth: layer.mark.lineWidth ?? 1,
                });
            }
            else if (shape === 'square') {
                nodes.push({
                    type: 'rect',
                    ...datumBase(context, `${layer.id}:tile:${rowIndex}`, rowIndex),
                    x: x - width / 2,
                    y: y - height / 2,
                    width,
                    height,
                    fill: color,
                    stroke: layer.mark.stroke ?? theme.colors.background,
                    lineWidth: layer.mark.lineWidth ?? 1,
                    cornerRadius: layer.mark.cornerRadius ?? 2,
                });
            }
            else {
                nodes.push({
                    type: 'path',
                    ...datumBase(context, `${layer.id}:tile:${rowIndex}`, rowIndex),
                    points: tilePolygon(shape, x, y, width, height),
                    closed: true,
                    fill: color,
                    stroke: layer.mark.stroke ?? theme.colors.background,
                    lineWidth: layer.mark.lineWidth ?? 1,
                    lineJoin: 'round',
                });
            }
        }
        return nodes;
    };
    const compileVariablePieMark = (context) => {
        const { layer, table, plot, theme } = context;
        const radiusField = layer.mark.fields.radius ?? layer.mark.fields.size ?? 'radius';
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const label = stringValue(table.value(rowIndex, layer.x.field));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            const radius = table.has(radiusField)
                ? numericDataValue(table.value(rowIndex, radiusField))
                : value;
            if (label !== null && value !== null && radius !== null && value >= 0)
                rows.push({ rowIndex, label, value, radius: Math.max(0, radius) });
        }
        const total = rows.reduce((sum, row) => sum + row.value, 0);
        if (rows.length === 0 || total <= 0)
            return [];
        const cx = plot.x + plot.width / 2;
        const cy = plot.y + plot.height / 2;
        const maxRadius = Math.min(plot.width, plot.height) * 0.42;
        const minRadius = maxRadius * 0.48;
        const radiusMaximum = Math.max(1, ...rows.map(({ radius }) => radius));
        let angle = -Math.PI / 2;
        const nodes = [];
        rows.forEach((row, index) => {
            const next = angle + (row.value / total) * TAU;
            const outer = minRadius + Math.sqrt(row.radius / radiusMaximum) * (maxRadius - minRadius);
            const color = layer.mark.fill ?? paletteColor(context, index);
            nodes.push({
                type: 'path',
                ...datumBase(context, `${layer.id}:variable-pie:${row.rowIndex}`, row.rowIndex),
                points: annularSector(cx, cy, optionNumber$3(layer.mark.options.innerRadius, 0), outer, angle, next),
                closed: true,
                fill: color,
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 2,
                lineJoin: 'round',
            });
            const mid = (angle + next) / 2;
            if (next - angle > 0.28) {
                const labelPoint = pointOnCircle(cx, cy, outer * 0.66, mid);
                nodes.push(textNode$2(context, `${layer.id}:variable-label:${row.rowIndex}`, labelPoint.x, labelPoint.y, row.label, {
                    fill: readableTextColor(color, '#ffffff', '#0f172a'),
                    size: Math.max(9, theme.typography.fontSize - 1),
                }));
            }
            angle = next;
        });
        return nodes;
    };
    const compileVariwideMark = (context) => {
        const { layer, table, yScale, plot, theme } = context;
        const widthField = layer.mark.fields.width ?? 'width';
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            const width = table.has(widthField) ? numericDataValue(table.value(rowIndex, widthField)) : 1;
            const label = stringValue(table.value(rowIndex, layer.x.field));
            if (value !== null && width !== null && width > 0 && label !== null)
                rows.push({ rowIndex, value, width, label });
        }
        const widthTotal = rows.reduce((sum, row) => sum + row.width, 0);
        if (rows.length === 0 || widthTotal <= 0)
            return [];
        const baseline = yScale.map(0);
        const nodes = [];
        let cursor = plot.x;
        rows.forEach((row, index) => {
            const width = (row.width / widthTotal) * plot.width;
            const y = yScale.map(row.value);
            const color = layer.mark.fill ?? paletteColor(context, index);
            nodes.push({
                type: 'rect',
                ...datumBase(context, `${layer.id}:variwide:${row.rowIndex}`, row.rowIndex),
                x: cursor + 1,
                y: Math.min(y, baseline),
                width: Math.max(1, width - 2),
                height: Math.max(1, Math.abs(baseline - y)),
                fill: color,
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 1,
                cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
            });
            if (width >= 36)
                nodes.push(textNode$2(context, `${layer.id}:variwide-label:${row.rowIndex}`, cursor + width / 2, baseline + 14, row.label, { fill: theme.colors.mutedText, size: 9 }));
            cursor += width;
        });
        return nodes;
    };
    const compileVectorMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const directionField = layer.mark.fields.direction ?? 'direction';
        const magnitudeField = layer.mark.fields.magnitude ?? 'magnitude';
        const extent = table.has(magnitudeField) ? table.extent(magnitudeField) : null;
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            const direction = table.has(directionField)
                ? numericDataValue(table.value(rowIndex, directionField))
                : 0;
            const magnitude = table.has(magnitudeField)
                ? numericDataValue(table.value(rowIndex, magnitudeField))
                : 1;
            if (xValue === null || yValue === null || direction === null || magnitude === null)
                continue;
            const start = { x: xScale.map(xValue), y: yScale.map(yValue) };
            const ratio = extent === null || extent[1] === extent[0]
                ? 0.6
                : (magnitude - extent[0]) / (extent[1] - extent[0]);
            const length = 10 + clamp(ratio, 0, 1) * 26;
            const angle = (direction * Math.PI) / 180 - Math.PI / 2;
            const end = pointOnCircle(start.x, start.y, length, angle);
            const color = layer.mark.stroke ?? context.color;
            nodes.push({
                type: 'line',
                ...datumBase(context, `${layer.id}:vector:${rowIndex}`, rowIndex),
                x1: start.x,
                y1: start.y,
                x2: end.x,
                y2: end.y,
                stroke: color,
                lineWidth: (layer.mark.lineWidth ?? 1.5) + ratio * 2,
                lineCap: 'round',
            });
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:vector-head:${rowIndex}`, { zIndex: layer.zIndex + 1 }),
                points: [
                    end,
                    pointOnCircle(end.x, end.y, 6, angle + Math.PI * 0.78),
                    pointOnCircle(end.x, end.y, 6, angle - Math.PI * 0.78),
                ],
                closed: true,
                fill: color,
                stroke: theme.colors.background,
                lineWidth: 0.6,
            });
        }
        return nodes;
    };
    const compileVennMark = (context) => {
        const { layer, table, plot, theme } = context;
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const label = stringValue(table.value(rowIndex, layer.x.field));
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (label !== null && value !== null && value > 0)
                rows.push({ rowIndex, label, value });
        }
        if (rows.length === 0)
            return [];
        const maximum = Math.max(...rows.map(({ value }) => value));
        const cx = plot.x + plot.width / 2;
        const cy = plot.y + plot.height / 2;
        const orbit = Math.min(plot.width, plot.height) * 0.13;
        const maxRadius = Math.min(plot.width, plot.height) * 0.25;
        const nodes = [];
        rows.slice(0, 6).forEach((row, index, visibleRows) => {
            const angle = -Math.PI / 2 + (index * TAU) / Math.max(1, visibleRows.length);
            const center = pointOnCircle(cx, cy, visibleRows.length === 1 ? 0 : orbit, angle);
            const radius = Math.max(24, Math.sqrt(row.value / maximum) * maxRadius);
            const color = layer.mark.fill ?? paletteColor(context, index);
            nodes.push({
                type: 'circle',
                ...datumBase(context, `${layer.id}:venn:${row.rowIndex}`, row.rowIndex, index * 0.01),
                cx: center.x,
                cy: center.y,
                radius,
                fill: colorWithOpacity(color, 0.34),
                stroke: layer.mark.stroke ?? color,
                lineWidth: layer.mark.lineWidth ?? 2,
            });
            nodes.push(textNode$2(context, `${layer.id}:venn-label:${row.rowIndex}`, center.x, center.y, row.label, {
                fill: theme.colors.text,
                size: Math.max(10, theme.typography.fontSize),
            }));
        });
        return nodes;
    };
    const compileWindBarbMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const speedField = layer.mark.fields.speed ?? 'speed';
        const directionField = layer.mark.fields.direction ?? 'direction';
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            const speed = table.has(speedField)
                ? numericDataValue(table.value(rowIndex, speedField))
                : null;
            const direction = table.has(directionField)
                ? numericDataValue(table.value(rowIndex, directionField))
                : null;
            if (xValue === null || yValue === null || speed === null || direction === null)
                continue;
            const start = { x: xScale.map(xValue), y: yScale.map(yValue) };
            const length = clamp(18 + speed * 0.35, 20, 44);
            const angle = (direction * Math.PI) / 180 - Math.PI / 2;
            const end = pointOnCircle(start.x, start.y, length, angle);
            const stroke = layer.mark.stroke ?? context.color;
            nodes.push({
                type: 'line',
                ...datumBase(context, `${layer.id}:wind:${rowIndex}`, rowIndex),
                x1: start.x,
                y1: start.y,
                x2: end.x,
                y2: end.y,
                stroke,
                lineWidth: layer.mark.lineWidth ?? 2,
                lineCap: 'round',
            });
            const featherCount = clamp(Math.round(speed / 10), 1, 6);
            for (let feather = 0; feather < featherCount; feather += 1) {
                const ratio = 0.32 + (feather / featherCount) * 0.58;
                const anchor = {
                    x: start.x + (end.x - start.x) * ratio,
                    y: start.y + (end.y - start.y) * ratio,
                };
                const tip = pointOnCircle(anchor.x, anchor.y, 8, angle - Math.PI * 0.7);
                nodes.push({
                    type: 'line',
                    ...nodeBase(`${layer.id}:wind-feather:${rowIndex}:${feather}`, {
                        zIndex: layer.zIndex + 1,
                    }),
                    x1: anchor.x,
                    y1: anchor.y,
                    x2: tip.x,
                    y2: tip.y,
                    stroke,
                    lineWidth: 1.5,
                    lineCap: 'round',
                });
            }
            nodes.push({
                type: 'circle',
                ...nodeBase(`${layer.id}:wind-origin:${rowIndex}`, { zIndex: layer.zIndex + 2 }),
                cx: start.x,
                cy: start.y,
                radius: 2.5,
                fill: theme.colors.background,
                stroke,
                lineWidth: 1.5,
            });
        }
        return nodes;
    };
    const compileWordCloudMark = (context) => {
        const { layer, table, plot, theme } = context;
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const word = stringValue(table.value(rowIndex, layer.x.field));
            const weight = numericDataValue(table.value(rowIndex, layer.y.field));
            if (word !== null && word !== '' && weight !== null && weight > 0)
                rows.push({ rowIndex, word, weight });
        }
        if (rows.length === 0)
            return [];
        const minimum = Math.min(...rows.map(({ weight }) => weight));
        const maximum = Math.max(...rows.map(({ weight }) => weight));
        const cx = plot.x + plot.width / 2;
        const cy = plot.y + plot.height / 2;
        const nodes = [];
        const placed = [];
        rows
            .slice()
            .sort((left, right) => right.weight - left.weight)
            .slice(0, Math.min(160, context.performance.maxPointMarks))
            .forEach((row, index) => {
            const ratio = maximum === minimum ? 0.5 : (row.weight - minimum) / (maximum - minimum);
            const size = 10 + ratio * 24;
            const rotation = index % 5 === 0 ? -18 : index % 7 === 0 ? 18 : 0;
            const textWidth = Math.max(size, row.word.length * size * 0.56);
            const textHeight = size * 1.08;
            const radians = (Math.abs(rotation) * Math.PI) / 180;
            const width = textWidth * Math.cos(radians) + textHeight * Math.sin(radians);
            const height = textWidth * Math.sin(radians) + textHeight * Math.cos(radians);
            let x = cx;
            let y = cy;
            let found = false;
            for (let attempt = 0; attempt < 1600; attempt += 1) {
                const angle = attempt * 0.42 + index * 1.17;
                const distance = 3.3 * Math.sqrt(attempt) * (1 + size / 40);
                const candidateX = cx + Math.cos(angle) * distance;
                const candidateY = cy + Math.sin(angle) * distance * 0.64;
                const box = {
                    left: candidateX - width / 2 - 3,
                    right: candidateX + width / 2 + 3,
                    top: candidateY - height / 2 - 2,
                    bottom: candidateY + height / 2 + 2,
                };
                const inside = box.left >= plot.x &&
                    box.right <= plot.x + plot.width &&
                    box.top >= plot.y &&
                    box.bottom <= plot.y + plot.height;
                const free = placed.every((other) => box.right < other.left ||
                    box.left > other.right ||
                    box.bottom < other.top ||
                    box.top > other.bottom);
                if (inside && free) {
                    x = candidateX;
                    y = candidateY;
                    placed.push(box);
                    found = true;
                    break;
                }
            }
            if (!found)
                return;
            const color = layer.mark.fill ?? paletteColor(context, index);
            const node = textNode$2(context, `${layer.id}:word-cloud:${row.rowIndex}`, x, y, row.word, {
                fill: color,
                size,
                weight: 520 + Math.round(ratio * 220),
                rotation,
            });
            nodes.push({ ...node, ...datumBase(context, node.id, row.rowIndex, ratio) });
        });
        return nodes;
    };
    function movingAverage(values, period) {
        return values.map((_, index) => {
            if (index + 1 < period)
                return null;
            const window = values.slice(index + 1 - period, index + 1);
            if (window.some((value) => value === null))
                return null;
            return window.reduce((sum, value) => sum + (value ?? 0), 0) / period;
        });
    }
    function exponentialAverage(values, period) {
        const multiplier = 2 / (period + 1);
        let previous = null;
        return values.map((value) => {
            if (value === null)
                return null;
            previous = previous === null ? value : value * multiplier + previous * (1 - multiplier);
            return previous;
        });
    }
    function weightedAverage(values, period) {
        const denominator = (period * (period + 1)) / 2;
        return values.map((_, index) => {
            if (index + 1 < period)
                return null;
            const window = values.slice(index + 1 - period, index + 1);
            if (window.some((value) => value === null))
                return null;
            return (window.reduce((sum, value, offset) => sum + (value ?? 0) * (offset + 1), 0) /
                denominator);
        });
    }
    function relativeStrength(values, period) {
        return values.map((_, index) => {
            if (index < period)
                return null;
            let gains = 0;
            let losses = 0;
            for (let offset = index - period + 1; offset <= index; offset += 1) {
                const current = values[offset];
                const previous = values[offset - 1];
                if (current === null || previous === null || current === undefined || previous === undefined)
                    return null;
                const change = current - previous;
                if (change >= 0)
                    gains += change;
                else
                    losses -= change;
            }
            if (losses === 0)
                return 100;
            const ratio = gains / losses;
            return 100 - 100 / (1 + ratio);
        });
    }
    function calculatedIndicator(kind, values, period) {
        if (kind === 'sma')
            return movingAverage(values, period);
        if (kind === 'ema')
            return exponentialAverage(values, period);
        if (kind === 'wma')
            return weightedAverage(values, period);
        if (kind === 'dema') {
            const once = exponentialAverage(values, period);
            const twice = exponentialAverage(once, period);
            return once.map((value, index) => value === null || twice[index] === null ? null : 2 * value - (twice[index] ?? 0));
        }
        if (kind === 'tema') {
            const once = exponentialAverage(values, period);
            const twice = exponentialAverage(once, period);
            const three = exponentialAverage(twice, period);
            return once.map((value, index) => value === null || twice[index] === null || three[index] === null
                ? null
                : 3 * value - 3 * (twice[index] ?? 0) + (three[index] ?? 0));
        }
        if (kind === 'momentum') {
            return values.map((value, index) => value === null || index < period || values[index - period] === null
                ? null
                : value - (values[index - period] ?? 0));
        }
        if (kind === 'roc') {
            return values.map((value, index) => {
                const previous = index < period ? null : values[index - period];
                return value === null || previous === null || previous === undefined || previous === 0
                    ? null
                    : ((value - previous) / previous) * 100;
            });
        }
        if (kind === 'rsi')
            return relativeStrength(values, period);
        return [...values];
    }
    function indicatorKind(context) {
        return optionString$2(context.layer.mark.options.kind, 'line');
    }
    function indicatorFields(context) {
        const fields = context.layer.mark.options.fields;
        if (Array.isArray(fields)) {
            const valid = fields.filter((value) => typeof value === 'string' && value !== '');
            if (valid.length > 0)
                return valid;
        }
        const configured = [
            context.layer.mark.fields.middle,
            context.layer.mark.fields.signal,
            context.layer.mark.fields.secondary,
        ].filter((value) => value !== undefined && context.table.has(value));
        return configured.length > 0 ? configured : [context.layer.y.field];
    }
    const compileIndicatorMark = (context) => {
        const { layer, table, xScale, yScale, theme, plot } = context;
        const kind = indicatorKind(context);
        const lowerField = layer.mark.fields.lower ?? 'lower';
        const upperField = layer.mark.fields.upper ?? 'upper';
        const fields = indicatorFields(context);
        const period = clamp(Math.floor(optionNumber$3(layer.mark.options.period, 14)), 2, 200);
        const sourceValues = Array.from({ length: table.length }, (_, rowIndex) => numericDataValue(table.value(rowIndex, layer.y.field)));
        const calculated = layer.mark.options.calculate === true
            ? calculatedIndicator(kind, sourceValues, period)
            : sourceValues;
        const nodes = [];
        if (table.has(lowerField) && table.has(upperField)) {
            const upper = [];
            const lower = [];
            for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
                const xValue = scaleInput(table.value(rowIndex, layer.x.field));
                const low = numericDataValue(table.value(rowIndex, lowerField));
                const high = numericDataValue(table.value(rowIndex, upperField));
                if (xValue === null || low === null || high === null)
                    continue;
                const x = xScale.map(xValue);
                upper.push({ x, y: yScale.map(high) });
                lower.push({ x, y: yScale.map(low) });
            }
            if (upper.length > 1 && lower.length > 1) {
                nodes.push({
                    type: 'path',
                    ...nodeBase(`${layer.id}:indicator-band`, { zIndex: layer.zIndex, opacity: 0.24 }),
                    points: [...upper, ...lower.reverse()],
                    closed: true,
                    fill: layer.mark.fill ?? colorWithOpacity(context.color, 0.28),
                    stroke: layer.mark.stroke ?? context.color,
                    lineWidth: 1,
                    lineJoin: 'round',
                });
            }
        }
        const columnKinds = new Set(['ao', 'macd', 'volume', 'histogram']);
        fields.forEach((field, fieldIndex) => {
            const points = [];
            for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
                const xValue = scaleInput(table.value(rowIndex, layer.x.field));
                const value = layer.mark.options.calculate === true && field === layer.y.field
                    ? calculated[rowIndex]
                    : table.has(field)
                        ? numericDataValue(table.value(rowIndex, field))
                        : null;
                if (xValue === null || value === null || value === undefined)
                    continue;
                const point = { x: xScale.map(xValue), y: yScale.map(value) };
                if ([point.x, point.y].every(Number.isFinite))
                    points.push({ rowIndex, point, value });
            }
            const color = fieldIndex === 0
                ? (layer.mark.stroke ?? context.color)
                : paletteColor(context, fieldIndex + 1);
            if (columnKinds.has(kind)) {
                const baseline = yScale.map(0);
                const width = Math.max(2, plot.width / Math.max(8, table.length * 1.6));
                points.forEach(({ rowIndex, point, value }) => {
                    nodes.push({
                        type: 'rect',
                        ...datumBase(context, `${layer.id}:indicator-column:${fieldIndex}:${rowIndex}`, rowIndex, fieldIndex),
                        x: point.x - width / 2,
                        y: Math.min(point.y, baseline),
                        width,
                        height: Math.max(1, Math.abs(baseline - point.y)),
                        fill: value >= 0 ? color : (theme.colors.palette[3] ?? '#ef4444'),
                        lineWidth: 0,
                        cornerRadius: 1,
                    });
                });
            }
            else if (points.length > 0) {
                nodes.push({
                    type: 'path',
                    ...nodeBase(`${layer.id}:indicator-line:${fieldIndex}`, {
                        zIndex: layer.zIndex + fieldIndex + 1,
                    }),
                    points: kind === 'psar'
                        ? points.map(({ point }) => point)
                        : smoothPoints(points.map(({ point }) => point), 4),
                    closed: false,
                    stroke: color,
                    lineWidth: layer.mark.lineWidth ?? (fieldIndex === 0 ? 2.2 : 1.5),
                    ...(fieldIndex > 0 ? { dash: [5, 3] } : {}),
                    lineCap: 'round',
                    lineJoin: 'round',
                });
                points.forEach(({ rowIndex, point }, index) => {
                    if (kind !== 'psar' && index % Math.max(1, Math.ceil(points.length / 24)) !== 0)
                        return;
                    nodes.push({
                        type: 'circle',
                        ...datumBase(context, `${layer.id}:indicator-point:${fieldIndex}:${rowIndex}`, rowIndex, fieldIndex + 2),
                        cx: point.x,
                        cy: point.y,
                        radius: kind === 'psar' ? 3.2 : 2.2,
                        fill: color,
                        stroke: theme.colors.background,
                        lineWidth: 0.8,
                    });
                });
            }
        });
        return nodes;
    };
    const compileFlagsMark = (context) => {
        const { layer, table, xScale, yScale, theme } = context;
        const titleField = layer.mark.fields.title ?? 'title';
        const nodes = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const yValue = scaleInput(table.value(rowIndex, layer.y.field));
            if (xValue === null || yValue === null)
                continue;
            const x = xScale.map(xValue);
            const y = yScale.map(yValue);
            const label = table.has(titleField)
                ? (stringValue(table.value(rowIndex, titleField)) ?? '•')
                : '•';
            const color = layer.mark.fill ?? context.color;
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:flag-pole:${rowIndex}`, { zIndex: layer.zIndex }),
                x1: x,
                y1: y,
                x2: x,
                y2: y - 24,
                stroke: layer.mark.stroke ?? color,
                lineWidth: 1.5,
                lineCap: 'round',
            });
            nodes.push({
                type: 'path',
                ...datumBase(context, `${layer.id}:flag:${rowIndex}`, rowIndex, 1),
                points: [
                    { x, y: y - 27 },
                    { x: x + 30, y: y - 27 },
                    { x: x + 24, y: y - 17 },
                    { x, y: y - 17 },
                ],
                closed: true,
                fill: color,
                stroke: theme.colors.background,
                lineWidth: 1,
                lineJoin: 'round',
            });
            nodes.push(textNode$2(context, `${layer.id}:flag-label:${rowIndex}`, x + 14, y - 22, label.slice(0, 4), {
                fill: readableTextColor(color, '#ffffff', '#0f172a'),
                size: 9,
            }));
        }
        return nodes;
    };
    function financialRows(context) {
        const { layer, table, xScale } = context;
        const openField = layer.mark.fields.open ?? 'open';
        const highField = layer.mark.fields.high ?? 'high';
        const lowField = layer.mark.fields.low ?? 'low';
        const closeField = layer.mark.fields.close ?? layer.y.field;
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const xValue = scaleInput(table.value(rowIndex, layer.x.field));
            const open = table.has(openField) ? numericDataValue(table.value(rowIndex, openField)) : null;
            const high = table.has(highField) ? numericDataValue(table.value(rowIndex, highField)) : null;
            const low = table.has(lowField) ? numericDataValue(table.value(rowIndex, lowField)) : null;
            const close = table.has(closeField)
                ? numericDataValue(table.value(rowIndex, closeField))
                : null;
            if (xValue === null || high === null || low === null || close === null)
                continue;
            rows.push({ rowIndex, x: xScale.map(xValue), open: open ?? close, high, low, close });
        }
        return rows;
    }
    function heikinRows(rows) {
        let previousOpen = null;
        let previousClose = null;
        return rows.map((row) => {
            const close = (row.open + row.high + row.low + row.close) / 4;
            const open = previousOpen === null || previousClose === null
                ? (row.open + row.close) / 2
                : (previousOpen + previousClose) / 2;
            const transformed = {
                ...row,
                open,
                close,
                high: Math.max(row.high, open, close),
                low: Math.min(row.low, open, close),
            };
            previousOpen = open;
            previousClose = close;
            return transformed;
        });
    }
    const compileFinancialMark = (context) => {
        const { layer, yScale, xScale, theme, plot } = context;
        const kind = optionString$2(layer.mark.options.kind, 'ohlc');
        const rows = kind === 'heikin-ashi' ? heikinRows(financialRows(context)) : financialRows(context);
        const width = Math.max(5, xScale instanceof BandScale
            ? xScale.bandwidth * 0.56
            : plot.width / Math.max(6, rows.length * 1.8));
        const nodes = [];
        for (const row of rows) {
            const high = yScale.map(row.high);
            const low = yScale.map(row.low);
            const open = yScale.map(row.open);
            const close = yScale.map(row.close);
            const rising = row.close >= row.open;
            const color = rising
                ? (theme.colors.palette[1] ?? '#0f9f8a')
                : (theme.colors.palette[3] ?? '#ef4444');
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:financial-wick:${row.rowIndex}`, { zIndex: layer.zIndex }),
                x1: row.x,
                y1: high,
                x2: row.x,
                y2: low,
                stroke: layer.mark.stroke ?? color,
                lineWidth: layer.mark.lineWidth ?? 1.5,
                lineCap: 'round',
            });
            if (kind === 'ohlc' || kind === 'hlc') {
                if (kind === 'ohlc')
                    nodes.push({
                        type: 'line',
                        ...nodeBase(`${layer.id}:financial-open:${row.rowIndex}`, { zIndex: layer.zIndex + 1 }),
                        x1: row.x - width / 2,
                        y1: open,
                        x2: row.x,
                        y2: open,
                        stroke: color,
                        lineWidth: 1.8,
                    });
                nodes.push({
                    type: 'line',
                    ...datumBase(context, `${layer.id}:financial-close:${row.rowIndex}`, row.rowIndex, 1),
                    x1: row.x,
                    y1: close,
                    x2: row.x + width / 2,
                    y2: close,
                    stroke: color,
                    lineWidth: 1.8,
                });
                continue;
            }
            const hollow = kind === 'hollow-candlestick' && rising;
            nodes.push({
                type: 'rect',
                ...datumBase(context, `${layer.id}:financial-body:${row.rowIndex}`, row.rowIndex, 1),
                x: row.x - width / 2,
                y: Math.min(open, close),
                width,
                height: Math.max(1.5, Math.abs(open - close)),
                fill: hollow ? theme.colors.background : (layer.mark.fill ?? color),
                stroke: layer.mark.stroke ?? color,
                lineWidth: layer.mark.lineWidth ?? 1.5,
                cornerRadius: layer.mark.cornerRadius ?? 1.5,
            });
        }
        return nodes;
    };
    const compilePointFigureMark = (context) => {
        const { layer, table, plot, theme } = context;
        const values = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (value !== null)
                values.push({ rowIndex, value });
        }
        if (values.length < 2)
            return [];
        const minimum = Math.min(...values.map(({ value }) => value));
        const maximum = Math.max(...values.map(({ value }) => value));
        const box = Math.max(1e-9, optionNumber$3(layer.mark.options.boxSize, (maximum - minimum) / 10 || 1));
        const cellWidth = plot.width / values.length;
        const cellHeight = plot.height / Math.max(4, Math.ceil((maximum - minimum) / box) + 1);
        const nodes = [];
        values.forEach((row, index) => {
            const previous = values[Math.max(0, index - 1)]?.value ?? row.value;
            const rising = row.value >= previous;
            const count = Math.max(1, Math.round(Math.abs(row.value - previous) / box));
            const color = rising
                ? (theme.colors.palette[1] ?? '#0f9f8a')
                : (theme.colors.palette[3] ?? '#ef4444');
            for (let level = 0; level < count; level += 1) {
                const x = plot.x + cellWidth * (index + 0.5);
                const baseLevel = Math.round((Math.min(row.value, previous) - minimum) / box);
                const y = plot.y + plot.height - cellHeight * (baseLevel + level + 0.5);
                nodes.push({
                    ...textNode$2(context, `${layer.id}:point-figure:${row.rowIndex}:${level}`, x, y, rising ? '×' : '○', {
                        fill: layer.mark.stroke ?? color,
                        size: clamp(Math.min(cellWidth, cellHeight) * 0.82, 9, 22),
                        weight: 700,
                    }),
                    ...datumBase(context, `${layer.id}:point-figure:${row.rowIndex}:${level}`, row.rowIndex),
                });
            }
        });
        return nodes;
    };
    const compileRenkoMark = (context) => {
        const { layer, table, plot, theme } = context;
        const values = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            if (value !== null)
                values.push({ rowIndex, value });
        }
        if (values.length < 2)
            return [];
        const minimum = Math.min(...values.map(({ value }) => value));
        const maximum = Math.max(...values.map(({ value }) => value));
        const brickSize = Math.max(1e-9, optionNumber$3(layer.mark.options.brickSize, (maximum - minimum) / 12 || 1));
        const bricks = [];
        let level = values[0].value;
        for (const row of values.slice(1)) {
            while (Math.abs(row.value - level) >= brickSize) {
                const direction = Math.sign(row.value - level);
                const next = level + direction * brickSize;
                bricks.push({ rowIndex: row.rowIndex, start: level, end: next });
                level = next;
            }
        }
        if (bricks.length === 0)
            return [];
        const low = Math.min(...bricks.flatMap((brick) => [brick.start, brick.end]));
        const high = Math.max(...bricks.flatMap((brick) => [brick.start, brick.end]));
        const width = plot.width / Math.max(1, bricks.length);
        const mapY = (value) => plot.y + plot.height - ((value - low) / Math.max(1e-9, high - low)) * plot.height;
        return bricks.map((brick, index) => {
            const rising = brick.end >= brick.start;
            const color = rising
                ? (theme.colors.palette[1] ?? '#0f9f8a')
                : (theme.colors.palette[3] ?? '#ef4444');
            const start = mapY(brick.start);
            const end = mapY(brick.end);
            return {
                type: 'rect',
                ...datumBase(context, `${layer.id}:renko:${index}`, brick.rowIndex, 0, {
                    ...table.row(brick.rowIndex),
                    brickStart: brick.start,
                    brickEnd: brick.end,
                    brickSize,
                }),
                x: plot.x + index * width + 1,
                y: Math.min(start, end),
                width: Math.max(2, width - 2),
                height: Math.max(2, Math.abs(start - end)),
                fill: layer.mark.fill ?? colorWithOpacity(color, 0.76),
                stroke: layer.mark.stroke ?? color,
                lineWidth: layer.mark.lineWidth ?? 1.4,
                cornerRadius: layer.mark.cornerRadius ?? 1,
            };
        });
    };
    const compileVolumeProfileMark = (context) => {
        const { layer, table, plot, theme } = context;
        const priceField = layer.mark.fields.price ?? layer.y.field;
        const volumeField = layer.mark.fields.volume ?? 'volume';
        const bins = clamp(Math.floor(optionNumber$3(layer.mark.options.bins, 12)), 4, 50);
        const priceExtent = table.has(priceField) ? table.extent(priceField) : null;
        if (priceExtent === null || !table.has(volumeField))
            return [];
        const totals = Array.from({ length: bins }, () => 0);
        const rowIndexes = Array.from({ length: bins }, () => -1);
        const span = priceExtent[1] - priceExtent[0] || 1;
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const price = numericDataValue(table.value(rowIndex, priceField));
            const volume = numericDataValue(table.value(rowIndex, volumeField));
            if (price === null || volume === null)
                continue;
            const bin = clamp(Math.floor(((price - priceExtent[0]) / span) * bins), 0, bins - 1);
            totals[bin] = (totals[bin] ?? 0) + Math.max(0, volume);
            rowIndexes[bin] = rowIndex;
        }
        const maximum = Math.max(1, ...totals);
        const totalVolume = totals.reduce((sum, volume) => sum + volume, 0);
        const height = plot.height / bins;
        const nodes = [];
        totals.forEach((volume, index) => {
            const width = (volume / maximum) * plot.width * 0.48;
            const rowIndex = rowIndexes[index] ?? -1;
            const base = rowIndex >= 0
                ? datumBase(context, `${layer.id}:volume-profile:${index}`, rowIndex, 0, {
                    priceStart: priceExtent[0] + (span * index) / bins,
                    priceEnd: priceExtent[0] + (span * (index + 1)) / bins,
                    volume,
                    proportion: totalVolume === 0 ? 0 : volume / totalVolume,
                })
                : nodeBase(`${layer.id}:volume-profile:${index}`, { zIndex: layer.zIndex });
            nodes.push({
                type: 'rect',
                ...base,
                x: plot.x + plot.width - width,
                y: plot.y + plot.height - (index + 1) * height + 1,
                width,
                height: Math.max(1, height - 2),
                fill: layer.mark.fill ?? colorWithOpacity(context.color, 0.68),
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: 0.8,
                cornerRadius: 2,
            });
        });
        return nodes;
    };
    function projectGeo(plot, longitude, latitude) {
        return {
            x: plot.x + ((longitude + 180) / 360) * plot.width,
            y: plot.y + ((90 - latitude) / 180) * plot.height,
        };
    }
    const continentShapes = [
        [
            [-168, 70],
            [-118, 72],
            [-82, 48],
            [-98, 17],
            [-130, 28],
            [-168, 55],
        ],
        [
            [-82, 12],
            [-45, 7],
            [-36, -22],
            [-60, -55],
            [-76, -18],
        ],
        [
            [-12, 36],
            [32, 37],
            [50, 11],
            [26, -35],
            [-5, -28],
            [-18, 8],
        ],
        [
            [-10, 72],
            [58, 75],
            [145, 55],
            [160, 8],
            [88, 5],
            [42, 28],
            [12, 36],
        ],
        [
            [112, -10],
            [154, -12],
            [148, -44],
            [116, -37],
        ],
    ];
    function geoLandNodes(context, zIndex) {
        const { layer, plot, theme } = context;
        const land = mixColor(theme.colors.background, theme.colors.palette[1] ?? theme.colors.mutedText, theme.mode === 'dark' ? 0.18 : 0.11);
        return continentShapes.map((shape, index) => ({
            type: 'path',
            ...nodeBase(`${layer.id}:geo-land:${index}`, { zIndex }),
            points: shape.map(([longitude, latitude]) => projectGeo(plot, longitude, latitude)),
            closed: true,
            fill: land,
            stroke: colorWithOpacity(theme.colors.axis, 0.42),
            lineWidth: 0.8,
            lineJoin: 'round',
        }));
    }
    function geoBackdrop(context) {
        const { layer, plot, theme } = context;
        const nodes = [
            {
                type: 'rect',
                ...nodeBase(`${layer.id}:geo-background`, { zIndex: layer.zIndex - 3 }),
                x: plot.x,
                y: plot.y,
                width: plot.width,
                height: plot.height,
                fill: mixColor(theme.colors.background, theme.colors.sequential[0] ?? theme.colors.grid, 0.18),
                stroke: theme.colors.grid,
                lineWidth: 1,
                cornerRadius: 8,
            },
            ...geoLandNodes(context, layer.zIndex - 2.8),
        ];
        for (let longitude = -120; longitude <= 120; longitude += 60) {
            const x = projectGeo(plot, longitude, 0).x;
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:geo-lon:${longitude}`, { zIndex: layer.zIndex - 2, opacity: 0.45 }),
                x1: x,
                y1: plot.y,
                x2: x,
                y2: plot.y + plot.height,
                stroke: theme.colors.grid,
                lineWidth: 0.8,
                dash: [3, 4],
            });
        }
        for (let latitude = -60; latitude <= 60; latitude += 30) {
            const y = projectGeo(plot, 0, latitude).y;
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:geo-lat:${latitude}`, { zIndex: layer.zIndex - 2, opacity: 0.45 }),
                x1: plot.x,
                y1: y,
                x2: plot.x + plot.width,
                y2: y,
                stroke: theme.colors.grid,
                lineWidth: 0.8,
                dash: [3, 4],
            });
        }
        return nodes;
    }
    const compileGeoLineMark = (context) => {
        const { layer, table, plot, theme } = context;
        const longitude2Field = layer.mark.fields.longitude2 ?? layer.mark.fields.x2 ?? 'longitude2';
        const latitude2Field = layer.mark.fields.latitude2 ?? layer.mark.fields.y2 ?? 'latitude2';
        const valueField = layer.mark.fields.value;
        const valueExtent = valueField !== undefined && table.has(valueField) ? table.extent(valueField) : null;
        const flow = layer.mark.options.flow === true;
        const nodes = geoBackdrop(context);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
            const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
            const longitude2 = table.has(longitude2Field)
                ? numericDataValue(table.value(rowIndex, longitude2Field))
                : null;
            const latitude2 = table.has(latitude2Field)
                ? numericDataValue(table.value(rowIndex, latitude2Field))
                : null;
            if (longitude === null || latitude === null || longitude2 === null || latitude2 === null)
                continue;
            const start = projectGeo(plot, longitude, latitude);
            const end = projectGeo(plot, longitude2, latitude2);
            const control = {
                x: (start.x + end.x) / 2,
                y: Math.min(start.y, end.y) - Math.abs(end.x - start.x) * 0.16,
            };
            const value = valueField !== undefined && table.has(valueField)
                ? (numericDataValue(table.value(rowIndex, valueField)) ?? 1)
                : 1;
            const ratio = valueExtent === null || valueExtent[1] === valueExtent[0]
                ? 0.5
                : (value - valueExtent[0]) / (valueExtent[1] - valueExtent[0]);
            const points = quadraticPoints(start, control, end, 28);
            const color = layer.mark.stroke ?? paletteColor(context, rowIndex);
            nodes.push({
                type: 'path',
                ...datumBase(context, `${layer.id}:geo-line:${rowIndex}`, rowIndex),
                points,
                closed: false,
                stroke: color,
                lineWidth: (layer.mark.lineWidth ?? 1.8) + ratio * 3,
                lineCap: 'round',
                lineJoin: 'round',
            });
            if (flow) {
                const previous = points.at(-2) ?? start;
                const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
                nodes.push({
                    type: 'path',
                    ...nodeBase(`${layer.id}:geo-arrow:${rowIndex}`, { zIndex: layer.zIndex + 1 }),
                    points: [
                        end,
                        pointOnCircle(end.x, end.y, 7, angle + Math.PI * 0.82),
                        pointOnCircle(end.x, end.y, 7, angle - Math.PI * 0.82),
                    ],
                    closed: true,
                    fill: color,
                    stroke: theme.colors.background,
                    lineWidth: 0.5,
                });
            }
        }
        return nodes;
    };
    const compileGeoHeatmapMark = (context) => {
        const { layer, table, plot, theme } = context;
        const valueField = layer.mark.fields.value ?? 'value';
        const extent = table.has(valueField) ? table.extent(valueField) : null;
        const nodes = geoBackdrop(context);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
            const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
            const value = table.has(valueField)
                ? numericDataValue(table.value(rowIndex, valueField))
                : null;
            if (longitude === null || latitude === null || value === null)
                continue;
            const point = projectGeo(plot, longitude, latitude);
            const ratio = extent === null || extent[1] === extent[0]
                ? 0.5
                : (value - extent[0]) / (extent[1] - extent[0]);
            const color = layer.mark.fill ??
                theme.colors.sequential[Math.round(ratio * (theme.colors.sequential.length - 1))] ??
                context.color;
            nodes.push({
                type: 'circle',
                ...nodeBase(`${layer.id}:geo-heat-halo:${rowIndex}`, {
                    zIndex: layer.zIndex - 0.5,
                    opacity: 0.18,
                }),
                cx: point.x,
                cy: point.y,
                radius: 12 + ratio * 18,
                fill: color,
                lineWidth: 0,
            });
            nodes.push({
                type: 'circle',
                ...datumBase(context, `${layer.id}:geo-heat:${rowIndex}`, rowIndex),
                cx: point.x,
                cy: point.y,
                radius: 5 + ratio * 9,
                fill: color,
                stroke: theme.colors.background,
                lineWidth: 1.2,
            });
        }
        return nodes;
    };
    const compileTiledMapMark = (context) => {
        const { layer, table, plot, theme } = context;
        const nodes = [];
        const columns = clamp(Math.floor(optionNumber$3(layer.mark.options.columns, 8)), 2, 24);
        const rows = clamp(Math.floor(optionNumber$3(layer.mark.options.rows, 5)), 2, 16);
        const width = plot.width / columns;
        const height = plot.height / rows;
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const shade = (row + column) % 2 === 0 ? 0.12 : 0.2;
                nodes.push({
                    type: 'rect',
                    ...nodeBase(`${layer.id}:map-tile:${row}:${column}`, { zIndex: layer.zIndex - 3 }),
                    x: plot.x + column * width,
                    y: plot.y + row * height,
                    width,
                    height,
                    fill: mixColor(theme.colors.background, theme.colors.sequential[0] ?? theme.colors.grid, shade),
                    stroke: colorWithOpacity(theme.colors.grid, 0.55),
                    lineWidth: 0.6,
                    cornerRadius: 0,
                });
            }
        }
        nodes.push(...geoLandNodes(context, layer.zIndex - 2));
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
            const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
            if (longitude === null || latitude === null)
                continue;
            const point = projectGeo(plot, longitude, latitude);
            const color = layer.mark.fill ?? paletteColor(context, rowIndex);
            nodes.push({
                type: 'circle',
                ...datumBase(context, `${layer.id}:tiled-point:${rowIndex}`, rowIndex),
                cx: point.x,
                cy: point.y,
                radius: layer.mark.radius ?? 6,
                fill: color,
                stroke: theme.colors.background,
                lineWidth: 2,
            });
        }
        return nodes;
    };
    const compileGeoFlowMark = (context) => compileGeoLineMark({
        ...context,
        layer: {
            ...context.layer,
            mark: {
                ...context.layer.mark,
                options: { ...context.layer.mark.options, flow: true },
            },
        },
    });

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

    const hitCandidateCache = new WeakMap();
    function sceneHitCandidates(scene) {
        const cached = hitCandidateCache.get(scene);
        if (cached !== undefined)
            return cached;
        const candidates = [];
        const visit = (node, parentOpacity, clips) => {
            const opacity = parentOpacity * node.opacity;
            if (!node.visible || opacity <= 0)
                return;
            if (node.type === 'group') {
                const nextClips = node.clip === undefined ? clips : [...clips, node.clip];
                const children = [...node.children].sort((left, right) => left.zIndex - right.zIndex);
                for (const child of children)
                    visit(child, opacity, nextClips);
                return;
            }
            if (node.interactive === true && node.datum !== undefined)
                candidates.push({ node, clips });
        };
        visit(scene.root, 1, []);
        hitCandidateCache.set(scene, candidates);
        return candidates;
    }
    function insideClips(clips, x, y) {
        return clips.every((clip) => x >= clip.x && x <= clip.x + clip.width && y >= clip.y && y <= clip.y + clip.height);
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
    function textDistance(node, x, y) {
        const angle = (-node.rotation * Math.PI) / 180;
        const translatedX = x - node.x;
        const translatedY = y - node.y;
        const localX = translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
        const localY = translatedX * Math.sin(angle) + translatedY * Math.cos(angle);
        const width = Math.max(node.fontSize * 0.6, Array.from(node.text).length * node.fontSize * 0.6);
        const height = Math.max(1, node.fontSize * 1.2);
        const left = node.align === 'center'
            ? -width / 2
            : node.align === 'right' || node.align === 'end'
                ? -width
                : 0;
        const top = node.baseline === 'middle'
            ? -height / 2
            : node.baseline === 'bottom' || node.baseline === 'ideographic'
                ? -height
                : node.baseline === 'alphabetic'
                    ? -height * 0.8
                    : 0;
        const dx = Math.max(left - localX, 0, localX - (left + width));
        const dy = Math.max(top - localY, 0, localY - (top + height));
        return Math.hypot(dx, dy);
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
                return textDistance(node, x, y);
            case 'group':
                return Number.POSITIVE_INFINITY;
        }
    }
    function hitTestScene(scene, x, y, tolerance = 8) {
        const candidates = sceneHitCandidates(scene);
        let best = null;
        for (let index = candidates.length - 1; index >= 0; index -= 1) {
            const candidate = candidates[index];
            if (candidate === undefined || !insideClips(candidate.clips, x, y))
                continue;
            const { node } = candidate;
            if (node.datum === undefined)
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

    let nextId = 0;
    function createId(prefix) {
        nextId += 1;
        return `${prefix}-${nextId.toString(36)}`;
    }

    const inferredFieldLimit = 8;
    const tooltipTextLimit = 240;
    function hasOwn(value, field) {
        return Object.prototype.hasOwnProperty.call(value, field);
    }
    function boundedText(value, limit = tooltipTextLimit) {
        const text = String(value);
        return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1))}…`;
    }
    function humanizeField(field) {
        return field
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/[-_]+/g, ' ')
            .replace(/^\w/, (letter) => letter.toUpperCase());
    }
    function inferredFormat(field, layer) {
        const encoding = layer?.x.field === field ? layer.x : layer?.y.field === field ? layer.y : undefined;
        return encoding?.type === 'temporal' ? 'date' : 'auto';
    }
    function inferredFields(hit, spec) {
        const layer = spec.layers.find(({ id }) => id === hit.layerId);
        const fields = new Map();
        const add = (field, label) => {
            if (typeof field !== 'string' || field.length === 0 || fields.has(field))
                return;
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
                if (Array.isArray(values))
                    for (const field of values)
                        add(field);
            }
        }
        for (const field of Object.keys(hit.tooltip ?? {}))
            add(field);
        for (const field of Object.keys(hit.datum))
            add(field);
        return [...fields.values()].slice(0, inferredFieldLimit);
    }
    function finiteFractionDigits(value) {
        return value === undefined ? undefined : Math.max(0, Math.min(6, Math.trunc(value)));
    }
    function numberFormatter(locale, options) {
        try {
            return new Intl.NumberFormat(locale, options);
        }
        catch {
            return new Intl.NumberFormat(undefined, options);
        }
    }
    function dateFormatter(locale, options) {
        try {
            return new Intl.DateTimeFormat(locale, options);
        }
        catch {
            return new Intl.DateTimeFormat(undefined, options);
        }
    }
    function dateOnlyValue(value) {
        if (typeof value !== 'string')
            return null;
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (match === null)
            return null;
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
    function formatValue(value, field, locale) {
        if (value === null || value === undefined)
            return '—';
        const fractionDigits = finiteFractionDigits(field.fractionDigits);
        let formatted;
        if (field.format === 'date' || field.format === 'datetime') {
            const dateOnly = field.format === 'date' ? dateOnlyValue(value) : null;
            const date = dateOnly ?? (value instanceof Date ? value : new Date(String(value)));
            formatted = Number.isFinite(date.getTime())
                ? dateFormatter(locale, field.format === 'datetime'
                    ? { dateStyle: 'medium', timeStyle: 'short' }
                    : { dateStyle: 'medium', ...(dateOnly === null ? {} : { timeZone: 'UTC' }) }).format(date)
                : String(value);
        }
        else if (typeof value === 'number' && Number.isFinite(value)) {
            const options = field.format === 'percent'
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
        }
        else {
            formatted = value instanceof Date ? value.toISOString() : boundedText(value);
        }
        return boundedText(`${field.prefix}${formatted}${field.suffix}`);
    }
    function datumValue(hit, field) {
        if (hit.tooltip !== undefined)
            return hit.tooltip[field];
        return hit.datum[field];
    }
    function hasDatumValue(hit, field) {
        return hit.tooltip === undefined ? hasOwn(hit.datum, field) : hasOwn(hit.tooltip, field);
    }
    function resolveTooltipContent(hit, spec) {
        const configured = spec.interaction.tooltip;
        if (configured === false)
            return { title: '', rows: [] };
        const layer = spec.layers.find(({ id }) => id === hit.layerId);
        const fields = configured.fields.length > 0 ? configured.fields : inferredFields(hit, spec);
        const rows = fields
            .filter((field) => hasDatumValue(hit, field.field))
            .map((field) => {
            const format = field.format === 'auto' && inferredFormat(field.field, layer) === 'date'
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
            title: boundedText(configured.title ?? spec.title?.text ?? humanizeField(layer?.mark.type ?? 'Datum'), 120),
            rows,
        };
    }
    class TooltipController {
        #id = createId('graflume-tooltip');
        #element = null;
        #surface = null;
        #nodeId = '';
        show(content, hit, sourceEvent, surface, host) {
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
            const describedBy = new Set((surface.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
            describedBy.add(this.#id);
            surface.setAttribute('aria-describedby', [...describedBy].join(' '));
            element.hidden = false;
            this.#position(element, host, sourceEvent.clientX, sourceEvent.clientY);
        }
        hide() {
            this.#nodeId = '';
            if (this.#element !== null)
                this.#element.hidden = true;
            if (this.#surface !== null) {
                const describedBy = (this.#surface.getAttribute('aria-describedby') ?? '')
                    .split(/\s+/)
                    .filter((id) => id !== '' && id !== this.#id);
                if (describedBy.length === 0)
                    this.#surface.removeAttribute('aria-describedby');
                else
                    this.#surface.setAttribute('aria-describedby', describedBy.join(' '));
            }
            this.#surface = null;
        }
        destroy() {
            this.hide();
            this.#element?.remove();
            this.#element = null;
        }
        #ensureElement(host) {
            if (this.#element !== null) {
                if (this.#element.parentElement !== host)
                    host.append(this.#element);
                return this.#element;
            }
            const element = document.createElement('div');
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
        #renderContent(element, content) {
            const title = document.createElement('div');
            title.textContent = content.title;
            title.style.cssText = 'margin:0 0 6px;font-weight:700;color:#fff';
            const list = document.createElement('dl');
            list.style.cssText =
                'display:grid;grid-template-columns:minmax(56px,auto) minmax(0,1fr);gap:3px 12px;margin:0';
            for (const row of content.rows) {
                const term = document.createElement('dt');
                term.textContent = row.label;
                term.style.cssText = 'margin:0;color:#cbd5e1';
                const detail = document.createElement('dd');
                detail.textContent = row.value;
                detail.style.cssText =
                    'margin:0;text-align:end;font-weight:650;color:#fff;overflow-wrap:anywhere';
                list.append(term, detail);
            }
            element.replaceChildren(title, list);
        }
        #position(element, host, clientX, clientY) {
            const margin = 8;
            const offset = 12;
            const hostBounds = host.getBoundingClientRect();
            const bounds = element.getBoundingClientRect();
            const localX = clientX - hostBounds.left;
            const localY = clientY - hostBounds.top;
            let left = localX + offset;
            let top = localY + offset;
            if (left + bounds.width + margin > hostBounds.width)
                left = localX - bounds.width - offset;
            if (top + bounds.height + margin > hostBounds.height)
                top = localY - bounds.height - offset;
            element.style.left = `${Math.max(margin, Math.min(left, hostBounds.width - bounds.width - margin))}px`;
            element.style.top = `${Math.max(margin, Math.min(top, hostBounds.height - bounds.height - margin))}px`;
        }
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
        #tooltip = new TooltipController();
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
        #pointerLeaveListener = (event) => {
            if (!(event instanceof PointerEvent))
                return;
            this.#tooltip.hide();
            this.#events.emit('hover', { chart: this, hit: null, sourceEvent: event });
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
            this.#result = result;
            this.#attachSurfaceEvents();
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
            this.#tooltip.destroy();
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
            if (this.#result?.spec.interaction.hover !== false) {
                surface.addEventListener('pointermove', this.#pointerMoveListener, { passive: true });
                surface.addEventListener('pointerleave', this.#pointerLeaveListener, { passive: true });
                surface.addEventListener('pointercancel', this.#pointerLeaveListener, { passive: true });
            }
            if (this.#result?.spec.interaction.click !== false) {
                surface.addEventListener('click', this.#clickListener, { passive: true });
            }
        }
        #detachSurfaceEvents() {
            const surface = this.#renderer?.surface();
            this.#tooltip.hide();
            surface?.removeEventListener('pointermove', this.#pointerMoveListener);
            surface?.removeEventListener('pointerleave', this.#pointerLeaveListener);
            surface?.removeEventListener('pointercancel', this.#pointerLeaveListener);
            surface?.removeEventListener('click', this.#clickListener);
        }
        #emitPointer(type, sourceEvent) {
            const result = this.#result;
            const surface = this.#renderer?.surface();
            if (result === null || surface === null || surface === undefined)
                return;
            const scene = result.scene;
            const bounds = surface.getBoundingClientRect();
            const x = ((sourceEvent.clientX - bounds.left) / Math.max(1, bounds.width)) * scene.width;
            const y = ((sourceEvent.clientY - bounds.top) / Math.max(1, bounds.height)) * scene.height;
            const markHit = scene.metadata.hitTestingEnabled ? hitTestScene(scene, x, y) : null;
            const tooltipSpec = result.spec.interaction.tooltip;
            const tooltipHit = type === 'hover' &&
                tooltipSpec !== false &&
                tooltipSpec.trigger === 'axis' &&
                markHit === null
                ? hitTestAxisTooltip(scene, x, y)
                : markHit;
            if (type === 'hover' && tooltipSpec !== false) {
                if (tooltipHit === null)
                    this.#tooltip.hide();
                else
                    this.#tooltip.show(resolveTooltipContent(tooltipHit, result.spec), tooltipHit, sourceEvent, surface, this.#renderer?.overlayHost?.() ?? surface.parentElement ?? surface);
            }
            this.#events.emit(type, { chart: this, hit: markHit, sourceEvent });
        }
        #assertAlive() {
            if (this.#destroyed) {
                throw new GraflumeError('DESTROYED_CHART', 'This chart instance has been destroyed.');
            }
        }
    }

    const compileAreaMark = (context) => {
        const { table, layer, xScale, yScale, color, theme, performance } = context;
        const yValues = Array.from({ length: table.length }, (_, index) => numericDataValue(table.value(index, layer.y.field), layer.y.type === 'temporal'));
        const indices = minMaxSampleIndices(yValues, performance.maxLinePoints);
        const baseline = yScale.map(0);
        const top = [];
        const topRowIndices = [];
        for (const rowIndex of indices) {
            const xInput = scaleInput(table.value(rowIndex, layer.x.field));
            const yInput = scaleInput(table.value(rowIndex, layer.y.field));
            if (xInput === null || yInput === null)
                continue;
            const x = xScale.map(xInput);
            const y = yScale.map(yInput);
            if (Number.isFinite(x) && Number.isFinite(y)) {
                top.push({ x, y });
                topRowIndices.push(rowIndex);
            }
        }
        if (top.length === 0)
            return [];
        const first = top[0];
        const last = top.at(-1);
        if (first === undefined || last === undefined)
            return [];
        const points = [...top, { x: last.x, y: baseline }, { x: first.x, y: baseline }];
        const fill = {
            type: 'path',
            ...nodeBase(`${layer.id}:area-fill`, {
                zIndex: layer.zIndex,
                opacity: layer.mark.opacity,
            }),
            points,
            closed: true,
            fill: layer.mark.fill ?? colorWithOpacity(color, theme.mode === 'dark' ? 0.28 : 0.2),
            lineWidth: 0,
        };
        const stroke = {
            type: 'path',
            ...nodeBase(`${layer.id}:area-line`, {
                zIndex: layer.zIndex + 0.1,
                opacity: layer.mark.opacity,
            }),
            points: top,
            closed: false,
            stroke: layer.mark.stroke ?? color,
            lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth,
            lineCap: 'round',
            lineJoin: 'round',
        };
        const nodes = [fill, stroke];
        if (layer.mark.point) {
            const pointIndices = new Set(strideSampleIndices(top.length, performance.maxPointMarks).filter((index) => index !== undefined));
            top.forEach((point, pointIndex) => {
                const rowIndex = topRowIndices[pointIndex];
                if (rowIndex === undefined || !pointIndices.has(pointIndex))
                    return;
                const circle = {
                    type: 'circle',
                    ...nodeBase(`${layer.id}:area-point:${rowIndex}`, {
                        zIndex: layer.zIndex + 0.2,
                        opacity: layer.mark.opacity,
                        interactive: performance.enableHitTesting,
                        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
                    }),
                    cx: point.x,
                    cy: point.y,
                    radius: layer.mark.radius ?? theme.mark.pointRadius,
                    fill: theme.colors.background,
                    stroke: layer.mark.stroke ?? color,
                    lineWidth: Math.max(1.5, (layer.mark.lineWidth ?? theme.mark.lineWidth) * 0.68),
                };
                nodes.push(circle);
            });
        }
        return nodes;
    };

    const compileBarMark = (context) => {
        const { table, layer, xScale, yScale, color, theme, barGroup, performance, plot } = context;
        if (layer.mark.orientation === 'horizontal') {
            const baseline = xScale.map(0);
            const slotHeight = yScale instanceof BandScale
                ? yScale.bandwidth / Math.max(1, barGroup.count)
                : Math.max(1, ((plot.height / Math.max(1, table.length)) * 0.8) / Math.max(1, barGroup.count));
            const barHeight = Math.max(1, slotHeight * 0.74);
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
        const barWidth = Math.max(1, slotWidth * 0.74);
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
                lineCap: 'round',
                lineJoin: 'round',
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
                        lineWidth: Math.max(1.5, lineWidth * 0.68),
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
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 1.75,
            });
        }
        return nodes;
    };

    function optionNumber$2(options, name, fallback) {
        const value = options[name];
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }
    function optionString$1(options, name) {
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
            ...nodeBase(`${layer.id}:stepped-area-fill`, {
                zIndex: layer.zIndex,
                opacity: layer.mark.opacity,
            }),
            points: [...top, { x: last.x, y: baseline }, { x: first.x, y: baseline }],
            closed: true,
            fill: layer.mark.fill ?? colorWithOpacity(color, theme.mode === 'dark' ? 0.28 : 0.2),
            lineWidth: 0,
        };
        const outline = {
            type: 'path',
            ...nodeBase(`${layer.id}:stepped-area-line`, {
                zIndex: layer.zIndex + 0.1,
                opacity: layer.mark.opacity,
            }),
            points: top,
            closed: false,
            stroke: layer.mark.stroke ?? color,
            lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth,
            lineCap: 'round',
            lineJoin: 'round',
        };
        return [area, outline];
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
                lineWidth: layer.mark.lineWidth ?? 2,
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
                ? (optionString$1(layer.mark.options, 'risingColor') ?? theme.colors.palette[1] ?? '#0f9f8a')
                : (optionString$1(layer.mark.options, 'fallingColor') ?? theme.colors.palette[3] ?? '#ef4444');
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
                stroke: layer.mark.stroke ?? mixColor(fill, theme.colors.text, 0.28),
                lineWidth: layer.mark.lineWidth ?? 1.5,
                lineCap: 'round',
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
        const totalCount = bins.reduce((sum, count) => sum + count, 0);
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
                        : {
                            datum: {
                                layerId: layer.id,
                                rowIndex,
                                datum: table.row(rowIndex),
                                tooltip: {
                                    binStart: start,
                                    binEnd: end,
                                    count,
                                    proportion: totalCount === 0 ? 0 : count / totalCount,
                                },
                            },
                        }),
                }),
                x: Math.min(x1, x2) + 2,
                y: Math.min(y, baseline),
                width: Math.max(1, Math.abs(x2 - x1) - 4),
                height: Math.max(0.5, Math.abs(baseline - y)),
                fill: layer.mark.fill ?? color,
                stroke: layer.mark.stroke ?? theme.colors.background,
                lineWidth: layer.mark.lineWidth ?? 1,
                cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
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
                    lineCap: 'round',
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
                    lineCap: 'round',
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
                    lineCap: 'round',
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
            lineCap: 'round',
            lineJoin: 'round',
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
                ? (optionString$1(layer.mark.options, 'positiveColor') ??
                    theme.colors.palette[1] ??
                    '#0f9f8a')
                : (optionString$1(layer.mark.options, 'negativeColor') ??
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
                cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
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
                    lineCap: 'round',
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
                fill: optionString$1(layer.mark.options, 'oldColor') ?? theme.colors.mutedText,
                lineWidth: 0,
                cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
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
                cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
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
                lineCap: 'round',
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
            const label = suffix === undefined || suffix === null
                ? String(annotation)
                : `${String(annotation)} — ${String(suffix)}`;
            const width = Math.min(190, Math.max(54, label.length * 6.1 + 16));
            const labelX = Math.min(plot.x + plot.width - width - 4, x + 6);
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:annotation-pill:${rowIndex}`, {
                    zIndex: layer.zIndex + 0.6,
                    opacity: 0.96,
                }),
                x: labelX,
                y: plot.y + 4,
                width,
                height: 22,
                fill: theme.colors.surface,
                stroke: colorWithOpacity(layer.mark.stroke ?? theme.colors.focus, 0.46),
                lineWidth: 1,
                cornerRadius: 6,
            });
            nodes.push(textNode$1(`${layer.id}:annotation-label:${rowIndex}`, labelX + 8, plot.y + 15, label, context, { align: 'left', baseline: 'middle', size: 10, weight: 650 }));
        }
        return nodes;
    };
    const compileVegaMark = (context) => {
        const mark = optionString$1(context.layer.mark.options, 'mark') ?? 'line';
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
    function optionString(options, name) {
        const value = options[name];
        return typeof value === 'string' ? value : undefined;
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
    function labelNode(id, x, y, text, context, fontSize = 12, options = {}) {
        return {
            type: 'text',
            ...nodeBase(id, { zIndex: context.layer.zIndex + 1 }),
            x,
            y,
            text,
            fill: options.fill ?? context.theme.colors.text,
            fontFamily: context.theme.typography.fontFamily,
            fontSize,
            fontWeight: options.weight ?? 600,
            align: options.align ?? 'center',
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
        const radius = Math.max(8, Math.min(plot.width, plot.height) * 0.36);
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
            const share = item.value / total;
            const span = next - angle;
            if (index < labelLimit && span >= 0.16) {
                const percentage = `${Math.round(share * 100)}%`;
                const inside = innerRadius > 0 || span >= 0.48;
                const labelRadius = innerRadius > 0 ? (innerRadius + radius) / 2 : radius * 0.64;
                const text = inside ? `${item.label} · ${percentage}` : `${item.label} ${percentage}`;
                if (!inside) {
                    const side = Math.cos(mid) >= 0 ? 1 : -1;
                    const edge = {
                        x: cx + Math.cos(mid) * radius * 0.9,
                        y: cy + Math.sin(mid) * radius * 0.9,
                    };
                    const elbow = {
                        x: cx + Math.cos(mid) * radius * 1.06,
                        y: cy + Math.sin(mid) * radius * 1.06,
                    };
                    nodes.push({
                        type: 'path',
                        ...nodeBase(`${layer.id}:leader:${item.rowIndex}`, { zIndex: layer.zIndex + 0.9 }),
                        points: [edge, elbow, { x: elbow.x + side * 10, y: elbow.y }],
                        closed: false,
                        stroke: mixColor(fill, theme.colors.text, 0.18),
                        lineWidth: 1.2,
                        lineCap: 'round',
                        lineJoin: 'round',
                    });
                    nodes.push(labelNode(`${layer.id}:label:${item.rowIndex}`, elbow.x + side * 14, elbow.y, text, context, 10.5, { align: side > 0 ? 'left' : 'right', fill: theme.colors.text, weight: 650 }));
                }
                else {
                    nodes.push(labelNode(`${layer.id}:label:${item.rowIndex}`, cx + Math.cos(mid) * labelRadius, cy + Math.sin(mid) * labelRadius, text, context, 10.5, {
                        fill: readableTextColor(fill, '#ffffff', '#0f172a'),
                        weight: 700,
                    }));
                }
            }
            angle = next;
        });
        if (innerRadius > radius * 0.34) {
            nodes.push(labelNode(`${layer.id}:center-label`, cx, cy - 9, optionString(layer.mark.options, 'centerLabel') ?? 'Total', context, 10, { fill: theme.colors.mutedText, weight: 600 }));
            nodes.push(labelNode(`${layer.id}:center-value`, cx, cy + 10, String(total), context, 18, {
                fill: theme.colors.text,
                weight: 750,
            }));
        }
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
            const inner = radius * 0.7;
            const fill = layer.mark.fill ??
                theme.colors.palette[rowIndex % theme.colors.palette.length] ??
                theme.colors.focus;
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:gauge-background:${rowIndex}`, { zIndex: layer.zIndex }),
                points: arcPoints(cx, cy, radius, Math.PI, Math.PI * 2, inner),
                closed: true,
                fill: mixColor(theme.colors.grid, theme.colors.surface, 0.3),
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
                fill,
                lineWidth: 0,
            });
            for (let tickIndex = 0; tickIndex <= 4; tickIndex += 1) {
                const tickAngle = Math.PI + (Math.PI * tickIndex) / 4;
                nodes.push({
                    type: 'line',
                    ...nodeBase(`${layer.id}:gauge-tick:${rowIndex}:${tickIndex}`, {
                        zIndex: layer.zIndex + 0.35,
                        opacity: 0.72,
                    }),
                    x1: cx + Math.cos(tickAngle) * radius * 0.76,
                    y1: cy + Math.sin(tickAngle) * radius * 0.76,
                    x2: cx + Math.cos(tickAngle) * radius * 0.84,
                    y2: cy + Math.sin(tickAngle) * radius * 0.84,
                    stroke: theme.colors.background,
                    lineWidth: 1.25,
                    lineCap: 'round',
                });
            }
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
                lineCap: 'round',
            };
            nodes.push(needle);
            const hub = {
                type: 'circle',
                ...nodeBase(`${layer.id}:gauge-hub:${rowIndex}`, { zIndex: layer.zIndex + 0.6 }),
                cx,
                cy,
                radius: 4,
                fill: theme.colors.text,
                stroke: theme.colors.background,
                lineWidth: 1.5,
            };
            nodes.push(hub);
            nodes.push(labelNode(`${layer.id}:gauge-value-label:${rowIndex}`, cx, cy - 15, String(value), context, 17, { weight: 750 }));
            nodes.push(labelNode(`${layer.id}:gauge-label:${rowIndex}`, cx, cy + 23, String(label), context, 11, {
                fill: theme.colors.mutedText,
                weight: 650,
            }));
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
        const calendarYear = first.getUTCFullYear();
        const start = new Date(Date.UTC(calendarYear, 0, 1));
        const day = 24 * 60 * 60 * 1000;
        const weekCount = Math.max(1, Math.ceil((Math.max(...values.map((item) => item.date.getTime())) - start.getTime()) / day / 7) + 1);
        const gap = 2;
        const cell = Math.max(3, Math.min((plot.width - 36) / weekCount - gap, (plot.height - 34) / 7 - gap));
        const originX = plot.x + 34;
        const originY = plot.y + 20;
        const nodes = [];
        const monthPositions = new Map();
        values.forEach((item) => {
            const offset = Math.floor((item.date.getTime() - start.getTime()) / day);
            const week = Math.floor((offset + start.getUTCDay()) / 7);
            const month = item.date.getUTCMonth();
            if (!monthPositions.has(month))
                monthPositions.set(month, week);
        });
        const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' });
        monthPositions.forEach((week, month) => {
            nodes.push(textNode(`${layer.id}:month:${month}`, originX + week * (cell + gap), plot.y + 7, monthFormatter.format(new Date(Date.UTC(calendarYear, month, 1))), context, { align: 'left', size: 9, weight: 650, fill: theme.colors.mutedText }));
        });
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
            [-168, 70],
            [-150, 60],
            [-134, 55],
            [-126, 48],
            [-124, 32],
            [-110, 24],
            [-98, 17],
            [-82, 23],
            [-80, 31],
            [-66, 45],
            [-58, 52],
            [-72, 61],
            [-96, 69],
            [-126, 72],
        ],
        [
            [-81, 12],
            [-69, 10],
            [-52, 3],
            [-35, -7],
            [-42, -23],
            [-53, -36],
            [-68, -55],
            [-76, -43],
            [-78, -18],
        ],
        [
            [-10, 36],
            [-18, 15],
            [-10, 1],
            [10, -5],
            [15, -24],
            [29, -35],
            [42, -18],
            [51, 12],
            [38, 31],
            [20, 37],
        ],
        [
            [-11, 36],
            [-8, 44],
            [2, 50],
            [17, 58],
            [31, 70],
            [58, 72],
            [88, 74],
            [119, 68],
            [151, 59],
            [178, 51],
            [162, 38],
            [145, 33],
            [122, 23],
            [106, 5],
            [83, 8],
            [66, 24],
            [46, 30],
            [34, 39],
            [20, 40],
            [8, 38],
        ],
        [
            [-52, 83],
            [-23, 81],
            [-18, 70],
            [-31, 60],
            [-48, 60],
            [-62, 72],
        ],
        [
            [112, -11],
            [131, -12],
            [145, -19],
            [154, -28],
            [148, -39],
            [132, -43],
            [116, -35],
            [113, -22],
        ],
    ];
    function project(plot, longitude, latitude) {
        return {
            x: plot.x + ((longitude + 180) / 360) * plot.width,
            y: plot.y + ((90 - latitude) / 180) * plot.height,
        };
    }
    function worldBackground(context) {
        const { layer, plot, theme } = context;
        const nodes = [
            {
                type: 'rect',
                ...nodeBase(`${layer.id}:map-surface`, { zIndex: layer.zIndex - 4 }),
                x: plot.x,
                y: plot.y,
                width: plot.width,
                height: plot.height,
                fill: theme.colors.surface,
                stroke: theme.colors.grid,
                lineWidth: 1,
                cornerRadius: 12,
            },
        ];
        for (let longitude = -120; longitude <= 120; longitude += 60) {
            const top = project(plot, longitude, 78);
            const bottom = project(plot, longitude, -60);
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:longitude:${longitude}`, {
                    zIndex: layer.zIndex - 3,
                    opacity: 0.7,
                }),
                x1: top.x,
                y1: top.y,
                x2: bottom.x,
                y2: bottom.y,
                stroke: theme.colors.grid,
                lineWidth: 0.8,
            });
        }
        for (let latitude = -60; latitude <= 60; latitude += 30) {
            const left = project(plot, -180, latitude);
            const right = project(plot, 180, latitude);
            nodes.push({
                type: 'line',
                ...nodeBase(`${layer.id}:latitude:${latitude}`, {
                    zIndex: layer.zIndex - 3,
                    opacity: 0.7,
                }),
                x1: left.x,
                y1: left.y,
                x2: right.x,
                y2: right.y,
                stroke: theme.colors.grid,
                lineWidth: 0.8,
            });
        }
        continents.forEach((polygon, index) => {
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:continent:${index}`, {
                    zIndex: layer.zIndex - 2,
                    opacity: 0.96,
                }),
                points: polygon.map(([longitude, latitude]) => project(plot, longitude, latitude)),
                closed: true,
                fill: mixColor(theme.colors.surface, theme.colors.grid, 0.72),
                stroke: theme.colors.axis,
                lineWidth: 0.8,
                lineJoin: 'round',
            });
        });
        return nodes;
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
            const radius = 5 + Math.sqrt(Math.max(0, ratio)) * 12;
            const fill = layer.mark.fill ?? theme.colors.focus;
            nodes.push({
                type: 'circle',
                ...nodeBase(`${layer.id}:region-halo:${rowIndex}`, {
                    zIndex: layer.zIndex - 0.1,
                }),
                cx: point.x,
                cy: point.y,
                radius: radius + 4,
                fill: colorWithOpacity(fill, theme.mode === 'dark' ? 0.2 : 0.14),
                lineWidth: 0,
            });
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
                radius,
                fill,
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
            const radius = layer.mark.radius ?? 5 + Math.sqrt(Math.max(0, ratio)) * 10;
            const fill = layer.mark.fill ?? theme.colors.focus;
            nodes.push({
                type: 'circle',
                ...nodeBase(`${layer.id}:map-halo:${rowIndex}`, { zIndex: layer.zIndex - 0.1 }),
                cx: point.x,
                cy: point.y,
                radius: radius + 4,
                fill: colorWithOpacity(fill, theme.mode === 'dark' ? 0.2 : 0.14),
                lineWidth: 0,
            });
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
                radius,
                fill,
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
            const middleY = parent.y + (position.y - parent.y) / 2;
            nodes.push({
                type: 'path',
                ...nodeBase(`${layer.id}:edge:${item.rowIndex}`, { zIndex: layer.zIndex - 1 }),
                points: [
                    { x: parent.x, y: parent.y + nodeHeight / 2 },
                    { x: parent.x, y: middleY },
                    { x: position.x, y: middleY },
                    { x: position.x, y: position.y - nodeHeight / 2 },
                ],
                closed: false,
                stroke: theme.colors.axis,
                lineWidth: 1.4,
                lineCap: 'round',
                lineJoin: 'round',
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
                stroke: layer.mark.stroke ?? theme.colors.axis,
                lineWidth: layer.mark.lineWidth ?? 1.2,
                cornerRadius: layer.mark.cornerRadius ?? 9,
            });
            const depth = depths.get(item.id) ?? 0;
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:node-accent:${item.rowIndex}`, {
                    zIndex: layer.zIndex + 0.1,
                }),
                x: position.x - nodeWidth / 2 + 1,
                y: position.y - nodeHeight / 2 + 1,
                width: nodeWidth - 2,
                height: 4,
                fill: theme.colors.palette[depth % theme.colors.palette.length] ?? theme.colors.focus,
                lineWidth: 0,
                cornerRadius: 4,
            });
            nodes.push(textNode(`${layer.id}:node-label:${item.rowIndex}`, position.x, position.y, item.id, context, { size: 10.5, weight: 700 }));
        });
        return nodes;
    };
    function cubicPoint(start, control1, control2, end, ratio) {
        const inverse = 1 - ratio;
        return {
            x: inverse ** 3 * start.x +
                3 * inverse ** 2 * ratio * control1.x +
                3 * inverse * ratio ** 2 * control2.x +
                ratio ** 3 * end.x,
            y: inverse ** 3 * start.y +
                3 * inverse ** 2 * ratio * control1.y +
                3 * inverse * ratio ** 2 * control2.y +
                ratio ** 3 * end.y,
        };
    }
    function sankeyBandPoints(sourceX, sourceY, sourceHeight, targetX, targetY, targetHeight) {
        const controlOffset = (targetX - sourceX) * 0.44;
        const sample = (startY, endY) => Array.from({ length: 13 }, (_, index) => {
            const ratio = index / 12;
            return cubicPoint({ x: sourceX, y: startY }, { x: sourceX + controlOffset, y: startY }, { x: targetX - controlOffset, y: endY }, { x: targetX, y: endY }, ratio);
        });
        return [
            ...sample(sourceY, targetY),
            ...sample(sourceY + sourceHeight, targetY + targetHeight).reverse(),
        ];
    }
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
                points: sankeyBandPoints(plot.x + nodeWidth, sy, sourceHeight, plot.x + plot.width - nodeWidth, ty, targetHeight),
                closed: true,
                fill: theme.colors.palette[index % theme.colors.palette.length] ?? theme.colors.focus,
                lineWidth: 0,
                lineJoin: 'round',
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
                cornerRadius: 4,
            });
            nodes.push(textNode(`${layer.id}:source-label:${index}`, plot.x + nodeWidth + 5, item.y + item.height / 2, name, context, { align: 'left', size: 10.5, weight: 650 }));
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
                cornerRadius: 4,
            });
            nodes.push(textNode(`${layer.id}:target-label:${index}`, plot.x + plot.width - nodeWidth - 5, item.y + item.height / 2, name, context, { align: 'right', size: 10.5, weight: 650 }));
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
                fill: mixColor(theme.colors.surface, theme.colors.focus, theme.mode === 'dark' ? 0.08 : 0.045),
                stroke: theme.colors.grid,
                lineWidth: 0.75,
                cornerRadius: 0,
            });
            nodes.push(textNode(`${layer.id}:header-label:${columnIndex}`, plot.x + columnIndex * columnWidth + 8, plot.y + headerHeight / 2, field, context, { align: 'left', size: 10.5, weight: 750 }));
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
                    fill: rowIndex % 2 === 0 ? theme.colors.background : theme.colors.surface,
                    stroke: theme.colors.grid,
                    lineWidth: 0.65,
                    cornerRadius: 0,
                });
                nodes.push(textNode(`${layer.id}:cell-label:${rowIndex}:${columnIndex}`, plot.x + columnIndex * columnWidth + 8, y + rowHeight / 2, String(table.value(rowIndex, field) ?? ''), context, { align: 'left', size: 10.5, weight: 500 }));
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
                cornerRadius: layer.mark.cornerRadius ?? 6,
            });
            if (gantt && progressField !== undefined && table.has(progressField)) {
                const progress = numericDataValue(table.value(rowIndex, progressField));
                if (progress !== null) {
                    nodes.push({
                        type: 'rect',
                        ...nodeBase(`${layer.id}:progress:${rowIndex}`, {
                            zIndex: layer.zIndex + 0.1,
                            opacity: 0.58,
                        }),
                        x: Math.min(x1, x2),
                        y: y - barHeight / 2,
                        width: Math.max(0, (Math.abs(x2 - x1) * Math.max(0, Math.min(100, progress))) / 100),
                        height: barHeight,
                        fill: mixColor(fill, theme.colors.text, theme.mode === 'dark' ? 0.18 : 0.26),
                        lineWidth: 0,
                        cornerRadius: layer.mark.cornerRadius ?? 6,
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
                        lineCap: 'round',
                    });
                });
            }
        }
        return nodes;
    }
    const compileTimelineMark = (context) => compileTimeline(context, false);
    const compileGanttMark = (context) => compileTimeline(context, true);
    function layoutTreemap(items, rectangle) {
        if (items.length === 0)
            return [];
        const first = items[0];
        if (items.length === 1 && first !== undefined)
            return [{ ...first, ...rectangle }];
        const total = items.reduce((sum, item) => sum + item.value, 0);
        let cumulative = 0;
        let splitIndex = 1;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let index = 1; index < items.length; index += 1) {
            cumulative += items[index - 1]?.value ?? 0;
            const distance = Math.abs(total / 2 - cumulative);
            if (distance < bestDistance) {
                bestDistance = distance;
                splitIndex = index;
            }
        }
        const leading = items.slice(0, splitIndex);
        const trailing = items.slice(splitIndex);
        const leadingValue = leading.reduce((sum, item) => sum + item.value, 0);
        const ratio = total <= 0 ? 0.5 : leadingValue / total;
        if (rectangle.width >= rectangle.height) {
            const leadingWidth = rectangle.width * ratio;
            return [
                ...layoutTreemap(leading, { ...rectangle, width: leadingWidth }),
                ...layoutTreemap(trailing, {
                    x: rectangle.x + leadingWidth,
                    y: rectangle.y,
                    width: rectangle.width - leadingWidth,
                    height: rectangle.height,
                }),
            ];
        }
        const leadingHeight = rectangle.height * ratio;
        return [
            ...layoutTreemap(leading, { ...rectangle, height: leadingHeight }),
            ...layoutTreemap(trailing, {
                x: rectangle.x,
                y: rectangle.y + leadingHeight,
                width: rectangle.width,
                height: rectangle.height - leadingHeight,
            }),
        ];
    }
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
        if (items.length === 0)
            return [];
        const nodes = [];
        const tiles = layoutTreemap(items, plot);
        tiles.forEach((item, index) => {
            const base = theme.colors.palette[index % theme.colors.palette.length] ?? theme.colors.focus;
            const fill = mixColor(base, theme.colors.background, theme.mode === 'dark' ? 0.06 : 0.02);
            const gap = 2;
            const x = item.x + gap;
            const y = item.y + gap;
            const width = Math.max(1, item.width - gap * 2);
            const height = Math.max(1, item.height - gap * 2);
            nodes.push({
                type: 'rect',
                ...nodeBase(`${layer.id}:treemap:${item.rowIndex}`, {
                    zIndex: layer.zIndex,
                    opacity: layer.mark.opacity,
                    interactive: performance.enableHitTesting,
                    datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
                }),
                x,
                y,
                width,
                height,
                fill: layer.mark.fill ?? fill,
                stroke: colorWithOpacity(theme.colors.background, 0.72),
                lineWidth: 1,
                cornerRadius: layer.mark.cornerRadius ?? 7,
            });
            if (width > 52 && height > 30) {
                const labelColor = readableTextColor(layer.mark.fill ?? fill, '#ffffff', '#0f172a');
                nodes.push(textNode(`${layer.id}:treemap-label:${item.rowIndex}`, x + 10, y + 13, item.label, context, {
                    align: 'left',
                    baseline: 'top',
                    size: Math.max(9, Math.min(14, Math.min(width, height) / 6)),
                    weight: 750,
                    fill: labelColor,
                }));
                if (height > 52) {
                    nodes.push(textNode(`${layer.id}:treemap-value:${item.rowIndex}`, x + 10, y + height - 10, String(item.value), context, {
                        align: 'left',
                        baseline: 'bottom',
                        size: 10,
                        weight: 600,
                        fill: colorWithOpacity(labelColor, 0.82),
                    }));
                }
            }
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
                    lineWidth: 1.6,
                    lineCap: 'round',
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
        overlayHost() {
            return this.#root;
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
            context.lineCap = node.lineCap ?? 'butt';
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
            context.lineCap = node.lineCap ?? 'round';
            context.lineJoin = node.lineJoin ?? 'round';
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
        '#4f46e5',
        '#0f9f8a',
        '#f59e0b',
        '#e05260',
        '#7c3aed',
        '#0e7490',
        '#db2777',
        '#65a30d',
        '#475569',
        '#ea580c',
    ];
    const graflumeLight = {
        name: 'graflume-light',
        mode: 'light',
        colors: {
            background: '#ffffff',
            surface: '#f8fafc',
            text: '#0f172a',
            mutedText: '#64748b',
            axis: '#cbd5e1',
            grid: '#e8eef6',
            focus: '#4f46e5',
            palette,
            sequential: ['#eef2ff', '#c7d2fe', '#818cf8', '#4f46e5', '#312e81'],
            diverging: ['#b42318', '#f79084', '#f8fafc', '#84adff', '#3448c5'],
        },
        typography: {
            fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 12,
            titleSize: 20,
            subtitleSize: 12,
            lineHeight: 1.45,
        },
        spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
        axis: { lineWidth: 1, tickLength: 0, labelPadding: 9, gridLineWidth: 1 },
        mark: { lineWidth: 2.5, pointRadius: 4.5, barRadius: 5, opacity: 1 },
        motion: { duration: 280, easing: 'ease-out' },
    };
    const graflumeDark = {
        ...graflumeLight,
        name: 'graflume-dark',
        mode: 'dark',
        colors: {
            ...graflumeLight.colors,
            background: '#0b1020',
            surface: '#111827',
            text: '#f8fafc',
            mutedText: '#a7b2c5',
            axis: '#475569',
            grid: '#25314a',
            focus: '#818cf8',
            palette: [
                '#818cf8',
                '#2dd4bf',
                '#fbbf24',
                '#fb7185',
                '#a78bfa',
                '#22d3ee',
                '#f472b6',
                '#a3e635',
                '#94a3b8',
                '#fb923c',
            ],
            sequential: ['#1e293b', '#3730a3', '#6366f1', '#a5b4fc', '#eef2ff'],
            diverging: ['#fb7185', '#be123c', '#334155', '#4f46e5', '#a5b4fc'],
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
    createDefaultRegistry();

    const additionalMarkCompilers = [
        ['radar', compileRadarMark],
        ['tree', compileTreeMark],
        ['graph', compileGraphMark],
        ['chord', compileChordMark],
        ['funnel', compileFunnelMark],
        ['parallel', compileParallelMark],
        ['boxplot', compileBoxplotMark],
        ['effect-scatter', compileEffectScatterMark],
        ['lines', compileLinesMark],
        ['heatmap', compileHeatmapMark],
        ['pictorial-bar', compilePictorialBarMark],
        ['theme-river', compileThemeRiverMark],
        ['sunburst', compileSunburstMark],
        ['custom', compileCustomMark],
        ['arc-diagram', compileArcDiagramMark],
        ['range', compileRangeMark],
        ['smooth', compileSmoothMark],
        ['distribution', compileDistributionMark],
        ['bullet', compileBulletMark],
        ['contour', compileContourMark],
        ['cylinder', compileCylinderMark],
        ['item', compileItemMark],
        ['lollipop', compileLollipopMark],
        ['packed-bubble', compilePackedBubbleMark],
        ['pareto', compileParetoMark],
        ['polygon', compilePolygonMark],
        ['pyramid', compilePyramidMark],
        ['scatter-3d', compileScatter3dMark],
        ['solid-gauge', compileSolidGaugeMark],
        ['tilemap', compileTilemapMark],
        ['variable-pie', compileVariablePieMark],
        ['variwide', compileVariwideMark],
        ['vector', compileVectorMark],
        ['venn', compileVennMark],
        ['wind-barb', compileWindBarbMark],
        ['word-cloud', compileWordCloudMark],
        ['indicator', compileIndicatorMark],
        ['flags', compileFlagsMark],
        ['financial', compileFinancialMark],
        ['point-figure', compilePointFigureMark],
        ['renko', compileRenkoMark],
        ['volume-profile', compileVolumeProfileMark],
        ['geo-flow', compileGeoFlowMark],
        ['geo-heatmap', compileGeoHeatmapMark],
        ['geo-line', compileGeoLineMark],
        ['tiled-map', compileTiledMapMark],
    ];
    function installAdditionalMarks(registry) {
        for (const [type, compiler] of additionalMarkCompilers)
            registry.registerMark(type, compiler);
    }
    function createCompleteRegistry() {
        const registry = createDefaultRegistry();
        installAdditionalMarks(registry);
        return registry;
    }
    const completeRegistry = createCompleteRegistry();
    function registerAdditionalMarks(registry = completeRegistry) {
        installAdditionalMarks(registry);
    }
    function create(target, spec, options) {
        return new Chart(target, spec, completeRegistry, options);
    }
    function compile(spec, options) {
        return compileWithRegistry(spec, completeRegistry, options);
    }
    function registerTheme(theme) {
        completeRegistry.registerTheme(theme);
    }
    function registerRenderer(factory) {
        completeRegistry.registerRenderer(factory);
    }
    function registerMark(type, compiler) {
        completeRegistry.registerMark(type, compiler);
    }
    function use(plugin) {
        completeRegistry.use(plugin);
    }
    function capabilities() {
        return completeRegistry.capabilities();
    }
    const createRegistry = createCompleteRegistry;
    function line(target, data, options) {
        return quickChart(create, 'line', target, data, options);
    }
    function bar(target, data, options) {
        return quickChart(create, 'bar', target, data, options);
    }
    function point(target, data, options) {
        return quickChart(create, 'point', target, data, options);
    }
    function scatter(target, data, options) {
        return point(target, data, options);
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
    function additional(type, target, data, options) {
        return quickChart(create, type, target, data, options);
    }
    function radar(target, data, options) {
        return additional('radar', target, data, options);
    }
    function tree(target, data, options) {
        return additional('tree', target, data, options);
    }
    function graph(target, data, options) {
        return additional('graph', target, data, options);
    }
    function selectedMode(options) {
        const mode = options.mark?.options?.mode;
        return typeof mode === 'string' ? mode : undefined;
    }
    /** One family API for node-link, arc, and connection-line layouts. */
    function network(target, data, options) {
        const mode = selectedMode(options);
        if (mode === 'arc')
            return arcDiagram(target, data, options);
        if (mode === 'connections')
            return lines(target, data, options);
        return graph(target, data, options);
    }
    function chord(target, data, options) {
        return additional('chord', target, data, options);
    }
    function funnel(target, data, options) {
        return additional('funnel', target, data, options);
    }
    function parallel(target, data, options) {
        return additional('parallel', target, data, options);
    }
    function boxplot(target, data, options) {
        return additional('boxplot', target, data, options);
    }
    function effectScatter(target, data, options) {
        return additional('effect-scatter', target, data, options);
    }
    function lines(target, data, options) {
        return additional('lines', target, data, options);
    }
    function heatmap(target, data, options) {
        return additional('heatmap', target, data, options);
    }
    function pictorialBar(target, data, options) {
        return additional('pictorial-bar', target, data, options);
    }
    function themeRiver(target, data, options) {
        return additional('theme-river', target, data, options);
    }
    function sunburst(target, data, options) {
        return additional('sunburst', target, data, options);
    }
    function custom(target, data, options) {
        return additional('custom', target, data, options);
    }
    function mergeDefaults(defaults, options) {
        return {
            ...options,
            mark: {
                ...defaults,
                ...options.mark,
                fields: { ...defaults.fields, ...options.mark?.fields },
                options: { ...defaults.options, ...options.mark?.options },
            },
        };
    }
    function makeSeriesQuick(type, defaults = {}) {
        return (target, data, options) => additional(type, target, data, mergeDefaults(defaults, options));
    }
    function makeIndicatorQuick(kind, defaults = {}) {
        return makeSeriesQuick('indicator', {
            ...defaults,
            options: { kind, ...defaults.options },
        });
    }
    const arcDiagram = makeSeriesQuick('arc-diagram', {
        fields: { target: 'target', value: 'value' },
    });
    const areaRange = makeSeriesQuick('range', {
        fields: { low: 'low', high: 'high' },
        options: { mode: 'area' },
    });
    const areaSpline = makeSeriesQuick('smooth', { options: { area: true } });
    const areaSplineRange = makeSeriesQuick('range', {
        fields: { low: 'low', high: 'high' },
        options: { mode: 'area', smooth: true },
    });
    const bellCurve = makeSeriesQuick('distribution');
    const bullet = makeSeriesQuick('bullet', { fields: { target: 'target' } });
    const columnPyramid = makeSeriesQuick('pyramid', { options: { variant: 'column' } });
    const columnRange = makeSeriesQuick('range', {
        fields: { low: 'low', high: 'high' },
        options: { mode: 'column' },
    });
    const contour = makeSeriesQuick('contour', { fields: { value: 'value' } });
    const cylinder = makeSeriesQuick('cylinder');
    const dependencyWheel = chord;
    const dumbbell = makeSeriesQuick('range', {
        fields: { low: 'low', high: 'high' },
        options: { mode: 'dumbbell' },
    });
    const errorBar = intervals;
    const funnel3d = makeSeriesQuick('pyramid', { options: { variant: 'funnel-3d' } });
    const itemChart = makeSeriesQuick('item');
    const lollipop = makeSeriesQuick('lollipop');
    const networkGraph = graph;
    const organizationNetwork = org;
    const packedBubble = makeSeriesQuick('packed-bubble');
    const pareto = makeSeriesQuick('pareto');
    const pictorialColumn = pictorialBar;
    const polygon = makeSeriesQuick('polygon');
    const pyramid = makeSeriesQuick('pyramid', { options: { variant: 'pyramid' } });
    const pyramid3d = makeSeriesQuick('pyramid', { options: { variant: 'pyramid-3d' } });
    const scatter3d = makeSeriesQuick('scatter-3d', { fields: { z: 'z' } });
    const solidGauge = makeSeriesQuick('solid-gauge');
    const spline = makeSeriesQuick('smooth');
    const streamgraph = themeRiver;
    const tileMap = makeSeriesQuick('tilemap', { fields: { value: 'value' } });
    const treeGraph = tree;
    const variablePie = makeSeriesQuick('variable-pie', { fields: { radius: 'radius' } });
    const variableWidth = makeSeriesQuick('variwide', { fields: { width: 'width' } });
    const vector = makeSeriesQuick('vector', {
        fields: { direction: 'direction', magnitude: 'magnitude' },
    });
    const venn = makeSeriesQuick('venn');
    const windBarb = makeSeriesQuick('wind-barb', {
        fields: { speed: 'speed', direction: 'direction' },
    });
    const wordCloud = makeSeriesQuick('word-cloud');
    const xRange = timeline;
    /** One family API for arrow and wind-barb vector glyphs. */
    function vectorField(target, data, options) {
        return selectedMode(options) === 'wind-barb'
            ? windBarb(target, data, options)
            : vector(target, data, options);
    }
    const accelerationBands = makeIndicatorQuick('abands', {
        fields: { lower: 'lower', middle: 'value', upper: 'upper' },
    });
    const awesomeOscillator = makeIndicatorQuick('ao');
    const absolutePriceOscillator = makeIndicatorQuick('apo');
    const aroon = makeIndicatorQuick('aroon', {
        options: { fields: ['up', 'down'] },
    });
    const aroonOscillator = makeIndicatorQuick('aroonoscillator');
    const averageTrueRange = makeIndicatorQuick('atr');
    const volatilityBands = makeIndicatorQuick('bb', {
        fields: { lower: 'lower', middle: 'value', upper: 'upper' },
    });
    const commodityChannelIndex = makeIndicatorQuick('cci');
    const chaikinOscillator = makeIndicatorQuick('chaikin');
    const chaikinMoneyFlow = makeIndicatorQuick('cmf');
    const chandeMomentumOscillator = makeIndicatorQuick('cmo');
    const doubleExponentialMovingAverage = makeIndicatorQuick('dema');
    const disparityIndex = makeIndicatorQuick('disparityindex');
    const directionalMovementIndex = makeIndicatorQuick('dmi', {
        options: { fields: ['plus', 'minus', 'value'] },
    });
    const detrendedPriceOscillator = makeIndicatorQuick('dpo');
    const exponentialMovingAverage = makeIndicatorQuick('ema');
    const eventFlags = makeSeriesQuick('flags', { fields: { title: 'title' } });
    const heikinAshi = makeSeriesQuick('financial', {
        fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
        options: { kind: 'heikin-ashi' },
    });
    const highLowClose = makeSeriesQuick('financial', {
        fields: { high: 'high', low: 'low', close: 'close' },
        options: { kind: 'hlc' },
    });
    const hollowCandlestick = makeSeriesQuick('financial', {
        fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
        options: { kind: 'hollow-candlestick' },
    });
    const ichimokuCloud = makeIndicatorQuick('ikh', {
        fields: { lower: 'lower', middle: 'value', upper: 'upper' },
        options: { fields: ['conversion', 'base', 'value'] },
    });
    const keltnerChannels = makeIndicatorQuick('keltnerchannels', {
        fields: { lower: 'lower', middle: 'value', upper: 'upper' },
    });
    const klingerOscillator = makeIndicatorQuick('klinger', {
        options: { fields: ['value', 'signal'] },
    });
    const linearRegression = makeIndicatorQuick('linearregression');
    const linearRegressionAngle = makeIndicatorQuick('linearregressionangle');
    const linearRegressionIntercept = makeIndicatorQuick('linearregressionintercept');
    const linearRegressionSlope = makeIndicatorQuick('linearregressionslope');
    const movingAverageConvergenceDivergence = makeIndicatorQuick('macd', {
        options: { fields: ['value', 'signal'] },
    });
    const moneyFlowIndex = makeIndicatorQuick('mfi');
    const momentumIndicator = makeIndicatorQuick('momentum');
    const normalizedAverageTrueRange = makeIndicatorQuick('natr');
    const onBalanceVolume = makeIndicatorQuick('obv');
    const openHighLowClose = makeSeriesQuick('financial', {
        fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
        options: { kind: 'ohlc' },
    });
    const priceChannel = makeIndicatorQuick('pc', {
        fields: { lower: 'lower', middle: 'value', upper: 'upper' },
    });
    const pivotPoints = makeIndicatorQuick('pivotpoints', {
        options: { fields: ['support', 'value', 'resistance'] },
    });
    const pointAndFigure = makeSeriesQuick('point-figure');
    const percentagePriceOscillator = makeIndicatorQuick('ppo');
    const priceEnvelopes = makeIndicatorQuick('priceenvelopes', {
        fields: { lower: 'lower', middle: 'value', upper: 'upper' },
    });
    const parabolicStopAndReverse = makeIndicatorQuick('psar');
    const renko = makeSeriesQuick('renko');
    const rateOfChange = makeIndicatorQuick('roc');
    const relativeStrengthIndex = makeIndicatorQuick('rsi');
    const slowStochastic = makeIndicatorQuick('slowstochastic', {
        options: { fields: ['value', 'signal'] },
    });
    const simpleMovingAverage = makeIndicatorQuick('sma');
    const stochastic = makeIndicatorQuick('stochastic', {
        options: { fields: ['value', 'signal'] },
    });
    const supertrend = makeIndicatorQuick('supertrend');
    const tripleExponentialMovingAverage = makeIndicatorQuick('tema');
    const tripleExponentialAverageOscillator = makeIndicatorQuick('trix');
    const volumeByPrice = makeSeriesQuick('volume-profile', {
        fields: { price: 'price', volume: 'volume' },
    });
    const volumeWeightedAveragePrice = makeIndicatorQuick('vwap');
    const williamsRange = makeIndicatorQuick('williamsr');
    const weightedMovingAverage = makeIndicatorQuick('wma');
    const zigzag = makeIndicatorQuick('zigzag');
    /** One family API for all indicator presets; select one with mark.options.kind. */
    const technicalIndicator = makeSeriesQuick('indicator', {
        options: { kind: 'sma' },
    });
    /** One family API for discrete price-block layouts. */
    function priceBlocks(target, data, options) {
        return selectedMode(options) === 'point-and-figure'
            ? pointAndFigure(target, data, options)
            : renko(target, data, options);
    }
    /** Canonical name for the volume-by-price preset. */
    const volumeProfile = volumeByPrice;
    const flowMap = makeSeriesQuick('geo-flow', {
        fields: { longitude2: 'longitude2', latitude2: 'latitude2', value: 'value' },
    });
    const geoHeatmap = makeSeriesQuick('geo-heatmap', { fields: { value: 'value' } });
    const mapBubble = map;
    const mapLine = makeSeriesQuick('geo-line', {
        fields: { longitude2: 'longitude2', latitude2: 'latitude2', value: 'value' },
    });
    const mapPoint = map;
    const tiledMap = makeSeriesQuick('tiled-map');
    const fullCatalog = [
        ...chartTypeCatalog,
        ...additionalChartTypeCatalog,
        ...seriesChartTypeCatalog,
    ];
    /** All historical names as presets mapped onto the consolidated family catalog. */
    const fullVariantCatalog = [
        ...chartVariantCatalog,
        ...additionalChartVariantCatalog,
        ...seriesChartVariantCatalog,
    ];

    exports.CanvasRenderer = CanvasRenderer;
    exports.Chart = Chart;
    exports.DataTable = DataTable;
    exports.GraflumeError = GraflumeError;
    exports.RuntimeRegistry = RuntimeRegistry;
    exports.absolutePriceOscillator = absolutePriceOscillator;
    exports.accelerationBands = accelerationBands;
    exports.additionalChartTypeCatalog = additionalChartTypeCatalog;
    exports.additionalChartVariantCatalog = additionalChartVariantCatalog;
    exports.annotatedTimeline = annotatedTimeline;
    exports.annotation = annotation;
    exports.arcDiagram = arcDiagram;
    exports.area = area;
    exports.areaRange = areaRange;
    exports.areaSpline = areaSpline;
    exports.areaSplineRange = areaSplineRange;
    exports.aroon = aroon;
    exports.aroonOscillator = aroonOscillator;
    exports.assertValidSpec = assertValidSpec;
    exports.averageTrueRange = averageTrueRange;
    exports.awesomeOscillator = awesomeOscillator;
    exports.bar = bar;
    exports.bellCurve = bellCurve;
    exports.boxplot = boxplot;
    exports.bubble = bubble;
    exports.bullet = bullet;
    exports.calendar = calendar;
    exports.candlestick = candlestick;
    exports.canvasRendererFactory = canvasRendererFactory;
    exports.capabilities = capabilities;
    exports.chaikinMoneyFlow = chaikinMoneyFlow;
    exports.chaikinOscillator = chaikinOscillator;
    exports.chandeMomentumOscillator = chandeMomentumOscillator;
    exports.chartTypeCatalog = chartTypeCatalog;
    exports.chartVariantCatalog = chartVariantCatalog;
    exports.chord = chord;
    exports.column = column;
    exports.columnPyramid = columnPyramid;
    exports.columnRange = columnRange;
    exports.combo = combo;
    exports.commodityChannelIndex = commodityChannelIndex;
    exports.compile = compile;
    exports.contour = contour;
    exports.create = create;
    exports.createCompleteRegistry = createCompleteRegistry;
    exports.createRegistry = createRegistry;
    exports.custom = custom;
    exports.cylinder = cylinder;
    exports.dependencyWheel = dependencyWheel;
    exports.detrendedPriceOscillator = detrendedPriceOscillator;
    exports.diff = diff;
    exports.directionalMovementIndex = directionalMovementIndex;
    exports.disparityIndex = disparityIndex;
    exports.donut = donut;
    exports.doubleExponentialMovingAverage = doubleExponentialMovingAverage;
    exports.dumbbell = dumbbell;
    exports.effectScatter = effectScatter;
    exports.errorBar = errorBar;
    exports.eventFlags = eventFlags;
    exports.exponentialMovingAverage = exponentialMovingAverage;
    exports.flowMap = flowMap;
    exports.fullCatalog = fullCatalog;
    exports.fullVariantCatalog = fullVariantCatalog;
    exports.funnel = funnel;
    exports.funnel3d = funnel3d;
    exports.gantt = gantt;
    exports.gauge = gauge;
    exports.geo = geo;
    exports.geoHeatmap = geoHeatmap;
    exports.graflumeDark = graflumeDark;
    exports.graflumeLight = graflumeLight;
    exports.graph = graph;
    exports.heatmap = heatmap;
    exports.heikinAshi = heikinAshi;
    exports.highLowClose = highLowClose;
    exports.histogram = histogram;
    exports.hitTestScene = hitTestScene;
    exports.hollowCandlestick = hollowCandlestick;
    exports.horizontalBar = horizontalBar;
    exports.ichimokuCloud = ichimokuCloud;
    exports.interval = interval;
    exports.intervals = intervals;
    exports.itemChart = itemChart;
    exports.keltnerChannels = keltnerChannels;
    exports.klingerOscillator = klingerOscillator;
    exports.line = line;
    exports.linearRegression = linearRegression;
    exports.linearRegressionAngle = linearRegressionAngle;
    exports.linearRegressionIntercept = linearRegressionIntercept;
    exports.linearRegressionSlope = linearRegressionSlope;
    exports.lines = lines;
    exports.lollipop = lollipop;
    exports.map = map;
    exports.mapBubble = mapBubble;
    exports.mapLine = mapLine;
    exports.mapPoint = mapPoint;
    exports.momentumIndicator = momentumIndicator;
    exports.moneyFlowIndex = moneyFlowIndex;
    exports.motion = motion;
    exports.movingAverageConvergenceDivergence = movingAverageConvergenceDivergence;
    exports.network = network;
    exports.networkGraph = networkGraph;
    exports.normalizeSpec = normalizeSpec;
    exports.normalizedAverageTrueRange = normalizedAverageTrueRange;
    exports.onBalanceVolume = onBalanceVolume;
    exports.openHighLowClose = openHighLowClose;
    exports.org = org;
    exports.organizationNetwork = organizationNetwork;
    exports.packedBubble = packedBubble;
    exports.parabolicStopAndReverse = parabolicStopAndReverse;
    exports.parallel = parallel;
    exports.pareto = pareto;
    exports.percentagePriceOscillator = percentagePriceOscillator;
    exports.pictorialBar = pictorialBar;
    exports.pictorialColumn = pictorialColumn;
    exports.pie = pie;
    exports.pivotPoints = pivotPoints;
    exports.pluginApiVersion = pluginApiVersion;
    exports.point = point;
    exports.pointAndFigure = pointAndFigure;
    exports.polygon = polygon;
    exports.priceBlocks = priceBlocks;
    exports.priceChannel = priceChannel;
    exports.priceEnvelopes = priceEnvelopes;
    exports.pyramid = pyramid;
    exports.pyramid3d = pyramid3d;
    exports.radar = radar;
    exports.rateOfChange = rateOfChange;
    exports.registerAdditionalMarks = registerAdditionalMarks;
    exports.registerMark = registerMark;
    exports.registerRenderer = registerRenderer;
    exports.registerTheme = registerTheme;
    exports.relativeStrengthIndex = relativeStrengthIndex;
    exports.renko = renko;
    exports.resolveSeriesType = resolveSeriesType;
    exports.sankey = sankey;
    exports.scatter = scatter;
    exports.scatter3d = scatter3d;
    exports.seriesChartTypeCatalog = seriesChartTypeCatalog;
    exports.seriesChartVariantCatalog = seriesChartVariantCatalog;
    exports.seriesCompatibilityCatalog = seriesCompatibilityCatalog;
    exports.seriesCompatibilityIds = seriesCompatibilityIds;
    exports.simpleMovingAverage = simpleMovingAverage;
    exports.slowStochastic = slowStochastic;
    exports.solidGauge = solidGauge;
    exports.specVersion = specVersion;
    exports.spline = spline;
    exports.steppedArea = steppedArea;
    exports.stochastic = stochastic;
    exports.streamgraph = streamgraph;
    exports.sunburst = sunburst;
    exports.supertrend = supertrend;
    exports.table = table;
    exports.technicalIndicator = technicalIndicator;
    exports.themeRiver = themeRiver;
    exports.tileMap = tileMap;
    exports.tiledMap = tiledMap;
    exports.timeline = timeline;
    exports.tree = tree;
    exports.treeGraph = treeGraph;
    exports.treemap = treemap;
    exports.trendline = trendline;
    exports.tripleExponentialAverageOscillator = tripleExponentialAverageOscillator;
    exports.tripleExponentialMovingAverage = tripleExponentialMovingAverage;
    exports.use = use;
    exports.validateSpec = validateSpec;
    exports.variablePie = variablePie;
    exports.variableWidth = variableWidth;
    exports.vector = vector;
    exports.vectorField = vectorField;
    exports.vegaChart = vegaChart;
    exports.venn = venn;
    exports.version = version;
    exports.volatilityBands = volatilityBands;
    exports.volumeByPrice = volumeByPrice;
    exports.volumeProfile = volumeProfile;
    exports.volumeWeightedAveragePrice = volumeWeightedAveragePrice;
    exports.waterfall = waterfall;
    exports.weightedMovingAverage = weightedMovingAverage;
    exports.williamsRange = williamsRange;
    exports.windBarb = windBarb;
    exports.wordCloud = wordCloud;
    exports.wordTree = wordTree;
    exports.xRange = xRange;
    exports.zigzag = zigzag;

    return exports;

})({});
//# sourceMappingURL=graflume.complete.global.js.map

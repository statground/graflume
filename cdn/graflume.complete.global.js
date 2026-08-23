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
        return axis === 'x' || axis === 'x2' ? target.x : target.y;
    }
    function perpendicular(target, axis) {
        return axis === 'x' || axis === 'x2' ? target.y : target.x;
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
        const horizontal = axis === 'x' || axis === 'x2';
        const position = index.position ??
            (horizontal ? (axis === 'x2' ? 'top' : 'bottom') : axis === 'y2' ? 'right' : 'left');
        if (horizontal) {
            const strip = axisVisible ? axisStripSize : 0;
            const top = position === 'top' ? plot.y - strip : plot.y;
            const stripBottom = position === 'bottom' ? bottom + strip : bottom;
            return x >= plot.x && x <= right && y >= top && y <= stripBottom;
        }
        const strip = axisVisible ? axisStripSize : 0;
        const left = position === 'left' ? plot.x - strip : plot.x;
        const stripRight = position === 'right' ? right + strip : right;
        return x >= left && x <= stripRight && y >= plot.y && y <= bottom;
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
        const horizontal = index.axis === 'x' || index.axis === 'x2';
        const pointerPrimary = horizontal ? x : y;
        const pointerPerpendicular = horizontal ? y : x;
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
    const ENCODING_KEYS = new Set(['field', 'type', 'title', 'scale', 'axis', 'axisId']);
    const FIELD_TYPES = new Set(['quantitative', 'temporal', 'ordinal', 'nominal']);
    const SCALE_KEYS = new Set([
        'type',
        'domain',
        'zero',
        'nice',
        'clamp',
        'reverse',
        'paddingInner',
        'paddingOuter',
    ]);
    const SCALE_TYPES = new Set(['linear', 'band', 'time']);
    const AXIS_IDS = new Set(['x', 'x2', 'y', 'y2']);
    const AXIS_KEYS = new Set([
        'title',
        'visible',
        'position',
        'offset',
        'line',
        'grid',
        'ticks',
        'labels',
        'tickCount',
        'format',
        'labelAngle',
    ]);
    const AXIS_STROKE_KEYS = new Set(['visible', 'color', 'width', 'opacity', 'dash']);
    const AXIS_TICK_KEYS = new Set([...AXIS_STROKE_KEYS, 'count', 'spacing', 'size', 'values']);
    const AXIS_LABEL_KEYS = new Set([
        'visible',
        'orientation',
        'angle',
        'align',
        'padding',
        'maxLength',
        'color',
        'font',
    ]);
    const AXIS_TITLE_KEYS = new Set(['text', 'visible', 'align', 'angle', 'padding', 'color', 'font']);
    const AXIS_FONT_KEYS = new Set(['family', 'size', 'weight', 'style']);
    const AXIS_FORMAT_KEYS = new Set([
        'type',
        'fractionDigits',
        'notation',
        'useGrouping',
        'currency',
        'currencyDisplay',
        'dateStyle',
        'timeStyle',
        'timeZone',
        'prefix',
        'suffix',
    ]);
    const AXIS_FORMAT_TYPES = new Set([
        'auto',
        'number',
        'integer',
        'percent',
        'compact',
        'scientific',
        'currency',
        'date',
        'time',
        'datetime',
    ]);
    const AXIS_POSITIONS = new Set(['top', 'bottom', 'left', 'right']);
    const AXIS_LABEL_ORIENTATIONS = new Set(['auto', 'horizontal', 'vertical-up', 'vertical-down']);
    const AXIS_TEXT_ALIGNS = new Set(['auto', 'start', 'center', 'end']);
    const AXIS_TITLE_ALIGNS = new Set(['start', 'center', 'end']);
    const AXIS_FONT_WEIGHTS = new Set(['normal', 'medium', 'semibold', 'bold']);
    const AXIS_FONT_STYLES = new Set(['normal', 'italic']);
    const AXIS_NOTATIONS = new Set(['standard', 'compact', 'scientific', 'engineering']);
    const AXIS_CURRENCY_DISPLAYS = new Set(['symbol', 'narrowSymbol', 'code', 'name']);
    const AXIS_DATE_STYLES = new Set(['short', 'medium', 'long', 'full']);
    const AXIS_TIME_STYLES = new Set(['short', 'medium', 'long']);
    function validateUnknownKeys(value, allowed, path, kind, issues) {
        for (const key of Object.keys(value)) {
            if (!allowed.has(key)) {
                issues.push({ path: `${path}.${key}`, message: `Unknown ${kind} property "${key}".` });
            }
        }
    }
    function validateFiniteNumber(value, path, label, issues, options = {}) {
        if (typeof value !== 'number' ||
            !Number.isFinite(value) ||
            (options.integer === true && !Number.isInteger(value)) ||
            (options.min !== undefined && value < options.min) ||
            (options.max !== undefined && value > options.max)) {
            const integer = options.integer === true ? ' integer' : '';
            const range = options.min === undefined && options.max === undefined
                ? ''
                : ` from ${options.min ?? '-infinity'} to ${options.max ?? 'infinity'}`;
            issues.push({ path, message: `${label} must be a finite${integer} number${range}.` });
        }
    }
    function validateOptionalBoolean(value, path, label, issues) {
        if (value !== undefined && typeof value !== 'boolean') {
            issues.push({ path, message: `${label} must be a boolean.` });
        }
    }
    function validateOptionalString(value, path, label, issues, allowEmpty = true) {
        if (value !== undefined && (typeof value !== 'string' || (!allowEmpty && value.trim() === ''))) {
            issues.push({ path, message: `${label} must be a${allowEmpty ? '' : ' non-empty'} string.` });
        }
    }
    function validateScale(value, path, issues) {
        if (value === undefined)
            return;
        if (!isPlainObject(value)) {
            issues.push({ path, message: 'Scale must be an object.' });
            return;
        }
        validateUnknownKeys(value, SCALE_KEYS, path, 'scale', issues);
        if (value.type !== undefined &&
            (typeof value.type !== 'string' || !SCALE_TYPES.has(value.type))) {
            issues.push({ path: `${path}.type`, message: 'Scale type is not supported.' });
        }
        if (value.domain !== undefined) {
            if (!Array.isArray(value.domain) || value.domain.length < 2) {
                issues.push({
                    path: `${path}.domain`,
                    message: 'Scale domain must contain at least 2 values.',
                });
            }
            else {
                value.domain.forEach((entry, index) => {
                    if ((typeof entry !== 'number' && typeof entry !== 'string') ||
                        (typeof entry === 'number' && !Number.isFinite(entry))) {
                        issues.push({
                            path: `${path}.domain[${index}]`,
                            message: 'Scale domain values must be finite numbers or strings.',
                        });
                    }
                });
            }
        }
        for (const key of ['zero', 'nice', 'clamp', 'reverse']) {
            validateOptionalBoolean(value[key], `${path}.${key}`, `Scale ${key}`, issues);
        }
        if (value.paddingInner !== undefined) {
            validateFiniteNumber(value.paddingInner, `${path}.paddingInner`, 'Scale paddingInner', issues, {
                min: 0,
                max: 1,
            });
        }
        if (value.paddingOuter !== undefined) {
            validateFiniteNumber(value.paddingOuter, `${path}.paddingOuter`, 'Scale paddingOuter', issues, {
                min: 0,
            });
        }
    }
    function validateAxisFont(value, path, issues) {
        if (value === undefined)
            return;
        if (!isPlainObject(value)) {
            issues.push({ path, message: 'Axis font must be an object.' });
            return;
        }
        validateUnknownKeys(value, AXIS_FONT_KEYS, path, 'axis font', issues);
        validateOptionalString(value.family, `${path}.family`, 'Axis font family', issues, false);
        if (value.size !== undefined) {
            validateFiniteNumber(value.size, `${path}.size`, 'Axis font size', issues, {
                min: 1,
                max: 256,
            });
        }
        if (value.weight !== undefined &&
            !((typeof value.weight === 'number' &&
                Number.isInteger(value.weight) &&
                value.weight >= 100 &&
                value.weight <= 900) ||
                (typeof value.weight === 'string' && AXIS_FONT_WEIGHTS.has(value.weight)))) {
            issues.push({
                path: `${path}.weight`,
                message: 'Axis font weight must be 100..900 or a supported named weight.',
            });
        }
        if (value.style !== undefined &&
            (typeof value.style !== 'string' || !AXIS_FONT_STYLES.has(value.style))) {
            issues.push({ path: `${path}.style`, message: 'Axis font style is not supported.' });
        }
    }
    function validateAxisStroke(value, path, issues, allowedKeys = AXIS_STROKE_KEYS) {
        if (typeof value === 'boolean')
            return false;
        if (!isPlainObject(value)) {
            issues.push({ path, message: 'Axis stroke must be a boolean or an object.' });
            return false;
        }
        validateUnknownKeys(value, allowedKeys, path, 'axis stroke', issues);
        validateOptionalBoolean(value.visible, `${path}.visible`, 'Axis stroke visibility', issues);
        validateOptionalString(value.color, `${path}.color`, 'Axis stroke color', issues, false);
        if (value.width !== undefined) {
            validateFiniteNumber(value.width, `${path}.width`, 'Axis stroke width', issues, {
                min: 0,
                max: 32,
            });
        }
        if (value.opacity !== undefined) {
            validateFiniteNumber(value.opacity, `${path}.opacity`, 'Axis stroke opacity', issues, {
                min: 0,
                max: 1,
            });
        }
        if (value.dash !== undefined) {
            if (!Array.isArray(value.dash) || value.dash.length > 16) {
                issues.push({
                    path: `${path}.dash`,
                    message: 'Axis stroke dash must be an array of at most 16 numbers.',
                });
            }
            else {
                value.dash.forEach((entry, index) => validateFiniteNumber(entry, `${path}.dash[${index}]`, 'Axis stroke dash value', issues, {
                    min: 0,
                    max: 256,
                }));
            }
        }
        return true;
    }
    function validateAxisTicks(value, path, issues) {
        if (typeof value === 'boolean')
            return;
        if (!validateAxisStroke(value, path, issues, AXIS_TICK_KEYS))
            return;
        if (value.count !== undefined) {
            validateFiniteNumber(value.count, `${path}.count`, 'Axis tick count', issues, {
                integer: true,
                min: 1,
                max: 200,
            });
        }
        for (const key of ['spacing', 'size']) {
            if (value[key] !== undefined) {
                validateFiniteNumber(value[key], `${path}.${key}`, `Axis tick ${key}`, issues, {
                    min: 0,
                    max: 256,
                });
            }
        }
        if (value.values !== undefined) {
            if (!Array.isArray(value.values) || value.values.length === 0 || value.values.length > 200) {
                issues.push({
                    path: `${path}.values`,
                    message: 'Axis tick values must contain between 1 and 200 entries.',
                });
            }
            else {
                value.values.forEach((entry, index) => {
                    if ((typeof entry !== 'number' && typeof entry !== 'string') ||
                        (typeof entry === 'number' && !Number.isFinite(entry))) {
                        issues.push({
                            path: `${path}.values[${index}]`,
                            message: 'Axis tick values must be finite numbers or strings.',
                        });
                    }
                });
            }
        }
    }
    function validateAxisLabels(value, path, issues) {
        if (typeof value === 'boolean')
            return;
        if (!isPlainObject(value)) {
            issues.push({ path, message: 'Axis labels must be a boolean or an object.' });
            return;
        }
        validateUnknownKeys(value, AXIS_LABEL_KEYS, path, 'axis label', issues);
        validateOptionalBoolean(value.visible, `${path}.visible`, 'Axis label visibility', issues);
        if (value.orientation !== undefined &&
            (typeof value.orientation !== 'string' || !AXIS_LABEL_ORIENTATIONS.has(value.orientation))) {
            issues.push({
                path: `${path}.orientation`,
                message: 'Axis label orientation is not supported.',
            });
        }
        if (value.angle !== undefined) {
            validateFiniteNumber(value.angle, `${path}.angle`, 'Axis label angle', issues, {
                min: -360,
                max: 360,
            });
        }
        if (value.align !== undefined &&
            (typeof value.align !== 'string' || !AXIS_TEXT_ALIGNS.has(value.align))) {
            issues.push({ path: `${path}.align`, message: 'Axis label alignment is not supported.' });
        }
        if (value.padding !== undefined) {
            validateFiniteNumber(value.padding, `${path}.padding`, 'Axis label padding', issues, {
                min: 0,
                max: 256,
            });
        }
        if (value.maxLength !== undefined) {
            validateFiniteNumber(value.maxLength, `${path}.maxLength`, 'Axis label maxLength', issues, {
                integer: true,
                min: 1,
                max: 1000,
            });
        }
        validateOptionalString(value.color, `${path}.color`, 'Axis label color', issues, false);
        validateAxisFont(value.font, `${path}.font`, issues);
    }
    function validateAxisTitle(value, path, issues) {
        if (value === undefined)
            return;
        if (typeof value === 'string' || value === false)
            return;
        if (!isPlainObject(value)) {
            issues.push({ path, message: 'Axis title must be a string, false, or an object.' });
            return;
        }
        validateUnknownKeys(value, AXIS_TITLE_KEYS, path, 'axis title', issues);
        validateOptionalString(value.text, `${path}.text`, 'Axis title text', issues);
        validateOptionalBoolean(value.visible, `${path}.visible`, 'Axis title visibility', issues);
        if (value.align !== undefined &&
            (typeof value.align !== 'string' || !AXIS_TITLE_ALIGNS.has(value.align))) {
            issues.push({ path: `${path}.align`, message: 'Axis title alignment is not supported.' });
        }
        if (value.angle !== undefined) {
            validateFiniteNumber(value.angle, `${path}.angle`, 'Axis title angle', issues, {
                min: -360,
                max: 360,
            });
        }
        if (value.padding !== undefined) {
            validateFiniteNumber(value.padding, `${path}.padding`, 'Axis title padding', issues, {
                min: 0,
                max: 256,
            });
        }
        validateOptionalString(value.color, `${path}.color`, 'Axis title color', issues, false);
        validateAxisFont(value.font, `${path}.font`, issues);
    }
    function validateAxisFormat(value, path, issues) {
        if (typeof value === 'string') {
            if (!AXIS_FORMAT_TYPES.has(value)) {
                issues.push({ path, message: 'Axis format is not supported.' });
            }
            return;
        }
        if (!isPlainObject(value)) {
            issues.push({ path, message: 'Axis format must be a supported name or an object.' });
            return;
        }
        validateUnknownKeys(value, AXIS_FORMAT_KEYS, path, 'axis format', issues);
        if (value.type !== undefined &&
            (typeof value.type !== 'string' || !AXIS_FORMAT_TYPES.has(value.type))) {
            issues.push({ path: `${path}.type`, message: 'Axis format type is not supported.' });
        }
        if (value.fractionDigits !== undefined) {
            validateFiniteNumber(value.fractionDigits, `${path}.fractionDigits`, 'Axis format fractionDigits', issues, { integer: true, min: 0, max: 20 });
        }
        if (value.notation !== undefined &&
            (typeof value.notation !== 'string' || !AXIS_NOTATIONS.has(value.notation))) {
            issues.push({ path: `${path}.notation`, message: 'Axis number notation is not supported.' });
        }
        validateOptionalBoolean(value.useGrouping, `${path}.useGrouping`, 'Axis format useGrouping', issues);
        if (value.currency !== undefined) {
            if (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency)) {
                issues.push({
                    path: `${path}.currency`,
                    message: 'Axis currency must be an uppercase three-letter code.',
                });
            }
            if (value.type !== undefined && value.type !== 'currency') {
                issues.push({
                    path: `${path}.currency`,
                    message: 'Axis currency is only valid for the currency format.',
                });
            }
        }
        if (value.currencyDisplay !== undefined &&
            (typeof value.currencyDisplay !== 'string' ||
                !AXIS_CURRENCY_DISPLAYS.has(value.currencyDisplay))) {
            issues.push({
                path: `${path}.currencyDisplay`,
                message: 'Axis currency display is not supported.',
            });
        }
        if (value.dateStyle !== undefined &&
            (typeof value.dateStyle !== 'string' || !AXIS_DATE_STYLES.has(value.dateStyle))) {
            issues.push({ path: `${path}.dateStyle`, message: 'Axis date style is not supported.' });
        }
        if (value.timeStyle !== undefined &&
            (typeof value.timeStyle !== 'string' || !AXIS_TIME_STYLES.has(value.timeStyle))) {
            issues.push({ path: `${path}.timeStyle`, message: 'Axis time style is not supported.' });
        }
        validateOptionalString(value.timeZone, `${path}.timeZone`, 'Axis timeZone', issues, false);
        validateOptionalString(value.prefix, `${path}.prefix`, 'Axis format prefix', issues);
        validateOptionalString(value.suffix, `${path}.suffix`, 'Axis format suffix', issues);
    }
    function validateAxis(value, path, axisId, issues) {
        if (value === false)
            return;
        if (!isPlainObject(value)) {
            issues.push({ path, message: 'Axis must be an object or false.' });
            return;
        }
        validateUnknownKeys(value, AXIS_KEYS, path, 'axis', issues);
        validateAxisTitle(value.title, `${path}.title`, issues);
        validateOptionalBoolean(value.visible, `${path}.visible`, 'Axis visibility', issues);
        if (value.position !== undefined) {
            if (typeof value.position !== 'string' || !AXIS_POSITIONS.has(value.position)) {
                issues.push({ path: `${path}.position`, message: 'Axis position is not supported.' });
            }
            else if (((axisId === 'x' || axisId === 'x2') && !['top', 'bottom'].includes(value.position)) ||
                ((axisId === 'y' || axisId === 'y2') && !['left', 'right'].includes(value.position))) {
                issues.push({
                    path: `${path}.position`,
                    message: `${axisId}-axis position is incompatible with its channel.`,
                });
            }
        }
        if (value.offset !== undefined) {
            validateFiniteNumber(value.offset, `${path}.offset`, 'Axis offset', issues, {
                min: 0,
                max: 256,
            });
        }
        for (const key of ['line', 'grid']) {
            if (value[key] !== undefined)
                validateAxisStroke(value[key], `${path}.${key}`, issues);
        }
        if (value.ticks !== undefined)
            validateAxisTicks(value.ticks, `${path}.ticks`, issues);
        if (value.labels !== undefined)
            validateAxisLabels(value.labels, `${path}.labels`, issues);
        if (value.tickCount !== undefined) {
            validateFiniteNumber(value.tickCount, `${path}.tickCount`, 'Axis tickCount', issues, {
                integer: true,
                min: 1,
                max: 200,
            });
        }
        if (value.format !== undefined)
            validateAxisFormat(value.format, `${path}.format`, issues);
        if (value.labelAngle !== undefined) {
            validateFiniteNumber(value.labelAngle, `${path}.labelAngle`, 'Axis labelAngle', issues, {
                min: -360,
                max: 360,
            });
        }
    }
    function validateAxes(value, path, issues) {
        if (value === undefined)
            return;
        if (!isPlainObject(value)) {
            issues.push({ path, message: 'Axes must be an object.' });
            return;
        }
        validateUnknownKeys(value, AXIS_IDS, path, 'axes', issues);
        for (const axisId of ['x', 'x2', 'y', 'y2']) {
            if (value[axisId] !== undefined)
                validateAxis(value[axisId], `${path}.${axisId}`, axisId, issues);
        }
    }
    function validateEncoding(value, path, channel, issues) {
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
        validateUnknownKeys(value, ENCODING_KEYS, path, 'encoding', issues);
        if (value.field.trim() === '')
            issues.push({ path: `${path}.field`, message: 'Field must not be empty.' });
        if (UNSAFE_FIELDS.has(value.field)) {
            issues.push({ path: `${path}.field`, message: `Unsafe field "${value.field}" is forbidden.` });
        }
        if (value.type !== undefined &&
            (typeof value.type !== 'string' || !FIELD_TYPES.has(value.type))) {
            issues.push({ path: `${path}.type`, message: 'Encoding type is not supported.' });
        }
        validateOptionalString(value.title, `${path}.title`, 'Encoding title', issues);
        validateScale(value.scale, `${path}.scale`, issues);
        const allowedAxisIds = channel === 'x' ? new Set(['x', 'x2']) : new Set(['y', 'y2']);
        const axisId = typeof value.axisId === 'string' && allowedAxisIds.has(value.axisId) ? value.axisId : channel;
        if (value.axisId !== undefined &&
            (typeof value.axisId !== 'string' || !allowedAxisIds.has(value.axisId))) {
            issues.push({
                path: `${path}.axisId`,
                message: `${channel}-encoding axisId must be "${channel}" or "${channel}2".`,
            });
        }
        if (value.axis !== undefined) {
            validateAxis(value.axis, `${path}.axis`, axisId, issues);
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
            (typeof tooltip.axis !== 'string' || !AXIS_IDS.has(tooltip.axis))) {
            issues.push({
                path: `${path}.tooltip.axis`,
                message: 'Tooltip axis must be "x", "x2", "y", or "y2".',
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
        validateEncoding(layer.x, `${path}.x`, 'x', issues);
        validateEncoding(layer.y, `${path}.y`, 'y', issues);
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
            validateEncoding(input.x, '$.x', 'x', issues);
            validateEncoding(input.y, '$.y', 'y', issues);
            if (input.data === undefined) {
                issues.push({
                    path: '$.data',
                    message: 'Chart-level data is required for shorthand charts.',
                });
            }
        }
        validateAxes(input.axes, '$.axes', issues);
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
    const axisDefaults = {
        x: { position: 'bottom', grid: false, titlePadding: 32 },
        x2: { position: 'top', grid: false, titlePadding: 32 },
        y: { position: 'left', grid: true, titlePadding: 46 },
        y2: { position: 'right', grid: false, titlePadding: 46 },
    };
    function normalizeAxisFont(input) {
        return {
            ...(input?.family === undefined ? {} : { family: input.family }),
            ...(input?.size === undefined ? {} : { size: input.size }),
            ...(input?.weight === undefined ? {} : { weight: input.weight }),
            style: input?.style ?? 'normal',
        };
    }
    function normalizeAxisStroke(input, defaultVisible, defaultOpacity = 1) {
        const stroke = typeof input === 'object' ? input : undefined;
        return {
            visible: typeof input === 'boolean' ? input : (stroke?.visible ?? defaultVisible),
            ...(stroke?.color === undefined ? {} : { color: stroke.color }),
            ...(stroke?.width === undefined ? {} : { width: stroke.width }),
            opacity: stroke?.opacity ?? defaultOpacity,
            dash: [...(stroke?.dash ?? [])],
        };
    }
    function normalizeAxisTicks(input, legacyCount) {
        const ticks = typeof input === 'object' ? input : undefined;
        const count = ticks?.count ?? legacyCount;
        return {
            ...normalizeAxisStroke(input, true),
            ...(count === undefined ? {} : { count }),
            spacing: ticks?.spacing ?? 0,
            ...(ticks?.size === undefined ? {} : { size: ticks.size }),
            ...(ticks?.values === undefined ? {} : { values: [...ticks.values] }),
        };
    }
    function normalizeAxisLabels(input, legacyAngle) {
        const labels = typeof input === 'object' ? input : undefined;
        const angle = labels?.angle ?? legacyAngle;
        return {
            visible: typeof input === 'boolean' ? input : (labels?.visible ?? true),
            orientation: labels?.orientation ?? 'auto',
            ...(angle === undefined ? {} : { angle }),
            align: labels?.align ?? 'auto',
            ...(labels?.padding === undefined ? {} : { padding: labels.padding }),
            ...(labels?.maxLength === undefined ? {} : { maxLength: labels.maxLength }),
            ...(labels?.color === undefined ? {} : { color: labels.color }),
            font: normalizeAxisFont(labels?.font),
        };
    }
    function normalizeAxisTitle(input, defaultPadding) {
        const title = typeof input === 'object' ? input : undefined;
        return {
            ...(typeof input === 'string'
                ? { text: input }
                : title?.text === undefined
                    ? {}
                    : { text: title.text }),
            visible: input === false ? false : (title?.visible ?? true),
            align: title?.align ?? 'center',
            ...(title?.angle === undefined ? {} : { angle: title.angle }),
            padding: title?.padding ?? defaultPadding,
            ...(title?.color === undefined ? {} : { color: title.color }),
            font: normalizeAxisFont(title?.font),
        };
    }
    function normalizeAxisFormat(input) {
        const format = typeof input === 'string' ? { type: input } : (input ?? {});
        const type = format.type ?? 'auto';
        return {
            type,
            ...(format.fractionDigits === undefined ? {} : { fractionDigits: format.fractionDigits }),
            notation: format.notation ??
                (type === 'compact' ? 'compact' : type === 'scientific' ? 'scientific' : 'standard'),
            useGrouping: format.useGrouping ?? true,
            ...(format.currency === undefined && type !== 'currency'
                ? {}
                : { currency: format.currency ?? 'USD' }),
            currencyDisplay: format.currencyDisplay ?? 'symbol',
            dateStyle: format.dateStyle ?? 'medium',
            timeStyle: format.timeStyle ?? 'short',
            timeZone: format.timeZone ?? 'UTC',
            prefix: format.prefix ?? '',
            suffix: format.suffix ?? '',
        };
    }
    function mergeBooleanObject(base, override) {
        if (override === undefined)
            return base;
        if (typeof override === 'boolean')
            return override;
        const baseObject = typeof base === 'object' ? base : base === undefined ? {} : { visible: base };
        return { ...baseObject, ...override };
    }
    function mergeFont(base, override) {
        if (override === undefined)
            return base;
        return { ...base, ...override };
    }
    function mergeLabels(base, override) {
        const merged = mergeBooleanObject(base, override);
        if (typeof merged !== 'object' || typeof override !== 'object')
            return merged;
        const baseFont = typeof base === 'object' ? base.font : undefined;
        const font = mergeFont(baseFont, override.font);
        return { ...merged, ...(font === undefined ? {} : { font }) };
    }
    function mergeTitle(base, override) {
        if (override === undefined)
            return base;
        if (typeof override !== 'object')
            return override;
        const baseObject = typeof base === 'object'
            ? base
            : typeof base === 'string'
                ? { text: base }
                : base === false
                    ? { visible: false }
                    : {};
        const font = mergeFont(baseObject.font, override.font);
        return { ...baseObject, ...override, ...(font === undefined ? {} : { font }) };
    }
    function mergeFormat(base, override) {
        if (override === undefined)
            return base;
        if (typeof override === 'string')
            return override;
        const baseObject = typeof base === 'string' ? { type: base } : base;
        return { ...baseObject, ...override };
    }
    function mergeAxis(base, override) {
        if (override === undefined)
            return base;
        if (override === false)
            return false;
        if (base === false || base === undefined)
            return override;
        const line = mergeBooleanObject(base.line, override.line);
        const grid = mergeBooleanObject(base.grid, override.grid);
        const ticks = mergeBooleanObject(base.ticks, override.ticks);
        const labels = mergeLabels(base.labels, override.labels);
        const title = mergeTitle(base.title, override.title);
        const format = mergeFormat(base.format, override.format);
        return {
            ...base,
            ...override,
            ...(line === undefined ? {} : { line }),
            ...(grid === undefined ? {} : { grid }),
            ...(ticks === undefined ? {} : { ticks }),
            ...(labels === undefined ? {} : { labels }),
            ...(title === undefined ? {} : { title }),
            ...(format === undefined ? {} : { format }),
        };
    }
    function normalizeAxis(input, id) {
        if (input === false)
            return false;
        const defaults = axisDefaults[id];
        return {
            visible: input?.visible ?? true,
            position: input?.position ?? defaults.position,
            offset: input?.offset ?? 0,
            line: normalizeAxisStroke(input?.line, true),
            grid: normalizeAxisStroke(input?.grid, defaults.grid, 0.82),
            ticks: normalizeAxisTicks(input?.ticks, input?.tickCount),
            labels: normalizeAxisLabels(input?.labels, input?.labelAngle),
            title: normalizeAxisTitle(input?.title, defaults.titlePadding),
            format: normalizeAxisFormat(input?.format),
        };
    }
    function normalizeEncoding(input, channel, chartAxes) {
        const encoding = typeof input === 'string' ? { field: input } : input;
        const axisId = encoding.axisId ?? channel;
        const axis = mergeAxis(chartAxes[axisId], encoding.axis);
        return {
            field: encoding.field,
            ...(encoding.type === undefined ? {} : { type: encoding.type }),
            title: encoding.title ?? encoding.field,
            scale: { ...encoding.scale },
            axisId,
            axis: normalizeAxis(axis, axisId),
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
            x: normalizeEncoding(layer.x, 'x', chartAxes),
            y: normalizeEncoding(layer.y, 'y', chartAxes),
            visible: layer.visible ?? true,
            zIndex: layer.zIndex ?? index,
        };
    }
    function normalizeSpec(input) {
        assertValidSpec(input);
        const chartAxes = input.axes ?? {};
        const axes = {
            x: normalizeAxis(chartAxes.x, 'x'),
            x2: normalizeAxis(chartAxes.x2, 'x2'),
            y: normalizeAxis(chartAxes.y, 'y'),
            y2: normalizeAxis(chartAxes.y2, 'y2'),
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
        const layers = sourceLayers.map((layer, index) => normalizeLayer(layer, index, input.data, chartAxes));
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

    function numberFormatter$1(locale, options) {
        try {
            return new Intl.NumberFormat(locale, options);
        }
        catch {
            return new Intl.NumberFormat(undefined, options);
        }
    }
    function dateFormatter$1(locale, options) {
        try {
            return new Intl.DateTimeFormat(locale, options);
        }
        catch {
            try {
                return new Intl.DateTimeFormat(undefined, options);
            }
            catch {
                const utcOptions = { ...options, timeZone: 'UTC' };
                try {
                    return new Intl.DateTimeFormat(locale, utcOptions);
                }
                catch {
                    try {
                        return new Intl.DateTimeFormat(undefined, utcOptions);
                    }
                    catch {
                        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });
                    }
                }
            }
        }
    }
    function finiteFractionDigits$1(value) {
        return value === undefined ? undefined : Math.max(0, Math.min(20, Math.trunc(value)));
    }
    function numericValue(value) {
        if (typeof value === 'number')
            return Number.isFinite(value) ? value : null;
        const parsed = Number(value);
        return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
    }
    function dateValue(value) {
        if (typeof value === 'number') {
            const date = new Date(value);
            return Number.isFinite(date.getTime()) ? { value: date, dateOnly: false } : null;
        }
        const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (dateOnly !== null) {
            const year = Number(dateOnly[1]);
            const month = Number(dateOnly[2]);
            const day = Number(dateOnly[3]);
            const date = new Date(Date.UTC(year, month - 1, day));
            if (date.getUTCFullYear() === year &&
                date.getUTCMonth() === month - 1 &&
                date.getUTCDate() === day) {
                return { value: date, dateOnly: true };
            }
            return null;
        }
        const date = new Date(value);
        return Number.isFinite(date.getTime()) ? { value: date, dateOnly: false } : null;
    }
    function formatNumber(value, format, locale) {
        const fractionDigits = finiteFractionDigits$1(format.fractionDigits);
        const notation = format.type === 'compact'
            ? 'compact'
            : format.type === 'scientific'
                ? 'scientific'
                : format.notation;
        const options = {
            notation,
            useGrouping: format.useGrouping,
            ...(fractionDigits === undefined
                ? format.type === 'integer'
                    ? { maximumFractionDigits: 0 }
                    : format.type === 'percent'
                        ? { maximumFractionDigits: 1 }
                        : { maximumFractionDigits: 6 }
                : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }),
        };
        if (format.type === 'percent')
            options.style = 'percent';
        if (format.type === 'currency') {
            options.style = 'currency';
            options.currency = format.currency ?? 'USD';
            options.currencyDisplay = format.currencyDisplay;
        }
        try {
            return numberFormatter$1(locale, options).format(value);
        }
        catch {
            return numberFormatter$1(locale, {
                useGrouping: format.useGrouping,
                maximumFractionDigits: fractionDigits ?? 6,
            }).format(value);
        }
    }
    function formatDate(parsed, format, locale) {
        const options = {
            timeZone: parsed.dateOnly && format.type === 'date' ? 'UTC' : format.timeZone || 'UTC',
        };
        if (format.type === 'time') {
            options.timeStyle = format.timeStyle;
        }
        else if (format.type === 'datetime') {
            options.dateStyle = format.dateStyle;
            options.timeStyle = format.timeStyle;
        }
        else {
            options.dateStyle = format.dateStyle;
        }
        return dateFormatter$1(locale, options).format(parsed.value);
    }
    /** Format a scale tick without accepting callbacks or executable formatter expressions. */
    function formatAxisTick(tick, format, locale) {
        let value = tick.label;
        if (format.type === 'date' || format.type === 'time' || format.type === 'datetime') {
            const date = dateValue(tick.value);
            if (date !== null)
                value = formatDate(date, format, locale);
        }
        else if (format.type !== 'auto') {
            const numeric = numericValue(tick.value);
            if (numeric !== null)
                value = formatNumber(numeric, format, locale);
        }
        return `${format.prefix}${value}${format.suffix}`;
    }
    /** Truncate by Unicode code point so surrogate pairs are never split. */
    function truncateAxisLabel(value, maxLength) {
        if (maxLength === undefined)
            return value;
        const characters = Array.from(value);
        if (characters.length <= maxLength)
            return value;
        if (maxLength <= 1)
            return '…';
        return `${characters.slice(0, maxLength - 1).join('')}…`;
    }

    function defaultPosition(id) {
        switch (id) {
            case 'x':
                return 'bottom';
            case 'x2':
                return 'top';
            case 'y':
                return 'left';
            case 'y2':
                return 'right';
        }
    }
    function channel$1(id) {
        return id === 'x' || id === 'x2' ? 'x' : 'y';
    }
    function position(context) {
        if (context.axis === false)
            return defaultPosition(context.id);
        const requested = context.axis.position;
        if (channel$1(context.id) === 'x') {
            return requested === 'top' || requested === 'bottom' ? requested : defaultPosition(context.id);
        }
        return requested === 'left' || requested === 'right' ? requested : defaultPosition(context.id);
    }
    function mappedFontWeight(weight, fallback) {
        if (typeof weight === 'number')
            return weight;
        switch (weight) {
            case 'normal':
                return 400;
            case 'medium':
                return 500;
            case 'semibold':
                return 600;
            case 'bold':
                return 700;
            default:
                return fallback;
        }
    }
    function resolveTextStyle(font, color, theme, fallbackWeight) {
        return {
            fill: color ?? theme.colors.mutedText,
            fontFamily: font.family ?? theme.typography.fontFamily,
            fontSize: font.size ?? theme.typography.fontSize,
            fontWeight: mappedFontWeight(font.weight, fallbackWeight),
            ...(font.style === 'italic' ? { fontStyle: 'italic' } : {}),
        };
    }
    function line$1(id, x1, y1, x2, y2, stroke, lineWidth, zIndex, opacity, dash) {
        return {
            type: 'line',
            ...nodeBase(id, { zIndex, opacity }),
            x1,
            y1,
            x2,
            y2,
            stroke,
            lineWidth,
            ...(dash.length === 0 ? {} : { dash }),
            lineCap: 'round',
        };
    }
    function text(id, x, y, value, style, options) {
        return {
            type: 'text',
            ...nodeBase(id, { zIndex: 110 }),
            x,
            y,
            text: value,
            fill: style.fill,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            ...(style.fontStyle === undefined ? {} : { fontStyle: style.fontStyle }),
            align: options.align,
            baseline: options.baseline,
            rotation: options.rotation,
        };
    }
    function explicitTickLabel(value, scale, locale) {
        if (scale.kind === 'time') {
            const date = new Date(typeof value === 'number' ? value : Date.parse(value));
            if (Number.isFinite(date.getTime())) {
                try {
                    return new Intl.DateTimeFormat(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                    }).format(date);
                }
                catch {
                    return new Intl.DateTimeFormat(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                    }).format(date);
                }
            }
        }
        if (scale.kind === 'linear' && typeof value === 'number') {
            try {
                return new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(value);
            }
            catch {
                return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value);
            }
        }
        return String(value);
    }
    function requestedTickCount(context) {
        if (context.axis === false)
            return 0;
        const length = channel$1(context.id) === 'x' ? context.plot.width : context.plot.height;
        const automatic = Math.max(2, Math.floor(length / (channel$1(context.id) === 'x' ? 96 : 58)));
        const requested = context.axis.ticks.count ?? automatic;
        if (context.axis.ticks.spacing <= 0)
            return Math.max(1, requested);
        return Math.max(1, Math.min(requested, Math.floor(length / context.axis.ticks.spacing)));
    }
    function pruneTicksBySpacing(ticks, spacing) {
        if (spacing <= 0 || ticks.length <= 1)
            return ticks;
        const ordered = [...ticks].sort((left, right) => left.position - right.position);
        const kept = [];
        for (const tick of ordered) {
            const previous = kept.at(-1);
            if (previous === undefined || tick.position - previous.position >= spacing)
                kept.push(tick);
        }
        return kept;
    }
    function resolveTicks(context) {
        const axis = context.axis;
        if (axis === false)
            return [];
        const configuredValues = axis.ticks.values;
        const rawTicks = configuredValues === undefined
            ? context.scale.ticks(requestedTickCount(context), context.locale)
            : configuredValues.flatMap((value) => {
                const mapped = context.scale.map(value);
                const minimum = channel$1(context.id) === 'x' ? context.plot.x : context.plot.y;
                const maximum = minimum + (channel$1(context.id) === 'x' ? context.plot.width : context.plot.height);
                return Number.isFinite(mapped) && mapped >= minimum - 0.5 && mapped <= maximum + 0.5
                    ? [
                        {
                            value,
                            position: mapped,
                            label: explicitTickLabel(value, context.scale, context.locale),
                        },
                    ]
                    : [];
            });
        return pruneTicksBySpacing(rawTicks, axis.ticks.spacing).map((tick) => ({
            ...tick,
            formattedLabel: truncateAxisLabel(formatAxisTick(tick, axis.format, context.locale), axis.labels.maxLength),
        }));
    }
    function labelAngle(context, ticks) {
        if (context.axis === false)
            return 0;
        if (context.axis.labels.angle !== undefined)
            return context.axis.labels.angle;
        switch (context.axis.labels.orientation) {
            case 'horizontal':
                return 0;
            case 'vertical-up':
                return -90;
            case 'vertical-down':
                return 90;
            case 'auto':
                return channel$1(context.id) === 'x' && context.scale.kind === 'band' && ticks.length > 10
                    ? -35
                    : 0;
        }
    }
    function explicitAlign(align) {
        return align === 'auto' ? null : align;
    }
    function labelAlign(context, axisPosition, angle) {
        if (context.axis === false)
            return 'center';
        const configured = explicitAlign(context.axis.labels.align);
        if (configured !== null)
            return configured;
        if (channel$1(context.id) === 'x') {
            if (angle === 0)
                return 'center';
            const startsOutward = (axisPosition === 'bottom' && angle > 0) || (axisPosition === 'top' && angle < 0);
            return startsOutward ? 'left' : 'right';
        }
        if (angle !== 0)
            return 'center';
        return axisPosition === 'left' ? 'right' : 'left';
    }
    function titleAlign(context, angle) {
        if (context.axis === false)
            return 'center';
        const align = context.axis.title.align;
        if (channel$1(context.id) !== 'y' || angle >= 0 || align === 'center')
            return align;
        return align === 'start' ? 'end' : 'start';
    }
    function coordinateAlongAxis(plot, axisChannel, align) {
        if (axisChannel === 'x') {
            if (align === 'start')
                return plot.x;
            if (align === 'end')
                return plot.x + plot.width;
            return plot.x + plot.width / 2;
        }
        if (align === 'start')
            return plot.y;
        if (align === 'end')
            return plot.y + plot.height;
        return plot.y + plot.height / 2;
    }
    function axisCoordinate(plot, axisPosition, offset) {
        switch (axisPosition) {
            case 'top':
                return plot.y - offset;
            case 'bottom':
                return plot.y + plot.height + offset;
            case 'left':
                return plot.x - offset;
            case 'right':
                return plot.x + plot.width + offset;
        }
    }
    function outwardSign(axisPosition) {
        return axisPosition === 'top' || axisPosition === 'left' ? -1 : 1;
    }
    function gridIsBoundary(tick, plot, axisChannel) {
        const boundary = axisChannel === 'x' ? plot.x : plot.y + plot.height;
        return Math.abs(tick.position - boundary) <= 0.5;
    }
    function titleText(context) {
        if (context.axis === false || context.axis.title.visible === false)
            return '';
        return context.axis.title.text ?? context.title;
    }
    /** Compile any primary or secondary Cartesian axis into renderer-neutral Scene primitives. */
    function compileAxis(context) {
        const { axis, plot, theme } = context;
        if (axis === false || axis.visible === false)
            return [];
        const nodes = [];
        const axisChannel = channel$1(context.id);
        const axisPosition = position(context);
        const coordinate = axisCoordinate(plot, axisPosition, axis.offset);
        const sign = outwardSign(axisPosition);
        const prefix = `axis-${context.id}`;
        const ticks = resolveTicks(context);
        const angle = labelAngle(context, ticks);
        const tickSize = axis.ticks.visible ? (axis.ticks.size ?? theme.axis.tickLength) : 0;
        const labelPadding = axis.labels.padding ?? theme.axis.labelPadding;
        if (axis.line.visible) {
            const stroke = axis.line.color ?? theme.colors.axis;
            const width = axis.line.width ?? theme.axis.lineWidth;
            nodes.push(axisChannel === 'x'
                ? line$1(`${prefix}:line`, plot.x, coordinate, plot.x + plot.width, coordinate, stroke, width, 100, axis.line.opacity, axis.line.dash)
                : line$1(`${prefix}:line`, coordinate, plot.y, coordinate, plot.y + plot.height, stroke, width, 100, axis.line.opacity, axis.line.dash));
        }
        const labelStyle = resolveTextStyle(axis.labels.font, axis.labels.color, theme, 500);
        ticks.forEach((tick, index) => {
            const isZero = typeof tick.value === 'number' && Math.abs(tick.value) < Number.EPSILON;
            if (axis.grid.visible && !gridIsBoundary(tick, plot, axisChannel)) {
                const defaultZeroStyle = axis.grid.color === undefined;
                const gridStroke = axis.grid.color ?? (isZero ? theme.colors.axis : theme.colors.grid);
                const gridWidth = axis.grid.width ?? theme.axis.gridLineWidth;
                nodes.push(axisChannel === 'x'
                    ? line$1(`${prefix}:grid:${index}`, tick.position, plot.y, tick.position, plot.y + plot.height, gridStroke, isZero && defaultZeroStyle ? Math.max(1, gridWidth) : gridWidth, -20, isZero && defaultZeroStyle ? Math.max(0.9, axis.grid.opacity) : axis.grid.opacity, axis.grid.dash)
                    : line$1(`${prefix}:grid:${index}`, plot.x, tick.position, plot.x + plot.width, tick.position, gridStroke, isZero && defaultZeroStyle ? Math.max(1, gridWidth) : gridWidth, -20, isZero && defaultZeroStyle ? Math.max(0.9, axis.grid.opacity) : axis.grid.opacity, axis.grid.dash));
            }
            if (axis.ticks.visible && tickSize > 0) {
                const stroke = axis.ticks.color ?? theme.colors.axis;
                const width = axis.ticks.width ?? theme.axis.lineWidth;
                nodes.push(axisChannel === 'x'
                    ? line$1(`${prefix}:tick:${index}`, tick.position, coordinate, tick.position, coordinate + sign * tickSize, stroke, width, 100, axis.ticks.opacity, axis.ticks.dash)
                    : line$1(`${prefix}:tick:${index}`, coordinate, tick.position, coordinate + sign * tickSize, tick.position, stroke, width, 100, axis.ticks.opacity, axis.ticks.dash));
            }
            if (!axis.labels.visible)
                return;
            if (axisChannel === 'x') {
                nodes.push(text(`${prefix}:label:${index}`, tick.position, coordinate + sign * (tickSize + labelPadding), tick.formattedLabel, labelStyle, {
                    align: labelAlign(context, axisPosition, angle),
                    baseline: axisPosition === 'top' ? 'bottom' : 'top',
                    rotation: angle,
                }));
            }
            else {
                nodes.push(text(`${prefix}:label:${index}`, coordinate + sign * (tickSize + labelPadding), tick.position, tick.formattedLabel, labelStyle, {
                    align: labelAlign(context, axisPosition, angle),
                    baseline: 'middle',
                    rotation: angle,
                }));
            }
        });
        const resolvedTitle = titleText(context);
        if (resolvedTitle !== '') {
            const titleStyle = resolveTextStyle(axis.title.font, axis.title.color, theme, 600);
            const titlePosition = coordinateAlongAxis(plot, axisChannel, axis.title.align);
            const titleAngle = axis.title.angle ?? (axisChannel === 'x' ? 0 : axisPosition === 'left' ? -90 : 90);
            const titleCoordinate = coordinate + sign * axis.title.padding;
            if (axisChannel === 'x') {
                nodes.push(text(`${prefix}:title`, titlePosition, titleCoordinate, resolvedTitle, titleStyle, {
                    align: titleAlign(context, titleAngle),
                    baseline: axisPosition === 'top' ? 'bottom' : 'top',
                    rotation: titleAngle,
                }));
            }
            else {
                nodes.push(text(`${prefix}:title`, axisPosition === 'left' ? Math.max(12, titleCoordinate) : titleCoordinate, titlePosition, resolvedTitle, titleStyle, { align: titleAlign(context, titleAngle), baseline: 'middle', rotation: titleAngle }));
            }
        }
        return nodes;
    }
    function estimatedTextWidth(value, fontSize) {
        let units = 0;
        for (const character of Array.from(value)) {
            if (/\s/u.test(character))
                units += 0.33;
            else if (/[^\u0000-\u024f]/u.test(character))
                units += 1;
            else
                units += 0.6;
        }
        return Math.max(fontSize * 0.6, units * fontSize);
    }
    function projectedSize(width, height, angle) {
        const radians = (angle * Math.PI) / 180;
        const cosine = Math.abs(Math.cos(radians));
        const sine = Math.abs(Math.sin(radians));
        return {
            width: width * cosine + height * sine,
            height: width * sine + height * cosine,
        };
    }
    function usesLegacyPrimaryGutter(context) {
        const axis = context.axis;
        if (axis === false || (context.id !== 'x' && context.id !== 'y'))
            return false;
        const expectedPosition = context.id === 'x' ? 'bottom' : 'left';
        const expectedTitlePadding = context.id === 'x' ? 32 : 46;
        return (axis.position === expectedPosition &&
            axis.offset === 0 &&
            axis.line.width === undefined &&
            axis.ticks.spacing === 0 &&
            axis.ticks.size === undefined &&
            axis.ticks.values === undefined &&
            axis.labels.orientation === 'auto' &&
            axis.labels.angle === undefined &&
            axis.labels.align === 'auto' &&
            axis.labels.padding === undefined &&
            axis.labels.maxLength === undefined &&
            axis.labels.font.family === undefined &&
            axis.labels.font.size === undefined &&
            axis.labels.font.weight === undefined &&
            axis.labels.font.style === 'normal' &&
            axis.title.angle === undefined &&
            axis.title.padding === expectedTitlePadding &&
            axis.title.font.family === undefined &&
            axis.title.font.size === undefined &&
            axis.title.font.weight === undefined &&
            axis.title.font.style === 'normal' &&
            axis.format.type === 'auto' &&
            axis.format.fractionDigits === undefined &&
            axis.format.notation === 'standard' &&
            axis.format.useGrouping &&
            axis.format.currency === undefined &&
            axis.format.prefix === '' &&
            axis.format.suffix === '');
    }
    /**
     * Deterministically estimate the outward axis gutter from the same ticks, formatting,
     * truncation, fonts and rotations used by compileAxis().
     */
    function measureAxisGutter(context) {
        const { axis, theme } = context;
        if (axis === false || axis.visible === false)
            return 0;
        const axisChannel = channel$1(context.id);
        let required = measureAxisLabelGutter(context);
        const resolvedTitle = titleText(context);
        if (resolvedTitle !== '') {
            const style = resolveTextStyle(axis.title.font, axis.title.color, theme, 600);
            const axisPosition = position(context);
            const titleAngle = axis.title.angle ?? (axisChannel === 'x' ? 0 : axisPosition === 'left' ? -90 : 90);
            const projected = projectedSize(estimatedTextWidth(resolvedTitle, style.fontSize), style.fontSize, titleAngle);
            const outwardTextExtent = axisChannel === 'x'
                ? projected.height
                : axis.title.align === 'center'
                    ? projected.width / 2
                    : projected.width;
            required = Math.max(required, axis.offset + axis.title.padding + outwardTextExtent);
        }
        const measured = Math.ceil(required);
        if (!usesLegacyPrimaryGutter(context))
            return measured;
        return Math.min(measured, context.id === 'x' ? 44 : 56);
    }
    /** Measure the interactive tick/label strip without extending it through the axis title. */
    function measureAxisLabelGutter(context) {
        const { axis, theme } = context;
        if (axis === false || axis.visible === false)
            return 0;
        const axisChannel = channel$1(context.id);
        const ticks = resolveTicks(context);
        const angle = labelAngle(context, ticks);
        const tickSize = axis.ticks.visible ? (axis.ticks.size ?? theme.axis.tickLength) : 0;
        const labelPadding = axis.labels.padding ?? theme.axis.labelPadding;
        const lineWidth = axis.line.visible ? (axis.line.width ?? theme.axis.lineWidth) : 0;
        let required = axis.offset + lineWidth / 2;
        if (axis.labels.visible && ticks.length > 0) {
            const style = resolveTextStyle(axis.labels.font, axis.labels.color, theme, 500);
            let labelExtent = 0;
            for (const tick of ticks) {
                const projected = projectedSize(estimatedTextWidth(tick.formattedLabel, style.fontSize), style.fontSize, angle);
                labelExtent = Math.max(labelExtent, axisChannel === 'x' ? projected.height : projected.width);
            }
            required = Math.max(required, axis.offset + tickSize + labelPadding + labelExtent);
        }
        else if (axis.ticks.visible) {
            required = Math.max(required, axis.offset + tickSize);
        }
        return Math.ceil(required);
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
    function pathBounds(node) {
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (const points of [node.points, ...(node.subpaths ?? [])]) {
            for (const point of points) {
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
            }
        }
        if (!Number.isFinite(minX))
            return null;
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
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
                const path = pathBounds(node);
                return path === null ? null : { x: path.x + path.width / 2, y: path.y + path.height / 2 };
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
                return pathBounds(node) ?? { x: 0, y: 0, width: 0, height: 0 };
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
        const channel = axis === 'x' || axis === 'x2' ? 'x' : 'y';
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
            if (layerData !== undefined &&
                (channel === 'x' ? layerData.xAxisId : layerData.yAxisId) !== axis) {
                return;
            }
            let x = clippedGeometry.x;
            let y = clippedGeometry.y;
            if (node.datum.tooltip === undefined && layerData !== undefined) {
                const encoding = layerData.layer[channel];
                const scale = channel === 'x' ? layerData.xScale : layerData.yScale;
                const encoded = scaleValue(scale, node.datum.datum[encoding.field]);
                if (encoded !== null) {
                    if (channel === 'x')
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
            if ((channel === 'x' ? layerData.xAxisId : layerData.yAxisId) !== axis)
                continue;
            const indices = strideSampleIndices(layerData.table.length, context.performance.maxPointMarks);
            for (const rowIndex of indices) {
                if (representedRows.has(`${layerData.layer.id}\u0000${rowIndex}`))
                    continue;
                const datum = layerData.table.row(rowIndex);
                const x = scaleValue(layerData.xScale, datum[layerData.layer.x.field]);
                const y = scaleValue(layerData.yScale, datum[layerData.layer.y.field]);
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
    function xAxisId(layer) {
        if (layer.x.axisId === 'x' || layer.x.axisId === 'x2')
            return layer.x.axisId;
        throw new GraflumeError('INVALID_SPEC', 'The x encoding axisId must be "x" or "x2".', {
            path: `$.layers[${layer.id}].x.axisId`,
        });
    }
    function yAxisId(layer) {
        if (layer.y.axisId === 'y' || layer.y.axisId === 'y2')
            return layer.y.axisId;
        throw new GraflumeError('INVALID_SPEC', 'The y encoding axisId must be "y" or "y2".', {
            path: `$.layers[${layer.id}].y.axisId`,
        });
    }
    function resolveAxisScale(id, layers, plot) {
        const channel = id === 'x' || id === 'x2' ? 'x' : 'y';
        const fieldType = resolveCommonType(layers.map((layer) => (channel === 'x' ? layer.xType : layer.yType)), channel);
        const firstEncoding = layers[0]?.layer[channel];
        const requestedScaleTypes = new Set(layers
            .map((layer) => layer.layer[channel].scale.type)
            .filter((type) => type !== undefined));
        if (requestedScaleTypes.size > 1) {
            throw new GraflumeError('INCOMPATIBLE_SCALE', `Layers bound to ${id} request incompatible scale types: ${[...requestedScaleTypes].join(', ')}.`, { path: `$.layers[].${channel}.scale.type` });
        }
        const requestedScaleType = [...requestedScaleTypes][0];
        const family = typeFamily(fieldType);
        if ((requestedScaleType === 'band' && family !== 'categorical') ||
            (requestedScaleType === 'linear' && family !== 'numeric') ||
            (requestedScaleType === 'time' && family !== 'temporal')) {
            throw new GraflumeError('INCOMPATIBLE_SCALE', `Scale type "${requestedScaleType}" is incompatible with the ${id} field type "${fieldType}".`, { path: `$.layers[].${channel}.scale.type` });
        }
        const reverse = firstEncoding?.scale.reverse === true;
        const categorical = requestedScaleType === 'band' || family === 'categorical';
        let scale;
        if (categorical) {
            const domain = categoricalDomain(layers, channel);
            scale = new BandScale({
                domain: reverse ? [...domain].reverse() : domain,
                range: channel === 'x' ? [plot.x, plot.x + plot.width] : [plot.y, plot.y + plot.height],
                ...(firstEncoding?.scale.paddingInner === undefined
                    ? {}
                    : { paddingInner: firstEncoding.scale.paddingInner }),
                ...(firstEncoding?.scale.paddingOuter === undefined
                    ? {}
                    : { paddingOuter: firstEncoding.scale.paddingOuter }),
            });
        }
        else {
            const normalRange = channel === 'x' ? [plot.x, plot.x + plot.width] : [plot.y + plot.height, plot.y];
            const range = reverse
                ? [normalRange[1], normalRange[0]]
                : normalRange;
            scale = new LinearScale({
                domain: numericDomain(layers, channel, fieldType),
                range,
                kind: requestedScaleType === 'time' || fieldType === 'temporal' ? 'time' : 'linear',
                ...(firstEncoding?.scale.nice === undefined ? {} : { nice: firstEncoding.scale.nice }),
                ...(firstEncoding?.scale.clamp === undefined ? {} : { clamp: firstEncoding.scale.clamp }),
            });
        }
        return { id, channel, fieldType, scale };
    }
    function resolveScales(spec, plot) {
        const preparedLayers = spec.layers
            .filter((layer) => layer.visible)
            .map((layer) => {
            const table = DataTable.from(layer.data);
            return {
                layer,
                table,
                xType: layer.x.type ?? inferFieldType(table, layer.x.field),
                yType: layer.y.type ?? inferFieldType(table, layer.y.field),
                xAxisId: xAxisId(layer),
                yAxisId: yAxisId(layer),
            };
        });
        if (preparedLayers.length === 0) {
            throw new GraflumeError('INVALID_SPEC', 'At least one visible layer is required.', {
                path: '$.layers',
            });
        }
        const grouped = new Map();
        for (const layer of preparedLayers) {
            for (const id of [layer.xAxisId, layer.yAxisId]) {
                const entries = grouped.get(id) ?? [];
                entries.push(layer);
                grouped.set(id, entries);
            }
        }
        const partialAxes = {};
        for (const id of ['x', 'x2', 'y', 'y2']) {
            const entries = grouped.get(id);
            if (entries === undefined || entries.length === 0)
                continue;
            partialAxes[id] = resolveAxisScale(id, entries, plot);
        }
        const layers = preparedLayers.map((layer) => {
            const xResolved = partialAxes[layer.xAxisId];
            const yResolved = partialAxes[layer.yAxisId];
            if (xResolved === undefined || yResolved === undefined) {
                throw new GraflumeError('INVALID_SPEC', 'Unable to resolve layer axis scales.', {
                    path: `$.layers[${layer.layer.id}]`,
                });
            }
            return {
                ...layer,
                xScale: xResolved.scale,
                yScale: yResolved.scale,
            };
        });
        const axes = {};
        for (const id of ['x', 'x2', 'y', 'y2']) {
            const resolved = partialAxes[id];
            if (resolved === undefined)
                continue;
            axes[id] = {
                ...resolved,
                layers: layers.filter((layer) => resolved.channel === 'x' ? layer.xAxisId === id : layer.yAxisId === id),
            };
        }
        const resolvedX = axes.x ?? axes.x2;
        const resolvedY = axes.y ?? axes.y2;
        if (resolvedX === undefined || resolvedY === undefined) {
            throw new GraflumeError('INVALID_SPEC', 'Both x and y scales are required.', {
                path: '$.layers',
            });
        }
        return {
            layers,
            axes,
            xType: resolvedX.fieldType,
            yType: resolvedY.fieldType,
            xScale: resolvedX.scale,
            yScale: resolvedY.scale,
        };
    }

    function createLayout(spec, width, height, theme, minimumInsets = {}) {
        const titleBlock = spec.title === undefined
            ? 0
            : theme.typography.titleSize +
                (spec.title.subtitle === undefined
                    ? theme.spacing.lg
                    : theme.typography.subtitleSize + theme.spacing.lg + theme.spacing.xs);
        const insets = {
            // A top axis shares the space between the chart heading and the plot. Keep
            // the caller's outer top padding for the heading, then reserve the measured
            // axis gutter inside it. The other sides retain the legacy contract where
            // the normalized padding already includes the primary-axis gutter.
            top: spec.padding.top + Math.max(0, minimumInsets.top ?? 0),
            right: Math.max(spec.padding.right, minimumInsets.right ?? 0),
            bottom: Math.max(spec.padding.bottom, minimumInsets.bottom ?? 0),
            left: Math.max(spec.padding.left, minimumInsets.left ?? 0),
        };
        const plotX = insets.left;
        const plotY = insets.top + titleBlock;
        const plotWidth = Math.max(1, width - insets.left - insets.right);
        const plotHeight = Math.max(1, height - plotY - insets.bottom);
        return {
            width,
            height,
            plot: { x: plotX, y: plotY, width: plotWidth, height: plotHeight },
            insets,
            titleY: spec.padding.top,
            subtitleY: spec.padding.top + theme.typography.titleSize + theme.spacing.xs,
        };
    }

    const AXISLESS_MARKS = new Set([
        'arc-diagram',
        'calendar',
        'chord',
        'funnel',
        'gauge',
        'geo-flow',
        'geo-heatmap',
        'geo-line',
        'graph',
        'geo',
        'item',
        'map',
        'org',
        'packed-bubble',
        'parallel',
        'pie',
        'radar',
        'sankey',
        'solid-gauge',
        'sunburst',
        'table',
        'tiled-map',
        'tilemap',
        'tree',
        'treemap',
        'venn',
        'word-cloud',
        'word-tree',
    ]);
    const AXIS_ORDER = ['x', 'x2', 'y', 'y2'];
    function activeAxes(scales) {
        return AXIS_ORDER.flatMap((id) => {
            const resolved = scales.axes[id];
            if (resolved === undefined)
                return [];
            const layerData = resolved.layers.find(({ layer }) => !AXISLESS_MARKS.has(layer.mark.type));
            if (layerData === undefined)
                return [];
            const encoding = resolved.channel === 'x' ? layerData.layer.x : layerData.layer.y;
            return [{ id, axis: encoding.axis, scale: resolved.scale, title: encoding.title }];
        });
    }
    function axisContext(axis, plot, theme, locale) {
        return {
            ...axis,
            plot,
            theme,
            ...(locale === undefined ? {} : { locale }),
        };
    }
    function samePlot(left, right) {
        return (left.x === right.x &&
            left.y === right.y &&
            left.width === right.width &&
            left.height === right.height);
    }
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
        let layout = createLayout(spec, width, height, theme);
        let scales = resolveScales(spec, layout.plot);
        let axes = activeAxes(scales);
        const minimumInsets = { top: 0, right: 0, bottom: 0, left: 0 };
        for (const axis of axes) {
            if (axis.axis === false || axis.axis.visible === false)
                continue;
            const required = measureAxisGutter(axisContext(axis, layout.plot, theme, spec.locale));
            minimumInsets[axis.axis.position] = Math.max(minimumInsets[axis.axis.position], required);
        }
        const measuredLayout = createLayout(spec, width, height, theme, minimumInsets);
        if (!samePlot(layout.plot, measuredLayout.plot)) {
            layout = measuredLayout;
            scales = resolveScales(spec, layout.plot);
            axes = activeAxes(scales);
        }
        const totalRows = scales.layers.reduce((sum, layer) => sum + layer.table.length, 0);
        const performance = resolvePerformanceSettings(spec.performance, totalRows, layout.plot.width);
        const axisNodes = axes.flatMap((axis) => compileAxis(axisContext(axis, layout.plot, theme, spec.locale)));
        const groupedBarLayers = new Map();
        for (const layerData of scales.layers) {
            if (layerData.layer.mark.type !== 'bar' || layerData.layer.mark.position !== 'group')
                continue;
            const key = `${layerData.layer.mark.orientation}:${layerData.xAxisId}:${layerData.yAxisId}`;
            groupedBarLayers.set(key, scales.layers.filter((candidate) => candidate.layer.mark.type === 'bar' &&
                candidate.layer.mark.position === 'group' &&
                candidate.layer.mark.orientation === layerData.layer.mark.orientation &&
                candidate.xAxisId === layerData.xAxisId &&
                candidate.yAxisId === layerData.yAxisId));
        }
        const layerGroups = scales.layers.map((layerData, layerIndex) => {
            const color = theme.colors.palette[layerIndex % theme.colors.palette.length] ?? theme.colors.focus;
            const barGroupKey = `${layerData.layer.mark.orientation}:${layerData.xAxisId}:${layerData.yAxisId}`;
            const barLayers = groupedBarLayers.get(barGroupKey) ?? [];
            const barGroupIndex = barLayers.findIndex(({ layer }) => layer.id === layerData.layer.id);
            const compiler = registry.mark(layerData.layer.mark.type);
            const children = compiler({
                ...layerData,
                xScale: layerData.xScale,
                yScale: layerData.yScale,
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
            const activeAxis = axes.find((candidate) => candidate.id === axis);
            const axisVisible = activeAxis !== undefined && activeAxis.axis !== false && activeAxis.axis.visible;
            const context = activeAxis === undefined
                ? undefined
                : axisContext(activeAxis, layout.plot, theme, spec.locale);
            let axisStripSize = context === undefined ? 0 : measureAxisLabelGutter(context);
            if (context !== undefined &&
                context.axis !== false &&
                (context.axis.labels.angle ?? 0) === 0 &&
                (context.axis.labels.orientation === 'auto' ||
                    context.axis.labels.orientation === 'horizontal')) {
                const horizontal = axis === 'x' || axis === 'x2';
                const tickSize = context.axis.ticks.visible
                    ? (context.axis.ticks.size ?? theme.axis.tickLength)
                    : 0;
                const labelPadding = context.axis.labels.padding ?? theme.axis.labelPadding;
                const fontSize = context.axis.labels.font.size ?? theme.typography.fontSize;
                const readableStrip = context.axis.offset + tickSize + labelPadding + fontSize * (horizontal ? 1.5 : 4);
                axisStripSize = Math.min(axisStripSize, readableStrip);
            }
            registerAxisTooltipIndex(scene, {
                axis,
                ...(activeAxis === undefined || activeAxis.axis === false
                    ? {}
                    : { position: activeAxis.axis.position }),
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

    /* This file is generated by scripts/generate-natural-earth-world.mjs. */
    /* Natural Earth vector tag v5.1.2, Admin-0 Countries 1:110m, public domain. */
    const serializedCountries = [
        '[["FJI","FJ","FJI","242","Fiji",178,-17.8,["FJI","FJ","242","Fiji"],[[[[180,-16.1],[180,-16.6],[179.4,-16.8],[178.7,-17]',
        ',[178.6,-16.6],[179.1,-16.4],[179.4,-16.4]]],[[[178.1,-17.5],[178.4,-17.3],[178.7,-17.6],[178.6,-18.2],[177.9,-18.3],[17',
        '7.4,-18.2],[177.3,-17.7],[177.7,-17.4]]],[[[-179.8,-16],[-179.9,-16.5],[-180,-16.6],[-180,-16.1]]]]],["TZA","TZ","TZA","',
        '834","Tanzania",35,-6.1,["TZA","TZ","834","Tanzania","United Republic of Tanzania"],[[[[33.9,-0.9],[34.1,-1.1],[37.7,-3.',
        '1],[37.8,-3.7],[39.2,-4.7],[38.7,-5.9],[38.8,-6.5],[39.4,-6.8],[39.5,-7.1],[39.2,-7.7],[39.3,-8],[39.2,-8.5],[39.5,-9.1]',
        ',[39.9,-10.1],[40.3,-10.3],[39.5,-10.9],[38.4,-11.3],[37.8,-11.3],[37.5,-11.6],[36.8,-11.6],[36.5,-11.7],[35.3,-11.4],[3',
        '4.6,-11.5],[34.3,-10.2],[33.9,-9.7],[33.7,-9.4],[32.8,-9.2],[32.2,-8.9],[31.6,-8.8],[31.2,-8.6],[30.7,-8.3],[30.2,-7.1],',
        '[29.6,-6.5],[29.4,-5.9],[29.5,-5.4],[29.3,-4.5],[29.8,-4.5],[30.1,-4.1],[30.5,-3.6],[30.8,-3.4],[30.7,-3],[30.5,-2.8],[3',
        '0.5,-2.4],[30.8,-2.3],[30.8,-1.7],[30.4,-1.1],[30.8,-1],[31.9,-1]]]]],["SAH","EH","ESH","732","Western Sahara",-12.6,24,',
        '["SAH","EH","ESH","732","WS","W. Sahara","Western Sahara","B28"],[[[[-8.7,27.7],[-8.7,27.6],[-8.7,27.4],[-8.7,25.9],[-12',
        ',25.9],[-11.9,23.4],[-12.9,23.3],[-13.1,22.8],[-12.9,21.3],[-16.8,21.3],[-17.1,21],[-17,21.4],[-14.8,21.5],[-14.6,21.9],',
        '[-14.2,22.3],[-13.9,23.7],[-12.5,24.8],[-12,26],[-11.7,26.1],[-11.4,26.9],[-10.6,27],[-10.2,26.9],[-9.7,26.9],[-9.4,27.1',
        '],[-8.8,27.1],[-8.8,27.7]]]]],["CAN","CA","CAN","124","Canada",-101.9,60.3,["CAN","CA","124","Canada"],[[[[-122.8,49],[-',
        '123,49],[-124.9,50],[-125.6,50.4],[-127.4,50.8],[-128,51.7],[-127.9,52.3],[-129.1,52.8],[-129.3,53.6],[-130.5,54.3],[-13',
        '0.5,54.8],[-130,55.3],[-130,55.9],[-131.7,56.6],[-132.7,57.7],[-133.4,58.4],[-134.3,58.9],[-134.9,59.3],[-135.5,59.8],[-',
        '136.5,59.5],[-137.5,58.9],[-138.3,59.6],[-139,60],[-140,60.3],[-141,60.3],[-141,66],[-141,69.7],[-139.1,69.5],[-137.5,69',
        '],[-136.5,68.9],[-135.6,69.3],[-134.4,69.6],[-132.9,69.5],[-131.4,69.9],[-129.8,70.2],[-129.1,69.8],[-128.4,70],[-128.1,',
        '70.5],[-127.4,70.4],[-125.8,69.5],[-124.4,70.2],[-124.3,69.4],[-123.1,69.6],[-122.7,69.9],[-121.5,69.8],[-119.9,69.4],[-',
        '117.6,69],[-116.2,68.8],[-115.2,68.9],[-113.9,68.4],[-115.3,67.9],[-113.5,67.7],[-110.8,67.8],[-109.9,68],[-108.9,67.4],',
        '[-107.8,67.9],[-108.8,68.3],[-108.2,68.7],[-106.9,68.7],[-106.1,68.8],[-105.3,68.6],[-104.3,68],[-103.2,68.1],[-101.5,67',
        '.6],[-99.9,67.8],[-98.4,67.8],[-98.6,68.4],[-97.7,68.6],[-96.1,68.2],[-96.1,67.3],[-95.5,68.1],[-94.7,68.1],[-94.2,69.1]',
        ',[-95.3,69.7],[-96.5,70.1],[-96.4,71.2],[-95.2,71.9],[-93.9,71.8],[-92.9,71.3],[-91.5,70.2],[-92.4,69.7],[-90.5,69.5],[-',
        '90.6,68.5],[-89.2,69.3],[-88,68.6],[-88.3,67.9],[-87.4,67.2],[-86.3,67.9],[-85.6,68.8],[-85.5,69.9],[-84.1,69.8],[-82.6,',
        '69.7],[-81.3,69.2],[-81.2,68.7],[-82,68.1],[-81.3,67.6],[-81.4,67.1],[-83.3,66.4],[-84.7,66.3],[-85.8,66.6],[-86.1,66.1]',
        ',[-87,65.2],[-87.3,64.8],[-88.5,64.1],[-89.9,64],[-90.7,63.6],[-90.8,63],[-91.9,62.8],[-93.2,62],[-94.2,60.9],[-94.6,60.',
        '1],[-94.7,58.9],[-93.2,58.8],[-92.8,57.8],[-92.3,57.1],[-90.9,57.3],[-89,56.9],[-88,56.5],[-87.3,56],[-86.1,55.7],[-85,5',
        '5.3],[-83.4,55.2],[-82.3,55.1],[-82.4,54.3],[-82.1,53.3],[-81.4,52.2],[-79.9,51.2],[-79.1,51.5],[-78.6,52.6],[-79.1,54.1',
        '],[-79.8,54.7],[-78.2,55.1],[-77.1,55.8],[-76.5,56.5],[-76.6,57.2],[-77.3,58.1],[-78.5,58.8],[-77.3,59.9],[-77.8,60.8],[',
        '-78.1,62.3],[-77.4,62.6],[-75.7,62.3],[-74.7,62.2],[-73.8,62.4],[-72.9,62.1],[-71.7,61.5],[-71.4,61.1],[-69.6,61.1],[-69',
        '.6,60.2],[-69.3,59],[-68.4,58.8],[-67.6,58.2],[-66.2,58.8],[-65.2,59.9],[-64.6,60.3],[-63.8,59.4],[-62.5,58.2],[-61.4,57',
        '],[-61.8,56.3],[-60.5,55.8],[-59.6,55.2],[-58,54.9],[-57.3,54.6],[-56.9,53.8],[-56.2,53.6],[-55.8,53.3],[-55.7,52.1],[-5',
        '6.4,51.8],[-57.1,51.4],[-58.8,51.1],[-60,50.2],[-61.7,50.1],[-63.9,50.3],[-65.4,50.3],[-66.4,50.2],[-67.2,49.5],[-68.5,4',
        '9.1],[-70,47.7],[-71.1,46.8],[-70.3,47],[-68.6,48.3],[-66.6,49.1],[-65.1,49.2],[-64.2,48.7],[-65.1,48.1],[-64.8,47],[-64',
        '.5,46.2],[-63.2,45.7],[-61.5,45.9],[-60.5,47],[-60.4,46.3],[-59.8,45.9],[-61,45.3],[-63.3,44.7],[-64.2,44.3],[-65.4,43.5',
        '],[-66.1,43.6],[-66.2,44.5],[-64.4,45.3],[-66,45.3],[-67.1,45.1],[-67.8,45.7],[-67.8,47.1],[-68.2,47.4],[-68.9,47.2],[-6',
        '9.2,47.4],[-70,46.7],[-70.3,45.9],[-70.7,45.5],[-71.1,45.3],[-71.4,45.3],[-71.5,45],[-73.3,45],[-74.9,45],[-75.3,44.8],[',
        '-76.4,44.1],[-76.5,44],[-76.8,43.6],[-77.7,43.6],[-78.7,43.6],[-79.2,43.5],[-79,43.3],[-78.9,43],[-78.9,42.9],[-80.2,42.',
        '4],[-81.3,42.2],[-82.4,41.7],[-82.7,41.7],[-83,41.8],[-83.1,42],[-83.1,42.1],[-82.9,42.4],[-82.4,43],[-82.1,43.6],[-82.3',
        ',44.4],[-82.6,45.3],[-83.6,45.8],[-83.5,46],[-83.6,46.1],[-83.9,46.1],[-84.1,46.3],[-84.1,46.5],[-84.3,46.4],[-84.6,46.4',
        '],[-84.5,46.5],[-84.8,46.6],[-84.9,46.9],[-85.7,47.2],[-86.5,47.6],[-87.4,47.9],[-88.4,48.3],[-89.3,48],[-89.6,48],[-90.',
        '8,48.3],[-91.6,48.1],[-92.6,48.5],[-93.6,48.6],[-94.3,48.7],[-94.6,48.8],[-94.8,49.4],[-95.2,49.4],[-95.2,49],[-97.2,49]',
        ',[-100.6,49],[-104,49],[-107,49],[-110,49],[-113,49],[-116,49],[-117,49],[-120,49]]],[[[-84,62.5],[-83.3,62.9],[-81.9,62',
        '.9],[-81.9,62.7],[-83.1,62.2],[-83.8,62.2]]],[[[-79.8,72.8],[-80.9,73.3],[-80.8,73.7],[-80.4,73.8],[-78.1,73.7],[-76.3,7',
        '3.1],[-76.3,72.8],[-77.3,72.9],[-78.4,72.9],[-79.5,72.7]]],[[[-80.3,62.1],[-79.9,62.4],[-79.5,62.4],[-79.3,62.2],[-79.7,',
        '61.6],[-80.1,61.7],[-80.4,62]]],[[[-93.6,75],[-94.2,74.6],[-95.6,74.7],[-96.8,74.9],[-96.3,75.4],[-94.9,75.6],[-94,75.3]',
        ']],[[[-93.8,77.5],[-94.3,77.5],[-96.2,77.6],[-96.4,77.8],[-94.4,77.8],[-93.7,77.6]]],[[[-96.8,78.8],[-95.6,78.4],[-95.8,',
        '78.1],[-97.3,77.9],[-98.1,78.1],[-98.6,78.5],[-98.6,78.9],[-97.3,78.8]]],[[[-88.2,74.4],[-89.8,74.5],[-92.4,74.8],[-92.8',
        ',75.4],[-92.9,75.9],[-93.9,76.3],[-96,76.4],[-97.1,76.8],[-96.7,77.2],[-94.7,77.1],[-93.6,76.8],[-91.6,76.8],[-90.7,76.4',
        '],[-91,76.1],[-89.8,75.8],[-89.2,75.6],[-87.8,75.6],[-86.4,75.5],[-84.8,75.7],[-82.8,75.8],[-81.1,75.7],[-80.1,75.3],[-7',
        '9.8,74.9],[-80.5,74.7],[-81.9,74.4],[-83.2,74.6],[-86.1,74.4]]],[[[-111.3,78.2],[-109.9,78],[-110.2,77.7],[-112.1,77.4],',
        '[-113.5,77.7],[-112.7,78.1]]],[[[-111,78.8],[-109.7,78.6],[-110.9,78.4],[-112.5,78.4],[-112.5,78.6],[-111.5,78.8]]],[[[-',
        '55.6,51.3],[-56.1,50.7],[-56.8,49.8],[-56.1,50.2],[-55.5,49.9],[-55.8,49.6],[-54.9,49.3],[-54.5,49.6],[-53.5,49.2],[-53.',
        '8,48.5],[-53.1,48.7],[-53,48.2],[-52.6,47.5],[-53.1,46.7],[-53.5,46.6],[-54.2,46.8],[-54,47.6],[-54.2,47.8],[-55.4,46.9]',
        ',[-56,46.9],[-55.3,47.4],[-56.3,47.6],[-57.3,47.6],[-59.3,47.6],[-59.4,47.9],[-58.8,48.3],[-59.2,48.5],[-58.4,49.1],[-57',
        '.4,50.7],[-56.7,51.3],[-55.9,51.6],[-55.4,51.6]]],[[[-83.9,65.1],[-82.8,64.8],[-81.6,64.5],[-81.6,64],[-80.8,64.1],[-80.',
        '1,63.7],[-81,63.4],[-82.5,63.7],[-83.1,64.1],[-84.1,63.6],[-85.5,63.1],[-85.9,63.6],[-87.2,63.5],[-86.4,64],[-86.2,64.8]',
        ',[-85.9,65.7],[-85.2,65.7],[-85,65.2],[-84.5,65.4]]],[[[-78.8,72.4],[-77.8,72.7],[-75.6,72.2],[-74.2,71.8],[-74.1,71.3],',
        '[-72.2,71.6],[-71.2,70.9],[-68.8,70.5],[-67.9,70.1],[-67,69.2],[-68.8,68.7],[-66.4,68.1],[-64.9,67.8],[-63.4,66.9],[-61.',
        '9,66.9],[-62.2,66.2],[-63.9,65],[-65.1,65.4],[-66.7,66.4],[-68,66.3],[-68.1,65.7],[-67.1,65.1],[-65.7,64.6],[-65.3,64.4]',
        ',[-64.7,63.4],[-65,62.7],[-66.3,62.9],[-68.8,63.7],[-67.4,62.9],[-66.3,62.3],[-66.2,61.9],[-68.9,62.3],[-71,62.9],[-72.2',
        ',63.4],[-71.9,63.7],[-73.4,64.2],[-74.8,64.7],[-74.8,64.4],[-77.7,64.2],[-78.6,64.6],[-77.9,65.3],[-76,65.3],[-74,65.5],',
        '[-74.3,65.8],[-73.9,66.3],[-72.7,67.3],[-72.9,67.7],[-73.3,68.1],[-74.8,68.6],[-76.9,68.9],[-76.2,69.1],[-77.3,69.8],[-7',
        '8.2,69.8],[-79,70.2],[-79.5,69.9],[-81.3,69.7],[-84.9,70],[-87.1,70.3],[-88.7,70.4],[-89.5,70.8],[-88.5,71.2],[-89.9,71.',
        '2],[-90.2,72.2],[-89.4,73.1],[-88.4,73.5],[-85.8,73.8],[-86.6,73.2],[-85.8,72.5],[-84.9,73.3],[-82.3,73.8],[-80.6,72.7],',
        '[-80.7,72.1]]],[[[-94.5,74.1],[-92.4,74.1],[-90.5,73.9],[-92,73],[-93.2,72.8],[-94.3,72],[-95.4,72.1],[-96,72.9],[-96,73',
        '.4],[-95.5,73.9]]],[[[-122.9,76.1],[-121.2,76.9],[-119.1,77.5],[-117.6,77.5],[-116.2,77.6],[-116.3,76.9],[-117.1,76.5],[',
        '-118,76.5],[-119.9,76.1],[-121.5,75.9]]],[[[-132.7,54],[-131.7,54.1],[-132,53],[-131.2,52.2],[-131.6,52.2],[-132.2,52.6]',
        ',[-132.5,53.1],[-133.1,53.4],[-133.2,53.9],[-133.2,54.2]]],[[[-105.5,79.3],[-103.5,79.2],[-100.8,78.8],[-100.1,78.3],[-9',
        '9.7,77.9],[-101.3,78],[-102.9,78.3],[-105.2,78.4],[-104.2,78.7],[-105.4,78.9]]],[[[-123.5,48.5],[-124,48.4],[-125.7,48.8',
        '],[-126,49.2],[-126.9,49.5],[-127,49.8],[-128.1,50],[-128.4,50.5],[-128.4,50.8],[-127.3,50.6],[-126.7,50.4],[-125.8,50.3',
        '],[-125.4,50],[-124.9,49.5],[-123.9,49.1]]],[[[-121.5,74.4],[-120.1,74.2],[-117.6,74.2],[-116.6,73.9],[-115.5,73.5],[-11',
        '6.8,73.2],[-119.2,72.5],[-120.5,71.8],[-120.5,71.4],[-123.1,70.9],[-123.6,71.3],[-125.9,71.9],[-125.5,72.3],[-124.8,73],',
        '[-123.9,73.7],[-124.9,74.3]]],[[[-107.8,75.8],[-106.9,76],[-105.9,76],[-105.7,75.5],[-106.3,75],[-109.7,74.9],[-112.2,74',
        '.4],[-113.7,74.4],[-113.9,74.7],[-111.8,75.2],[-116.3,75],[-117.7,75.2],[-116.3,76.2],[-115.4,76.5],[-112.6,76.1],[-110.',
        '8,75.5],[-109.1,75.5],[-110.5,76.4],[-109.6,76.8],[-108.5,76.7],[-108.2,76.2]]],[[[-106.5,73.1],[-105.4,72.7],[-104.8,71',
        '.7],[-104.5,71],[-102.8,70.5],[-101,70],[-101.1,69.6],[-102.7,69.5],[-102.1,69.1],[-102.4,68.8],[-104.2,68.9],[-106,69.2',
        '],[-107.1,69.1],[-109,68.8],[-111.5,68.6],[-113.3,68.5],[-113.9,69],[-115.2,69.3],[-116.1,69.2],[-117.3,70],[-116.7,70.1',
        '],[-115.1,70.2],[-113.7,70.2],[-112.4,70.4],[-114.3,70.6],[-116.5,70.5],[-117.9,70.5],[-118.4,70.9],[-116.1,71.3],[-117.',
        '7,71.3],[-119.4,71.6],[-118.6,72.3],[-117.9,72.7],[-115.2,73.3],[-114.2,73.1],[-114.7,72.7],[-112.4,73],[-111.1,72.5],[-',
        '109.9,73],[-109,72.6],[-108.2,71.7],[-107.7,72.1],[-108.4,73.1],[-107.5,73.2]]],[[[-100.4,72.7],[-101.5,73.4],[-100.4,73',
        '.8],[-99.2,73.6],[-97.4,73.8],[-97.1,73.5],[-98.1,73],[-96.5,72.6],[-96.7,71.7],[-98.4,71.3],[-99.3,71.4],[-100,71.7],[-',
        '102.5,72.5],[-102.5,72.8]]],[[[-106.6,73.6],[-105.3,73.6],[-104.5,73.4],[-105.4,72.8],[-106.9,73.5]]],[[[-98.5,76.7],[-9',
        '7.7,76.3],[-97.7,75.7],[-98.2,75],[-99.8,74.9],[-100.9,75.1],[-100.9,75.6],[-102.5,75.6],[-102.6,76.3],[-101.5,76.3],[-1',
        '00,76.6],[-98.6,76.6]]],[[[-96,80.6],[-95.3,80.9],[-94.3,81],[-94.7,81.2],[-92.4,81.3],[-91.1,80.7],[-89.4,80.5],[-87.8,',
        '80.3],[-87,79.7],[-85.8,79.3],[-87.2,79],[-89,78.3],[-90.8,78.2],[-92.9,78.3],[-94,78.8],[-93.9,79.1],[-93.1,79.4],[-95,',
        '79.4],[-96.1,79.7],[-96.7,80.2]]],[[[-91.6,81.9],[-90.1,82.1],[-88.9,82.1],[-87,82.3],[-85.5,82.7],[-84.3,82.6],[-83.2,8',
        '2.3],[-82.4,82.9],[-81.1,83],[-79.3,83.1],[-76.2,83.2],[-75.7,83.1],[-72.8,83.2],[-70.7,83.2],[-68.5,83.1],[-65.8,83],[-',
        '63.7,82.9],[-61.8,82.6],[-61.9,82.4],[-64.3,81.9],[-66.8,81.7],[-67.7,81.5],[-65.5,81.5],[-67.8,80.9],[-69.5,80.6],[-71.',
        '2,79.8],[-73.2,79.6],[-73.9,79.4],[-76.9,79.3],[-75.5,79.2],[-76.2,79],[-75.4,78.5],[-76.3,78.2],[-77.9,77.9],[-78.4,77.',
        '5],[-79.8,77.2],[-79.6,77],[-77.9,77],[-77.9,76.8],[-80.6,76.2],[-83.2,76.5],[-86.1,76.3],[-87.6,76.4],[-89.5,76.5],[-89',
        '.6,77],[-87.8,77.2],[-88.3,77.9],[-87.6,78],[-85,77.5],[-86.3,78.2],[-88,78.4],[-87.2,78.8],[-85.4,79],[-85.1,79.3],[-86',
        '.5,79.7],[-86.9,80.3],[-84.2,80.2],[-83.4,80.1],[-81.8,80.5],[-84.1,80.6],[-87.6,80.5],[-89.4,80.9],[-90.2,81.3],[-91.4,',
        '81.6]]],[[[-75.2,67.4],[-75.9,67.1],[-77,67.1],[-77.2,67.6],[-76.8,68.1],[-75.9,68.3],[-75.1,68],[-75.1,67.6]]],[[[-96.3',
        ',69.5],[-95.6,69.1],[-96.3,68.8],[-97.6,69.1],[-98.4,69],[-99.8,69.4],[-98.9,69.7],[-98.2,70.1],[-97.2,69.9],[-96.6,69.7',
        ']]],[[[-64.5,49.9],[-64.2,50],[-62.9,49.7],[-61.8,49.3],[-61.8,49.1],[-62.3,49.1],[-63.6,49.4]]],[[[-64,47],[-63.7,46.6]',
        ',[-62.9,46.4],[-62,46.4],[-62.5,46],[-62.9,46],[-64.1,46.4],[-64.4,46.7]]]]],["USA","US","USA","840","United States of A',
        'merica",-97.5,39.5,["USA","US","840","US1","United States of America","United States"],[[[[-122.8,49],[-120,49],[-117,49',
        '],[-116,49],[-113,49],[-110,49],[-107,49],[-104,49],[-100.6,49],[-97.2,49],[-95.2,49],[-95.2,49.4],[-94.8,49.4],[-94.6,4',
        '8.8],[-94.3,48.7],[-93.6,48.6],[-92.6,48.5],[-91.6,48.1],[-90.8,48.3],[-89.6,48],[-89.3,48],[-88.4,48.3],[-87.4,47.9],[-',
        '86.5,47.6],[-85.7,47.2],[-84.9,46.9],[-84.8,46.6],[-84.5,46.5],[-84.6,46.4],[-84.3,46.4],[-84.1,46.5],[-84.1,46.3],[-83.',
        '9,46.1],[-83.6,46.1],[-83.5,46],[-83.6,45.8],[-82.6,45.3],[-82.3,44.4],[-82.1,43.6],[-82.4,43],[-82.9,42.4],[-83.1,42.1]',
        ',[-83.1,42],[-83,41.8],[-82.7,41.7],[-82.4,41.7],[-81.3,42.2],[-80.2,42.4],[-78.9,42.9],[-78.9,43],[-79,43.3],[-79.2,43.',
        '5],[-78.7,43.6],[-77.7,43.6],[-76.8,43.6],[-76.5,44],[-76.4,44.1],[-75.3,44.8],[-74.9,45],[-73.3,45],[-71.5,45],[-71.4,4',
        '5.3],[-71.1,45.3],[-70.7,45.5],[-70.3,45.9],[-70,46.7],[-69.2,47.4],[-68.9,47.2],[-68.2,47.4],[-67.8,47.1],[-67.8,45.7],',
        '[-67.1,45.1],[-67,44.8],[-68,44.3],[-69.1,44],[-70.1,43.7],[-70.6,43.1],[-70.8,42.9],[-70.8,42.3],[-70.5,41.8],[-70.1,41',
        '.8],[-70.2,42.1],[-69.9,41.9],[-70,41.6],[-70.6,41.5],[-71.1,41.5],[-71.9,41.3],[-72.3,41.3],[-72.9,41.2],[-73.7,40.9],[',
        '-72.2,41.1],[-71.9,40.9],[-73.3,40.6],[-74,40.6],[-74,40.8],[-74.3,40.5],[-74,40.4],[-74.2,39.7],[-74.9,38.9],[-75,39.2]',
        ',[-75.2,39.2],[-75.5,39.5],[-75.3,39],[-75.1,38.8],[-75.1,38.4],[-75.4,38],[-75.9,37.2],[-76,37.3],[-75.7,37.9],[-76.2,3',
        '8.3],[-76.3,39.2],[-76.5,38.7],[-76.3,38.1],[-77,38.2],[-76.3,37.9],[-76.3,37],[-76,36.9],[-75.9,36.6],[-75.7,35.6],[-76',
        '.4,34.8],[-77.4,34.5],[-78.1,33.9],[-78.6,33.9],[-79.1,33.5],[-79.2,33.2],[-80.3,32.5],[-80.9,32],[-81.3,31.4],[-81.5,30',
        '.7],[-81.3,30],[-81,29.2],[-80.5,28.5],[-80.5,28],[-80.1,26.9],[-80.1,26.2],[-80.1,25.8],[-80.4,25.2],[-80.7,25.1],[-81.',
        '2,25.2],[-81.3,25.6],[-81.7,25.9],[-82.2,26.7],[-82.7,27.5],[-82.9,27.9],[-82.6,28.6],[-82.9,29.1],[-83.7,29.9],[-84.1,3',
        '0.1],[-85.1,29.6],[-85.3,29.7],[-85.8,30.2],[-86.4,30.4],[-87.5,30.3],[-88.4,30.4],[-89.2,30.3],[-89.6,30.2],[-89.4,29.9',
        '],[-89.4,29.5],[-89.2,29.3],[-89.4,29.2],[-89.8,29.3],[-90.2,29.1],[-90.9,29.1],[-91.6,29.7],[-92.5,29.6],[-93.2,29.8],[',
        '-93.8,29.7],[-94.7,29.5],[-95.6,28.7],[-96.6,28.3],[-97.1,27.8],[-97.4,27.4],[-97.4,26.7],[-97.3,26.2],[-97.1,25.9],[-97',
        '.5,25.8],[-98.2,26.1],[-99,26.4],[-99.3,26.8],[-99.5,27.5],[-100.1,28.1],[-100.5,28.7],[-101,29.4],[-101.7,29.8],[-102.5',
        ',29.8],[-103.1,29],[-103.9,29.3],[-104.5,29.6],[-104.7,30.1],[-105,30.6],[-105.6,31.1],[-106.1,31.4],[-106.5,31.8],[-108',
        '.2,31.8],[-108.2,31.3],[-109,31.3],[-111,31.3],[-113.3,32],[-114.8,32.5],[-114.7,32.7],[-116,32.6],[-117.1,32.5],[-117.3',
        ',33],[-117.9,33.6],[-118.4,33.7],[-118.5,34],[-119.1,34.1],[-119.4,34.3],[-120.4,34.4],[-120.6,34.6],[-120.7,35.2],[-121',
        '.7,36.2],[-122.5,37.6],[-122.5,37.8],[-123,38.1],[-123.7,39],[-123.9,39.8],[-124.4,40.3],[-124.2,41.1],[-124.2,42],[-124',
        '.5,42.8],[-124.1,43.7],[-124,44.6],[-123.9,45.5],[-124.1,46.9],[-124.4,47.7],[-124.7,48.2],[-124.6,48.4],[-123.1,48],[-1',
        '22.6,47.1],[-122.3,47.4],[-122.5,48.2]]],[[[-155.4,20.1],[-155.2,20],[-155.1,19.9],[-154.8,19.5],[-155.2,19.2],[-155.5,1',
        '9.1],[-155.7,18.9],[-155.9,19.1],[-155.9,19.3],[-156.1,19.7],[-156,19.8],[-155.9,20],[-155.9,20.2],[-155.9,20.3],[-155.8',
        ',20.2]]],[[[-156,20.8],[-156.1,20.6],[-156.4,20.6],[-156.6,20.8],[-156.7,20.9],[-156.6,21],[-156.3,20.9]]],[[[-156.8,21.',
        '2],[-156.8,21.1],[-157.3,21.1],[-157.3,21.2]]],[[[-158,21.7],[-157.9,21.7],[-157.7,21.3],[-157.8,21.3],[-158.1,21.3],[-1',
        '58.3,21.5],[-158.3,21.6]]],[[[-159.4,22.2],[-159.3,22],[-159.5,21.9],[-159.8,22.1],[-159.7,22.1],[-159.6,22.2]]],[[[-166',
        '.5,60.4],[-165.7,60.3],[-165.6,59.9],[-166.2,59.8],[-166.8,59.9],[-167.5,60.2]]],[[[-153.2,58],[-152.6,57.9],[-152.1,57.',
        '6],[-153,57.1],[-154,56.7],[-154.5,57],[-154.7,57.5],[-153.8,57.8]]],[[[-141,69.7],[-141,66],[-141,60.3],[-140,60.3],[-1',
        '39,60],[-138.3,59.6],[-137.5,58.9],[-136.5,59.5],[-135.5,59.8],[-134.9,59.3],[-134.3,58.9],[-133.4,58.4],[-132.7,57.7],[',
        '-131.7,56.6],[-130,55.9],[-130,55.3],[-130.5,54.8],[-131.1,55.2],[-132,55.5],[-132.3,56.4],[-133.5,57.2],[-134.1,58.1],[',
        '-135,58.2],[-136.6,58.2],[-137.8,58.5],[-139.9,59.5],[-140.8,59.7],[-142.6,60.1],[-144,60],[-145.9,60.5],[-147.1,60.9],[',
        '-148.2,60.7],[-148,60],[-148.6,59.9],[-149.7,59.7],[-150.6,59.4],[-151.7,59.2],[-151.9,59.7],[-151.4,60.7],[-150.3,61],[',
        '-150.6,61.3],[-151.9,60.7],[-152.6,60.1],[-154,59.4],[-153.3,58.9],[-154.2,58.1],[-155.3,57.7],[-156.3,57.4],[-156.6,57]',
        ',[-158.1,56.5],[-158.4,56],[-159.6,55.6],[-160.3,55.6],[-161.2,55.4],[-162.2,55],[-163.1,54.7],[-164.8,54.4],[-164.9,54.',
        '6],[-163.8,55],[-162.9,55.3],[-161.8,55.9],[-160.6,56],[-160.1,56.4],[-158.7,57],[-158.5,57.2],[-157.7,57.6],[-157.6,58.',
        '3],[-157,58.9],[-158.2,58.6],[-158.5,58.8],[-159.1,58.4],[-159.7,58.9],[-160,58.6],[-160.4,59.1],[-161.4,58.7],[-162,58.',
        '7],[-162.1,59.3],[-161.9,59.6],[-162.5,60],[-163.8,59.8],[-164.7,60.3],[-165.3,60.5],[-165.4,61.1],[-166.1,61.5],[-165.7',
        ',62.1],[-164.9,62.6],[-164.6,63.1],[-163.8,63.2],[-163.1,63.1],[-162.3,63.5],[-161.5,63.5],[-160.8,63.8],[-161,64.2],[-1',
        '61.5,64.4],[-160.8,64.8],[-161.4,64.8],[-162.5,64.6],[-162.8,64.3],[-163.5,64.6],[-165,64.4],[-166.4,64.7],[-166.8,65.1]',
        ',[-168.1,65.7],[-166.7,66.1],[-164.5,66.6],[-163.7,66.6],[-163.8,66.1],[-161.7,66.1],[-162.5,66.7],[-163.7,67.1],[-164.4',
        ',67.6],[-165.4,68],[-166.8,68.4],[-166.2,68.9],[-164.4,68.9],[-163.2,69.4],[-162.9,69.9],[-161.9,70.3],[-160.9,70.4],[-1',
        '59,70.9],[-158.1,70.8],[-156.6,71.4],[-155.1,71.1],[-154.3,70.7],[-153.9,70.9],[-152.2,70.8],[-152.3,70.6],[-150.7,70.4]',
        ',[-149.7,70.5],[-147.6,70.2],[-145.7,70.1],[-144.9,70],[-143.6,70.2],[-142.1,69.9]]],[[[-171.7,63.8],[-171.1,63.6],[-170',
        '.5,63.7],[-169.7,63.4],[-168.7,63.3],[-168.8,63.2],[-169.5,63],[-170.3,63.2],[-170.7,63.4],[-171.6,63.3],[-171.8,63.4]]]',
        ']],["KAZ","KZ","KAZ","398","Kazakhstan",68.7,49.1,["KAZ","KZ","398","KA1","Kazakhstan"],[[[[87.4,49.2],[86.6,48.5],[85.8',
        ',48.5],[85.7,47.5],[85.2,47],[83.2,47.3],[82.5,45.5],[81.9,45.3],[80,44.9],[80.9,43.2],[80.2,42.9],[80.3,42.3],[79.6,42.',
        '5],[79.1,42.9],[77.7,43],[76,43],[75.6,42.9],[74.2,43.3],[73.6,43.1],[73.5,42.5],[71.8,42.8],[71.2,42.7],[71,42.3],[70.4',
        ',42.1],[69.1,41.4],[68.6,40.7],[68.3,40.7],[68,41.1],[66.7,41.2],[66.5,42],[66,42],[66.1,43],[64.9,43.7],[63.2,43.7],[62',
        ',43.5],[61.1,44.4],[60.2,44.8],[58.7,45.5],[58.5,45.6],[55.9,45],[56,41.3],[55.5,41.3],[54.8,42],[54.1,42.3],[52.9,42.1]',
        ',[52.5,41.8],[52.4,42],[52.7,42.4],[52.5,42.8],[51.3,43.1],[50.9,44],[50.3,44.3],[50.3,44.6],[51.3,44.5],[51.3,45.2],[52',
        '.2,45.4],[53,45.3],[53.2,46.2],[53,46.9],[52,46.8],[51.2,47],[50,46.6],[49.1,46.4],[48.6,46.6],[48.7,47.1],[48.1,47.7],[',
        '47.3,47.7],[46.5,48.4],[47,49.2],[46.8,49.4],[47.5,50.5],[48.6,49.9],[48.7,50.6],[50.8,51.7],[52.3,51.7],[54.5,51],[55.7',
        ',50.6],[56.8,51],[58.4,51.1],[59.6,50.5],[59.9,50.8],[61.3,50.8],[61.6,51.3],[60,52],[60.9,52.4],[60.7,52.7],[61.7,53],[',
        '61,53.7],[61.4,54],[65.2,54.4],[65.7,54.6],[68.2,55],[69.1,55.4],[70.9,55.2],[71.2,54.1],[72.2,54.4],[73.5,54],[73.4,53.',
        '5],[74.4,53.5],[76.9,54.5],[76.5,54.2],[77.8,53.4],[80,50.9],[80.6,51.4],[81.9,50.8],[83.4,51.1],[83.9,50.9],[84.4,50.3]',
        ',[85.1,50.1],[85.5,49.7],[86.8,49.8]]]]],["UZB","UZ","UZB","860","Uzbekistan",64,41.7,["UZB","UZ","860","Uzbekistan"],[[',
        '[[56,41.3],[55.9,45],[58.5,45.6],[58.7,45.5],[60.2,44.8],[61.1,44.4],[62,43.5],[63.2,43.7],[64.9,43.7],[66.1,43],[66,42]',
        ',[66.5,42],[66.7,41.2],[68,41.1],[68.3,40.7],[68.6,40.7],[69.1,41.4],[70.4,42.1],[71,42.3],[71.3,42.2],[70.4,41.5],[71.2',
        ',41.1],[71.9,41.4],[73.1,40.9],[71.8,40.1],[71,40.2],[70.6,40.2],[70.5,40.5],[70.7,41],[69.3,40.7],[69,40.1],[68.5,39.5]',
        ',[67.7,39.6],[67.4,39.1],[68.2,38.9],[68.4,38.2],[67.8,37.1],[67.1,37.4],[66.5,37.4],[66.5,38],[65.2,38.4],[64.2,38.9],[',
        '63.5,39.4],[62.4,40.1],[61.9,41.1],[61.5,41.3],[60.5,41.2],[60.1,41.4],[60,42.2],[58.6,42.8],[57.8,42.2],[56.9,41.8],[57',
        '.1,41.3]]]]],["PNG","PG","PNG","598","Papua New Guinea",143.9,-5.7,["PNG","PG","598","Papua New Guinea","PN1"],[[[[141,-',
        '2.6],[142.7,-3.3],[144.6,-3.9],[145.3,-4.4],[145.8,-4.9],[146,-5.5],[147.6,-6.1],[147.9,-6.6],[147,-6.7],[147.2,-7.4],[1',
        '48.1,-8],[148.7,-9.1],[149.3,-9.1],[149.3,-9.5],[150,-9.7],[149.7,-9.9],[150.8,-10.3],[150.7,-10.6],[150,-10.7],[149.8,-',
        '10.4],[148.9,-10.3],[147.9,-10.1],[147.1,-9.5],[146.6,-8.9],[146,-8.1],[144.7,-7.6],[143.9,-7.9],[143.3,-8.2],[143.4,-9]',
        ',[142.6,-9.3],[142.1,-9.2],[141,-9.1],[141,-5.9]]],[[[152.6,-3.7],[153,-4],[153.1,-4.5],[152.8,-4.8],[152.6,-4.2],[152.4',
        ',-3.8],[152,-3.5],[151.4,-3],[150.7,-2.7],[150.9,-2.5],[151.5,-2.8],[151.8,-3],[152.2,-3.2]]],[[[151.3,-5.8],[150.8,-6.1',
        '],[150.2,-6.3],[149.7,-6.3],[148.9,-6],[148.3,-5.7],[148.4,-5.4],[149.3,-5.6],[149.8,-5.5],[150,-5],[150.1,-5],[150.2,-5',
        '.5],[150.8,-5.5],[151.1,-5.1],[151.6,-4.8],[151.5,-4.2],[152.1,-4.1],[152.3,-4.3],[152.3,-4.9],[152,-5.5],[151.5,-5.6]]]',
        ',[[[154.8,-5.3],[155.1,-5.6],[155.5,-6.2],[156,-6.5],[155.9,-6.8],[155.6,-6.9],[155.2,-6.5],[154.7,-5.9],[154.5,-5.1],[1',
        '54.7,-5]]]]],["IDN","ID","IDN","360","Indonesia",101.9,-1,["IDN","ID","360","INDO","Indonesia"],[[[[141,-2.6],[141,-5.9]',
        ',[141,-9.1],[140.1,-8.3],[139.1,-8.1],[138.9,-8.4],[137.6,-8.4],[138,-7.6],[138.7,-7.3],[138.4,-6.2],[137.9,-5.4],[136,-',
        '4.5],[135.2,-4.5],[133.7,-3.5],[133.4,-4],[133,-4.1],[132.8,-3.7],[132.8,-3.3],[132,-2.8],[133.1,-2.5],[133.8,-2.5],[133',
        '.7,-2.2],[132.2,-2.2],[131.8,-1.6],[130.9,-1.4],[130.5,-0.9],[131.9,-0.7],[132.4,-0.4],[134,-0.8],[134.1,-1.2],[134.4,-2',
        '.8],[135.5,-3.4],[136.3,-2.3],[137.4,-1.7],[138.3,-1.7],[139.2,-2.1],[139.9,-2.4]]],[[[125,-8.9],[125.1,-9.1],[125.1,-9.',
        '4],[124.4,-10.1],[123.6,-10.4],[123.5,-10.2],[123.6,-9.9],[124,-9.3]]],[[[134.2,-6.9],[134.1,-6.1],[134.3,-5.8],[134.5,-',
        '5.4],[134.7,-5.7],[134.7,-6.2]]],[[[117.9,4.1],[117.3,3.2],[118,2.3],[117.9,1.8],[119,0.9],[117.8,0.8],[117.5,0.1],[117.',
        '5,-0.8],[116.6,-1.5],[116.5,-2.5],[116.1,-4],[116,-3.7],[114.9,-4.1],[114.5,-3.5],[113.8,-3.4],[113.3,-3.1],[112.1,-3.5]',
        ',[111.7,-3],[111,-3],[110.2,-2.9],[110.1,-1.6],[109.6,-1.3],[109.1,-0.5],[109,0.4],[109.1,1.3],[109.7,2],[109.8,1.3],[11',
        '0.5,0.8],[111.2,1],[111.8,0.9],[112.4,1.4],[112.9,1.5],[113.8,1.2],[114.6,1.4],[115.1,2.8],[115.5,3.2],[115.9,4.3],[117,',
        '4.3]]],[[[129.4,-2.8],[130.5,-3.1],[130.8,-3.9],[130,-3.4],[129.2,-3.4],[128.6,-3.4],[127.9,-3.4],[128.1,-2.8]]],[[[126.',
        '9,-3.8],[126.2,-3.6],[126,-3.2],[127,-3.1],[127.2,-3.5]]],[[[127.9,2.2],[128,1.6],[128.6,1.5],[128.7,1.1],[128.6,0.3],[1',
        '28.1,0.4],[128,-0.3],[128.4,-0.8],[128.1,-0.9],[127.7,-0.3],[127.4,1],[127.6,1.8]]],[[[122.9,0.9],[124.1,0.9],[125.1,1.6',
        '],[125.2,1.4],[124.4,0.4],[123.7,0.2],[122.7,0.4],[121.1,0.4],[120.2,0.2],[120,-0.5],[120.9,-1.4],[121.5,-1],[123.3,-0.6',
        '],[123.3,-1.1],[122.8,-0.9],[122.4,-1.5],[121.5,-1.9],[122.5,-3.2],[122.3,-3.5],[123.2,-4.7],[123.2,-5.3],[122.6,-5.6],[',
        '122.2,-5.3],[122.7,-4.5],[121.7,-4.9],[121.5,-4.6],[121.6,-4.2],[120.9,-3.6],[121,-2.6],[120.3,-2.9],[120.4,-4.1],[120.4',
        ',-5.5],[119.8,-5.7],[119.4,-5.4],[119.7,-4.5],[119.5,-3.5],[119.1,-3.5],[118.8,-2.8],[119.2,-2.1],[119.3,-1.4],[119.8,0.',
        '2],[120,0.6],[120.9,1.3],[121.7,1]]],[[[120.3,-10.3],[119,-9.6],[119.9,-9.4],[120.4,-9.7],[120.8,-10],[120.7,-10.2]]],[[',
        '[121.3,-8.5],[122,-8.5],[122.9,-8.1],[122.8,-8.6],[121.3,-8.9],[119.9,-8.8],[119.9,-8.4],[120.7,-8.2]]],[[[118.3,-8.4],[',
        '118.9,-8.3],[119.1,-8.7],[118,-8.9],[117.3,-9],[116.7,-9],[117.1,-8.5],[117.6,-8.4],[117.9,-8.1]]],[[[108.5,-6.4],[108.6',
        ',-6.8],[110.5,-6.9],[110.8,-6.5],[112.6,-6.9],[113,-7.6],[114.5,-7.8],[115.7,-8.4],[114.6,-8.8],[113.5,-8.3],[112.6,-8.4',
        '],[111.5,-8.3],[110.6,-8.1],[109.4,-7.7],[108.7,-7.6],[108.3,-7.8],[106.5,-7.4],[106.3,-6.9],[105.4,-6.9],[106.1,-5.9],[',
        '107.3,-6],[108.1,-6.3]]],[[[104.4,-1.1],[104.5,-1.8],[104.9,-2.3],[105.6,-2.4],[106.1,-3.1],[105.9,-4.3],[105.8,-5.9],[1',
        '04.7,-5.9],[103.9,-5],[102.6,-4.2],[102.2,-3.6],[101.4,-2.8],[100.9,-2.1],[100.1,-0.7],[99.3,0.2],[99,1],[98.6,1.8],[97.',
        '7,2.5],[97.2,3.3],[96.4,3.9],[95.4,5],[95.3,5.5],[95.9,5.4],[97.5,5.2],[98.4,4.3],[99.1,3.6],[99.7,3.2],[100.6,2.1],[101',
        '.7,2.1],[102.5,1.4],[103.1,0.6],[103.8,0.1],[103.4,-0.7],[104,-1.1]]]]],["ARG","AR","ARG","032","Argentina",-64.2,-33.5,',
        '["ARG","AR","032","Argentina"],[[[[-68.6,-52.6],[-68.2,-53.1],[-67.7,-53.8],[-66.4,-54.4],[-65,-54.7],[-65.5,-55.2],[-66',
        '.4,-55.2],[-67,-54.9],[-67.6,-54.9],[-68.6,-54.9]]],[[[-57.6,-30.2],[-57.9,-31],[-58.1,-32],[-58.1,-33],[-58.3,-33.3],[-',
        '58.4,-33.9],[-58.5,-34.4],[-57.2,-35.3],[-57.4,-36],[-56.7,-36.4],[-56.8,-36.9],[-57.7,-38.2],[-59.2,-38.7],[-61.2,-38.9',
        '],[-62.3,-38.8],[-62.1,-39.4],[-62.3,-40.2],[-62.1,-40.7],[-62.7,-41],[-63.8,-41.2],[-64.7,-40.8],[-65.1,-41.1],[-65,-42',
        '.1],[-64.3,-42.4],[-63.8,-42],[-63.5,-42.6],[-64.4,-42.9],[-65.2,-43.5],[-65.3,-44.5],[-65.6,-45],[-66.5,-45],[-67.3,-45',
        '.6],[-67.6,-46.3],[-66.6,-47],[-65.6,-47.2],[-66,-48.1],[-67.2,-48.7],[-67.8,-49.9],[-68.7,-50.3],[-69.1,-50.7],[-68.8,-',
        '51.8],[-68.1,-52.3],[-68.6,-52.3],[-69.5,-52.1],[-71.9,-52],[-72.3,-51.4],[-72.3,-50.7],[-73,-50.7],[-73.3,-50.4],[-73.4',
        ',-49.3],[-72.6,-48.9],[-72.3,-48.2],[-72.4,-47.7],[-71.9,-46.9],[-71.6,-45.6],[-71.7,-45],[-71.2,-44.8],[-71.3,-44.4],[-',
        '71.8,-44.2],[-71.5,-43.8],[-71.9,-43.4],[-72.1,-42.3],[-71.7,-42.1],[-71.9,-40.8],[-71.7,-39.8],[-71.4,-38.9],[-70.8,-38',
        '.6],[-71.1,-37.6],[-71.1,-36.7],[-70.4,-36],[-70.4,-35.2],[-69.8,-34.2],[-69.8,-33.3],[-70.1,-33.1],[-70.5,-31.4],[-69.9',
        ',-30.3],[-70,-29.4],[-69.7,-28.5],[-69,-27.5],[-68.3,-26.9],[-68.6,-26.5],[-68.4,-26.2],[-68.4,-24.5],[-67.3,-24],[-67,-',
        '23],[-67.1,-22.7],[-66.3,-21.8],[-65,-22.1],[-64.4,-22.8],[-64,-22],[-62.8,-22],[-62.7,-22.2],[-60.8,-23.9],[-60,-24],[-',
        '58.8,-24.8],[-57.8,-25.2],[-57.6,-25.6],[-58.6,-27.1],[-57.6,-27.4],[-56.5,-27.5],[-55.7,-27.4],[-54.8,-26.6],[-54.6,-25',
        '.7],[-54.1,-25.5],[-53.6,-26.1],[-53.6,-26.9],[-54.5,-27.5],[-55.2,-27.9],[-56.3,-28.9]]]]],["CHL","CL","CHL","152","Chi',
        'le",-72.3,-38.2,["CHL","CL","152","Chile"],[[[[-68.6,-52.6],[-68.6,-54.9],[-67.6,-54.9],[-67,-54.9],[-67.3,-55.3],[-68.1',
        ',-55.6],[-68.6,-55.6],[-69.2,-55.5],[-70,-55.2],[-71,-55.1],[-72.3,-54.5],[-73.3,-54],[-74.7,-52.8],[-73.8,-53],[-72.4,-',
        '53.7],[-71.1,-54.1],[-70.6,-53.6],[-70.3,-52.9],[-69.3,-52.5]]],[[[-69.6,-17.6],[-69.1,-18.3],[-69,-19],[-68.4,-19.4],[-',
        '68.8,-20.4],[-68.2,-21.5],[-67.8,-22.9],[-67.1,-22.7],[-67,-23],[-67.3,-24],[-68.4,-24.5],[-68.4,-26.2],[-68.6,-26.5],[-',
        '68.3,-26.9],[-69,-27.5],[-69.7,-28.5],[-70,-29.4],[-69.9,-30.3],[-70.5,-31.4],[-70.1,-33.1],[-69.8,-33.3],[-69.8,-34.2],',
        '[-70.4,-35.2],[-70.4,-36],[-71.1,-36.7],[-71.1,-37.6],[-70.8,-38.6],[-71.4,-38.9],[-71.7,-39.8],[-71.9,-40.8],[-71.7,-42',
        '.1],[-72.1,-42.3],[-71.9,-43.4],[-71.5,-43.8],[-71.8,-44.2],[-71.3,-44.4],[-71.2,-44.8],[-71.7,-45],[-71.6,-45.6],[-71.9',
        ',-46.9],[-72.4,-47.7],[-72.3,-48.2],[-72.6,-48.9],[-73.4,-49.3],[-73.3,-50.4],[-73,-50.7],[-72.3,-50.7],[-72.3,-51.4],[-',
        '71.9,-52],[-69.5,-52.1],[-68.6,-52.3],[-69.5,-52.3],[-69.9,-52.5],[-70.8,-52.9],[-71,-53.8],[-71.4,-53.9],[-72.6,-53.5],',
        '[-73.7,-52.8],[-74.9,-52.3],[-75.3,-51.6],[-75,-51],[-75.5,-50.4],[-75.6,-48.7],[-75.2,-47.7],[-74.1,-46.9],[-75.6,-46.6',
        '],[-74.7,-45.8],[-74.4,-44.1],[-73.2,-44.5],[-72.7,-42.4],[-73.4,-42.1],[-73.7,-43.4],[-74.3,-43.2],[-74,-41.8],[-73.7,-',
        '39.9],[-73.2,-39.3],[-73.5,-38.3],[-73.6,-37.2],[-73.2,-37.1],[-72.6,-35.5],[-71.9,-33.9],[-71.4,-32.4],[-71.7,-30.9],[-',
        '71.4,-30.1],[-71.5,-28.9],[-70.9,-27.6],[-70.7,-25.7],[-70.4,-23.6],[-70.1,-21.4],[-70.2,-19.8],[-70.4,-18.3],[-69.9,-18',
        '.1]]]]],["COD","CD","COD","180","Democratic Republic of the Congo",23.5,-1.9,["COD","CD","180","DRC","ZR","ZAR","Dem. Re',
        'p. Congo","Democratic Republic of the Congo"],[[[[29.3,-4.5],[29.5,-5.4],[29.4,-5.9],[29.6,-6.5],[30.2,-7.1],[30.7,-8.3]',
        ',[30.3,-8.2],[29,-8.4],[28.7,-8.5],[28.4,-9.2],[28.7,-9.6],[28.5,-10.8],[28.4,-11.8],[28.6,-12],[29.3,-12.4],[29.6,-12.2',
        '],[29.7,-13.3],[28.9,-13.2],[28.5,-12.7],[28.2,-12.3],[27.4,-12.1],[27.2,-11.6],[26.6,-11.9],[25.8,-11.8],[25.4,-11.3],[',
        '24.8,-11.2],[24.3,-11.3],[24.3,-11],[23.9,-10.9],[23.5,-10.9],[22.8,-11],[22.4,-11],[22.2,-11.1],[22.2,-9.9],[21.9,-9.5]',
        ',[21.8,-8.9],[21.9,-8.3],[21.7,-7.9],[21.7,-7.3],[20.5,-7.3],[20.6,-6.9],[20.1,-6.9],[20,-7.1],[19.4,-7.2],[19.2,-7.7],[',
        '19,-8],[18.5,-7.8],[18.1,-8],[17.5,-8.1],[17.1,-7.5],[16.9,-7.2],[16.6,-6.6],[16.3,-5.9],[13.4,-5.9],[13,-6],[12.7,-6],[',
        '12.3,-6.1],[12.2,-5.8],[12.4,-5.7],[12.5,-5.2],[12.6,-5],[13,-4.8],[13.3,-4.9],[13.6,-4.5],[14.1,-4.5],[14.2,-4.8],[14.6',
        ',-5],[15.2,-4.3],[15.8,-3.9],[16,-3.5],[16,-2.7],[16.4,-1.7],[16.9,-1.2],[17.5,-0.7],[17.6,-0.4],[17.7,-0.1],[17.8,0.3],',
        '[17.8,0.9],[17.9,1.7],[18.1,2.4],[18.4,2.9],[18.5,3.5],[18.5,4.2],[18.9,4.7],[19.5,5],[20.3,4.7],[20.9,4.3],[21.7,4.2],[',
        '22.4,4],[22.7,4.6],[22.8,4.7],[23.3,4.6],[24.4,5.1],[24.8,4.9],[25.1,4.9],[25.3,5.2],[25.7,5.3],[26.4,5.2],[27,5.1],[27.',
        '4,5.2],[28,4.4],[28.4,4.3],[28.7,4.5],[29.2,4.4],[29.7,4.6],[30,4.2],[30.8,3.5],[30.8,2.3],[31.2,2.2],[30.9,1.8],[30.5,1',
        '.6],[30.1,1.1],[29.9,0.6],[29.8,-0.2],[29.6,-0.6],[29.6,-1.3],[29.3,-1.6],[29.3,-2.2],[29.1,-2.3],[29,-2.8],[29.3,-3.3]]',
        ']]],["SOM","SO","SOM","706","Somalia",45.2,3.6,["SOM","SO","706","Somalia"],[[[[41.6,-1.7],[41,-0.9],[41,2.8],[41.9,3.9]',
        ',[42.1,4.2],[42.8,4.3],[43.7,5],[45,5],[47.8,8],[48.5,8.8],[48.9,9.5],[48.9,10],[48.9,11],[48.9,11.4],[49.3,11.4],[49.7,',
        '11.6],[50.3,11.7],[50.7,12],[51.1,12],[51.1,11.7],[51,11.2],[51,10.6],[50.8,10.3],[50.6,9.2],[50.1,8.1],[49.5,6.8],[48.6',
        ',5.3],[47.7,4.2],[46.6,2.9],[45.6,2],[44.1,1.1],[43.1,0.3],[42,-0.9],[41.8,-1.4]]]]],["KEN","KE","KEN","404","Kenya",37.',
        '9,0.5,["KEN","KE","404","Kenya"],[[[[39.2,-4.7],[37.8,-3.7],[37.7,-3.1],[34.1,-1.1],[33.9,-0.9],[33.9,0.1],[34.2,0.5],[3',
        '4.7,1.2],[35,1.9],[34.6,3.1],[34.5,3.6],[34,4.2],[34.6,4.8],[35.3,5.5],[35.8,5.3],[35.8,4.8],[36.2,4.4],[36.9,4.4],[38.1',
        ',3.6],[38.4,3.6],[38.7,3.6],[38.9,3.5],[39.6,3.4],[39.9,3.8],[40.8,4.3],[41.2,3.9],[41.9,3.9],[41,2.8],[41,-0.9],[41.6,-',
        '1.7],[40.9,-2.1],[40.6,-2.5],[40.3,-2.6],[40.1,-3.3],[39.8,-3.7],[39.6,-4.3]]]]],["SDN","SD","SDN","729","Sudan",29.3,16',
        '.3,["SDN","SD","729","Sudan"],[[[[24.6,8.2],[23.8,8.7],[23.5,9],[23.4,9.3],[23.6,9.7],[23.6,10.1],[23,10.7],[22.9,11.1],',
        '[22.9,11.4],[22.5,11.7],[22.5,12.3],[22.3,12.6],[21.9,12.6],[22,13],[22.3,13.4],[22.2,13.8],[22.5,14.1],[22.3,14.3],[22.',
        '6,14.9],[23,15.7],[23.9,15.6],[23.8,19.6],[23.9,20],[25,20],[25,22],[29,22],[32.9,22],[36.9,22],[37.2,21],[37,20.8],[37.',
        '1,19.8],[37.5,18.6],[37.9,18.4],[38.4,18],[37.9,17.4],[37.2,17.3],[36.9,17],[36.8,16.3],[36.3,14.8],[36.4,14.4],[36.3,13',
        '.6],[35.9,12.6],[35.3,12.1],[34.8,11.3],[34.7,10.9],[34.3,10.6],[34,9.6],[34,8.7],[34,9.5],[33.8,9.5],[33.8,10],[33.7,10',
        '.3],[33.2,10.7],[33.1,11.4],[33.2,12.2],[32.7,12.2],[32.7,12],[32.1,12],[32.3,11.7],[32.4,11.1],[31.9,10.5],[31.4,9.8],[',
        '30.8,9.7],[30,10.3],[29.6,10.1],[29.5,9.8],[29,9.6],[29,9.4],[28,9.4],[27.8,9.6],[27.1,9.6],[26.8,9.5],[26.5,9.6],[26,10',
        '.1],[25.8,10.4],[25.1,10.3],[24.8,9.8],[24.5,8.9],[24.2,8.7],[23.9,8.6]]]]],["TCD","TD","TCD","148","Chad",18.6,15.1,["T',
        'CD","TD","148","Chad"],[[[[23.8,19.6],[23.9,15.6],[23,15.7],[22.6,14.9],[22.3,14.3],[22.5,14.1],[22.2,13.8],[22.3,13.4],',
        '[22,13],[21.9,12.6],[22.3,12.6],[22.5,12.3],[22.5,11.7],[22.9,11.4],[22.9,11.1],[22.2,11],[21.7,10.6],[21,9.5],[20.1,9],',
        '[19.1,9.1],[18.8,9],[18.9,8.6],[18.4,8.3],[18,7.9],[16.7,7.5],[16.5,7.7],[16.3,7.8],[16.1,7.5],[15.3,7.4],[15.4,7.7],[15',
        '.1,8.4],[15,8.8],[14.5,9],[14,9.5],[14.2,10],[14.6,9.9],[14.9,10],[15.5,10],[14.9,10.9],[15,11.6],[14.9,12.2],[14.5,12.9',
        '],[14.6,13.3],[14,13.4],[14,14],[13.5,14.4],[14,15.7],[15.2,16.6],[15.3,17.9],[15.7,20],[15.9,20.4],[15.5,20.7],[15.5,21',
        '],[15.1,21.3],[14.9,22.9],[15.9,23.4],[19.8,21.5]]]]],["HTI","HT","HTI","332","Haiti",-72.2,19.3,["HTI","HT","332","Hait',
        'i"],[[[[-71.7,19.7],[-71.6,19.2],[-71.7,18.8],[-71.9,18.6],[-71.7,18.3],[-71.7,18],[-72.4,18.2],[-72.8,18.1],[-73.5,18.2',
        '],[-73.9,18],[-74.5,18.3],[-74.4,18.7],[-73.4,18.5],[-72.7,18.4],[-72.3,18.7],[-72.8,19.1],[-72.8,19.5],[-73.4,19.6],[-7',
        '3.2,19.9],[-72.6,19.9]]]]],["DOM","DO","DOM","214","Dominican Republic",-70.7,19.1,["DOM","DO","214","Dominican Rep.","D',
        'ominican Republic"],[[[[-71.7,18],[-71.7,18.3],[-71.9,18.6],[-71.7,18.8],[-71.6,19.2],[-71.7,19.7],[-71.6,19.9],[-70.8,1',
        '9.9],[-70.2,19.6],[-70,19.6],[-69.8,19.3],[-69.2,19.3],[-69.3,19],[-68.8,19],[-68.3,18.6],[-68.7,18.2],[-69.2,18.4],[-69',
        '.6,18.4],[-70,18.4],[-70.1,18.2],[-70.5,18.2],[-70.7,18.4],[-71,18.3],[-71.4,17.6],[-71.7,17.8]]]]],["RUS","RU","RUS","6',
        '43","Russia",44.7,58.2,["RUS","RU","643","Russia","Russian Federation"],[[[[178.7,71.1],[180,71.5],[180,70.8],[178.9,70.',
        '8]]],[[[49.1,46.4],[48.6,45.8],[47.7,45.6],[46.7,44.6],[47.6,43.7],[47.5,43],[48.6,41.8],[48,41.4],[47.8,41.2],[47.4,41.',
        '2],[46.7,41.8],[46.4,41.9],[45.8,42.1],[45.5,42.5],[44.5,42.7],[43.9,42.6],[43.8,42.7],[42.4,43.2],[40.9,43.4],[40.1,43.',
        '6],[40,43.4],[38.7,44.3],[37.5,44.7],[36.7,45.2],[37.4,45.4],[38.2,46.2],[37.7,46.6],[39.1,47],[39.1,47.3],[38.2,47.1],[',
        '38.3,47.5],[38.8,47.8],[39.7,47.9],[39.9,48.2],[39.7,48.8],[40.1,49.3],[40.1,49.6],[38.6,49.9],[38,49.9],[37.4,50.4],[36',
        '.6,50.2],[35.4,50.6],[35.4,50.8],[35,51.2],[34.2,51.3],[34.1,51.6],[34.4,51.8],[33.8,52.3],[32.7,52.2],[32.4,52.3],[32.2',
        ',52.1],[31.8,52.1],[31.5,52.7],[31.3,53.1],[31.5,53.2],[32.3,53.1],[32.7,53.4],[32.4,53.6],[31.7,53.8],[31.8,54],[31.4,5',
        '4.2],[30.8,54.8],[31,55.1],[30.9,55.6],[29.9,55.8],[29.4,55.7],[29.2,55.9],[28.2,56.2],[27.9,56.8],[27.8,57.2],[27.3,57.',
        '5],[27.7,57.8],[27.4,58.7],[28.1,59.3],[28,59.5],[29.1,60],[28.1,60.5],[30.2,61.8],[31.1,62.4],[31.5,62.9],[30,63.6],[30',
        '.4,64.2],[29.5,64.9],[30.2,65.8],[29.1,66.9],[30,67.7],[28.4,68.4],[28.6,69.1],[29.4,69.2],[31.1,69.6],[32.1,69.9],[33.8',
        ',69.3],[36.5,69.1],[40.3,67.9],[41.1,67.5],[41.1,66.8],[40,66.3],[38.4,66],[33.9,66.8],[33.2,66.6],[34.8,65.9],[34.9,65.',
        '4],[34.9,64.4],[36.2,64.1],[37,63.8],[37.1,64.3],[36.5,64.8],[37.2,65.1],[39.6,64.5],[40.4,64.8],[39.8,65.5],[42.1,66.5]',
        ',[43,66.4],[43.9,66.1],[44.5,66.8],[43.7,67.4],[44.2,68],[43.5,68.6],[46.3,68.3],[46.8,67.7],[45.6,67.6],[45.6,67],[46.3',
        ',66.7],[47.9,66.9],[48.1,67.5],[50.2,68],[53.7,68.9],[54.5,68.8],[53.5,68.2],[54.7,68.1],[55.4,68.4],[57.3,68.5],[58.8,6',
        '8.9],[59.9,68.3],[61.1,68.9],[60,69.5],[60.6,69.9],[63.5,69.5],[64.9,69.2],[68.5,68.1],[69.2,68.6],[68.2,69.1],[68.1,69.',
        '4],[66.9,69.5],[67.3,69.9],[66.7,70.7],[66.7,71],[68.5,71.9],[69.2,72.8],[69.9,73],[72.6,72.8],[72.8,72.2],[71.8,71.4],[',
        '72.5,71.1],[72.8,70.4],[72.6,69],[73.7,68.4],[73.2,67.7],[71.3,66.3],[72.4,66.2],[72.8,66.5],[73.9,66.8],[74.2,67.3],[75',
        '.1,67.8],[74.5,68.3],[74.9,69],[73.8,69.1],[73.6,69.6],[74.4,70.6],[73.1,71.4],[74.9,72.1],[74.7,72.8],[75.2,72.9],[75.7',
        ',72.3],[75.3,71.3],[76.4,71.2],[75.9,71.9],[77.6,72.3],[79.7,72.3],[81.5,71.8],[80.6,72.6],[80.5,73.6],[82.3,73.9],[84.7',
        ',73.8],[86.8,73.9],[86,74.5],[87.2,75.1],[88.3,75.1],[90.3,75.6],[92.9,75.8],[93.2,76],[95.9,76.1],[96.7,75.9],[98.9,76.',
        '4],[100.8,76.4],[101,76.9],[102,77.3],[104.4,77.7],[106.1,77.4],[104.7,77.1],[107,77],[107.2,76.5],[108.2,76.7],[111.1,7',
        '6.7],[113.3,76.2],[114.1,75.8],[113.9,75.3],[112.8,75],[110.2,74.5],[109.4,74.2],[110.6,74],[112.1,73.8],[113,74],[113.5',
        ',73.3],[114,73.6],[115.6,73.8],[118.8,73.6],[119,73.1],[123.2,73],[123.3,73.7],[125.4,73.6],[127,73.6],[128.6,73],[129.1',
        ',72.4],[128.5,72],[129.7,71.2],[131.3,70.8],[132.3,71.8],[133.9,71.4],[135.6,71.7],[137.5,71.3],[138.2,71.6],[139.9,71.5',
        '],[139.1,72.4],[140.5,72.8],[149.5,72.2],[150.4,71.6],[153,70.8],[157,71],[159,70.9],[159.8,70.5],[159.7,69.7],[160.9,69',
        '.4],[162.3,69.6],[164.1,69.7],[165.9,69.5],[167.8,69.6],[169.6,68.7],[170.8,69],[170,69.7],[170.5,70.1],[173.6,69.8],[17',
        '5.7,69.9],[178.6,69.4],[180,69],[180,65],[178.7,64.5],[177.4,64.6],[178.3,64.1],[178.9,63.3],[179.4,63],[179.5,62.6],[17',
        '9.2,62.3],[177.4,62.5],[174.6,61.8],[173.7,61.7],[172.2,61],[170.7,60.3],[170.3,59.9],[168.9,60.6],[166.3,59.8],[165.8,6',
        '0.2],[164.9,59.7],[163.5,59.9],[163.2,59.2],[162,58.2],[162.1,57.8],[163.2,57.6],[163.1,56.2],[162.1,56.1],[161.7,55.3],',
        '[162.1,54.9],[160.4,54.3],[160,53.2],[158.5,53],[158.2,51.9],[156.8,51],[156.4,51.7],[156,53.2],[155.4,55.4],[155.9,56.8',
        '],[156.8,57.4],[156.8,57.8],[158.4,58.1],[160.2,59.3],[161.9,60.3],[163.7,61.1],[164.5,62.6],[163.3,62.5],[162.7,61.6],[',
        '160.1,60.5],[159.3,61.8],[156.7,61.4],[154.2,59.8],[155,59.1],[152.8,58.9],[151.3,58.8],[151.3,59.5],[149.8,59.7],[148.5',
        ',59.2],[145.5,59.3],[142.2,59],[139,57.1],[135.1,54.7],[136.7,54.6],[137.2,54],[138.2,53.8],[138.8,54.3],[139.9,54.2],[1',
        '41.3,53.1],[141.4,52.2],[140.6,51.2],[140.5,50],[140.1,48.4],[138.6,47],[138.2,46.3],[136.9,45.1],[135.5,44],[134.9,43.4',
        '],[133.5,42.8],[132.9,42.8],[132.3,43.3],[130.9,42.6],[130.8,42.2],[130.6,42.4],[130.6,42.9],[131.1,42.9],[131.3,44.1],[',
        '131,45],[131.9,45.3],[133.1,45.1],[133.8,46.1],[134.1,47.2],[134.5,47.6],[135,48.5],[133.4,48.2],[132.5,47.8],[131,47.8]',
        ',[130.6,48.7],[129.4,49.4],[127.7,49.8],[127.3,50.7],[126.9,51.4],[126.6,51.8],[125.9,52.8],[125.1,53.2],[123.6,53.5],[1',
        '22.2,53.4],[121,53.3],[120.2,52.8],[120.7,52.5],[120.7,52],[120.2,51.6],[119.3,50.6],[119.3,50.1],[117.9,49.5],[116.7,49',
        '.9],[115.5,49.8],[115,50.1],[114.4,50.2],[112.9,49.5],[111.6,49.4],[110.7,49.1],[109.4,49.3],[108.5,49.3],[107.9,49.8],[',
        '106.9,50.3],[105.9,50.4],[104.6,50.3],[103.7,50.1],[102.3,50.5],[102.1,51.3],[100.9,51.5],[100,51.6],[98.9,52],[97.8,51]',
        ',[98.2,50.4],[97.3,49.7],[95.8,50],[94.8,50],[94.1,50.5],[93.1,50.5],[92.2,50.8],[90.7,50.3],[88.8,49.5],[87.8,49.3],[87',
        '.4,49.2],[86.8,49.8],[85.5,49.7],[85.1,50.1],[84.4,50.3],[83.9,50.9],[83.4,51.1],[81.9,50.8],[80.6,51.4],[80,50.9],[77.8',
        ',53.4],[76.5,54.2],[76.9,54.5],[74.4,53.5],[73.4,53.5],[73.5,54],[72.2,54.4],[71.2,54.1],[70.9,55.2],[69.1,55.4],[68.2,5',
        '5],[65.7,54.6],[65.2,54.4],[61.4,54],[61,53.7],[61.7,53],[60.7,52.7],[60.9,52.4],[60,52],[61.6,51.3],[61.3,50.8],[59.9,5',
        '0.8],[59.6,50.5],[58.4,51.1],[56.8,51],[55.7,50.6],[54.5,51],[52.3,51.7],[50.8,51.7],[48.7,50.6],[48.6,49.9],[47.5,50.5]',
        ',[46.8,49.4],[47,49.2],[46.5,48.4],[47.3,47.7],[48.1,47.7],[48.7,47.1],[48.6,46.6]]],[[[93.8,81],[95.9,81.3],[97.9,80.7]',
        ',[100.2,79.8],[99.9,78.9],[97.8,78.8],[95,79],[93.3,79.4],[92.5,80.1],[91.2,80.3]]],[[[102.8,79.3],[105.4,78.7],[105.1,7',
        '8.3],[99.4,77.9],[101.3,79.2],[102.1,79.3]]],[[[138.8,76.1],[141.5,76.1],[145.1,75.6],[144.3,74.8],[140.6,74.8],[139,74.',
        '6],[137,75.3],[137.5,75.9]]],[[[148.2,75.3],[150.7,75.1],[149.6,74.7],[148,74.8],[146.1,75.2],[146.4,75.5]]],[[[139.9,73',
        '.4],[140.8,73.8],[142.1,73.9],[143.5,73.5],[143.6,73.2],[142.1,73.2],[140,73.3]]],[[[44.8,80.6],[46.8,80.8],[48.3,80.8],',
        '[48.5,80.5],[49.1,80.8],[50,80.9],[51.5,80.7],[51.1,80.5],[49.8,80.4],[48.9,80.3],[48.8,80.2],[47.6,80],[46.5,80.2],[47.',
        '1,80.6]]],[[[22.7,54.3],[20.9,54.3],[19.7,54.4],[19.9,54.9],[21.3,55.2],[22.3,55],[22.8,54.9],[22.7,54.6]]],[[[53.5,73.7',
        '],[55.9,74.6],[55.6,75.1],[57.9,75.6],[61.2,76.3],[64.5,76.4],[66.2,76.8],[68.2,76.9],[68.9,76.5],[68.2,76.2],[64.6,75.7',
        '],[61.6,75.3],[58.5,74.3],[57,73.3],[55.4,72.4],[55.6,71.5],[57.5,70.7],[56.9,70.6],[53.7,70.8],[53.4,71.2],[51.6,71.5],',
        '[51.5,72],[52.5,72.2],[52.4,72.8],[54.4,73.6]]],[[[142.9,53.7],[143.3,52.7],[143.2,51.8],[143.6,50.7],[144.7,49],[143.2,',
        '49.3],[142.6,47.9],[143.5,46.8],[143.5,46.1],[142.7,46.7],[142.1,46],[141.9,46.8],[142,47.8],[141.9,48.9],[142.1,49.6],[',
        '142.2,51],[141.6,51.9],[141.7,53.3],[142.6,53.8],[142.2,54.2],[142.7,54.4]]],[[[-174.9,67.2],[-175,66.6],[-174.3,66.3],[',
        '-174.6,67.1],[-171.9,66.9],[-169.9,66],[-170.9,65.5],[-172.5,65.4],[-172.6,64.5],[-173,64.3],[-173.9,64.3],[-174.7,64.6]',
        ',[-176,64.9],[-176.2,65.4],[-177.2,65.5],[-178.4,65.4],[-178.9,65.7],[-178.7,66.1],[-179.9,65.9],[-179.4,65.4],[-180,65]',
        ',[-180,69],[-177.5,68.2]]],[[[-178.7,70.9],[-180,70.8],[-180,71.5],[-179.9,71.6],[-179,71.6],[-177.6,71.3],[-177.7,71.1]',
        ']],[[[33.4,46],[33.7,46.2],[34.4,46],[34.7,46],[34.9,45.8],[35,45.7],[35.5,45.4],[36.5,45.5],[36.3,45.1],[35.2,44.9],[33',
        '.9,44.4],[33.3,44.6],[33.5,45],[32.5,45.3],[32.6,45.5],[33.6,45.9]]]]],["BHS","BS","BHS","044","The Bahamas",-77.1,26.4,',
        '["BHS","BS","044","Bahamas","The Bahamas"],[[[[-79,26.8],[-78.5,26.9],[-77.8,26.8],[-77.8,26.6],[-78.9,26.4]]],[[[-77.8,',
        '27],[-77,26.6],[-77.2,25.9],[-77.4,26],[-77.3,26.5],[-77.8,26.9]]],[[[-78.2,25.2],[-77.9,25.2],[-77.5,24.3],[-77.5,23.8]',
        ',[-77.8,23.7],[-78,24.3],[-78.4,24.6]]]]],["FLK","FK","FLK","238","Falkland Islands",-58.7,-51.6,["FLK","FK","238","GB1"',
        ',"Falkland Is.","Falkland Islands","Falkland Islands / Malvinas","United Kingdom","B12"],[[[[-61.2,-51.8],[-60,-51.2],[-',
        '59.1,-51.5],[-58.5,-51.1],[-57.7,-51.5],[-58,-51.9],[-59.4,-52.2],[-59.8,-51.8],[-60.7,-52.3]]]]],["NOR","","","","Norwa',
        'y",9.7,61.4,["NOR","N","Norway"],[[[[15.1,79.7],[15.5,80],[17,80.1],[18.3,79.7],[21.5,79],[19,78.6],[18.5,77.8],[17.6,77',
        '.6],[17.1,76.8],[15.9,76.8],[13.8,77.4],[14.7,77.7],[13.2,78],[11.2,78.9],[10.4,79.7],[13.2,80],[13.7,79.7]]],[[[31.1,69',
        '.6],[29.4,69.2],[28.6,69.1],[29,69.8],[27.7,70.2],[26.2,69.8],[25.7,69.1],[24.7,68.6],[23.7,68.9],[22.4,68.8],[21.2,69.4',
        '],[20.6,69.1],[20,69.1],[19.9,68.4],[18,68.6],[17.7,68],[16.8,68],[16.1,67.3],[15.1,66.2],[13.6,64.8],[13.9,64.4],[13.6,',
        '64],[12.6,64.1],[11.9,63.1],[12,61.8],[12.6,61.3],[12.3,60.1],[11.5,59.4],[11,58.9],[10.4,59.5],[8.4,58.3],[7,58.1],[5.7',
        ',58.6],[5.3,59.7],[5,62],[5.9,62.6],[8.6,63.5],[10.5,64.5],[12.4,65.9],[14.8,67.8],[16.4,68.6],[19.2,69.8],[21.4,70.3],[',
        '23,70.2],[24.5,71],[26.4,71],[28.2,71.2],[31.3,70.5],[30,70.2]]],[[[27.4,80.1],[25.9,79.5],[23,79.4],[20.1,79.6],[19.9,7',
        '9.8],[18.5,79.9],[17.4,80.3],[20.5,80.6],[21.9,80.4],[22.9,80.7],[25.4,80.4]]],[[[24.7,77.9],[22.5,77.4],[20.7,77.7],[21',
        '.4,77.9],[20.8,78.3],[22.9,78.5],[23.3,78.1]]]]],["GRL","GL","GRL","304","Greenland",-39.3,74.3,["GRL","GL","304","DN1",',
        '"Greenland","Denmark"],[[[[-46.8,82.6],[-43.4,83.2],[-39.9,83.2],[-38.6,83.5],[-35.1,83.6],[-27.1,83.5],[-20.8,82.7],[-2',
        '2.7,82.3],[-26.5,82.3],[-31.9,82.2],[-31.4,82],[-27.9,82.1],[-24.8,81.8],[-22.9,82.1],[-22.1,81.7],[-23.2,81.2],[-20.6,8',
        '1.5],[-15.8,81.9],[-12.8,81.7],[-12.2,81.3],[-16.3,80.6],[-16.8,80.4],[-20,80.2],[-17.7,80.1],[-18.9,79.4],[-19.7,78.8],',
        '[-19.7,77.6],[-18.5,77],[-20,76.9],[-21.7,76.6],[-19.8,76.1],[-19.6,75.2],[-20.7,75.2],[-19.4,74.3],[-21.6,74.2],[-20.4,',
        '73.8],[-20.8,73.5],[-22.2,73.3],[-23.6,73.3],[-22.3,72.6],[-22.3,72.2],[-24.3,72.6],[-24.8,72.3],[-23.4,72.1],[-22.1,71.',
        '5],[-21.8,70.7],[-23.5,70.5],[-24.3,70.9],[-25.5,71.4],[-25.2,70.8],[-26.4,70.2],[-23.7,70.2],[-22.3,70.1],[-25,69.3],[-',
        '27.7,68.5],[-30.7,68.1],[-31.8,68.1],[-32.8,67.7],[-34.2,66.7],[-36.4,66],[-37,65.9],[-38.4,65.7],[-39.8,65.5],[-40.7,64',
        '.8],[-40.7,64.1],[-41.2,63.5],[-42.8,62.7],[-42.4,61.9],[-42.9,61.1],[-43.4,60.1],[-44.8,60],[-46.3,60.9],[-48.3,60.9],[',
        '-49.2,61.4],[-49.9,62.4],[-51.6,63.6],[-52.1,64.3],[-52.3,65.2],[-53.7,66.1],[-53.3,66.8],[-54,67.2],[-53,68.4],[-51.5,6',
        '8.7],[-51.1,69.1],[-50.9,69.9],[-52,69.6],[-52.6,69.4],[-53.5,69.3],[-54.7,69.6],[-54.8,70.3],[-54.4,70.8],[-53.4,70.8],',
        '[-51.4,70.6],[-53.1,71.2],[-54,71.5],[-55,71.4],[-55.8,71.7],[-54.7,72.6],[-55.3,73],[-56.1,73.6],[-57.3,74.7],[-58.6,75',
        '.1],[-58.6,75.5],[-61.3,76.1],[-63.4,76.2],[-66.1,76.1],[-68.5,76.1],[-69.7,76.4],[-71.4,77],[-68.8,77.3],[-66.8,77.4],[',
        '-71,77.6],[-73.3,78],[-73.2,78.4],[-69.4,78.9],[-65.7,79.4],[-65.3,79.8],[-68,80.1],[-67.2,80.5],[-63.7,81.2],[-62.2,81.',
        '3],[-62.7,81.8],[-60.3,82],[-57.2,82.2],[-54.1,82.2],[-53,81.9],[-50.4,82.4],[-48,82.1],[-46.6,82],[-44.5,81.7],[-46.9,8',
        '2.2]]]]],["ATF","TF","ATF","260","French Southern and Antarctic Lands",69.1,-49.3,["ATF","TF","260","FR1","Fr. S. Antarc',
        'tic Lands","French Southern and Antarctic Lands","France","Fr. S. and Antarctic Lands"],[[[[68.9,-48.6],[69.6,-48.9],[70',
        '.5,-49.1],[70.6,-49.3],[70.3,-49.7],[68.7,-49.8],[68.7,-49.2],[68.9,-48.8]]]]],["TLS","TL","TLS","626","East Timor",125.',
        '9,-8.8,["TLS","TL","626","TP","TMP","Timor-Leste","East Timor"],[[[[125,-8.9],[125.1,-8.7],[125.9,-8.4],[126.6,-8.4],[12',
        '7,-8.3],[127.3,-8.4],[127,-8.7],[125.9,-9.1],[125.1,-9.4],[125.1,-9.1]]]]],["ZAF","ZA","ZAF","710","South Africa",23.7,-',
        '29.7,["ZAF","ZA","710","South Africa"],[[[[16.3,-28.6],[16.8,-28.1],[17.2,-28.4],[17.4,-28.8],[17.8,-28.9],[18.5,-29],[1',
        '9,-29],[19.9,-28.5],[19.9,-24.8],[20.2,-24.9],[20.8,-25.9],[20.7,-26.5],[20.9,-26.8],[21.6,-26.7],[22.1,-26.3],[22.6,-26',
        '],[22.8,-25.5],[23.3,-25.3],[23.7,-25.4],[24.2,-25.7],[25,-25.7],[25.7,-25.5],[25.8,-25.2],[25.9,-24.7],[26.5,-24.6],[26',
        '.8,-24.2],[27.1,-23.6],[28,-22.8],[29.4,-22.1],[29.8,-22.1],[30.3,-22.3],[30.7,-22.2],[31.2,-22.3],[31.7,-23.7],[31.9,-2',
        '4.4],[31.8,-25.5],[31.8,-25.8],[31.3,-25.7],[31,-25.7],[30.9,-26],[30.7,-26.4],[30.7,-26.7],[31.3,-27.3],[31.9,-27.2],[3',
        '2.1,-26.7],[32.8,-26.7],[32.6,-27.5],[32.5,-28.3],[32.2,-28.8],[31.5,-29.3],[31.3,-29.4],[30.9,-29.9],[30.6,-30.4],[30.1',
        ',-31.1],[28.9,-32.2],[28.2,-32.8],[27.5,-33.2],[26.4,-33.6],[25.9,-33.7],[25.8,-33.9],[25.2,-33.8],[24.7,-34],[23.6,-33.',
        '8],[23,-33.9],[22.6,-33.9],[21.5,-34.3],[20.7,-34.4],[20.1,-34.8],[19.6,-34.8],[19.2,-34.5],[18.9,-34.4],[18.4,-34],[18.',
        '4,-34.1],[18.2,-33.9],[18.3,-33.3],[17.9,-32.6],[18.2,-32.4],[18.2,-31.7],[17.6,-30.7],[17.1,-29.9]],[[29,-29],[28.5,-28',
        '.6],[28.1,-28.9],[27.5,-29.2],[27,-29.9],[27.7,-30.6],[28.1,-30.5],[28.3,-30.2],[28.8,-30.1],[29,-29.7],[29.3,-29.3]]]]]',
        ',["LSO","LS","LSO","426","Lesotho",28.2,-29.5,["LSO","LS","426","Lesotho"],[[[[29,-29],[29.3,-29.3],[29,-29.7],[28.8,-30',
        '.1],[28.3,-30.2],[28.1,-30.5],[27.7,-30.6],[27,-29.9],[27.5,-29.2],[28.1,-28.9],[28.5,-28.6]]]]],["MEX","MX","MEX","484"',
        ',"Mexico",-102.3,23.9,["MEX","MX","484","Mexico"],[[[[-117.1,32.5],[-116,32.6],[-114.7,32.7],[-114.8,32.5],[-113.3,32],[',
        '-111,31.3],[-109,31.3],[-108.2,31.3],[-108.2,31.8],[-106.5,31.8],[-106.1,31.4],[-105.6,31.1],[-105,30.6],[-104.7,30.1],[',
        '-104.5,29.6],[-103.9,29.3],[-103.1,29],[-102.5,29.8],[-101.7,29.8],[-101,29.4],[-100.5,28.7],[-100.1,28.1],[-99.5,27.5],',
        '[-99.3,26.8],[-99,26.4],[-98.2,26.1],[-97.5,25.8],[-97.1,25.9],[-97.5,25],[-97.7,24.3],[-97.8,22.9],[-97.9,22.4],[-97.7,',
        '21.9],[-97.4,21.4],[-97.2,20.6],[-96.5,19.9],[-96.3,19.3],[-95.9,18.8],[-94.8,18.6],[-94.4,18.1],[-93.5,18.4],[-92.8,18.',
        '5],[-92,18.7],[-91.4,18.9],[-90.8,19.3],[-90.5,19.9],[-90.5,20.7],[-90.3,21],[-89.6,21.3],[-88.5,21.5],[-87.7,21.5],[-87',
        '.1,21.5],[-86.8,21.3],[-86.8,20.8],[-87.4,20.3],[-87.6,19.6],[-87.4,19.5],[-87.6,19],[-87.8,18.3],[-88.1,18.5],[-88.3,18',
        '.5],[-88.5,18.5],[-88.8,17.9],[-89,18],[-89.2,18],[-89.1,17.8],[-90.1,17.8],[-91,17.8],[-91,17.3],[-91.5,17.3],[-91.1,16',
        '.9],[-90.7,16.7],[-90.6,16.5],[-90.4,16.4],[-90.5,16.1],[-91.7,16.1],[-92.2,15.3],[-92.1,15.1],[-92.2,14.8],[-92.2,14.5]',
        ',[-93.4,15.6],[-93.9,15.9],[-94.7,16.2],[-95.3,16.1],[-96.1,15.8],[-96.6,15.7],[-97.3,15.9],[-98,16.1],[-98.9,16.6],[-99',
        '.7,16.7],[-100.8,17.2],[-101.7,17.6],[-101.9,17.9],[-102.5,18],[-103.5,18.3],[-103.9,18.7],[-105,19.3],[-105.5,19.9],[-1',
        '05.7,20.4],[-105.4,20.5],[-105.5,20.8],[-105.3,21.1],[-105.3,21.4],[-105.6,21.9],[-105.7,22.3],[-106,22.8],[-106.9,23.8]',
        ',[-107.9,24.5],[-108.4,25.2],[-109.3,25.6],[-109.4,25.8],[-109.3,26.4],[-109.8,26.7],[-110.4,27.2],[-110.6,27.9],[-111.2',
        ',27.9],[-111.8,28.5],[-112.2,29],[-112.3,29.3],[-112.8,30],[-113.2,30.8],[-113.1,31.2],[-113.9,31.6],[-114.2,31.5],[-114',
        '.8,31.8],[-114.9,31.4],[-114.8,30.9],[-114.7,30.2],[-114.3,29.8],[-113.6,29.1],[-113.4,28.8],[-113.3,28.8],[-113.1,28.4]',
        ',[-113,28.4],[-112.8,27.8],[-112.5,27.5],[-112.2,27.2],[-111.6,26.7],[-111.3,25.7],[-111,25.3],[-110.7,24.8],[-110.7,24.',
        '3],[-110.2,24.3],[-109.8,23.8],[-109.4,23.4],[-109.4,23.2],[-109.9,22.8],[-110,22.8],[-110.3,23.4],[-110.9,24],[-111.7,2',
        '4.5],[-112.2,24.7],[-112.1,25.5],[-112.3,26],[-112.8,26.3],[-113.5,26.8],[-113.6,26.6],[-113.8,26.9],[-114.5,27.1],[-115',
        '.1,27.7],[-115,27.8],[-114.6,27.7],[-114.2,28.1],[-114.2,28.6],[-114.9,29.3],[-115.5,29.6],[-115.9,30.2],[-116.3,30.8],[',
        '-116.7,31.6]]]]],["URY","UY","URY","858","Uruguay",-56,-33,["URY","UY","858","Uruguay"],[[[[-57.6,-30.2],[-57,-30.1],[-5',
        '6,-30.9],[-55.6,-30.9],[-54.6,-31.5],[-53.8,-32],[-53.2,-32.7],[-53.7,-33.2],[-53.4,-33.8],[-53.8,-34.4],[-54.9,-35],[-5',
        '5.7,-34.8],[-56.2,-34.9],[-57.1,-34.4],[-57.8,-34.5],[-58.4,-33.9],[-58.3,-33.3],[-58.1,-33],[-58.1,-32],[-57.9,-31]]]]]',
        ',["BRA","BR","BRA","076","Brazil",-49.6,-12.1,["BRA","BR","076","Brazil"],[[[[-53.4,-33.8],[-53.7,-33.2],[-53.2,-32.7],[',
        '-53.8,-32],[-54.6,-31.5],[-55.6,-30.9],[-56,-30.9],[-57,-30.1],[-57.6,-30.2],[-56.3,-28.9],[-55.2,-27.9],[-54.5,-27.5],[',
        '-53.6,-26.9],[-53.6,-26.1],[-54.1,-25.5],[-54.6,-25.7],[-54.4,-25.2],[-54.3,-24.6],[-54.3,-24],[-54.7,-23.8],[-55,-24],[',
        '-55.4,-24],[-55.5,-23.6],[-55.6,-22.7],[-55.8,-22.4],[-56.5,-22.1],[-56.9,-22.3],[-57.9,-22.1],[-57.9,-20.7],[-58.2,-20.',
        '2],[-57.9,-20],[-57.9,-19.4],[-57.7,-19],[-57.5,-18.2],[-57.7,-17.6],[-58.3,-17.3],[-58.4,-16.9],[-58.2,-16.3],[-60.2,-1',
        '6.3],[-60.5,-15.1],[-60.3,-15.1],[-60.3,-14.6],[-60.5,-14.4],[-60.5,-13.8],[-61.1,-13.5],[-61.7,-13.5],[-62.1,-13.2],[-6',
        '2.8,-13],[-63.2,-12.6],[-64.3,-12.5],[-65.4,-11.6],[-65.3,-10.9],[-65.4,-10.5],[-65.3,-9.8],[-66.6,-9.9],[-67.2,-10.3],[',
        '-68,-10.7],[-68.3,-11],[-68.8,-11],[-69.5,-11],[-70.1,-11.1],[-70.5,-11],[-70.5,-9.5],[-71.3,-10.1],[-72.2,-10.1],[-72.6',
        ',-9.5],[-73.2,-9.5],[-73,-9],[-73.6,-8.4],[-74,-7.5],[-73.7,-7.3],[-73.7,-6.9],[-73.1,-6.6],[-73.2,-6.1],[-73,-5.7],[-72',
        '.9,-5.3],[-71.7,-4.6],[-70.9,-4.4],[-70.8,-4.3],[-69.9,-4.3],[-69.4,-1.6],[-69.4,-1.1],[-69.6,-0.5],[-70,-0.2],[-70,0.5]',
        ',[-69.5,0.7],[-69.3,0.6],[-69.2,1],[-69.8,1.1],[-69.8,1.7],[-67.9,1.7],[-67.5,2],[-67.3,1.7],[-67.1,1.1],[-66.9,1.3],[-6',
        '6.3,0.7],[-65.5,0.8],[-65.4,1.1],[-64.6,1.3],[-64.2,1.5],[-64.1,1.9],[-63.4,2.2],[-63.4,2.4],[-64.3,2.5],[-64.4,3.1],[-6',
        '4.4,3.8],[-64.8,4.1],[-64.6,4.1],[-63.9,4],[-63.1,3.8],[-62.8,4],[-62.1,4.2],[-61,4.5],[-60.6,4.9],[-60.7,5.2],[-60.2,5.',
        '2],[-60,5],[-60.1,4.6],[-59.8,4.4],[-59.5,4],[-59.8,3.6],[-60,2.8],[-59.7,2.2],[-59.6,1.8],[-59,1.3],[-58.5,1.3],[-58.4,',
        '1.5],[-58.1,1.5],[-57.7,1.7],[-57.3,1.9],[-56.8,1.9],[-56.5,1.9],[-56,1.8],[-55.9,2],[-56.1,2.2],[-56,2.5],[-55.6,2.4],[',
        '-55.1,2.5],[-54.5,2.3],[-54.1,2.1],[-53.8,2.4],[-53.6,2.3],[-53.4,2.1],[-52.9,2.1],[-52.6,2.5],[-52.2,3.2],[-51.7,4.2],[',
        '-51.3,4.2],[-51.1,3.7],[-50.5,1.9],[-50,1.7],[-49.9,1],[-50.7,0.2],[-50.4,-0.1],[-48.6,-0.2],[-48.6,-1.2],[-47.8,-0.6],[',
        '-46.6,-0.9],[-44.9,-1.6],[-44.4,-2.1],[-44.6,-2.7],[-43.4,-2.4],[-41.5,-2.9],[-40,-2.9],[-38.5,-3.7],[-37.2,-4.8],[-36.5',
        ',-5.1],[-35.6,-5.1],[-35.2,-5.5],[-34.9,-6.7],[-34.7,-7.3],[-35.1,-9],[-35.6,-9.6],[-37,-11],[-37.7,-12.2],[-38.4,-13],[',
        '-38.7,-13.1],[-39,-13.8],[-38.9,-15.7],[-39.2,-17.2],[-39.3,-17.9],[-39.6,-18.3],[-39.8,-19.6],[-40.8,-20.9],[-40.9,-21.',
        '9],[-41.8,-22.4],[-42,-23],[-43.1,-23],[-44.6,-23.4],[-45.4,-23.8],[-46.5,-24.1],[-47.6,-24.9],[-48.5,-25.9],[-48.6,-26.',
        '6],[-48.5,-27.2],[-48.7,-28.2],[-48.9,-28.7],[-49.6,-29.2],[-50.7,-31],[-51.6,-31.8],[-52.3,-32.2],[-52.7,-33.2]]]]],["B',
        'OL","BO","BOL","068","Bolivia",-64.6,-16.7,["BOL","BO","068","Bolivia"],[[[[-69.5,-11],[-68.8,-11],[-68.3,-11],[-68,-10.',
        '7],[-67.2,-10.3],[-66.6,-9.9],[-65.3,-9.8],[-65.4,-10.5],[-65.3,-10.9],[-65.4,-11.6],[-64.3,-12.5],[-63.2,-12.6],[-62.8,',
        '-13],[-62.1,-13.2],[-61.7,-13.5],[-61.1,-13.5],[-60.5,-13.8],[-60.5,-14.4],[-60.3,-14.6],[-60.3,-15.1],[-60.5,-15.1],[-6',
        '0.2,-16.3],[-58.2,-16.3],[-58.4,-16.9],[-58.3,-17.3],[-57.7,-17.6],[-57.5,-18.2],[-57.7,-19],[-57.9,-19.4],[-57.9,-20],[',
        '-58.2,-20.2],[-58.2,-19.9],[-59.1,-19.4],[-60,-19.3],[-61.8,-19.6],[-62.3,-20.5],[-62.3,-21.1],[-62.7,-22.2],[-62.8,-22]',
        ',[-64,-22],[-64.4,-22.8],[-65,-22.1],[-66.3,-21.8],[-67.1,-22.7],[-67.8,-22.9],[-68.2,-21.5],[-68.8,-20.4],[-68.4,-19.4]',
        ',[-69,-19],[-69.1,-18.3],[-69.6,-17.6],[-69,-16.5],[-69.4,-15.7],[-69.2,-15.3],[-69.3,-15],[-68.9,-14.5],[-68.9,-13.6],[',
        '-68.9,-12.9],[-68.7,-12.6]]]]],["PER","PE","PER","604","Peru",-72.9,-13,["PER","PE","604","Peru"],[[[[-69.9,-4.3],[-70.8',
        ',-4.3],[-70.9,-4.4],[-71.7,-4.6],[-72.9,-5.3],[-73,-5.7],[-73.2,-6.1],[-73.1,-6.6],[-73.7,-6.9],[-73.7,-7.3],[-74,-7.5],',
        '[-73.6,-8.4],[-73,-9],[-73.2,-9.5],[-72.6,-9.5],[-72.2,-10.1],[-71.3,-10.1],[-70.5,-9.5],[-70.5,-11],[-70.1,-11.1],[-69.',
        '5,-11],[-68.7,-12.6],[-68.9,-12.9],[-68.9,-13.6],[-68.9,-14.5],[-69.3,-15],[-69.2,-15.3],[-69.4,-15.7],[-69,-16.5],[-69.',
        '6,-17.6],[-69.9,-18.1],[-70.4,-18.3],[-71.4,-17.8],[-71.5,-17.4],[-73.4,-16.4],[-75.2,-15.3],[-76,-14.6],[-76.4,-13.8],[',
        '-76.3,-13.5],[-77.1,-12.2],[-78.1,-10.4],[-79,-8.4],[-79.4,-7.9],[-79.8,-7.2],[-80.5,-6.5],[-81.2,-6.1],[-80.9,-5.7],[-8',
        '1.4,-4.7],[-81.1,-4],[-80.3,-3.4],[-80.2,-3.8],[-80.5,-4.1],[-80.4,-4.4],[-80,-4.3],[-79.6,-4.5],[-79.2,-5],[-78.6,-4.5]',
        ',[-78.5,-3.9],[-77.8,-3],[-76.6,-2.6],[-75.5,-1.6],[-75.2,-0.9],[-75.4,-0.2],[-75.1,-0.1],[-74.4,-0.5],[-74.1,-1],[-73.7',
        ',-1.3],[-73.1,-2.3],[-72.3,-2.4],[-71.8,-2.2],[-71.4,-2.3],[-70.8,-2.3],[-70,-2.7],[-70.7,-3.7],[-70.4,-3.8]]]]],["COL",',
        '"CO","COL","170","Colombia",-73.2,3.4,["COL","CO","170","Colombia"],[[[[-66.9,1.3],[-67.1,1.1],[-67.3,1.7],[-67.5,2],[-6',
        '7.9,1.7],[-69.8,1.7],[-69.8,1.1],[-69.2,1],[-69.3,0.6],[-69.5,0.7],[-70,0.5],[-70,-0.2],[-69.6,-0.5],[-69.4,-1.1],[-69.4',
        ',-1.6],[-69.9,-4.3],[-70.4,-3.8],[-70.7,-3.7],[-70,-2.7],[-70.8,-2.3],[-71.4,-2.3],[-71.8,-2.2],[-72.3,-2.4],[-73.1,-2.3',
        '],[-73.7,-1.3],[-74.1,-1],[-74.4,-0.5],[-75.1,-0.1],[-75.4,-0.2],[-75.8,0.1],[-76.3,0.4],[-76.6,0.3],[-77.4,0.4],[-77.7,',
        '0.8],[-77.9,0.8],[-78.9,1.4],[-79,1.7],[-78.6,1.8],[-78.7,2.3],[-78.4,2.6],[-77.9,2.7],[-77.5,3.3],[-77.1,3.8],[-77.5,4.',
        '1],[-77.3,4.7],[-77.5,5.6],[-77.3,5.8],[-77.5,6.7],[-77.9,7.2],[-77.8,7.7],[-77.4,7.6],[-77.2,7.9],[-77.5,8.5],[-77.4,8.',
        '7],[-76.8,8.6],[-76.1,9.3],[-75.7,9.4],[-75.7,9.8],[-75.5,10.6],[-74.9,11.1],[-74.3,11.1],[-74.2,11.3],[-73.4,11.2],[-72',
        '.6,11.7],[-72.2,12],[-71.8,12.4],[-71.4,12.4],[-71.1,12.1],[-71.3,11.8],[-72,11.6],[-72.2,11.1],[-72.6,10.8],[-72.9,10.5',
        '],[-73,9.7],[-73.3,9.2],[-72.8,9.1],[-72.7,8.6],[-72.4,8.4],[-72.4,8],[-72.5,7.6],[-72.4,7.4],[-72.2,7.3],[-72,7],[-70.7',
        ',7.1],[-70.1,7],[-69.4,6.1],[-69,6.2],[-68.3,6.2],[-67.7,6.3],[-67.3,6.1],[-67.5,5.6],[-67.7,5.2],[-67.8,4.5],[-67.6,3.8',
        '],[-67.3,3.5],[-67.3,3.3],[-67.8,2.8],[-67.4,2.6],[-67.2,2.3]]]]],["PAN","PA","PAN","591","Panama",-80.4,8.7,["PAN","PA"',
        ',"591","Panama"],[[[[-77.4,8.7],[-77.5,8.5],[-77.2,7.9],[-77.4,7.6],[-77.8,7.7],[-77.9,7.2],[-78.2,7.5],[-78.4,8.1],[-78',
        '.2,8.3],[-78.4,8.4],[-78.6,8.7],[-79.1,9],[-79.6,8.9],[-79.8,8.6],[-80.2,8.3],[-80.4,8.3],[-80.5,8.1],[-80,7.5],[-80.3,7',
        '.4],[-80.4,7.3],[-80.9,7.2],[-81.1,7.8],[-81.2,7.6],[-81.5,7.7],[-81.7,8.1],[-82.1,8.2],[-82.4,8.3],[-82.8,8.3],[-82.9,8',
        '.1],[-83,8.2],[-82.9,8.4],[-82.8,8.6],[-82.9,8.8],[-82.7,8.9],[-82.9,9.1],[-82.9,9.5],[-82.5,9.6],[-82.2,9.2],[-82.2,9],',
        '[-81.8,9],[-81.7,9],[-81.4,8.8],[-80.9,8.9],[-80.5,9.1],[-79.9,9.3],[-79.6,9.6],[-79,9.6],[-79.1,9.5],[-78.5,9.4],[-78.1',
        ',9.2],[-77.7,8.9]]]]],["CRI","CR","CRI","188","Costa Rica",-84.1,10.1,["CRI","CR","188","Costa Rica"],[[[[-82.5,9.6],[-8',
        '2.9,9.5],[-82.9,9.1],[-82.7,8.9],[-82.9,8.8],[-82.8,8.6],[-82.9,8.4],[-83,8.2],[-83.5,8.4],[-83.7,8.7],[-83.6,8.8],[-83.',
        '6,9.1],[-83.9,9.3],[-84.3,9.5],[-84.6,9.6],[-84.7,9.9],[-85,10.1],[-84.9,9.8],[-85.1,9.6],[-85.3,9.8],[-85.7,9.9],[-85.8',
        ',10.1],[-85.8,10.4],[-85.7,10.8],[-85.9,10.9],[-85.7,11.1],[-85.6,11.2],[-84.9,11],[-84.7,11.1],[-84.4,11],[-84.2,10.8],',
        '[-83.9,10.7],[-83.7,10.9],[-83.4,10.4],[-83,10]]]]],["NIC","NI","NIC","558","Nicaragua",-85.1,12.7,["NIC","NI","558","Ni',
        'caragua"],[[[[-83.7,10.9],[-83.9,10.7],[-84.2,10.8],[-84.4,11],[-84.7,11.1],[-84.9,11],[-85.6,11.2],[-85.7,11.1],[-86.1,',
        '11.4],[-86.5,11.8],[-86.7,12.1],[-87.2,12.5],[-87.7,12.9],[-87.6,13.1],[-87.4,12.9],[-87.3,13],[-87,13],[-86.9,13.3],[-8',
        '6.7,13.3],[-86.8,13.8],[-86.5,13.8],[-86.3,13.8],[-86.1,14],[-85.8,13.8],[-85.7,14],[-85.5,14.1],[-85.2,14.4],[-85.1,14.',
        '6],[-84.9,14.8],[-84.8,14.8],[-84.6,14.7],[-84.4,14.6],[-84.2,14.7],[-84,14.7],[-83.6,14.9],[-83.5,15],[-83.1,15],[-83.2',
        ',14.9],[-83.3,14.7],[-83.2,14.3],[-83.4,14],[-83.5,13.6],[-83.6,13.1],[-83.5,12.9],[-83.5,12.4],[-83.6,12.3],[-83.7,11.9',
        '],[-83.7,11.6],[-83.9,11.4],[-83.8,11.1]]]]],["HND","HN","HND","340","Honduras",-86.9,14.8,["HND","HN","340","Honduras"]',
        ',[[[[-83.1,15],[-83.5,15],[-83.6,14.9],[-84,14.7],[-84.2,14.7],[-84.4,14.6],[-84.6,14.7],[-84.8,14.8],[-84.9,14.8],[-85.',
        '1,14.6],[-85.2,14.4],[-85.5,14.1],[-85.7,14],[-85.8,13.8],[-86.1,14],[-86.3,13.8],[-86.5,13.8],[-86.8,13.8],[-86.7,13.3]',
        ',[-86.9,13.3],[-87,13],[-87.3,13],[-87.5,13.3],[-87.8,13.4],[-87.7,13.8],[-87.9,13.9],[-88.1,14],[-88.5,13.8],[-88.5,14]',
        ',[-88.8,14.1],[-89.1,14.3],[-89.4,14.4],[-89.1,14.7],[-89.2,14.9],[-89.2,15.1],[-88.7,15.3],[-88.2,15.7],[-88.1,15.7],[-',
        '87.9,15.9],[-87.6,15.9],[-87.5,15.8],[-87.4,15.8],[-86.9,15.8],[-86.4,15.8],[-86.1,15.9],[-86,16],[-85.7,16],[-85.4,15.9',
        '],[-85.2,15.9],[-85,16],[-84.5,15.9],[-84.4,15.8],[-84.1,15.6],[-83.8,15.4],[-83.4,15.3]]]]],["SLV","SV","SLV","222","El',
        ' Salvador",-88.9,13.7,["SLV","SV","222","El Salvador"],[[[[-89.4,14.4],[-89.1,14.3],[-88.8,14.1],[-88.5,14],[-88.5,13.8]',
        ',[-88.1,14],[-87.9,13.9],[-87.7,13.8],[-87.8,13.4],[-87.9,13.1],[-88.5,13.2],[-88.8,13.3],[-89.3,13.5],[-89.8,13.5],[-90',
        '.1,13.7],[-90.1,13.9],[-89.7,14.1],[-89.5,14.2],[-89.6,14.4]]]]],["GTM","GT","GTM","320","Guatemala",-90.5,15,["GTM","GT',
        '","320","Guatemala"],[[[[-92.2,14.5],[-92.2,14.8],[-92.1,15.1],[-92.2,15.3],[-91.7,16.1],[-90.5,16.1],[-90.4,16.4],[-90.',
        '6,16.5],[-90.7,16.7],[-91.1,16.9],[-91.5,17.3],[-91,17.3],[-91,17.8],[-90.1,17.8],[-89.1,17.8],[-89.2,17],[-89.2,15.9],[',
        '-88.9,15.9],[-88.6,15.7],[-88.5,15.9],[-88.2,15.7],[-88.7,15.3],[-89.2,15.1],[-89.2,14.9],[-89.1,14.7],[-89.4,14.4],[-89',
        '.6,14.4],[-89.5,14.2],[-89.7,14.1],[-90.1,13.9],[-90.1,13.7],[-90.6,13.9],[-91.2,13.9],[-91.7,14.1]]]]],["BLZ","BZ","BLZ',
        '","084","Belize",-88.7,17.2,["BLZ","BZ","084","Belize"],[[[[-89.1,17.8],[-89.2,18],[-89,18],[-88.8,17.9],[-88.5,18.5],[-',
        '88.3,18.5],[-88.3,18.4],[-88.1,18.3],[-88.1,18.1],[-88.3,17.6],[-88.2,17.5],[-88.3,17.1],[-88.2,17],[-88.4,16.5],[-88.6,',
        '16.3],[-88.7,16.2],[-88.9,15.9],[-89.2,15.9],[-89.2,17]]]]],["VEN","VE","VEN","862","Venezuela",-64.6,7.2,["VEN","VE","8',
        '62","Venezuela"],[[[[-60.7,5.2],[-60.6,4.9],[-61,4.5],[-62.1,4.2],[-62.8,4],[-63.1,3.8],[-63.9,4],[-64.6,4.1],[-64.8,4.1',
        '],[-64.4,3.8],[-64.4,3.1],[-64.3,2.5],[-63.4,2.4],[-63.4,2.2],[-64.1,1.9],[-64.2,1.5],[-64.6,1.3],[-65.4,1.1],[-65.5,0.8',
        '],[-66.3,0.7],[-66.9,1.3],[-67.2,2.3],[-67.4,2.6],[-67.8,2.8],[-67.3,3.3],[-67.3,3.5],[-67.6,3.8],[-67.8,4.5],[-67.7,5.2',
        '],[-67.5,5.6],[-67.3,6.1],[-67.7,6.3],[-68.3,6.2],[-69,6.2],[-69.4,6.1],[-70.1,7],[-70.7,7.1],[-72,7],[-72.2,7.3],[-72.4',
        ',7.4],[-72.5,7.6],[-72.4,8],[-72.4,8.4],[-72.7,8.6],[-72.8,9.1],[-73.3,9.2],[-73,9.7],[-72.9,10.5],[-72.6,10.8],[-72.2,1',
        '1.1],[-72,11.6],[-71.3,11.8],[-71.4,11.5],[-71.9,11.4],[-71.6,11],[-71.6,10.4],[-72.1,9.9],[-71.7,9.1],[-71.3,9.1],[-71,',
        '9.9],[-71.4,10.2],[-71.4,11],[-70.2,11.4],[-70.3,11.8],[-69.9,12.2],[-69.6,11.5],[-68.9,11.4],[-68.2,10.9],[-68.2,10.6],',
        '[-67.3,10.5],[-66.2,10.6],[-65.7,10.2],[-64.9,10.1],[-64.3,10.4],[-64.3,10.6],[-63.1,10.7],[-61.9,10.7],[-62.7,10.4],[-6',
        '2.4,9.9],[-61.6,9.9],[-60.8,9.4],[-60.7,8.6],[-60.2,8.6],[-59.8,8.4],[-60.6,7.8],[-60.6,7.4],[-60.3,7],[-60.5,6.9],[-61.',
        '2,6.7],[-61.1,6.2],[-61.4,6]]]]],["GUY","GY","GUY","328","Guyana",-58.9,5.1,["GUY","GY","328","Guyana"],[[[[-56.5,1.9],[',
        '-56.8,1.9],[-57.3,1.9],[-57.7,1.7],[-58.1,1.5],[-58.4,1.5],[-58.5,1.3],[-59,1.3],[-59.6,1.8],[-59.7,2.2],[-60,2.8],[-59.',
        '8,3.6],[-59.5,4],[-59.8,4.4],[-60.1,4.6],[-60,5],[-60.2,5.2],[-60.7,5.2],[-61.4,6],[-61.1,6.2],[-61.2,6.7],[-60.5,6.9],[',
        '-60.3,7],[-60.6,7.4],[-60.6,7.8],[-59.8,8.4],[-59.1,8],[-58.5,7.3],[-58.5,6.8],[-58.1,6.8],[-57.5,6.3],[-57.1,6],[-57.3,',
        '5.1],[-57.9,4.8],[-57.9,4.6],[-58,4.1],[-57.6,3.3],[-57.3,3.3],[-57.2,2.8]]]]],["SUR","SR","SUR","740","Suriname",-55.9,',
        '4.1,["SUR","SR","740","Suriname"],[[[[-54.5,2.3],[-55.1,2.5],[-55.6,2.4],[-56,2.5],[-56.1,2.2],[-55.9,2],[-56,1.8],[-56.',
        '5,1.9],[-57.2,2.8],[-57.3,3.3],[-57.6,3.3],[-58,4.1],[-57.9,4.6],[-57.9,4.8],[-57.3,5.1],[-57.1,6],[-55.9,5.8],[-55.8,6]',
        ',[-55,6],[-54,5.8],[-54.5,4.9],[-54.4,4.2],[-54,3.6],[-54.2,3.2],[-54.3,2.7]]]]],["FRA","","","","France",2.6,46.7,["FRA',
        '","FR1","F","FR","France"],[[[[-51.7,4.2],[-52.2,3.2],[-52.6,2.5],[-52.9,2.1],[-53.4,2.1],[-53.6,2.3],[-53.8,2.4],[-54.1',
        ',2.1],[-54.5,2.3],[-54.3,2.7],[-54.2,3.2],[-54,3.6],[-54.4,4.2],[-54.5,4.9],[-54,5.8],[-53.6,5.6],[-52.9,5.4],[-51.8,4.6',
        ']]],[[[6.2,49.5],[6.7,49.2],[8.1,49],[7.6,48.3],[7.5,47.6],[7.2,47.4],[6.7,47.5],[6.8,47.3],[6,46.7],[6,46.3],[6.5,46.4]',
        ',[6.8,46],[6.8,45.7],[7.1,45.3],[6.7,45],[7,44.3],[7.5,44.1],[7.4,43.7],[6.5,43.1],[4.6,43.4],[3.1,43.1],[3,42.5],[1.8,4',
        '2.3],[0.7,42.8],[0.3,42.6],[-1.5,43],[-1.9,43.4],[-1.4,44],[-1.2,46],[-2.2,47.1],[-3,47.6],[-4.5,48],[-4.6,48.7],[-3.3,4',
        '8.9],[-1.6,48.6],[-1.9,49.8],[-1,49.3],[1.3,50.1],[1.6,50.9],[2.5,51.1],[2.7,50.8],[3.1,50.8],[3.6,50.4],[4.3,49.9],[4.8',
        ',50],[5.7,49.5],[5.9,49.4]]],[[[8.7,42.6],[9.4,43],[9.6,42.2],[9.2,41.4],[8.8,41.6],[8.5,42.3]]]]],["ECU","EC","ECU","21',
        '8","Ecuador",-78.2,-1.3,["ECU","EC","218","Ecuador"],[[[[-75.4,-0.2],[-75.2,-0.9],[-75.5,-1.6],[-76.6,-2.6],[-77.8,-3],[',
        '-78.5,-3.9],[-78.6,-4.5],[-79.2,-5],[-79.6,-4.5],[-80,-4.3],[-80.4,-4.4],[-80.5,-4.1],[-80.2,-3.8],[-80.3,-3.4],[-79.8,-',
        '2.7],[-80,-2.2],[-80.4,-2.7],[-81,-2.2],[-80.8,-2],[-80.9,-1.1],[-80.6,-0.9],[-80.4,-0.3],[-80,0.4],[-80.1,0.8],[-79.5,1',
        '],[-78.9,1.4],[-77.9,0.8],[-77.7,0.8],[-77.4,0.4],[-76.6,0.3],[-76.3,0.4],[-75.8,0.1]]]]],["PRI","PR","PRI","630","Puert',
        'o Rico",-66.5,18.2,["PRI","PR","630","US1","Puerto Rico","United States of America"],[[[[-66.3,18.5],[-65.8,18.4],[-65.6',
        ',18.2],[-65.8,18],[-66.6,18],[-67.2,17.9],[-67.2,18.4],[-67.1,18.5]]]]],["JAM","JM","JAM","388","Jamaica",-77.3,18.1,["J',
        'AM","JM","388","J","Jamaica"],[[[[-77.6,18.5],[-76.9,18.4],[-76.4,18.2],[-76.2,17.9],[-76.9,17.9],[-77.2,17.7],[-77.8,17',
        '.9],[-78.3,18.2],[-78.2,18.5],[-77.8,18.5]]]]],["CUB","CU","CUB","192","Cuba",-78,21.3,["CUB","CU","192","CU1","Cuba"],[',
        '[[[-82.3,23.2],[-81.4,23.1],[-80.6,23.1],[-79.7,22.8],[-79.3,22.4],[-78.3,22.5],[-78,22.3],[-77.1,21.7],[-76.5,21.2],[-7',
        '6.2,21.2],[-75.6,21],[-75.7,20.7],[-74.9,20.7],[-74.2,20.3],[-74.3,20.1],[-75,19.9],[-75.6,19.9],[-76.3,20],[-77.8,19.9]',
        ',[-77.1,20.4],[-77.5,20.7],[-78.1,20.7],[-78.5,21],[-78.7,21.6],[-79.3,21.6],[-80.2,21.8],[-80.5,22],[-81.8,22.2],[-82.2',
        ',22.4],[-81.8,22.6],[-82.8,22.7],[-83.5,22.2],[-83.9,22.2],[-84.1,21.9],[-84.5,21.8],[-85,21.9],[-84.4,22.2],[-84.2,22.6',
        '],[-83.8,22.8],[-83.3,23],[-82.5,23.1]]]]],["ZWE","ZW","ZWE","716","Zimbabwe",29.9,-18.9,["ZWE","ZW","716","Zimbabwe"],[',
        '[[[31.2,-22.3],[30.7,-22.2],[30.3,-22.3],[29.8,-22.1],[29.4,-22.1],[28.8,-21.6],[28,-21.5],[27.7,-20.9],[27.7,-20.5],[27',
        '.3,-20.4],[26.2,-19.3],[25.9,-18.7],[25.6,-18.5],[25.3,-17.7],[26.4,-17.8],[26.7,-18],[27,-17.9],[27.6,-17.3],[28.5,-16.',
        '5],[28.8,-16.4],[28.9,-16],[29.5,-15.6],[30.3,-15.5],[30.3,-15.9],[31.2,-15.9],[31.6,-16.1],[31.9,-16.3],[32.3,-16.4],[3',
        '2.8,-16.7],[32.8,-18],[32.7,-18.7],[32.6,-19.4],[32.8,-19.7],[32.7,-20.3],[32.5,-20.4],[32.2,-21.1]]]]],["BWA","BW","BWA',
        '","072","Botswana",24.2,-22.1,["BWA","BW","072","Botswana"],[[[[29.4,-22.1],[28,-22.8],[27.1,-23.6],[26.8,-24.2],[26.5,-',
        '24.6],[25.9,-24.7],[25.8,-25.2],[25.7,-25.5],[25,-25.7],[24.2,-25.7],[23.7,-25.4],[23.3,-25.3],[22.8,-25.5],[22.6,-26],[',
        '22.1,-26.3],[21.6,-26.7],[20.9,-26.8],[20.7,-26.5],[20.8,-25.9],[20.2,-24.9],[19.9,-24.8],[19.9,-21.8],[20.9,-21.8],[20.',
        '9,-18.3],[21.7,-18.2],[23.2,-17.9],[23.6,-18.3],[24.2,-17.9],[24.5,-17.9],[25.1,-17.7],[25.3,-17.7],[25.6,-18.5],[25.9,-',
        '18.7],[26.2,-19.3],[27.3,-20.4],[27.7,-20.5],[27.7,-20.9],[28,-21.5],[28.8,-21.6]]]]],["NAM","NA","NAM","516","Namibia",',
        '17.1,-20.6,["NAM","NA","516","Namibia"],[[[[19.9,-24.8],[19.9,-28.5],[19,-29],[18.5,-29],[17.8,-28.9],[17.4,-28.8],[17.2',
        ',-28.4],[16.8,-28.1],[16.3,-28.6],[15.6,-27.8],[15.2,-27.1],[15,-26.1],[14.7,-25.4],[14.4,-23.9],[14.4,-22.7],[14.3,-22.',
        '1],[13.9,-21.7],[13.4,-20.9],[12.8,-19.7],[12.6,-19],[11.8,-18.1],[11.7,-17.3],[12.2,-17.1],[12.8,-16.9],[13.5,-17],[14.',
        '1,-17.4],[14.2,-17.4],[18.3,-17.3],[19,-17.8],[21.4,-17.9],[23.2,-17.5],[24,-17.3],[24.7,-17.4],[25.1,-17.6],[25.1,-17.7',
        '],[24.5,-17.9],[24.2,-17.9],[23.6,-18.3],[23.2,-17.9],[21.7,-18.2],[20.9,-18.3],[20.9,-21.8],[19.9,-21.8]]]]],["SEN","SN',
        '","SEN","686","Senegal",-14.8,15.1,["SEN","SN","686","Senegal"],[[[[-16.7,13.6],[-17.1,14.4],[-17.6,14.7],[-17.2,14.9],[',
        '-16.7,15.6],[-16.5,16.1],[-16.1,16.5],[-15.6,16.4],[-15.1,16.6],[-14.6,16.6],[-14.1,16.3],[-13.4,16],[-12.8,15.3],[-12.2',
        ',14.6],[-12.1,14],[-11.9,13.4],[-11.6,13.1],[-11.5,12.8],[-11.5,12.4],[-11.7,12.4],[-12.2,12.5],[-12.3,12.4],[-12.5,12.3',
        '],[-13.2,12.6],[-13.7,12.6],[-15.5,12.6],[-15.8,12.5],[-16.1,12.5],[-16.7,12.4],[-16.8,13.2],[-15.9,13.1],[-15.7,13.3],[',
        '-15.5,13.3],[-15.1,13.5],[-14.7,13.3],[-14.3,13.3],[-13.8,13.5],[-14,13.8],[-14.4,13.6],[-14.7,13.6],[-15.1,13.9],[-15.4',
        ',13.9],[-15.6,13.6]]]]],["MLI","ML","MLI","466","Mali",-2,18.7,["MLI","ML","466","Mali"],[[[[-11.5,12.4],[-11.5,12.8],[-',
        '11.6,13.1],[-11.9,13.4],[-12.1,14],[-12.2,14.6],[-11.8,14.8],[-11.7,15.4],[-11.3,15.4],[-10.7,15.1],[-10.1,15.3],[-9.7,1',
        '5.3],[-9.6,15.5],[-5.5,15.5],[-5.3,16.2],[-5.5,16.3],[-6,20.6],[-6.5,25],[-4.9,25],[-1.6,22.8],[1.8,20.6],[2.1,20.1],[2.',
        '7,19.9],[3.1,19.7],[3.2,19.1],[4.3,19.2],[4.3,16.9],[3.7,16.2],[3.6,15.6],[2.7,15.4],[1.4,15.3],[1,15],[0.4,14.9],[-0.3,',
        '14.9],[-0.5,15.1],[-1.1,15],[-2,14.6],[-2.2,14.2],[-3,13.8],[-3.1,13.5],[-3.5,13.3],[-4,13.5],[-4.3,13.2],[-4.4,12.5],[-',
        '5.2,11.7],[-5.2,11.4],[-5.5,11],[-5.4,10.4],[-5.8,10.2],[-6.1,10.1],[-6.2,10.5],[-6.5,10.4],[-6.7,10.4],[-6.9,10.1],[-7.',
        '6,10.1],[-7.9,10.3],[-8,10.2],[-8.3,10.5],[-8.3,10.8],[-8.4,10.9],[-8.6,10.8],[-8.6,11.1],[-8.4,11.4],[-8.8,11.8],[-8.9,',
        '12.1],[-9.1,12.3],[-9.3,12.3],[-9.6,12.2],[-9.9,12.1],[-10.2,11.8],[-10.6,11.9],[-10.9,12.2],[-11,12.2],[-11.3,12.1],[-1',
        '1.5,12.1]]]]],["MRT","MR","MRT","478","Mauritania",-9.7,19.6,["MRT","MR","478","Mauritania"],[[[[-17.1,21],[-16.8,21.3],',
        '[-12.9,21.3],[-13.1,22.8],[-12.9,23.3],[-11.9,23.4],[-12,25.9],[-8.7,25.9],[-8.7,27.4],[-4.9,25],[-6.5,25],[-6,20.6],[-5',
        '.5,16.3],[-5.3,16.2],[-5.5,15.5],[-9.6,15.5],[-9.7,15.3],[-10.1,15.3],[-10.7,15.1],[-11.3,15.4],[-11.7,15.4],[-11.8,14.8',
        '],[-12.2,14.6],[-12.8,15.3],[-13.4,16],[-14.1,16.3],[-14.6,16.6],[-15.1,16.6],[-15.6,16.4],[-16.1,16.5],[-16.5,16.1],[-1',
        '6.5,16.7],[-16.3,17.2],[-16.1,18.1],[-16.3,19.1],[-16.4,19.6],[-16.3,20.1],[-16.5,20.6]]]]],["BEN","BJ","BEN","204","Ben',
        'in",2.4,10.3,["BEN","BJ","204","Benin"],[[[[2.7,6.3],[1.9,6.1],[1.6,6.8],[1.7,9.1],[1.5,9.3],[1.4,9.8],[1.1,10.2],[0.8,1',
        '0.5],[0.9,11],[1.2,11.1],[1.4,11.5],[1.9,11.6],[2.2,11.9],[2.5,12.2],[2.8,12.2],[3.6,11.7],[3.6,11.3],[3.8,10.7],[3.6,10',
        '.3],[3.7,10.1],[3.2,9.4],[2.9,9.1],[2.7,8.5],[2.7,7.9]]]]],["NER","NE","NER","562","Niger",9.5,17.4,["NER","NE","562","N',
        'iger"],[[[[14.9,22.9],[15.1,21.3],[15.5,21],[15.5,20.7],[15.9,20.4],[15.7,20],[15.3,17.9],[15.2,16.6],[14,15.7],[13.5,14',
        '.4],[14,14],[14,13.4],[14.6,13.3],[14.5,12.9],[14.2,12.8],[14.2,12.5],[14,12.5],[13.3,13.6],[13.1,13.6],[12.3,13],[11.5,',
        '13.3],[11,13.4],[10.7,13.2],[10.1,13.3],[9.5,12.9],[9,12.8],[7.8,13.3],[7.3,13.1],[6.8,13.1],[6.4,13.5],[5.4,13.9],[4.4,',
        '13.7],[4.1,13.5],[4,13],[3.7,12.6],[3.6,11.7],[2.8,12.2],[2.5,12.2],[2.2,11.9],[2.2,12.6],[1,12.9],[1,13.3],[0.4,14],[0.',
        '3,14.4],[0.4,14.9],[1,15],[1.4,15.3],[2.7,15.4],[3.6,15.6],[3.7,16.2],[4.3,16.9],[4.3,19.2],[5.7,19.6],[8.6,21.6],[12,23',
        '.5],[13.6,23],[14.1,22.5]]]]],["NGA","NG","NGA","566","Nigeria",7.5,9.4,["NGA","NG","566","Nigeria"],[[[[2.7,6.3],[2.7,7',
        '.9],[2.7,8.5],[2.9,9.1],[3.2,9.4],[3.7,10.1],[3.6,10.3],[3.8,10.7],[3.6,11.3],[3.6,11.7],[3.7,12.6],[4,13],[4.1,13.5],[4',
        '.4,13.7],[5.4,13.9],[6.4,13.5],[6.8,13.1],[7.3,13.1],[7.8,13.3],[9,12.8],[9.5,12.9],[10.1,13.3],[10.7,13.2],[11,13.4],[1',
        '1.5,13.3],[12.3,13],[13.1,13.6],[13.3,13.6],[14,12.5],[14.2,12.5],[14.6,12.1],[14.5,11.9],[14.4,11.6],[13.6,10.8],[13.3,',
        '10.2],[13.2,9.6],[13,9.4],[12.8,8.7],[12.2,8.3],[12.1,7.8],[11.8,7.4],[11.7,7],[11.1,6.6],[10.5,7.1],[10.1,7],[9.5,6.5],',
        '[9.2,6.4],[8.8,5.5],[8.5,4.8],[7.5,4.4],[7.1,4.5],[6.7,4.2],[5.9,4.3],[5.4,4.9],[5,5.6],[4.3,6.3],[3.6,6.3]]]]],["CMR","',
        'CM","CMR","120","Cameroon",12.5,4.6,["CMR","CM","120","Cameroon"],[[[[14.5,12.9],[14.9,12.2],[15,11.6],[14.9,10.9],[15.5',
        ',10],[14.9,10],[14.6,9.9],[14.2,10],[14,9.5],[14.5,9],[15,8.8],[15.1,8.4],[15.4,7.7],[15.3,7.4],[14.8,6.4],[14.5,6.2],[1',
        '4.5,5.5],[14.6,5],[14.5,4.7],[15,4.2],[15,3.9],[15.4,3.3],[15.9,3],[15.9,2.6],[16,2.3],[15.9,1.7],[15.1,2],[14.3,2.2],[1',
        '3.1,2.3],[13,2.3],[12.4,2.2],[11.8,2.3],[11.3,2.3],[9.6,2.3],[9.8,3.1],[9.4,3.7],[8.9,3.9],[8.7,4.4],[8.5,4.5],[8.5,4.8]',
        ',[8.8,5.5],[9.2,6.4],[9.5,6.5],[10.1,7],[10.5,7.1],[11.1,6.6],[11.7,7],[11.8,7.4],[12.1,7.8],[12.2,8.3],[12.8,8.7],[13,9',
        '.4],[13.2,9.6],[13.3,10.2],[13.6,10.8],[14.4,11.6],[14.5,11.9],[14.6,12.1],[14.2,12.5],[14.2,12.8]]]]],["TGO","TG","TGO"',
        ',"768","Togo",1.1,8.8,["TGO","TG","768","Togo"],[[[[0.9,11],[0.8,10.5],[1.1,10.2],[1.4,9.8],[1.5,9.3],[1.7,9.1],[1.6,6.8',
        '],[1.9,6.1],[1.1,5.9],[0.8,6.3],[0.6,6.9],[0.5,7.4],[0.7,8.3],[0.5,8.7],[0.4,9.5],[0.4,10.2],[0,10.7],[0,11]]]]],["GHA",',
        '"GH","GHA","288","Ghana",-1,7.7,["GHA","GH","288","Ghana"],[[[[0,11],[0,10.7],[0.4,10.2],[0.4,9.5],[0.5,8.7],[0.7,8.3],[',
        '0.5,7.4],[0.6,6.9],[0.8,6.3],[1.1,5.9],[-0.5,5.3],[-1.1,5],[-2,4.7],[-2.9,5],[-2.8,5.4],[-3.2,6.3],[-3,7.4],[-2.6,8.2],[',
        '-2.8,9.6],[-3,10.4],[-2.9,11],[-1.2,11],[-0.8,10.9],[-0.4,11.1]]]]],["CIV","CI","CIV","384","Ivory Coast",-5.6,7.5,["CIV',
        '","CI","384","Côte d\'Ivoire","Ivory Coast"],[[[[-8,10.2],[-7.9,10.3],[-7.6,10.1],[-6.9,10.1],[-6.7,10.4],[-6.5,10.4],[-6',
        '.2,10.5],[-6.1,10.1],[-5.8,10.2],[-5.4,10.4],[-5,10.2],[-4.8,9.8],[-4.3,9.6],[-4,9.9],[-3.5,9.9],[-2.8,9.6],[-2.6,8.2],[',
        '-3,7.4],[-3.2,6.3],[-2.8,5.4],[-2.9,5],[-3.3,5],[-4,5.2],[-4.6,5.2],[-5.8,5],[-6.5,4.7],[-7.5,4.3],[-7.7,4.4],[-7.6,5.2]',
        ',[-7.5,5.3],[-7.6,5.7],[-8,6.1],[-8.3,6.2],[-8.6,6.5],[-8.4,6.9],[-8.5,7.4],[-8.4,7.7],[-8.3,7.7],[-8.2,8.1],[-8.3,8.3],',
        '[-8.2,8.5],[-7.8,8.6],[-8.1,9.4],[-8.3,9.8],[-8.2,10.1]]]]],["GIN","GN","GIN","324","Guinea",-10,10.6,["GIN","GN","324",',
        '"Guinea"],[[[[-13.7,12.6],[-13.2,12.6],[-12.5,12.3],[-12.3,12.4],[-12.2,12.5],[-11.7,12.4],[-11.5,12.4],[-11.5,12.1],[-1',
        '1.3,12.1],[-11,12.2],[-10.9,12.2],[-10.6,11.9],[-10.2,11.8],[-9.9,12.1],[-9.6,12.2],[-9.3,12.3],[-9.1,12.3],[-8.9,12.1],',
        '[-8.8,11.8],[-8.4,11.4],[-8.6,11.1],[-8.6,10.8],[-8.4,10.9],[-8.3,10.8],[-8.3,10.5],[-8,10.2],[-8.2,10.1],[-8.3,9.8],[-8',
        '.1,9.4],[-7.8,8.6],[-8.2,8.5],[-8.3,8.3],[-8.2,8.1],[-8.3,7.7],[-8.4,7.7],[-8.7,7.7],[-8.9,7.3],[-9.2,7.3],[-9.4,7.5],[-',
        '9.3,7.9],[-9.8,8.5],[-10,8.4],[-10.2,8.4],[-10.5,8.3],[-10.5,8.7],[-10.7,9],[-10.6,9.3],[-10.8,9.7],[-11.1,10],[-11.9,10',
        '],[-12.2,9.9],[-12.4,9.8],[-12.6,9.6],[-12.7,9.3],[-13.2,8.9],[-13.7,9.5],[-14.1,9.9],[-14.3,10],[-14.6,10.2],[-14.7,10.',
        '7],[-14.8,10.9],[-15.1,11],[-14.7,11.5],[-14.4,11.5],[-14.1,11.7],[-13.9,11.7],[-13.7,11.8],[-13.8,12.1],[-13.7,12.2]]]]',
        '],["GNB","GW","GNB","624","Guinea-Bissau",-14.5,12.2,["GNB","GW","624","Guinea-Bissau"],[[[[-16.7,12.4],[-16.1,12.5],[-1',
        '5.8,12.5],[-15.5,12.6],[-13.7,12.6],[-13.7,12.2],[-13.8,12.1],[-13.7,11.8],[-13.9,11.7],[-14.1,11.7],[-14.4,11.5],[-14.7',
        ',11.5],[-15.1,11],[-15.7,11.5],[-16.1,11.5],[-16.3,11.8],[-16.3,12],[-16.6,12.2]]]]],["LBR","LR","LBR","430","Liberia",-',
        '9.5,6.4,["LBR","LR","430","Liberia"],[[[[-8.4,7.7],[-8.5,7.4],[-8.4,6.9],[-8.6,6.5],[-8.3,6.2],[-8,6.1],[-7.6,5.7],[-7.5',
        ',5.3],[-7.6,5.2],[-7.7,4.4],[-8,4.4],[-9,4.8],[-9.9,5.6],[-10.8,6.1],[-11.4,6.8],[-11.2,7.1],[-11.1,7.4],[-10.7,7.9],[-1',
        '0.2,8.4],[-10,8.4],[-9.8,8.5],[-9.3,7.9],[-9.4,7.5],[-9.2,7.3],[-8.9,7.3],[-8.7,7.7]]]]],["SLE","SL","SLE","694","Sierra',
        ' Leone",-11.8,8.6,["SLE","SL","694","Sierra Leone"],[[[[-13.2,8.9],[-12.7,9.3],[-12.6,9.6],[-12.4,9.8],[-12.2,9.9],[-11.',
        '9,10],[-11.1,10],[-10.8,9.7],[-10.6,9.3],[-10.7,9],[-10.5,8.7],[-10.5,8.3],[-10.2,8.4],[-10.7,7.9],[-11.1,7.4],[-11.2,7.',
        '1],[-11.4,6.8],[-11.7,6.9],[-12.4,7.3],[-12.9,7.8],[-13.1,8.2]]]]],["BFA","BF","BFA","854","Burkina Faso",-1.4,12.7,["BF',
        'A","BF","854","Burkina Faso"],[[[[-5.4,10.4],[-5.5,11],[-5.2,11.4],[-5.2,11.7],[-4.4,12.5],[-4.3,13.2],[-4,13.5],[-3.5,1',
        '3.3],[-3.1,13.5],[-3,13.8],[-2.2,14.2],[-2,14.6],[-1.1,15],[-0.5,15.1],[-0.3,14.9],[0.4,14.9],[0.3,14.4],[0.4,14],[1,13.',
        '3],[1,12.9],[2.2,12.6],[2.2,11.9],[1.9,11.6],[1.4,11.5],[1.2,11.1],[0.9,11],[0,11],[-0.4,11.1],[-0.8,10.9],[-1.2,11],[-2',
        '.9,11],[-3,10.4],[-2.8,9.6],[-3.5,9.9],[-4,9.9],[-4.3,9.6],[-4.8,9.8],[-5,10.2]]]]],["CAF","CF","CAF","140","Central Afr',
        'ican Republic",20.9,7,["CAF","CF","140","Central African Rep.","Central African Republic"],[[[[27.4,5.2],[27,5.1],[26.4,',
        '5.2],[25.7,5.3],[25.3,5.2],[25.1,4.9],[24.8,4.9],[24.4,5.1],[23.3,4.6],[22.8,4.7],[22.7,4.6],[22.4,4],[21.7,4.2],[20.9,4',
        '.3],[20.3,4.7],[19.5,5],[18.9,4.7],[18.5,4.2],[18.5,3.5],[17.8,3.6],[17.1,3.7],[16.5,3.2],[16,2.3],[15.9,2.6],[15.9,3],[',
        '15.4,3.3],[15,3.9],[15,4.2],[14.5,4.7],[14.6,5],[14.5,5.5],[14.5,6.2],[14.8,6.4],[15.3,7.4],[16.1,7.5],[16.3,7.8],[16.5,',
        '7.7],[16.7,7.5],[18,7.9],[18.4,8.3],[18.9,8.6],[18.8,9],[19.1,9.1],[20.1,9],[21,9.5],[21.7,10.6],[22.2,11],[22.9,11.1],[',
        '23,10.7],[23.6,10.1],[23.6,9.7],[23.4,9.3],[23.5,9],[23.8,8.7],[24.6,8.2],[25.1,7.8],[25.1,7.5],[25.8,7],[26.2,6.5],[26.',
        '5,5.9],[27.2,5.6]]]]],["COG","CG","COG","178","Republic of the Congo",15.9,0.1,["COG","CG","178","Congo","Republic of th',
        'e Congo"],[[[[18.5,3.5],[18.4,2.9],[18.1,2.4],[17.9,1.7],[17.8,0.9],[17.8,0.3],[17.7,-0.1],[17.6,-0.4],[17.5,-0.7],[16.9',
        ',-1.2],[16.4,-1.7],[16,-2.7],[16,-3.5],[15.8,-3.9],[15.2,-4.3],[14.6,-5],[14.2,-4.8],[14.1,-4.5],[13.6,-4.5],[13.3,-4.9]',
        ',[13,-4.8],[12.6,-4.4],[12.3,-4.6],[11.9,-5],[11.1,-4],[11.9,-3.4],[11.5,-2.8],[11.8,-2.5],[12.5,-2.4],[12.6,-1.9],[13.1',
        ',-2.4],[14,-2.5],[14.3,-2],[14.4,-1.3],[14.3,-0.6],[13.8,0],[14.3,1.2],[14,1.4],[13.3,1.3],[13,1.8],[13.1,2.3],[14.3,2.2',
        '],[15.1,2],[15.9,1.7],[16,2.3],[16.5,3.2],[17.1,3.7],[17.8,3.6]]]]],["GAB","GA","GAB","266","Gabon",11.8,-0.4,["GAB","GA',
        '","266","Gabon"],[[[[11.3,2.3],[11.8,2.3],[12.4,2.2],[13,2.3],[13.1,2.3],[13,1.8],[13.3,1.3],[14,1.4],[14.3,1.2],[13.8,0',
        '],[14.3,-0.6],[14.4,-1.3],[14.3,-2],[14,-2.5],[13.1,-2.4],[12.6,-1.9],[12.5,-2.4],[11.8,-2.5],[11.5,-2.8],[11.9,-3.4],[1',
        '1.1,-4],[10.1,-3],[9.4,-2.1],[8.8,-1.1],[8.8,-0.8],[9,-0.5],[9.3,0.3],[9.5,1],[9.8,1.1],[11.3,1.1]]]]],["GNQ","GQ","GNQ"',
        ',"226","Equatorial Guinea",9,2.3,["GNQ","GQ","226","Eq. Guinea","Equatorial Guinea"],[[[[9.6,2.3],[11.3,2.3],[11.3,1.1],',
        '[9.8,1.1],[9.5,1],[9.3,1.2]]]]],["ZMB","ZM","ZMB","894","Zambia",26.4,-14.7,["ZMB","ZM","894","Zambia"],[[[[30.7,-8.3],[',
        '31.2,-8.6],[31.6,-8.8],[32.2,-8.9],[32.8,-9.2],[33.2,-9.7],[33.5,-10.5],[33.3,-10.8],[33.1,-11.6],[33.3,-12.4],[33,-12.8',
        '],[32.7,-13.7],[33.2,-14],[30.2,-14.8],[30.3,-15.5],[29.5,-15.6],[28.9,-16],[28.8,-16.4],[28.5,-16.5],[27.6,-17.3],[27,-',
        '17.9],[26.7,-18],[26.4,-17.8],[25.3,-17.7],[25.1,-17.7],[25.1,-17.6],[24.7,-17.4],[24,-17.3],[23.2,-17.5],[22.6,-16.9],[',
        '21.9,-16.1],[21.9,-12.9],[24,-12.9],[23.9,-12.6],[24.1,-12.2],[23.9,-11.7],[24,-11.2],[23.9,-10.9],[24.3,-11],[24.3,-11.',
        '3],[24.8,-11.2],[25.4,-11.3],[25.8,-11.8],[26.6,-11.9],[27.2,-11.6],[27.4,-12.1],[28.2,-12.3],[28.5,-12.7],[28.9,-13.2],',
        '[29.7,-13.3],[29.6,-12.2],[29.3,-12.4],[28.6,-12],[28.4,-11.8],[28.5,-10.8],[28.7,-9.6],[28.4,-9.2],[28.7,-8.5],[29,-8.4',
        '],[30.3,-8.2]]]]],["MWI","MW","MWI","454","Malawi",33.6,-13.4,["MWI","MW","454","Malawi"],[[[[32.8,-9.2],[33.7,-9.4],[33',
        '.9,-9.7],[34.3,-10.2],[34.6,-11.5],[34.3,-12.3],[34.6,-13.6],[34.9,-13.6],[35.3,-13.9],[35.7,-14.6],[35.8,-15.9],[35.3,-',
        '16.1],[35,-16.8],[34.4,-16.2],[34.3,-15.5],[34.5,-15],[34.5,-14.6],[34.1,-14.4],[33.8,-14.5],[33.2,-14],[32.7,-13.7],[33',
        ',-12.8],[33.3,-12.4],[33.1,-11.6],[33.3,-10.8],[33.5,-10.5],[33.2,-9.7]]]]],["MOZ","MZ","MOZ","508","Mozambique",37.8,-1',
        '3.9,["MOZ","MZ","508","Mozambique"],[[[[34.6,-11.5],[35.3,-11.4],[36.5,-11.7],[36.8,-11.6],[37.5,-11.6],[37.8,-11.3],[38',
        '.4,-11.3],[39.5,-10.9],[40.3,-10.3],[40.5,-10.8],[40.4,-11.8],[40.6,-12.6],[40.6,-14.2],[40.8,-14.7],[40.5,-15.4],[40.1,',
        '-16.1],[39.5,-16.7],[38.5,-17.1],[37.4,-17.6],[36.3,-18.7],[35.9,-18.8],[35.2,-19.6],[34.8,-19.8],[34.7,-20.5],[35.2,-21',
        '.3],[35.4,-21.8],[35.4,-22.1],[35.6,-22.1],[35.5,-23.1],[35.4,-23.5],[35.6,-23.7],[35.5,-24.1],[35,-24.5],[34.2,-24.8],[',
        '33,-25.4],[32.6,-25.7],[32.7,-26.1],[32.9,-26.2],[32.8,-26.7],[32.1,-26.7],[32,-26.3],[31.8,-25.8],[31.8,-25.5],[31.9,-2',
        '4.4],[31.7,-23.7],[31.2,-22.3],[32.2,-21.1],[32.5,-20.4],[32.7,-20.3],[32.8,-19.7],[32.6,-19.4],[32.7,-18.7],[32.8,-18],',
        '[32.8,-16.7],[32.3,-16.4],[31.9,-16.3],[31.6,-16.1],[31.2,-15.9],[30.3,-15.9],[30.3,-15.5],[30.2,-14.8],[33.2,-14],[33.8',
        ',-14.5],[34.1,-14.4],[34.5,-14.6],[34.5,-15],[34.3,-15.5],[34.4,-16.2],[35,-16.8],[35.3,-16.1],[35.8,-15.9],[35.7,-14.6]',
        ',[35.3,-13.9],[34.9,-13.6],[34.6,-13.6],[34.3,-12.3]]]]],["SWZ","SZ","SWZ","748","Eswatini",31.5,-26.5,["SWZ","SZ","748"',
        ',"ES","eSwatini","Eswatini","Kingdom of eSwatini"],[[[[32.1,-26.7],[31.9,-27.2],[31.3,-27.3],[30.7,-26.7],[30.7,-26.4],[',
        '30.9,-26],[31,-25.7],[31.3,-25.7],[31.8,-25.8],[32,-26.3]]]]],["AGO","AO","AGO","024","Angola",18,-12.2,["AGO","AO","024',
        '","Angola"],[[[[13,-4.8],[12.6,-5],[12.5,-5.2],[12.4,-5.7],[12.2,-5.8],[11.9,-5],[12.3,-4.6],[12.6,-4.4]]],[[[12.3,-6.1]',
        ',[12.7,-6],[13,-6],[13.4,-5.9],[16.3,-5.9],[16.6,-6.6],[16.9,-7.2],[17.1,-7.5],[17.5,-8.1],[18.1,-8],[18.5,-7.8],[19,-8]',
        ',[19.2,-7.7],[19.4,-7.2],[20,-7.1],[20.1,-6.9],[20.6,-6.9],[20.5,-7.3],[21.7,-7.3],[21.7,-7.9],[21.9,-8.3],[21.8,-8.9],[',
        '21.9,-9.5],[22.2,-9.9],[22.2,-11.1],[22.4,-11],[22.8,-11],[23.5,-10.9],[23.9,-10.9],[24,-11.2],[23.9,-11.7],[24.1,-12.2]',
        ',[23.9,-12.6],[24,-12.9],[21.9,-12.9],[21.9,-16.1],[22.6,-16.9],[23.2,-17.5],[21.4,-17.9],[19,-17.8],[18.3,-17.3],[14.2,',
        '-17.4],[14.1,-17.4],[13.5,-17],[12.8,-16.9],[12.2,-17.1],[11.7,-17.3],[11.6,-16.7],[11.8,-15.8],[12.1,-14.9],[12.2,-14.4',
        '],[12.5,-13.5],[12.7,-13.1],[13.3,-12.5],[13.6,-12],[13.7,-11.3],[13.7,-10.7],[13.4,-10.4],[13.1,-9.8],[12.9,-9.2],[12.9',
        ',-9],[13.2,-8.6],[12.9,-7.6],[12.7,-6.9],[12.2,-6.3]]]]],["BDI","BI","BDI","108","Burundi",29.9,-3.3,["BDI","BI","108","',
        'Burundi"],[[[[30.5,-2.4],[30.5,-2.8],[30.7,-3],[30.8,-3.4],[30.5,-3.6],[30.1,-4.1],[29.8,-4.5],[29.3,-4.5],[29.3,-3.3],[',
        '29,-2.8],[29.6,-2.9],[29.9,-2.3]]]]],["ISR","IL","ISR","376","Israel",34.8,30.9,["ISR","IL","376","IS1","IS","Israel"],[',
        '[[[35.7,32.7],[35.5,32.4],[35.2,32.5],[35,31.9],[35.2,31.8],[35,31.6],[34.9,31.4],[35.4,31.5],[35.4,31.1],[34.9,29.5],[3',
        '4.8,29.8],[34.3,31.2],[34.6,31.5],[34.5,31.6],[34.8,32.1],[35,32.8],[35.1,33.1],[35.5,33.1],[35.6,33.3],[35.8,33.3],[35.',
        '8,32.9]]]]],["LBN","LB","LBN","422","Lebanon",36,34.1,["LBN","LB","422","Lebanon"],[[[[35.8,33.3],[35.6,33.3],[35.5,33.1',
        '],[35.1,33.1],[35.5,33.9],[36,34.6],[36.4,34.6],[36.6,34.2],[36.1,33.8]]]]],["MDG","MG","MDG","450","Madagascar",46.7,-1',
        '8.6,["MDG","MG","450","Madagascar"],[[[[49.5,-12.5],[49.8,-12.9],[50.1,-13.6],[50.2,-14.8],[50.5,-15.2],[50.4,-15.7],[50',
        '.2,-16],[49.9,-15.4],[49.7,-15.7],[49.9,-16.5],[49.8,-16.9],[49.5,-17.1],[49.4,-18],[49,-19.1],[48.5,-20.5],[47.9,-22.4]',
        ',[47.5,-23.8],[47.1,-24.9],[46.3,-25.2],[45.4,-25.6],[44.8,-25.3],[44,-25],[43.8,-24.5],[43.7,-23.6],[43.3,-22.8],[43.3,',
        '-22.1],[43.4,-21.3],[43.9,-21.2],[43.9,-20.8],[44.4,-20.1],[44.5,-19.4],[44.2,-19],[44,-18.3],[44,-17.4],[44.3,-16.9],[4',
        '4.4,-16.2],[44.9,-16.2],[45.5,-16],[45.9,-15.8],[46.3,-15.8],[46.9,-15.2],[47.7,-14.6],[48,-14.1],[47.9,-13.7],[48.3,-13',
        '.8],[48.8,-13.1],[48.9,-12.5],[49.2,-12]]]]],["PSX","PS","PSE","275","Palestine",35.3,32,["PSX","PS","PSE","275","IS1","',
        'PAL","GZ","WBG","Palestine","Israel"],[[[[35.4,31.5],[34.9,31.4],[35,31.6],[35.2,31.8],[35,31.9],[35.2,32.5],[35.5,32.4]',
        ',[35.5,31.8]]]]],["GMB","GM","GMB","270","The Gambia",-15,13.6,["GMB","GM","270","Gambia","The Gambia"],[[[[-16.7,13.6],',
        '[-15.6,13.6],[-15.4,13.9],[-15.1,13.9],[-14.7,13.6],[-14.4,13.6],[-14,13.8],[-13.8,13.5],[-14.3,13.3],[-14.7,13.3],[-15.',
        '1,13.5],[-15.5,13.3],[-15.7,13.3],[-15.9,13.1],[-16.8,13.2]]]]],["TUN","TN","TUN","788","Tunisia",9,33.7,["TUN","TN","78',
        '8","Tunisia"],[[[[9.5,30.3],[9.1,32.1],[8.4,32.5],[8.4,32.7],[7.6,33.3],[7.5,34.1],[8.1,34.7],[8.4,35.5],[8.2,36.4],[8.4',
        ',36.9],[9.5,37.3],[10.2,37.2],[10.2,36.7],[11,37.1],[11.1,36.9],[10.6,36.4],[10.6,35.9],[10.9,35.7],[10.8,34.8],[10.1,34',
        '.3],[10.3,33.8],[10.9,33.8],[11.1,33.3],[11.5,33.1],[11.4,32.4],[10.9,32.1],[10.6,31.8],[10,31.4],[10.1,31],[10,30.5]]]]',
        '],["DZA","DZ","DZA","012","Algeria",2.8,27.4,["DZA","DZ","012","Algeria"],[[[[-8.7,27.4],[-8.7,27.6],[-8.7,27.7],[-8.7,2',
        '8.8],[-7.1,29.6],[-6.1,29.7],[-5.2,30],[-4.9,30.5],[-3.7,30.9],[-3.6,31.6],[-3.1,31.7],[-2.6,32.1],[-1.3,32.3],[-1.1,32.',
        '7],[-1.4,32.9],[-1.7,33.9],[-1.8,34.5],[-2.2,35.2],[-1.2,35.7],[-0.1,35.9],[0.5,36.3],[1.5,36.6],[3.2,36.8],[4.8,36.9],[',
        '5.3,36.7],[6.3,37.1],[7.3,37.1],[7.7,36.9],[8.4,36.9],[8.2,36.4],[8.4,35.5],[8.1,34.7],[7.5,34.1],[7.6,33.3],[8.4,32.7],',
        '[8.4,32.5],[9.1,32.1],[9.5,30.3],[9.8,29.4],[9.9,29],[9.7,28.1],[9.8,27.7],[9.6,27.1],[9.7,26.5],[9.3,26.1],[9.9,25.4],[',
        '9.9,24.9],[10.3,24.4],[10.8,24.6],[11.6,24.1],[12,23.5],[8.6,21.6],[5.7,19.6],[4.3,19.2],[3.2,19.1],[3.1,19.7],[2.7,19.9',
        '],[2.1,20.1],[1.8,20.6],[-1.6,22.8],[-4.9,25]]]]],["JOR","JO","JOR","400","Jordan",36.4,30.8,["JOR","JO","400","J","Jord',
        'an"],[[[[35.5,32.4],[35.7,32.7],[36.8,32.3],[38.8,33.4],[39.2,32.2],[39,32],[37,31.5],[38,30.5],[37.7,30.3],[37.5,30],[3',
        '6.7,29.9],[36.5,29.5],[36.1,29.2],[35,29.4],[34.9,29.5],[35.4,31.1],[35.4,31.5],[35.5,31.8]]]]],["ARE","AE","ARE","784",',
        '"United Arab Emirates",54.5,23.5,["ARE","AE","784","United Arab Emirates"],[[[[51.6,24.2],[51.8,24.3],[51.8,24],[52.6,24',
        '.2],[53.4,24.2],[54,24.1],[54.7,24.8],[55.4,25.4],[56.1,26.1],[56.3,25.7],[56.4,24.9],[55.9,24.9],[55.8,24.3],[56,24.1],',
        '[55.5,23.9],[55.5,23.5],[55.2,23.1],[55.2,22.7],[55,22.5],[52,23],[51.6,24]]]]],["QAT","QA","QAT","634","Qatar",51.1,25.',
        '2,["QAT","QA","634","Qatar"],[[[[50.8,24.8],[50.7,25.5],[51,26],[51.3,26.1],[51.6,25.8],[51.6,25.2],[51.4,24.6],[51.1,24',
        '.6]]]]],["KWT","KW","KWT","414","Kuwait",47.3,29.4,["KWT","KW","414","Kuwait"],[[[[48,30],[48.2,29.5],[48.1,29.3],[48.4,',
        '28.6],[47.7,28.5],[47.5,29],[46.6,29.1],[47.3,30.1]]]]],["IRQ","IQ","IRQ","368","Iraq",43.3,33.1,["IRQ","IQ","368","Iraq',
        '"],[[[[39.2,32.2],[38.8,33.4],[41,34.4],[41.4,35.6],[41.3,36.4],[41.8,36.6],[42.3,37.2],[42.8,37.4],[43.9,37.3],[44.3,37',
        '],[44.8,37.2],[45.4,36],[46.1,35.7],[46.2,35.1],[45.6,34.7],[45.4,34],[46.1,33],[47.3,32.5],[47.8,31.7],[47.7,31],[48,31',
        '],[48,30.5],[48.6,29.9],[48,30],[47.3,30.1],[46.6,29.1],[44.7,29.2],[41.9,31.2],[40.4,31.9]]]]],["OMN","OM","OMN","512",',
        '"Oman",57.3,22.1,["OMN","OM","512","Oman"],[[[[55.2,22.7],[55.2,23.1],[55.5,23.5],[55.5,23.9],[56,24.1],[55.8,24.3],[55.',
        '9,24.9],[56.4,24.9],[56.8,24.2],[57.4,23.9],[58.1,23.7],[58.7,23.6],[59.2,23],[59.5,22.7],[59.8,22.5],[59.8,22.3],[59.4,',
        '21.7],[59.3,21.4],[58.9,21.1],[58.5,20.4],[58,20.5],[57.8,20.2],[57.7,19.7],[57.8,19.1],[57.7,18.9],[57.2,18.9],[56.6,18',
        '.6],[56.5,18.1],[56.3,17.9],[55.7,17.9],[55.3,17.6],[55.3,17.2],[54.8,17],[54.2,17],[53.6,16.7],[53.1,16.7],[52.8,17.3],',
        '[52,19],[55,20],[55.7,22]]],[[[56.3,25.7],[56.1,26.1],[56.4,26.4],[56.5,26.3],[56.4,25.9]]]]],["VUT","VU","VUT","548","V',
        'anuatu",166.9,-15.4,["VUT","VU","548","Vanuatu"],[[[[167.2,-15.9],[167.8,-16.5],[167.5,-16.6],[167.2,-16.2]]],[[[166.8,-',
        '15.7],[166.6,-15.4],[166.6,-14.6],[167.1,-14.9],[167.3,-15.7],[167,-15.6]]]]],["KHM","KH","KHM","116","Cambodia",104.5,1',
        '2.6,["KHM","KH","116","Cambodia"],[[[[102.6,12.2],[102.3,13.4],[103,14.2],[104.3,14.4],[105.2,14.3],[106,13.9],[106.5,14',
        '.6],[107.4,14.2],[107.6,13.5],[107.5,12.3],[105.8,11.6],[106.2,11],[105.2,10.9],[104.3,10.5],[103.5,10.6],[103.1,11.2]]]',
        ']],["THA","TH","THA","764","Thailand",101.1,15.5,["THA","TH","764","Thailand"],[[[[105.2,14.3],[104.3,14.4],[103,14.2],[',
        '102.3,13.4],[102.6,12.2],[101.7,12.6],[100.8,12.6],[101,13.4],[100.1,13.4],[100,12.3],[99.5,10.8],[99.2,10],[99.2,9.2],[',
        '99.9,9.2],[100.3,8.3],[100.5,7.4],[101,6.9],[101.6,6.7],[102.1,6.2],[101.8,5.8],[101.2,5.7],[101.1,6.2],[100.3,6.6],[100',
        '.1,6.5],[99.7,6.8],[99.5,7.3],[99,7.9],[98.5,8.4],[98.3,7.8],[98.2,8.4],[98.3,9],[98.6,9.9],[99,11],[99.6,11.9],[99.2,12',
        '.8],[99.2,13.3],[99.1,13.8],[98.4,14.6],[98.2,15.1],[98.5,15.3],[98.9,16.2],[98.5,16.8],[97.9,17.6],[97.4,18.4],[97.8,18',
        '.6],[98.3,19.7],[99,19.8],[99.5,20.2],[100.1,20.4],[100.5,20.1],[100.6,19.5],[101.3,19.5],[101,18.4],[101.1,17.5],[102.1',
        ',18.1],[102.4,17.9],[103,18],[103.2,18.3],[104,18.2],[104.7,17.4],[104.8,16.4],[105.6,15.6],[105.5,14.7]]]]],["LAO","LA"',
        ',"LAO","418","Laos",102.5,19.4,["LAO","LA","418","Laos","Lao PDR"],[[[[107.4,14.2],[106.5,14.6],[106,13.9],[105.2,14.3],',
        '[105.5,14.7],[105.6,15.6],[104.8,16.4],[104.7,17.4],[104,18.2],[103.2,18.3],[103,18],[102.4,17.9],[102.1,18.1],[101.1,17',
        '.5],[101,18.4],[101.3,19.5],[100.6,19.5],[100.5,20.1],[100.1,20.4],[100.3,20.8],[101.2,21.4],[101.3,21.2],[101.8,21.2],[',
        '101.7,22.3],[102.2,22.5],[102.8,21.7],[103.2,20.8],[104.4,20.8],[104.8,19.9],[104.2,19.6],[103.9,19.3],[105.1,18.7],[105',
        '.9,17.5],[106.6,16.6],[107.3,15.9],[107.6,15.2]]]]],["MMR","MM","MMR","104","Myanmar",95.8,21.6,["MMR","MM","104","Myanm',
        'ar"],[[[[100.1,20.4],[99.5,20.2],[99,19.8],[98.3,19.7],[97.8,18.6],[97.4,18.4],[97.9,17.6],[98.5,16.8],[98.9,16.2],[98.5',
        ',15.3],[98.2,15.1],[98.4,14.6],[99.1,13.8],[99.2,13.3],[99.2,12.8],[99.6,11.9],[99,11],[98.6,9.9],[98.5,10.7],[98.8,11.4',
        '],[98.4,12],[98.5,13.1],[98.1,13.6],[97.8,14.8],[97.6,16.1],[97.2,16.9],[96.5,16.4],[95.4,15.7],[94.8,15.8],[94.2,16],[9',
        '4.5,17.3],[94.3,18.2],[93.5,19.4],[93.7,19.7],[93.1,19.9],[92.4,20.7],[92.3,21.5],[92.7,21.3],[92.7,22],[93.2,22.3],[93.',
        '1,22.7],[93.3,23],[93.3,24.1],[94.1,23.9],[94.6,24.7],[94.6,25.2],[95.2,26],[95.1,26.6],[96.4,27.3],[97.1,27.1],[97.1,27',
        '.7],[97.4,27.9],[97.3,28.3],[97.9,28.3],[98.2,27.7],[98.7,27.5],[98.7,26.7],[98.7,25.9],[97.7,25.1],[97.6,23.9],[98.7,24',
        '.1],[98.9,23.1],[99.5,22.9],[99.2,22.1],[100,21.7],[100.4,21.6],[101.2,21.8],[101.2,21.4],[100.3,20.8]]]]],["VNM","VN","',
        'VNM","704","Vietnam",105.4,21.7,["VNM","VN","704","Vietnam"],[[[[104.3,10.5],[105.2,10.9],[106.2,11],[105.8,11.6],[107.5',
        ',12.3],[107.6,13.5],[107.4,14.2],[107.6,15.2],[107.3,15.9],[106.6,16.6],[105.9,17.5],[105.1,18.7],[103.9,19.3],[104.2,19',
        '.6],[104.8,19.9],[104.4,20.8],[103.2,20.8],[102.8,21.7],[102.2,22.5],[102.7,22.7],[103.5,22.7],[104.5,22.8],[105.3,23.4]',
        ',[105.8,23],[106.7,22.8],[106.6,22.2],[107,21.8],[108.1,21.6],[106.7,20.7],[105.9,19.8],[105.7,19.1],[106.4,18],[107.4,1',
        '6.7],[108.3,16.1],[108.9,15.3],[109.3,13.4],[109.2,11.7],[108.4,11],[107.2,10.4],[106.4,9.5],[105.2,8.6],[104.8,9.2],[10',
        '5.1,9.9]]]]],["PRK","KP","PRK","408","North Korea",126.4,39.9,["PRK","KP","408","North Korea","Dem. Rep. Korea"],[[[[130',
        '.6,42.4],[130.8,42.2],[130.4,42.3],[130,41.9],[129.7,41.6],[129.7,40.9],[129.2,40.7],[129,40.5],[128.6,40.2],[128,40],[1',
        '27.5,39.8],[127.5,39.3],[127.4,39.2],[127.8,39.1],[128.3,38.6],[128.2,38.4],[127.8,38.3],[127.1,38.3],[126.7,37.8],[126.',
        '2,37.8],[126.2,37.7],[125.7,37.9],[125.6,37.8],[125.3,37.7],[125.2,37.9],[125,37.9],[124.7,38.1],[125,38.5],[125.2,38.7]',
        ',[125.1,38.8],[125.4,39.4],[125.3,39.6],[124.7,39.7],[124.3,39.9],[125.1,40.6],[126.2,41.1],[126.9,41.8],[127.3,41.5],[1',
        '28.2,41.5],[128.1,42],[129.6,42.4],[130,43]]]]],["KOR","KR","KOR","410","South Korea",128.1,36.4,["KOR","KR","410","Sout',
        'h Korea","Republic of Korea"],[[[[126.2,37.7],[126.2,37.8],[126.7,37.8],[127.1,38.3],[127.8,38.3],[128.2,38.4],[128.3,38',
        '.6],[129.2,37.4],[129.5,36.8],[129.5,35.6],[129.1,35.1],[128.2,34.9],[127.4,34.5],[126.5,34.4],[126.4,34.9],[126.6,35.7]',
        ',[126.1,36.7],[126.9,36.9]]]]],["MNG","MN","MNG","496","Mongolia",104.2,46,["MNG","MN","496","Mongolia"],[[[[87.8,49.3],',
        '[88.8,49.5],[90.7,50.3],[92.2,50.8],[93.1,50.5],[94.1,50.5],[94.8,50],[95.8,50],[97.3,49.7],[98.2,50.4],[97.8,51],[98.9,',
        '52],[100,51.6],[100.9,51.5],[102.1,51.3],[102.3,50.5],[103.7,50.1],[104.6,50.3],[105.9,50.4],[106.9,50.3],[107.9,49.8],[',
        '108.5,49.3],[109.4,49.3],[110.7,49.1],[111.6,49.4],[112.9,49.5],[114.4,50.2],[115,50.1],[115.5,49.8],[116.7,49.9],[116.2',
        ',49.1],[115.5,48.1],[115.7,47.7],[116.3,47.9],[117.3,47.7],[118.1,48.1],[118.9,47.7],[119.8,47],[119.7,46.7],[118.9,46.8',
        '],[117.4,46.7],[116.7,46.4],[116,45.7],[114.5,45.3],[113.5,44.8],[112.4,45],[111.9,45.1],[111.3,44.5],[111.7,44.1],[111.',
        '8,43.7],[111.1,43.4],[110.4,42.9],[109.2,42.5],[107.7,42.5],[106.1,42.1],[105,41.6],[104.5,41.9],[103.3,41.9],[101.8,42.',
        '5],[100.8,42.7],[99.5,42.5],[97.5,42.7],[96.3,42.7],[95.8,43.3],[95.3,44.2],[94.7,44.4],[93.5,45],[92.1,45.1],[90.9,45.3',
        '],[90.6,45.7],[91,46.9],[90.3,47.7],[88.9,48.1],[88,48.6]]]]],["IND","IN","IND","356","India",79.4,22.7,["IND","IN","356',
        '","India"],[[[[97.3,28.3],[97.4,27.9],[97.1,27.7],[97.1,27.1],[96.4,27.3],[95.1,26.6],[95.2,26],[94.6,25.2],[94.6,24.7],',
        '[94.1,23.9],[93.3,24.1],[93.3,23],[93.1,22.7],[93.2,22.3],[92.7,22],[92.1,23.6],[91.9,23.6],[91.7,23],[91.2,23.5],[91.5,',
        '24.1],[91.9,24.1],[92.4,25],[91.8,25.1],[90.9,25.1],[89.9,25.3],[89.8,26],[89.4,26],[88.6,26.4],[88.2,25.8],[88.9,25.2],',
        '[88.3,24.9],[88.1,24.5],[88.7,24.2],[88.5,23.6],[88.9,22.9],[89,22.1],[88.9,21.7],[88.2,21.7],[87,21.5],[87,20.7],[86.5,',
        '20.2],[85.1,19.5],[83.9,18.3],[83.2,17.7],[82.2,17],[82.2,16.6],[81.7,16.3],[80.8,16],[80.3,15.9],[80,15.1],[80.2,13.8],',
        '[80.3,13],[79.9,12.1],[79.9,10.4],[79.3,10.3],[78.9,9.5],[79.2,9.2],[78.3,8.9],[77.9,8.3],[77.5,8],[76.6,8.9],[76.1,10.3',
        '],[75.7,11.3],[75.4,11.8],[74.9,12.7],[74.6,14],[74.4,14.6],[73.5,16],[73.1,17.9],[72.8,19.2],[72.8,20.4],[72.6,21.4],[7',
        '1.2,20.8],[70.5,20.9],[69.2,22.1],[69.6,22.5],[69.3,22.8],[68.2,23.7],[68.8,24.4],[71,24.4],[70.8,25.2],[70.3,25.7],[70.',
        '2,26.5],[69.5,26.9],[70.6,28],[71.8,27.9],[72.8,29],[73.5,30],[74.4,31],[74.4,31.7],[75.3,32.3],[74.5,32.8],[74.1,33.4],',
        '[73.7,34.3],[74.2,34.7],[75.8,34.5],[76.9,34.7],[77.8,35.5],[78.9,34.3],[78.8,33.5],[79.2,33],[79.2,32.5],[78.5,32.6],[7',
        '8.7,31.5],[79.7,30.9],[81.1,30.2],[80.5,29.7],[80.1,28.8],[81.1,28.4],[82,27.9],[83.3,27.4],[84.7,27.2],[85.3,26.7],[86,',
        '26.6],[87.2,26.4],[88.1,26.4],[88.2,26.8],[88,27.4],[88.1,27.9],[88.7,28.1],[88.8,27.3],[88.8,27.1],[89.7,26.7],[90.4,26',
        '.9],[91.2,26.8],[92,26.8],[92.1,27.5],[91.7,27.8],[92.5,27.9],[93.4,28.6],[94.6,29.3],[95.4,29],[96.1,29.5],[96.6,28.8],',
        '[96.2,28.4]]]]],["BGD","BD","BGD","050","Bangladesh",89.7,24.2,["BGD","BD","050","Bangladesh"],[[[[92.7,22],[92.7,21.3],',
        '[92.3,21.5],[92.4,20.7],[92.1,21.2],[92,21.7],[91.8,22.2],[91.4,22.8],[90.5,22.8],[90.6,22.4],[90.3,21.8],[89.8,22],[89.',
        '7,21.9],[89.4,22],[89,22.1],[88.9,22.9],[88.5,23.6],[88.7,24.2],[88.1,24.5],[88.3,24.9],[88.9,25.2],[88.2,25.8],[88.6,26',
        '.4],[89.4,26],[89.8,26],[89.9,25.3],[90.9,25.1],[91.8,25.1],[92.4,25],[91.9,24.1],[91.5,24.1],[91.2,23.5],[91.7,23],[91.',
        '9,23.6],[92.1,23.6]]]]],["BTN","BT","BTN","064","Bhutan",90,27.5,["BTN","BT","064","Bhutan"],[[[[91.7,27.8],[92.1,27.5],',
        '[92,26.8],[91.2,26.8],[90.4,26.9],[89.7,26.7],[88.8,27.1],[88.8,27.3],[89.5,28],[90,28.3],[90.7,28.1],[91.3,28]]]]],["NP',
        'L","NP","NPL","524","Nepal",83.6,28.3,["NPL","NP","524","Nepal"],[[[[88.1,27.9],[88,27.4],[88.2,26.8],[88.1,26.4],[87.2,',
        '26.4],[86,26.6],[85.3,26.7],[84.7,27.2],[83.3,27.4],[82,27.9],[81.1,28.4],[80.1,28.8],[80.5,29.7],[81.1,30.2],[81.5,30.4',
        '],[82.3,30.1],[83.3,29.5],[83.9,29.3],[84.2,28.8],[85,28.6],[85.8,28.2],[87,28]]]]],["PAK","PK","PAK","586","Pakistan",6',
        '8.5,29.3,["PAK","PK","586","Pakistan"],[[[[77.8,35.5],[76.9,34.7],[75.8,34.5],[74.2,34.7],[73.7,34.3],[74.1,33.4],[74.5,',
        '32.8],[75.3,32.3],[74.4,31.7],[74.4,31],[73.5,30],[72.8,29],[71.8,27.9],[70.6,28],[69.5,26.9],[70.2,26.5],[70.3,25.7],[7',
        '0.8,25.2],[71,24.4],[68.8,24.4],[68.2,23.7],[67.4,23.9],[67.1,24.7],[66.4,25.4],[64.5,25.2],[62.9,25.2],[61.5,25.1],[61.',
        '9,26.2],[63.3,26.8],[63.2,27.2],[62.8,27.4],[62.7,28.3],[61.8,28.7],[61.4,29.3],[60.9,29.8],[62.5,29.3],[63.6,29.5],[64.',
        '1,29.3],[64.4,29.6],[65,29.5],[66.3,29.9],[66.4,30.7],[66.9,31.3],[67.7,31.3],[67.8,31.6],[68.6,31.7],[68.9,31.6],[69.3,',
        '31.9],[69.3,32.5],[69.7,33.1],[70.3,33.4],[69.9,34],[70.9,34],[71.2,34.3],[71.1,34.7],[71.6,35.2],[71.5,35.7],[71.3,36.1',
        '],[71.8,36.5],[72.9,36.7],[74.1,36.8],[74.6,37],[75.2,37.1],[75.9,36.7],[76.2,35.9]]]]],["AFG","AF","AFG","004","Afghani',
        'stan",66.5,34.2,["AFG","AF","004","Afghanistan"],[[[[66.5,37.4],[67.1,37.4],[67.8,37.1],[68.1,37],[68.9,37.3],[69.2,37.2',
        '],[69.5,37.6],[70.1,37.6],[70.3,37.7],[70.4,38.1],[70.8,38.5],[71.3,38.3],[71.2,38],[71.5,37.9],[71.4,37.1],[71.8,36.7],',
        '[72.2,36.9],[72.6,37],[73.3,37.5],[73.9,37.4],[75,37.4],[75.2,37.1],[74.6,37],[74.1,36.8],[72.9,36.7],[71.8,36.5],[71.3,',
        '36.1],[71.5,35.7],[71.6,35.2],[71.1,34.7],[71.2,34.3],[70.9,34],[69.9,34],[70.3,33.4],[69.7,33.1],[69.3,32.5],[69.3,31.9',
        '],[68.9,31.6],[68.6,31.7],[67.8,31.6],[67.7,31.3],[66.9,31.3],[66.4,30.7],[66.3,29.9],[65,29.5],[64.4,29.6],[64.1,29.3],',
        '[63.6,29.5],[62.5,29.3],[60.9,29.8],[61.8,30.7],[61.7,31.4],[60.9,31.5],[60.9,32.2],[60.5,33],[61,33.5],[60.5,33.7],[60.',
        '8,34.4],[61.2,35.7],[62.2,35.3],[63,35.4],[63.2,35.9],[64,36],[64.5,36.3],[64.7,37.1],[65.6,37.3],[65.7,37.7],[66.2,37.4',
        ']]]]],["TJK","TJ","TJK","762","Tajikistan",72.6,38.2,["TJK","TJ","762","Tajikistan"],[[[[67.8,37.1],[68.4,38.2],[68.2,38',
        '.9],[67.4,39.1],[67.7,39.6],[68.5,39.5],[69,40.1],[69.3,40.7],[70.7,41],[70.5,40.5],[70.6,40.2],[71,40.2],[70.6,39.9],[6',
        '9.6,40.1],[69.5,39.5],[70.5,39.6],[71.8,39.3],[73.7,39.4],[73.9,38.5],[74.3,38.6],[74.9,38.4],[74.8,38],[75,37.4],[73.9,',
        '37.4],[73.3,37.5],[72.6,37],[72.2,36.9],[71.8,36.7],[71.4,37.1],[71.5,37.9],[71.2,38],[71.3,38.3],[70.8,38.5],[70.4,38.1',
        '],[70.3,37.7],[70.1,37.6],[69.5,37.6],[69.2,37.2],[68.9,37.3],[68.1,37]]]]],["KGZ","KG","KGZ","417","Kyrgyzstan",74.5,41',
        '.7,["KGZ","KG","417","Kyrgyzstan"],[[[[71,42.3],[71.2,42.7],[71.8,42.8],[73.5,42.5],[73.6,43.1],[74.2,43.3],[75.6,42.9],',
        '[76,43],[77.7,43],[79.1,42.9],[79.6,42.5],[80.3,42.3],[80.1,42.1],[78.5,41.6],[78.2,41.2],[76.9,41.1],[76.5,40.4],[75.5,',
        '40.6],[74.8,40.4],[73.8,39.9],[74,39.7],[73.7,39.4],[71.8,39.3],[70.5,39.6],[69.5,39.5],[69.6,40.1],[70.6,39.9],[71,40.2',
        '],[71.8,40.1],[73.1,40.9],[71.9,41.4],[71.2,41.1],[70.4,41.5],[71.3,42.2]]]]],["TKM","TM","TKM","795","Turkmenistan",58.',
        '7,39.9,["TKM","TM","795","Turkmenistan"],[[[[52.5,41.8],[52.9,42.1],[54.1,42.3],[54.8,42],[55.5,41.3],[56,41.3],[57.1,41',
        '.3],[56.9,41.8],[57.8,42.2],[58.6,42.8],[60,42.2],[60.1,41.4],[60.5,41.2],[61.5,41.3],[61.9,41.1],[62.4,40.1],[63.5,39.4',
        '],[64.2,38.9],[65.2,38.4],[66.5,38],[66.5,37.4],[66.2,37.4],[65.7,37.7],[65.6,37.3],[64.7,37.1],[64.5,36.3],[64,36],[63.',
        '2,35.9],[63,35.4],[62.2,35.3],[61.2,35.7],[61.1,36.5],[60.4,36.5],[59.2,37.4],[58.4,37.5],[57.3,38],[56.6,38.1],[56.2,37',
        '.9],[55.5,38],[54.8,37.4],[53.9,37.2],[53.7,37.9],[53.9,39],[53.1,39.3],[53.4,40],[52.7,40],[52.9,40.9],[53.9,40.6],[54.',
        '7,41],[54,41.6],[53.7,42.1],[52.9,41.9],[52.8,41.1]]]]],["IRN","IR","IRN","364","Iran",54.9,32.2,["IRN","IR","364","Iran',
        '"],[[[[48.6,29.9],[48,30.5],[48,31],[47.7,31],[47.8,31.7],[47.3,32.5],[46.1,33],[45.4,34],[45.6,34.7],[46.2,35.1],[46.1,',
        '35.7],[45.4,36],[44.8,37.2],[44.2,38],[44.4,38.3],[44.1,39.4],[44.8,39.7],[45,39.3],[45.5,38.9],[46.1,38.7],[46.5,38.8],',
        '[47.7,39.5],[48.1,39.6],[48.4,39.3],[48,38.8],[48.6,38.3],[48.9,38.3],[49.2,37.6],[50.1,37.4],[50.8,36.9],[52.3,36.7],[5',
        '3.8,37],[53.9,37.2],[54.8,37.4],[55.5,38],[56.2,37.9],[56.6,38.1],[57.3,38],[58.4,37.5],[59.2,37.4],[60.4,36.5],[61.1,36',
        '.5],[61.2,35.7],[60.8,34.4],[60.5,33.7],[61,33.5],[60.5,33],[60.9,32.2],[60.9,31.5],[61.7,31.4],[61.8,30.7],[60.9,29.8],',
        '[61.4,29.3],[61.8,28.7],[62.7,28.3],[62.8,27.4],[63.2,27.2],[63.3,26.8],[61.9,26.2],[61.5,25.1],[59.6,25.4],[58.5,25.6],',
        '[57.4,25.7],[57,27],[56.5,27.1],[55.7,27],[54.7,26.5],[53.5,26.8],[52.5,27.6],[51.5,27.9],[50.9,28.8],[50.1,30.1],[49.6,',
        '30],[48.9,30.3]]]]],["SYR","SY","SYR","760","Syria",38.3,35,["SYR","SY","760","Syria"],[[[[35.7,32.7],[35.8,32.9],[35.8,',
        '33.3],[36.1,33.8],[36.6,34.2],[36.4,34.6],[36,34.6],[35.9,35.4],[36.1,35.8],[36.4,36],[36.7,36.3],[36.7,36.8],[37.1,36.6',
        '],[38.2,36.9],[38.7,36.7],[39.5,36.7],[40.7,37.1],[41.2,37.1],[42.3,37.2],[41.8,36.6],[41.3,36.4],[41.4,35.6],[41,34.4],',
        '[38.8,33.4],[36.8,32.3]]]]],["ARM","AM","ARM","051","Armenia",44.8,40.5,["ARM","AM","051","Armenia"],[[[[46.5,38.8],[46.',
        '1,38.7],[45.7,39.3],[45.7,39.5],[45.3,39.5],[45,39.7],[44.8,39.7],[44.4,40],[43.7,40.3],[43.8,40.7],[43.6,41.1],[45,41.2',
        '],[45.2,41],[45.6,40.8],[45.4,40.6],[45.9,40.2],[45.6,39.9],[46,39.6],[46.5,39.5]]]]],["SWE","SE","SWE","752","Sweden",1',
        '9,65.9,["SWE","SE","752","S","Sweden"],[[[[11,58.9],[11.5,59.4],[12.3,60.1],[12.6,61.3],[12,61.8],[11.9,63.1],[12.6,64.1',
        '],[13.6,64],[13.9,64.4],[13.6,64.8],[15.1,66.2],[16.1,67.3],[16.8,68],[17.7,68],[18,68.6],[19.9,68.4],[20,69.1],[20.6,69',
        '.1],[22,68.6],[23.5,67.9],[23.6,66.4],[23.9,66],[22.2,65.7],[21.2,65],[21.4,64.4],[19.8,63.6],[17.8,62.7],[17.1,61.3],[1',
        '7.8,60.6],[18.8,60.1],[17.9,59],[16.8,58.7],[16.4,57],[15.9,56.1],[14.7,56.2],[14.1,55.4],[12.9,55.4],[12.6,56.3],[11.8,',
        '57.4]]]]],["BLR","BY","BLR","112","Belarus",28.4,53.8,["BLR","BY","112","Belarus"],[[[[28.2,56.2],[29.2,55.9],[29.4,55.7',
        '],[29.9,55.8],[30.9,55.6],[31,55.1],[30.8,54.8],[31.4,54.2],[31.8,54],[31.7,53.8],[32.4,53.6],[32.7,53.4],[32.3,53.1],[3',
        '1.5,53.2],[31.3,53.1],[31.5,52.7],[31.8,52.1],[30.9,52],[30.6,51.8],[30.6,51.3],[30.2,51.4],[29.3,51.4],[29,51.6],[28.6,',
        '51.4],[28.2,51.6],[27.5,51.6],[26.3,51.8],[25.3,51.9],[24.6,51.9],[24,51.6],[23.5,51.6],[23.5,52],[23.2,52.5],[23.8,52.7',
        '],[23.8,53.1],[23.5,53.5],[23.5,53.9],[24.5,53.9],[25.5,54.3],[25.8,54.8],[26.6,55.2],[26.5,55.6],[27.1,55.8]]]]],["UKR"',
        ',"UA","UKR","804","Ukraine",32.1,49.7,["UKR","UA","804","Ukraine"],[[[[31.8,52.1],[32.2,52.1],[32.4,52.3],[32.7,52.2],[3',
        '3.8,52.3],[34.4,51.8],[34.1,51.6],[34.2,51.3],[35,51.2],[35.4,50.8],[35.4,50.6],[36.6,50.2],[37.4,50.4],[38,49.9],[38.6,',
        '49.9],[40.1,49.6],[40.1,49.3],[39.7,48.8],[39.9,48.2],[39.7,47.9],[38.8,47.8],[38.3,47.5],[38.2,47.1],[37.4,47],[36.8,46',
        '.7],[35.8,46.6],[35,46.3],[35,45.7],[34.9,45.8],[34.7,46],[34.4,46],[33.7,46.2],[33.4,46],[33.3,46.1],[31.7,46.3],[31.7,',
        '46.7],[30.7,46.6],[30.4,46],[29.6,45.3],[29.1,45.5],[28.7,45.3],[28.2,45.5],[28.5,45.6],[28.7,45.9],[28.9,46.3],[28.9,46',
        '.4],[29.1,46.5],[29.2,46.4],[29.8,46.3],[30,46.4],[29.8,46.5],[29.9,46.7],[29.6,46.9],[29.4,47.3],[29.1,47.5],[29.1,47.8',
        '],[28.7,48.1],[28.3,48.2],[27.5,48.5],[26.9,48.4],[26.6,48.2],[26.2,48.2],[25.9,48],[25.2,47.9],[24.9,47.7],[24.4,48],[2',
        '3.8,48],[23.1,48.1],[22.7,47.9],[22.6,48.2],[22.1,48.4],[22.3,48.8],[22.6,49.1],[22.8,49],[22.5,49.5],[23.4,50.3],[23.9,',
        '50.4],[24,50.7],[23.5,51.6],[24,51.6],[24.6,51.9],[25.3,51.9],[26.3,51.8],[27.5,51.6],[28.2,51.6],[28.6,51.4],[29,51.6],',
        '[29.3,51.4],[30.2,51.4],[30.6,51.3],[30.6,51.8],[30.9,52]]]]],["POL","PL","POL","616","Poland",19.5,52,["POL","PL","616"',
        ',"Poland"],[[[[23.5,53.9],[23.5,53.5],[23.8,53.1],[23.8,52.7],[23.2,52.5],[23.5,52],[23.5,51.6],[24,50.7],[23.9,50.4],[2',
        '3.4,50.3],[22.5,49.5],[22.8,49],[22.6,49.1],[21.6,49.5],[20.9,49.3],[20.4,49.4],[19.8,49.2],[19.3,49.6],[18.9,49.4],[18.',
        '9,49.5],[18.4,50],[17.6,50],[17.6,50.4],[16.9,50.5],[16.7,50.2],[16.2,50.4],[16.2,50.7],[15.5,50.8],[15,51.1],[14.6,51.7',
        '],[14.7,52.1],[14.4,52.6],[14.1,53],[14.4,53.2],[14.1,53.8],[14.8,54.1],[16.4,54.5],[17.6,54.9],[18.6,54.7],[18.7,54.4],',
        '[19.7,54.4],[20.9,54.3],[22.7,54.3],[23.2,54.2]]]]],["AUT","AT","AUT","040","Austria",14.1,47.5,["AUT","AT","040","A","A',
        'ustria"],[[[[17,48.1],[16.9,47.7],[16.3,47.7],[16.5,47.5],[16.2,46.9],[16,46.7],[15.1,46.7],[14.6,46.4],[13.8,46.5],[12.',
        '4,46.8],[12.2,47.1],[11.2,46.9],[11,46.8],[10.4,46.9],[9.9,46.9],[9.5,47.1],[9.6,47.3],[9.6,47.5],[9.9,47.6],[10.4,47.3]',
        ',[10.5,47.6],[11.4,47.5],[12.1,47.7],[12.6,47.7],[12.9,47.5],[13,47.6],[12.9,48.3],[13.2,48.4],[13.6,48.9],[14.3,48.6],[',
        '14.9,49],[15.3,49],[16,48.7],[16.5,48.8],[17,48.6],[16.9,48.5]]]]],["HUN","HU","HUN","348","Hungary",19.4,47.1,["HUN","H',
        'U","348","Hungary"],[[[[22.1,48.4],[22.6,48.2],[22.7,47.9],[22.1,47.7],[21.6,47],[21,46.3],[20.2,46.1],[19.6,46.2],[18.8',
        ',45.9],[18.5,45.8],[17.6,46],[16.9,46.4],[16.6,46.5],[16.4,46.8],[16.2,46.9],[16.5,47.5],[16.3,47.7],[16.9,47.7],[17,48.',
        '1],[17.5,47.9],[17.9,47.8],[18.7,47.9],[18.8,48.1],[19.2,48.1],[19.7,48.3],[19.8,48.2],[20.2,48.3],[20.5,48.6],[20.8,48.',
        '6],[21.9,48.3]]]]],["MDA","MD","MDA","498","Moldova",28.5,47.4,["MDA","MD","498","Moldova"],[[[[26.6,48.2],[26.9,48.4],[',
        '27.5,48.5],[28.3,48.2],[28.7,48.1],[29.1,47.8],[29.1,47.5],[29.4,47.3],[29.6,46.9],[29.9,46.7],[29.8,46.5],[30,46.4],[29',
        '.8,46.3],[29.2,46.4],[29.1,46.5],[28.9,46.4],[28.9,46.3],[28.7,45.9],[28.5,45.6],[28.2,45.5],[28.1,45.9],[28.2,46.4],[28',
        '.1,46.8],[27.6,47.4],[27.2,47.8],[26.9,48.1]]]]],["ROU","RO","ROU","642","Romania",25,45.7,["ROU","RO","642","ROM","Roma',
        'nia"],[[[[28.2,45.5],[28.7,45.3],[29.1,45.5],[29.6,45.3],[29.6,45],[29.1,44.8],[28.8,44.9],[28.6,43.7],[28,43.8],[27.2,4',
        '4.2],[26.1,43.9],[25.6,43.7],[24.1,43.7],[23.3,43.9],[22.9,43.8],[22.7,44.2],[22.5,44.4],[22.7,44.6],[22.5,44.7],[22.1,4',
        '4.5],[21.6,44.8],[21.5,45.2],[20.9,45.4],[20.8,45.7],[20.2,46.1],[21,46.3],[21.6,47],[22.1,47.7],[22.7,47.9],[23.1,48.1]',
        ',[23.8,48],[24.4,48],[24.9,47.7],[25.2,47.9],[25.9,48],[26.2,48.2],[26.6,48.2],[26.9,48.1],[27.2,47.8],[27.6,47.4],[28.1',
        ',46.8],[28.2,46.4],[28.1,45.9]]]]],["LTU","LT","LTU","440","Lithuania",24.1,55.1,["LTU","LT","440","Lithuania"],[[[[26.5',
        ',55.6],[26.6,55.2],[25.8,54.8],[25.5,54.3],[24.5,53.9],[23.5,53.9],[23.2,54.2],[22.7,54.3],[22.7,54.6],[22.8,54.9],[22.3',
        ',55],[21.3,55.2],[21.1,56],[22.2,56.3],[23.9,56.3],[24.9,56.4],[25,56.2],[25.5,56.1]]]]],["LVA","LV","LVA","428","Latvia',
        '",25.5,57.1,["LVA","LV","428","Latvia"],[[[[27.3,57.5],[27.8,57.2],[27.9,56.8],[28.2,56.2],[27.1,55.8],[26.5,55.6],[25.5',
        ',56.1],[25,56.2],[24.9,56.4],[23.9,56.3],[22.2,56.3],[21.1,56],[21.1,56.8],[21.6,57.4],[22.5,57.8],[23.3,57],[24.1,57],[',
        '24.3,57.8],[25.2,58],[25.6,57.8],[26.5,57.5]]]]],["EST","EE","EST","233","Estonia",25.9,58.7,["EST","EE","233","Estonia"',
        '],[[[[28,59.5],[28.1,59.3],[27.4,58.7],[27.7,57.8],[27.3,57.5],[26.5,57.5],[25.6,57.8],[25.2,58],[24.3,57.8],[24.4,58.4]',
        ',[24.1,58.3],[23.4,58.6],[23.3,59.2],[24.6,59.5],[25.9,59.6],[26.9,59.4]]]]],["DEU","DE","DEU","276","Germany",9.7,51,["',
        'DEU","DE","276","D","Germany"],[[[[14.1,53.8],[14.4,53.2],[14.1,53],[14.4,52.6],[14.7,52.1],[14.6,51.7],[15,51.1],[14.6,',
        '51],[14.3,51.1],[14.1,50.9],[13.3,50.7],[13,50.5],[12.2,50.3],[12.4,50],[12.5,49.5],[13,49.3],[13.6,48.9],[13.2,48.4],[1',
        '2.9,48.3],[13,47.6],[12.9,47.5],[12.6,47.7],[12.1,47.7],[11.4,47.5],[10.5,47.6],[10.4,47.3],[9.9,47.6],[9.6,47.5],[8.5,4',
        '7.8],[8.3,47.6],[7.5,47.6],[7.6,48.3],[8.1,49],[6.7,49.2],[6.2,49.5],[6.2,49.9],[6,50.1],[6.2,50.8],[6,51.9],[6.6,51.9],',
        '[6.8,52.2],[7.1,53.1],[6.9,53.5],[7.1,53.7],[7.9,53.7],[8.1,53.5],[8.8,54],[8.6,54.4],[8.5,55],[9.3,54.8],[9.9,55],[9.9,',
        '54.6],[11,54.4],[10.9,54],[12,54.2],[12.5,54.5],[13.6,54.1]]]]],["BGR","BG","BGR","100","Bulgaria",25.2,42.5,["BGR","BG"',
        ',"100","Bulgaria"],[[[[22.7,44.2],[22.9,43.8],[23.3,43.9],[24.1,43.7],[25.6,43.7],[26.1,43.9],[27.2,44.2],[28,43.8],[28.',
        '6,43.7],[28,43.3],[27.7,42.6],[28,42],[27.1,42.1],[26.1,41.8],[26.1,41.3],[25.2,41.2],[24.5,41.6],[23.7,41.3],[23,41.3],',
        '[22.9,42],[22.4,42.3],[22.5,42.5],[22.4,42.6],[22.6,42.9],[23,43.2],[22.5,43.6],[22.4,44]]]]],["GRC","GR","GRC","300","G',
        'reece",21.7,39.5,["GRC","GR","300","Greece"],[[[[26.3,35.3],[26.2,35],[24.7,34.9],[24.7,35.1],[23.5,35.3],[23.7,35.7],[2',
        '4.2,35.4],[25,35.4],[25.8,35.4],[25.7,35.2]]],[[[23,41.3],[23.7,41.3],[24.5,41.6],[25.2,41.2],[26.1,41.3],[26.1,41.8],[2',
        '6.6,41.6],[26.3,40.9],[26.1,40.8],[25.4,40.9],[24.9,40.9],[23.7,40.7],[24.4,40.1],[23.9,40],[23.3,40],[22.8,40.5],[22.6,',
        '40.3],[22.8,39.7],[23.4,39.2],[23,39],[23.5,38.5],[24,38.2],[24,37.7],[23.1,37.9],[23.4,37.4],[22.8,37.3],[23.2,36.4],[2',
        '2.5,36.4],[21.7,36.8],[21.3,37.6],[21.1,38.3],[20.7,38.8],[20.2,39.3],[20.2,39.6],[20.6,40.1],[20.7,40.4],[21,40.6],[21,',
        '40.8],[21.7,40.9],[22.1,41.1],[22.6,41.1],[22.8,41.3]]]]],["TUR","TR","TUR","792","Turkey",34.5,39.3,["TUR","TR","792","',
        'Turkey"],[[[[44.8,37.2],[44.3,37],[43.9,37.3],[42.8,37.4],[42.3,37.2],[41.2,37.1],[40.7,37.1],[39.5,36.7],[38.7,36.7],[3',
        '8.2,36.9],[37.1,36.6],[36.7,36.8],[36.7,36.3],[36.4,36],[36.1,35.8],[35.8,36.3],[36.2,36.7],[35.6,36.6],[34.7,36.8],[34,',
        '36.2],[32.5,36.1],[31.7,36.6],[30.6,36.7],[30.4,36.3],[29.7,36.1],[28.7,36.7],[27.6,36.7],[27,37.7],[26.3,38.2],[26.8,39',
        '],[26.2,39.5],[27.3,40.4],[28.8,40.5],[29.2,41.2],[31.1,41.1],[32.3,41.7],[33.5,42],[35.2,42],[36.9,41.3],[38.3,40.9],[3',
        '9.5,41.1],[40.4,41],[41.6,41.5],[42.6,41.6],[43.6,41.1],[43.8,40.7],[43.7,40.3],[44.4,40],[44.8,39.7],[44.1,39.4],[44.4,',
        '38.3],[44.2,38]]],[[[26.1,41.8],[27.1,42.1],[28,42],[28.1,41.6],[29,41.3],[28.8,41.1],[27.6,41],[27.2,40.7],[26.4,40.2],',
        '[26,40.6],[26.1,40.8],[26.3,40.9],[26.6,41.6]]]]],["ALB","AL","ALB","008","Albania",20.1,40.7,["ALB","AL","008","Albania',
        '"],[[[[21,40.8],[21,40.6],[20.7,40.4],[20.6,40.1],[20.2,39.6],[20,39.7],[20,39.9],[19.4,40.3],[19.3,40.7],[19.4,41.4],[1',
        '9.5,41.7],[19.4,41.9],[19.3,42.2],[19.7,42.7],[19.8,42.5],[20.1,42.6],[20.3,42.3],[20.5,42.2],[20.6,41.9],[20.5,41.5],[2',
        '0.6,41.1]]]]],["HRV","HR","HRV","191","Croatia",16.4,45.8,["HRV","HR","191","Croatia"],[[[[16.6,46.5],[16.9,46.4],[17.6,',
        '46],[18.5,45.8],[18.8,45.9],[19.1,45.5],[19.4,45.2],[19,44.9],[18.6,45.1],[17.9,45.1],[17,45.2],[16.5,45.2],[16.3,45],[1',
        '6,45.2],[15.8,44.8],[16.2,44.4],[16.5,44],[16.9,43.7],[17.3,43.4],[17.7,43],[18.6,42.7],[18.5,42.5],[17.5,42.8],[16.9,43',
        '.2],[16,43.5],[15.2,44.2],[15.4,44.3],[14.9,44.7],[14.9,45.1],[14.3,45.2],[14,44.8],[13.7,45.1],[13.7,45.5],[14.4,45.5],',
        '[14.6,45.6],[14.9,45.5],[15.3,45.5],[15.3,45.7],[15.7,45.8],[15.8,46.2]]]]],["CHE","CH","CHE","756","Switzerland",7.5,46',
        '.7,["CHE","CH","756","Switzerland"],[[[[9.6,47.5],[9.6,47.3],[9.5,47.1],[9.9,46.9],[10.4,46.9],[10.4,46.5],[9.9,46.3],[9',
        '.2,46.4],[9,46],[8.5,46],[8.3,46.2],[7.8,45.8],[7.3,45.8],[6.8,46],[6.5,46.4],[6,46.3],[6,46.7],[6.8,47.3],[6.7,47.5],[7',
        '.2,47.4],[7.5,47.6],[8.3,47.6],[8.5,47.8]]]]],["LUX","LU","LUX","442","Luxembourg",6.1,49.7,["LUX","LU","442","L","Luxem',
        'bourg"],[[[[6,50.1],[6.2,49.9],[6.2,49.5],[5.9,49.4],[5.7,49.5],[5.8,50.1]]]]],["BEL","BE","BEL","056","Belgium",4.8,50.',
        '8,["BEL","BE","056","B","Belgium"],[[[[6.2,50.8],[6,50.1],[5.8,50.1],[5.7,49.5],[4.8,50],[4.3,49.9],[3.6,50.4],[3.1,50.8',
        '],[2.7,50.8],[2.5,51.1],[3.3,51.3],[4,51.3],[5,51.5],[5.6,51]]]]],["NLD","NL","NLD","528","Netherlands",5.6,52.4,["NLD",',
        '"NL","528","NL1","Netherlands"],[[[[6.9,53.5],[7.1,53.1],[6.8,52.2],[6.6,51.9],[6,51.9],[6.2,50.8],[5.6,51],[5,51.5],[4,',
        '51.3],[3.3,51.3],[3.8,51.6],[4.7,53.1],[6.1,53.5]]]]],["PRT","PT","PRT","620","Portugal",-8.3,39.6,["PRT","PT","620","P"',
        ',"Portugal","PR1"],[[[[-9,41.9],[-8.7,42.1],[-8.3,42.3],[-8,41.8],[-7.4,41.8],[-7.3,41.9],[-6.7,41.9],[-6.4,41.4],[-6.9,',
        '41.1],[-6.9,40.3],[-7,40.2],[-7.1,39.7],[-7.5,39.6],[-7.1,39],[-7.4,38.4],[-7,38.1],[-7.2,37.8],[-7.5,37.4],[-7.5,37.1],',
        '[-7.9,36.8],[-8.4,37],[-8.9,36.9],[-8.7,37.7],[-8.8,38.3],[-9.3,38.4],[-9.5,38.7],[-9.4,39.4],[-9,39.8],[-9,40.2],[-8.8,',
        '40.8],[-8.8,41.2],[-9,41.5]]]]],["ESP","ES","ESP","724","Spain",-3.5,40.1,["ESP","ES","724","E","Spain"],[[[[-7.5,37.1],',
        '[-7.5,37.4],[-7.2,37.8],[-7,38.1],[-7.4,38.4],[-7.1,39],[-7.5,39.6],[-7.1,39.7],[-7,40.2],[-6.9,40.3],[-6.9,41.1],[-6.4,',
        '41.4],[-6.7,41.9],[-7.3,41.9],[-7.4,41.8],[-8,41.8],[-8.3,42.3],[-8.7,42.1],[-9,41.9],[-9,42.6],[-9.4,43],[-8,43.7],[-6.',
        '8,43.6],[-5.4,43.6],[-4.3,43.4],[-3.5,43.5],[-1.9,43.4],[-1.5,43],[0.3,42.6],[0.7,42.8],[1.8,42.3],[3,42.5],[3,41.9],[2.',
        '1,41.2],[0.8,41],[0.7,40.7],[0.1,40.1],[-0.3,39.3],[0.1,38.7],[-0.5,38.3],[-0.7,37.6],[-1.4,37.4],[-2.1,36.7],[-3.4,36.7',
        '],[-4.4,36.7],[-5,36.3],[-5.4,35.9],[-5.9,36],[-6.2,36.4],[-6.5,36.9]]]]],["IRL","IE","IRL","372","Ireland",-7.8,53.1,["',
        'IRL","IE","372","Ireland"],[[[[-6.2,53.9],[-6,53.2],[-6.8,52.3],[-8.6,51.7],[-10,51.8],[-9.2,52.9],[-9.7,53.9],[-8.3,54.',
        '7],[-7.6,55.1],[-7.4,54.6],[-7.6,54.1],[-7,54.1]]]]],["NCL","NC","NCL","540","New Caledonia",165.1,-21.1,["NCL","NC","54',
        '0","FR1","New Caledonia","France"],[[[[165.8,-21.1],[166.6,-21.7],[167.1,-22.2],[166.7,-22.4],[166.2,-22.1],[165.5,-21.7',
        '],[164.8,-21.1],[164.2,-20.4],[164,-20.1],[164.5,-20.1],[165,-20.5],[165.5,-20.8]]]]],["SLB","SB","SLB","090","Solomon I',
        'slands",159.2,-8,["SLB","SB","090","Solomon Is.","Solomon Islands"],[[[[162.1,-10.5],[162.4,-10.8],[161.7,-10.8],[161.3,',
        '-10.2],[161.9,-10.4]]],[[[161.7,-9.6],[161.5,-9.8],[160.8,-8.9],[160.6,-8.3],[160.9,-8.3],[161.3,-9.1]]],[[[160.9,-9.9],',
        '[160.5,-9.9],[159.8,-9.8],[159.6,-9.6],[159.7,-9.2],[160.4,-9.4],[160.7,-9.6]]],[[[159.6,-8],[159.9,-8.3],[159.9,-8.5],[',
        '159.1,-8.1],[158.6,-7.8],[158.2,-7.4],[158.4,-7.3],[158.8,-7.6]]],[[[157.1,-7],[157.5,-7.3],[157.3,-7.4],[156.9,-7.2],[1',
        '56.5,-6.8],[156.5,-6.6]]]]],["NZL","NZ","NZL","554","New Zealand",172.8,-39.8,["NZL","NZ","554","NZ1","New Zealand"],[[[',
        '[176.9,-40.1],[176.5,-40.6],[176,-41.3],[175.2,-41.7],[175.1,-41.4],[174.7,-41.3],[175.2,-40.5],[174.9,-39.9],[173.8,-39',
        '.5],[173.9,-39.1],[174.6,-38.8],[174.7,-38],[174.7,-37.4],[174.3,-36.7],[174.3,-36.5],[173.8,-36.1],[173.1,-35.2],[172.6',
        ',-34.5],[173,-34.5],[173.6,-35],[174.3,-35.3],[174.6,-36.2],[175.3,-37.2],[175.4,-36.5],[175.8,-36.8],[176,-37.6],[176.8',
        ',-37.9],[177.4,-38],[178,-37.6],[178.5,-37.7],[178.3,-38.6],[178,-39.2],[177.2,-39.1],[176.9,-39.4],[177,-39.9]]],[[[169',
        '.7,-43.6],[170.5,-43],[171.1,-42.5],[171.6,-41.8],[171.9,-41.5],[172.1,-41],[172.8,-40.5],[173,-40.9],[173.2,-41.3],[174',
        ',-40.9],[174.2,-41.3],[174.2,-41.8],[173.9,-42.2],[173.2,-43],[172.7,-43.4],[173.1,-43.9],[172.3,-43.9],[171.5,-44.2],[1',
        '71.2,-44.9],[170.6,-45.9],[169.8,-46.4],[169.3,-46.6],[168.4,-46.6],[167.8,-46.3],[166.7,-46.2],[166.5,-45.9],[167,-45.1',
        '],[168.3,-44.1],[168.9,-43.9]]]]],["AUS","AU","AUS","036","Australia",134,-24.1,["AUS","AU","036","AU1","Australia"],[[[',
        '[147.7,-40.8],[148.3,-40.9],[148.4,-42.1],[148,-42.4],[147.9,-43.2],[147.6,-42.9],[146.9,-43.6],[146.7,-43.6],[146,-43.5',
        '],[145.4,-42.7],[145.3,-42],[144.7,-41.2],[144.7,-40.7],[145.4,-40.8],[146.4,-41.1],[146.9,-41]]],[[[126.1,-32.2],[125.1',
        ',-32.7],[124.2,-33],[124,-33.5],[123.7,-33.9],[122.8,-33.9],[122.2,-34],[121.3,-33.8],[120.6,-33.9],[119.9,-34],[119.3,-',
        '34.5],[119,-34.5],[118.5,-34.7],[118,-35.1],[117.3,-35],[116.6,-35],[115.6,-34.4],[115,-34.2],[115,-33.6],[115.5,-33.5],',
        '[115.7,-33.3],[115.7,-32.9],[115.8,-32.2],[115.7,-31.6],[115.2,-30.6],[115,-30],[115,-29.5],[114.6,-28.8],[114.6,-28.5],',
        '[114.2,-28.1],[114,-27.3],[113.5,-26.5],[113.3,-26.1],[113.8,-26.5],[113.4,-25.6],[113.9,-25.9],[114.2,-26.3],[114.2,-25',
        '.8],[113.7,-25],[113.6,-24.7],[113.4,-24.4],[113.5,-23.8],[113.7,-23.6],[113.8,-23.1],[113.7,-22.5],[114.1,-21.8],[114.2',
        ',-22.5],[114.6,-21.8],[115.5,-21.5],[115.9,-21.1],[116.7,-20.7],[117.2,-20.6],[117.4,-20.7],[118.2,-20.4],[118.8,-20.3],',
        '[119,-20],[119.3,-20],[119.8,-20],[120.9,-19.7],[121.4,-19.2],[121.7,-18.7],[122.2,-18.2],[122.3,-17.8],[122.3,-17.3],[1',
        '23,-16.4],[123.4,-17.3],[123.9,-17.1],[123.5,-16.6],[123.8,-16.1],[124.3,-16.3],[124.4,-15.6],[124.9,-15.1],[125.2,-14.7',
        '],[125.7,-14.5],[125.7,-14.2],[126.1,-14.3],[126.1,-14.1],[126.6,-14],[127.1,-13.8],[127.8,-14.3],[128.4,-14.9],[129,-14',
        '.9],[129.6,-15],[129.4,-14.4],[129.9,-13.6],[130.3,-13.4],[130.2,-13.1],[130.6,-12.5],[131.2,-12.2],[131.7,-12.3],[132.6',
        ',-12.1],[132.6,-11.6],[131.8,-11.3],[132.4,-11.1],[133,-11.4],[133.6,-11.8],[134.4,-12],[134.7,-11.9],[135.3,-12.2],[135',
        '.9,-12],[136.3,-12],[136.5,-11.9],[137,-12.4],[136.7,-12.9],[136.3,-13.3],[136,-13.3],[136.1,-13.7],[135.8,-14.2],[135.4',
        ',-14.7],[135.5,-15],[136.3,-15.6],[137.1,-15.9],[137.6,-16.2],[138.3,-16.8],[138.6,-16.8],[139.1,-17.1],[139.3,-17.4],[1',
        '40.2,-17.7],[140.9,-17.4],[141.1,-16.8],[141.3,-16.4],[141.4,-15.8],[141.7,-15],[141.6,-14.6],[141.6,-14.3],[141.5,-13.7',
        '],[141.7,-12.9],[141.8,-12.7],[141.7,-12.4],[141.9,-11.9],[142.1,-11.3],[142.1,-11],[142.5,-10.7],[142.8,-11.2],[142.9,-',
        '11.8],[143.1,-11.9],[143.2,-12.3],[143.5,-12.8],[143.6,-13.4],[143.6,-13.8],[143.9,-14.5],[144.6,-14.2],[144.9,-14.6],[1',
        '45.4,-15],[145.3,-15.4],[145.5,-16.3],[145.6,-16.8],[145.9,-16.9],[146.2,-17.8],[146.1,-18.3],[146.4,-19],[147.5,-19.5],',
        '[148.2,-20],[148.8,-20.4],[148.7,-20.6],[149.3,-21.3],[149.7,-22.3],[150.1,-22.1],[150.5,-22.6],[150.7,-22.4],[150.9,-23',
        '.5],[151.6,-24.1],[152.1,-24.5],[152.9,-25.3],[153.1,-26.1],[153.2,-26.6],[153.1,-27.3],[153.6,-28.1],[153.5,-29],[153.3',
        ',-29.5],[153.1,-30.4],[153.1,-30.9],[152.9,-31.6],[152.5,-32.6],[151.7,-33],[151.3,-33.8],[151,-34.3],[150.7,-35.2],[150',
        '.3,-35.7],[150.1,-36.4],[149.9,-37.1],[150,-37.4],[149.4,-37.8],[148.3,-37.8],[147.4,-38.2],[146.9,-38.6],[146.3,-39],[1',
        '45.5,-38.6],[144.9,-38.4],[145,-37.9],[144.5,-38.1],[143.6,-38.8],[142.7,-38.5],[142.2,-38.4],[141.6,-38.3],[140.6,-38],',
        '[140,-37.4],[139.8,-36.6],[139.6,-36.1],[139.1,-35.7],[138.1,-35.6],[138.4,-35.1],[138.2,-34.4],[137.7,-35.1],[136.8,-35',
        '.3],[137.4,-34.7],[137.5,-34.1],[137.9,-33.6],[137.8,-32.9],[137,-33.8],[136.4,-34.1],[136,-34.9],[135.2,-34.5],[135.2,-',
        '33.9],[134.6,-33.2],[134.1,-32.8],[134.3,-32.6],[133,-32],[132.3,-32],[131.3,-31.5],[129.5,-31.6],[128.2,-31.9],[127.1,-',
        '32.3]]]]],["LKA","LK","LKA","144","Sri Lanka",80.7,7.6,["LKA","LK","144","Sri Lanka"],[[[[81.8,7.5],[81.6,6.5],[81.2,6.2',
        '],[80.3,6],[79.9,6.8],[79.7,8.2],[80.1,9.8],[80.8,9.3],[81.3,8.6]]]]],["CHN","CN","CHN","156","People\'s Republic of Chin',
        'a",106.3,32.5,["CHN","CN","156","CH1","China","People\'s Republic of China"],[[[[109.5,18.2],[108.7,18.5],[108.6,19.4],[1',
        '09.1,19.8],[110.2,20.1],[110.8,20.1],[111,19.7],[110.6,19.3],[110.3,18.7]]],[[[80.3,42.3],[80.2,42.9],[80.9,43.2],[80,44',
        '.9],[81.9,45.3],[82.5,45.5],[83.2,47.3],[85.2,47],[85.7,47.5],[85.8,48.5],[86.6,48.5],[87.4,49.2],[87.8,49.3],[88,48.6],',
        '[88.9,48.1],[90.3,47.7],[91,46.9],[90.6,45.7],[90.9,45.3],[92.1,45.1],[93.5,45],[94.7,44.4],[95.3,44.2],[95.8,43.3],[96.',
        '3,42.7],[97.5,42.7],[99.5,42.5],[100.8,42.7],[101.8,42.5],[103.3,41.9],[104.5,41.9],[105,41.6],[106.1,42.1],[107.7,42.5]',
        ',[109.2,42.5],[110.4,42.9],[111.1,43.4],[111.8,43.7],[111.7,44.1],[111.3,44.5],[111.9,45.1],[112.4,45],[113.5,44.8],[114',
        '.5,45.3],[116,45.7],[116.7,46.4],[117.4,46.7],[118.9,46.8],[119.7,46.7],[119.8,47],[118.9,47.7],[118.1,48.1],[117.3,47.7',
        '],[116.3,47.9],[115.7,47.7],[115.5,48.1],[116.2,49.1],[116.7,49.9],[117.9,49.5],[119.3,50.1],[119.3,50.6],[120.2,51.6],[',
        '120.7,52],[120.7,52.5],[120.2,52.8],[121,53.3],[122.2,53.4],[123.6,53.5],[125.1,53.2],[125.9,52.8],[126.6,51.8],[126.9,5',
        '1.4],[127.3,50.7],[127.7,49.8],[129.4,49.4],[130.6,48.7],[131,47.8],[132.5,47.8],[133.4,48.2],[135,48.5],[134.5,47.6],[1',
        '34.1,47.2],[133.8,46.1],[133.1,45.1],[131.9,45.3],[131,45],[131.3,44.1],[131.1,42.9],[130.6,42.9],[130.6,42.4],[130,43],',
        '[129.6,42.4],[128.1,42],[128.2,41.5],[127.3,41.5],[126.9,41.8],[126.2,41.1],[125.1,40.6],[124.3,39.9],[122.9,39.6],[122.',
        '1,39.2],[121.1,38.9],[121.6,39.4],[121.4,39.8],[122.2,40.4],[121.6,40.9],[120.8,40.6],[119.6,39.9],[119,39.3],[118,39.2]',
        ',[117.5,38.7],[118.1,38.1],[118.9,37.9],[118.9,37.4],[119.7,37.2],[120.8,37.9],[121.7,37.5],[122.4,37.5],[122.5,36.9],[1',
        '21.1,36.7],[120.6,36.1],[119.7,35.6],[119.2,34.9],[120.2,34.4],[120.6,33.4],[121.2,32.5],[121.9,31.7],[121.9,30.9],[121.',
        '3,30.7],[121.5,30.1],[122.1,29.8],[121.9,29],[121.7,28.2],[121.1,28.1],[120.4,27.1],[119.6,25.7],[118.7,24.5],[117.3,23.',
        '6],[115.9,22.8],[114.8,22.7],[114.2,22.2],[113.8,22.5],[113.2,22.1],[111.8,21.6],[110.8,21.4],[110.4,20.3],[109.9,20.3],',
        '[109.6,21],[109.9,21.4],[108.5,21.7],[108.1,21.6],[107,21.8],[106.6,22.2],[106.7,22.8],[105.8,23],[105.3,23.4],[104.5,22',
        '.8],[103.5,22.7],[102.7,22.7],[102.2,22.5],[101.7,22.3],[101.8,21.2],[101.3,21.2],[101.2,21.4],[101.2,21.8],[100.4,21.6]',
        ',[100,21.7],[99.2,22.1],[99.5,22.9],[98.9,23.1],[98.7,24.1],[97.6,23.9],[97.7,25.1],[98.7,25.9],[98.7,26.7],[98.7,27.5],',
        '[98.2,27.7],[97.9,28.3],[97.3,28.3],[96.2,28.4],[96.6,28.8],[96.1,29.5],[95.4,29],[94.6,29.3],[93.4,28.6],[92.5,27.9],[9',
        '1.7,27.8],[91.3,28],[90.7,28.1],[90,28.3],[89.5,28],[88.8,27.3],[88.7,28.1],[88.1,27.9],[87,28],[85.8,28.2],[85,28.6],[8',
        '4.2,28.8],[83.9,29.3],[83.3,29.5],[82.3,30.1],[81.5,30.4],[81.1,30.2],[79.7,30.9],[78.7,31.5],[78.5,32.6],[79.2,32.5],[7',
        '9.2,33],[78.8,33.5],[78.9,34.3],[77.8,35.5],[76.2,35.9],[75.9,36.7],[75.2,37.1],[75,37.4],[74.8,38],[74.9,38.4],[74.3,38',
        '.6],[73.9,38.5],[73.7,39.4],[74,39.7],[73.8,39.9],[74.8,40.4],[75.5,40.6],[76.5,40.4],[76.9,41.1],[78.2,41.2],[78.5,41.6',
        '],[80.1,42.1]]]]],["TWN","CN-TW","TWN","158","Taiwan",120.9,23.7,["TWN","CN-TW","158","TW","Taiwan"],[[[[121.8,24.4],[12',
        '1.2,22.8],[120.7,22],[120.2,22.8],[120.1,23.6],[120.7,24.5],[121.5,25.3],[122,25]]]]],["ITA","IT","ITA","380","Italy",11',
        '.1,44.7,["ITA","IT","380","I","Italy"],[[[[10.4,46.9],[11,46.8],[11.2,46.9],[12.2,47.1],[12.4,46.8],[13.8,46.5],[13.7,46',
        '],[13.9,45.6],[13.1,45.7],[12.3,45.4],[12.4,44.9],[12.3,44.6],[12.6,44.1],[13.5,43.6],[14,42.8],[15.1,42],[15.9,42],[16.',
        '2,41.7],[15.9,41.5],[16.8,41.2],[17.5,40.9],[18.4,40.4],[18.5,40.2],[18.3,39.8],[17.7,40.3],[16.9,40.4],[16.4,39.8],[17.',
        '2,39.4],[17.1,38.9],[16.6,38.8],[16.1,38],[15.7,37.9],[15.7,38.2],[15.9,38.8],[16.1,39],[15.7,39.5],[15.4,40],[15,40.2],',
        '[14.7,40.6],[14.1,40.8],[13.6,41.2],[12.9,41.3],[12.1,41.7],[11.2,42.4],[10.5,42.9],[10.2,43.9],[9.7,44],[8.9,44.4],[8.4',
        ',44.2],[7.9,43.8],[7.4,43.7],[7.5,44.1],[7,44.3],[6.7,45],[7.1,45.3],[6.8,45.7],[6.8,46],[7.3,45.8],[7.8,45.8],[8.3,46.2',
        '],[8.5,46],[9,46],[9.2,46.4],[9.9,46.3],[10.4,46.5]]],[[[14.8,38.1],[15.5,38.2],[15.2,37.4],[15.3,37.1],[15.1,36.6],[14.',
        '3,37],[13.8,37.1],[12.4,37.6],[12.6,38.1],[13.7,38]]],[[[8.7,40.9],[9.2,41.2],[9.8,40.5],[9.7,39.2],[9.2,39.2],[8.8,38.9',
        '],[8.4,39.2],[8.4,40.4],[8.2,41]]]]],["DNK","DK","DNK","208","Denmark",9,56,["DNK","DK","208","DN1","Denmark"],[[[[9.9,5',
        '5],[9.3,54.8],[8.5,55],[8.1,55.5],[8.1,56.5],[8.3,56.8],[8.5,57.1],[9.4,57.2],[9.8,57.4],[10.6,57.7],[10.5,57.2],[10.3,5',
        '6.9],[10.4,56.6],[10.9,56.5],[10.7,56.1],[10.4,56.2],[9.6,55.5]]],[[[12.4,56.1],[12.7,55.6],[12.1,54.8],[11,55.4],[10.9,',
        '55.8]]]]],["GBR","GB","GBR","826","United Kingdom",-2.1,54.4,["GBR","GB","826","GB1","United Kingdom"],[[[[-6.2,53.9],[-',
        '7,54.1],[-7.6,54.1],[-7.4,54.6],[-7.6,55.1],[-6.7,55.2],[-5.7,54.6]]],[[[-3.1,53.4],[-2.9,54],[-3.6,54.6],[-4.8,54.8],[-',
        '5.1,55.1],[-4.7,55.5],[-5,55.8],[-5.6,55.3],[-5.6,56.3],[-6.1,56.8],[-5.8,57.8],[-5,58.6],[-4.2,58.6],[-3,58.6],[-4.1,57',
        '.6],[-3.1,57.7],[-2,57.7],[-2.2,56.9],[-3.1,56],[-2.1,55.9],[-2,55.8],[-1.1,54.6],[-0.4,54.5],[0.2,53.3],[0.5,52.9],[1.7',
        ',52.7],[1.6,52.1],[1.1,51.8],[1.4,51.3],[0.6,50.8],[-0.8,50.8],[-2.5,50.5],[-3,50.7],[-3.6,50.2],[-4.5,50.3],[-5.2,50],[',
        '-5.8,50.2],[-4.3,51.2],[-3.4,51.4],[-5,51.6],[-5.3,52],[-4.2,52.3],[-4.8,52.8],[-4.6,53.5]]]]],["ISL","IS","ISL","352","',
        'Iceland",-18.7,64.8,["ISL","IS","352","Iceland"],[[[[-14.5,66.5],[-14.7,65.8],[-13.6,65.1],[-14.9,64.4],[-17.8,63.7],[-1',
        '8.7,63.5],[-20,63.6],[-22.8,64],[-21.8,64.4],[-24,64.9],[-22.2,65.1],[-22.2,65.4],[-24.3,65.6],[-23.7,66.3],[-22.1,66.4]',
        ',[-20.6,65.7],[-19.1,66.3],[-17.8,66],[-16.2,66.5]]]]],["AZE","AZ","AZE","031","Azerbaijan",47.2,40.4,["AZE","AZ","031",',
        '"Azerbaijan"],[[[[46.4,41.9],[46.7,41.8],[47.4,41.2],[47.8,41.2],[48,41.4],[48.6,41.8],[49.1,41.3],[49.6,40.6],[50.1,40.',
        '5],[50.4,40.3],[49.6,40.2],[49.4,39.4],[49.2,39],[48.9,38.8],[48.9,38.3],[48.6,38.3],[48,38.8],[48.4,39.3],[48.1,39.6],[',
        '47.7,39.5],[46.5,38.8],[46.5,39.5],[46,39.6],[45.6,39.9],[45.9,40.2],[45.4,40.6],[45.6,40.8],[45.2,41],[45,41.2],[45.2,4',
        '1.4],[46,41.1],[46.5,41.1],[46.6,41.2],[46.1,41.7]]],[[[46.1,38.7],[45.5,38.9],[45,39.3],[44.8,39.7],[45,39.7],[45.3,39.',
        '5],[45.7,39.5],[45.7,39.3]]]]],["GEO","GE","GEO","268","Georgia",43.7,41.9,["GEO","GE","268","Georgia"],[[[[40,43.4],[40',
        '.1,43.6],[40.9,43.4],[42.4,43.2],[43.8,42.7],[43.9,42.6],[44.5,42.7],[45.5,42.5],[45.8,42.1],[46.4,41.9],[46.1,41.7],[46',
        '.6,41.2],[46.5,41.1],[46,41.1],[45.2,41.4],[45,41.2],[43.6,41.1],[42.6,41.6],[41.6,41.5],[41.7,42],[41.5,42.6],[40.9,43]',
        ',[40.3,43.1]]]]],["PHL","PH","PHL","608","Philippines",122.5,11.2,["PHL","PH","608","Philippines"],[[[[120.8,12.7],[120.',
        '3,13.5],[121.2,13.4],[121.5,13.1],[121.3,12.2]]],[[[122.6,10],[122.8,10.3],[122.9,10.9],[123.5,10.9],[123.3,10.3],[124.1',
        ',11.2],[124,10.3],[123.6,10],[123.3,9.3],[123,9],[122.4,9.7]]],[[[126.4,8.4],[126.5,7.8],[126.5,7.2],[126.2,6.3],[125.8,',
        '7.3],[125.4,6.8],[125.7,6],[125.4,5.6],[124.2,6.2],[123.9,6.9],[124.2,7.4],[123.6,7.8],[123.3,7.4],[122.8,7.5],[122.1,6.',
        '9],[121.9,7.2],[122.3,8],[122.9,8.3],[123.5,8.7],[123.8,8.2],[124.6,8.5],[124.8,9],[125.5,9],[125.4,9.8],[126.2,9.3],[12',
        '6.3,8.8]]],[[[118.5,9.3],[117.2,8.4],[117.7,9.1],[118.4,9.7],[119,10.4],[119.5,11.4],[119.7,10.6],[119,10]]],[[[122.3,18',
        '.2],[122.2,17.8],[122.5,17.1],[122.3,16.3],[121.7,15.9],[121.5,15.1],[121.7,14.3],[122.3,14.2],[122.7,14.3],[124,13.8],[',
        '123.9,13.2],[124.2,13],[124.1,12.5],[123.3,13],[122.9,13.6],[122.7,13.2],[122,13.8],[121.1,13.6],[120.6,13.9],[120.7,14.',
        '3],[121,14.5],[120.7,14.8],[120.6,14.4],[120.1,15],[119.9,15.4],[119.9,16.4],[120.3,16],[120.4,17.6],[120.7,18.5],[121.3',
        ',18.5],[121.9,18.2],[122.2,18.5]]],[[[122,11.4],[121.9,11.9],[122.5,11.6],[123.1,11.6],[123.1,11.2],[122.6,10.7],[122,10',
        '.4],[122,10.9]]],[[[125.5,12.2],[125.8,11],[125,11.3],[125,11],[125.3,10.4],[124.8,10.1],[124.8,10.8],[124.5,10.9],[124.',
        '3,11.5],[124.9,11.4],[124.9,11.8],[124.3,12.6],[125.2,12.5]]]]],["MYS","MY","MYS","458","Malaysia",113.8,2.5,["MYS","MY"',
        ',"458","Malaysia"],[[[[100.1,6.5],[100.3,6.6],[101.1,6.2],[101.2,5.7],[101.8,5.8],[102.1,6.2],[102.4,6.1],[103,5.5],[103',
        '.4,4.9],[103.4,4.2],[103.3,3.7],[103.4,3.4],[103.5,2.8],[103.9,2.5],[104.2,1.6],[104.2,1.3],[103.5,1.2],[102.6,2],[101.4',
        ',2.8],[101.3,3.3],[100.7,3.9],[100.6,4.8],[100.2,5.3],[100.3,6]]],[[[117.9,4.1],[117,4.3],[115.9,4.3],[115.5,3.2],[115.1',
        ',2.8],[114.6,1.4],[113.8,1.2],[112.9,1.5],[112.4,1.4],[111.8,0.9],[111.2,1],[110.5,0.8],[109.8,1.3],[109.7,2],[110.4,1.7',
        '],[111.2,1.9],[111.4,2.7],[111.8,2.9],[113,3.1],[113.7,3.9],[114.2,4.5],[114.7,4],[114.9,4.3],[115.3,4.3],[115.4,5],[115',
        '.5,5.4],[116.2,6.1],[116.7,6.9],[117.1,6.9],[117.6,6.4],[117.7,6],[118.3,5.7],[119.2,5.4],[119.1,5],[118.4,5],[118.6,4.5',
        ']]]]],["BRN","BN","BRN","096","Brunei",114.6,4.4,["BRN","BN","096","Brunei","Brunei Darussalam"],[[[[115.5,5.4],[115.4,5',
        '],[115.3,4.3],[114.9,4.3],[114.7,4],[114.2,4.5],[114.6,4.9]]]]],["SVN","SI","SVN","705","Slovenia",14.9,46.1,["SVN","SI"',
        ',"705","SLO","Slovenia"],[[[[13.8,46.5],[14.6,46.4],[15.1,46.7],[16,46.7],[16.2,46.9],[16.4,46.8],[16.6,46.5],[15.8,46.2',
        '],[15.7,45.8],[15.3,45.7],[15.3,45.5],[14.9,45.5],[14.6,45.6],[14.4,45.5],[13.7,45.5],[13.9,45.6],[13.7,46]]]]],["FIN","',
        'FI","FIN","246","Finland",27.3,63.3,["FIN","FI","246","FI1","Finland"],[[[[28.6,69.1],[28.4,68.4],[30,67.7],[29.1,66.9],',
        '[30.2,65.8],[29.5,64.9],[30.4,64.2],[30,63.6],[31.5,62.9],[31.1,62.4],[30.2,61.8],[28.1,60.5],[26.3,60.4],[24.5,60.1],[2',
        '2.9,59.8],[22.3,60.4],[21.3,60.7],[21.5,61.7],[21.1,62.6],[21.5,63.2],[22.4,63.8],[24.7,64.9],[25.4,65.1],[25.3,65.5],[2',
        '3.9,66],[23.6,66.4],[23.5,67.9],[22,68.6],[20.6,69.1],[21.2,69.4],[22.4,68.8],[23.7,68.9],[24.7,68.6],[25.7,69.1],[26.2,',
        '69.8],[27.7,70.2],[29,69.8]]]]],["SVK","SK","SVK","703","Slovakia",19,48.7,["SVK","SK","703","Slovakia"],[[[[22.6,49.1],',
        '[22.3,48.8],[22.1,48.4],[21.9,48.3],[20.8,48.6],[20.5,48.6],[20.2,48.3],[19.8,48.2],[19.7,48.3],[19.2,48.1],[18.8,48.1],',
        '[18.7,47.9],[17.9,47.8],[17.5,47.9],[17,48.1],[16.9,48.5],[17,48.6],[17.1,48.8],[17.5,48.8],[17.9,48.9],[17.9,49],[18.1,',
        '49],[18.2,49.3],[18.4,49.3],[18.6,49.5],[18.9,49.5],[18.9,49.4],[19.3,49.6],[19.8,49.2],[20.4,49.4],[20.9,49.3],[21.6,49',
        '.5]]]]],["CZE","CZ","CZE","203","Czech Republic",15.4,49.9,["CZE","CZ","203","Czechia","Czech Republic"],[[[[15,51.1],[1',
        '5.5,50.8],[16.2,50.7],[16.2,50.4],[16.7,50.2],[16.9,50.5],[17.6,50.4],[17.6,50],[18.4,50],[18.9,49.5],[18.6,49.5],[18.4,',
        '49.3],[18.2,49.3],[18.1,49],[17.9,49],[17.9,48.9],[17.5,48.8],[17.1,48.8],[17,48.6],[16.5,48.8],[16,48.7],[15.3,49],[14.',
        '9,49],[14.3,48.6],[13.6,48.9],[13,49.3],[12.5,49.5],[12.4,50],[12.2,50.3],[13,50.5],[13.3,50.7],[14.1,50.9],[14.3,51.1],',
        '[14.6,51]]]]],["ERI","ER","ERI","232","Eritrea",38.3,15.8,["ERI","ER","232","Eritrea"],[[[[36.4,14.4],[36.3,14.8],[36.8,',
        '16.3],[36.9,17],[37.2,17.3],[37.9,17.4],[38.4,18],[39,16.8],[39.3,15.9],[39.8,15.4],[41.2,14.5],[41.7,13.9],[42.3,13.3],',
        '[42.6,13],[43.1,12.7],[42.8,12.5],[42.4,12.5],[42,12.9],[41.6,13.5],[41.2,13.8],[40.9,14.1],[40,14.5],[39.3,14.5],[39.1,',
        '14.7],[38.5,14.5],[37.9,15],[37.6,14.2]]]]],["JPN","JP","JPN","392","Japan",138.4,36.1,["JPN","JP","392","J","Japan"],[[',
        '[[141.9,39.2],[141,38.2],[141,37.1],[140.6,36.3],[140.8,35.8],[140.3,35.1],[139,34.7],[137.2,34.6],[135.8,33.5],[135.1,3',
        '3.8],[135.1,34.6],[133.3,34.4],[132.2,33.9],[131,33.9],[132,33.1],[131.3,31.5],[130.7,31],[130.2,31.4],[130.4,32.3],[129',
        '.8,32.6],[129.4,33.3],[130.4,33.6],[130.9,34.2],[131.9,34.7],[132.6,35.4],[134.6,35.7],[135.7,35.5],[136.7,37.3],[137.4,',
        '36.8],[138.9,37.8],[139.4,38.2],[140.1,39.4],[139.9,40.6],[140.3,41.2],[141.4,41.4],[141.9,40]]],[[[144.6,44],[145.3,44.',
        '4],[145.5,43.3],[144.1,43],[143.2,42],[141.6,42.7],[141.1,41.6],[140,41.6],[139.8,42.6],[140.3,43.3],[141.4,43.4],[141.7',
        ',44.8],[142,45.6],[143.1,44.5],[143.9,44.2]]],[[[132.4,33.5],[132.9,34.1],[133.5,33.9],[133.9,34.4],[134.6,34.1],[134.8,',
        '33.8],[134.2,33.2],[133.8,33.5],[133.3,33.3],[133,32.7],[132.4,33]]]]],["PRY","PY","PRY","600","Paraguay",-60.1,-21.7,["',
        'PRY","PY","600","Paraguay"],[[[[-58.2,-20.2],[-57.9,-20.7],[-57.9,-22.1],[-56.9,-22.3],[-56.5,-22.1],[-55.8,-22.4],[-55.',
        '6,-22.7],[-55.5,-23.6],[-55.4,-24],[-55,-24],[-54.7,-23.8],[-54.3,-24],[-54.3,-24.6],[-54.4,-25.2],[-54.6,-25.7],[-54.8,',
        '-26.6],[-55.7,-27.4],[-56.5,-27.5],[-57.6,-27.4],[-58.6,-27.1],[-57.6,-25.6],[-57.8,-25.2],[-58.8,-24.8],[-60,-24],[-60.',
        '8,-23.9],[-62.7,-22.2],[-62.3,-21.1],[-62.3,-20.5],[-61.8,-19.6],[-60,-19.3],[-59.1,-19.4],[-58.2,-19.9]]]]],["YEM","YE"',
        ',"YEM","887","Yemen",45.9,15.3,["YEM","YE","887","RY","Yemen"],[[[[52,19],[52.8,17.3],[53.1,16.7],[52.4,16.4],[52.2,15.9',
        '],[52.2,15.6],[51.2,15.2],[49.6,14.7],[48.7,14],[48.2,13.9],[47.9,14],[47.4,13.6],[46.7,13.4],[45.9,13.3],[45.6,13.3],[4',
        '5.4,13],[45.1,13],[45,12.7],[44.5,12.7],[44.2,12.6],[43.5,12.6],[43.2,13.2],[43.3,13.8],[43.1,14.1],[42.9,14.8],[42.6,15',
        '.2],[42.8,15.3],[42.7,15.7],[42.8,15.9],[42.8,16.3],[43.2,16.7],[43.1,17.1],[43.4,17.6],[43.8,17.3],[44.1,17.4],[45.2,17',
        '.4],[45.4,17.3],[46.4,17.2],[46.7,17.3],[47,16.9],[47.5,17.1],[48.2,18.2],[49.1,18.6]]]]],["SAU","SA","SAU","682","Saudi',
        ' Arabia",44.7,23.8,["SAU","SA","682","Saudi Arabia"],[[[[35,29.4],[36.1,29.2],[36.5,29.5],[36.7,29.9],[37.5,30],[37.7,30',
        '.3],[38,30.5],[37,31.5],[39,32],[39.2,32.2],[40.4,31.9],[41.9,31.2],[44.7,29.2],[46.6,29.1],[47.5,29],[47.7,28.5],[48.4,',
        '28.6],[48.8,27.7],[49.3,27.5],[49.5,27.1],[50.2,26.7],[50.2,26.3],[50.1,25.9],[50.2,25.6],[50.5,25.3],[50.7,25],[50.8,24',
        '.8],[51.1,24.6],[51.4,24.6],[51.6,24.2],[51.6,24],[52,23],[55,22.5],[55.2,22.7],[55.7,22],[55,20],[52,19],[49.1,18.6],[4',
        '8.2,18.2],[47.5,17.1],[47,16.9],[46.7,17.3],[46.4,17.2],[45.4,17.3],[45.2,17.4],[44.1,17.4],[43.8,17.3],[43.4,17.6],[43.',
        '1,17.1],[43.2,16.7],[42.8,16.3],[42.6,16.8],[42.3,17.1],[42.3,17.5],[41.8,17.8],[41.2,18.7],[40.9,19.5],[40.2,20.2],[39.',
        '8,20.3],[39.1,21.3],[39,22],[39.1,22.6],[38.5,23.7],[38,24.1],[37.5,24.3],[37.2,24.9],[37.2,25.1],[36.9,25.6],[36.6,25.8',
        '],[36.2,26.6],[35.6,27.4],[35.1,28.1],[34.6,28.1],[34.8,28.6],[34.8,29]]]]],["ATA","AQ","ATA","010","Antarctica",35.9,-7',
        '9.8,["ATA","AQ","010","Antarctica"],[[[[-48.7,-78],[-48.2,-78],[-46.7,-77.8],[-45.2,-78],[-43.9,-78.5],[-43.5,-79.1],[-4',
        '3.4,-79.5],[-43.3,-80],[-44.9,-80.3],[-46.5,-80.6],[-48.4,-80.8],[-50.5,-81],[-52.9,-81],[-54.2,-80.6],[-54,-80.2],[-51.',
        '9,-79.9],[-51,-79.6],[-50.4,-79.2],[-49.9,-78.8],[-49.3,-78.5]]],[[[-66.3,-80.3],[-64,-80.3],[-61.9,-80.4],[-61.1,-80],[',
        '-60.6,-79.6],[-59.6,-80],[-59.9,-80.5],[-60.2,-81],[-62.3,-80.9],[-64.5,-80.9],[-65.7,-80.6],[-65.7,-80.5]]],[[[-73.9,-7',
        '1.3],[-73.2,-71.2],[-72.1,-71.2],[-71.8,-70.7],[-71.7,-70.3],[-71.7,-69.5],[-71.2,-69],[-70.3,-68.9],[-69.7,-69.3],[-69.',
        '5,-69.6],[-69.1,-70.1],[-68.7,-70.5],[-68.5,-71],[-68.3,-71.4],[-68.5,-71.8],[-68.8,-72.2],[-70,-72.3],[-71.1,-72.5],[-7',
        '2.4,-72.5],[-71.9,-72.1],[-73.1,-72.2],[-74.2,-72.4],[-75,-72.1],[-75,-71.7]]],[[[-102.3,-71.9],[-101.7,-71.7],[-100.4,-',
        '71.9],[-99,-71.9],[-97.9,-72.1],[-96.8,-72],[-96.2,-72.5],[-97,-72.4],[-98.2,-72.5],[-99.4,-72.4],[-100.8,-72.5],[-101.8',
        ',-72.3]]],[[[-122.6,-73.7],[-122.4,-73.3],[-121.2,-73.5],[-119.9,-73.7],[-118.7,-73.5],[-119.3,-73.8],[-120.2,-74.1],[-1',
        '21.6,-74]]],[[[-127.3,-73.5],[-126.6,-73.2],[-125.6,-73.5],[-124,-73.9],[-124.6,-73.8],[-125.9,-73.7]]],[[[-163.7,-78.6]',
        ',[-163.1,-78.2],[-161.2,-78.4],[-160.2,-78.7],[-159.5,-79],[-159.2,-79.5],[-161.1,-79.6],[-162.4,-79.3],[-163,-78.9],[-1',
        '63.1,-78.9]]],[[[180,-84.7],[180,-90],[-180,-90],[-180,-84.7],[-179.9,-84.7],[-179.1,-84.1],[-177.3,-84.5],[-177.1,-84.4',
        '],[-176.1,-84.1],[-175.9,-84.1],[-175.8,-84.1],[-174.4,-84.5],[-173.1,-84.1],[-172.9,-84.1],[-170,-83.9],[-169,-84.1],[-',
        '168.5,-84.2],[-167,-84.6],[-164.2,-84.8],[-161.9,-85.1],[-158.1,-85.4],[-155.2,-85.1],[-150.9,-85.3],[-148.5,-85.6],[-14',
        '5.9,-85.3],[-143.1,-85],[-142.9,-84.6],[-146.8,-84.5],[-150.1,-84.3],[-150.9,-83.9],[-153.6,-83.7],[-153.4,-83.2],[-153,',
        '-82.8],[-152.7,-82.5],[-152.9,-82],[-154.5,-81.8],[-155.3,-81.4],[-156.8,-81.1],[-154.4,-81.2],[-152.1,-81],[-150.6,-81.',
        '3],[-148.9,-81],[-147.2,-80.7],[-146.4,-80.3],[-146.8,-79.9],[-148.1,-79.7],[-149.5,-79.4],[-151.6,-79.3],[-153.4,-79.2]',
        ',[-155.3,-79.1],[-156,-78.7],[-157.3,-78.4],[-158.1,-78],[-158.4,-76.9],[-157.9,-77],[-157,-77.3],[-155.3,-77.2],[-153.7',
        ',-77.1],[-152.9,-77.5],[-151.3,-77.4],[-150,-77.2],[-148.7,-76.9],[-147.6,-76.6],[-146.1,-76.5],[-146.1,-76.1],[-146.5,-',
        '75.7],[-146.2,-75.4],[-144.9,-75.2],[-144.3,-75.5],[-142.8,-75.3],[-141.6,-75.1],[-140.2,-75.1],[-138.9,-75],[-137.5,-74',
        '.7],[-136.4,-74.5],[-135.2,-74.3],[-134.4,-74.4],[-133.7,-74.4],[-132.3,-74.3],[-130.9,-74.5],[-129.6,-74.5],[-128.2,-74',
        '.3],[-126.9,-74.4],[-125.4,-74.5],[-124,-74.5],[-122.6,-74.5],[-121.1,-74.5],[-119.7,-74.5],[-118.7,-74.2],[-117.5,-74],',
        '[-116.2,-74.2],[-115,-74.1],[-113.9,-73.7],[-113.3,-74],[-112.9,-74.4],[-112.3,-74.7],[-111.3,-74.4],[-110.1,-74.8],[-10',
        '8.7,-74.9],[-107.6,-75.2],[-106.1,-75.1],[-104.9,-74.9],[-103.4,-75],[-102,-75.1],[-100.6,-75.3],[-100.1,-74.9],[-100.8,',
        '-74.5],[-101.3,-74.2],[-102.5,-74.1],[-103.1,-73.7],[-103.3,-73.4],[-103.7,-72.6],[-102.9,-72.8],[-101.6,-72.8],[-100.3,',
        '-72.8],[-99.1,-72.9],[-98.1,-73.2],[-97.7,-73.6],[-96.3,-73.6],[-95,-73.5],[-93.7,-73.3],[-92.4,-73.2],[-91.4,-73.4],[-9',
        '0.1,-73.3],[-89.2,-72.6],[-88.4,-73],[-87.3,-73.2],[-86,-73.1],[-85.2,-73.5],[-83.9,-73.5],[-82.7,-73.6],[-81.5,-73.9],[',
        '-80.7,-73.5],[-80.3,-73.1],[-79.3,-73.5],[-77.9,-73.4],[-76.9,-73.6],[-76.2,-74],[-74.9,-73.9],[-73.9,-73.7],[-72.8,-73.',
        '4],[-71.6,-73.3],[-70.2,-73.1],[-68.9,-73],[-68,-72.8],[-67.4,-72.5],[-67.1,-72],[-67.3,-71.6],[-67.6,-71.2],[-67.9,-70.',
        '9],[-68.2,-70.5],[-68.5,-70.1],[-68.5,-69.7],[-68.4,-69.3],[-68,-69],[-67.6,-68.5],[-67.4,-68.1],[-67.6,-67.7],[-67.7,-6',
        '7.3],[-67.3,-66.9],[-66.7,-66.6],[-66.1,-66.2],[-65.4,-65.9],[-64.6,-65.6],[-64.2,-65.2],[-63.6,-64.9],[-63,-64.6],[-62,',
        '-64.6],[-61.4,-64.3],[-60.7,-64.1],[-59.9,-64],[-59.2,-63.7],[-58.6,-63.4],[-57.8,-63.3],[-57.2,-63.5],[-57.6,-63.9],[-5',
        '8.6,-64.2],[-59,-64.4],[-59.8,-64.2],[-60.6,-64.3],[-61.3,-64.5],[-62,-64.8],[-62.5,-65.1],[-62.6,-65.5],[-62.6,-65.9],[',
        '-62.1,-66.2],[-62.8,-66.4],[-63.7,-66.5],[-64.3,-66.8],[-64.9,-67.2],[-65.5,-67.6],[-65.7,-68],[-65.3,-68.4],[-64.8,-68.',
        '7],[-64,-68.9],[-63.2,-69.2],[-62.8,-69.6],[-62.6,-70],[-62.3,-70.4],[-61.8,-70.7],[-61.5,-71.1],[-61.4,-72],[-61.1,-72.',
        '4],[-61,-72.8],[-60.7,-73.2],[-60.8,-73.7],[-61.4,-74.1],[-62,-74.4],[-63.3,-74.6],[-63.7,-74.9],[-64.4,-75.3],[-65.9,-7',
        '5.6],[-67.2,-75.8],[-68.4,-76],[-69.8,-76.2],[-70.6,-76.6],[-72.2,-76.7],[-74,-76.6],[-75.6,-76.7],[-77.2,-76.7],[-76.9,',
        '-77.1],[-75.4,-77.3],[-74.3,-77.6],[-73.7,-77.9],[-74.8,-78.2],[-76.5,-78.1],[-77.9,-78.4],[-78,-78.8],[-78,-79.2],[-76.',
        '8,-79.5],[-76.6,-79.9],[-75.4,-80.3],[-73.2,-80.4],[-71.4,-80.7],[-70,-81],[-68.2,-81.3],[-65.7,-81.5],[-63.3,-81.7],[-6',
        '1.6,-82],[-59.7,-82.4],[-58.7,-82.8],[-58.2,-83.2],[-57,-82.9],[-55.4,-82.6],[-53.6,-82.3],[-51.5,-82],[-49.8,-81.7],[-4',
        '7.3,-81.7],[-44.8,-81.8],[-42.8,-82.1],[-42.2,-81.7],[-40.8,-81.4],[-38.2,-81.3],[-36.3,-81.1],[-34.4,-80.9],[-32.3,-80.',
        '8],[-30.1,-80.6],[-28.5,-80.3],[-29.3,-80],[-29.7,-79.6],[-29.7,-79.3],[-31.6,-79.3],[-33.7,-79.5],[-35.6,-79.5],[-35.9,',
        '-79.1],[-35.8,-78.3],[-35.3,-78.1],[-33.9,-77.9],[-32.2,-77.7],[-31,-77.4],[-29.8,-77.1],[-28.9,-76.7],[-27.5,-76.5],[-2',
        '6.2,-76.4],[-25.5,-76.3],[-23.9,-76.2],[-22.5,-76.1],[-21.2,-75.9],[-20,-75.7],[-18.9,-75.4],[-17.5,-75.1],[-16.6,-74.8]',
        ',[-15.7,-74.5],[-15.4,-74.1],[-16.5,-73.9],[-16.1,-73.5],[-15.4,-73.1],[-14.4,-73],[-13.3,-72.7],[-12.3,-72.4],[-11.5,-7',
        '2],[-11,-71.5],[-10.3,-71.3],[-9.1,-71.3],[-8.6,-71.7],[-7.4,-71.7],[-7.4,-71.3],[-6.9,-70.9],[-5.8,-71],[-5.5,-71.4],[-',
        '4.3,-71.5],[-3,-71.3],[-1.8,-71.2],[-0.7,-71.2],[-0.2,-71.6],[0.9,-71.3],[1.9,-71.1],[3,-71],[4.1,-70.9],[5.2,-70.6],[6.',
        '3,-70.5],[7.1,-70.2],[7.7,-69.9],[8.5,-70.1],[9.5,-70],[10.2,-70.5],[10.8,-70.8],[12,-70.6],[12.4,-70.2],[13.4,-70],[14.',
        '7,-70],[15.1,-70.4],[15.9,-70],[17,-69.9],[18.2,-69.9],[19.3,-69.9],[20.4,-70],[21.5,-70.1],[21.9,-70.4],[22.6,-70.7],[2',
        '3.7,-70.5],[24.8,-70.5],[26,-70.5],[27.1,-70.5],[28.1,-70.3],[29.2,-70.2],[30,-69.9],[31,-69.8],[32,-69.7],[32.8,-69.4],',
        '[33.3,-68.8],[33.9,-68.5],[34.9,-68.7],[35.3,-69],[36.2,-69.2],[37.2,-69.2],[37.9,-69.5],[38.6,-69.8],[39.7,-69.5],[40,-',
        '69.1],[40.9,-68.9],[42,-68.6],[42.9,-68.5],[44.1,-68.3],[44.9,-68.1],[45.7,-67.8],[46.5,-67.6],[47.4,-67.7],[48.3,-67.4]',
        ',[49,-67.1],[49.9,-67.1],[50.8,-66.9],[50.9,-66.5],[51.8,-66.2],[52.6,-66.1],[53.6,-65.9],[54.5,-65.8],[55.4,-65.9],[56.',
        '4,-66],[57.2,-66.2],[57.3,-66.7],[58.1,-67],[58.7,-67.3],[59.9,-67.4],[60.6,-67.7],[61.4,-68],[62.4,-68],[63.2,-67.8],[6',
        '4.1,-67.4],[65,-67.6],[66,-67.7],[66.9,-67.9],[67.9,-67.9],[68.9,-67.9],[69.7,-69],[69.7,-69.2],[69.6,-69.7],[68.6,-69.9',
        '],[67.8,-70.3],[67.9,-70.7],[69.1,-70.7],[68.9,-71.1],[68.4,-71.4],[67.9,-71.9],[68.7,-72.2],[69.9,-72.3],[71,-72.1],[71',
        '.6,-71.7],[71.9,-71.3],[72.5,-71],[73.1,-70.7],[73.3,-70.4],[73.9,-69.9],[74.5,-69.8],[75.6,-69.7],[76.6,-69.6],[77.6,-6',
        '9.5],[78.1,-69.1],[78.4,-68.7],[79.1,-68.3],[80.1,-68.1],[80.9,-67.9],[81.5,-67.5],[82.1,-67.4],[82.8,-67.2],[83.8,-67.3',
        '],[84.7,-67.2],[85.7,-67.1],[86.8,-67.2],[87.5,-66.9],[88,-66.2],[88.4,-66.5],[88.8,-67],[89.7,-67.2],[90.6,-67.2],[91.6',
        ',-67.1],[92.6,-67.2],[93.5,-67.2],[94.2,-67.1],[95,-67.2],[95.8,-67.4],[96.7,-67.2],[97.8,-67.2],[98.7,-67.1],[99.7,-67.',
        '2],[100.4,-66.9],[100.9,-66.6],[101.6,-66.3],[102.8,-65.6],[103.5,-65.7],[104.2,-66],[104.9,-66.3],[106.2,-66.9],[107.2,',
        '-67],[108.1,-67],[109.2,-66.8],[110.2,-66.7],[111.1,-66.4],[111.7,-66.1],[112.9,-66.1],[113.6,-65.9],[114.4,-66.1],[114.',
        '9,-66.4],[115.6,-66.7],[116.7,-66.7],[117.4,-66.9],[118.6,-67.2],[119.8,-67.3],[120.9,-67.2],[121.7,-66.9],[122.3,-66.6]',
        ',[123.2,-66.5],[124.1,-66.6],[125.2,-66.7],[126.1,-66.6],[127,-66.6],[127.9,-66.7],[128.8,-66.8],[129.7,-66.6],[130.8,-6',
        '6.4],[131.8,-66.4],[132.9,-66.4],[133.9,-66.3],[134.8,-66.2],[135,-65.7],[135.1,-65.3],[135.7,-65.6],[135.9,-66],[136.2,',
        '-66.4],[136.6,-66.8],[137.5,-67],[138.6,-66.9],[139.9,-66.9],[140.8,-66.8],[142.1,-66.8],[143.1,-66.8],[144.4,-66.8],[14',
        '5.5,-66.9],[146.2,-67.2],[146,-67.6],[146.6,-67.9],[147.7,-68.1],[148.8,-68.4],[150.1,-68.6],[151.5,-68.7],[152.5,-68.9]',
        ',[153.6,-68.9],[154.3,-68.6],[155.2,-68.8],[155.9,-69.1],[156.8,-69.4],[158,-69.5],[159.2,-69.6],[159.7,-70],[160.8,-70.',
        '2],[161.6,-70.6],[162.7,-70.7],[163.8,-70.7],[164.9,-70.8],[166.1,-70.8],[167.3,-70.8],[168.4,-71],[169.5,-71.2],[170.5,',
        '-71.4],[171.2,-71.7],[171.1,-72.1],[170.6,-72.4],[170.1,-72.9],[169.8,-73.2],[169.3,-73.7],[168,-73.8],[167.4,-74.2],[16',
        '6.1,-74.4],[165.6,-74.8],[165,-75.1],[164.2,-75.5],[163.8,-75.9],[163.6,-76.2],[163.5,-76.7],[163.5,-77.1],[164.1,-77.5]',
        ',[164.3,-77.8],[164.7,-78.2],[166.6,-78.3],[167,-78.8],[165.2,-78.9],[163.7,-79.1],[161.8,-79.2],[160.9,-79.7],[160.7,-8',
        '0.2],[160.3,-80.6],[159.8,-80.9],[161.1,-81.3],[161.6,-81.7],[162.5,-82.1],[163.7,-82.4],[165.1,-82.7],[166.6,-83],[168.',
        '9,-83.3],[169.4,-83.8],[172.3,-84],[172.5,-84.1],[173.2,-84.4],[176,-84.2],[178.3,-84.5]]]]],["CYN","","","","Turkish Re',
        'public of Northern Cyprus",33.7,35.2,["CYN","CN","N. Cyprus","Turkish Republic of Northern Cyprus","Northern Cyprus"],[[',
        '[[32.7,35.1],[32.8,35.1],[32.9,35.4],[33.7,35.4],[34.6,35.7],[33.9,35.2],[34,35.1],[33.9,35.1],[33.7,35],[33.5,35],[33.5',
        ',35.1],[33.4,35.2],[33.2,35.2],[32.9,35.1]]]]],["CYP","CY","CYP","196","Cyprus",33.1,34.9,["CYP","CY","196","Cyprus"],[[',
        '[[32.7,35.1],[32.9,35.1],[33.2,35.2],[33.4,35.2],[33.5,35.1],[33.5,35],[33.7,35],[33.9,35.1],[34,35.1],[34,35],[33,34.6]',
        ',[32.5,34.7],[32.3,35.1]]]]],["MAR","MA","MAR","504","Morocco",-7.2,31.7,["MAR","MA","504","Morocco"],[[[[-2.2,35.2],[-1',
        '.8,34.5],[-1.7,33.9],[-1.4,32.9],[-1.1,32.7],[-1.3,32.3],[-2.6,32.1],[-3.1,31.7],[-3.6,31.6],[-3.7,30.9],[-4.9,30.5],[-5',
        '.2,30],[-6.1,29.7],[-7.1,29.6],[-8.7,28.8],[-8.7,27.7],[-8.8,27.7],[-8.8,27.1],[-9.4,27.1],[-9.7,26.9],[-10.2,26.9],[-10',
        '.6,27],[-11.4,26.9],[-11.7,26.1],[-12,26],[-12.5,24.8],[-13.9,23.7],[-14.2,22.3],[-14.6,21.9],[-14.8,21.5],[-17,21.4],[-',
        '17,21.9],[-16.6,22.2],[-16.3,22.7],[-16.3,23],[-16,23.7],[-15.4,24.4],[-15.1,24.5],[-14.8,25.1],[-14.8,25.6],[-14.4,26.3',
        '],[-13.8,26.6],[-13.1,27.6],[-13.1,27.7],[-12.6,28],[-11.7,28.1],[-10.9,28.8],[-10.4,29.1],[-9.6,29.9],[-9.8,31.2],[-9.4',
        ',32],[-9.3,32.6],[-8.7,33.2],[-7.7,33.7],[-6.9,34.1],[-6.2,35.1],[-5.9,35.8],[-5.2,35.8],[-4.6,35.3],[-3.6,35.4],[-2.6,3',
        '5.2]]]]],["EGY","EG","EGY","818","Egypt",29.4,26.2,["EGY","EG","818","Egypt"],[[[[36.9,22],[32.9,22],[29,22],[25,22],[25',
        ',25.7],[25,29.2],[24.7,30],[25,30.7],[24.8,31.1],[25.2,31.6],[26.5,31.6],[27.5,31.3],[28.5,31],[28.9,30.9],[29.7,31.2],[',
        '30.1,31.5],[31,31.6],[31.7,31.4],[32,30.9],[32.2,31.3],[33,31],[33.8,31],[34.3,31.2],[34.8,29.8],[34.9,29.5],[34.6,29.1]',
        ',[34.4,28.3],[34.2,27.8],[33.9,27.6],[33.6,28],[33.1,28.4],[32.4,29.9],[32.3,29.8],[32.7,28.7],[33.3,27.7],[34.1,26.1],[',
        '34.5,25.6],[34.8,25],[35.7,23.9],[35.5,23.8],[35.5,23.1],[36.7,22.2]]]]],["LBY","LY","LBY","434","Libya",18,26.6,["LBY",',
        '"LY","434","Libya"],[[[[25,22],[25,20],[23.9,20],[23.8,19.6],[19.8,21.5],[15.9,23.4],[14.9,22.9],[14.1,22.5],[13.6,23],[',
        '12,23.5],[11.6,24.1],[10.8,24.6],[10.3,24.4],[9.9,24.9],[9.9,25.4],[9.3,26.1],[9.7,26.5],[9.6,27.1],[9.8,27.7],[9.7,28.1',
        '],[9.9,29],[9.8,29.4],[9.5,30.3],[10,30.5],[10.1,31],[10,31.4],[10.6,31.8],[10.9,32.1],[11.4,32.4],[11.5,33.1],[12.7,32.',
        '8],[13.1,32.9],[13.9,32.7],[15.2,32.3],[15.7,31.4],[16.6,31.2],[18,30.8],[19.1,30.3],[19.6,30.5],[20.1,31],[19.8,31.8],[',
        '20.1,32.2],[20.9,32.7],[21.5,32.8],[22.9,32.6],[23.2,32.2],[23.6,32.2],[23.9,32],[24.9,31.9],[25.2,31.6],[24.8,31.1],[25',
        ',30.7],[24.7,30],[25,29.2],[25,25.7]]]]],["ETH","ET","ETH","231","Ethiopia",39.1,8,["ETH","ET","231","Ethiopia"],[[[[47.',
        '8,8],[45,5],[43.7,5],[42.8,4.3],[42.1,4.2],[41.9,3.9],[41.2,3.9],[40.8,4.3],[39.9,3.8],[39.6,3.4],[38.9,3.5],[38.7,3.6],',
        '[38.4,3.6],[38.1,3.6],[36.9,4.4],[36.2,4.4],[35.8,4.8],[35.8,5.3],[35.3,5.5],[34.7,6.6],[34.3,6.8],[34.1,7.2],[33.6,7.7]',
        ',[33,7.8],[33.3,8.4],[33.8,8.4],[34,8.7],[34,9.6],[34.3,10.6],[34.7,10.9],[34.8,11.3],[35.3,12.1],[35.9,12.6],[36.3,13.6',
        '],[36.4,14.4],[37.6,14.2],[37.9,15],[38.5,14.5],[39.1,14.7],[39.3,14.5],[40,14.5],[40.9,14.1],[41.2,13.8],[41.6,13.5],[4',
        '2,12.9],[42.4,12.5],[42,12.1],[41.7,11.6],[41.7,11.4],[41.8,11.1],[42.3,11],[42.6,11.1],[42.8,10.9],[42.6,10.6],[42.9,10',
        '],[43.3,9.5],[43.7,9.2],[46.9,8]]]]],["DJI","DJ","DJI","262","Djibouti",42.5,12,["DJI","DJ","262","Djibouti"],[[[[42.4,1',
        '2.5],[42.8,12.5],[43.1,12.7],[43.3,12.4],[43.3,12],[42.7,11.7],[43.1,11.5],[42.8,10.9],[42.6,11.1],[42.3,11],[41.8,11.1]',
        ',[41.7,11.4],[41.7,11.6],[42,12.1]]]]],["SOL","","","","Somaliland",46.7,9.4,["SOL","SL","Somaliland"],[[[[48.9,11.4],[4',
        '8.9,11],[48.9,10],[48.9,9.5],[48.5,8.8],[47.8,8],[46.9,8],[43.7,9.2],[43.3,9.5],[42.9,10],[42.6,10.6],[42.8,10.9],[43.1,',
        '11.5],[43.5,11.3],[43.7,10.9],[44.1,10.4],[44.6,10.4],[45.6,10.7],[46.6,10.8],[47.5,11.1],[48,11.2],[48.4,11.4]]]]],["UG',
        'A","UG","UGA","800","Uganda",32.9,2,["UGA","UG","800","Uganda"],[[[[33.9,-0.9],[31.9,-1],[30.8,-1],[30.4,-1.1],[29.8,-1.',
        '4],[29.6,-1.3],[29.6,-0.6],[29.8,-0.2],[29.9,0.6],[30.1,1.1],[30.5,1.6],[30.9,1.8],[31.2,2.2],[30.8,2.3],[30.8,3.5],[31.',
        '2,3.8],[31.9,3.6],[32.7,3.8],[33.4,3.8],[34,4.2],[34.5,3.6],[34.6,3.1],[35,1.9],[34.7,1.2],[34.2,0.5],[33.9,0.1]]]]],["R',
        'WA","RW","RWA","646","Rwanda",30.1,-1.9,["RWA","RW","646","Rwanda"],[[[[30.4,-1.1],[30.8,-1.7],[30.8,-2.3],[30.5,-2.4],[',
        '29.9,-2.3],[29.6,-2.9],[29,-2.8],[29.1,-2.3],[29.3,-2.2],[29.3,-1.6],[29.6,-1.3],[29.8,-1.4]]]]],["BIH","BA","BIH","070"',
        ',"Bosnia and Herzegovina",18.1,44.1,["BIH","BA","070","BiH","Bosnia and Herz.","Bosnia and Herzegovina"],[[[[18.6,42.7],',
        '[17.7,43],[17.3,43.4],[16.9,43.7],[16.5,44],[16.2,44.4],[15.8,44.8],[16,45.2],[16.3,45],[16.5,45.2],[17,45.2],[17.9,45.1',
        '],[18.6,45.1],[19,44.9],[19.4,44.9],[19.1,44.4],[19.6,44],[19.5,43.6],[19.2,43.5],[19,43.4],[18.7,43.2]]]]],["MKD","MK",',
        '"MKD","807","North Macedonia",21.6,41.6,["MKD","MK","807","NM","North Macedonia"],[[[[22.4,42.3],[22.9,42],[23,41.3],[22',
        '.8,41.3],[22.6,41.1],[22.1,41.1],[21.7,40.9],[21,40.8],[20.6,41.1],[20.5,41.5],[20.6,41.9],[20.7,41.8],[20.8,42.1],[21.4',
        ',42.2],[21.6,42.2],[21.9,42.3]]]]],["SRB","RS","SRB","688","Serbia",20.8,44.2,["SRB","RS","688","YF","Serbia","Republic ',
        'of Serbia"],[[[[18.8,45.9],[19.6,46.2],[20.2,46.1],[20.8,45.7],[20.9,45.4],[21.5,45.2],[21.6,44.8],[22.1,44.5],[22.5,44.',
        '7],[22.7,44.6],[22.5,44.4],[22.7,44.2],[22.4,44],[22.5,43.6],[23,43.2],[22.6,42.9],[22.4,42.6],[22.5,42.5],[22.4,42.3],[',
        '21.9,42.3],[21.6,42.2],[21.5,42.3],[21.7,42.4],[21.8,42.7],[21.6,42.7],[21.4,42.9],[21.3,42.9],[21.1,43.1],[21,43.1],[20',
        '.8,43.3],[20.6,43.2],[20.5,42.9],[20.3,42.8],[20.3,42.9],[20,43.1],[19.6,43.2],[19.5,43.4],[19.2,43.5],[19.5,43.6],[19.6',
        ',44],[19.1,44.4],[19.4,44.9],[19,44.9],[19.4,45.2],[19.1,45.5]]]]],["MNE","ME","MNE","499","Montenegro",19.1,42.8,["MNE"',
        ',"ME","499","Montenegro"],[[[[20.1,42.6],[19.8,42.5],[19.7,42.7],[19.3,42.2],[19.4,41.9],[19.2,42],[18.9,42.3],[18.5,42.',
        '5],[18.6,42.7],[18.7,43.2],[19,43.4],[19.2,43.5],[19.5,43.4],[19.6,43.2],[20,43.1],[20.3,42.9],[20.3,42.8]]]]],["KOS",""',
        ',"","","Kosovo",20.9,42.6,["KOS","KO","KV","KSV","Kosovo"],[[[[20.6,41.9],[20.5,42.2],[20.3,42.3],[20.1,42.6],[20.3,42.8',
        '],[20.5,42.9],[20.6,43.2],[20.8,43.3],[21,43.1],[21.1,43.1],[21.3,42.9],[21.4,42.9],[21.6,42.7],[21.8,42.7],[21.7,42.4],',
        '[21.5,42.3],[21.6,42.2],[21.4,42.2],[20.8,42.1],[20.7,41.8]]]]],["TTO","TT","TTO","780","Trinidad and Tobago",-60.9,11,[',
        '"TTO","TT","780","Trinidad and Tobago"],[[[[-61.7,10.8],[-61.1,10.9],[-60.9,10.9],[-60.9,10.1],[-61.8,10],[-61.9,10.1],[',
        '-61.7,10.4]]]]],["SDS","SS","SSD","728","South Sudan",30.4,7.2,["SDS","SS","SSD","728","S. Sudan","South Sudan"],[[[[30.',
        '8,3.5],[30,4.2],[29.7,4.6],[29.2,4.4],[28.7,4.5],[28.4,4.3],[28,4.4],[27.4,5.2],[27.2,5.6],[26.5,5.9],[26.2,6.5],[25.8,7',
        '],[25.1,7.5],[25.1,7.8],[24.6,8.2],[23.9,8.6],[24.2,8.7],[24.5,8.9],[24.8,9.8],[25.1,10.3],[25.8,10.4],[26,10.1],[26.5,9',
        '.6],[26.8,9.5],[27.1,9.6],[27.8,9.6],[28,9.4],[29,9.4],[29,9.6],[29.5,9.8],[29.6,10.1],[30,10.3],[30.8,9.7],[31.4,9.8],[',
        '31.9,10.5],[32.4,11.1],[32.3,11.7],[32.1,12],[32.7,12],[32.7,12.2],[33.2,12.2],[33.1,11.4],[33.2,10.7],[33.7,10.3],[33.8',
        ',10],[33.8,9.5],[34,9.5],[34,8.7],[33.8,8.4],[33.3,8.4],[33,7.8],[33.6,7.7],[34.1,7.2],[34.3,6.8],[34.7,6.6],[35.3,5.5],',
        '[34.6,4.8],[34,4.2],[33.4,3.8],[32.7,3.8],[31.9,3.6],[31.2,3.8]]]]]]',
    ].join('');
    let countryCache;
    function naturalEarthCountries110m() {
        countryCache ??= JSON.parse(serializedCountries);
        return countryCache;
    }

    const WORLD_ASPECT_RATIO = 2;
    const DEFAULT_BASEMAP = 'natural-earth';
    function optionBoolean(context, name, fallback) {
        const value = context.layer.mark.options[name];
        return typeof value === 'boolean' ? value : fallback;
    }
    function optionNumber$4(context, name, fallback) {
        const value = context.layer.mark.options[name];
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }
    function optionString$4(context, name, fallback) {
        const value = context.layer.mark.options[name];
        return typeof value === 'string' && value.trim() !== '' ? value : fallback;
    }
    /**
     * Returns the undistorted 2:1 equirectangular viewport centered inside a chart plot.
     */
    function geographicViewport(plot) {
        const padding = Math.min(8, plot.width * 0.02, plot.height * 0.04);
        const availableWidth = Math.max(1, plot.width - padding * 2);
        const availableHeight = Math.max(1, plot.height - padding * 2);
        const width = Math.min(availableWidth, availableHeight * WORLD_ASPECT_RATIO);
        const height = width / WORLD_ASPECT_RATIO;
        return {
            x: plot.x + (plot.width - width) / 2,
            y: plot.y + (plot.height - height) / 2,
            width,
            height,
        };
    }
    function isGeographicPosition(longitude, latitude) {
        return (Number.isFinite(longitude) &&
            Number.isFinite(latitude) &&
            longitude >= -180 &&
            longitude <= 180 &&
            latitude >= -90 &&
            latitude <= 90);
    }
    function projectGeographicPosition(plot, longitude, latitude) {
        const viewport = geographicViewport(plot);
        return {
            x: viewport.x + ((longitude + 180) / 360) * viewport.width,
            y: viewport.y + ((90 - latitude) / 180) * viewport.height,
        };
    }
    function normalizedCountryKey(value) {
        return value
            .normalize('NFKD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^\p{Letter}\p{Number}]+/gu, '')
            .toUpperCase();
    }
    let countryIndex;
    function naturalEarthCountryIndex() {
        if (countryIndex !== undefined)
            return countryIndex;
        const index = new Map();
        for (const country of naturalEarthCountries110m()) {
            for (const alias of country[7]) {
                const key = normalizedCountryKey(alias);
                if (key !== '' && !index.has(key))
                    index.set(key, country);
            }
        }
        const aliases = {
            AMERICA: 'USA',
            KOREA: 'KOR',
            REPUBLICOFKOREA: 'KOR',
            SOUTHKOREA: 'KOR',
            대한민국: 'KOR',
            UK: 'GBR',
            UNITEDKINGDOM: 'GBR',
            UNITEDSTATES: 'USA',
        };
        for (const [alias, canonical] of Object.entries(aliases)) {
            const country = index.get(canonical);
            if (country !== undefined)
                index.set(normalizedCountryKey(alias), country);
        }
        countryIndex = index;
        return index;
    }
    function naturalEarthCountry(value) {
        return naturalEarthCountryIndex().get(normalizedCountryKey(value));
    }
    function projectedPolygon(plot, polygon) {
        const rings = polygon
            .map((ring) => ring
            .filter(([longitude, latitude]) => isGeographicPosition(longitude, latitude))
            .map(([longitude, latitude]) => projectGeographicPosition(plot, longitude, latitude)))
            .filter((ring) => ring.length >= 3);
        const points = rings[0];
        if (points === undefined)
            return null;
        return {
            points,
            ...(rings.length > 1 ? { subpaths: rings.slice(1) } : {}),
        };
    }
    function countryPathNodes(context, country, options) {
        const nodes = [];
        country[8].forEach((polygon, polygonIndex) => {
            const projected = projectedPolygon(context.plot, polygon);
            if (projected === null)
                return;
            const hasDatum = options.rowIndex !== undefined && options.datum !== undefined;
            nodes.push({
                type: 'path',
                ...nodeBase(`${options.idPrefix}:${country[0]}:${polygonIndex}`, {
                    zIndex: options.zIndex,
                    opacity: options.opacity ?? 1,
                    interactive: options.interactive ?? false,
                    ...(hasDatum
                        ? {
                            datum: {
                                layerId: context.layer.id,
                                rowIndex: options.rowIndex,
                                datum: options.datum,
                            },
                        }
                        : {}),
                }),
                points: projected.points,
                ...(projected.subpaths === undefined ? {} : { subpaths: projected.subpaths }),
                closed: true,
                fillRule: 'evenodd',
                fill: options.fill,
                stroke: options.stroke,
                lineWidth: options.lineWidth,
                lineJoin: 'round',
            });
        });
        return nodes;
    }
    function worldBasemapNodes(context) {
        const { layer, plot, theme } = context;
        if (optionString$4(context, 'basemap', DEFAULT_BASEMAP) === 'none')
            return [];
        const viewport = geographicViewport(plot);
        const oceanFill = optionString$4(context, 'oceanFill', mixColor(theme.colors.background, theme.colors.sequential[0] ?? theme.colors.surface, 0.2));
        const landFill = optionString$4(context, 'landFill', mixColor(theme.colors.surface, theme.colors.grid, theme.mode === 'dark' ? 0.3 : 0.48));
        const countryStroke = optionString$4(context, 'countryStroke', colorWithOpacity(theme.colors.axis, theme.mode === 'dark' ? 0.62 : 0.48));
        const countryLineWidth = Math.max(0, optionNumber$4(context, 'countryLineWidth', 0.55));
        const nodes = [
            {
                type: 'rect',
                ...nodeBase(`${layer.id}:natural-earth:surface`, { zIndex: layer.zIndex - 4 }),
                x: viewport.x,
                y: viewport.y,
                width: viewport.width,
                height: viewport.height,
                fill: oceanFill,
                stroke: theme.colors.grid,
                lineWidth: 0.8,
                cornerRadius: 8,
            },
        ];
        if (optionBoolean(context, 'graticule', false)) {
            for (let longitude = -120; longitude <= 120; longitude += 60) {
                const top = projectGeographicPosition(plot, longitude, 90);
                const bottom = projectGeographicPosition(plot, longitude, -90);
                nodes.push({
                    type: 'line',
                    ...nodeBase(`${layer.id}:natural-earth:longitude:${longitude}`, {
                        zIndex: layer.zIndex - 3.5,
                        opacity: 0.5,
                    }),
                    x1: top.x,
                    y1: top.y,
                    x2: bottom.x,
                    y2: bottom.y,
                    stroke: theme.colors.grid,
                    lineWidth: 0.6,
                });
            }
            for (let latitude = -60; latitude <= 60; latitude += 30) {
                const left = projectGeographicPosition(plot, -180, latitude);
                const right = projectGeographicPosition(plot, 180, latitude);
                nodes.push({
                    type: 'line',
                    ...nodeBase(`${layer.id}:natural-earth:latitude:${latitude}`, {
                        zIndex: layer.zIndex - 3.5,
                        opacity: 0.5,
                    }),
                    x1: left.x,
                    y1: left.y,
                    x2: right.x,
                    y2: right.y,
                    stroke: theme.colors.grid,
                    lineWidth: 0.6,
                });
            }
        }
        for (const country of naturalEarthCountries110m()) {
            nodes.push(...countryPathNodes(context, country, {
                idPrefix: `${layer.id}:natural-earth:country`,
                zIndex: layer.zIndex - 3,
                fill: landFill,
                stroke: countryStroke,
                lineWidth: countryLineWidth,
            }));
        }
        if (optionBoolean(context, 'attribution', true)) {
            const attribution = {
                type: 'text',
                ...nodeBase(`${layer.id}:natural-earth:attribution`, {
                    zIndex: layer.zIndex - 1.5,
                    opacity: 0.76,
                }),
                x: viewport.x + viewport.width - 5,
                y: viewport.y + viewport.height - 4,
                text: 'Natural Earth · 1:110m',
                fill: theme.colors.mutedText,
                fontFamily: theme.typography.fontFamily,
                fontSize: Math.max(8, theme.typography.fontSize - 3),
                fontWeight: 500,
                align: 'right',
                baseline: 'bottom',
                rotation: 0,
            };
            nodes.push(attribution);
        }
        return nodes;
    }
    function worldCountryOverlayNodes(context, country, rowIndex, fill) {
        return countryPathNodes(context, country, {
            idPrefix: `${context.layer.id}:natural-earth:region`,
            zIndex: context.layer.zIndex,
            fill,
            stroke: context.layer.mark.stroke ?? context.theme.colors.background,
            lineWidth: context.layer.mark.lineWidth ?? 0.8,
            opacity: context.layer.mark.opacity,
            interactive: context.performance.enableHitTesting,
            rowIndex,
            datum: context.table.row(rowIndex),
        });
    }

    const TAU = Math.PI * 2;
    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }
    function optionNumber$3(value, fallback) {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }
    function optionString$3(value, fallback) {
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
        const mode = optionString$3(layer.mark.options.mode, 'area');
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
        const variant = optionString$3(layer.mark.options.variant, 'pyramid');
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
        const shape = optionString$3(layer.mark.options.shape, 'hexagon');
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
        return optionString$3(context.layer.mark.options.kind, 'line');
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
        const kind = optionString$3(layer.mark.options.kind, 'ohlc');
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
    const compileGeoLineMark = (context) => {
        const { layer, table, plot, theme } = context;
        const longitude2Field = layer.mark.fields.longitude2 ?? layer.mark.fields.x2 ?? 'longitude2';
        const latitude2Field = layer.mark.fields.latitude2 ?? layer.mark.fields.y2 ?? 'latitude2';
        const valueField = layer.mark.fields.value;
        const valueExtent = valueField !== undefined && table.has(valueField) ? table.extent(valueField) : null;
        const flow = layer.mark.options.flow === true;
        const nodes = worldBasemapNodes(context);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
            const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
            const longitude2 = table.has(longitude2Field)
                ? numericDataValue(table.value(rowIndex, longitude2Field))
                : null;
            const latitude2 = table.has(latitude2Field)
                ? numericDataValue(table.value(rowIndex, latitude2Field))
                : null;
            if (longitude === null ||
                latitude === null ||
                longitude2 === null ||
                latitude2 === null ||
                !isGeographicPosition(longitude, latitude) ||
                !isGeographicPosition(longitude2, latitude2))
                continue;
            const start = projectGeographicPosition(plot, longitude, latitude);
            const end = projectGeographicPosition(plot, longitude2, latitude2);
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
        const nodes = worldBasemapNodes(context);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
            const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
            const value = table.has(valueField)
                ? numericDataValue(table.value(rowIndex, valueField))
                : null;
            if (longitude === null ||
                latitude === null ||
                value === null ||
                !isGeographicPosition(longitude, latitude))
                continue;
            const point = projectGeographicPosition(plot, longitude, latitude);
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
        const nodes = worldBasemapNodes(context);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
            const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
            if (longitude === null || latitude === null || !isGeographicPosition(longitude, latitude))
                continue;
            const point = projectGeographicPosition(plot, longitude, latitude);
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
        const paths = [node.points, ...(node.subpaths ?? [])];
        if (node.closed) {
            let inside = false;
            for (const points of paths) {
                if (points.length < 3)
                    continue;
                for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
                    const currentPoint = points[index];
                    const previousPoint = points[previous];
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
            }
            if (inside)
                return 0;
        }
        let minimum = Number.POSITIVE_INFINITY;
        for (const points of paths) {
            const only = points[0];
            if (points.length === 1 && only !== undefined) {
                minimum = Math.min(minimum, Math.hypot(x - only.x, y - only.y));
                continue;
            }
            for (let index = 1; index < points.length; index += 1) {
                const first = points[index - 1];
                const second = points[index];
                if (first === undefined || second === undefined)
                    continue;
                minimum = Math.min(minimum, distanceToSegment(x, y, first.x, first.y, second.x, second.y));
            }
            if (node.closed && points.length > 1) {
                const first = points[0];
                const last = points[points.length - 1];
                if (first !== undefined && last !== undefined) {
                    minimum = Math.min(minimum, distanceToSegment(x, y, last.x, last.y, first.x, first.y));
                }
            }
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
    function optionString$2(options, name) {
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
                ? (optionString$2(layer.mark.options, 'risingColor') ?? theme.colors.palette[1] ?? '#0f9f8a')
                : (optionString$2(layer.mark.options, 'fallingColor') ?? theme.colors.palette[3] ?? '#ef4444');
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
                ? (optionString$2(layer.mark.options, 'positiveColor') ??
                    theme.colors.palette[1] ??
                    '#0f9f8a')
                : (optionString$2(layer.mark.options, 'negativeColor') ??
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
                fill: optionString$2(layer.mark.options, 'oldColor') ?? theme.colors.mutedText,
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
        const mark = optionString$2(context.layer.mark.options, 'mark') ?? 'line';
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
    function optionString$1(options, name) {
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
            nodes.push(labelNode(`${layer.id}:center-label`, cx, cy - 9, optionString$1(layer.mark.options, 'centerLabel') ?? 'Total', context, 10, { fill: theme.colors.mutedText, weight: 600 }));
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
    function optionString(options, name) {
        const value = options[name];
        return typeof value === 'string' ? value : undefined;
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
    const compileGeoMark = (context) => {
        const { table, layer, plot, theme, performance } = context;
        const nodes = worldBasemapNodes(context);
        const rows = [];
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const region = String(table.value(rowIndex, layer.x.field) ?? '').trim();
            const value = numericDataValue(table.value(rowIndex, layer.y.field));
            const country = naturalEarthCountry(region);
            if (country === undefined || value === null)
                continue;
            rows.push({ rowIndex, value, country });
        }
        if (rows.length === 0)
            return nodes;
        const minimum = Math.min(...rows.map(({ value }) => value));
        const maximum = Math.max(...rows.map(({ value }) => value));
        const mode = optionString(layer.mark.options, 'mode') ?? 'bubble';
        for (const { rowIndex, value, country } of rows) {
            const ratio = maximum === minimum ? 0.6 : (value - minimum) / (maximum - minimum);
            const fill = layer.mark.fill ?? theme.colors.focus;
            if (mode === 'choropleth') {
                const start = theme.colors.sequential[0] ?? colorWithOpacity(fill, 0.18);
                const end = theme.colors.sequential.at(-1) ?? fill;
                nodes.push(...worldCountryOverlayNodes(context, country, rowIndex, mixColor(start, end, ratio)));
                continue;
            }
            const point = projectGeographicPosition(plot, country[5], country[6]);
            const radius = 5 + Math.sqrt(Math.max(0, ratio)) * 12;
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
        const nodes = worldBasemapNodes(context);
        const sizeField = layer.mark.fields.size;
        const extent = sizeField === undefined || !table.has(sizeField) ? null : table.extent(sizeField);
        for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
            const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
            const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
            if (longitude === null || latitude === null || !isGeographicPosition(longitude, latitude))
                continue;
            const rawSize = sizeField === undefined ? null : numericDataValue(table.value(rowIndex, sizeField));
            const ratio = rawSize === null || extent === null || extent[1] === extent[0]
                ? 0.5
                : (rawSize - extent[0]) / (extent[1] - extent[0]);
            const point = projectGeographicPosition(plot, longitude, latitude);
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
            context.setLineDash(node.dash === undefined ? [] : [...node.dash]);
            context.stroke();
        }
        #drawPath(context, node) {
            const paths = [node.points, ...(node.subpaths ?? [])].filter((points) => points.length > 0);
            if (paths.length === 0)
                return;
            context.beginPath();
            for (const points of paths) {
                const first = points[0];
                if (first === undefined)
                    continue;
                context.moveTo(first.x, first.y);
                for (let index = 1; index < points.length; index += 1) {
                    const point = points[index];
                    if (point !== undefined)
                        context.lineTo(point.x, point.y);
                }
                if (node.closed)
                    context.closePath();
            }
            context.setLineDash(node.dash === undefined ? [] : [...node.dash]);
            context.lineCap = node.lineCap ?? 'round';
            context.lineJoin = node.lineJoin ?? 'round';
            if (node.fill !== undefined) {
                context.fillStyle = node.fill;
                context.fill(node.fillRule ?? 'nonzero');
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
            const fontStyle = node.fontStyle === undefined ? '' : `${node.fontStyle} `;
            context.font = `${fontStyle}${node.fontWeight} ${node.fontSize}px ${node.fontFamily}`;
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

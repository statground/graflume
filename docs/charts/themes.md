# Chart themes

Graflume ships three built-in chart themes:

| Theme            | Purpose                                       |
| ---------------- | --------------------------------------------- |
| `graflume-light` | Graflume's presentation-oriented light design |
| `graflume-dark`  | Graflume's presentation-oriented dark design  |
| `ggplot`         | The visual contract of ggplot2 `theme_gray()` |

Use the same theme name with a portable `ChartSpec`, a Quick API, or a `SpatialSpec`:

```ts
import { line } from 'graflume';

line('#chart', rows, {
  x: { field: 'month', type: 'ordinal' },
  y: { field: 'sales', type: 'quantitative' },
  theme: 'ggplot',
});
```

The named token object is also exported as `graflumeGgplot`. Explicit chart, axis, legend, and mark styles continue to override the selected theme. A custom theme can extend it without executable callbacks:

```ts
const spec = {
  // data, mark, x, and y omitted
  theme: {
    extends: 'ggplot',
    name: 'company-ggplot',
    colors: { focus: '#0057b8' },
  },
};
```

## `ggplot` reference contract

The built-in profile is pinned to ggplot2 4.0.3's default [`theme_gray()` implementation](https://github.com/tidyverse/ggplot2/blob/v4.0.3/R/theme-defaults.R). It does not silently track a future ggplot2 release.

[![Compiled Graflume ggplot theme output](../assets/charts/ggplot-theme.svg)](../assets/charts/ggplot-theme.svg)

For Canvas charts it applies the corresponding structure and tokens:

- white plot background and `#EBEBEB` panel background, with no panel border;
- white x/y major and minor grid lines, no axis baseline, and visible `#333333` ticks;
- the 11 pt base, 8.8 pt axis/legend, and 13.2 pt plot-title typography at the browser's 96 dpi CSS conversion, all plain weight;
- ggplot2's default category-count-dependent HCL hue palette;
- the `#132B43` to `#56B1F7` default continuous colour ramp with Lab interpolation;
- square grey bars, black points and lines, `#333333` areas without an outline, butt line ends, and round joins when an equivalent Graflume mark exists.

The physical-unit conversion is fixed and tested: 11 pt is 14.6667 CSS px, 2.75 pt ticks are 3.6667 CSS px, 0.5 mm major lines are 1.8898 CSS px, and 0.25 mm minor lines are 0.9449 CSS px. Discrete colours are resolved for the complete category count instead of taking the first colours from a fixed array.

## Coverage and limits

The theme is accepted by every one of the 41 Canvas families and all 162 Canvas presets. It also flows through all seven `graflume/spatial` variants and the Map globe mode, covering the full 44-family catalog.

For marks with a direct ggplot2 core counterpart, such as points, lines, bars, areas, intervals, distributions, tiles, contours, and flat maps, Graflume applies that counterpart's theme-facing defaults. ggplot2 core has no canonical Sankey, gauge, financial terminal chart, hierarchy, specialist 3D-style Canvas mark, WebGL volume, surface, cone, streamtube, or orbit-camera design. Those families therefore retain their Graflume geometry while inheriting the same panel, typography, hue/continuous scales, and chrome. This is the only meaningful interpretation of the ggplot2 design for a chart type that ggplot2 itself does not define.

Canvas and R graphics devices use different font discovery, text metrics, antialiasing, and rasterisation. The structural tokens and scale outputs are deterministic, but a browser bitmap is not promised to be byte-identical to every R graphics device. Pin the same font, dimensions, pixel ratio, and locale when making visual reference comparisons.

Spatial WebGL has no Cartesian axes or minor grid. Its viewport receives the grey panel, its surrounding surface and overlays receive the plot/legend colours and typography, and its mapped colours use the same theme resolvers. Explicit `background`, layer colours, and datum colours remain authoritative.

## Theme precedence

Graflume resolves appearance in this order, from strongest to weakest:

1. explicit mark, axis, legend, or spatial background values;
2. custom values supplied by a theme extending `ggplot`;
3. the built-in `ggplot` profile;
4. geometry-specific safety fallbacks for an element with no ggplot2 counterpart.

Changing a theme never changes source data, domains, picks, datum references, interaction state, or accessibility text. It changes layout only where the selected theme's typography, margins, tick lengths, or axes require different measured space.

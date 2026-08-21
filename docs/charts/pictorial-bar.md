# Pictorial bar charts

[Back to the chart guide index](./README.md)

![Current Graflume pictorial bar charts output](../assets/charts/pictorial-bar.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a pictorial bar when repeated simple symbols communicate count more effectively than a solid rectangle.

## Data contract

`x` supplies category and `y` supplies a quantitative value. Values are converted into repeated symbols from a zero baseline.

### Named fields

No additional fields are required.

### Portable options

`symbol` accepts the supported renderer-neutral symbol names, `unit` controls value per symbol, and `maxSymbols` clamps the repeated count to 2–40.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { pictorialBar } from 'graflume/complete';

pictorialBar('#chart', data, {
  x: { field: 'category', type: 'ordinal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { options: { symbol: 'diamond', unit: 5, maxSymbols: 12 } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'pictorial-bar'`.

## Rendering behavior

The compiler derives a portable symbol grid for each category. Symbols are interactive and preserve the category row without using image assets or external fonts.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Repeated symbols are decorative instances of one datum. A text table should provide the exact value and unit so users do not need to count glyphs.

## Performance

The explicit symbol cap prevents unbounded scene growth. Solid bars are preferable when categories or values are numerous.

## Current limitations

Arbitrary SVG paths, image symbols, partial-symbol clipping, horizontal orientation, stacks, and animation are not implemented yet.

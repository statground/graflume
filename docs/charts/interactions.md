# Common chart interactions

Graflume keeps interaction portable by separating the chart specification from the browser controls that operate it. The built-in Canvas renderer supports an opt-in inspection viewport, reset, fullscreen, PNG export, and discrete playback. The same contract is available to every one of the 41 chart families, but playback remains an explicit semantic choice rather than an automatic family default.

## Inspection viewport, not data zoom

`interaction.navigation` magnifies and translates the complete Canvas after Graflume has compiled the chart. The title, axes, labels, marks, basemap, and annotations move together as one already-rendered surface.

This is useful for inspecting a dense chart, but it does **not**:

- change an x/y scale domain or request a smaller data window;
- re-bin, aggregate, sample, or recompile marks at a new analytical resolution;
- fit a map region, change its projection, load tiles, or provide GIS/slippy-map zoom;
- preserve the title and axes while zooming only the plot.

Reset returns the complete surface to the configured `minZoom` (default `1`) with zero offsets. If an application needs domain zoom, brush selection, resampling, geographic fitting, or tile navigation, it needs a domain-specific integration beyond this inspection viewport.

```ts
import { line } from 'graflume';

const chart = line('#chart', rows, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'value', type: 'quantitative' },
  interaction: {
    navigation: {
      minZoom: 1,
      maxZoom: 4,
      wheel: 'modifier',
      drag: true,
      pinch: true,
      keyboard: true,
    },
    controls: {
      zoom: true,
      reset: true,
      fullscreen: true,
      export: true,
    },
  },
});
```

### Navigation options

| Option     | Values                         | Default    | Meaning                                                                |
| ---------- | ------------------------------ | ---------- | ---------------------------------------------------------------------- |
| `minZoom`  | finite number from 1 through 6 | `1`        | Smallest inspection magnification                                      |
| `maxZoom`  | finite number from 1 through 6 | `6`        | Largest inspection magnification; must be at least `minZoom`           |
| `wheel`    | `off`, `modifier`, `always`    | `modifier` | Whether wheel input zooms the Canvas                                   |
| `drag`     | boolean                        | `true`     | Whether pointer dragging pans a magnified Canvas                       |
| `pinch`    | boolean                        | `true`     | Whether a two-pointer pinch changes inspection magnification           |
| `keyboard` | boolean                        | `true`     | Whether the focused chart surface accepts inspection keyboard commands |

`navigation: true` uses these defaults. `navigation: false` or omission leaves the inspection input controller off. `wheel: 'modifier'` avoids taking over ordinary page scrolling; Ctrl or Meta must be held while using the wheel over the chart.

When keyboard navigation is enabled, Graflume makes the Canvas focusable. `+` or `=` zooms in, `-` or `_` zooms out, the arrow keys pan by 24 Scene pixels, and `0` or Home resets the view. Pointer dragging pans, and two active touch pointers pinch when their corresponding options are enabled. At the identity view the Canvas uses `touch-action: pan-y`, so a one-finger vertical swipe can still scroll the page. Once the inspection view is actually zoomed or panned it switches to `none` so the enabled custom gesture owns movement; reset restores `pan-y`. Hit testing maps the pointer back through the inspection transform, so mark and axis-nearest tooltips still resolve against the underlying Scene.

The renderer advertises inspection support separately. The built-in Canvas renderer supports it; a custom renderer may decline it, so integrations must not present renderer-specific controls as universally operational.

## Controls, fullscreen, and export

`interaction.controls` adds a compact floating control strip at the chart's top-right corner. The closed desktop strip is icon-only: each 28 px control keeps its localized `title` tooltip and accessible name, while the single translucent surface becomes fully opaque on hover or keyboard focus. A boolean `true` requests every control group. When an object is used, every omitted group defaults to `false`, which makes an explicit object the safer choice for production interfaces.

| Option       | Effect                                                           |
| ------------ | ---------------------------------------------------------------- |
| `zoom`       | Zoom-in and zoom-out buttons for the inspection viewport         |
| `reset`      | Restore the configured minimum inspection view                   |
| `fullscreen` | Enter or exit browser fullscreen for the chart host              |
| `export`     | Download the currently rendered Canvas as PNG                    |
| `playback`   | Previous, play/pause, next, seek, speed, and loop controls       |
| `labels`     | Override control tooltips and accessible names without callbacks |

The label keys are `controls` for the toolbar name plus `zoomIn`, `zoomOut`, `reset`, `enterFullscreen`, `exitFullscreen`, `exportPng`, `previousFrame`, `play`, `pause`, `nextFrame`, `seek`, `speed`, and `loop`. Values must be non-empty strings. This keeps localization declarative and avoids executable formatters in the portable spec.

Previous, play/pause, and next remain in the closed strip. Seek, current frame, playback rate, and loop live in a secondary panel opened from the adjacent playback-options button, so temporal controls do not force a long permanent bar over the plot. The disclosure name combines the localized seek, speed, and loop labels; it declares the associated dialog, closes on an outside pointer press or Escape, and returns Escape focus to its trigger. The panel is the only user-triggered expanded surface.

The desktop strip is 30 CSS pixels high and sits 6 pixels from the chart's top and right edges. Coarse-pointer or narrow layouts use real 44 px button targets in a 44 px strip positioned 2 pixels from those edges; the SVG remains visually small, and the strip scrolls horizontally only if the host is narrower than the enabled control set. Hosts whose title or marks occupy the top-right corner should reserve at least 50 CSS pixels of top padding. Both LTR and RTL pages keep this technical control sequence LTR and anchored top-right. The diagnostic `data-graflume-controls`, `data-graflume-controls-density`, `data-graflume-controls-placement`, `data-graflume-control`, and playback-panel attributes support behavior tests; applications should prefer the portable options and labels instead of replacing internal control styles.

A control does not enable the underlying capability. Pair zoom/reset controls with `navigation`, and pair playback controls with a valid `playback` object. Controls whose renderer, browser, or playback prerequisite is unavailable remain disabled.

Fullscreen depends on the browser Fullscreen API and a live DOM target. Graflume requests fullscreen for the renderer overlay host, remeasures and renders at the temporary fullscreen size, and restores the ordinary measured dimensions after exit. PNG export depends on the active renderer exposing `toDataURL()`; the built-in Canvas renderer does, and the built-in control downloads `graflume-chart.png`. The exported image contains the current inspection transform but not DOM overlays such as the toolbar or tooltip. Neither action changes the underlying data specification.

## Discrete playback

Playback advances over distinct values from one source field. It is discrete: Graflume does not tween coordinates, interpolate missing observations, create motion trails, or invent values between frames.

```ts
const chart = motion('#chart', rows, {
  x: { field: 'income', type: 'quantitative' },
  y: { field: 'lifeExpectancy', type: 'quantitative' },
  mark: {
    fields: { size: 'population', color: 'country', time: 'year' },
  },
  interaction: {
    playback: {
      field: 'year',
      mode: 'frame',
      interval: 1000,
      rate: 1,
      loop: false,
      windowSize: 1,
      autoplay: false,
      filter: false,
    },
    controls: { playback: true },
  },
});
```

`playback: true` is invalid because Graflume cannot infer a semantically correct field. Supply an object with `field` and opt into the playback controls separately.

### Playback options

| Option       | Values / range                  | Default             | Meaning                                                                                        |
| ------------ | ------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `field`      | non-empty safe field name       | required            | Selects the discrete frame values                                                              |
| `layerId`    | non-empty layer id              | all matching layers | Limits frame collection and transient changes to one layer; generated ids use `layer-N`        |
| `mode`       | `frame`, `cumulative`, `window` | `frame`             | Select one frame, a prefix through the current frame, or a rolling window                      |
| `interval`   | 100 through 60,000 milliseconds | `1000`              | Base playback interval                                                                         |
| `rate`       | 0.1 through 16                  | `1`                 | Playback speed multiplier                                                                      |
| `loop`       | boolean                         | `false`             | Continue from the first frame after the last                                                   |
| `windowSize` | integer from 1 through 10,000   | `1`                 | Number of distinct frame values retained by `window` mode                                      |
| `autoplay`   | boolean                         | `false`             | Start advancing after initialization                                                           |
| `filter`     | boolean                         | `false`             | Apply the generic transient row filter; enable only from a reviewed host-side family allowlist |

Frame values follow the first occurrence of each unique non-null value in the selected source. Graflume does not sort strings, numbers, or dates. Sort input rows before chart creation when chronological playback is required. With `layerId`, only that layer's effective data source contributes frame values; without it, matching layers contribute in source/layer encounter order and duplicate values collapse to one frame.

The modes select these first-occurrence values as follows:

- `frame`: the current value only;
- `cumulative`: every value from the first through the current value;
- `window`: at most `windowSize` values ending at the current value.

If a mark already declares `mark.options.frame` and that value exists in the collected frames, it selects the initial index. Otherwise `frame` mode or `autoplay: true` starts at the first frame; a paused `cumulative` or `window` playback starts at the last frame so the initial view shows the latest prefix or window. No matching values produces an enabled playback configuration with an empty, disabled control range.

For a `motion` mark in `frame` mode, `filter: false` is the preferred path: Graflume keeps the full source data and derived domains, then changes the mark's selected frame. Motion `cumulative` and `window` modes necessarily filter to their selected history even when `filter` is false. For a non-motion family, the playback position is visible only when a host deliberately sets `filter: true`; Graflume then builds a transient filtered specification and recompiles it. Derived domains and layouts can therefore change between frames unless the specification fixes the relevant `scale.domain` values.

Playback is a presentation state. It does not mutate the caller's base `ChartSpec` or input rows. Application code should treat the configured field, mode, and filtering policy as a closed allowlist, because the runtime cannot infer whether removing rows preserves a chart's statistical meaning.

Graflume suppresses configured autoplay when `prefers-reduced-motion: reduce` already matches, pauses playback if that preference becomes active, and pauses when the document becomes hidden. Manual `play()` remains available, so the host still owns its complete reduced-motion and visibility policy.

## Programmatic state and events

The compact controls call the same public chart methods available to an application:

```ts
const view = chart.getViewState();
// { enabled, zoom, offsetX, offsetY }

chart.zoomBy(1.25); // optional second argument: { x, y } Scene anchor
chart.panBy(24, 0);
chart.resetView();

const playback = chart.getPlaybackState();
// { enabled, frames, index, frame?, playing, rate, loop, mode }

chart.play();
chart.pause();
chart.step(1);
chart.seek(0);
chart.setPlaybackRate(2);
chart.setPlaybackLoop(true);

await chart.toggleFullscreen();
```

The synchronous mutators return the chart instance for chaining. `toggleFullscreen()` returns `Promise<void>` and rejects when the active renderer/browser cannot enter fullscreen. `zoomBy()`, `panBy()`, and `resetView()` require enabled navigation and renderer support. `seek()` clamps a finite index to the available frame range; `step()` clamps or wraps according to `loop`; `setPlaybackRate()` accepts 0.1 through 16.

`setSpec()`, `setData()`, and `appendData()` pause playback, recollect the configured frame values from the new effective sources, reset the interaction state according to the new spec, and emit a playback change with reason `spec`.

```ts
chart.on('viewchange', ({ view, reason }) => {
  // reason: 'zoom' | 'pan' | 'reset' | 'resize'
});

chart.on('playbackchange', ({ state, reason }) => {
  // reason: 'play' | 'pause' | 'step' | 'seek' | 'rate' | 'loop' | 'spec'
});

chart.on('fullscreenchange', ({ active }) => {
  // active is true only for this chart's renderer host
});
```

`viewchange` carries `{ chart, view, reason }`, `playbackchange` carries `{ chart, state, reason }`, and `fullscreenchange` carries `{ chart, active }`. Entering or leaving fullscreen also renders at the fullscreen host size and emits the existing `resize` event. The playback state exposes the actual ordered `frames` values so host UI can label the current discrete position without reconstructing it.

## Conservative host allowlist

The following is a safe starting policy for examples whose data has the stated meaning. It is not automatic inference performed by Graflume.

| Family      | `field`              | `mode`       | `layerId` | `windowSize` | `filter` | Data meaning                                                                  |
| ----------- | -------------------- | ------------ | --------- | ------------ | -------- | ----------------------------------------------------------------------------- |
| Annotation  | ordered event date   | `cumulative` | omit      | `1`          | `true`   | Reveal source rows and their annotations through the current date             |
| Area        | ordered x/time field | `cumulative` | omit      | `1`          | `true`   | Reveal an ordered prefix; fix domains when visual stability matters           |
| Candlestick | trading date/time    | `cumulative` | omit      | `1`          | `true`   | Reveal complete OHLC rows in source order; do not use partial rows            |
| Combination | shared period field  | `cumulative` | omit      | `1`          | `true`   | Reveal the same ordered prefix across every layer that uses the shared source |
| Line        | ordered x/time field | `cumulative` | omit      | `1`          | `true`   | Reveal a source-ordered prefix without interpolation                          |
| Motion      | motion time field    | `frame`      | omit      | `1`          | `false`  | Select one native motion frame while retaining full data and domains          |

For a layered chart with independent sources, use a reviewed `layerId` or ensure every affected source contains the same frame field. An omitted `layerId` is intentional for the shared-source combination case above; it is not a wildcard guarantee that unrelated layers share temporal semantics. A layer whose effective source does not contain the playback field is treated as an untimed reference layer and remains unchanged rather than being replaced with an empty transient dataset.

## Capability matrix for all 41 families

All rows below support inspection/reset, fullscreen, and PNG export when they use the built-in Canvas renderer. The playback column describes semantic suitability, not only whether generic filtering can technically remove rows.

| Family                                          | Inspection / reset | Fullscreen | PNG | Playback policy                                                                                                                                                              |
| ----------------------------------------------- | ------------------ | ---------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Annotation](./annotation.md)                   | Yes                | Yes        | Yes | **Approved cumulative reveal** for an ordered event field; fixed domains avoid axis jumps.                                                                                   |
| [Area](./area.md)                               | Yes                | Yes        | Yes | **Approved cumulative reveal** for an ordered x/time field; no interpolation is added.                                                                                       |
| [Bar](./bar.md)                                 | Yes                | Yes        | Yes | Snapshot only with an explicit frame field and a complete category set per frame; category slots may jump.                                                                   |
| [Bubble](./bubble.md)                           | Yes                | Yes        | Yes | Snapshot only with an explicit frame field; points jump because identity interpolation is not implemented.                                                                   |
| [Calendar](./calendar.md)                       | Yes                | Yes        | Yes | **Off by default.** Prefix filtering currently recomputes the visible week extent, cell geometry, and color domain, so existing days can move or recolor.                    |
| [Candlestick](./candlestick.md)                 | Yes                | Yes        | Yes | **Approved cumulative reveal** of complete OHLC rows; prefer fixed x/y domains.                                                                                              |
| [Combination](./combination.md)                 | Yes                | Yes        | Yes | **Approved cumulative reveal** only when participating layers share an ordered frame field and compatible policy.                                                            |
| [Difference](./difference.md)                   | Yes                | Yes        | Yes | Snapshot only when every frame contains complete before/after pairs; playback does not interpolate either side.                                                              |
| [Pie](./pie.md)                                 | Yes                | Yes        | Yes | Snapshot only with a complete partition per frame; wedge order and angles change discretely.                                                                                 |
| [Timeline and range](./timeline.md)             | Yes                | Yes        | Yes | **Do not generic-filter for time flow.** Filtering start rows is not active-interval clipping and can expose future interval ends.                                           |
| [Gauge](./gauge.md)                             | Yes                | Yes        | Yes | Snapshot only when each frame resolves to the intended complete gauge value; no needle tweening.                                                                             |
| [Map](./map.md)                                 | Yes                | Yes        | Yes | Snapshot only with a complete geographic state per frame; inspection remains whole-Canvas magnification, not GIS navigation.                                                 |
| [Distribution](./distribution.md)               | Yes                | Yes        | Yes | **Do not generic-filter by default.** Histogram, violin, contour, and summary modes may recompute bins, density, or domains; supplied box summaries require complete tuples. |
| [Interval](./interval.md)                       | Yes                | Yes        | Yes | Snapshot only when each frame contains complete center/lower/upper tuples; not temporal interval clipping.                                                                   |
| [Line](./line.md)                               | Yes                | Yes        | Yes | **Approved cumulative reveal** for a source-ordered x/time field; sort rows first.                                                                                           |
| [Motion](./motion.md)                           | Yes                | Yes        | Yes | **Preferred native frame playback:** `mode: 'frame'`, `filter: false`, and the motion time field.                                                                            |
| [Hierarchy](./hierarchy.md)                     | Yes                | Yes        | Yes | Snapshot only with a complete valid hierarchy per frame; layout recomputes and jumps.                                                                                        |
| [Flow](./flow.md)                               | Yes                | Yes        | Yes | Snapshot only with a complete source/target network per frame; partial filtering can orphan nodes or links.                                                                  |
| [Scatter](./scatter.md)                         | Yes                | Yes        | Yes | Snapshot only with an explicit frame field; no stable-identity interpolation.                                                                                                |
| [Table](./table.md)                             | Yes                | Yes        | Yes | Usually off. Filtering can present a snapshot, but it is not paging and does not replace an accessible HTML table.                                                           |
| [Waterfall](./waterfall.md)                     | Yes                | Yes        | Yes | **Do not use frame/window filtering.** A cumulative prefix needs specialist review because every bar depends on prior rows.                                                  |
| [Word tree](./word-tree.md)                     | Yes                | Yes        | Yes | Snapshot only with a complete parent chain per frame; partial frames can orphan descendants and layout jumps.                                                                |
| [Polar](./polar.md)                             | Yes                | Yes        | Yes | Snapshot only with a complete angular series or radar indicator set per frame; partial frames change the path or profile meaning.                                            |
| [Network](./network.md)                         | Yes                | Yes        | Yes | Snapshot only with a complete graph per frame; node/link layout jumps and is not a force simulation.                                                                         |
| [Chord](./chord.md)                             | Yes                | Yes        | Yes | Snapshot only with a complete relationship matrix per frame; arcs and ribbons are recomputed discretely.                                                                     |
| [Funnel](./funnel.md)                           | Yes                | Yes        | Yes | Snapshot only with every stage present in each frame; stage removal changes the whole funnel comparison.                                                                     |
| [Parallel coordinates](./parallel.md)           | Yes                | Yes        | Yes | Snapshot only with complete observation rows; dimension domains can change between frames.                                                                                   |
| [Heatmap](./heatmap.md)                         | Yes                | Yes        | Yes | Snapshot only with a complete matrix per frame and stable category domains; missing cells change the comparison surface.                                                     |
| [Raster image](./image.md)                      | Yes                | Yes        | Yes | Snapshot only with a complete raster per frame; missing rows become missing cells rather than retained pixels.                                                               |
| [Ternary](./ternary.md)                         | Yes                | Yes        | Yes | Snapshot only with complete three-component rows; playback does not interpolate compositions or preserve point identity.                                                     |
| [Smith](./smith.md)                             | Yes                | Yes        | Yes | Snapshot only with a complete impedance trace per frame; transformed points and paths change discretely.                                                                     |
| [Scatter matrix](./scatter-matrix.md)           | Yes                | Yes        | Yes | Snapshot only with complete observation rows and fixed dimension choices; every pairwise cell is recomputed.                                                                 |
| [Carpet](./carpet.md)                           | Yes                | Yes        | Yes | Snapshot only with a complete curvilinear grid per frame; missing logical cells can break grid and contour continuity.                                                       |
| [Contour](./contour.md)                         | Yes                | Yes        | Yes | Snapshot only with a complete grid per frame; filtering an incomplete grid can create misleading contours.                                                                   |
| [Item](./item.md)                               | Yes                | Yes        | Yes | Snapshot only with a complete partition per frame; repeated glyph layout is recomputed without tweening.                                                                     |
| [Vector field](./vector-field.md)               | Yes                | Yes        | Yes | Snapshot only with a complete sampled field per frame; vectors jump without interpolation.                                                                                   |
| [Venn](./venn.md)                               | Yes                | Yes        | Yes | Snapshot only with complete, precomputed set/overlap semantics; circle placement changes discretely.                                                                         |
| [Word cloud](./word-cloud.md)                   | Yes                | Yes        | Yes | Snapshot only with a complete word-weight set; deterministic layout still jumps between frames.                                                                              |
| [Price blocks](./price-blocks.md)               | Yes                | Yes        | Yes | **Do not generic-filter by default.** Renko and Point & Figure are path-dependent; frame/window modes distort the path.                                                      |
| [Volume profile](./volume-profile.md)           | Yes                | Yes        | Yes | **Do not generic-filter by default.** Removing rows recomputes price bins and volume totals.                                                                                 |
| [Technical indicator](./technical-indicator.md) | Yes                | Yes        | Yes | Caution: cumulative playback may be reviewed for precomputed columns; calculated indicators need full warm-up history and window/frame filtering changes meaning.            |

`Snapshot only` means that a host may opt into `filter: true` only when its source has a separate frame field and each frame is a complete, independently meaningful dataset. It does not mean that Graflume can derive frames from the chart's ordinary category, value, or coordinate field.

## Accessibility and motion

The controls are keyboard-operable browser UI, but Canvas marks do not gain keyboard traversal. Keep a visible summary and an HTML data table for exact values. Provide localized control labels and announce application-specific playback context outside the Canvas when frame meaning is important.

Do not use autoplay as the only way to expose information. Host applications should honor their reduced-motion policy, provide pause and step controls, and avoid rapid flashing changes. Graflume playback defaults to paused and does not synthesize smooth motion.

## Related guides

- [Chart guide index](./README.md)
- [Cartesian axes](./axes.md)
- [Motion chart](./motion.md)
- [Timeline and range](./timeline.md)
- [Map chart](./map.md)

[Back to chart guides](./README.md)

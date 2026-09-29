# Third-party notices

## Natural Earth

Graflume's built-in world basemap is generated from **Natural Earth Vector**, Admin-0 Countries at 1:110m, using the repository snapshot tagged `v5.1.2` (`f1890d9f152c896d250a77557a5751a93d494776`). The optional lazy geography pack uses Admin-0 Map Units at 1:10m from the same snapshot and the Admin-1 States and Provinces 5.1.1 layer. It preserves every source feature before merging duplicate subdivision identifiers and applies coordinate quantization only; it does not download boundaries at chart-render time.

Natural Earth raster and vector map data is in the public domain. It may be used, modified, and redistributed for personal, educational, and commercial purposes without permission or required attribution. Natural Earth provides the data without warranties concerning accuracy, content, or fitness for a particular use.

- Project: <https://www.naturalearthdata.com/>
- Terms: <https://www.naturalearthdata.com/about/terms-of-use/>
- Source: <https://github.com/nvkelso/natural-earth-vector>

The built-in basemap and optional detailed packs are statistical reference maps. Country and subdivision boundaries follow the source dataset's de facto boundary policy and must not be treated as legal or diplomatic authority. The pack catalog distinguishes ISO 3166-1 entries, the commonly used `XK` user-assigned code, and source-defined or disputed map units rather than presenting all features as equally recognized states.

## ggplot2 and scales

Graflume's built-in `ggplot` theme is an independent TypeScript implementation referenced against ggplot2 `theme_gray()` 4.0.3 and the default colour-scale behavior used by ggplot2. The profile includes published theme constants, unit conversions, HCL hue generation, and Lab continuous-colour interpolation; it does not include R source code or claim to be ggplot2.

ggplot2 and scales are licensed under the MIT License.

- ggplot2: <https://github.com/tidyverse/ggplot2/tree/v4.0.3>
- ggplot2 license: <https://github.com/tidyverse/ggplot2/blob/v4.0.3/LICENSE>
- scales 1.4.0: <https://github.com/r-lib/scales/tree/v1.4.0>
- scales license: <https://github.com/r-lib/scales/blob/v1.4.0/LICENSE>

## Matplotlib

Graflume's built-in `matplotlib` theme is referenced against Matplotlib 3.11.1's default rcParams and includes the tagged tab10 constants and 256-entry viridis colour lookup table. Graflume maps those values into its function-free theme tokens and its own Canvas/WebGL compilers; it does not include Matplotlib's Python runtime or claim to be Matplotlib.

- Project: <https://matplotlib.org/>
- Source baseline: <https://github.com/matplotlib/matplotlib/tree/v3.11.1>
- License source: <https://github.com/matplotlib/matplotlib/blob/v3.11.1/LICENSE/LICENSE>

Copyright (c) 2012- Matplotlib Development Team; All Rights Reserved.

License agreement for matplotlib versions 1.3.0 and later:

1. This LICENSE AGREEMENT is between the Matplotlib Development Team ("MDT"), and the Individual or Organization ("Licensee") accessing and otherwise using matplotlib software in source or binary form and its associated documentation.

2. Subject to the terms and conditions of this License Agreement, MDT hereby grants Licensee a nonexclusive, royalty-free, world-wide license to reproduce, analyze, test, perform and/or display publicly, prepare derivative works, distribute, and otherwise use matplotlib alone or in any derivative version, provided, however, that MDT's License Agreement and MDT's notice of copyright, i.e., "Copyright (c) 2012- Matplotlib Development Team; All Rights Reserved" are retained in matplotlib alone or in any derivative version prepared by Licensee.

3. In the event Licensee prepares a derivative work that is based on or incorporates matplotlib or any part thereof, and wants to make the derivative work available to others as provided herein, then Licensee hereby agrees to include in any such work a brief summary of the changes made to matplotlib.

4. MDT is making matplotlib available to Licensee on an "AS IS" basis. MDT MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED. BY WAY OF EXAMPLE, BUT NOT LIMITATION, MDT MAKES NO AND DISCLAIMS ANY REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF MATPLOTLIB WILL NOT INFRINGE ANY THIRD PARTY RIGHTS.

5. MDT SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF MATPLOTLIB FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR LOSS AS A RESULT OF MODIFYING, DISTRIBUTING, OR OTHERWISE USING MATPLOTLIB, OR ANY DERIVATIVE THEREOF, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.

6. This License Agreement will automatically terminate upon a material breach of its terms and conditions.

7. Nothing in this License Agreement shall be deemed to create any relationship of agency, partnership, or joint venture between MDT and Licensee. This License Agreement does not grant permission to use MDT trademarks or trade name in a trademark sense to endorse or promote products or services of Licensee, or any third party.

8. By copying, installing or otherwise using matplotlib, Licensee agrees to be bound by the terms and conditions of this License Agreement.

<!-- graflume-spreadsheet-dependencies:start -->
## Optional spreadsheet runtime

The optional, separately loaded spreadsheet runtime is a modified binary distribution assembled from the exact packages below. Graflume bundles and minifies these sources, adapts generated identifiers and CSS namespaces for isolation, and adds a Graflume iframe/RPC/data-frame adapter. No upstream trademark or product identity is exposed as Graflume's public API.

The generated inventory is derived from 1,662 rendered Rollup modules in 119 packages and checked against `package-lock.json`. SPDX counts: Apache-2.0 49, MIT 63, ISC 5, BSD-3-Clause 1, 0BSD 1. Reference copies for every represented license family are shipped in `licenses/APACHE-2.0.txt`, `licenses/MIT.txt`, `licenses/ISC.txt`, `licenses/BSD-3-CLAUSE.txt`, and `licenses/0BSD.txt`; exact package-specific notices and distinct shipped license texts are preserved below. No rendered Apache-2.0 package supplied a separate NOTICE file.

### Rendered dependency SBOM

| Package | Version | SPDX | Modules | Author | Additional notice | Repository | License evidence |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| @babel/runtime | 7.29.7 | MIT | 4 | The Babel Team (https://babel.dev/team) |  | https://github.com/babel/babel.git | LICENSE sha256:117da2af0d4ce0fe1c8e19b5cff9dcd806adf973d328d27b11d4448c4ff24f76 |
| @flatten-js/interval-tree | 1.1.3 | MIT | 1 | Alex Bol |  | git+https://github.com/alexbol99/flatten-interval-tree.git | LICENSE sha256:737b8f28d81cb2058e2c8e3bb03447d7033923aafa224d6d43a7da0675e6b6c0 |
| @floating-ui/core | 1.8.0 | MIT | 1 | atomiks |  | https://github.com/floating-ui/floating-ui.git | LICENSE sha256:0e4c9a9b6c71019cbbea3bdc20b01223110a9035700f9c960c8fcbf78c2325ce |
| @floating-ui/dom | 1.8.0 | MIT | 1 | atomiks |  | https://github.com/floating-ui/floating-ui.git | LICENSE sha256:0e4c9a9b6c71019cbbea3bdc20b01223110a9035700f9c960c8fcbf78c2325ce |
| @floating-ui/react-dom | 2.1.9 | MIT | 1 | atomiks |  | https://github.com/floating-ui/floating-ui.git | LICENSE sha256:0e4c9a9b6c71019cbbea3bdc20b01223110a9035700f9c960c8fcbf78c2325ce |
| @floating-ui/utils | 0.2.12 | MIT | 2 | atomiks |  | https://github.com/floating-ui/floating-ui.git | LICENSE sha256:0e4c9a9b6c71019cbbea3bdc20b01223110a9035700f9c960c8fcbf78c2325ce |
| @radix-ui/primitive | 1.1.7 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-collection | 1.1.15 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-compose-refs | 1.1.5 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-context | 1.2.2 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-dialog | 1.1.23 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-direction | 1.1.4 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-dismissable-layer | 1.1.19 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-dropdown-menu | 2.1.24 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-focus-guards | 1.1.6 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-focus-scope | 1.1.16 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-hover-card | 1.1.23 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-id | 1.1.4 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-menu | 2.1.24 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-popover | 1.1.23 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-popper | 1.3.7 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-portal | 1.1.17 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-presence | 1.1.10 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-primitive | 2.1.10 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-roving-focus | 1.1.19 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-separator | 1.1.15 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-slot | 1.3.3 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-use-callback-ref | 1.1.4 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-use-controllable-state | 1.2.6 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-use-effect-event | 0.0.5 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-use-is-hydrated | 0.1.3 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-use-layout-effect | 1.1.4 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @radix-ui/react-use-size | 1.1.4 | MIT | 1 |  |  | git+https://github.com/radix-ui/primitives.git | LICENSE sha256:0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138 |
| @univerjs/core | 0.25.1 | Apache-2.0 | 2 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/data-validation | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/design | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/docs | 0.25.1 | Apache-2.0 | 1 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/docs-ui | 0.25.1 | Apache-2.0 | 4 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/drawing | 0.25.1 | Apache-2.0 | 1 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/engine-formula | 0.25.1 | Apache-2.0 | 2 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/engine-render | 0.25.1 | Apache-2.0 | 78 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/find-replace | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/icons | 1.4.0 | MIT | 174 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer-icons | LICENSE sha256:b9ef355aaac2b2a12f1f904e97b40ae12f21418420e45ea8122264fd32199e26 |
| @univerjs/network | 0.25.1 | Apache-2.0 | 2 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/preset-sheets-conditional-formatting | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer-presets | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/preset-sheets-core | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer-presets | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/preset-sheets-data-validation | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer-presets | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/preset-sheets-filter | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer-presets | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/preset-sheets-find-replace | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer-presets | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/preset-sheets-hyper-link | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer-presets | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/preset-sheets-note | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer-presets | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/preset-sheets-sort | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer-presets | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/preset-sheets-table | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer-presets | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/protocol | 0.25.1 | Apache-2.0 | 1 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | https://github.com/dream-num/univer/blob/v0.25.1/LICENSE |
| @univerjs/rpc | 0.25.1 | Apache-2.0 | 1 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets | 0.25.1 | Apache-2.0 | 4 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-conditional-formatting | 0.25.1 | Apache-2.0 | 2 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-conditional-formatting-ui | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-data-validation | 0.25.1 | Apache-2.0 | 4 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-data-validation-ui | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-filter | 0.25.1 | Apache-2.0 | 4 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-filter-ui | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-find-replace | 0.25.1 | Apache-2.0 | 2 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-formula | 0.25.1 | Apache-2.0 | 4 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-formula-ui | 0.25.1 | Apache-2.0 | 4 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-hyper-link | 0.25.1 | Apache-2.0 | 4 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-hyper-link-ui | 0.25.1 | Apache-2.0 | 4 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-note | 0.25.1 | Apache-2.0 | 2 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-note-ui | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-numfmt | 0.25.1 | Apache-2.0 | 2 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-numfmt-ui | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-sort | 0.25.1 | Apache-2.0 | 2 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-sort-ui | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-table | 0.25.1 | Apache-2.0 | 4 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-table-ui | 0.25.1 | Apache-2.0 | 3 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/sheets-ui | 0.25.1 | Apache-2.0 | 4 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/telemetry | 0.25.1 | Apache-2.0 | 1 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/themes | 0.25.1 | Apache-2.0 | 1 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @univerjs/ui | 0.25.1 | Apache-2.0 | 4 | DreamNum Co., Ltd. <developer@univer.ai> |  | https://github.com/dream-num/univer | LICENSE sha256:a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9 |
| @wendellhu/redi | 1.1.1 | MIT | 2 | Evan<wzhudev@gmail.com> |  | https://github.com/wzhudev/redi.git | LICENSE sha256:2c894825b747bfb44c55fe8c2d64d952e737bf48e9b393a970bc05de2fba144a |
| aria-hidden | 1.2.6 | MIT | 1 | Anton Korzunov <thekashey@gmail.com> |  | git+https://github.com/theKashey/aria-hidden.git | LICENSE sha256:30f0cfddf483d1128e3610205020f2041a6c5e837aa999e0aa82e5576187d4a9 |
| async-lock | 1.4.1 | MIT | 3 | Rogier Schouten <github@workingcode.ninja> (https://github.com/rogierschouten/) |  | git+https://github.com/rogierschouten/async-lock.git | LICENSE sha256:11e9f9acdfdfce6caa7b304c6ebb1a3269a61bb03d74bfcce629cc1462c06ddc |
| cjk-regex | 3.4.0 | MIT | 1 | Ika <ikatyang@gmail.com> (https://github.com/ikatyang) |  | https://github.com/ikatyang-collab/cjk-regex | LICENSE sha256:bc3c60953044b4ec92a85e49516b03da0ac7f0dde879f5359de700aeab4de0b7 |
| class-variance-authority | 0.7.1 | Apache-2.0 | 1 | Joe Bell (https://joebell.co.uk) |  | https://github.com/joe-bell/cva.git | LICENSE sha256:0ccbf956cffc8dcf515809433cb5242ee67c94513d46e48c261d68d0880de406 |
| clsx | 2.1.1 | MIT | 1 | Luke Edwards <luke.edwards05@gmail.com> (https://lukeed.com) |  | lukeed/clsx | license sha256:9a9edad7baae52622bddf3c15b2ef8a33d2c89f2d25408ad13e8a7481c6b0c97 |
| collapse-white-space | 2.1.0 | MIT | 1 | Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |  | wooorm/collapse-white-space | license sha256:63cb98b3f6abfb3c3592c16f88253c1bdc834087bf52671e8ce5609e4eb693cf |
| decimal.js | 10.6.0 | MIT | 1 | Michael Mclaughlin <M8ch88l@gmail.com> |  | https://github.com/MikeMcl/decimal.js.git | LICENCE.md sha256:3108b546bcff5d346923a82f48b2d252ca722f9088076db6d145f6b67757ad6c |
| dom-helpers | 5.2.1 | MIT | 3 | Jason Quense <monastic.panic@gmail.com> |  | git+https://github.com/react-bootstrap/dom-helpers.git | LICENSE sha256:1b0a9ba95a67bc484e028b13c61b83fc5aa1ca7957d1e2d43c2b0f70d9e9dd45 |
| fast-diff | 1.3.0 | Apache-2.0 | 2 | Jason Chen <jhchen7@gmail.com> |  | https://github.com/jhchen/fast-diff | LICENSE sha256:20430d7ea026abdb78e873e59a0817dd7d2921d94acefeafdc3e4e0150a4595d |
| franc-min | 6.2.0 | MIT | 3 | Titus Wormer <tituswormer@gmail.com> (http://wooorm.com) | Copyright Titus Wormer | https://github.com/wooorm/franc/tree/main/packages/franc-min | https://registry.npmjs.org/franc-min/-/franc-min-6.2.0.tgz#readme.md |
| get-nonce | 1.0.1 | MIT | 1 | Anton Korzunov <thekashey@gmail.com> |  | git@github.com:theKashey/get-nonce.git | LICENSE sha256:acf3b087b348d2f2e731b9d4131af185aad694c1204ce14a46909483fd42da05 |
| kdbush | 4.1.0 | ISC | 1 | Vladimir Agafonkin |  | git://github.com/mourner/kdbush.git | LICENSE sha256:0aba693a2c2e5b1b1465f9e06d29c21769450add9dbb7dc915b41a60e900196f |
| localforage | 1.10.0 | Apache-2.0 | 3 | Mozilla |  | git://github.com/localForage/localForage.git | LICENSE sha256:8c3c0576866d6c22f56cbe65b8ef20e63c8aa75ec58f8cd139a242edb42bf8f1 |
| lodash-es | 4.18.1 | MIT | 116 | John-David Dalton <john.david.dalton@gmail.com> |  | lodash/lodash | LICENSE sha256:f71e8ed126b46346494aad5486874cd8f0aafe95092ed67d2e3cb6110f939abc |
| n-gram | 2.0.2 | MIT | 1 | Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |  | words/n-gram | license sha256:9966260ba3ea9d6a5f839297dca80ddc99735a34b4ae82811cac7b956d2e3afd |
| nanoid | 5.1.16 | MIT | 2 | Andrey Sitnik <andrey@sitnik.es> |  | ai/nanoid | LICENSE sha256:4383cb2c3608397ce7a4159502614ed66890f8999c2a9c056dd3b1024d6721f0 |
| numfmt | 3.2.6 | MIT | 21 | Borgar Þorsteinsson <borgar@borgar.net> |  | git://github.com/borgar/numfmt.git | LICENSE sha256:56d7f3f6247c5485df63f14ef7c8f083a9350d6ca38dfee0f27fff2c82a369dc |
| opentype.js | 2.0.0 | MIT | 3 | Frederik De Bleser <frederik@debleser.be> |  | git://github.com/opentypejs/opentype.js.git | LICENSE sha256:a5b87c9bc191e7f9c06b07bd7cbbed3ed846dfdb50e859484b2c245aa1ab2e61 |
| ot-json1 | 1.0.2 | ISC | 13 | Joseph Gentle <me@josephg.com> | Copyright 2013-2018 Joseph Gentle | git+https://github.com/josephg/json1.git | https://registry.npmjs.org/ot-json1/-/ot-json1-1.0.2.tgz#README.md |
| ot-text-unicode | 4.0.0 | ISC | 6 | Joseph Gentle <me@josephg.com> | Package metadata declares ISC; the bundled README also carries the MIT notice Copyright 2011 ottypes library contributors. | https://github.com/ottypes/text.git | https://registry.npmjs.org/ot-text-unicode/-/ot-text-unicode-4.0.0.tgz#README.md |
| quickselect | 3.0.0 | ISC | 1 | Vladimir Agafonkin |  | github:mourner/quickselect | LICENSE sha256:238ddb00e12a420a54e060afa19bdab4f70bf49e0e2a8ebb1a5e851f9ef447df |
| rbush | 4.0.1 | MIT | 1 | Volodymyr Agafonkin |  | git://github.com/mourner/rbush.git | LICENSE sha256:bf20b07b8e41f306d22b73bfa6b0e248e81ee8caaa6a04285acb0b8e963c01ec |
| react | 18.3.1 | MIT | 10 |  |  | https://github.com/facebook/react.git | LICENSE sha256:52412d7bc7ce4157ea628bbaacb8829e0a9cb3c58f57f99176126bc8cf2bfc85 |
| react-dom | 18.3.1 | MIT | 8 |  |  | https://github.com/facebook/react.git | LICENSE sha256:52412d7bc7ce4157ea628bbaacb8829e0a9cb3c58f57f99176126bc8cf2bfc85 |
| react-remove-scroll | 2.7.2 | MIT | 7 | Anton Korzunov <thekashey@gmail.com> |  | https://github.com/theKashey/react-remove-scroll | LICENSE sha256:30f0cfddf483d1128e3610205020f2041a6c5e837aa999e0aa82e5576187d4a9 |
| react-remove-scroll-bar | 2.3.8 | MIT | 3 | Anton Korzunov <thekashey@gmail.com> | Copyright Anton Korzunov | https://github.com/theKashey/react-remove-scroll-bar | https://registry.npmjs.org/react-remove-scroll-bar/-/react-remove-scroll-bar-2.3.8.tgz#README.md |
| react-style-singleton | 2.2.3 | MIT | 3 | Anton Korzunov (thekashey@gmail.com) |  | https://github.com/theKashey/react-style-singleton | LICENSE sha256:30f0cfddf483d1128e3610205020f2041a6c5e837aa999e0aa82e5576187d4a9 |
| react-transition-group | 4.4.5 | BSD-3-Clause | 5 |  |  | https://github.com/reactjs/react-transition-group.git | LICENSE sha256:b9adc17ad75a847d8743be2843935f0842a0ea4f45e7b0c7e17ed0be98614b9b |
| regexp-util | 2.0.3 | MIT | 2 | Ika <ikatyang@gmail.com> (https://github.com/ikatyang) |  | https://github.com/ikatyang-collab/regexp-util | LICENSE sha256:bc3c60953044b4ec92a85e49516b03da0ac7f0dde879f5359de700aeab4de0b7 |
| rxjs | 7.8.2 | Apache-2.0 | 99 | Ben Lesh <ben@benlesh.com> |  | https://github.com/reactivex/rxjs.git | LICENSE.txt sha256:81c407ac717813b0e3795402960e04003c7bba8ba59b621624707028531c9ade |
| scheduler | 0.23.2 | MIT | 4 |  |  | https://github.com/facebook/react.git | LICENSE sha256:52412d7bc7ce4157ea628bbaacb8829e0a9cb3c58f57f99176126bc8cf2bfc85 |
| sonner | 2.0.8 | MIT | 1 | Emil Kowalski <e@emilkowal.ski> |  | git+https://github.com/emilkowalski/sonner.git | LICENSE.md sha256:da9201378c36ffd81f51ad0b305f3f0981e90bc558789210ad65d1161eec3b7d |
| tailwind-merge | 2.6.0 | MIT | 1 | Dany Castillo |  | https://github.com/dcastil/tailwind-merge.git | LICENSE.md sha256:d4c70c7ce38cea8778f0aed3fc0bef0a9dbd27f13bd8b6773cbd6d37941971e5 |
| trigram-utils | 2.0.1 | MIT | 1 | Titus Wormer <tituswormer@gmail.com> (https://wooorm.com) |  | wooorm/trigram-utils | license sha256:9966260ba3ea9d6a5f839297dca80ddc99735a34b4ae82811cac7b956d2e3afd |
| tslib | 2.8.1 | 0BSD | 1 | Microsoft Corp. |  | https://github.com/Microsoft/tslib.git | LICENSE.txt sha256:210b19e543130388c68654b7497e967119ce17145f66ab7d85688fbd70f08751 |
| unicode-regex | 4.2.0 | MIT | 910 | Ika <ikatyang@gmail.com> (https://github.com/ikatyang) |  | https://github.com/ikatyang-collab/unicode-regex | LICENSE sha256:bc3c60953044b4ec92a85e49516b03da0ac7f0dde879f5359de700aeab4de0b7 |
| unicount | 1.1.0 | ISC | 2 | Joseph Gentle <me@josephg.com> | Copyright 2019 Joseph Gentle | https://github.com/josephg/unicount | https://registry.npmjs.org/unicount/-/unicount-1.1.0.tgz#README.md |
| use-callback-ref | 1.3.3 | MIT | 3 | theKashey <thekashey@gmail.com> |  | https://github.com/theKashey/use-callback-ref/ | LICENSE sha256:30f0cfddf483d1128e3610205020f2041a6c5e837aa999e0aa82e5576187d4a9 |
| use-sidecar | 1.1.3 | MIT | 2 | theKashey <thekashey@gmail.com> |  | https://github.com/theKashey/use-sidecar | LICENSE sha256:30f0cfddf483d1128e3610205020f2041a6c5e837aa999e0aa82e5576187d4a9 |

### Bundled license evidence

The following distinct license files or package README license sections are preserved verbatim and keyed by SHA-256. Packages without a shipped top-level license file use the authoritative source identified in the SBOM and the corresponding complete standard license text shipped under `licenses/`.

### License evidence 0aba693a2c2e

Packages: `kdbush@4.1.0`

Files: `kdbush/LICENSE`

SHA-256: `0aba693a2c2e5b1b1465f9e06d29c21769450add9dbb7dc915b41a60e900196f`

````text
ISC License

Copyright (c) 2026, Vladimir Agafonkin

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
````

### License evidence 0ccbf956cffc

Packages: `class-variance-authority@0.7.1`

Files: `class-variance-authority/LICENSE`

SHA-256: `0ccbf956cffc8dcf515809433cb5242ee67c94513d46e48c261d68d0880de406`

````text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   Copyright 2022 Joe Bell

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
````

### License evidence 0e4c9a9b6c71

Packages: `@floating-ui/core@1.8.0`, `@floating-ui/dom@1.8.0`, `@floating-ui/react-dom@2.1.9`, `@floating-ui/utils@0.2.12`

Files: `@floating-ui/core/LICENSE`, `@floating-ui/dom/LICENSE`, `@floating-ui/react-dom/LICENSE`, `@floating-ui/utils/LICENSE`

SHA-256: `0e4c9a9b6c71019cbbea3bdc20b01223110a9035700f9c960c8fcbf78c2325ce`

````text
MIT License

Copyright (c) 2021-present Floating UI contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
````

### License evidence 0e80a2d229d2

Packages: `@radix-ui/primitive@1.1.7`, `@radix-ui/react-collection@1.1.15`, `@radix-ui/react-compose-refs@1.1.5`, `@radix-ui/react-context@1.2.2`, `@radix-ui/react-dialog@1.1.23`, `@radix-ui/react-direction@1.1.4`, `@radix-ui/react-dismissable-layer@1.1.19`, `@radix-ui/react-dropdown-menu@2.1.24`, `@radix-ui/react-focus-guards@1.1.6`, `@radix-ui/react-focus-scope@1.1.16`, `@radix-ui/react-hover-card@1.1.23`, `@radix-ui/react-id@1.1.4`, `@radix-ui/react-menu@2.1.24`, `@radix-ui/react-popover@1.1.23`, `@radix-ui/react-popper@1.3.7`, `@radix-ui/react-portal@1.1.17`, `@radix-ui/react-presence@1.1.10`, `@radix-ui/react-primitive@2.1.10`, `@radix-ui/react-roving-focus@1.1.19`, `@radix-ui/react-separator@1.1.15`, `@radix-ui/react-slot@1.3.3`, `@radix-ui/react-use-callback-ref@1.1.4`, `@radix-ui/react-use-controllable-state@1.2.6`, `@radix-ui/react-use-effect-event@0.0.5`, `@radix-ui/react-use-is-hydrated@0.1.3`, `@radix-ui/react-use-layout-effect@1.1.4`, `@radix-ui/react-use-size@1.1.4`

Files: `@radix-ui/primitive/LICENSE`, `@radix-ui/react-collection/LICENSE`, `@radix-ui/react-compose-refs/LICENSE`, `@radix-ui/react-context/LICENSE`, `@radix-ui/react-dialog/LICENSE`, `@radix-ui/react-direction/LICENSE`, `@radix-ui/react-dismissable-layer/LICENSE`, `@radix-ui/react-dropdown-menu/LICENSE`, `@radix-ui/react-focus-guards/LICENSE`, `@radix-ui/react-focus-scope/LICENSE`, `@radix-ui/react-hover-card/LICENSE`, `@radix-ui/react-id/LICENSE`, `@radix-ui/react-menu/LICENSE`, `@radix-ui/react-popover/LICENSE`, `@radix-ui/react-popper/LICENSE`, `@radix-ui/react-portal/LICENSE`, `@radix-ui/react-presence/LICENSE`, `@radix-ui/react-primitive/LICENSE`, `@radix-ui/react-roving-focus/LICENSE`, `@radix-ui/react-separator/LICENSE`, `@radix-ui/react-slot/LICENSE`, `@radix-ui/react-use-callback-ref/LICENSE`, `@radix-ui/react-use-controllable-state/LICENSE`, `@radix-ui/react-use-effect-event/LICENSE`, `@radix-ui/react-use-is-hydrated/LICENSE`, `@radix-ui/react-use-layout-effect/LICENSE`, `@radix-ui/react-use-size/LICENSE`

SHA-256: `0e80a2d229d2fd4fc7e8636142ec5d0ff0bc031f14c15b682e2ac01dfd5b5138`

````text
MIT License

Copyright (c) 2022 WorkOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### License evidence 117da2af0d4c

Packages: `@babel/runtime@7.29.7`

Files: `@babel/runtime/LICENSE`

SHA-256: `117da2af0d4ce0fe1c8e19b5cff9dcd806adf973d328d27b11d4448c4ff24f76`

````text
MIT License

Copyright (c) 2014-present Sebastian McKenzie and other contributors

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
````

### License evidence 11e9f9acdfdf

Packages: `async-lock@1.4.1`

Files: `async-lock/LICENSE`

SHA-256: `11e9f9acdfdfce6caa7b304c6ebb1a3269a61bb03d74bfcce629cc1462c06ddc`

````text
The MIT License (MIT)

Copyright (c) 2016 Rogier Schouten <github@workingcode.ninja>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### License evidence 1b0a9ba95a67

Packages: `dom-helpers@5.2.1`

Files: `dom-helpers/LICENSE`

SHA-256: `1b0a9ba95a67bc484e028b13c61b83fc5aa1ca7957d1e2d43c2b0f70d9e9dd45`

````text
The MIT License (MIT)

Copyright (c) 2015 Jason Quense

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### License evidence 20430d7ea026

Packages: `fast-diff@1.3.0`

Files: `fast-diff/LICENSE`

SHA-256: `20430d7ea026abdb78e873e59a0817dd7d2921d94acefeafdc3e4e0150a4595d`

````text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright 2014-2023 Jason Chen

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
````

### License evidence 210b19e54313

Packages: `tslib@2.8.1`

Files: `tslib/LICENSE.txt`

SHA-256: `210b19e543130388c68654b7497e967119ce17145f66ab7d85688fbd70f08751`

````text
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
````

### License evidence 238ddb00e12a

Packages: `quickselect@3.0.0`

Files: `quickselect/LICENSE`

SHA-256: `238ddb00e12a420a54e060afa19bdab4f70bf49e0e2a8ebb1a5e851f9ef447df`

````text
ISC License

Copyright (c) 2024, Vladimir Agafonkin

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
````

### License evidence 2c894825b747

Packages: `@wendellhu/redi@1.1.1`

Files: `@wendellhu/redi/LICENSE`

SHA-256: `2c894825b747bfb44c55fe8c2d64d952e737bf48e9b393a970bc05de2fba144a`

````text
Copyright 2021 Wendell Hu

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
````

### License evidence 30f0cfddf483

Packages: `aria-hidden@1.2.6`, `react-remove-scroll@2.7.2`, `react-style-singleton@2.2.3`, `use-callback-ref@1.3.3`, `use-sidecar@1.1.3`

Files: `aria-hidden/LICENSE`, `react-remove-scroll/LICENSE`, `react-style-singleton/LICENSE`, `use-callback-ref/LICENSE`, `use-sidecar/LICENSE`

SHA-256: `30f0cfddf483d1128e3610205020f2041a6c5e837aa999e0aa82e5576187d4a9`

````text
MIT License

Copyright (c) 2017 Anton Korzunov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### License evidence 3108b546bcff

Packages: `decimal.js@10.6.0`

Files: `decimal.js/LICENCE.md`

SHA-256: `3108b546bcff5d346923a82f48b2d252ca722f9088076db6d145f6b67757ad6c`

````text
The MIT Licence.

Copyright (c) 2025 Michael Mclaughlin

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
````

### License evidence 3c470608c447

Packages: `unicount@1.1.0`

Files: `unicount/README.md`

SHA-256: `3c470608c44791c4b31540d24235012f5a362a3c007e37c7ea00f5e4968788d1`

````text
# LICENSE

Copyright 2019 Joseph Gentle

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
````

### License evidence 4383cb2c3608

Packages: `nanoid@5.1.16`

Files: `nanoid/LICENSE`

SHA-256: `4383cb2c3608397ce7a4159502614ed66890f8999c2a9c056dd3b1024d6721f0`

````text
The MIT License (MIT)

Copyright 2017 Andrey Sitnik <andrey@sitnik.es>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
````

### License evidence 52412d7bc7ce

Packages: `react-dom@18.3.1`, `react@18.3.1`, `scheduler@0.23.2`

Files: `react-dom/LICENSE`, `react/LICENSE`, `scheduler/LICENSE`

SHA-256: `52412d7bc7ce4157ea628bbaacb8829e0a9cb3c58f57f99176126bc8cf2bfc85`

````text
MIT License

Copyright (c) Facebook, Inc. and its affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### License evidence 56d7f3f6247c

Packages: `numfmt@3.2.6`

Files: `numfmt/LICENSE`

SHA-256: `56d7f3f6247c5485df63f14ef7c8f083a9350d6ca38dfee0f27fff2c82a369dc`

````text
Copyright (c) 2020, Borgar Þorsteinsson <borgar@borgar.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
````

### License evidence 63cb98b3f6ab

Packages: `collapse-white-space@2.1.0`

Files: `collapse-white-space/license`

SHA-256: `63cb98b3f6abfb3c3592c16f88253c1bdc834087bf52671e8ce5609e4eb693cf`

````text
(The MIT License)

Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
````

### License evidence 72cc460db089

Packages: `ot-json1@1.0.2`

Files: `ot-json1/README.md`

SHA-256: `72cc460db08941dd0405d8bb6f60417d41b8cef31731395a63e21665776b30c0`

````text
## License

Copyright (c) 2013-2018, Joseph Gentle &lt;me@josephg.com&gt;

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
````

### License evidence 737b8f28d81c

Packages: `@flatten-js/interval-tree@1.1.3`

Files: `@flatten-js/interval-tree/LICENSE`

SHA-256: `737b8f28d81cb2058e2c8e3bb03447d7033923aafa224d6d43a7da0675e6b6c0`

````text
MIT License

Copyright (c) 2017 alexbol99

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### License evidence 81c407ac7178

Packages: `rxjs@7.8.2`

Files: `rxjs/LICENSE.txt`

SHA-256: `81c407ac717813b0e3795402960e04003c7bba8ba59b621624707028531c9ade`

````text
                               Apache License
                         Version 2.0, January 2004
                      http://www.apache.org/licenses/

 TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

 1. Definitions.

    "License" shall mean the terms and conditions for use, reproduction,
    and distribution as defined by Sections 1 through 9 of this document.

    "Licensor" shall mean the copyright owner or entity authorized by
    the copyright owner that is granting the License.

    "Legal Entity" shall mean the union of the acting entity and all
    other entities that control, are controlled by, or are under common
    control with that entity. For the purposes of this definition,
    "control" means (i) the power, direct or indirect, to cause the
    direction or management of such entity, whether by contract or
    otherwise, or (ii) ownership of fifty percent (50%) or more of the
    outstanding shares, or (iii) beneficial ownership of such entity.

    "You" (or "Your") shall mean an individual or Legal Entity
    exercising permissions granted by this License.

    "Source" form shall mean the preferred form for making modifications,
    including but not limited to software source code, documentation
    source, and configuration files.

    "Object" form shall mean any form resulting from mechanical
    transformation or translation of a Source form, including but
    not limited to compiled object code, generated documentation,
    and conversions to other media types.

    "Work" shall mean the work of authorship, whether in Source or
    Object form, made available under the License, as indicated by a
    copyright notice that is included in or attached to the work
    (an example is provided in the Appendix below).

    "Derivative Works" shall mean any work, whether in Source or Object
    form, that is based on (or derived from) the Work and for which the
    editorial revisions, annotations, elaborations, or other modifications
    represent, as a whole, an original work of authorship. For the purposes
    of this License, Derivative Works shall not include works that remain
    separable from, or merely link (or bind by name) to the interfaces of,
    the Work and Derivative Works thereof.

    "Contribution" shall mean any work of authorship, including
    the original version of the Work and any modifications or additions
    to that Work or Derivative Works thereof, that is intentionally
    submitted to Licensor for inclusion in the Work by the copyright owner
    or by an individual or Legal Entity authorized to submit on behalf of
    the copyright owner. For the purposes of this definition, "submitted"
    means any form of electronic, verbal, or written communication sent
    to the Licensor or its representatives, including but not limited to
    communication on electronic mailing lists, source code control systems,
    and issue tracking systems that are managed by, or on behalf of, the
    Licensor for the purpose of discussing and improving the Work, but
    excluding communication that is conspicuously marked or otherwise
    designated in writing by the copyright owner as "Not a Contribution."

    "Contributor" shall mean Licensor and any individual or Legal Entity
    on behalf of whom a Contribution has been received by Licensor and
    subsequently incorporated within the Work.

 2. Grant of Copyright License. Subject to the terms and conditions of
    this License, each Contributor hereby grants to You a perpetual,
    worldwide, non-exclusive, no-charge, royalty-free, irrevocable
    copyright license to reproduce, prepare Derivative Works of,
    publicly display, publicly perform, sublicense, and distribute the
    Work and such Derivative Works in Source or Object form.

 3. Grant of Patent License. Subject to the terms and conditions of
    this License, each Contributor hereby grants to You a perpetual,
    worldwide, non-exclusive, no-charge, royalty-free, irrevocable
    (except as stated in this section) patent license to make, have made,
    use, offer to sell, sell, import, and otherwise transfer the Work,
    where such license applies only to those patent claims licensable
    by such Contributor that are necessarily infringed by their
    Contribution(s) alone or by combination of their Contribution(s)
    with the Work to which such Contribution(s) was submitted. If You
    institute patent litigation against any entity (including a
    cross-claim or counterclaim in a lawsuit) alleging that the Work
    or a Contribution incorporated within the Work constitutes direct
    or contributory patent infringement, then any patent licenses
    granted to You under this License for that Work shall terminate
    as of the date such litigation is filed.

 4. Redistribution. You may reproduce and distribute copies of the
    Work or Derivative Works thereof in any medium, with or without
    modifications, and in Source or Object form, provided that You
    meet the following conditions:

    (a) You must give any other recipients of the Work or
        Derivative Works a copy of this License; and

    (b) You must cause any modified files to carry prominent notices
        stating that You changed the files; and

    (c) You must retain, in the Source form of any Derivative Works
        that You distribute, all copyright, patent, trademark, and
        attribution notices from the Source form of the Work,
        excluding those notices that do not pertain to any part of
        the Derivative Works; and

    (d) If the Work includes a "NOTICE" text file as part of its
        distribution, then any Derivative Works that You distribute must
        include a readable copy of the attribution notices contained
        within such NOTICE file, excluding those notices that do not
        pertain to any part of the Derivative Works, in at least one
        of the following places: within a NOTICE text file distributed
        as part of the Derivative Works; within the Source form or
        documentation, if provided along with the Derivative Works; or,
        within a display generated by the Derivative Works, if and
        wherever such third-party notices normally appear. The contents
        of the NOTICE file are for informational purposes only and
        do not modify the License. You may add Your own attribution
        notices within Derivative Works that You distribute, alongside
        or as an addendum to the NOTICE text from the Work, provided
        that such additional attribution notices cannot be construed
        as modifying the License.

    You may add Your own copyright statement to Your modifications and
    may provide additional or different license terms and conditions
    for use, reproduction, or distribution of Your modifications, or
    for any such Derivative Works as a whole, provided Your use,
    reproduction, and distribution of the Work otherwise complies with
    the conditions stated in this License.

 5. Submission of Contributions. Unless You explicitly state otherwise,
    any Contribution intentionally submitted for inclusion in the Work
    by You to the Licensor shall be under the terms and conditions of
    this License, without any additional terms or conditions.
    Notwithstanding the above, nothing herein shall supersede or modify
    the terms of any separate license agreement you may have executed
    with Licensor regarding such Contributions.

 6. Trademarks. This License does not grant permission to use the trade
    names, trademarks, service marks, or product names of the Licensor,
    except as required for reasonable and customary use in describing the
    origin of the Work and reproducing the content of the NOTICE file.

 7. Disclaimer of Warranty. Unless required by applicable law or
    agreed to in writing, Licensor provides the Work (and each
    Contributor provides its Contributions) on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
    implied, including, without limitation, any warranties or conditions
    of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
    PARTICULAR PURPOSE. You are solely responsible for determining the
    appropriateness of using or redistributing the Work and assume any
    risks associated with Your exercise of permissions under this License.

 8. Limitation of Liability. In no event and under no legal theory,
    whether in tort (including negligence), contract, or otherwise,
    unless required by applicable law (such as deliberate and grossly
    negligent acts) or agreed to in writing, shall any Contributor be
    liable to You for damages, including any direct, indirect, special,
    incidental, or consequential damages of any character arising as a
    result of this License or out of the use or inability to use the
    Work (including but not limited to damages for loss of goodwill,
    work stoppage, computer failure or malfunction, or any and all
    other commercial damages or losses), even if such Contributor
    has been advised of the possibility of such damages.

 9. Accepting Warranty or Additional Liability. While redistributing
    the Work or Derivative Works thereof, You may choose to offer,
    and charge a fee for, acceptance of support, warranty, indemnity,
    or other liability obligations and/or rights consistent with this
    License. However, in accepting such obligations, You may act only
    on Your own behalf and on Your sole responsibility, not on behalf
    of any other Contributor, and only if You agree to indemnify,
    defend, and hold each Contributor harmless for any liability
    incurred by, or claims asserted against, such Contributor by reason
    of your accepting any such warranty or additional liability.

 END OF TERMS AND CONDITIONS

 APPENDIX: How to apply the Apache License to your work.

    To apply the Apache License to your work, attach the following
    boilerplate notice, with the fields enclosed by brackets "[]"
    replaced with your own identifying information. (Don't include
    the brackets!)  The text should be enclosed in the appropriate
    comment syntax for the file format. We also recommend that a
    file or class name and description of purpose be included on the
    same "printed page" as the copyright notice for easier
    identification within third-party archives.

 Copyright (c) 2015-2018 Google, Inc., Netflix, Inc., Microsoft Corp. and contributors

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
````

### License evidence 8c3c0576866d

Packages: `localforage@1.10.0`

Files: `localforage/LICENSE`

SHA-256: `8c3c0576866d6c22f56cbe65b8ef20e63c8aa75ec58f8cd139a242edb42bf8f1`

````text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "{}"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright 2014 Mozilla

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
````

### License evidence 8ee8354d5f5f

Packages: `react-remove-scroll-bar@2.3.8`

Files: `react-remove-scroll-bar/README.md`

SHA-256: `8ee8354d5f5f12f11ba596bba67b060d43d3cd677075171404ab5a73703450e8`

````text
# License
MIT
````

### License evidence 9966260ba3ea

Packages: `n-gram@2.0.2`, `trigram-utils@2.0.1`

Files: `n-gram/license`, `trigram-utils/license`

SHA-256: `9966260ba3ea9d6a5f839297dca80ddc99735a34b4ae82811cac7b956d2e3afd`

````text
(The MIT License)

Copyright (c) 2014 Titus Wormer <tituswormer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
````

### License evidence 9a9edad7baae

Packages: `clsx@2.1.1`

Files: `clsx/license`

SHA-256: `9a9edad7baae52622bddf3c15b2ef8a33d2c89f2d25408ad13e8a7481c6b0c97`

````text
MIT License

Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
````

### License evidence a5b87c9bc191

Packages: `opentype.js@2.0.0`

Files: `opentype.js/LICENSE`

SHA-256: `a5b87c9bc191e7f9c06b07bd7cbbed3ed846dfdb50e859484b2c245aa1ab2e61`

````text
The MIT License (MIT)

Copyright (c) 2020 Frederik De Bleser

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
````

### License evidence a6cba85bc92e

Packages: `@univerjs/core@0.25.1`, `@univerjs/data-validation@0.25.1`, `@univerjs/design@0.25.1`, `@univerjs/docs-ui@0.25.1`, `@univerjs/docs@0.25.1`, `@univerjs/drawing@0.25.1`, `@univerjs/engine-formula@0.25.1`, `@univerjs/engine-render@0.25.1`, `@univerjs/find-replace@0.25.1`, `@univerjs/network@0.25.1`, `@univerjs/preset-sheets-conditional-formatting@0.25.1`, `@univerjs/preset-sheets-core@0.25.1`, `@univerjs/preset-sheets-data-validation@0.25.1`, `@univerjs/preset-sheets-filter@0.25.1`, `@univerjs/preset-sheets-find-replace@0.25.1`, `@univerjs/preset-sheets-hyper-link@0.25.1`, `@univerjs/preset-sheets-note@0.25.1`, `@univerjs/preset-sheets-sort@0.25.1`, `@univerjs/preset-sheets-table@0.25.1`, `@univerjs/rpc@0.25.1`, `@univerjs/sheets-conditional-formatting-ui@0.25.1`, `@univerjs/sheets-conditional-formatting@0.25.1`, `@univerjs/sheets-data-validation-ui@0.25.1`, `@univerjs/sheets-data-validation@0.25.1`, `@univerjs/sheets-filter-ui@0.25.1`, `@univerjs/sheets-filter@0.25.1`, `@univerjs/sheets-find-replace@0.25.1`, `@univerjs/sheets-formula-ui@0.25.1`, `@univerjs/sheets-formula@0.25.1`, `@univerjs/sheets-hyper-link-ui@0.25.1`, `@univerjs/sheets-hyper-link@0.25.1`, `@univerjs/sheets-note-ui@0.25.1`, `@univerjs/sheets-note@0.25.1`, `@univerjs/sheets-numfmt-ui@0.25.1`, `@univerjs/sheets-numfmt@0.25.1`, `@univerjs/sheets-sort-ui@0.25.1`, `@univerjs/sheets-sort@0.25.1`, `@univerjs/sheets-table-ui@0.25.1`, `@univerjs/sheets-table@0.25.1`, `@univerjs/sheets-ui@0.25.1`, `@univerjs/sheets@0.25.1`, `@univerjs/telemetry@0.25.1`, `@univerjs/themes@0.25.1`, `@univerjs/ui@0.25.1`

Files: `@univerjs/core/LICENSE`, `@univerjs/data-validation/LICENSE`, `@univerjs/design/LICENSE`, `@univerjs/docs-ui/LICENSE`, `@univerjs/docs/LICENSE`, `@univerjs/drawing/LICENSE`, `@univerjs/engine-formula/LICENSE`, `@univerjs/engine-render/LICENSE`, `@univerjs/find-replace/LICENSE`, `@univerjs/network/LICENSE`, `@univerjs/preset-sheets-conditional-formatting/LICENSE`, `@univerjs/preset-sheets-core/LICENSE`, `@univerjs/preset-sheets-data-validation/LICENSE`, `@univerjs/preset-sheets-filter/LICENSE`, `@univerjs/preset-sheets-find-replace/LICENSE`, `@univerjs/preset-sheets-hyper-link/LICENSE`, `@univerjs/preset-sheets-note/LICENSE`, `@univerjs/preset-sheets-sort/LICENSE`, `@univerjs/preset-sheets-table/LICENSE`, `@univerjs/rpc/LICENSE`, `@univerjs/sheets-conditional-formatting-ui/LICENSE`, `@univerjs/sheets-conditional-formatting/LICENSE`, `@univerjs/sheets-data-validation-ui/LICENSE`, `@univerjs/sheets-data-validation/LICENSE`, `@univerjs/sheets-filter-ui/LICENSE`, `@univerjs/sheets-filter/LICENSE`, `@univerjs/sheets-find-replace/LICENSE`, `@univerjs/sheets-formula-ui/LICENSE`, `@univerjs/sheets-formula/LICENSE`, `@univerjs/sheets-hyper-link-ui/LICENSE`, `@univerjs/sheets-hyper-link/LICENSE`, `@univerjs/sheets-note-ui/LICENSE`, `@univerjs/sheets-note/LICENSE`, `@univerjs/sheets-numfmt-ui/LICENSE`, `@univerjs/sheets-numfmt/LICENSE`, `@univerjs/sheets-sort-ui/LICENSE`, `@univerjs/sheets-sort/LICENSE`, `@univerjs/sheets-table-ui/LICENSE`, `@univerjs/sheets-table/LICENSE`, `@univerjs/sheets-ui/LICENSE`, `@univerjs/sheets/LICENSE`, `@univerjs/telemetry/LICENSE`, `@univerjs/themes/LICENSE`, `@univerjs/ui/LICENSE`

SHA-256: `a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9`

````text
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS
````

### License evidence acf3b087b348

Packages: `get-nonce@1.0.1`

Files: `get-nonce/LICENSE`

SHA-256: `acf3b087b348d2f2e731b9d4131af185aad694c1204ce14a46909483fd42da05`

````text
MIT License

Copyright (c) 2020 Anton Korzunov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### License evidence b9adc17ad75a

Packages: `react-transition-group@4.4.5`

Files: `react-transition-group/LICENSE`

SHA-256: `b9adc17ad75a847d8743be2843935f0842a0ea4f45e7b0c7e17ed0be98614b9b`

````text
BSD 3-Clause License

Copyright (c) 2018, React Community
Forked from React (https://github.com/facebook/react) Copyright 2013-present, Facebook, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
````

### License evidence b9ef355aaac2

Packages: `@univerjs/icons@1.4.0`

Files: `@univerjs/icons/LICENSE`

SHA-256: `b9ef355aaac2b2a12f1f904e97b40ae12f21418420e45ea8122264fd32199e26`

````text
MIT License

Copyright (c) 2023-present, DreamNum Co., Ltd.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### License evidence bc3c60953044

Packages: `cjk-regex@3.4.0`, `regexp-util@2.0.3`, `unicode-regex@4.2.0`

Files: `cjk-regex/LICENSE`, `regexp-util/LICENSE`, `unicode-regex/LICENSE`

SHA-256: `bc3c60953044b4ec92a85e49516b03da0ac7f0dde879f5359de700aeab4de0b7`

````text
MIT License

Copyright (c) Ika <ikatyang@gmail.com> (https://github.com/ikatyang)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### License evidence bf20b07b8e41

Packages: `rbush@4.0.1`

Files: `rbush/LICENSE`

SHA-256: `bf20b07b8e41f306d22b73bfa6b0e248e81ee8caaa6a04285acb0b8e963c01ec`

````text
MIT License

Copyright (c) 2024 Volodymyr Agafonkin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
````

### License evidence ca632d6a75f7

Packages: `franc-min@6.2.0`

Files: `franc-min/readme.md`

SHA-256: `ca632d6a75f707e5c599df6ba11d478dddda1ffb9aaef835d881365bcb960f59`

````text
## License

[MIT](https://github.com/wooorm/franc/blob/main/license) © [Titus Wormer](http://wooorm.com)
````

### License evidence ce371ee133dd

Packages: `ot-text-unicode@4.0.0`

Files: `ot-text-unicode/README.md`

SHA-256: `ce371ee133dd63ccd80ddc3cca171fdf119e5351995a6f0c372de3763fd44735`

````text
# License

All code contributed to this repository is licensed under the standard MIT license:

Copyright 2011 ottypes library contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following condition:

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
````

### License evidence d4c70c7ce38c

Packages: `tailwind-merge@2.6.0`

Files: `tailwind-merge/LICENSE.md`

SHA-256: `d4c70c7ce38cea8778f0aed3fc0bef0a9dbd27f13bd8b6773cbd6d37941971e5`

````text
MIT License

Copyright (c) 2021 Dany Castillo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### License evidence da9201378c36

Packages: `sonner@2.0.8`

Files: `sonner/LICENSE.md`

SHA-256: `da9201378c36ffd81f51ad0b305f3f0981e90bc558789210ad65d1161eec3b7d`

````text
MIT License

Copyright (c) 2023 Emil Kowalski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
````

### License evidence f71e8ed126b4

Packages: `lodash-es@4.18.1`

Files: `lodash-es/LICENSE`

SHA-256: `f71e8ed126b46346494aad5486874cd8f0aafe95092ed67d2e3cb6110f939abc`

````text
Copyright OpenJS Foundation and other contributors <https://openjsf.org/>

Based on Underscore.js, copyright Jeremy Ashkenas,
DocumentCloud and Investigative Reporters & Editors <http://underscorejs.org/>

This software consists of voluntary contributions made by many
individuals. For exact contribution history, see the revision history
available at https://github.com/lodash/lodash

The following license applies to all parts of this software except as
documented below:

====

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

====

Copyright and related rights for sample code are waived via CC0. Sample
code is defined as all source code displayed within the prose of the
documentation.

CC0: http://creativecommons.org/publicdomain/zero/1.0/

====

Files located in the node_modules and vendor directories are externally
maintained libraries used by this software which have their own
licenses; we recommend you read them, as their terms may differ from the
terms above.
````

<!-- graflume-spreadsheet-dependencies:end -->

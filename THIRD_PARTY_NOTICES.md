# Third-party notices

## Natural Earth

Graflume's built-in world basemap is generated from **Natural Earth Vector**, Admin-0 Countries at 1:110m, using the repository snapshot tagged `v5.1.2` (`f1890d9f152c896d250a77557a5751a93d494776`).

Natural Earth raster and vector map data is in the public domain. It may be used, modified, and redistributed for personal, educational, and commercial purposes without permission or required attribution. Natural Earth provides the data without warranties concerning accuracy, content, or fitness for a particular use.

- Project: <https://www.naturalearthdata.com/>
- Terms: <https://www.naturalearthdata.com/about/terms-of-use/>
- Source: <https://github.com/nvkelso/natural-earth-vector>

The built-in basemap is a small-scale statistical reference map. Country boundaries follow the source dataset's de facto boundary policy and must not be treated as legal or diplomatic authority.

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

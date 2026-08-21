import { writeFile } from 'node:fs/promises';

import { seriesChartTypeCatalog } from '../dist/graflume.complete.js';
import { seriesSampleRuntimeSource } from './series-samples.mjs';

const definitions = seriesChartTypeCatalog;

const html = `<!doctype html>
<html lang="ko" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>Graflume 전문 시리즈 갤러리</title>
    <style>
      :root { font-family: Inter, Pretendard, system-ui, sans-serif; color: #0f172a; background: #f1f5f9; }
      :root[data-theme='dark'] { color: #f8fafc; background: #0b1020; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 28px 16px 52px; }
      main { width: min(1540px, 100%); margin: 0 auto; }
      header { display: flex; gap: 24px; align-items: end; justify-content: space-between; margin-bottom: 18px; }
      h1 { margin: 0; font-size: clamp(1.8rem, 4vw, 3rem); letter-spacing: -0.05em; }
      .lede { max-width: 960px; margin: 10px 0 0; color: #64748b; line-height: 1.7; }
      :root[data-theme='dark'] .lede, :root[data-theme='dark'] .copy { color: #a7b2c5; }
      button, select { min-height: 42px; padding: 0 16px; color: inherit; background: #fff; border: 1px solid #dbe3ee; border-radius: 999px; font: inherit; font-weight: 700; }
      :root[data-theme='dark'] button, :root[data-theme='dark'] select { background: #111827; border-color: #475569; }
      button:focus-visible, select:focus-visible { outline: 3px solid #818cf8; outline-offset: 2px; }
      .controls { display: flex; gap: 10px; flex-wrap: wrap; }
      #status { margin: 0 0 18px; padding: 12px 15px; background: #eef2ff; border-radius: 12px; }
      :root[data-theme='dark'] #status { background: #1e1b4b; }
      #status.error { color: #991b1b; background: #fee2e2; }
      .gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
      article { min-width: 0; overflow: hidden; background: #fff; border: 1px solid #dbe3ee; border-radius: 18px; box-shadow: 0 14px 42px rgb(15 23 42 / 8%); }
      :root[data-theme='dark'] article { background: #111827; border-color: #25314a; box-shadow: 0 18px 48px rgb(0 0 0 / 30%); }
      .head { display: flex; gap: 12px; align-items: start; justify-content: space-between; padding: 17px 18px 0; }
      h2 { margin: 0; font-size: 1.05rem; }
      .copy { margin: 5px 0 0; color: #64748b; font-size: 0.82rem; line-height: 1.45; }
      code { color: #4f46e5; font-size: 0.75rem; }
      :root[data-theme='dark'] code { color: #c4b5fd; }
      .badge { flex: 0 0 auto; padding: 4px 8px; color: #4338ca; background: #eef2ff; border-radius: 999px; font-size: 0.7rem; font-weight: 800; }
      :root[data-theme='dark'] .badge { color: #c7d2fe; background: #312e81; }
      .chart { width: 100%; height: 300px; }
      @media (max-width: 1120px) { .gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 720px) { header { display: block; } .controls { margin-top: 14px; } .gallery { grid-template-columns: 1fr; } .chart { height: 320px; } }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Graflume 전문 시리즈 갤러리</h1>
          <p class="lede">기존 45개 계열과 같은 portable ChartSpec, renderer-neutral Scene, Canvas renderer를 사용하는 96개 전문 시리즈입니다. 중복 의미는 canonical compiler로 융합됩니다.</p>
        </div>
        <div class="controls">
          <select id="category" aria-label="카테고리 필터"><option value="all">전체 카테고리</option></select>
          <button id="theme" type="button">어두운 테마</button>
        </div>
      </header>
      <p id="status" role="status">전문 시리즈를 렌더링하고 있습니다…</p>
      <section id="gallery" class="gallery" aria-label="Graflume 전문 시리즈 갤러리"></section>
    </main>

    <!-- Exact commit pins and SRI are replaced by the repository CDN snapshot workflow. -->
    <script
      src="https://cdn.jsdelivr.net/gh/statground/graflume@__GRAFLUME_CDN_COMMIT__/cdn/graflume.complete.global.js"
      integrity="__GRAFLUME_COMPLETE_CDN_SRI__"
      crossorigin="anonymous"
    ></script>
    <script>
      const definitions = ${JSON.stringify(definitions)};
      ${seriesSampleRuntimeSource()}
      const gallery = document.querySelector('#gallery');
      const status = document.querySelector('#status');
      const themeButton = document.querySelector('#theme');
      const categorySelect = document.querySelector('#category');
      let charts = [];
      let dark = false;

      [...new Set(definitions.map(({ category }) => category))].sort().forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.append(option);
      });

      const render = async () => {
        charts.forEach((chart) => chart.destroy());
        charts = [];
        gallery.replaceChildren();
        const selected = categorySelect.value;
        const visible = definitions.filter(({ category }) => selected === 'all' || category === selected);
        status.textContent = visible.length + '개 차트를 렌더링하고 있습니다…';

        for (let index = 0; index < visible.length; index += 1) {
          const definition = visible[index];
          const article = document.createElement('article');
          article.innerHTML = '<div class="head"><div><h2>' + definition.name + '</h2><p class="copy"><code>Graflume.' + definition.quickApi + '()</code><br />canonical: ' + definition.canonicalFamily + '</p></div><span class="badge">' + definition.mark + '</span></div><div class="chart" id="chart-' + definition.id + '"></div>';
          gallery.append(article);
          const spec = seriesSampleSpec(definition);
          charts.push(Graflume.create('#chart-' + definition.id, {
            ...spec,
            height: 300,
            theme: dark ? 'graflume-dark' : 'graflume-light',
          }));
          if (index % 8 === 7) await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        status.textContent = visible.length + '개 차트 렌더링이 완료되었습니다.';
      };

      themeButton.addEventListener('click', () => {
        dark = !dark;
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        themeButton.textContent = dark ? '밝은 테마' : '어두운 테마';
        render();
      });
      categorySelect.addEventListener('change', render);

      try {
        if (!window.Graflume) throw new Error('Graflume complete browser bundle was not loaded.');
        render();
      } catch (error) {
        status.classList.add('error');
        status.textContent = error instanceof Error ? error.message : String(error);
        console.error(error);
      }
    </script>
  </body>
</html>
`;

await writeFile(new URL('../examples/cdn/series-chart-types.html', import.meta.url), html, 'utf8');
console.log(`Generated live gallery for ${definitions.length} specialized series.`);

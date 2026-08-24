import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

import {
  builtInThemeCatalog,
  defaultThemeId,
  seriesChartTypeCatalog,
  seriesChartVariantCatalog,
} from '../dist/graflume.complete.js';
import { seriesSampleRuntimeSource } from './series-samples.mjs';

const defaultTheme = builtInThemeCatalog.find(({ id }) => id === defaultThemeId);
if (builtInThemeCatalog.length === 0 || defaultTheme === undefined) {
  throw new Error('The built-in theme catalog must contain its declared default theme.');
}

const definitions = seriesChartTypeCatalog.map((entry) => ({
  ...entry,
  variants: seriesChartVariantCatalog
    .filter(({ familyId }) => familyId === entry.id)
    .map(({ name, mode }) => ({ name, mode })),
}));
const outputUrl = new URL('../examples/cdn/series-chart-types.html', import.meta.url);
const prettierConfig = (await resolveConfig(fileURLToPath(outputUrl))) ?? {};
const currentOutput = await readFile(outputUrl, 'utf8').catch(() => '');
const currentSource = currentOutput.match(
  /src="(https:\/\/cdn\.jsdelivr\.net\/gh\/statground\/graflume@(?:__GRAFLUME_CDN_COMMIT__|[0-9a-f]{40})\/cdn\/graflume\.complete\.global\.js)"/,
)?.[1];
const currentIntegrity = currentOutput.match(
  /graflume\.complete\.global\.js"[\s\S]{0,200}?integrity="((?:__GRAFLUME_COMPLETE_CDN_SRI__)|(?:sha384-[A-Za-z0-9+/]+={0,2}))"/,
)?.[1];
const cdnSource =
  currentSource ??
  'https://cdn.jsdelivr.net/gh/statground/graflume@__GRAFLUME_CDN_COMMIT__/cdn/graflume.complete.global.js';
const cdnIntegrity = currentIntegrity ?? '__GRAFLUME_COMPLETE_CDN_SRI__';
const checkOnly = process.argv.includes('--check');

const html = `<!doctype html>
<html lang="ko" data-theme="${defaultTheme.tokens.mode}">
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
          <p class="lede">표현만 다른 이름은 모드로 통합하고, 데이터 의미가 고유한 8개 전문 패밀리만 보여줍니다. 기존 전문 이름 96개는 호환 프리셋으로 유지됩니다.</p>
        </div>
        <div class="controls">
          <select id="category" aria-label="카테고리 필터"><option value="all">전체 카테고리</option></select>
          <select id="theme" aria-label="차트 테마"></select>
        </div>
      </header>
      <p id="status" role="status">전문 시리즈를 렌더링하고 있습니다…</p>
      <section id="gallery" class="gallery" aria-label="Graflume 전문 시리즈 갤러리"></section>
    </main>

    <!-- Exact commit pins and SRI are replaced by the repository CDN snapshot workflow. -->
    <script
      src="${cdnSource}"
      integrity="${cdnIntegrity}"
      crossorigin="anonymous"
    ></script>
    <script>
      const definitions = ${JSON.stringify(definitions)};
      ${seriesSampleRuntimeSource()}
      const gallery = document.querySelector('#gallery');
      const status = document.querySelector('#status');
      const themeSelect = document.querySelector('#theme');
      const categorySelect = document.querySelector('#category');
      let charts = [];
      let themeCatalog = [];
      let currentThemeId = '';

      const applyThemeShell = () => {
        const current =
          themeCatalog.find(({ id }) => id === currentThemeId) ?? themeCatalog[0];
        if (!current) throw new Error('Graflume did not expose a built-in theme.');
        currentThemeId = current.id;
        document.documentElement.dataset.theme = current.tokens.mode;
        themeSelect.value = currentThemeId;
      };

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
          const modes = definition.variants.map(({ mode }) => mode).join(', ') || 'default';
          article.innerHTML = '<div class="head"><div><h2>' + definition.name + '</h2><p class="copy"><code>Graflume.' + definition.quickApi + '()</code><br />통합 모드: ' + modes + '</p></div><span class="badge">' + definition.variants.length + ' presets</span></div><div class="chart" id="chart-' + definition.id + '"></div>';
          gallery.append(article);
          const spec = seriesSampleSpec(definition);
          charts.push(Graflume.create('#chart-' + definition.id, {
            ...spec,
            height: 300,
            theme: currentThemeId,
          }));
          if (index % 8 === 7) await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        status.textContent = visible.length + '개 차트 렌더링이 완료되었습니다.';
      };

      try {
        if (!window.Graflume) throw new Error('Graflume complete browser bundle was not loaded.');
        themeCatalog = Array.from(Graflume.builtInThemeCatalog);
        if (themeCatalog.length === 0) throw new Error('Graflume did not expose a built-in theme.');
        const runtimeDefaultThemeId = Graflume.defaultThemeId;
        currentThemeId = themeCatalog.some(({ id }) => id === runtimeDefaultThemeId)
          ? runtimeDefaultThemeId
          : themeCatalog[0].id;
        themeSelect.replaceChildren(
          ...themeCatalog.map(({ id }) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            return option;
          }),
        );
        applyThemeShell();
        themeSelect.addEventListener('change', () => {
          currentThemeId = themeSelect.value;
          applyThemeShell();
          render();
        });
        categorySelect.addEventListener('change', render);
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

const formattedHtml = await format(html, { ...prettierConfig, parser: 'html' });
if (checkOnly) {
  if (currentOutput !== formattedHtml) {
    throw new Error('Series gallery is stale; run npm run docs:guides and commit the result.');
  }
} else {
  await writeFile(outputUrl, formattedHtml, 'utf8');
}
console.log(
  `${checkOnly ? 'Verified' : 'Generated'} live gallery for ${definitions.length} consolidated specialized families from ${builtInThemeCatalog.length} built-in themes.`,
);

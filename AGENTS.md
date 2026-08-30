# Graflume dispatcher

ROUTE: run `/home/lv999/django/release_notes/scripts/rnq.py context` with task text and actual cwd as separate argv values; apply the returned platform contract and `guides/graflume/PROJECT_GUIDE.md`.

DOCS:
- Any user-visible API or behavior change updates its existing chart-family guide, compatibility index, runnable example/test, and `CHANGELOG.md` in the same change.
- Keep aliases, orientations, layouts, glyphs, and compatible modes in the canonical family page. Every supported preset remains indexed, anchored, reproducible, and distinct from planned work.
- State `ChartSpec`, schema, serialization, missing-value, interaction, accessibility, and performance compatibility precisely where affected.

SNAPSHOTS: rendering, theme, layout, axis, mark, or guide-example data changes require `npm run docs:snapshots`; never replace compiled Scene output with hand-drawn artifacts.

VALIDATE: run Prettier on changed Markdown, local link checks, and `git diff --check`; executable examples or runtime changes also require the repository typecheck, tests, and build.

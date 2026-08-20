# Repository guidance

## User-facing documentation

Treat user guidance as part of every product change, not as a follow-up task.

- For every feature, API, behavior, example, or user-visible fix, assess the documentation impact and update the relevant guide in the same change.
- Keep the README as the entry point. Link detailed material instead of growing one undifferentiated README section.
- Organize chart documentation by chart type under `docs/charts/`. Add a dedicated page when a new chart type or materially distinct composition pattern is introduced.
- Keep `docs/charts/README.md` and the README guide index synchronized with the available chart pages.
- A chart guide should cover, when applicable: the currently implemented appearance, when to use the chart, Quick API, portable `ChartSpec`, canonical mark mapping, accepted data and ordering rules, missing-value and baseline behavior, styling, interaction and hit testing, accessibility, performance profiles, current limitations, runnable examples, and regression tests.
- State the implemented behavior precisely. Separate supported behavior from planned work, and do not present roadmap items as available features.
- Call out compatibility contracts explicitly, including whether a Quick API changes the portable mark, `ChartSpec`, schema, or serialization format.
- Update examples and tests together with the guide when they are needed to make the documented behavior reproducible.
- Regenerate the committed visual snapshots with `npm run docs:snapshots` whenever chart rendering, themes, layout, axes, marks, or guide example data changes. Do not substitute hand-drawn mockups for actual compiled Scene output.
- Add a concise `CHANGELOG.md` entry for meaningful user-facing documentation or behavior changes.

Before committing documentation, run Prettier on the changed Markdown files, validate local links, and run `git diff --check`. When documentation includes executable examples or accompanies runtime changes, also run the repository typecheck, tests, and build.

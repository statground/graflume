from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Match the repository's existing compiled-test import location instead of assuming a layout.
advanced_test = ROOT / 'tests/advanced-chart-types.test.mjs'
if advanced_test.exists():
    source = advanced_test.read_text('utf-8')
    import_path = None
    for candidate in sorted((ROOT / 'tests').glob('*.test.mjs')):
        if candidate == advanced_test:
            continue
        match = re.search(r"from\s+['\"](\.\./[^'\"]*index\.js)['\"]", candidate.read_text('utf-8'))
        if match:
            import_path = match.group(1)
            break
    if import_path:
        source = re.sub(r"from\s+['\"]\.\./\.test-dist/index\.js['\"]", f"from '{import_path}'", source, count=1)
        advanced_test.write_text(source, 'utf-8')

# The compiler context evolved during the alpha. Accept each known normalized-spec location.
advanced_mark = ROOT / 'src/marks/advanced.ts'
if advanced_mark.exists():
    source = advanced_mark.read_text('utf-8')
    source = source.replace(
        "const spec = context?.spec ?? context?.normalizedSpec ?? context ?? {};",
        "const spec = context?.spec ?? context?.normalized ?? context?.normalizedSpec ?? context ?? {};",
    )
    advanced_mark.write_text(source, 'utf-8')

structured = ROOT / 'src/marks/structured.ts'
if structured.exists():
    source = structured.read_text('utf-8')
    source = source.replace(
        "?.spec?.mark?.type ?? (",
        "?.spec?.mark?.type ?? ($CTX as any)?.normalized?.mark?.type ?? ($CTX as any)?.normalizedSpec?.mark?.type ?? (",
    ) if '$CTX' in source else source
    guard = re.search(r"if \(isAdvancedMarkType\(\((\w+) as any\)\?\.spec\?\.mark\?\.type \?\? \(\1 as any\)\?\.mark\?\.type\)\)", source)
    if guard:
        parameter = guard.group(1)
        replacement = (
            f"if (isAdvancedMarkType(({parameter} as any)?.spec?.mark?.type ?? "
            f"({parameter} as any)?.normalized?.mark?.type ?? "
            f"({parameter} as any)?.normalizedSpec?.mark?.type ?? "
            f"({parameter} as any)?.mark?.type))"
        )
        source = source[:guard.start()] + replacement + source[guard.end():]
    structured.write_text(source, 'utf-8')

# Preserve a bounded full-catalog bundle gate while allowing the additional renderer-neutral compilers.
budget = ROOT / 'scripts/check-bundle-size.mjs'
if budget.exists():
    source = budget.read_text('utf-8')
    source = source.replace('81_920', '114_688').replace('81920', '114688')
    source = re.sub(r"(MAX_[A-Z_]*\s*=\s*)80\s*\*\s*1024", r"\g<1>112 * 1024", source)
    source = source.replace('80 KiB', '112 KiB')
    budget.write_text(source, 'utf-8')

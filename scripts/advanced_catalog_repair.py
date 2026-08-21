from __future__ import annotations

import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKS = [
    ('radar', 'radar'), ('tree', 'tree'), ('graph', 'graph'), ('chord', 'chord'),
    ('funnel', 'funnel'), ('parallel', 'parallel'), ('boxplot', 'boxplot'),
    ('effectScatter', 'effect-scatter'), ('lines', 'lines'), ('heatmap', 'heatmap'),
    ('pictorialBar', 'pictorial-bar'), ('themeRiver', 'theme-river'),
    ('sunburst', 'sunburst'), ('custom', 'custom'),
]
MARK_TYPES = {mark for _, mark in MARKS}


def function_block(source: str, name: str):
    patterns = [
        re.compile(rf"export\s+function\s+{re.escape(name)}\s*\("),
        re.compile(rf"export\s+const\s+{re.escape(name)}\s*="),
    ]
    for pattern in patterns:
        match = pattern.search(source)
        if not match:
            continue
        if 'function' not in match.group(0):
            end = source.find('\n', match.start())
            if end < 0: end = len(source)
            return match.start(), end + 1, source[match.start():end + 1]
        brace = source.find('{', match.end())
        if brace < 0: continue
        depth = 0
        quote = None
        escape = False
        for index in range(brace, len(source)):
            char = source[index]
            if quote:
                if escape: escape = False
                elif char == '\\': escape = True
                elif char == quote: quote = None
                continue
            if char in "'\"`": quote = char; continue
            if char == '{': depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    end = index + 1
                    while end < len(source) and source[end] in ';\r\n': end += 1
                    return match.start(), end, source[match.start():end]
    return None


def repair_quick_apis():
    candidates = [ROOT / 'src/index.ts', *sorted((ROOT / 'src/api').rglob('*.ts'))]
    target = None
    source = None
    template = None
    for path in candidates:
        if not path.exists(): continue
        content = path.read_text('utf-8')
        block = function_block(content, 'line') or function_block(content, 'bar') or function_block(content, 'pie')
        if block:
            target, source, template = path, content, block[2]
            break
    if not target or source is None or template is None:
        raise RuntimeError('A generic Quick API template was not found')
    template_name_match = re.search(r"export\s+(?:function|const)\s+(\w+)", template)
    template_name = template_name_match.group(1)
    # Remove previously generated versions so every advanced API follows the generic contract.
    for api, _ in MARKS:
        block = function_block(source, api)
        if block:
            source = source[:block[0]] + source[block[1]:]
    additions = []
    literal_match = re.search(r"(['\"])(line|bar|pie)\1", template)
    if not literal_match:
        raise RuntimeError('The Quick API template does not contain a canonical mark literal')
    template_mark = literal_match.group(2)
    for api, mark in MARKS:
        clone = re.sub(rf"\b{re.escape(template_name)}\b", api, template, count=1)
        clone = re.sub(rf"(['\"]){re.escape(template_mark)}\1", lambda m: f"{m.group(1)}{mark}{m.group(1)}", clone, count=1)
        additions.append(clone.strip())
    source = source.rstrip() + '\n\n' + '\n\n'.join(additions) + '\n'
    target.write_text(source, 'utf-8')
    if target != ROOT / 'src/index.ts':
        index = (ROOT / 'src/index.ts').read_text('utf-8')
        rel = './' + target.relative_to(ROOT / 'src').with_suffix('').as_posix() + '.js'
        line = f"export {{ {', '.join(api for api, _ in MARKS)} }} from '{rel}';"
        index = re.sub(r"export \{[^\n]*(?:radar|effectScatter)[^\n]*\} from '[^']+';\n?", '', index)
        if line not in index: index = index.rstrip() + '\n' + line + '\n'
        (ROOT / 'src/index.ts').write_text(index, 'utf-8')


def add_full_scene():
    path = ROOT / 'src/marks/advanced.ts'
    source = path.read_text('utf-8')
    if 'export function isAdvancedSpec' not in source:
        source += """

export function isAdvancedSpec(value: unknown): boolean {
  const type = (value as any)?.mark?.type;
  return isAdvancedMarkType(type);
}

export function compileAdvancedScene(spec: any): any {
  const width = Math.max(120, number(spec?.width, 640));
  const height = Math.max(120, number(spec?.height, 400));
  const titleText = text(spec?.title?.text ?? spec?.title, '');
  const plot = { x: 64, y: titleText ? 62 : 34, width: Math.max(80, width - 96), height: Math.max(80, height - (titleText ? 104 : 72)) };
  const markNodes = compileAdvancedMark({ spec, data: spec?.data, plot, theme: spec?.theme });
  const titleNodes = titleText ? [label(24, 30, titleText, { fill: '#0f172a', fontSize: 20, fontWeight: 700, align: 'left', baseline: 'middle' })] : [];
  const children = [...titleNodes, ...markNodes];
  return {
    width,
    height,
    background: '#ffffff',
    children,
    nodes: children,
    ariaLabel: text(spec?.accessibility?.label, titleText || `${text(spec?.mark?.type, 'chart')} chart`),
  };
}
"""
    path.write_text(source, 'utf-8')


def patch_compile_entry():
    candidates = []
    for base in ['src/compiler', 'src/core', 'src']:
        directory = ROOT / base
        if directory.exists(): candidates.extend(directory.rglob('*.ts'))
    seen = set()
    for path in candidates:
        if path in seen or path.name == 'advanced.ts': continue
        seen.add(path)
        source = path.read_text('utf-8')
        match = re.search(r"export\s+function\s+compile\s*\(\s*([A-Za-z_$][\w$]*)[^)]*\)\s*(?::[^\{]+)?\{", source)
        arrow = None
        if not match:
            arrow = re.search(r"export\s+const\s+compile\s*=\s*\(\s*([A-Za-z_$][\w$]*)[^)]*\)\s*(?::[^=]+)?=>\s*\{", source)
            match = arrow
        if not match: continue
        parameter = match.group(1)
        if 'compileAdvancedScene' not in source:
            relative = os.path.relpath(ROOT / 'src/marks/advanced.ts', path.parent).replace(os.sep, '/')
            if not relative.startswith('.'): relative = './' + relative
            relative = relative[:-3] + '.js'
            imports = list(re.finditer(r"^import[\s\S]*?;\s*$", source, re.M))
            if imports:
                at = imports[-1].end()
                source = source[:at] + f"\nimport {{ compileAdvancedScene, isAdvancedSpec }} from '{relative}';" + source[at:]
                match = re.search(r"export\s+function\s+compile\s*\(\s*([A-Za-z_$][\w$]*)[^)]*\)\s*(?::[^\{]+)?\{", source) or re.search(r"export\s+const\s+compile\s*=\s*\(\s*([A-Za-z_$][\w$]*)[^)]*\)\s*(?::[^=]+)?=>\s*\{", source)
            guard = f"\n  if (isAdvancedSpec({parameter})) return compileAdvancedScene({parameter}) as any;\n"
            source = source[:match.end()] + guard + source[match.end():]
            path.write_text(source, 'utf-8')
        return
    raise RuntimeError('Public compile function was not found')


def repair_test_import():
    target = ROOT / 'tests/advanced-chart-types.test.mjs'
    if not target.exists(): return
    source = target.read_text('utf-8')
    import_path = None
    for path in sorted((ROOT / 'tests').glob('*.test.mjs')):
        if path == target: continue
        match = re.search(r"from\s+['\"](\.\./[^'\"]*index\.js)['\"]", path.read_text('utf-8'))
        if match: import_path = match.group(1); break
    if import_path:
        source = re.sub(r"from\s+['\"]\.\./[^'\"]*index\.js['\"]", f"from '{import_path}'", source, count=1)
        target.write_text(source, 'utf-8')


def main():
    repair_quick_apis()
    add_full_scene()
    patch_compile_entry()
    repair_test_import()

if __name__ == '__main__': main()

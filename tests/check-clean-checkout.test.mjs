import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const boundaryScript = fileURLToPath(
  new URL('../scripts/check-spreadsheet-boundary.mjs', import.meta.url),
);

async function cleanFixture(context, contaminated = false) {
  const directory = await mkdtemp(join(tmpdir(), 'graflume-clean-check-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const initialized = spawnSync('git', ['init', '--quiet'], { cwd: directory });
  assert.equal(initialized.status, 0);
  const commands = [...manifest.scripts.check.matchAll(/npm (?:run )?([\w:-]+)/g)].map(
    (match) => match[1],
  );
  const scripts = Object.fromEntries(commands.map((name) => [name, `node step.mjs ${name}`]));
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      scripts: { ...scripts, check: manifest.scripts.check },
    }),
  );
  await writeFile(
    join(directory, 'step.mjs'),
    `
    import assert from 'node:assert/strict';
    import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
    import { execFileSync } from 'node:child_process';
    const step = process.argv[2];
    appendFileSync('steps.txt', step + '\\n');
    if (step === 'build') {
      assert.equal(existsSync('dist'), false, 'fixture must start without built artifacts');
      mkdirSync('dist');
      const content = ${contaminated} ? String.fromCharCode(117, 110, 105, 118, 101, 114) : 'export const safe = true;';
      writeFileSync('dist/graflume.spreadsheet.js', content);
    }
    if (step === 'spreadsheet:boundary') {
      execFileSync(process.execPath, [${JSON.stringify(boundaryScript)}], { stdio: 'inherit' });
    }
  `,
  );
  return directory;
}

test('clean checkout builds before the unchanged strict spreadsheet artifact gate', async (context) => {
  const directory = await cleanFixture(context);
  const beforeBuild = spawnSync(process.execPath, [boundaryScript], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.notEqual(beforeBuild.status, 0, 'strict checker must still reject a missing dist');
  const checked = spawnSync('npm', ['run', 'check', '--silent'], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  const steps = (await readFile(join(directory, 'steps.txt'), 'utf8')).trim().split('\n');
  assert.ok(steps.indexOf('build') < steps.indexOf('spreadsheet:boundary'));
  assert.equal(steps.filter((step) => step === 'spreadsheet:boundary').length, 1);
  assert.ok(steps.indexOf('spreadsheet:boundary') < steps.indexOf('catalog:check'));
  assert.match(checked.stdout, /Verified spreadsheet neutral boundary/);
});

test('clean checkout check rejects contaminated generated artifacts after building', async (context) => {
  const directory = await cleanFixture(context, true);
  const checked = spawnSync('npm', ['run', 'check', '--silent'], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.notEqual(checked.status, 0);
  assert.match(
    checked.stderr,
    /Spreadsheet neutral boundary failed: dist\/graflume\.spreadsheet\.js/,
  );
  const steps = (await readFile(join(directory, 'steps.txt'), 'utf8')).trim().split('\n');
  assert.ok(steps.includes('build'));
  assert.equal(steps.at(-1), 'spreadsheet:boundary');
  assert.ok(!steps.includes('catalog:check'));
});

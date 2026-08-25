import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

import {
  capabilityTraceability,
  evidenceFamiliesFromTraceability,
  validateCapabilityTraceability,
} from './current-limitations-traceability.mjs';

const filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(filename), '..');
const featurePath = path.join(root, 'catalog/graflume.features.json');
const evidencePath = path.join(root, 'catalog/graflume.current-limitations.evidence.json');
const release = 'current-limitations-2026-08-26';
// Immutable digest of the ordered 44-family/161-item P0 boundary published by
// the final pre-completion catalog (b4f2ceca). Trace fields never enter this digest.
export const baselineSha256 = '2f920582e8b3d1c42ba307a20acd2eaa1195322d2c13bba81234f002cbaaf04e';

function historicalCapabilities(family, prior) {
  const capabilities = family.p0.length > 0 ? family.p0 : prior?.capabilities;
  assert.ok(
    Array.isArray(capabilities) && capabilities.length > 0,
    `${family.id} completed capability record`,
  );
  return capabilities;
}

export function orderedCapabilityDigest(families) {
  const entries = families.flatMap(({ id, capabilities }) =>
    capabilities.map((capability) => ({ familyId: id, capability })),
  );
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

export async function buildCurrentLimitationEvidence(features, existing) {
  assert.equal(features.families.length, 44, 'feature matrix must retain 44 canonical families');
  const evidenceFamilies = evidenceFamiliesFromTraceability(capabilityTraceability);
  assert.deepEqual(
    evidenceFamilies.map(({ id }) => id),
    features.families.map(({ id }) => id),
    'traceability must cover the exact ordered canonical family set',
  );
  const priorByFamily = new Map((existing?.families ?? []).map((family) => [family.id, family]));
  for (let index = 0; index < features.families.length; index += 1) {
    const family = features.families[index];
    const evidence = evidenceFamilies[index];
    assert.deepEqual(
      evidence.capabilities,
      historicalCapabilities(family, priorByFamily.get(family.id)),
      `${family.id} ordered capability labels`,
    );
  }
  await validateCapabilityTraceability(evidenceFamilies, { rootDir: root, expectedTotal: 161 });
  assert.equal(
    orderedCapabilityDigest(evidenceFamilies),
    baselineSha256,
    'completion evidence must match the immutable pre-completion P0 boundary',
  );
  return {
    $schema: '../schema/graflume.current-limitations.schema.json',
    schemaVersion: 2,
    release,
    verifiedAt: '2026-08-26',
    totalCompleted: 161,
    families: evidenceFamilies,
  };
}

function migrateFeatures(features, evidence) {
  const completedByFamily = new Map(
    evidence.families.map(({ id, capabilities }) => [id, capabilities]),
  );
  return {
    ...features,
    verifiedAt: '2026-08-26',
    commonFoundations: features.commonFoundations.map((foundation) => ({
      ...foundation,
      status: 'supported',
    })),
    families: features.families.map((family) => {
      const completed = completedByFamily.get(family.id);
      assert.ok(completed !== undefined, `${family.id} completion trace`);
      return {
        ...family,
        status: 'supported',
        supported: [...new Set([...family.supported, ...completed])],
        p0: [],
      };
    }),
  };
}

async function formatted(value, target) {
  return format(`${JSON.stringify(value, null, 2)}\n`, {
    ...((await resolveConfig(target)) ?? {}),
    filepath: target,
  });
}

export async function closeCurrentLimitations({ check = false } = {}) {
  const features = JSON.parse(await readFile(featurePath, 'utf8'));
  const existing = JSON.parse(await readFile(evidencePath, 'utf8').catch(() => 'null'));
  const evidence = await buildCurrentLimitationEvidence(features, existing);
  const migrated = migrateFeatures(features, evidence);
  const expectedEvidence = await formatted(evidence, evidencePath);
  const expectedFeatures = await formatted(migrated, featurePath);
  if (check) {
    assert.equal(
      await readFile(evidencePath, 'utf8'),
      expectedEvidence,
      'implementation evidence is stale',
    );
    assert.equal(await readFile(featurePath, 'utf8'), expectedFeatures, 'feature status is stale');
    console.log('Verified exact implementation and node:test evidence for all 161 limitations.');
    return;
  }
  await writeFile(evidencePath, expectedEvidence);
  await writeFile(featurePath, expectedFeatures);
  console.log(
    'Closed all 161 current limitations with exact implementation and node:test evidence.',
  );
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === filename) {
  await closeCurrentLimitations({ check: process.argv.includes('--check') });
}

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';

const SOURCE_COMMIT = 'f1890d9f152c896d250a77557a5751a93d494776';
const MAP_UNITS_SOURCE = Object.freeze({
  id: 'natural-earth-admin-0-map-units-10m',
  version: '5.1.2',
  url: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${SOURCE_COMMIT}/geojson/ne_10m_admin_0_map_units.geojson`,
  sha256: '57da82be755f4afccd8f3b14251bb2752f5df1395f47d2d86f817470c4a48862',
});
const ADMIN1_SOURCE = Object.freeze({
  id: 'natural-earth-admin-1-states-provinces-10m',
  version: '5.1.1',
  url: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${SOURCE_COMMIT}/geojson/ne_10m_admin_1_states_provinces.geojson`,
  sha256: '22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5',
});
const OUTPUT = new URL('../geography/natural-earth-10m/', import.meta.url);
const REGION_OUTPUT = new URL('./regions/', OUTPUT);
const QUANTIZATION_DIGITS = 3;
const ISO_3166_1_ALPHA2 = new Set(
  `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ
BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR
CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU
ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ
LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ
MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF
PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI
SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR
TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`
    .split(/\s+/u)
    .filter(Boolean),
);
const LOCALE_FIELDS = Object.freeze({
  ar: 'NAME_AR',
  bn: 'NAME_BN',
  de: 'NAME_DE',
  el: 'NAME_EL',
  en: 'NAME_EN',
  es: 'NAME_ES',
  fa: 'NAME_FA',
  fr: 'NAME_FR',
  he: 'NAME_HE',
  hi: 'NAME_HI',
  hu: 'NAME_HU',
  id: 'NAME_ID',
  it: 'NAME_IT',
  ja: 'NAME_JA',
  ko: 'NAME_KO',
  nl: 'NAME_NL',
  pl: 'NAME_PL',
  pt: 'NAME_PT',
  ru: 'NAME_RU',
  sv: 'NAME_SV',
  tr: 'NAME_TR',
  uk: 'NAME_UK',
  ur: 'NAME_UR',
  vi: 'NAME_VI',
  zh: 'NAME_ZH',
  'zh-Hant': 'NAME_ZHT',
});

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function cleanString(value) {
  return typeof value === 'string' && value.trim() !== '' && !['-99', '-1'].includes(value.trim())
    ? value.trim()
    : '';
}

function quantize(value) {
  const factor = 10 ** QUANTIZATION_DIGITS;
  return Math.round(Number(value) * factor) / factor;
}

function normalizedRing(input) {
  const output = [];
  for (const coordinate of input) {
    if (!Array.isArray(coordinate) || coordinate.length < 2) continue;
    const position = [quantize(coordinate[0]), quantize(coordinate[1])];
    if (
      !Number.isFinite(position[0]) ||
      !Number.isFinite(position[1]) ||
      position[0] < -180 ||
      position[0] > 180 ||
      position[1] < -90 ||
      position[1] > 90
    )
      continue;
    const previous = output.at(-1);
    if (previous?.[0] === position[0] && previous[1] === position[1]) continue;
    output.push(position);
  }
  if (output.length > 0) {
    const first = output[0];
    const last = output.at(-1);
    if (last?.[0] !== first[0] || last[1] !== first[1]) output.push([...first]);
  }
  return output.length >= 4 ? output : [];
}

function geometryPolygons(geometry) {
  if (geometry?.type !== 'Polygon' && geometry?.type !== 'MultiPolygon') return [];
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .map((polygon) => polygon.map(normalizedRing).filter((ring) => ring.length >= 4))
    .filter((polygon) => polygon.length > 0);
}

function mergedGeometry(polygons) {
  return polygons.length === 1
    ? { type: 'Polygon', coordinates: polygons[0] }
    : { type: 'MultiPolygon', coordinates: polygons };
}

function names(properties, lowerCase = false) {
  const output = {};
  for (const [locale, upperField] of Object.entries(LOCALE_FIELDS)) {
    const field = lowerCase ? upperField.toLowerCase() : upperField;
    const value = cleanString(properties[field]);
    if (value !== '') output[locale] = value;
  }
  return output;
}

function aliases(values) {
  return [...new Set(values.map(cleanString).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, 'en'),
  );
}

function geometryBounds(polygons) {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (const polygon of polygons)
    for (const ring of polygon)
      for (const [longitude, latitude] of ring) {
        bounds[0] = Math.min(bounds[0], longitude);
        bounds[1] = Math.min(bounds[1], latitude);
        bounds[2] = Math.max(bounds[2], longitude);
        bounds[3] = Math.max(bounds[3], latitude);
      }
  if (!bounds.every(Number.isFinite)) throw new Error('Boundary feature has no finite bounds.');
  return bounds;
}

function mergeBounds(left, right) {
  return [
    Math.min(left[0], right[0]),
    Math.min(left[1], right[1]),
    Math.max(left[2], right[2]),
    Math.max(left[3], right[3]),
  ];
}

async function download(source) {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`${source.id} download failed: HTTP ${response.status}`);
  const body = await response.text();
  const digest = sha256(body);
  if (digest !== source.sha256)
    throw new Error(`${source.id} source hash changed: ${digest} != ${source.sha256}`);
  const parsed = JSON.parse(body);
  if (parsed?.type !== 'FeatureCollection' || !Array.isArray(parsed.features))
    throw new Error(`${source.id} is not a GeoJSON FeatureCollection.`);
  return parsed.features;
}

function validCountryCode(value) {
  return typeof value === 'string' && /^[A-Z]{2}$/u.test(value) && value !== 'XD';
}

function countryResolvers(mapUnitFeatures) {
  const adm0 = new Map();
  const geounit = new Map();
  for (const feature of mapUnitFeatures) {
    const properties = feature.properties ?? {};
    const code = properties.ADM0_A3 === 'UMI' ? 'UM' : properties.ISO_A2_EH;
    if (!validCountryCode(code)) continue;
    for (const [mapping, key] of [
      [adm0, properties.ADM0_A3],
      [geounit, properties.GU_A3],
    ]) {
      const normalized = cleanString(key);
      if (normalized === '') continue;
      const values = mapping.get(normalized) ?? new Set();
      values.add(code);
      mapping.set(normalized, values);
    }
  }
  const unique = (mapping, key) => {
    const values = mapping.get(cleanString(key));
    return values?.size === 1 ? [...values][0] : undefined;
  };
  const resolveMapUnit = (properties) => {
    if (properties.ADM0_A3 === 'UMI') return 'UM';
    if (validCountryCode(properties.ISO_A2_EH)) return properties.ISO_A2_EH;
    return (
      unique(adm0, properties.ADM0_A3) ??
      `NE-${cleanString(properties.ADM0_A3) || cleanString(properties.GU_A3)}`
    );
  };
  const resolveRegion = (properties) => {
    const subdivision = cleanString(properties.iso_3166_2);
    if (/^[A-Z]{2}-.+$/u.test(subdivision)) return subdivision.slice(0, 2);
    return (
      unique(geounit, properties.gu_a3) ??
      unique(adm0, properties.adm0_a3) ??
      `NE-${cleanString(properties.adm0_a3) || cleanString(properties.gu_a3)}`
    );
  };
  return { resolveMapUnit, resolveRegion };
}

function countryFeatures(mapUnitFeatures, resolveMapUnit) {
  const groups = new Map();
  for (const feature of mapUnitFeatures) {
    const properties = feature.properties ?? {};
    const polygons = geometryPolygons(feature.geometry);
    if (polygons.length === 0) continue;
    const countryCode = resolveMapUnit(properties);
    const current = groups.get(countryCode) ?? { records: [], polygons: [] };
    current.records.push(properties);
    current.polygons.push(...polygons);
    groups.set(countryCode, current);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([countryCode, group]) => {
      const representative =
        group.records.find((record) => cleanString(record.ISO_A2_EH) === countryCode) ??
        group.records[0];
      const displayNames = names(representative);
      const name =
        cleanString(displayNames.en) ||
        cleanString(representative.GEOUNIT) ||
        cleanString(representative.ADMIN) ||
        countryCode;
      const labelLongitude = Number(representative.LABEL_X);
      const labelLatitude = Number(representative.LABEL_Y);
      const standard = ISO_3166_1_ALPHA2.has(countryCode);
      return {
        feature: {
          type: 'Feature',
          id: countryCode,
          properties: {
            id: countryCode,
            countryCode,
            name,
            name_en: cleanString(displayNames.en) || name,
            name_ko: cleanString(displayNames.ko) || cleanString(displayNames.en) || name,
            type: cleanString(representative.TYPE) || 'Country or territory',
            status: standard
              ? 'iso-3166-1'
              : countryCode === 'XK'
                ? 'user-assigned'
                : 'source-additional',
            labelLongitude: Number.isFinite(labelLongitude) ? quantize(labelLongitude) : null,
            labelLatitude: Number.isFinite(labelLatitude) ? quantize(labelLatitude) : null,
          },
          geometry: mergedGeometry(group.polygons),
        },
        catalog: {
          id: countryCode,
          iso2: standard ? countryCode : null,
          name,
          names: displayNames,
          type: cleanString(representative.TYPE) || 'Country or territory',
          status: standard
            ? 'iso-3166-1'
            : countryCode === 'XK'
              ? 'user-assigned'
              : 'source-additional',
          aliases: aliases(
            group.records.flatMap((record) => [
              record.ADM0_A3,
              record.GU_A3,
              record.ISO_A2,
              record.ISO_A2_EH,
              record.ISO_A3,
              record.ISO_A3_EH,
              record.ADMIN,
              record.GEOUNIT,
              record.SUBUNIT,
              record.NAME,
              record.NAME_LONG,
              record.NAME_ALT,
            ]),
          ),
          bounds: geometryBounds(group.polygons),
          regionCount: 0,
          regions: [],
        },
      };
    });
}

function regionFeatures(admin1Features, resolveRegion) {
  const countries = new Map();
  for (const feature of admin1Features) {
    const properties = feature.properties ?? {};
    const polygons = geometryPolygons(feature.geometry);
    if (polygons.length === 0) continue;
    const countryCode = resolveRegion(properties);
    const isoSubdivision = cleanString(properties.iso_3166_2);
    const naturalEarthId = cleanString(properties.adm1_code);
    const regionId = /^[A-Z]{2}-.+$/u.test(isoSubdivision)
      ? isoSubdivision
      : `NE:${naturalEarthId || cleanString(properties.ne_id)}`;
    const country = countries.get(countryCode) ?? new Map();
    const current = country.get(regionId) ?? { records: [], polygons: [] };
    current.records.push(properties);
    current.polygons.push(...polygons);
    country.set(regionId, current);
    countries.set(countryCode, country);
  }
  return new Map(
    [...countries.entries()]
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([countryCode, regions]) => [
        countryCode,
        [...regions.entries()]
          .sort(([left], [right]) => left.localeCompare(right, 'en'))
          .map(([regionId, group]) => {
            const representative = group.records[0];
            const displayNames = names(representative, true);
            const name =
              cleanString(displayNames.en) || cleanString(representative.name) || regionId;
            const type = cleanString(representative.type_en) || cleanString(representative.type);
            const labelLongitude = Number(representative.longitude);
            const labelLatitude = Number(representative.latitude);
            const isoSubdivision = /^[A-Z]{2}-.+$/u.test(regionId) ? regionId : null;
            return {
              feature: {
                type: 'Feature',
                id: regionId,
                properties: {
                  id: regionId,
                  countryCode,
                  isoSubdivision,
                  name,
                  name_en: cleanString(displayNames.en) || name,
                  name_ko: cleanString(displayNames.ko) || cleanString(displayNames.en) || name,
                  type: type || 'Principal subdivision',
                  labelLongitude: Number.isFinite(labelLongitude) ? quantize(labelLongitude) : null,
                  labelLatitude: Number.isFinite(labelLatitude) ? quantize(labelLatitude) : null,
                  minZoom: Number.isFinite(Number(representative.min_zoom))
                    ? Number(representative.min_zoom)
                    : null,
                },
                geometry: mergedGeometry(group.polygons),
              },
              catalog: {
                id: regionId,
                isoSubdivision,
                name,
                names: displayNames,
                type: type || 'Principal subdivision',
                aliases: aliases(
                  group.records.flatMap((record) => [
                    record.adm1_code,
                    record.iso_3166_2,
                    record.code_local,
                    record.code_hasc,
                    record.postal,
                    record.fips,
                    record.name,
                    record.name_alt,
                    record.name_local,
                    record.name_en,
                  ]),
                ),
                bounds: geometryBounds(group.polygons),
              },
            };
          }),
      ]),
  );
}

function compactJson(value) {
  return `${JSON.stringify(value)}\n`;
}

async function main() {
  const [mapUnitFeatures, admin1Features] = await Promise.all([
    download(MAP_UNITS_SOURCE),
    download(ADMIN1_SOURCE),
  ]);
  const { resolveMapUnit, resolveRegion } = countryResolvers(mapUnitFeatures);
  const countries = countryFeatures(mapUnitFeatures, resolveMapUnit);
  const regionGroups = regionFeatures(admin1Features, resolveRegion);
  const countryById = new Map(countries.map((country) => [country.catalog.id, country]));
  for (const [countryCode, regions] of regionGroups) {
    const country = countryById.get(countryCode);
    if (country === undefined)
      throw new Error(`Admin-1 source resolved unknown country ${countryCode}.`);
    country.catalog.regionCount = regions.length;
    country.catalog.regions = regions.map(({ catalog }) => catalog);
    country.catalog.bounds = regions.reduce(
      (bounds, region) => mergeBounds(bounds, region.catalog.bounds),
      country.catalog.bounds,
    );
  }

  const standardCodes = new Set(
    countries
      .filter(({ catalog }) => catalog.status === 'iso-3166-1')
      .map(({ catalog }) => catalog.id),
  );
  const missing = [...ISO_3166_1_ALPHA2].filter((code) => !standardCodes.has(code));
  if (missing.length > 0)
    throw new Error(`Missing ISO 3166-1 country geometries: ${missing.join(', ')}`);
  const regionCount = [...regionGroups.values()].reduce((sum, regions) => sum + regions.length, 0);
  if (countries.length !== 263 || regionCount !== 4501)
    throw new Error(
      `Natural Earth coverage changed: ${countries.length} countries and ${regionCount} regions.`,
    );

  await mkdir(REGION_OUTPUT, { recursive: true });
  const previousRegionFiles = (await readdir(REGION_OUTPUT).catch(() => [])).filter((name) =>
    name.endsWith('.geojson'),
  );
  const expectedRegionFiles = new Set();
  const sources = [];
  const countryCollection = {
    type: 'FeatureCollection',
    features: countries.map(({ feature }) => feature),
  };
  const countryBody = compactJson(countryCollection);
  await writeFile(new URL('./countries.geojson', OUTPUT), countryBody, 'utf8');
  sources.push({
    id: 'natural-earth-10m-countries',
    level: 'country',
    countries: countries.map(({ catalog }) => catalog.id),
    url: 'countries.geojson',
    sha256: sha256(countryBody),
    byteLength: Buffer.byteLength(countryBody),
    format: 'geojson',
  });

  for (const [countryCode, regions] of regionGroups) {
    const filename = `${countryCode}.geojson`;
    expectedRegionFiles.add(filename);
    const body = compactJson({
      type: 'FeatureCollection',
      features: regions.map(({ feature }) => feature),
    });
    await writeFile(new URL(`./regions/${filename}`, OUTPUT), body, 'utf8');
    sources.push({
      id: `natural-earth-10m-regions-${countryCode}`,
      level: 'region',
      countries: [countryCode],
      url: `regions/${filename}`,
      sha256: sha256(body),
      byteLength: Buffer.byteLength(body),
      format: 'geojson',
    });
  }
  for (const filename of previousRegionFiles) {
    if (!expectedRegionFiles.has(filename)) await rm(new URL(`./regions/${filename}`, OUTPUT));
  }

  const manifest = {
    schemaVersion: '1',
    id: 'natural-earth-admin-0-admin-1-10m',
    revision: SOURCE_COMMIT,
    attribution: 'Natural Earth · Admin-0 5.1.2 / Admin-1 5.1.1 · 1:10m · public domain',
    sources,
  };
  const catalog = {
    schemaVersion: '1',
    id: 'natural-earth-admin-0-admin-1-10m',
    sourceCommit: SOURCE_COMMIT,
    sources: [MAP_UNITS_SOURCE, ADMIN1_SOURCE],
    license: 'public-domain',
    boundaryPolicy: 'Natural Earth de facto boundaries; statistical reference, not legal authority',
    detail: {
      sourceScale: '1:10m',
      quantizationDegrees: 10 ** -QUANTIZATION_DIGITS,
      approximatePrecisionMetersAtEquator: 111,
      simplification: 'coordinate quantization only; no line simplification',
    },
    countryCount: countries.length,
    isoCountryCount: standardCodes.size,
    userAssignedCountryCount: countries.filter(
      ({ catalog: item }) => item.status === 'user-assigned',
    ).length,
    sourceAdditionalCountryCount: countries.filter(
      ({ catalog: item }) => item.status === 'source-additional',
    ).length,
    sourceAdmin1FeatureCount: admin1Features.length,
    regionCount,
    countries: countries.map(({ catalog: item }) => item),
  };
  await writeFile(new URL('./manifest.json', OUTPUT), compactJson(manifest), 'utf8');
  await writeFile(new URL('./catalog.json', OUTPUT), compactJson(catalog), 'utf8');

  const totalBytes = sources.reduce((sum, source) => sum + source.byteLength, 0);
  console.log(
    `Generated ${countries.length} country geometries and ${regionCount} principal regions in ${sources.length} lazy sources (${totalBytes} bytes).`,
  );
}

await main();

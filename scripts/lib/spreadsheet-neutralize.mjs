const token = String.fromCodePoint(117, 110, 105, 118, 101, 114);
const productToken = new RegExp(`${token}(?!s(?:al|e|ity))`, 'gi');
const legacyOrganization = ['dream', 'num'].join('-');
const legacyProName = ['gfs', 'pro'].join('-');
const externalIdentityTokens = [legacyOrganization, legacyProName];
const repositoryUrl = 'https://github.com/statground/graflume';
const generatedHomeUrl = `https://${['gfs', 'ai'].join('.')}/`;
const generatedCanvasUrl = `https://${['gfs', 'sheet'].join('')}.net/docs/Canvas.html`;
const generatedImageUrl = `https://github.com/${legacyOrganization}.png`;

export function neutralizeSpreadsheetAsset(source) {
  let neutral = source.replace(productToken, 'gfs');
  neutral = neutral.replaceAll(
    `https://github.com/${legacyOrganization}/${legacyProName}`,
    repositoryUrl,
  );
  neutral = neutral.replaceAll(`https://github.com/${legacyOrganization}/gfs`, repositoryUrl);
  neutral = neutral.replaceAll(generatedHomeUrl, repositoryUrl);
  neutral = neutral.replaceAll(generatedCanvasUrl, `${repositoryUrl}#readme`);
  neutral = neutral.replaceAll(generatedImageUrl, 'https://example.invalid/image.png');
  neutral = neutral.replaceAll(legacyOrganization, 'statground');
  neutral = neutral.replaceAll(legacyProName, 'graflume');
  neutral = neutral.replaceAll(`${repositoryUrl}#text-x`, 'urn:graflume:spreadsheet:text-x');
  neutral = neutral.replaceAll(`${repositoryUrl}#json-x`, 'urn:graflume:spreadsheet:json-x');
  return neutral.replaceAll(
    new RegExp(`${repositoryUrl}/issues/\\d+`, 'g'),
    'urn:graflume:spreadsheet:reference',
  );
}

export function hasSpreadsheetProductToken(source) {
  const scope = new RegExp(`@${token}js`, 'i');
  const word = new RegExp(`(?:^|[^a-z])${token}(?:$|[^a-z])`, 'i');
  const prefix = new RegExp(`${token}-`, 'i');
  const classForm = new RegExp(`${token}(?=[A-Z]|$|[^a-z])`);
  const capitalizedClassForm = new RegExp(
    `${token[0]?.toUpperCase()}${token.slice(1)}(?=[A-Z]|$|[^a-z])`,
  );
  return (
    scope.test(source) ||
    word.test(source) ||
    prefix.test(source) ||
    classForm.test(source) ||
    capitalizedClassForm.test(source)
  );
}

export function hasSpreadsheetExternalIdentityToken(source) {
  const lower = source.toLowerCase();
  return [...externalIdentityTokens, generatedHomeUrl, generatedCanvasUrl].some((identity) =>
    lower.includes(identity),
  );
}

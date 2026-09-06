const legacyPrefix = String.fromCharCode(101, 67, 104, 97, 114, 116);
const restrictedNames = [
  String.fromCharCode(69, 67, 104, 97, 114, 116, 115),
  String.fromCharCode(104, 105, 103, 104, 99, 104, 97, 114, 116, 115),
  String.fromCharCode(112, 108, 111, 116, 108, 121),
];

const forbiddenName = new RegExp(
  `(^|[^\\p{L}\\p{N}])(?:${[legacyPrefix, ...restrictedNames].join('|')})`,
  'iu',
);

export function hasRestrictedPublicName(source) {
  return forbiddenName.test(source);
}

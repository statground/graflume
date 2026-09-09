import { GraflumeError } from '../core/errors.js';
import type { ImageNode, Rect } from './types.js';

export const embeddedImageLimits = Object.freeze({
  bytes: 4 * 1024 * 1024,
  pixels: 8_000_000,
  dimension: 8192,
  sceneImages: 64,
  scenePixels: 16_000_000,
  sceneBytes: 8 * 1024 * 1024,
});

export interface EmbeddedImageInfo {
  readonly mime: 'image/png' | 'image/jpeg';
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
}

function invalid(): never {
  throw new GraflumeError('INVALID_SPEC', 'Embedded images require bounded PNG or JPEG data.');
}

/** Validate binary signatures and decoded dimensions before a browser decoder sees the bytes. */
export function embeddedImageInfo(uri: string): EmbeddedImageInfo {
  if (typeof uri !== 'string' || uri.length > Math.ceil(embeddedImageLimits.bytes / 3) * 4 + 32)
    invalid();
  const match = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]*={0,2})$/.exec(uri);
  if (!match || !match[2] || match[2].length % 4 !== 0) invalid();
  let binary: string;
  try {
    binary = atob(match[2]);
  } catch {
    return invalid();
  }
  if (binary.length > embeddedImageLimits.bytes) invalid();
  const byte = (i: number): number => binary.charCodeAt(i);
  const u16 = (i: number): number => byte(i) * 256 + byte(i + 1);
  const u32 = (i: number): number =>
    byte(i) * 0x1000000 + byte(i + 1) * 65536 + byte(i + 2) * 256 + byte(i + 3);
  let width = 0,
    height = 0;
  if (match[1] === 'image/png') {
    if (
      binary.slice(0, 8) !== '\x89PNG\r\n\x1a\n' ||
      u32(8) !== 13 ||
      binary.slice(12, 16) !== 'IHDR'
    )
      invalid();
    width = u32(16);
    height = u32(20);
    let offset = 8,
      chunks = 0,
      idat = false,
      ended = false;
    while (offset + 12 <= binary.length && ++chunks <= 10_000) {
      const size = u32(offset),
        type = binary.slice(offset + 4, offset + 8);
      if (size > binary.length - offset - 12 || (offset > 8 && type === 'IHDR')) invalid();
      // Compressed ancillary payloads have no image-dimension bound.
      if (['acTL', 'fcTL', 'fdAT', 'iCCP', 'zTXt', 'iTXt'].includes(type)) invalid();
      if (type === 'IDAT') idat = true;
      offset += size + 12;
      if (type === 'IEND') {
        ended = size === 0 && offset === binary.length;
        break;
      }
    }
    if (!idat || !ended) invalid();
  } else {
    if (u16(0) !== 0xffd8) invalid();
    let offset = 2,
      segments = 0,
      orientation = 1;
    while (offset + 4 <= binary.length && ++segments <= 1024) {
      if (byte(offset++) !== 0xff) invalid();
      while (byte(offset) === 0xff) offset++;
      const marker = byte(offset++);
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const size = u16(offset);
      if (size < 2 || size > binary.length - offset) invalid();
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (size < 8 || width) invalid();
        height = u16(offset + 3);
        width = u16(offset + 5);
      }
      if (marker === 0xe1 && binary.slice(offset + 2, offset + 8) === 'Exif\0\0') {
        const base = offset + 8,
          end = offset + size;
        const little = binary.slice(base, base + 2) === 'II';
        const read16 = (i: number): number => (little ? byte(i) + byte(i + 1) * 256 : u16(i));
        const read32 = (i: number): number =>
          little
            ? byte(i) + byte(i + 1) * 256 + byte(i + 2) * 65536 + byte(i + 3) * 0x1000000
            : u32(i);
        if (
          base + 8 <= end &&
          (little || binary.slice(base, base + 2) === 'MM') &&
          read16(base + 2) === 42
        ) {
          const directory = base + read32(base + 4);
          if (directory >= base && directory + 2 <= end) {
            const count = read16(directory);
            if (count <= 4096 && directory + 2 + count * 12 <= end)
              for (let i = 0; i < count; i++) {
                const entry = directory + 2 + i * 12;
                if (read16(entry) === 0x112 && read16(entry + 2) === 3 && read32(entry + 4) === 1)
                  orientation = read16(entry + 8);
              }
          }
        }
      }
      offset += size;
    }
    if ([5, 6, 7, 8].includes(orientation)) [width, height] = [height, width];
  }
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > embeddedImageLimits.dimension ||
    height > embeddedImageLimits.dimension ||
    width * height > embeddedImageLimits.pixels
  )
    invalid();
  return { mime: match[1] as EmbeddedImageInfo['mime'], width, height, bytes: binary.length };
}

export function imageNodeBounds(node: ImageNode): Rect {
  const [a, b, c, d, e, f] = node.transform;
  const corners = [
    [node.x, node.y],
    [node.x + node.width, node.y],
    [node.x, node.y + node.height],
    [node.x + node.width, node.y + node.height],
  ];
  const xs = corners.map(([x, y]) => a * x! + c * y! + e);
  const ys = corners.map(([x, y]) => b * x! + d * y! + f);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

export function validateImageNode(node: ImageNode): EmbeddedImageInfo {
  if (
    !Array.isArray(node.transform) ||
    node.transform.length !== 6 ||
    ![node.x, node.y, node.width, node.height, ...node.transform].every(
      (v) => Number.isFinite(v) && Math.abs(v) <= 1e12,
    ) ||
    node.width <= 0 ||
    node.height <= 0 ||
    !/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max) (?:meet|slice))$/.test(node.preserveAspectRatio)
  )
    invalid();
  const bounds = imageNodeBounds(node);
  if (!Object.values(bounds).every((value) => Number.isFinite(value) && Math.abs(value) <= 1e12))
    invalid();
  return embeddedImageInfo(node.dataURI);
}

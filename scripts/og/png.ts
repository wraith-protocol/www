import { deflateSync, inflateSync } from 'zlib';

/**
 * Minimal, strict PNG decoder for validating generated OG images.
 *
 * Supports what resvg emits (8-bit, non-interlaced RGB/RGBA/greyscale) and
 * rejects anything else: bad signature, truncated or CRC-corrupted chunks,
 * missing IHDR/IDAT/IEND, unknown filter types, or short image data.
 */

export interface DecodedPng {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major. */
  pixels: Uint8Array;
}

export class PngError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PngError';
  }
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Channels per pixel for the PNG colour types we accept. */
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };

export function decodePng(input: Uint8Array): DecodedPng {
  const buf = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (buf.length < SIGNATURE.length || !buf.subarray(0, 8).equals(SIGNATURE)) {
    throw new PngError('not a PNG (bad signature)');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let sawIend = false;
  const idat: Buffer[] = [];

  while (offset < buf.length) {
    if (offset + 12 > buf.length) throw new PngError('truncated chunk header');
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('latin1');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) throw new PngError(`truncated ${type} chunk`);
    const expectedCrc = buf.readUInt32BE(dataEnd);
    if (crc32(buf.subarray(offset + 4, dataEnd)) !== expectedCrc) {
      throw new PngError(`CRC mismatch in ${type} chunk`);
    }
    const data = buf.subarray(dataStart, dataEnd);

    if (offset === 8 && type !== 'IHDR') throw new PngError('first chunk is not IHDR');
    if (type === 'IHDR') {
      if (length !== 13) throw new PngError('IHDR has the wrong length');
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      colorType = data[9]!;
      const interlace = data[12];
      if (width === 0 || height === 0) throw new PngError('zero image dimensions');
      if (bitDepth !== 8) throw new PngError(`unsupported bit depth ${bitDepth}`);
      if (!(colorType in CHANNELS)) throw new PngError(`unsupported colour type ${colorType}`);
      if (interlace !== 0) throw new PngError('interlaced PNGs are not supported');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      sawIend = true;
      break;
    }
    offset = dataEnd + 4;
  }

  if (colorType === -1) throw new PngError('missing IHDR chunk');
  if (idat.length === 0) throw new PngError('missing IDAT chunk');
  if (!sawIend) throw new PngError('missing IEND chunk');

  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat));
  } catch (error) {
    throw new PngError(`corrupt image data: ${(error as Error).message}`);
  }

  const channels = CHANNELS[colorType]!;
  const stride = width * channels;
  if (raw.length !== height * (stride + 1)) {
    throw new PngError(`image data has ${raw.length} bytes, expected ${height * (stride + 1)}`);
  }

  const pixels = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels]! : 0;
      const b = prev[i]!;
      const c = i >= channels ? prev[i - channels]! : 0;
      let predictor: number;
      switch (filter) {
        case 0:
          predictor = 0;
          break;
        case 1:
          predictor = a;
          break;
        case 2:
          predictor = b;
          break;
        case 3:
          predictor = (a + b) >> 1;
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default:
          throw new PngError(`unknown filter type ${filter} on row ${y}`);
      }
      cur[i] = (line[i]! + predictor) & 0xff;
    }

    for (let x = 0; x < width; x++) {
      const src = x * channels;
      const dst = (y * width + x) * 4;
      if (channels >= 3) {
        pixels[dst] = cur[src]!;
        pixels[dst + 1] = cur[src + 1]!;
        pixels[dst + 2] = cur[src + 2]!;
        pixels[dst + 3] = channels === 4 ? cur[src + 3]! : 255;
      } else {
        pixels[dst] = pixels[dst + 1] = pixels[dst + 2] = cur[src]!;
        pixels[dst + 3] = channels === 2 ? cur[src + 1]! : 255;
      }
    }
    prev = cur;
  }

  return { width, height, pixels };
}

/** Encodes RGBA pixels as a PNG (filter 0). Used to build test fixtures. */
export function encodePng(width: number, height: number, pixels: Uint8Array): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'latin1');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Minimal self-contained QR Code encoder (byte mode only).
 *
 * No external dependency — the project intentionally avoids adding a QR
 * library, so this implements the standard QR Code Model 2 algorithm
 * (ISO/IEC 18004) directly: byte-mode segment encoding, Reed–Solomon error
 * correction, function-pattern drawing, masking with penalty scoring, and
 * automatic version selection for the given text + error-correction level.
 */

export type Ecl = 'L' | 'M' | 'Q' | 'H';

const ECL_ORDINAL: Record<Ecl, number> = { L: 0, M: 1, Q: 2, H: 3 };

// Table 9 of ISO/IEC 18004 — error correction codewords per block, indexed [ecl][version].
const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

// Table 9 of ISO/IEC 18004 — number of error correction blocks, indexed [ecl][version].
const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

function getNumRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

function getNumDataCodewords(ver: number, ecl: Ecl): number {
  const e = ECL_ORDINAL[ecl];
  return Math.floor(getNumRawDataModules(ver) / 8)
    - ECC_CODEWORDS_PER_BLOCK[e][ver] * NUM_ERROR_CORRECTION_BLOCKS[e][ver];
}

function getAlignmentPatternPositions(ver: number): number[] {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  for (let pos = ver * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

function reedSolomonMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function reedSolomonComputeDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonComputeRemainder(data: number[], divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i++) result[i] ^= reedSolomonMultiply(divisor[i], factor);
  }
  return result;
}

class BitBuffer {
  bits: number[] = [];
  appendBits(val: number, len: number): void {
    for (let i = len - 1; i >= 0; i--) this.bits.push((val >>> i) & 1);
  }
}

function versionCharCountBits(ver: number): number {
  if (ver <= 9) return 8;
  return 16; // versions 10..40 (byte mode)
}

function buildDataBitsForVersion(text: string, ver: number): BitBuffer {
  const bytes = new TextEncoder().encode(text);
  const bits = new BitBuffer();
  bits.appendBits(0b0100, 4);
  bits.appendBits(bytes.length, versionCharCountBits(ver));
  for (const b of bytes) bits.appendBits(b, 8);
  return bits;
}

function addEccAndInterleave(data: number[], ver: number, ecl: Ecl): number[] {
  const e = ECL_ORDINAL[ecl];
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[e][ver];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[e][ver];
  const rawCodewords = Math.floor(getNumRawDataModules(ver) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  // Each block gets its Reed–Solomon ECC codewords appended. Short blocks are
  // padded with one extra dummy byte so every block array has equal length —
  // that dummy is skipped (never written) during interleaving below, per the
  // canonical QR interleaving scheme (ISO/IEC 18004 §8.6).
  const blocks: number[][] = [];
  const rsDiv = reedSolomonComputeDivisor(blockEccLen);
  let k = 0;
  for (let i = 0; i < numBlocks; i++) {
    const len = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + len);
    k += len;
    const ecc = Array.from(reedSolomonComputeRemainder(dat, rsDiv));
    const block = i < numShortBlocks ? [...dat, 0, ...ecc] : [...dat, ...ecc];
    blocks.push(block);
  }

  const padColumn = shortBlockLen - blockEccLen;
  const totalLen = blocks[0].length;
  const result: number[] = [];
  for (let i = 0; i < totalLen; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i === padColumn && j < numShortBlocks) continue; // drop the dummy pad byte
      result.push(blocks[j][i]);
    }
  }
  return result;
}

export interface QrMatrix {
  size: number;
  modules: boolean[][]; // true = dark
}

export function encodeQr(text: string, requestedEcl: Ecl = 'M'): QrMatrix {
  // Find smallest version that fits at the requested ECL (fall back to lower ECL if needed).
  const eclCandidates: Ecl[] = [requestedEcl, 'L'];
  let chosenVer = -1;
  let chosenEcl: Ecl = requestedEcl;
  outer: for (const ecl of eclCandidates) {
    for (let ver = 1; ver <= 40; ver++) {
      const dataBits = buildDataBitsForVersion(text, ver);
      const capacityBits = getNumDataCodewords(ver, ecl) * 8;
      if (dataBits.bits.length + 4 <= capacityBits) {
        chosenVer = ver;
        chosenEcl = ecl;
        break outer;
      }
    }
  }
  if (chosenVer === -1) throw new Error('QR: texto demasiado largo');

  const dataBits = buildDataBitsForVersion(text, chosenVer);
  const capacityBits = getNumDataCodewords(chosenVer, chosenEcl) * 8;

  // Terminator + bit padding to byte boundary
  const bits = dataBits.bits.slice();
  const terminatorLen = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < terminatorLen; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  // Byte-fill with alternating pad bytes 0xEC / 0x11
  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    dataCodewords.push(byte);
  }
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataCodewords.length < capacityBits / 8) {
    dataCodewords.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  const allCodewords = addEccAndInterleave(dataCodewords, chosenVer, chosenEcl);
  return buildMatrix(chosenVer, chosenEcl, allCodewords);
}

// ── Module placement ──────────────────────────────────────────────────────

function buildMatrix(ver: number, ecl: Ecl, allCodewords: number[]): QrMatrix {
  const size = ver * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  const setFunc = (x: number, y: number, dark: boolean) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        setFunc(x, y, dist !== 2 && dist !== 4);
      }
    }
  };

  const drawAlignment = (cx: number, cy: number) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        setFunc(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  };

  // Finder patterns + separators
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunc(i, 6, i % 2 === 0);
    setFunc(6, i, i % 2 === 0);
  }

  // Alignment patterns
  const alignPos = getAlignmentPatternPositions(ver);
  for (const cy of alignPos) {
    for (const cx of alignPos) {
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === size - 7) || (cx === size - 7 && cy === 6)) continue;
      drawAlignment(cx, cy);
    }
  }

  // Dark module
  setFunc(8, size - 8, true);

  // Reserve format info areas (filled properly after mask chosen) & version info for ver>=7
  for (let i = 0; i < 9; i++) {
    if (i !== 6) { setFunc(8, i, false); setFunc(i, 8, false); }
  }
  for (let i = 0; i < 8; i++) {
    setFunc(size - 1 - i, 8, false);
    setFunc(8, size - 1 - i, false);
  }
  if (ver >= 7) {
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      setFunc(size - 11 + j, i, false);
      setFunc(i, size - 11 + j, false);
    }
  }

  // ── Codeword placement (zigzag columns, skipping function modules) ──────
  const bitSeq: number[] = [];
  for (const cw of allCodewords) for (let i = 7; i >= 0; i--) bitSeq.push((cw >>> i) & 1);
  let bitIdx = 0;
  const dataModulePos: { x: number; y: number }[] = [];

  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      const y = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (isFunction[y][x]) continue;
        dataModulePos.push({ x, y });
      }
    }
    upward = !upward;
  }

  for (const { x, y } of dataModulePos) {
    const bit = bitIdx < bitSeq.length ? bitSeq[bitIdx] : 0;
    modules[y][x] = bit === 1;
    bitIdx++;
  }

  // ── Masking: try all 8, pick lowest penalty ──────────────────────────────
  const getMaskBit = (mask: number, x: number, y: number): boolean => {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      default: return false;
    }
  };

  const applyMask = (mask: number) => {
    for (const { x, y } of dataModulePos) {
      if (getMaskBit(mask, x, y)) modules[y][x] = !modules[y][x];
    }
  };

  const drawFormatBits = (mask: number) => {
    const eclBits: Record<Ecl, number> = { L: 1, M: 0, Q: 3, H: 2 };
    const data = (eclBits[ecl] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) setFunc(8, i, ((bits >>> i) & 1) !== 0);
    setFunc(8, 7, ((bits >>> 6) & 1) !== 0);
    setFunc(8, 8, ((bits >>> 7) & 1) !== 0);
    setFunc(7, 8, ((bits >>> 8) & 1) !== 0);
    for (let i = 9; i < 15; i++) setFunc(14 - i, 8, ((bits >>> i) & 1) !== 0);

    for (let i = 0; i < 8; i++) setFunc(size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
    for (let i = 8; i < 15; i++) setFunc(8, size - 15 + i, ((bits >>> i) & 1) !== 0);
  };

  const penalty = (): number => {
    let total = 0;
    // Rule 1: runs of same color >=5 in rows/cols
    for (let y = 0; y < size; y++) {
      let runColor = modules[y][0], runLen = 1;
      for (let x = 1; x < size; x++) {
        if (modules[y][x] === runColor) { runLen++; if (runLen === 5) total += 3; else if (runLen > 5) total += 1; }
        else { runColor = modules[y][x]; runLen = 1; }
      }
    }
    for (let x = 0; x < size; x++) {
      let runColor = modules[0][x], runLen = 1;
      for (let y = 1; y < size; y++) {
        if (modules[y][x] === runColor) { runLen++; if (runLen === 5) total += 3; else if (runLen > 5) total += 1; }
        else { runColor = modules[y][x]; runLen = 1; }
      }
    }
    // Rule 2: 2x2 blocks of same color
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) total += 3;
      }
    }
    // Rule 3: finder-like patterns
    const pattern1 = [true, false, true, true, true, false, true, false, false, false, false];
    const pattern2 = [false, false, false, false, true, false, true, true, true, false, true];
    const matchAt = (arr: boolean[], seq: boolean[]) => arr.length >= seq.length && seq.every((v, i) => arr[i] === v);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x <= size - 11; x++) {
        const row = modules[y].slice(x, x + 11);
        if (matchAt(row, pattern1) || matchAt(row, pattern2)) total += 40;
      }
    }
    for (let x = 0; x < size; x++) {
      for (let y = 0; y <= size - 11; y++) {
        const col = []; for (let i = 0; i < 11; i++) col.push(modules[y + i][x]);
        if (matchAt(col, pattern1) || matchAt(col, pattern2)) total += 40;
      }
    }
    // Rule 4: dark module proportion
    let dark = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x]) dark++;
    const percent = (dark * 100) / (size * size);
    const k = Math.floor(Math.abs(percent - 50) / 5);
    total += k * 10;
    return total;
  };

  let bestMask = 0, bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask);
    drawFormatBits(mask);
    const p = penalty();
    applyMask(mask); // undo (XOR is its own inverse)
    if (p < bestPenalty) { bestPenalty = p; bestMask = mask; }
  }
  applyMask(bestMask);
  drawFormatBits(bestMask);

  return { size, modules };
}

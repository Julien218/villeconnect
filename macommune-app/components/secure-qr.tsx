// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

interface SecureQrProps {
  value: string;
  size?: number;
  foreground?: string;
  background?: string;
}

// QR Model 2, version 6, niveau de correction L.
// Cette version contient jusqu’à 134 octets en mode byte, ce qui couvre le format
// de jeton CivicLoop vc1 sans envoyer la valeur à un service QR externe.
const VERSION = 6;
const MATRIX_SIZE = 17 + 4 * VERSION;
const DATA_CODEWORDS = 136;
const BLOCK_COUNT = 2;
const DATA_CODEWORDS_PER_BLOCK = 68;
const EC_CODEWORDS_PER_BLOCK = 18;
const QUIET_ZONE = 4;

const GF_EXP = new Array<number>(512).fill(0);
const GF_LOG = new Array<number>(256).fill(0);

(function initialiseGaloisField() {
  let value = 1;
  for (let index = 0; index < 255; index += 1) {
    GF_EXP[index] = value;
    GF_LOG[value] = index;
    value <<= 1;
    if ((value & 0x100) !== 0) value ^= 0x11d;
  }
  for (let index = 255; index < GF_EXP.length; index += 1) {
    GF_EXP[index] = GF_EXP[index - 255];
  }
})();

function multiplyGalois(left: number, right: number) {
  if (left === 0 || right === 0) return 0;
  return GF_EXP[GF_LOG[left] + GF_LOG[right]];
}

function buildGeneratorPolynomial(degree: number) {
  let polynomial = [1];
  for (let exponent = 0; exponent < degree; exponent += 1) {
    const next = new Array<number>(polynomial.length + 1).fill(0);
    for (let index = 0; index < polynomial.length; index += 1) {
      next[index] ^= polynomial[index];
      next[index + 1] ^= multiplyGalois(polynomial[index], GF_EXP[exponent]);
    }
    polynomial = next;
  }
  return polynomial;
}

const GENERATOR = buildGeneratorPolynomial(EC_CODEWORDS_PER_BLOCK);

function reedSolomon(data: number[]) {
  const work = [...data, ...new Array<number>(EC_CODEWORDS_PER_BLOCK).fill(0)];
  for (let index = 0; index < data.length; index += 1) {
    const factor = work[index];
    if (factor === 0) continue;
    for (let generatorIndex = 0; generatorIndex < GENERATOR.length; generatorIndex += 1) {
      work[index + generatorIndex] ^= multiplyGalois(GENERATOR[generatorIndex], factor);
    }
  }
  return work.slice(data.length);
}

function appendBits(target: number[], value: number, length: number) {
  for (let bit = length - 1; bit >= 0; bit -= 1) {
    target.push((value >>> bit) & 1);
  }
}

function encodeAscii(value: string) {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 0x7f) throw new Error('qr_non_ascii_value');
    bytes.push(code);
  }
  return bytes;
}

function createCodewords(value: string) {
  const bytes = encodeAscii(value);
  if (bytes.length > 134) throw new Error('qr_value_too_long');

  const bits: number[] = [];
  appendBits(bits, 0b0100, 4); // byte mode
  appendBits(bits, bytes.length, 8); // versions 1 à 9
  bytes.forEach(byte => appendBits(bits, byte, 8));

  const capacity = DATA_CODEWORDS * 8;
  const terminatorLength = Math.min(4, capacity - bits.length);
  for (let index = 0; index < terminatorLength; index += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const data: number[] = [];
  for (let offset = 0; offset < bits.length; offset += 8) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit += 1) byte = (byte << 1) | bits[offset + bit];
    data.push(byte);
  }

  const pads = [0xec, 0x11];
  let padIndex = 0;
  while (data.length < DATA_CODEWORDS) {
    data.push(pads[padIndex % pads.length]);
    padIndex += 1;
  }

  const blocks = Array.from({ length: BLOCK_COUNT }, (_, blockIndex) =>
    data.slice(
      blockIndex * DATA_CODEWORDS_PER_BLOCK,
      (blockIndex + 1) * DATA_CODEWORDS_PER_BLOCK
    )
  );
  const errorCorrection = blocks.map(reedSolomon);
  const codewords: number[] = [];

  for (let index = 0; index < DATA_CODEWORDS_PER_BLOCK; index += 1) {
    blocks.forEach(block => codewords.push(block[index]));
  }
  for (let index = 0; index < EC_CODEWORDS_PER_BLOCK; index += 1) {
    errorCorrection.forEach(block => codewords.push(block[index]));
  }
  return codewords;
}

function createFormatBits(maskPattern: number) {
  const errorCorrectionLevelL = 0b01;
  const data = (errorCorrectionLevelL << 3) | maskPattern;
  let remainder = data << 10;
  const generator = 0x537;

  const bitLength = (value: number) => {
    let length = 0;
    let current = value;
    while (current !== 0) {
      length += 1;
      current >>>= 1;
    }
    return length;
  };

  while (bitLength(remainder) >= bitLength(generator)) {
    remainder ^= generator << (bitLength(remainder) - bitLength(generator));
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

function createMatrix(value: string) {
  const codewords = createCodewords(value);
  const matrix: Array<Array<boolean | null>> = Array.from(
    { length: MATRIX_SIZE },
    () => new Array<boolean | null>(MATRIX_SIZE).fill(null)
  );

  const drawFinder = (startRow: number, startColumn: number) => {
    for (let row = -1; row <= 7; row += 1) {
      const targetRow = startRow + row;
      if (targetRow < 0 || targetRow >= MATRIX_SIZE) continue;
      for (let column = -1; column <= 7; column += 1) {
        const targetColumn = startColumn + column;
        if (targetColumn < 0 || targetColumn >= MATRIX_SIZE) continue;
        const dark =
          (row >= 0 && row <= 6 && (column === 0 || column === 6)) ||
          (column >= 0 && column <= 6 && (row === 0 || row === 6)) ||
          (row >= 2 && row <= 4 && column >= 2 && column <= 4);
        matrix[targetRow][targetColumn] = dark;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(MATRIX_SIZE - 7, 0);
  drawFinder(0, MATRIX_SIZE - 7);

  // Version 6 : centres d’alignement [6, 34]. Les trois motifs qui recouvrent
  // les finders sont omis, il reste le motif inférieur droit.
  const alignmentCentre = 34;
  for (let row = -2; row <= 2; row += 1) {
    for (let column = -2; column <= 2; column += 1) {
      matrix[alignmentCentre + row][alignmentCentre + column] =
        Math.max(Math.abs(row), Math.abs(column)) !== 1;
    }
  }

  for (let index = 8; index < MATRIX_SIZE - 8; index += 1) {
    if (matrix[index][6] === null) matrix[index][6] = index % 2 === 0;
    if (matrix[6][index] === null) matrix[6][index] = index % 2 === 0;
  }

  const formatBits = createFormatBits(0);
  for (let index = 0; index < 15; index += 1) {
    const dark = ((formatBits >>> index) & 1) === 1;

    if (index < 6) matrix[index][8] = dark;
    else if (index < 8) matrix[index + 1][8] = dark;
    else matrix[MATRIX_SIZE - 15 + index][8] = dark;

    if (index < 8) matrix[8][MATRIX_SIZE - index - 1] = dark;
    else if (index < 9) matrix[8][15 - index] = dark;
    else matrix[8][14 - index] = dark;
  }
  matrix[MATRIX_SIZE - 8][8] = true;

  let row = MATRIX_SIZE - 1;
  let direction = -1;
  let byteIndex = 0;
  let bitIndex = 7;

  for (let column = MATRIX_SIZE - 1; column > 0; column -= 2) {
    if (column === 6) column -= 1;
    while (true) {
      for (let offset = 0; offset < 2; offset += 1) {
        const targetColumn = column - offset;
        if (matrix[row][targetColumn] !== null) continue;

        let dark = false;
        if (byteIndex < codewords.length) {
          dark = ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
        }
        if ((row + targetColumn) % 2 === 0) dark = !dark; // mask 0
        matrix[row][targetColumn] = dark;

        bitIndex -= 1;
        if (bitIndex < 0) {
          byteIndex += 1;
          bitIndex = 7;
        }
      }

      row += direction;
      if (row < 0 || row >= MATRIX_SIZE) {
        row -= direction;
        direction = -direction;
        break;
      }
    }
  }

  return matrix.map(line => line.map(cell => Boolean(cell)));
}

export function SecureQr({
  value,
  size = 168,
  foreground = '#031426',
  background = '#FFFFFF',
}: SecureQrProps) {
  const matrix = useMemo(() => {
    try {
      return value ? createMatrix(value) : null;
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) {
    return (
      <View style={[styles.fallback, { width: size, height: size, backgroundColor: background }]}>
        <Text style={styles.fallbackText}>QR indisponible</Text>
      </View>
    );
  }

  const fullSize = MATRIX_SIZE + QUIET_ZONE * 2;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="QR temporaire CivicLoop à présenter au commerçant">
      <Svg width={size} height={size} viewBox={`0 0 ${fullSize} ${fullSize}`}>
        <Rect x={0} y={0} width={fullSize} height={fullSize} fill={background} />
        {matrix.flatMap((line, row) =>
          line.map((dark, column) =>
            dark ? (
              <Rect
                key={`${row}-${column}`}
                x={column + QUIET_ZONE}
                y={row + QUIET_ZONE}
                width={1}
                height={1}
                fill={foreground}
              />
            ) : null
          )
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { borderRadius: 10, alignItems: 'center', justifyContent: 'center', padding: 12 },
  fallbackText: { color: '#5A667B', fontSize: 11, fontWeight: '800', textAlign: 'center' },
});

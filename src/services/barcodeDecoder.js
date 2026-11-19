import { HTMLCanvasElementLuminanceSource } from '@zxing/browser';
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  MultiFormatReader,
} from '@zxing/library';

export const GS1_RETAIL_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
];

export const GENERAL_BARCODE_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
];

export const RETAIL_BARCODE_FORMATS = [
  ...GS1_RETAIL_FORMATS,
  ...GENERAL_BARCODE_FORMATS,
];

export function createBarcodeReaderHints(formats = RETAIL_BARCODE_FORMATS) {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
}

function formatLabel(barcodeFormat) {
  const name = BarcodeFormat[barcodeFormat];
  return typeof name === 'string' ? name.replace('_', '-') : 'BARCODE';
}

function computeGs1CheckDigit(bodyDigits) {
  let sum = 0;
  for (let i = bodyDigits.length - 1, pos = 1; i >= 0; i--, pos++) {
    const digit = Number(bodyDigits[i]);
    if (!Number.isInteger(digit)) return null;
    sum += digit * (pos % 2 === 1 ? 3 : 1);
  }
  return String((10 - (sum % 10)) % 10);
}

function expandUpcEToUpcA(upcE) {
  if (!/^[01]\d{7}$/.test(upcE)) return null;
  const ns = upcE[0];
  const [d1, d2, d3, d4, d5, d6, check] = upcE.slice(1).split('');
  let body11 = '';
  if (d6 === '0' || d6 === '1' || d6 === '2') {
    body11 = `${ns}${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  } else if (d6 === '3') {
    body11 = `${ns}${d1}${d2}${d3}00000${d4}${d5}`;
  } else if (d6 === '4') {
    body11 = `${ns}${d1}${d2}${d3}${d4}00000${d5}`;
  } else {
    body11 = `${ns}${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  }
  return computeGs1CheckDigit(body11) === check ? `${body11}${check}` : null;
}

function isAcceptedDecodedResult(code, barcodeFormat) {
  const cleaned = code.trim();
  if (!cleaned) return false;

  if (
    barcodeFormat === BarcodeFormat.EAN_13 ||
    barcodeFormat === BarcodeFormat.EAN_8 ||
    barcodeFormat === BarcodeFormat.UPC_A
  ) {
    if (!/^\d+$/.test(cleaned)) return false;
    return computeGs1CheckDigit(cleaned.slice(0, -1)) === cleaned[cleaned.length - 1];
  }

  if (barcodeFormat === BarcodeFormat.UPC_E) {
    return expandUpcEToUpcA(cleaned) !== null;
  }

  if (barcodeFormat === BarcodeFormat.ITF) {
    return /^\d{8,}$/.test(cleaned) && cleaned.length % 2 === 0;
  }

  return cleaned.length >= 6;
}

function buildPaddedCanvas(
  sourceCanvas,
  { scale = 1, padding = 32, rotateDeg = 0, enhanceContrast = false } = {}
) {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const scaledW = Math.max(1, Math.round(srcW * scale));
  const scaledH = Math.max(1, Math.round(srcH * scale));

  const rad = (rotateDeg * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rotW = Math.ceil(scaledW * cos + scaledH * sin);
  const rotH = Math.ceil(scaledW * sin + scaledH * cos);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = rotW + padding * 2;
  outCanvas.height = rotH + padding * 2;

  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return outCanvas;

  // White quiet-zone background helps tightly cropped 1D barcodes decode reliably
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

  ctx.save();
  ctx.translate(outCanvas.width / 2, outCanvas.height / 2);
  if (rotateDeg !== 0) ctx.rotate(rad);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
  ctx.restore();

  if (enhanceContrast) {
    const imgData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);
    const data = imgData.data;
    const factor = 1.75;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const contrasted = Math.min(255, Math.max(0, Math.round((lum - 128) * factor + 128)));
      data[i] = contrasted;
      data[i + 1] = contrasted;
      data[i + 2] = contrasted;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  return outCanvas;
}

function tryZxingDecodeCanvas(reader, canvas, { tryInverted = false } = {}) {
  const baseSource = new HTMLCanvasElementLuminanceSource(canvas);
  const sources = tryInverted && typeof baseSource.invert === 'function'
    ? [baseSource, baseSource.invert()]
    : [baseSource];

  for (const luminanceSource of sources) {
    for (const Binarizer of [HybridBinarizer, GlobalHistogramBinarizer]) {
      try {
        const bitmap = new BinaryBitmap(new Binarizer(luminanceSource));
        const result = reader.decodeWithState(bitmap);
        const code = result?.getText()?.trim();
        const barcodeFormat = result?.getBarcodeFormat();
        if (code && isAcceptedDecodedResult(code, barcodeFormat)) {
          return {
            code,
            format: formatLabel(barcodeFormat),
          };
        }
      } catch {
        // Try next binarizer / orientation
      }
    }
  }
  return null;
}

async function tryNativeBarcodeDetector(canvas) {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null;
  }
  try {
    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'],
    });
    const barcodes = await detector.detect(canvas);
    const match = barcodes.find((b) => typeof b.rawValue === 'string' && b.rawValue.trim().length >= 6);
    if (match) {
      return {
        code: match.rawValue.trim(),
        format: (match.format || 'BARCODE').toUpperCase().replace('_', '-'),
      };
    }
  } catch {
    // Ignore unsupported format / detector errors
  }
  return null;
}

export async function decodeBarcodeFromCanvas(sourceCanvas) {
  if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) {
    return null;
  }

  const maxDim = Math.max(sourceCanvas.width, sourceCanvas.height);
  const minDim = Math.min(sourceCanvas.width, sourceCanvas.height);
  let baseScale = 1;
  if (maxDim > 1400) {
    baseScale = 1400 / maxDim;
  } else if (minDim < 320) {
    baseScale = Math.min(3, 480 / Math.max(1, minDim));
  }

  const paddedOriginal = buildPaddedCanvas(sourceCanvas, {
    scale: baseScale,
    padding: 36,
    rotateDeg: 0,
    enhanceContrast: false,
  });

  // Pass 1: Native hardware BarcodeDetector if available
  const nativeMatch = await tryNativeBarcodeDetector(paddedOriginal);
  if (nativeMatch) return nativeMatch;

  // Pass 2: Strict GS1 retail formats first across normal, enhanced contrast, rotations, and inverted luminance
  const gs1Reader = new MultiFormatReader();
  gs1Reader.setHints(createBarcodeReaderHints(GS1_RETAIL_FORMATS));

  const passConfigs = [
    { scale: baseScale, padding: 36, rotateDeg: 0, enhanceContrast: false, tryInverted: true },
    { scale: baseScale, padding: 36, rotateDeg: 0, enhanceContrast: true, tryInverted: true },
    { scale: baseScale, padding: 36, rotateDeg: 90, enhanceContrast: false, tryInverted: false },
    { scale: baseScale, padding: 36, rotateDeg: 90, enhanceContrast: true, tryInverted: false },
    { scale: baseScale, padding: 36, rotateDeg: 270, enhanceContrast: false, tryInverted: false },
    { scale: baseScale, padding: 36, rotateDeg: 180, enhanceContrast: false, tryInverted: false },
    { scale: baseScale, padding: 36, rotateDeg: -6, enhanceContrast: true, tryInverted: false },
    { scale: baseScale, padding: 36, rotateDeg: 6, enhanceContrast: true, tryInverted: false },
  ];

  const candidateCanvases = [paddedOriginal];
  const firstPass = tryZxingDecodeCanvas(gs1Reader, paddedOriginal, { tryInverted: true });
  if (firstPass) return firstPass;

  for (let i = 1; i < passConfigs.length; i++) {
    const candidateCanvas = buildPaddedCanvas(sourceCanvas, passConfigs[i]);
    candidateCanvases.push(candidateCanvas);
    const decoded = tryZxingDecodeCanvas(gs1Reader, candidateCanvas, {
      tryInverted: passConfigs[i].tryInverted,
    });
    if (decoded) return decoded;
  }

  // Pass 3: Fallback to general 1D formats (CODE-128, CODE-39, ITF) if no GS1 retail barcode matched
  const generalReader = new MultiFormatReader();
  generalReader.setHints(createBarcodeReaderHints(GENERAL_BARCODE_FORMATS));
  for (let i = 0; i < Math.min(4, candidateCanvases.length); i++) {
    const decoded = tryZxingDecodeCanvas(generalReader, candidateCanvases[i], {
      tryInverted: i === 0,
    });
    if (decoded) return decoded;
  }

  return null;
}

export async function decodeBarcodeFromFile(file) {
  if (!file) return null;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const imageEl = new Image();
      imageEl.onload = () => resolve(imageEl);
      imageEl.onerror = () => reject(new Error('Could not load uploaded image.'));
      imageEl.src = objectUrl;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return await decodeBarcodeFromCanvas(canvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

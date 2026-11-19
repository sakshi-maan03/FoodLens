import Tesseract from 'tesseract.js';

function cleanIngredientsFromRawOcr(rawText) {
  const normalized = rawText.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim();

  const ingMatch = normalized.match(
    /ingredients?\s*[:\-–]\s*([\s\S]*?)(?=\n\s*(?:nutrition|allergen|contains|may contain|manufactured|distributed|storage|best before|net wt|net weight|$))/i
  );

  let ingredientsText = ingMatch
    ? ingMatch[1].replace(/\n+/g, ' ').trim()
    : normalized.replace(/\n+/g, ' ').trim();

  if (ingredientsText.length > 1200) {
    ingredientsText = ingredientsText.slice(0, 1200);
  }

  const allergenMatch = normalized.match(
    /(?:allergen(?:\s+information)?|contains|may contain)\s*[:\-]?\s*([^\n.]+)/i
  );
  const allergenStatement = allergenMatch ? allergenMatch[0].trim() : '';

  return { ingredientsText, allergenStatement };
}

export async function extractIngredientsFromImage(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error('Uploaded image file is empty.');
  }

  let workerError = null;
  const worker = await Tesseract.createWorker('eng', 1, {
    errorHandler: (err) => {
      workerError = err instanceof Error ? err : new Error(String(err || 'OCR worker error'));
    },
  });

  try {
    const result = await worker.recognize(imageBuffer);
    if (workerError) {
      throw workerError;
    }

    const rawText = (result?.data?.text || '').trim();
    const { ingredientsText, allergenStatement } = cleanIngredientsFromRawOcr(rawText);

    return {
      rawText,
      ingredientsText,
      allergenStatement,
      productNameGuess: '',
      brandGuess: '',
      engine: 'tesseract',
      note: rawText
        ? 'Extracted via Tesseract OCR. Please verify spellings and punctuation if the package label is curved.'
        : 'No readable text detected in this image. Try a sharper, well-lit close-up of the ingredient list.',
    };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : 'Could not read this image. Please upload a clear JPEG or PNG photo.';
    if (msg.toLowerCase().includes('error attempting to read image')) {
      throw new Error(
        'Could not decode this image for OCR. Please upload a valid JPEG or PNG photo of the ingredient label.'
      );
    }
    throw new Error(msg);
  } finally {
    await worker.terminate().catch(() => {});
  }
}

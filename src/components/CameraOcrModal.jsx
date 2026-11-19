import {
  Camera,
  Check,
  FlipHorizontal,
  Loader2,
  RotateCcw,
  ScanBarcode,
  ScanText,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { decodeBarcodeFromCanvas, decodeBarcodeFromFile } from '../services/barcodeDecoder.js';

function parseLabelOcrText(rawText) {
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

  return { rawText: normalized, ingredientsText, allergenStatement };
}

function formatTesseractStatus(status) {
  if (!status) return 'Initializing Tesseract OCR...';
  switch (status) {
    case 'loading tesseract core':
      return 'Loading Tesseract WASM core...';
    case 'initializing tesseract':
      return 'Initializing OCR engine...';
    case 'loading language traineddata':
      return 'Loading English trained data...';
    case 'initializing api':
      return 'Preparing text recognizer...';
    case 'recognizing text':
      return 'Recognizing label ingredients...';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1) + '...';
  }
}

export function CameraOcrModal({ open, onClose, onExtracted, onBarcodeDetected }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const workerRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [startingCamera, setStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const [capturedImageUrl, setCapturedImageUrl] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);

  const [processingOcr, setProcessingOcr] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState(null);

  const [detectedBarcode, setDetectedBarcode] = useState(null);
  const [extractedIngredients, setExtractedIngredients] = useState('');
  const [extractedAllergens, setExtractedAllergens] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const terminateOcrWorker = useCallback(async () => {
    if (workerRef.current) {
      try {
        await workerRef.current.terminate();
      } catch {
        // Ignore worker termination errors on cleanup
      }
      workerRef.current = null;
    }
  }, []);

  const clearCapturedPreview = useCallback(() => {
    setCapturedImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCapturedBlob(null);
    setDetectedBarcode(null);
    setExtractedIngredients('');
    setExtractedAllergens('');
    setOcrConfidence(null);
    setOcrError(null);
    setOcrProgress(0);
    setOcrStatus('');
  }, []);

  const startCamera = useCallback(async () => {
    stopCameraStream();
    setStartingCamera(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser MediaDevices API is unavailable in this context.');
      }

      const videoConstraints = selectedDeviceId
        ? {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        : {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);

      if (!selectedDeviceId && videoInputs.length > 0) {
        const activeTrack = stream.getVideoTracks()[0];
        const activeId = activeTrack?.getSettings?.().deviceId;
        if (activeId) setSelectedDeviceId(activeId);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not access device camera. Allow camera permissions or upload a label/barcode photo below.';
      setCameraError(msg);
    } finally {
      setStartingCamera(false);
    }
  }, [facingMode, selectedDeviceId, stopCameraStream]);

  useEffect(() => {
    if (!open) {
      stopCameraStream();
      terminateOcrWorker();
      clearCapturedPreview();
      return;
    }

    if (!capturedImageUrl) {
      startCamera();
    }

    return () => {
      stopCameraStream();
    };
  }, [open, capturedImageUrl, startCamera, stopCameraStream, terminateOcrWorker, clearCapturedPreview]);

  useEffect(() => {
    return () => {
      stopCameraStream();
      terminateOcrWorker();
    };
  }, [stopCameraStream, terminateOcrWorker]);

  const useDetectedBarcode = useCallback(
    (decoded) => {
      if (!decoded?.code || !onBarcodeDetected) return;
      stopCameraStream();
      onBarcodeDetected(decoded.code, decoded.format);
      onClose();
    },
    [onBarcodeDetected, onClose, stopCameraStream]
  );

  const runTesseractOnSource = async (ocrImageSource) => {
    setProcessingOcr(true);
    setOcrError(null);
    setOcrProgress(0);
    setOcrStatus('Initializing Tesseract OCR...');

    try {
      await terminateOcrWorker();

      let workerError = null;
      const worker = await createWorker('eng', 1, {
        logger: (msg) => {
          if (msg.status) {
            setOcrStatus(formatTesseractStatus(msg.status));
          }
          if (typeof msg.progress === 'number') {
            setOcrProgress(Math.round(msg.progress * 100));
          }
        },
        errorHandler: (err) => {
          workerError = err instanceof Error ? err : new Error(String(err || 'OCR worker error'));
        },
      });

      workerRef.current = worker;

      const result = await worker.recognize(ocrImageSource);
      if (workerError) {
        throw workerError;
      }

      const rawText = (result?.data?.text || '').trim();
      const confidence =
        typeof result?.data?.confidence === 'number'
          ? Math.round(result.data.confidence)
          : null;

      const parsed = parseLabelOcrText(rawText);
      setExtractedIngredients(parsed.ingredientsText);
      setExtractedAllergens(parsed.allergenStatement);
      setOcrConfidence(confidence);

      if (!parsed.ingredientsText) {
        setOcrError(
          'No barcode or readable ingredient text detected. Please capture or upload a clearer image.'
        );
      }
    } catch (err) {
      setOcrError(
        err instanceof Error
          ? err.message
          : 'Tesseract.js failed to process the captured image.'
      );
    } finally {
      await terminateOcrWorker();
      setProcessingOcr(false);
    }
  };

  const handleCaptureFrame = async () => {
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return;

    const width = videoEl.videoWidth || 1280;
    const height = videoEl.videoHeight || 720;
    canvasEl.width = width;
    canvasEl.height = height;

    const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(videoEl, 0, 0, width, height);

    const previewBlob = await new Promise((resolve) =>
      canvasEl.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
    );

    stopCameraStream();

    if (previewBlob) {
      setCapturedImageUrl(URL.createObjectURL(previewBlob));
      setCapturedBlob(previewBlob);
    } else {
      setCapturedImageUrl(canvasEl.toDataURL('image/png'));
    }

    // Step 1: Run dedicated barcode decoder first
    const decoded = await decodeBarcodeFromCanvas(canvasEl);
    if (decoded?.code) {
      setDetectedBarcode(decoded);
      if (onBarcodeDetected) {
        useDetectedBarcode(decoded);
        return;
      }
    }

    // Step 2: Otherwise run Tesseract.js for ingredient label text extraction
    if (enhanceContrast) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const contrastFactor = 1.45;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrasted = Math.min(255, Math.max(0, (gray - 128) * contrastFactor + 128));
        data[i] = contrasted;
        data[i + 1] = contrasted;
        data[i + 2] = contrasted;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    await runTesseractOnSource(canvasEl.toDataURL('image/png'));
  };

  const handleUploadSnapshot = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    stopCameraStream();
    clearCapturedPreview();

    setCapturedImageUrl(URL.createObjectURL(file));
    setCapturedBlob(file);

    // Step 1: Dedicated barcode decoder first
    const decoded = await decodeBarcodeFromFile(file);
    if (decoded?.code) {
      setDetectedBarcode(decoded);
      if (onBarcodeDetected) {
        useDetectedBarcode(decoded);
        return;
      }
    }

    // Step 2: Dedicated Tesseract OCR for ingredient labels
    await runTesseractOnSource(file);
  };

  const handleFlipCamera = () => {
    setSelectedDeviceId('');
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleApplyResult = () => {
    onExtracted({
      ingredientsText: extractedIngredients.trim(),
      allergenStatement: extractedAllergens.trim(),
      imageBlob: capturedBlob,
      previewUrl: capturedImageUrl,
      confidence: ocrConfidence,
    });
    setCapturedImageUrl(null);
    setCapturedBlob(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65">
      <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xl max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Camera Label &amp; Barcode Capture
              </h2>
              <p className="text-xs text-slate-500">
                Capture an ingredient label for Tesseract OCR or a product barcode for lookup
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
            aria-label="Close camera OCR"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
            {!capturedImageUrl ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {startingCamera && (
                  <div className="absolute inset-0 bg-slate-900/75 flex items-center justify-center gap-2 text-white text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Starting camera stream...</span>
                  </div>
                )}
                {!cameraError && !startingCamera && (
                  <div className="pointer-events-none absolute inset-6 border-2 border-emerald-400/80 rounded-lg flex items-end justify-center pb-3">
                    <span className="px-2.5 py-1 text-xs font-medium text-white bg-slate-900/75 rounded">
                      Align the printed ingredient list or barcode inside this frame
                    </span>
                  </div>
                )}
              </>
            ) : (
              <img
                src={capturedImageUrl}
                alt="Captured food label frame"
                className="w-full h-full object-contain bg-slate-950"
              />
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {cameraError && !capturedImageUrl && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              {cameraError}
            </div>
          )}

          {!capturedImageUrl ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {devices.length > 1 ? (
                  <select
                    aria-label="Select camera"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
                  >
                    {devices.map((d, idx) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                    <span>Switch Camera</span>
                  </button>
                )}

                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enhanceContrast}
                    onChange={(e) => setEnhanceContrast(e.target.checked)}
                    className="accent-emerald-700"
                  />
                  <span>Enhance label contrast</span>
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Load Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadSnapshot}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  disabled={startingCamera || Boolean(cameraError)}
                  onClick={handleCaptureFrame}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture &amp; Read</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {detectedBarcode && onBarcodeDetected && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-emerald-900">
                    <ScanBarcode className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      Detected Barcode:{' '}
                      <strong className="font-mono">{detectedBarcode.code}</strong>
                      {detectedBarcode.format ? ` (${detectedBarcode.format})` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => useDetectedBarcode(detectedBarcode)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Look Up Barcode Product
                  </button>
                </div>
              )}

              {processingOcr && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      <span>{ocrStatus}</span>
                    </span>
                    <span className="font-mono tabular-nums text-emerald-700">
                      {ocrProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-700 transition-all duration-150"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {ocrError && !processingOcr && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  {ocrError}
                </div>
              )}

              {!processingOcr && !detectedBarcode && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                      <ScanText className="w-4 h-4 text-emerald-700" />
                      <span>Extracted Ingredients Preview</span>
                    </span>
                    {ocrConfidence !== null && (
                      <span className="font-mono tabular-nums text-slate-500">
                        OCR Confidence: {ocrConfidence}%
                      </span>
                    )}
                  </div>

                  <textarea
                    rows={4}
                    value={extractedIngredients}
                    onChange={(e) => setExtractedIngredients(e.target.value)}
                    placeholder="Extracted ingredients text will appear here..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />

                  <input
                    type="text"
                    value={extractedAllergens}
                    onChange={(e) => setExtractedAllergens(e.target.value)}
                    placeholder="Detected allergen statement (if present on label)"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={processingOcr}
                  onClick={clearCapturedPreview}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>

                {!detectedBarcode && (
                  <button
                    type="button"
                    disabled={processingOcr || !extractedIngredients.trim()}
                    onClick={handleApplyResult}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Use Extracted Ingredients</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

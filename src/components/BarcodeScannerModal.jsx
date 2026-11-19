import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat } from '@zxing/library';
import { Camera, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createBarcodeReaderHints, decodeBarcodeFromFile } from '../services/barcodeDecoder.js';

export function BarcodeScannerModal({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [decodingUpload, setDecodingUpload] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const reader = new BrowserMultiFormatReader(createBarcodeReaderHints());

    async function startCamera() {
      setStarting(true);
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported in this browser context.');
        }

        const videoEl = videoRef.current;
        if (!videoEl) return;

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
            },
          },
          videoEl,
          (result) => {
            if (cancelled || !result) return;
            const code = result.getText().trim();
            if (code) {
              const formatRaw = BarcodeFormat[result.getBarcodeFormat()];
              const format =
                typeof formatRaw === 'string' ? formatRaw.replace('_', '-') : 'BARCODE';
              controls.stop();
              onDetected(code, format);
              onClose();
            }
          }
        );

        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Could not access device camera. Check permissions or upload a barcode photo below.';
          setCameraError(msg);
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onDetected, onClose]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCameraError(null);
    setDecodingUpload(true);
    try {
      const decoded = await decodeBarcodeFromFile(file);
      if (decoded?.code) {
        controlsRef.current?.stop();
        onDetected(decoded.code, decoded.format);
        onClose();
      } else {
        setCameraError('No barcode detected. Please upload a clearer image.');
      }
    } catch {
      setCameraError('No barcode detected. Please upload a clearer image.');
    } finally {
      setDecodingUpload(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-emerald-700" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Scan Product Barcode
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative aspect-[4/3] w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {starting && (
              <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center text-white text-sm">
                Starting camera...
              </div>
            )}
            {!cameraError && !starting && (
              <div className="pointer-events-none absolute inset-x-10 top-1/2 -translate-y-1/2 h-24 border-2 border-emerald-400/80 rounded-lg" />
            )}
          </div>

          {cameraError && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              {cameraError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500">
              Hold a standard EAN-13, EAN-8, or UPC-A barcode steady inside the frame, or upload a barcode image.
            </p>
            <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{decodingUpload ? 'Decoding...' : 'Decode Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

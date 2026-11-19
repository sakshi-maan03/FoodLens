import {
  AlertCircle,
  Camera,
  FileImage,
  Loader2,
  PenLine,
  ScanBarcode,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { AnalysisResultView } from '../components/AnalysisResultView.jsx';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal.jsx';
import { CameraOcrModal } from '../components/CameraOcrModal.jsx';
import { WorkspaceLayout } from '../components/WorkspaceLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { decodeBarcodeFromFile } from '../services/barcodeDecoder.js';

const SAMPLE_BARCODES = [
  { label: 'Nutella (3017620422003)', code: '3017620422003' },
  { label: 'Oreo Cookies (7622210449283)', code: '7622210449283' },
  { label: 'Coca-Cola (5449000000996)', code: '5449000000996' },
  { label: 'Maggi Noodles (8901058851298)', code: '8901058851298' },
];

export function ScannerPage({ onNavigate }) {
  const { profile } = useAuth();
  const [scanMode, setScanMode] = useState('barcode');

  const [barcodeInput, setBarcodeInput] = useState('');
  const [detectedBarcodeInfo, setDetectedBarcodeInfo] = useState(null);
  const [decodingBarcodeImg, setDecodingBarcodeImg] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [ocrCameraModalOpen, setOcrCameraModalOpen] = useState(false);

  const [labelPreviewUrl, setLabelPreviewUrl] = useState(null);
  const [extractingOcr, setExtractingOcr] = useState(false);
  const [ocrNote, setOcrNote] = useState(null);
  const [ocrEngine, setOcrEngine] = useState(null);
  const [productName, setProductName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [rawIngredientsText, setRawIngredientsText] = useState('');
  const [allergenNote, setAllergenNote] = useState('');
  const fileInputRef = useRef(null);
  const productNameInputRef = useRef(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState(null);
  const [linkedBarcode, setLinkedBarcode] = useState(null);
  const [resultData, setResultData] = useState(null);

  const activeRuleCount =
    (profile?.allergies?.length || 0) +
    (profile?.preferences?.length || 0) +
    (profile?.restrictions?.length || 0) +
    (profile?.customAvoid?.length || 0) +
    (profile?.dietPlanEnabled ? 1 : 0);

  const runBarcodeLookup = async (codeToScan, format = null) => {
    const cleaned = codeToScan.trim();
    if (!cleaned) {
      setError('Please enter or scan a barcode number.');
      return;
    }

    setError(null);
    setNotFoundBarcode(null);
    setAnalyzing(true);
    setResultData(null);
    try {
      const data = await api.products.lookupBarcode(cleaned, true);
      setResultData(data);
    } catch (err) {
      if (err?.status === 404 || err?.data?.notFound) {
        setNotFoundBarcode({
          code: err?.data?.barcode || cleaned,
          format: format || null,
          checkedSources: Array.isArray(err?.data?.checkedSources)
            ? err.data.checkedSources
            : ['Open Food Facts'],
        });
      } else {
        setError(err instanceof Error ? err.message : 'Barcode lookup failed.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBarcodeFormSubmit = (e) => {
    e.preventDefault();
    setDetectedBarcodeInfo(null);
    runBarcodeLookup(barcodeInput);
  };

  const handleDetectedBarcode = (code, format = 'BARCODE') => {
    setBarcodeInput(code);
    setDetectedBarcodeInfo({ code, format });
    runBarcodeLookup(code, format);
  };

  const handleBarcodeImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setNotFoundBarcode(null);
    setResultData(null);
    setDetectedBarcodeInfo(null);
    setDecodingBarcodeImg(true);
    try {
      const decoded = await decodeBarcodeFromFile(file);
      if (!decoded?.code) {
        setError('No barcode detected. Please upload a clearer image.');
        return;
      }
      setBarcodeInput(decoded.code);
      setDetectedBarcodeInfo(decoded);
      await runBarcodeLookup(decoded.code, decoded.format);
    } catch {
      setError('No barcode detected. Please upload a clearer image.');
    } finally {
      setDecodingBarcodeImg(false);
    }
  };

  const handleLabelImageChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setNotFoundBarcode(null);
    setOcrNote(null);
    setOcrEngine(null);
    setDetectedBarcodeInfo(null);

    if (labelPreviewUrl) {
      URL.revokeObjectURL(labelPreviewUrl);
    }
    const preview = URL.createObjectURL(file);
    setLabelPreviewUrl(preview);

    setExtractingOcr(true);
    try {
      // Dedicated barcode decoder pass first (EAN-13, EAN-8, UPC-A, etc.)
      const decoded = await decodeBarcodeFromFile(file);
      if (decoded?.code) {
        setBarcodeInput(decoded.code);
        setDetectedBarcodeInfo(decoded);
        setOcrEngine(`Barcode Decoder (${decoded.format})`);
        setOcrNote(`Detected barcode ${decoded.code} from uploaded image.`);
        setExtractingOcr(false);
        await runBarcodeLookup(decoded.code, decoded.format);
        return;
      }

      // Dedicated Tesseract OCR pass strictly for ingredient labels
      const res = await api.ocr.extractImage(file);
      const extractedText = (res.ingredientsText || res.rawText || '').trim();

      if (!extractedText) {
        setError('No readable ingredient text or barcode detected. Please upload a clearer image.');
        return;
      }

      setRawIngredientsText(extractedText);
      if (res.allergenStatement) setAllergenNote(res.allergenStatement);
      if (res.productNameGuess && !productName) setProductName(res.productNameGuess);
      if (res.brandGuess && !brandName) setBrandName(res.brandGuess);
      setOcrEngine('Tesseract OCR');
      if (res.note) setOcrNote(res.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process the uploaded image.');
    } finally {
      setExtractingOcr(false);
    }
  };

  const handleCameraOcrExtracted = ({
    ingredientsText,
    allergenStatement,
    previewUrl,
    confidence,
  }) => {
    setError(null);
    setDetectedBarcodeInfo(null);
    if (labelPreviewUrl) {
      URL.revokeObjectURL(labelPreviewUrl);
    }
    if (previewUrl) {
      setLabelPreviewUrl(previewUrl);
    }
    setRawIngredientsText(ingredientsText);
    if (allergenStatement) {
      setAllergenNote(allergenStatement);
    }
    setOcrEngine('Tesseract.js Browser Camera OCR');
    setOcrNote(
      confidence !== null
        ? `Captured from camera and recognized in-browser via Tesseract.js (${confidence}% confidence). Review spellings before running compatibility check.`
        : 'Captured from camera and recognized in-browser via Tesseract.js. Review spellings before running compatibility check.'
    );
  };

  const handleEnterProductManually = () => {
    const code = notFoundBarcode?.code || detectedBarcodeInfo?.code || barcodeInput.trim();
    if (code) setLinkedBarcode(code);
    setNotFoundBarcode(null);
    setError(null);
    setResultData(null);
    setScanMode('ocr');
    setTimeout(() => productNameInputRef.current?.focus(), 60);
  };

  const handleUploadLabelForBarcode = () => {
    const code = notFoundBarcode?.code || detectedBarcodeInfo?.code || barcodeInput.trim();
    if (code) setLinkedBarcode(code);
    setNotFoundBarcode(null);
    setError(null);
    setResultData(null);
    setScanMode('ocr');
    setTimeout(() => fileInputRef.current?.click(), 80);
  };

  const handleOcrAnalyzeSubmit = async (e) => {
    e.preventDefault();
    const trimmedInput = rawIngredientsText.trim();
    if (!trimmedInput) {
      setError('Please upload an ingredient label photo or paste the ingredient list.');
      return;
    }

    setError(null);
    setNotFoundBarcode(null);
    setDetectedBarcodeInfo(null);
    setAnalyzing(true);
    setResultData(null);

    const combinedText = allergenNote.trim()
      ? `${trimmedInput}. ${allergenNote.trim()}`
      : trimmedInput;

    try {
      const data = await api.products.analyze({
        productName: productName.trim() || 'Scanned Packaged Product',
        brand: brandName.trim(),
        barcode: linkedBarcode || null,
        sourceType: labelPreviewUrl ? 'ocr' : 'manual',
        rawIngredientsText: combinedText,
        saveToHistory: true,
      });
      setResultData(data);
      setLinkedBarcode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compatibility analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdateScanMeta = async (payload) => {
    if (!resultData?.scanId) return;
    await api.history.update(resultData.scanId, payload);
  };

  return (
    <WorkspaceLayout
      currentPath="/app/scan"
      onNavigate={onNavigate}
      title="Product & Ingredient Scanner"
      subtitle="Scan a product barcode or extract ingredients from a label image"
    >
      <div className="space-y-6">
        {activeRuleCount === 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-amber-900">
              Your dietary profile currently has 0 active allergies or preferences. Add your
              dietary rules so FoodLens can flag personalized conflicts accurately.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/app/profile')}
              className="px-4 py-2 text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Configure Dietary Profile
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setScanMode('barcode');
                setError(null);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scanMode === 'barcode'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ScanBarcode className="w-4 h-4" />
              <span>Barcode Scan & Lookup</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanMode('ocr');
                setError(null);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scanMode === 'ocr'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileImage className="w-4 h-4" />
              <span>Ingredient Label OCR</span>
            </button>
          </div>

          {scanMode === 'barcode' ? (
            <div className="space-y-5">
              <form onSubmit={handleBarcodeFormSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Enter EAN / UPC barcode digits (e.g., 3017620422003)"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                </div>

                <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{decodingBarcodeImg ? 'Decoding...' : 'Upload Barcode Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBarcodeImageUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setCameraModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Use Camera</span>
                </button>

                <button
                  type="submit"
                  disabled={analyzing || decodingBarcodeImg}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{analyzing ? 'Analyzing...' : 'Analyze Barcode'}</span>
                </button>
              </form>

              <div className="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-medium text-slate-500">Test live Open Food Facts lookups:</span>
                {SAMPLE_BARCODES.map((sample) => (
                  <button
                    key={sample.code}
                    type="button"
                    onClick={() => {
                      setBarcodeInput(sample.code);
                      setDetectedBarcodeInfo(null);
                      runBarcodeLookup(sample.code);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleOcrAnalyzeSubmit} className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-3">
                  <button
                    type="button"
                    onClick={() => setOcrCameraModalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Label via Live Camera (Tesseract OCR)</span>
                  </button>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl p-6 text-center bg-slate-50 transition-colors cursor-pointer"
                  >
                    {labelPreviewUrl ? (
                      <div className="space-y-3">
                        <img
                          src={labelPreviewUrl}
                          alt="Uploaded ingredient label preview"
                          className="max-h-48 mx-auto rounded-lg object-contain border border-slate-200 bg-white"
                        />
                        <p className="text-xs font-medium text-emerald-700">
                          Click to upload a different ingredient label image
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-4">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm font-medium text-slate-800">
                          Or Upload Ingredient Label Image
                        </p>
                        <p className="text-xs text-slate-500">
                          Supports JPEG, PNG, WebP up to 8MB for server or local OCR.
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLabelImageChange}
                      className="hidden"
                    />
                  </div>

                  {extractingOcr && (
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting ingredient text from label image...</span>
                    </div>
                  )}

                  {ocrEngine && !extractingOcr && (
                    <p className="text-xs text-slate-600">
                      Extraction engine: <span className="font-medium text-slate-900">{ocrEngine}</span>
                    </p>
                  )}

                  {ocrNote && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {ocrNote}
                    </p>
                  )}
                </div>

                <div className="lg:col-span-7 space-y-4">
                  {linkedBarcode && (
                    <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-700">
                      <div className="flex items-center gap-2">
                        <ScanBarcode className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>
                          Adding details for detected barcode:{' '}
                          <strong className="font-mono text-slate-900">{linkedBarcode}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinkedBarcode(null)}
                        className="text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
                      >
                        Unlink
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="ocr-product-name" className="block text-xs font-medium text-slate-700">
                        Product Name
                      </label>
                      <input
                        ref={productNameInputRef}
                        id="ocr-product-name"
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g., Classic Digestive Biscuits"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="ocr-brand-name" className="block text-xs font-medium text-slate-700">
                        Brand (optional)
                      </label>
                      <input
                        id="ocr-brand-name"
                        type="text"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g., Britannia / Quaker"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="ocr-ingredients" className="block text-xs font-medium text-slate-700">
                      Extracted or Typed Ingredients List
                    </label>
                    <textarea
                      id="ocr-ingredients"
                      rows={4}
                      value={rawIngredientsText}
                      onChange={(e) => setRawIngredientsText(e.target.value)}
                      placeholder="Ingredients will appear here after OCR extraction, or paste any ingredient list (e.g., Refined Wheat Flour (Maida), Sugar, Palm Oil, Soy Lecithin (E322), Emulsifier (E471), Sodium Bicarbonate)..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="ocr-allergens" className="block text-xs font-medium text-slate-700">
                      Allergen / Trace Advisory Statement (optional)
                    </label>
                    <input
                      id="ocr-allergens"
                      type="text"
                      value={allergenNote}
                      onChange={(e) => setAllergenNote(e.target.value)}
                      placeholder="e.g., Contains Wheat, Soy. May contain traces of Tree Nuts."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProductName('Instant Masala Noodles (Sample Label)');
                        setBrandName('Sample Pantry');
                        setRawIngredientsText(
                          'Refined Wheat Flour (Maida), Palm Oil, Salt, Sugar, Dehydrated Onion, Garlic Powder, Monosodium Glutamate (E621), Antioxidant (TBHQ / E319), Caramel Color (E150d)'
                        );
                        setAllergenNote('Contains Wheat. May contain traces of Milk and Soy.');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Load Sample Label</span>
                    </button>

                    <button
                      type="submit"
                      disabled={analyzing || extractingOcr}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                    >
                      {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      <span>{analyzing ? 'Analyzing...' : 'Run Compatibility Check'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {detectedBarcodeInfo && !notFoundBarcode && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ScanBarcode className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Detected Barcode:{' '}
                <strong className="font-mono font-semibold">{detectedBarcodeInfo.code}</strong>
                {detectedBarcodeInfo.format ? ` · ${detectedBarcodeInfo.format}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => runBarcodeLookup(detectedBarcodeInfo.code, detectedBarcodeInfo.format)}
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Re-run Lookup
            </button>
          </div>
        )}

        {notFoundBarcode && !analyzing && (
          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-amber-950">
                    Barcode Detected — Product Not Available in Database
                  </p>
                  <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-white text-amber-900 border border-amber-300 rounded">
                    {notFoundBarcode.code}
                    {notFoundBarcode.format ? ` (${notFoundBarcode.format})` : ''}
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Barcode <span className="font-mono font-semibold">{notFoundBarcode.code}</span> was detected successfully,
                  but no matching product record was found in{' '}
                  {notFoundBarcode.checkedSources.join(', ')}. You can enter the product details manually or upload its
                  ingredient label to analyze compatibility.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pl-8">
              <button
                type="button"
                onClick={handleEnterProductManually}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Enter Product Info Manually</span>
              </button>

              <button
                type="button"
                onClick={handleUploadLabelForBarcode}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-950 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Ingredient Label</span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>{error}</span>
            {scanMode === 'barcode' && (
              <button
                type="button"
                onClick={() => {
                  setScanMode('ocr');
                  setError(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-red-900 bg-white border border-red-300 hover:bg-red-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                Switch to Label OCR
              </button>
            )}
          </div>
        )}

        {analyzing && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
            <Loader2 className="w-7 h-7 text-emerald-700 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-800">
              Retrieving product data and comparing ingredients against your dietary profile...
            </p>
          </div>
        )}

        {resultData && !analyzing && (
          <AnalysisResultView
            product={resultData.product}
            analysis={resultData.analysis}
            scanId={resultData.scanId}
            onUpdateMeta={handleUpdateScanMeta}
          />
        )}
      </div>

      <BarcodeScannerModal
        open={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onDetected={handleDetectedBarcode}
      />

      <CameraOcrModal
        open={ocrCameraModalOpen}
        onClose={() => setOcrCameraModalOpen(false)}
        onExtracted={handleCameraOcrExtracted}
        onBarcodeDetected={handleDetectedBarcode}
      />
    </WorkspaceLayout>
  );
}

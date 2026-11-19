import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Package,
  Save,
  XOctagon,
} from 'lucide-react';
import { useState } from 'react';

function getVerdictTheme(verdict) {
  if (verdict === 'Compatible') {
    return {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      badgeText: 'text-emerald-800',
      icon: CheckCircle2,
      iconColor: 'text-emerald-700',
      description: 'No conflict identified based on available product ingredients and your dietary profile.',
    };
  }
  if (verdict === 'Caution') {
    return {
      container: 'bg-amber-50 border-amber-200 text-amber-900',
      badgeText: 'text-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-700',
      description: 'One or more ingredients, additives, or trace advisories require your attention.',
    };
  }
  return {
    container: 'bg-red-50 border-red-200 text-red-900',
    badgeText: 'text-red-800',
    icon: XOctagon,
    iconColor: 'text-red-700',
    description: 'Direct conflict detected with your saved allergies, dietary preferences, or restrictions.',
  };
}

function StatusCell({ status }) {
  if (status === 'Compatible') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Compatible</span>
      </span>
    );
  }
  if (status === 'Caution') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>Caution</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
      <XOctagon className="w-3.5 h-3.5 shrink-0" />
      <span>Not Recommended</span>
    </span>
  );
}

export function AnalysisResultView({
  product,
  analysis,
  scanId,
  initialBookmarked = false,
  initialNotes = '',
  onUpdateMeta,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [notes, setNotes] = useState(initialNotes);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSavedMsg, setMetaSavedMsg] = useState(null);

  const theme = getVerdictTheme(analysis.verdict);
  const VerdictIcon = theme.icon;

  const handleToggleBookmark = async () => {
    if (!onUpdateMeta) return;
    const prev = bookmarked;
    const next = !bookmarked;
    setBookmarked(next);
    setSavingMeta(true);
    try {
      await onUpdateMeta({ isBookmarked: next });
    } catch {
      setBookmarked(prev);
      setMetaSavedMsg('Could not update bookmark');
      setTimeout(() => setMetaSavedMsg(null), 2500);
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!onUpdateMeta) return;
    setSavingMeta(true);
    setMetaSavedMsg(null);
    try {
      await onUpdateMeta({ userNotes: notes });
      setMetaSavedMsg('Note saved');
      setTimeout(() => setMetaSavedMsg(null), 2500);
    } catch {
      setMetaSavedMsg('Could not save note');
      setTimeout(() => setMetaSavedMsg(null), 2500);
    } finally {
      setSavingMeta(false);
    }
  };

  const nutritionItems = [
    { label: 'Energy', value: product.nutrition?.caloriesPer100g, unit: 'kcal' },
    { label: 'Sugars', value: product.nutrition?.sugarPer100g, unit: 'g' },
    { label: 'Carbs', value: product.nutrition?.carbsPer100g, unit: 'g' },
    { label: 'Protein', value: product.nutrition?.proteinPer100g, unit: 'g' },
    { label: 'Fat', value: product.nutrition?.fatPer100g, unit: 'g' },
    { label: 'Sat. Fat', value: product.nutrition?.saturatedFatPer100g, unit: 'g' },
    { label: 'Salt', value: product.nutrition?.saltPer100g, unit: 'g' },
  ].filter((item) => typeof item.value === 'number');

  return (
    <div className="space-y-6">
      <section className={`p-6 rounded-xl border ${theme.container}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <VerdictIcon className={`w-8 h-8 shrink-0 mt-0.5 ${theme.iconColor}`} />
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                Compatibility Verdict
              </p>
              <h2 className={`font-display text-2xl sm:text-3xl font-bold ${theme.badgeText}`}>
                {analysis.verdict}
              </h2>
              <p className="text-sm font-medium leading-relaxed">{analysis.summaryReason}</p>
              <p className="text-xs opacity-80">{theme.description}</p>
            </div>
          </div>

          {scanId && onUpdateMeta && (
            <button
              type="button"
              onClick={handleToggleBookmark}
              disabled={savingMeta}
              className={`self-start md:self-center inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                bookmarked
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
              <span>{bookmarked ? 'Saved' : 'Save Product'}</span>
            </button>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-24 h-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
            {product.imageUrl && !imgFailed ? (
              <img
                src={product.imageUrl}
                alt={product.productName}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-contain p-1.5"
              />
            ) : (
              <Package className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="font-display text-xl font-bold text-slate-900">
              {product.productName}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              {product.brand && <span>Brand: {product.brand}</span>}
              {product.barcode && (
                <>
                  {product.brand && <span aria-hidden="true">·</span>}
                  <span className="font-mono tabular-nums">Barcode: {product.barcode}</span>
                </>
              )}
              {product.quantity && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{product.quantity}</span>
                </>
              )}
              {product.nutriscoreGrade && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">Nutri-Score {product.nutriscoreGrade}</span>
                </>
              )}
              {product.novaGroup && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">NOVA {product.novaGroup}</span>
                </>
              )}
            </div>

            <div className="pt-2">
              <p className="text-xs font-medium text-slate-500 mb-1">Original Ingredient List</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {product.ingredientsText || 'No ingredient list provided.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {analysis.conflicts.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Detected Conflicts & Attention Items
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {analysis.conflicts.length} {analysis.conflicts.length === 1 ? 'finding' : 'findings'}
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {analysis.conflicts.map((conflict, idx) => (
              <div
                key={`${conflict.matchedIngredient}-${conflict.userRequirement}-${idx}`}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{conflict.ruleCategory}</span>
                    <span aria-hidden="true">·</span>
                    <span>Rule: {conflict.userRequirement}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{conflict.explanation}</p>
                </div>
                <StatusCell status={conflict.severity} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Simplified Ingredient Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Technical names and E-numbers translated into plain explanations
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            {analysis.ingredientsBreakdown.length} ingredients parsed
          </span>
        </div>

        {analysis.ingredientsBreakdown.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No individual ingredients could be separated from the product text.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">Label Term</th>
                  <th className="py-3 px-4">Plain Meaning & Category</th>
                  <th className="py-3 px-4">Analysis</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {analysis.ingredientsBreakdown.map((item, idx) => (
                  <tr key={`${item.originalName}-${idx}`} className="hover:bg-slate-50/70 align-top">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{item.originalName}</div>
                      {item.eNumber && (
                        <div className="text-xs font-mono text-slate-500 mt-0.5">{item.eNumber}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-md">
                      <div className="text-xs font-medium text-slate-800 mb-0.5">
                        {item.simplifiedName} · {item.category}
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600">
                        {item.plainExplanation}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs leading-relaxed">
                      {item.reason}
                    </td>
                    <td className="py-3 px-4">
                      <StatusCell status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {nutritionItems.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-display text-base font-semibold text-slate-900 mb-4">
            Nutrition Summary (per 100g / 100ml)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {nutritionItems.map((n) => (
              <div key={n.label} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500">{n.label}</p>
                <p className="text-base font-semibold font-mono tabular-nums text-slate-900 mt-1">
                  {n.value} {n.unit}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {scanId && onUpdateMeta && (
        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="scan-notes" className="text-sm font-medium text-slate-900">
              Personal Product Notes
            </label>
            {metaSavedMsg && <span className="text-xs font-medium text-emerald-700">{metaSavedMsg}</span>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="scan-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add personal reminder (e.g., Safe snack for travel, verify batch)..."
              className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={savingMeta}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Note</span>
            </button>
          </div>
        </section>
      )}

      <p className="text-xs text-slate-500 leading-relaxed">{analysis.disclaimer}</p>
    </div>
  );
}

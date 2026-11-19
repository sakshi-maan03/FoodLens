import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Eye,
  RefreshCw,
  Search,
  Trash2,
  X,
  XOctagon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AnalysisResultView } from '../components/AnalysisResultView.jsx';
import { WorkspaceLayout } from '../components/WorkspaceLayout.jsx';
import { api } from '../services/api.js';

function VerdictLabel({ verdict }) {
  if (verdict === 'Compatible') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Compatible</span>
      </span>
    );
  }
  if (verdict === 'Caution') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Caution</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
      <XOctagon className="w-3.5 h-3.5" />
      <span>Not Recommended</span>
    </span>
  );
}

export function HistoryPage({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    compatible: 0,
    caution: 0,
    notRecommended: 0,
    bookmarked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [verdictFilter, setVerdictFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [recheckingId, setRecheckingId] = useState(null);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.history.list({
        verdict: verdictFilter,
        search,
        bookmarked: bookmarkedOnly,
      });
      setItems(res.items);
      setStats(res.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan history.');
    } finally {
      setLoading(false);
    }
  }, [verdictFilter, search, bookmarkedOnly]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = async (id) => {
    setError(null);
    try {
      await api.history.remove(id);
      if (selectedItem?.id === id) setSelectedItem(null);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scan record.');
    }
  };

  const handleRecheck = async (id) => {
    setRecheckingId(id);
    setError(null);
    try {
      const res = await api.history.recheck(id);
      setItems((prev) => prev.map((it) => (it.id === id ? res.item : it)));
      if (selectedItem?.id === id) setSelectedItem(res.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-check scan record.');
    } finally {
      setRecheckingId(null);
    }
  };

  return (
    <WorkspaceLayout
      currentPath="/app/history"
      onNavigate={onNavigate}
      title="Scan History"
      subtitle="Review previously analyzed packaged foods, bookmark safe items, or re-check against updated rules"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total Scans', value: stats.total },
            { label: 'Compatible', value: stats.compatible },
            { label: 'Caution', value: stats.caution },
            { label: 'Not Recommended', value: stats.notRecommended },
            { label: 'Saved Products', value: stats.bookmarked },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-2xl font-display font-bold tabular-nums text-slate-900 mt-1">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
              {['All', 'Compatible', 'Caution', 'Not Recommended'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVerdictFilter(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    verdictFilter === v
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setBookmarkedOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                bookmarkedOnly
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Only</span>
            </button>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, brand, barcode..."
              className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading scan history...</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm font-medium text-slate-800">No scan history entries found.</p>
              <p className="text-xs text-slate-500">
                Scan a packaged food barcode or upload an ingredient label to build your history.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('/app/scan')}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                Scan First Product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Verdict</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-slate-900 truncate flex items-center gap-2">
                          {item.isBookmarked && (
                            <Bookmark className="w-3.5 h-3.5 text-emerald-700 fill-current shrink-0" />
                          )}
                          <span className="truncate">{item.productName}</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {item.brand || 'Unspecified Brand'}
                          {item.barcode ? ` · ${item.barcode}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 capitalize">
                        {item.sourceType}
                      </td>
                      <td className="py-3.5 px-4">
                        <VerdictLabel verdict={item.verdict} />
                        <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">
                          {item.summaryReason}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            title="View full analysis"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRecheck(item.id)}
                            disabled={recheckingId === item.id}
                            title="Re-analyze with current dietary profile"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-4 h-4 ${recheckingId === item.id ? 'animate-spin' : ''}`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            title="Delete scan record"
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
          <div className="w-full max-w-4xl bg-slate-50 rounded-xl border border-slate-200 overflow-hidden my-6 shadow-xl">
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Saved Analysis Report
                </h2>
                <p className="text-xs text-slate-500">
                  Scanned on {new Date(selectedItem.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRecheck(selectedItem.id)}
                  disabled={recheckingId === selectedItem.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${recheckingId === selectedItem.id ? 'animate-spin' : ''}`}
                  />
                  <span>Re-check with Current Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
                  aria-label="Close report"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <AnalysisResultView
                product={{
                  barcode: selectedItem.barcode || '',
                  productName: selectedItem.productName,
                  brand: selectedItem.brand,
                  quantity: '',
                  imageUrl: selectedItem.imageUrl,
                  categories: [],
                  ingredientsText: selectedItem.rawIngredientsText,
                  allergensTags: [],
                  tracesTags: [],
                  additivesTags: [],
                  labelsTags: [],
                  nutriscoreGrade: null,
                  novaGroup: null,
                  nutrition: selectedItem.nutrition,
                }}
                analysis={{
                  verdict: selectedItem.verdict,
                  summaryReason: selectedItem.summaryReason,
                  conflicts: selectedItem.conflicts,
                  ingredientsBreakdown: selectedItem.ingredientsBreakdown,
                  parsedCount: selectedItem.ingredientsBreakdown.length,
                  disclaimer:
                    'FoodLens provides informational ingredient analysis based on available product data and your saved profile. It is not a medical diagnosis.',
                }}
                scanId={selectedItem.id}
                initialBookmarked={selectedItem.isBookmarked}
                initialNotes={selectedItem.userNotes}
                onUpdateMeta={async (payload) => {
                  const res = await api.history.update(selectedItem.id, payload);
                  setSelectedItem(res.item);
                  setItems((prev) => prev.map((it) => (it.id === res.item.id ? res.item : it)));
                }}
              />
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}

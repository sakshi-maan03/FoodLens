import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WorkspaceLayout } from '../components/WorkspaceLayout.jsx';
import { api } from '../services/api.js';

export function GlossaryPage({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.glossary
      .list({ search, category })
      .then((res) => {
        if (!active) return;
        setItems(res.items);
        setCategories(res.categories);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load ingredient glossary.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, category]);

  return (
    <WorkspaceLayout
      currentPath="/app/glossary"
      onNavigate={onNavigate}
      title="Ingredient & E-Number Glossary"
      subtitle="Look up chemical additives, emulsifiers, preservatives, and hidden allergen names"
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, E-number (E322, E120), or alias..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="glossary-cat" className="text-xs font-medium text-slate-600">
              Category
            </label>
            <select
              id="glossary-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading ingredient glossary...</div>
          ) : error ? (
            <div className="p-8 text-sm text-red-700">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-sm text-slate-500">
              No ingredient entries matched your filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {items.map((item) => (
                <div key={item.id} className="p-5 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-display text-base font-semibold text-slate-900">
                        {item.canonicalName}
                      </span>
                      {item.eNumber && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-semibold text-emerald-700">
                            {item.eNumber}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{item.category}</span>
                    </div>
                    {item.defaultCaution && (
                      <span className="text-xs font-medium text-amber-700">
                        Default Caution Flag
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">{item.plainExplanation}</p>

                  {item.purpose && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Food Purpose:</span> {item.purpose}
                    </p>
                  )}

                  {item.aliases.length > 0 && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Common Label Aliases:</span>{' '}
                      {item.aliases.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

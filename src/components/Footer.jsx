export function Footer({ onNavigate }) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="space-y-2 max-w-md">
          <p className="font-display text-lg font-bold text-slate-900">FoodLens</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Personalized packaged food ingredient and dietary compatibility analysis system.
            Informational comparison based on product labels and user preferences; not medical advice.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/auth')}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/app/scan')}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Scanner Workspace
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/app/glossary')}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Ingredient Glossary
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>Department of Computer Science and Engineering · DCRUST Murthal</span>
          <span>Academic Session 2026–27</span>
        </div>
      </div>
    </footer>
  );
}

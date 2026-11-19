import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  ScanBarcode,
  Search,
  ShieldAlert,
  UserCheck,
  XOctagon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Footer } from '../components/Footer.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export function LandingPage({ onNavigate }) {
  const { user } = useAuth();
  const [glossarySearch, setGlossarySearch] = useState('');
  const [glossaryItems, setGlossaryItems] = useState([]);
  const [glossaryLoading, setGlossaryLoading] = useState(true);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [ocrImgFailed, setOcrImgFailed] = useState(false);
  const [profileImgFailed, setProfileImgFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setGlossaryLoading(true);
    api.glossary
      .list({ search: glossarySearch })
      .then((res) => {
        if (active) setGlossaryItems(res.items.slice(0, 6));
      })
      .catch(() => {
        if (active) setGlossaryItems([]);
      })
      .finally(() => {
        if (active) setGlossaryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [glossarySearch]);

  const primaryAction = () => {
    onNavigate(user ? '/app/scan' : '/auth');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar onNavigate={onNavigate} currentPath="/" />

      <main className="flex-1">
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-14 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <p className="text-sm font-medium text-emerald-700">
                  Personalized Dietary Compatibility Analysis
                </p>

                <h1
                  className="font-display font-bold tracking-tight text-slate-900 leading-[1.08]"
                  style={{
                    fontSize: 'clamp(2.25rem, 4vw, 3.6rem)',
                    textWrap: 'balance',
                  }}
                >
                  Understand packaged food labels before you buy.
                </h1>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                  FoodLens translates technical additives, E-numbers, and hidden allergens into
                  plain language—then checks every ingredient against your personal allergies,
                  dietary preferences, food restrictions, and optional diet plan.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={primaryAction}
                    className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>{user ? 'Open Scanner Workspace' : 'Start Analyzing Products'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href="#workflow"
                    className="text-sm font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4"
                  >
                    See how the engine works
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative h-full min-h-[280px] sm:min-h-[360px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  {!heroImgFailed ? (
                    <img
                      src="/src/assets/images/hero_foodlens_scan_1794901551433.jpg"
                      alt="Scanning a packaged food barcode on a smartphone at a kitchen counter"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-emerald-50">
                      <ScanBarcode className="w-12 h-12 text-emerald-700 mb-3" />
                      <p className="font-display font-semibold text-slate-800">
                        Barcode & Ingredient Label Analysis
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-1.5">
                <p className="font-mono text-xs font-medium text-emerald-700">01 · Barcode Retrieval</p>
                <p className="font-display text-base font-semibold text-slate-900">
                  Multi-Source Product Lookup
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Scan EAN-13, EAN-8, or UPC-A codes via camera, image upload, or manual entry to
                  pull live product and nutrition data.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="font-mono text-xs font-medium text-emerald-700">02 · Label Extraction</p>
                <p className="font-display text-base font-semibold text-slate-900">
                  OCR Ingredient Fallback
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upload or photograph any printed ingredient label when barcode records are missing.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="font-mono text-xs font-medium text-emerald-700">03 · Plain Language</p>
                <p className="font-display text-base font-semibold text-slate-900">
                  Additive & E-Number Clarity
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Translates technical codes like E322, E120, E471, and casein into clear explanations.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="font-mono text-xs font-medium text-emerald-700">04 · Rule Comparison</p>
                <p className="font-display text-base font-semibold text-slate-900">
                  Three-State Verdicts
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Evaluates every ingredient against your profile to return Compatible, Caution, or Not Recommended.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="max-w-7xl mx-auto px-6 py-16 lg:py-20 space-y-12">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              End-to-end compatibility workflow
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              FoodLens connects external product records and OCR label extraction directly to your
              stored dietary profile—without forcing you to decode fine print every shopping trip.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-6 sm:p-8 space-y-6 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <UserCheck className="w-4 h-4" />
                      <span className="font-mono text-xs font-medium">Step 01</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-slate-900">
                      Configure Personal Profile
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Save your allergies, dietary preferences (Vegetarian, Vegan, Jain, Halal,
                      Keto), ingredient restrictions, and optional numeric diet plan limits.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <ScanBarcode className="w-4 h-4" />
                      <span className="font-mono text-xs font-medium">Step 02</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-slate-900">
                      Scan Barcode or Upload Label
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Point your camera at a barcode for instant API retrieval, or capture the back
                      ingredient panel for automated OCR text extraction.
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-56 sm:h-64 border-t border-slate-200 bg-slate-100">
                {!profileImgFailed ? (
                  <img
                    src="/src/assets/images/dietary_profile_flatlay_1794901551402.jpg"
                    alt="Whole grains, almonds, oats, and herbs representing personalized dietary profiles"
                    referrerPolicy="no-referrer"
                    onError={() => setProfileImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                    Personalized Dietary Profile Configuration
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="h-52 border-b border-slate-200 bg-slate-100">
                {!ocrImgFailed ? (
                  <img
                    src="/src/assets/images/ocr_label_closeup_1794901550956.jpg"
                    alt="Close-up of packaged food ingredient label for OCR text extraction"
                    referrerPolicy="no-referrer"
                    onError={() => setOcrImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                    OCR Label Extraction
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8 space-y-5 flex-1">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <FileText className="w-4 h-4" />
                    <span className="font-mono text-xs font-medium">Step 03</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Simplify & Compare Rules
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Technical ingredients are separated, matched against the additive glossary, and
                    checked for hidden derivatives such as whey, casein, maida, or carmine.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="font-mono text-xs font-medium">Step 04</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Actionable Verdict & Scan History
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Every scanned product is saved to your personal scan history so you can revisit
                    verdicts or re-check items whenever your diet changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="verdicts" className="bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-16 space-y-10">
            <div className="max-w-2xl space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Clear three-tier compatibility verdicts
              </h2>
              <p className="text-base text-slate-600">
                Every result pairs explicit conflict explanations with an unambiguous verdict category.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <h3 className="font-display text-lg font-bold">Compatible</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  No conflict is identified between the parsed product ingredients, nutrition
                  thresholds, and your saved dietary preferences or allergies.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3">
                <div className="flex items-center gap-2.5 text-amber-800">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3 className="font-display text-lg font-bold">Caution</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Some ingredient requires closer attention—such as cross-contamination trace
                  advisories, ambiguous origin additives like E471, or moderate sugar/salt levels.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-red-200 bg-red-50/60 space-y-3">
                <div className="flex items-center gap-2.5 text-red-800">
                  <XOctagon className="w-5 h-5 shrink-0" />
                  <h3 className="font-display text-lg font-bold">Not Recommended</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  A direct conflict with your configured allergy, dietary preference, restricted
                  additive, or diet plan limit was detected.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="glossary-preview" className="max-w-7xl mx-auto px-6 py-16 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Decode technical ingredient names
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Search our live ingredient and E-number glossary to see how FoodLens translates
                chemical labels into everyday language.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                placeholder="Search E322, E120, Maltodextrin..."
                aria-label="Search ingredient glossary"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {glossaryLoading ? (
              <div className="p-8 text-sm text-slate-500">Loading glossary entries...</div>
            ) : glossaryItems.length === 0 ? (
              <div className="p-8 text-sm text-slate-500">
                No matching glossary entries found for "{glossarySearch}".
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {glossaryItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-sm text-slate-900">
                          {item.canonicalName}
                        </span>
                        {item.eNumber && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-emerald-700 font-medium">
                              {item.eNumber}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{item.category}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {item.plainExplanation}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 shrink-0 md:text-right">
                      {item.defaultCaution ? 'Requires Attention' : 'Informational Entry'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="architecture" className="bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-16 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  How FoodLens processes every scan
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  External food catalogs are queried on demand while your account, dietary profile,
                  glossary rules, and scan history persist cleanly in the database.
                </p>
              </div>
              <button
                type="button"
                onClick={primaryAction}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{user ? 'Go to Dashboard' : 'Create Free Profile'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
              {[
                {
                  step: '01. Interactive Scanner',
                  detail: 'Responsive web workspace with live camera barcode capture and label upload.',
                },
                {
                  step: '02. Secure REST API',
                  detail: 'Express.js backend with JWT session protection and strict input validation.',
                },
                {
                  step: '03. Product Databases',
                  detail: 'Open Food Facts, USDA FoodData Central, and UPC lookup with GS1 handling.',
                },
                {
                  step: '04. Label OCR & Decoding',
                  detail: 'Dedicated multi-pass barcode decoding paired with Tesseract.js label OCR.',
                },
                {
                  step: '05. Dietary Rule Engine',
                  detail: 'Evaluates ingredients, additives, and nutrition against your saved profile.',
                },
              ].map((node) => (
                <div key={node.step} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="font-display font-semibold text-slate-900 mb-1">{node.step}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{node.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}

import { Check, Loader2, Plus, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WorkspaceLayout } from '../components/WorkspaceLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const ALLERGY_OPTIONS = [
  'Peanuts',
  'Tree Nuts',
  'Dairy / Milk',
  'Eggs',
  'Soy',
  'Wheat / Gluten',
  'Fish',
  'Shellfish',
  'Sesame',
  'Mustard',
  'Sulphites',
];

const PREFERENCE_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Jain Vegetarian',
  'Eggetarian',
  'Pescatarian',
  'Halal',
  'Kosher',
  'Gluten-Free',
  'Dairy-Free',
  'Low-Sugar',
  'Low-Sodium',
  'Keto',
];

const RESTRICTION_OPTIONS = [
  'Avoid Palm Oil',
  'Avoid Artificial Sweeteners',
  'Avoid Artificial Colors',
  'Avoid MSG / Flavor Enhancers',
  'Avoid Preservatives',
  'Avoid Trans Fats / Hydrogenated Oils',
  'Avoid High-Fructose Corn Syrup',
  'Avoid Caffeine',
];

export function ProfilePage({ onNavigate }) {
  const { user, profile, setProfile, setUser } = useAuth();

  const [form, setForm] = useState({
    allergies: [],
    preferences: [],
    restrictions: [],
    customAvoid: [],
    dietPlanEnabled: false,
    dietPlanName: '',
    dietPlanNotes: '',
    maxSugarPer100g: null,
    maxSodiumPer100g: null,
    maxCaloriesPer100g: null,
  });

  const [customAllergyInput, setCustomAllergyInput] = useState('');
  const [customAvoidInput, setCustomAvoidInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const [accountName, setAccountName] = useState(user?.name || '');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({
        allergies: profile.allergies || [],
        preferences: profile.preferences || [],
        restrictions: profile.restrictions || [],
        customAvoid: profile.customAvoid || [],
        dietPlanEnabled: Boolean(profile.dietPlanEnabled),
        dietPlanName: profile.dietPlanName || '',
        dietPlanNotes: profile.dietPlanNotes || '',
        maxSugarPer100g: profile.maxSugarPer100g ?? null,
        maxSodiumPer100g: profile.maxSodiumPer100g ?? null,
        maxCaloriesPer100g: profile.maxCaloriesPer100g ?? null,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user?.name) setAccountName(user.name);
  }, [user]);

  const toggleListItem = (field, value) => {
    setForm((prev) => {
      const exists = prev[field].includes(value);
      return {
        ...prev,
        [field]: exists ? prev[field].filter((item) => item !== value) : [...prev[field], value],
      };
    });
  };

  const addCustomAllergy = () => {
    const val = customAllergyInput.trim();
    if (!val) return;
    if (!form.allergies.some((a) => a.toLowerCase() === val.toLowerCase())) {
      setForm((prev) => ({ ...prev, allergies: [...prev.allergies, val] }));
    }
    setCustomAllergyInput('');
  };

  const addCustomAvoid = () => {
    const val = customAvoidInput.trim();
    if (!val) return;
    if (!form.customAvoid.some((a) => a.toLowerCase() === val.toLowerCase())) {
      setForm((prev) => ({ ...prev, customAvoid: [...prev.customAvoid, val] }));
    }
    setCustomAvoidInput('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const res = await api.profile.update(form);
      setProfile(res.profile);
      setSaveMessage(res.message);
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save dietary profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    if (accountName.trim().length < 2) return;
    setAccountSaving(true);
    setAccountMessage(null);
    try {
      const res = await api.auth.updateMe({ name: accountName.trim() });
      setUser(res.user);
      setAccountMessage('Account name updated.');
      setTimeout(() => setAccountMessage(null), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update account name.');
    } finally {
      setAccountSaving(false);
    }
  };

  return (
    <WorkspaceLayout
      currentPath="/app/profile"
      onNavigate={onNavigate}
      title="Personal Dietary Profile"
      subtitle="Configure allergies, dietary preferences, ingredient restrictions, and optional diet plan"
    >
      <div className="space-y-8">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {saveError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
              {saveError}
            </div>
          )}
          {saveMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between gap-4">
              <span>{saveMessage}</span>
              <button
                type="button"
                onClick={() => onNavigate('/app/scan')}
                className="text-xs font-semibold underline cursor-pointer"
              >
                Scan a product now
              </button>
            </div>
          )}

          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                01. Food Allergies
              </h2>
              <p className="text-sm text-slate-600">
                Any matching ingredient or hidden derivative (e.g., whey for dairy, maida for
                wheat) marks a product as Not Recommended.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {ALLERGY_OPTIONS.map((item) => {
                const selected = form.allergies.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleListItem('allergies', item)}
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                      selected
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{item}</span>
                    {selected && <Check className="w-4 h-4 text-red-700 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2.5 max-w-md">
                <input
                  type="text"
                  value={customAllergyInput}
                  onChange={(e) => setCustomAllergyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomAllergy();
                    }
                  }}
                  placeholder="Add custom allergen (e.g., Buckwheat, Lupin)"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={addCustomAllergy}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Allergen</span>
                </button>
              </div>

              {form.allergies.filter((a) => !ALLERGY_OPTIONS.includes(a)).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.allergies
                    .filter((a) => !ALLERGY_OPTIONS.includes(a))
                    .map((custom) => (
                      <button
                        key={custom}
                        type="button"
                        onClick={() => toggleListItem('allergies', custom)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-red-50 text-red-900 border border-red-200 rounded-md cursor-pointer"
                      >
                        <span>{custom}</span>
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                02. Dietary Preferences
              </h2>
              <p className="text-sm text-slate-600">
                Select ethical, religious, or lifestyle diets. Ambiguous additives such as E471
                trigger a Caution reminder when Vegetarian, Vegan, or Halal is active.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {PREFERENCE_OPTIONS.map((item) => {
                const selected = form.preferences.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleListItem('preferences', item)}
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                      selected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{item}</span>
                    {selected && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                03. Food & Additive Restrictions
              </h2>
              <p className="text-sm text-slate-600">
                Block specific commercial oils, synthetic colors, preservatives, sweeteners, or
                add your own restricted ingredients.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {RESTRICTION_OPTIONS.map((item) => {
                const selected = form.restrictions.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleListItem('restrictions', item)}
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                      selected
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{item}</span>
                    {selected && <Check className="w-4 h-4 text-amber-700 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 space-y-2.5">
              <label className="block text-xs font-medium text-slate-700">
                Custom Restricted Ingredients (flagged whenever present)
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5 max-w-md">
                <input
                  type="text"
                  value={customAvoidInput}
                  onChange={(e) => setCustomAvoidInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomAvoid();
                    }
                  }}
                  placeholder="e.g., Maltodextrin, Carrageenan, Garlic"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={addCustomAvoid}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Keyword</span>
                </button>
              </div>

              {form.customAvoid.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.customAvoid.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          customAvoid: prev.customAvoid.filter((c) => c !== kw),
                        }))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-slate-100 text-slate-800 border border-slate-300 rounded-md cursor-pointer"
                    >
                      <span>{kw}</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  04. Personal Diet Plan (Optional)
                </h2>
                <p className="text-sm text-slate-600">
                  Optionally set nutritional ceilings per 100g so FoodLens evaluates sugar, sodium,
                  and calorie density against your plan.
                </p>
              </div>

              <label className="inline-flex items-center gap-2.5 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={form.dietPlanEnabled}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dietPlanEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-800">Enable Diet Plan Rules</span>
              </label>
            </div>

            {form.dietPlanEnabled && (
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="dp-name" className="block text-xs font-medium text-slate-700">
                      Diet Plan Name
                    </label>
                    <input
                      id="dp-name"
                      type="text"
                      value={form.dietPlanName}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, dietPlanName: e.target.value }))
                      }
                      placeholder="e.g., Clean Deficit / Heart Health"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="dp-sugar" className="block text-xs font-medium text-slate-700">
                      Max Sugar (g / 100g)
                    </label>
                    <input
                      id="dp-sugar"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.maxSugarPer100g ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          maxSugarPer100g: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      placeholder="e.g., 10"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="dp-sodium" className="block text-xs font-medium text-slate-700">
                      Max Sodium (mg / 100g)
                    </label>
                    <input
                      id="dp-sodium"
                      type="number"
                      min="0"
                      max="10000"
                      step="10"
                      value={form.maxSodiumPer100g ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          maxSodiumPer100g: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      placeholder="e.g., 400"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="dp-cal" className="block text-xs font-medium text-slate-700">
                      Max Energy (kcal / 100g)
                    </label>
                    <input
                      id="dp-cal"
                      type="number"
                      min="0"
                      max="1000"
                      step="5"
                      value={form.maxCaloriesPer100g ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          maxCaloriesPer100g: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      placeholder="e.g., 350"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="dp-notes" className="block text-xs font-medium text-slate-700">
                    Diet Plan Notes
                  </label>
                  <textarea
                    id="dp-notes"
                    rows={2}
                    value={form.dietPlanNotes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, dietPlanNotes: e.target.value }))
                    }
                    placeholder="Optional notes on daily goals or nutritionist guidelines..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </section>

          <div className="flex items-center justify-end gap-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving Profile...' : 'Save Dietary Profile'}</span>
            </button>
          </div>
        </form>

        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Account Details
              </h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            {accountMessage && (
              <span className="text-xs font-medium text-emerald-700">{accountMessage}</span>
            )}
          </div>
          <form onSubmit={handleUpdateAccount} className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              minLength={2}
              required
              className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={accountSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              {accountSaving ? 'Saving...' : 'Update Name'}
            </button>
          </form>
        </section>
      </div>
    </WorkspaceLayout>
  );
}

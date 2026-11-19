import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { WorkspaceLayout } from '../components/WorkspaceLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export function AdminPage({ onNavigate }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('glossary');
  const [stats, setStats] = useState(null);
  const [glossary, setGlossary] = useState([]);
  const [users, setUsers] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [error, setError] = useState(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [canonicalName, setCanonicalName] = useState('');
  const [eNumber, setENumber] = useState('');
  const [category, setCategory] = useState('Additive');
  const [aliasesText, setAliasesText] = useState('');
  const [plainExplanation, setPlainExplanation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [flagsText, setFlagsText] = useState('');
  const [defaultCaution, setDefaultCaution] = useState(false);
  const [cautionReason, setCautionReason] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [s, g, u, sc] = await Promise.all([
        api.admin.stats(),
        api.glossary.list(),
        api.admin.users(),
        api.admin.recentScans(),
      ]);
      setStats(s);
      setGlossary(g.items);
      setUsers(u.users);
      setRecentScans(sc.scans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin console.');
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAll();
    }
  }, [user, loadAll]);

  if (user?.role !== 'admin') {
    return (
      <WorkspaceLayout
        currentPath="/app/admin"
        onNavigate={onNavigate}
        title="Admin Console"
        subtitle="Restricted to administrators"
      >
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <p className="text-sm font-medium text-red-700">
            Administrator permissions are required to access this console.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/app/scan')}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg cursor-pointer"
          >
            Return to Scanner
          </button>
        </div>
      </WorkspaceLayout>
    );
  }

  const openCreateModal = () => {
    setEditingId(null);
    setCanonicalName('');
    setENumber('');
    setCategory('Additive');
    setAliasesText('');
    setPlainExplanation('');
    setPurpose('');
    setFlagsText('');
    setDefaultCaution(false);
    setCautionReason('');
    setEditorOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setCanonicalName(item.canonicalName);
    setENumber(item.eNumber || '');
    setCategory(item.category);
    setAliasesText(item.aliases.join(', '));
    setPlainExplanation(item.plainExplanation);
    setPurpose(item.purpose);
    setFlagsText(item.dietaryFlags.join(', '));
    setDefaultCaution(item.defaultCaution);
    setCautionReason(item.cautionReason || '');
    setEditorOpen(true);
  };

  const handleSaveGlossary = async (e) => {
    e.preventDefault();
    setError(null);
    const payload = {
      canonicalName: canonicalName.trim(),
      eNumber: eNumber.trim() || null,
      category: category.trim(),
      aliases: aliasesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      plainExplanation: plainExplanation.trim(),
      purpose: purpose.trim(),
      dietaryFlags: flagsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      defaultCaution,
      cautionReason: cautionReason.trim() || null,
    };

    try {
      if (editingId) {
        await api.glossary.update(editingId, payload);
      } else {
        await api.glossary.create(payload);
      }
      setEditorOpen(false);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save glossary entry.');
    }
  };

  const handleDeleteGlossary = async (id) => {
    setError(null);
    try {
      await api.glossary.remove(id);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete glossary entry.');
    }
  };

  const handleToggleRole = async (targetUserId, currentRole) => {
    setError(null);
    try {
      const nextRole = currentRole === 'admin' ? 'user' : 'admin';
      await api.admin.updateUserRole(targetUserId, nextRole);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update role.');
    }
  };

  return (
    <WorkspaceLayout
      currentPath="/app/admin"
      onNavigate={onNavigate}
      title="Admin Console"
      subtitle="Manage ingredient glossary rules, user roles, and system scan activity"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Registered Users</p>
              <p className="text-2xl font-display font-bold tabular-nums text-slate-900 mt-1">
                {stats.totalUsers}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Total Scans</p>
              <p className="text-2xl font-display font-bold tabular-nums text-slate-900 mt-1">
                {stats.totalScans}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Glossary Rules</p>
              <p className="text-2xl font-display font-bold tabular-nums text-slate-900 mt-1">
                {stats.totalGlossary}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Compatible / Caution</p>
              <p className="text-2xl font-display font-bold tabular-nums text-emerald-700 mt-1">
                {stats.verdicts.Compatible} / {stats.verdicts.Caution}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Not Recommended</p>
              <p className="text-2xl font-display font-bold tabular-nums text-red-700 mt-1">
                {stats.verdicts['Not Recommended']}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg">
            {[
              { id: 'glossary', label: 'Glossary & Rules' },
              { id: 'users', label: 'Users' },
              { id: 'scans', label: 'Recent Scans' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tab === t.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'glossary' && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Ingredient Rule</span>
            </button>
          )}
        </div>

        {tab === 'glossary' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                    <th className="py-3 px-4">Canonical Name</th>
                    <th className="py-3 px-4">E-Number</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Rule Flags</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {glossary.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-medium text-slate-900">{item.canonicalName}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {item.eNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{item.category}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {item.dietaryFlags.join(', ') || 'None'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGlossary(item.id)}
                          className="p-1.5 text-slate-500 hover:text-red-700 rounded-md cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Scans</th>
                    <th className="py-3 px-4">Profile Rules</th>
                    <th className="py-3 px-4 text-right">Manage Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium capitalize text-slate-700">
                        {u.role}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-700">
                        {u.scanCount}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 tabular-nums">
                        {u.allergiesCount} allergies · {u.preferencesCount} preferences
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={u.id === user.id}
                          onClick={() => handleToggleRole(u.id, u.role)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-md cursor-pointer"
                        >
                          {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'scans' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Verdict</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {recentScans.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{s.productName}</div>
                        <div className="text-xs text-slate-500">{s.summaryReason}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div>{s.userName}</div>
                        <div className="text-slate-400">{s.userEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-xs capitalize text-slate-600">{s.sourceType}</td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-800">{s.verdict}</td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-500">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="font-display text-base font-semibold text-slate-900">
                {editingId ? 'Edit Ingredient Rule' : 'Add Ingredient Rule'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGlossary} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Canonical Name</label>
                  <input
                    type="text"
                    required
                    value={canonicalName}
                    onChange={(e) => setCanonicalName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">E-Number</label>
                  <input
                    type="text"
                    value={eNumber}
                    onChange={(e) => setENumber(e.target.value)}
                    placeholder="e.g., E322"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Category</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Dietary Flags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={flagsText}
                    onChange={(e) => setFlagsText(e.target.value)}
                    placeholder="soy, additive, non-veg"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Aliases (comma-separated)
                </label>
                <input
                  type="text"
                  value={aliasesText}
                  onChange={(e) => setAliasesText(e.target.value)}
                  placeholder="e.g., ins 322, soya lecithin"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Plain Explanation</label>
                <textarea
                  rows={2}
                  required
                  value={plainExplanation}
                  onChange={(e) => setPlainExplanation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Purpose in Food</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={defaultCaution}
                  onChange={(e) => setDefaultCaution(e.target.checked)}
                  className="accent-emerald-700"
                />
                <span>Flag as Default Caution for consumer awareness</span>
              </label>

              {defaultCaution && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Caution Reason</label>
                  <input
                    type="text"
                    value={cautionReason}
                    onChange={(e) => setCautionReason(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}

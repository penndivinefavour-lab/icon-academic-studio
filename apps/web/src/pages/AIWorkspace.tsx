/**
 * ICON Academic Studio — AI Workspace Frontend (Phase 8.1)
 * 
 * Redesigned to match ICON Academic Studio visual language.
 * Uses existing design tokens, Tailwind classes, and brand colors.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';

// ── types ───────────────────────────────────────────────────────────────────
interface Provider {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  hasKey: boolean;
}

interface Operation {
  description: string;
  contextRequired: string[];
}

interface Generation {
  id: string;
  operation: string;
  prompt: string;
  response: string | null;
  status: string;
  reviewStatus: string;
  provider: string | null;
  model: string | null;
  error: string | null;
  errors?: string[];
  safetyFlags: string | null;
  createdAt: string;
  text?: string;
}

interface Project {
  id: string;
  name: string;
  type: string;
}

// ── operations catalog ───────────────────────────────────────────────────────

const OPERATIONS_BY_CATEGORY: Record<string, Array<{ key: string; label: string; icon: string }>> = {
  'Research': [
    { key: 'summarize-source', label: 'Summarize Source', icon: '📄' },
    { key: 'explain-concept', label: 'Explain Concept', icon: '💡' },
    { key: 'extract-claims', label: 'Extract Claims', icon: '🔍' },
    { key: 'compare-sources', label: 'Compare Sources', icon: '⚖️' },
    { key: 'identify-evidence', label: 'Identify Evidence', icon: '📋' },
    { key: 'literature-synthesis', label: 'Literature Synthesis', icon: '📚' },
  ],
  'Academic Writing': [
    { key: 'create-outline', label: 'Create Outline', icon: '📝' },
    { key: 'draft-section', label: 'Draft Section', icon: '✍️' },
    { key: 'expand-section', label: 'Expand Section', icon: '➕' },
    { key: 'rewrite-for-clarity', label: 'Rewrite for Clarity', icon: '✨' },
    { key: 'improve-tone', label: 'Improve Tone', icon: '🎯' },
    { key: 'draft-conclusion', label: 'Draft Conclusion', icon: '🏁' },
  ],
  'Data Analysis': [
    { key: 'explain-dataset', label: 'Explain Dataset', icon: '📊' },
    { key: 'explain-result', label: 'Explain Result', icon: '📈' },
    { key: 'explain-chart', label: 'Explain Chart', icon: '📉' },
    { key: 'draft-findings', label: 'Draft Findings', icon: '🔬' },
  ],
  'GCE Studies': [
    { key: 'explain-question', label: 'Explain Question', icon: '❓' },
    { key: 'explain-marking', label: 'Explain Marking', icon: '✅' },
    { key: 'create-revision-notes', label: 'Revision Notes', icon: '📖' },
  ],
  'Publication': [
    { key: 'draft-chapter', label: 'Draft Chapter', icon: '📑' },
    { key: 'summarize-chapter', label: 'Summarize Chapter', icon: '📋' },
    { key: 'explain-glossary-term', label: 'Explain Term', icon: '🔤' },
  ],
};

// ── component ────────────────────────────────────────────────────────────────

export default function AIWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeProjectId, setActiveProjectId] = useState(projectId || '');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [operations, setOperations] = useState<Record<string, Operation>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [instructions, setInstructions] = useState('');
  const [result, setResult] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Research');

  // Load providers, operations, and projects
  useEffect(() => {
    fetch('/api/v1/ai/providers')
      .then(r => r.json())
      .then(data => setProviders(data.data || []))
      .catch(() => {});

    fetch('/api/v1/ai/operations')
      .then(r => r.json())
      .then(data => setOperations(data.data || {}))
      .catch(() => {});

    fetch('/api/v1/projects')
      .then(r => r.json())
      .then(data => setProjects(data.data || []))
      .catch(() => {});
  }, []);

  // Load generations when project changes
  useEffect(() => {
    if (!activeProjectId) return;
    fetch(`/api/v1/ai/generations?projectId=${activeProjectId}&limit=20`)
      .then(r => r.json())
      .then(data => setGenerations(data.data || []))
      .catch(() => {});
  }, [activeProjectId]);

  const handleGenerate = useCallback(async () => {
    if (!activeProjectId || !selectedOperation) {
      setError('Please select a project and operation.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/v1/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          operation: selectedOperation,
          instructions,
          context: { _type: 'PROJECT', _id: activeProjectId },
        }),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error?.message || 'Generation failed');
        return;
      }

      setResult(data);
      // Refresh list
      fetch(`/api/v1/ai/generations?projectId=${activeProjectId}&limit=20`)
        .then(r => r.json())
        .then(d => setGenerations(d.data || []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [activeProjectId, selectedOperation, instructions]);

  const handleReviewStatus = async (generationId: string, newStatus: string) => {
    await fetch(`/api/v1/ai/generations/${generationId}/review?projectId=${activeProjectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewStatus: newStatus }),
    });
    // Refresh
    fetch(`/api/v1/ai/generations?projectId=${activeProjectId}&limit=20`)
      .then(r => r.json())
      .then(d => setGenerations(d.data || []));
  };

  const selectedOpDef = operations[selectedOperation];
  const hasActiveProvider = providers.some(p => p.isActive && p.hasKey);
  const activeProvider = providers.find(p => p.isActive);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">AI Academic Workspace</h1>
            <p className="text-sm text-surface-500 mt-1">Grounded generation with human review workflow</p>
          </div>
          <div className="flex items-center gap-4">
            {hasActiveProvider ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-sm text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {activeProvider?.name} active
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 border border-yellow-200 text-sm text-yellow-700">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                No provider configured
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Project selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-surface-700 mb-2">
            Active Project
          </label>
          <select
            value={activeProjectId}
            onChange={e => setActiveProjectId(e.target.value)}
            className="input w-full max-w-md"
          >
            <option value="">Select a project...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Controls */}
          <div className="space-y-4">
            {/* Operation selection */}
            <div className="card">
              <h2 className="text-lg font-semibold text-surface-900 mb-4">Operation</h2>
              
              {/* Category tabs */}
              <div className="flex flex-wrap gap-1 mb-4 border-b border-surface-200">
                {Object.keys(OPERATIONS_BY_CATEGORY).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      activeCategory === cat
                        ? 'border-b-2 border-primary-600 text-primary-600'
                        : 'text-surface-500 hover:text-surface-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {OPERATIONS_BY_CATEGORY[activeCategory]?.map(op => (
                  <button
                    key={op.key}
                    onClick={() => setSelectedOperation(op.key)}
                    className={`w-full px-4 py-3 text-left rounded-lg border transition-all ${
                      selectedOperation === op.key
                        ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                        : 'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{op.icon}</span>
                      <div>
                        <div className="font-medium">{op.label}</div>
                        <div className="text-xs text-surface-500 mt-0.5">
                          {operations[op.key]?.description || ''}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="card">
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Instructions
                <span className="text-surface-400 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Add specific instructions for the AI operation..."
                className="input min-h-[120px] resize-y text-sm"
              />
              <p className="text-xs text-surface-500 mt-2">
                These instructions will be clearly separated from source data in the prompt.
              </p>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!activeProjectId || !selectedOperation || loading || !hasActiveProvider}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </span>
              ) : 'Generate'}
            </button>

            {!hasActiveProvider && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                ⚠️ Configure an AI provider in Settings → AI Providers to enable generation.
              </p>
            )}
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Current result */}
            <div className="card">
              <h2 className="text-lg font-semibold text-surface-900 mb-4">Result</h2>
              
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 text-surface-500">
                  <svg className="animate-spin h-8 w-8 mb-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm">Generating with {activeProvider?.name || 'provider'}...</p>
                  <p className="text-xs text-surface-400 mt-1">This may take a few seconds</p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="font-medium text-red-800 text-sm mb-1">Error</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-4">
                  {/* Status badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      result.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : result.status === 'FAILED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.status}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      result.reviewStatus === 'VERIFIED'
                        ? 'bg-blue-100 text-blue-800'
                        : result.reviewStatus === 'REJECTED'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {result.reviewStatus.replace('_', ' ')}
                    </span>
                    {result.provider && (
                      <span className="text-xs text-surface-500">
                        {result.provider} · {result.model}
                      </span>
                    )}
                  </div>

                  {/* Generated content */}
                  {result.text ? (
                    <div className="bg-surface-50 rounded-lg p-4 border border-surface-200">
                      <pre className="whitespace-pre-wrap text-sm text-surface-700 font-sans">
                        {result.text}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-surface-500 text-sm italic py-4 text-center">
                      {result.status === 'FAILED' ? 'Generation failed. Check the error above.' : 'No content generated yet.'}
                    </p>
                  )}

                  {/* Safety warnings */}
                  {result.errors && result.errors.length > 0 && (
                    <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                      <p className="font-medium text-yellow-800 text-sm mb-2">Potential Issues Detected:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                        {result.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Warning banner */}
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-sm text-amber-800">
                      ⚠️ <strong>AI-generated content.</strong> Review and verify before use. Do not submit without verification.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleReviewStatus(result.id, 'USER_EDITED')}
                      className="btn-secondary text-sm"
                    >
                      ✎ Edit & Continue Review
                    </button>
                    <button
                      onClick={() => handleReviewStatus(result.id, 'VERIFIED')}
                      className="btn-primary text-sm"
                    >
                      ✓ Verify & Approve
                    </button>
                    <button
                      onClick={() => handleReviewStatus(result.id, 'REJECTED')}
                      className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                    >
                      ✗ Reject
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="px-4 py-2 text-sm text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
                    >
                      ↻ Regenerate
                    </button>
                  </div>
                </div>
              )}

              {!result && !loading && !error && (
                <div className="text-center py-12 text-surface-400">
                  <div className="text-4xl mb-3">🤖</div>
                  <p className="text-base font-medium text-surface-600">Ready to generate</p>
                  <p className="text-sm mt-1">Select an operation and click Generate to begin</p>
                </div>
              )}
            </div>

            {/* History */}
            {generations.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-surface-900 mb-4">Recent Generations</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {generations.map(gen => (
                    <div
                      key={gen.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-50 border border-surface-200"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-medium text-surface-700 truncate">{gen.operation.replace(/-/g, ' ')}</p>
                        <p className="text-xs text-surface-500">
                          {new Date(gen.createdAt).toLocaleString()} · {gen.provider || 'local'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          gen.reviewStatus === 'VERIFIED'
                            ? 'bg-green-100 text-green-800'
                            : gen.reviewStatus === 'REJECTED'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {gen.reviewStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="mt-6 card">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">About AI-Assisted Workflows</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-medium text-surface-700 mb-2 flex items-center gap-2">
                <span>🔗</span> Grounded Generation
              </p>
              <p className="text-surface-600">All prompts include source context. The AI uses only provided evidence, never invents facts.</p>
            </div>
            <div>
              <p className="font-medium text-surface-700 mb-2 flex items-center gap-2">
                <span>👁️</span> Human Review Required
              </p>
              <p className="text-surface-600">Every AI output starts as NEEDS_REVIEW. Verification is an explicit user action.</p>
            </div>
            <div>
              <p className="font-medium text-surface-700 mb-2 flex items-center gap-2">
                <span>📜</span> Provenance Tracked
              </p>
              <p className="text-surface-600">Each generation records the prompt, provider, model, and any safety flags.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ICON Academic Studio — AI Workspace Frontend (Phase 8)
 *
 * A controlled, provider-agnostic AI-assisted academic production environment.
 * All AI outputs start as NEEDS_REVIEW and require explicit user verification.
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

// ── operations catalog ───────────────────────────────────────────────────────

const OPERATIONS_BY_CATEGORY: Record<string, Array<{ key: string; label: string }>> = {
  'Research': [
    { key: 'summarize-source', label: 'Summarize Source' },
    { key: 'explain-concept', label: 'Explain Concept' },
    { key: 'extract-claims', label: 'Extract Key Claims' },
    { key: 'compare-sources', label: 'Compare Sources' },
    { key: 'identify-evidence', label: 'Identify Evidence' },
    { key: 'literature-synthesis', label: 'Literature Synthesis' },
  ],
  'Academic Writing': [
    { key: 'create-outline', label: 'Create Outline' },
    { key: 'draft-section', label: 'Draft Section' },
    { key: 'expand-section', label: 'Expand Section' },
    { key: 'rewrite-for-clarity', label: 'Rewrite for Clarity' },
    { key: 'improve-tone', label: 'Improve Tone' },
    { key: 'draft-conclusion', label: 'Draft Conclusion' },
  ],
  'Methodology': [
    { key: 'draft-methodology', label: 'Draft Methodology' },
    { key: 'draft-objectives', label: 'Draft Objectives' },
    { key: 'suggest-variables', label: 'Suggest Variables' },
  ],
  'Data Analysis': [
    { key: 'explain-dataset', label: 'Explain Dataset' },
    { key: 'explain-result', label: 'Explain Result' },
    { key: 'draft-findings', label: 'Draft Findings' },
    { key: 'draft-discussion', label: 'Draft Discussion' },
  ],
  'GCE Studies': [
    { key: 'explain-question', label: 'Explain Question' },
    { key: 'explain-marking', label: 'Explain Marking' },
    { key: 'create-revision-notes', label: 'Create Revision Notes' },
  ],
  'Publication': [
    { key: 'draft-chapter', label: 'Draft Chapter' },
    { key: 'summarize-chapter', label: 'Summarize Chapter' },
    { key: 'create-intro', label: 'Create Introduction' },
    { key: 'explain-glossary-term', label: 'Explain Term' },
  ],
};

// ── component ────────────────────────────────────────────────────────────────

export default function AIWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeProjectId, setActiveProjectId] = useState(projectId || '');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [operations, setOperations] = useState<Record<string, Operation>>({});
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [instructions, setInstructions] = useState('');
  const [contextSources, setContextSources] = useState<string[]>([]);
  const [result, setResult] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);

  // Load providers and operations
  useEffect(() => {
    fetch('/api/v1/ai/providers')
      .then(r => r.json())
      .then(data => setProviders(data.data || []))
      .catch(() => {});

    fetch('/api/v1/ai/operations')
      .then(r => r.json())
      .then(data => setOperations(data.data || {}))
      .catch(() => {});
  }, []);

  // Load generations
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">AI Academic Workspace</h1>
          <p className="text-surface-500 text-sm mt-1">
            AI-assisted academic production with grounded generation and human review
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasActiveProvider ? (
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {activeProvider?.name} configured
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              No provider configured
            </span>
          )}
        </div>
      </div>

      {/* Project selector */}
      <div className="card">
        <label className="block text-sm font-medium text-surface-700 mb-2">Project</label>
        <select
          value={activeProjectId}
          onChange={e => setActiveProjectId(e.target.value)}
          className="input w-full"
        >
          <option value="">Select a project...</option>
          {/* Would load from /api/v1/projects in real impl */}
        </select>
      </div>

      {/* Main workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Operation selection */}
          <div className="card">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Operation</h2>
            <div className="space-y-3">
              {Object.entries(OPERATIONS_BY_CATEGORY).map(([category, ops]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">{category}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ops.map(op => (
                      <button
                        key={op.key}
                        onClick={() => setSelectedOperation(op.key)}
                        className={`px-3 py-2 text-sm text-left rounded-lg border transition-colors ${
                          selectedOperation === op.key
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-surface-200 text-surface-600 hover:border-surface-300'
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="card">
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Additional Instructions <span className="text-surface-400">(optional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g., Focus on the methodology section, use APA citations..."
              className="input min-h-[100px] resize-y"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!activeProjectId || !selectedOperation || loading || !hasActiveProvider}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>

          {!hasActiveProvider && (
            <p className="text-sm text-yellow-600 text-center">
              Configure an AI provider in Settings to enable generation.
            </p>
          )}
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Current result */}
          <div className="card">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Result</h2>
            {loading && (
              <div className="flex items-center gap-3 py-8 text-center text-surface-500">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Generating with {activeProvider?.name || 'provider'}...</span>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {result && !loading && (
              <div className="space-y-4">
                {/* Status badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    result.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-700'
                      : result.status === 'FAILED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {result.status}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    result.reviewStatus === 'VERIFIED'
                      ? 'bg-blue-100 text-blue-700'
                      : result.reviewStatus === 'REJECTED'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {result.reviewStatus.replace('_', ' ')}
                  </span>
                  {result.provider && (
                    <span className="text-xs text-surface-500">{result.provider} · {result.model}</span>
                  )}
                </div>

                {/* Generated content */}
                {result.text ? (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap bg-surface-50 p-4 rounded-lg text-sm text-surface-700">
                      {result.text}
                    </pre>
                  </div>
                ) : (
                  <p className="text-surface-500 text-sm italic">No content generated.</p>
                )}

                {/* Safety warnings */}
                {result.errors && result.errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
                    <p className="font-medium mb-1">Potential Issues Detected:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {result.errors?.map((err: string, i: number) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}

                {/* Warning banner */}
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                  ⚠️ AI-generated content. Review and verify before use. Do not submit without verification.
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleReviewStatus(result.id, 'VERIFIED')}
                    className="btn-secondary text-sm"
                  >
                    ✓ Verify
                  </button>
                  <button
                    onClick={() => handleReviewStatus(result.id, 'USER_EDITED')}
                    className="btn-secondary text-sm"
                  >
                    ✎ Edit & Approve
                  </button>
                  <button
                    onClick={() => handleReviewStatus(result.id, 'REJECTED')}
                    className="btn-secondary text-sm text-red-600"
                  >
                    ✗ Reject
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="btn-secondary text-sm"
                  >
                    ↻ Regenerate
                  </button>
                </div>
              </div>
            )}

            {!result && !loading && !error && (
              <p className="text-surface-400 text-sm text-center py-8">
                Select an operation and click Generate to begin.
              </p>
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
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-50 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-700 truncate">{gen.operation}</p>
                      <p className="text-xs text-surface-500">
                        {new Date(gen.createdAt).toLocaleString()} · {gen.provider || 'local'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        gen.reviewStatus === 'VERIFIED'
                          ? 'bg-green-100 text-green-700'
                          : gen.reviewStatus === 'REJECTED'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-orange-100 text-orange-700'
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
      <div className="card">
        <h2 className="text-lg font-semibold text-surface-900 mb-3">About AI-Assisted Workflows</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-surface-600">
          <div>
            <p className="font-medium text-surface-700 mb-1">Grounded Generation</p>
            <p>All prompts include source context. The AI uses only provided evidence, never invents facts.</p>
          </div>
          <div>
            <p className="font-medium text-surface-700 mb-1">Human Review Required</p>
            <p>Every AI output starts as NEEDS_REVIEW. Verification is an explicit user action.</p>
          </div>
          <div>
            <p className="font-medium text-surface-700 mb-1">Provenance Tracked</p>
            <p>Each generation records the prompt, provider, model, and any safety flags.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

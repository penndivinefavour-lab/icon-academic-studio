/**
 * ICON Academic Studio — AI Workspace Frontend (Phase 8.1.1)
 * 
 * Uses ICON Academic Studio brand colors:
 * - Deep Navy #1A2744 for structural elements
 * - Rich Purple #6B21A8 for primary actions
 * - Golden Yellow #F5C518 for highlights/accents
 * - Charcoal #1E1E2E for dark surfaces
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
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FC' }}>
      {/* Header — Deep Navy */}
      <div className="px-6 py-4 border-b" style={{ backgroundColor: '#1A2744', borderColor: '#2D3F5C' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              AI Academic Workspace
            </h1>
            <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
              Grounded generation with human review workflow
            </p>
          </div>
          <div className="flex items-center gap-4">
            {hasActiveProvider ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#064E3B', color: '#6EE7B7', border: '1px solid #059669' }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }}></span>
                {activeProvider?.name} active
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#78350F', color: '#FCD34D', border: '1px solid #D97706' }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F59E0B' }}></span>
                No provider configured
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Project selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: '#1A2744' }}>
            Active Project
          </label>
          <select
            value={activeProjectId}
            onChange={e => setActiveProjectId(e.target.value)}
            className="input w-full max-w-md"
            style={{ borderColor: '#CBD5E1', borderRadius: '8px' }}
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
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A2744' }}>Operation</h2>
              
              {/* Category tabs — Purple accent */}
              <div className="flex flex-wrap gap-1 mb-4 border-b" style={{ borderColor: '#E2E8F0' }}>
                {Object.keys(OPERATIONS_BY_CATEGORY).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                      activeCategory === cat
                        ? 'border-brand-purple text-brand-purple'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                    style={activeCategory === cat ? { borderBottomColor: '#6B21A8', color: '#6B21A8' } : {}}
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
                    className="w-full px-4 py-3 text-left rounded-lg border transition-all"
                    style={selectedOperation === op.key 
                      ? { borderColor: '#6B21A8', backgroundColor: '#F3E8FF', color: '#6B21A8' }
                      : { borderColor: '#E2E8F0', color: '#475569', backgroundColor: 'white' }
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{op.icon}</span>
                      <div>
                        <div className="font-medium">{op.label}</div>
                        <div className="text-xs" style={{ color: '#94A3B8' }}>
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
              <label className="block text-sm font-medium mb-2" style={{ color: '#1A2744' }}>
                Instructions
                <span className="font-normal ml-1" style={{ color: '#94A3B8' }}>(optional)</span>
              </label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Add specific instructions for the AI operation..."
                className="input min-h-[120px] resize-y"
              />
              <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>
                These instructions will be clearly separated from source data in the prompt.
              </p>
            </div>

            {/* Generate button — Purple primary */}
            <button
              onClick={handleGenerate}
              disabled={!activeProjectId || !selectedOperation || loading || !hasActiveProvider}
              className="btn-primary w-full"
              style={{
                backgroundColor: '#6B21A8',
                color: 'white',
              }}
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
              <p className="text-xs px-3 py-2 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B' }}>
                ⚠️ Configure an AI provider in Settings → AI Providers to enable generation.
              </p>
            )}
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Current result */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A2744' }}>Result</h2>
              
              {loading && (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: '#94A3B8' }}>
                  <svg className="animate-spin h-8 w-8 mb-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm">Generating with {activeProvider?.name || 'provider'}...</p>
                  <p className="text-xs mt-1">This may take a few seconds</p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: '1px' }}>
                  <p className="font-medium text-sm mb-1" style={{ color: '#991B1B' }}>Error</p>
                  <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-4">
                  {/* Status badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: result.status === 'COMPLETED' ? '#D1FAE5' : result.status === 'FAILED' ? '#FEE2E2' : '#FEF3C7',
                               color: result.status === 'COMPLETED' ? '#065F46' : result.status === 'FAILED' ? '#991B1B' : '#92400E' }}>
                      {result.status}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: result.reviewStatus === 'VERIFIED' ? '#DBEAFE' : result.reviewStatus === 'REJECTED' ? '#F1F5F9' : '#FED7AA',
                               color: result.reviewStatus === 'VERIFIED' ? '#1E40AF' : result.reviewStatus === 'REJECTED' ? '#475569' : '#C2410C' }}>
                      {result.reviewStatus.replace('_', ' ')}
                    </span>
                    {result.provider && (
                      <span className="text-xs" style={{ color: '#94A3B8' }}>
                        {result.provider} · {result.model}
                      </span>
                    )}
                  </div>

                  {/* Generated content */}
                  {result.text ? (
                    <div className="rounded-lg p-4 border" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
                      <pre className="whitespace-pre-wrap text-sm" style={{ color: '#334155', fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {result.text}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm italic py-4 text-center" style={{ color: '#94A3B8' }}>
                      {result.status === 'FAILED' ? 'Generation failed. Check the error above.' : 'No content generated yet.'}
                    </p>
                  )}

                  {/* Safety warnings */}
                  {result.errors && result.errors.length > 0 && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: '1px' }}>
                      <p className="font-medium text-sm mb-2" style={{ color: '#92400E' }}>Potential Issues Detected:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: '#B45309' }}>
                        {result.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Warning banner — Gold accent */}
                  <div className="p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#FFFBEB', borderColor: '#F59E0B', borderWidth: '1px' }}>
                    <span className="text-lg">⚠️</span>
                    <p className="text-sm" style={{ color: '#92400E' }}>
                      <strong>AI-generated content.</strong> Review and verify before use. Do not submit without verification.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleReviewStatus(result.id, 'USER_EDITED')}
                      className="btn-secondary"
                      style={{ backgroundColor: '#1A2744' }}
                    >
                      ✎ Edit & Continue Review
                    </button>
                    <button
                      onClick={() => handleReviewStatus(result.id, 'VERIFIED')}
                      className="btn-primary"
                    >
                      ✓ Verify & Approve
                    </button>
                    <button
                      onClick={() => handleReviewStatus(result.id, 'REJECTED')}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                      style={{ color: '#DC2626', backgroundColor: 'transparent', border: '1px solid #FCA5A5' }}
                    >
                      ✗ Reject
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="px-4 py-2 text-sm rounded-lg transition-colors"
                      style={{ color: '#475569', backgroundColor: 'transparent' }}
                    >
                      ↻ Regenerate
                    </button>
                  </div>
                </div>
              )}

              {!result && !loading && !error && (
                <div className="text-center py-12" style={{ color: '#94A3B8' }}>
                  <div className="text-4xl mb-3">🤖</div>
                  <p className="text-base font-medium" style={{ color: '#475569' }}>Ready to generate</p>
                  <p className="text-sm mt-1">Select an operation and click Generate to begin</p>
                </div>
              )}
            </div>

            {/* History */}
            {generations.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A2744' }}>Recent Generations</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {generations.map(gen => (
                    <div
                      key={gen.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: '1px' }}
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-medium truncate" style={{ color: '#334155' }}>
                          {gen.operation.replace(/-/g, ' ')}
                        </p>
                        <p className="text-xs" style={{ color: '#94A3B8' }}>
                          {new Date(gen.createdAt).toLocaleString()} · {gen.provider || 'local'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: gen.reviewStatus === 'VERIFIED' ? '#D1FAE5' : gen.reviewStatus === 'REJECTED' ? '#F1F5F9' : '#FED7AA',
                                   color: gen.reviewStatus === 'VERIFIED' ? '#065F46' : gen.reviewStatus === 'REJECTED' ? '#475569' : '#C2410C' }}>
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
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A2744' }}>About AI-Assisted Workflows</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-medium mb-2 flex items-center gap-2" style={{ color: '#1A2744' }}>
                <span>🔗</span> Grounded Generation
              </p>
              <p style={{ color: '#64748B' }}>All prompts include source context. The AI uses only provided evidence, never invents facts.</p>
            </div>
            <div>
              <p className="font-medium mb-2 flex items-center gap-2" style={{ color: '#1A2744' }}>
                <span>👁️</span> Human Review Required
              </p>
              <p style={{ color: '#64748B' }}>Every AI output starts as NEEDS_REVIEW. Verification is an explicit user action.</p>
            </div>
            <div>
              <p className="font-medium mb-2 flex items-center gap-2" style={{ color: '#1A2744' }}>
                <span>📜</span> Provenance Tracked
              </p>
              <p style={{ color: '#64748B' }}>Each generation records the prompt, provider, model, and any safety flags.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

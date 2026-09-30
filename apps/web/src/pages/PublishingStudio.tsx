/**
 * ICON Academic Studio — Publishing Studio (Phase 7)
 *
 * A workspace for creating long-form publications: textbooks, study guides,
 * research books, manuals, etc. Every value comes from real persisted data.
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = '/api/v1/publishing';

interface Publication {
  id: string;
  title: string;
  subtitle?: string | null;
  publicationType: string;
  status: string;
  author?: string | null;
  coAuthors?: string[];
  editor?: string | null;
  publisher?: string | null;
  language: string;
  edition?: string | null;
  publicationYear?: string | null;
  description?: string | null;
  keywords?: string[];
  trimSize?: string | null;
  orientation?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Dashboard {
  id: string;
  title: string;
  subtitle?: string | null;
  publicationType: string;
  status: string;
  author?: string | null;
  editor?: string | null;
  publisher?: string | null;
  edition?: string | null;
  publicationYear?: string | null;
  trimSize?: string | null;
  orientation?: string | null;
  wordCount: number;
  estimatedPages: number;
  chapterCount: number;
  contentChapterCount: number;
  sectionCount: number;
  contributorCount: number;
  glossaryCount: number;
  figureCount: number;
  tableCount: number;
  chartCount: number;
  backMatterCount: number;
  versionCount: number;
  lastUpdated: string;
  validationStatus: string;
}

interface TemplateDef {
  publicationType: string;
  name: string;
  description?: string | null;
  frontMatter: string[];
  backMatter: string[];
  chapterStructure: Array<{ title: string; required?: boolean; subcategory?: string }>;
  formattingPreset?: string | null;
  citationStyle: string;
}

interface Part {
  id: string;
  partNumber: number;
  title: string;
  description?: string | null;
  order: number;
  chapters?: Chapter[];
}

interface Chapter {
  id: string;
  publicationId: string;
  partId?: string | null;
  documentSectionId?: string | null;
  chapterNumber: number;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  wordTarget?: number | null;
  order: number;
  status: string;
}

interface Contributor {
  id: string;
  publicationId: string;
  name: string;
  role: string;
  order: number;
}

type Tab = 'Overview' | 'Metadata' | 'Parts' | 'Chapters' | 'Contributors' | 'Validation' | 'Export';

export default function PublishingStudio() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selected, setSelected] = useState<Publication | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [templates, setTemplates] = useState<TemplateDef[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [tab, setTab] = useState<Tab>('Overview');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch publications list
  const fetchPublications = useCallback(async () => {
    try {
      const r = await axios.get<{ success: boolean; data: Publication[] }>(`${API_BASE}/publications`);
      setPublications(r.data.data || []);
    } catch {
      // Silently handle
    }
  }, []);

  useEffect(() => {
    fetchPublications();
  }, [fetchPublications]);

  // Fetch templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const r = await axios.get<{ success: boolean; data: TemplateDef[] }>(`${API_BASE}/publications/templates`);
        setTemplates(r.data.data || []);
      } catch { /* ignore */ }
    };
    loadTemplates();
  }, []);

  // When selecting a publication
  useEffect(() => {
    if (!selected?.id) return;
    loadDashboard();
    loadParts();
    loadChapters();
    loadContributors();
  }, [selected?.id]);

  const loadDashboard = async () => {
    if (!selected?.id) return;
    try {
      const r = await axios.get<{ success: boolean; data: Dashboard }>(
        `${API_BASE}/publications/${selected.id}/dashboard`
      );
      setDashboard(r.data.data);
    } catch { /* ignore */ }
  };

  const loadParts = async () => {
    if (!selected?.id) return;
    try {
      const r = await axios.get<{ success: boolean; data: Part[] }>(
        `${API_BASE}/publications/${selected.id}/parts`
      );
      setParts(r.data.data || []);
    } catch { /* ignore */ }
  };

  const loadChapters = async () => {
    if (!selected?.id) return;
    try {
      const r = await axios.get<{ success: boolean; data: Chapter[] }>(
        `${API_BASE}/publications/${selected.id}/chapters`
      );
      setChapters(r.data.data || []);
    } catch { /* ignore */ }
  };

  const loadContributors = async () => {
    if (!selected?.id) return;
    try {
      const r = await axios.get<{ success: boolean; data: Contributor[] }>(
        `${API_BASE}/publications/${selected.id}/contributors`
      );
      setContributors(r.data.data || []);
    } catch { /* ignore */ }
  };

  const createFromTemplate = async (publicationType: string) => {
    setLoading(true);
    try {
      const r = await axios.post<{ success: boolean; data: Publication }>(
        `${API_BASE}/publications/from-template`,
        { projectId: 'default-project', publicationType }
      );
      const newPub = r.data.data;
      setPublications(prev => [newPub, ...prev]);
      setSelected(newPub);
      setTab('Overview');
      setMessage(`Created ${publicationType} publication`);
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Failed to create publication');
    } finally {
      setLoading(false);
    }
  };

  const syncToDocument = async () => {
    if (!selected?.id) return;
    try {
      await axios.post(`${API_BASE}/publications/${selected.id}/sync`);
      setMessage('Synced to Document Studio');
      await loadDashboard();
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Sync failed');
    }
  };

  const createVersion = async (note: string) => {
    if (!selected?.id) return;
    try {
      await axios.post(`${API_BASE}/publications/${selected.id}/versions`, { note });
      setMessage('Version created');
      await loadDashboard();
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Version creation failed');
    }
  };

  const runValidation = async () => {
    if (!selected?.id) return;
    try {
      const r = await axios.post<{ success: boolean; data: { status: string; errorCount: number; warningCount: number } }>(
        `${API_BASE}/publications/${selected.id}/validate`
      );
      setMessage(r.data.data.status === 'COMPLETED' ? 'Validation passed' : `Validation found ${r.data.data.errorCount} errors`);
      await loadDashboard();
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Validation failed');
    }
  };

  const exportPublication = async (format: string) => {
    if (!selected?.id) return;
    try {
      const r = await axios.post<{ success: boolean; data: { jobId: string; status: string } }>(
        `${API_BASE}/publications/${selected.id}/export`,
        { format }
      );
      setMessage(`Export queued: ${format} (${r.data.data.jobId})`);
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Export failed');
    }
  };

  const deletePublication = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/publications/${id}`);
      setPublications(prev => prev.filter(p => p.id !== id));
      if (selected?.id === id) setSelected(null);
      setMessage('Publication deleted');
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Publishing Studio</h1>
        <span className="text-sm text-surface-500">Research. Learn. Create. Publish.</span>
      </div>

      {/* Message */}
      {message && (
        <div className="px-4 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700">
          {message}
        </div>
      )}

      {!selected ? (
        /* Create or select publication */
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Create New Publication</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(tmpl => (
                <button
                  key={tmpl.publicationType}
                  onClick={() => createFromTemplate(tmpl.publicationType)}
                  disabled={loading}
                  className="card hover:border-primary-400 transition-colors text-left"
                >
                  <div className="font-semibold text-surface-900">{tmpl.name}</div>
                  <div className="text-sm text-surface-500 mt-1">
                    {tmpl.description || tmpl.publicationType.replace(/_/g, ' ')}
                  </div>
                  <div className="mt-2 text-xs text-surface-400">
                    {tmpl.chapterStructure.length} sections • {tmpl.frontMatter.length} front matter • {tmpl.backMatter.length} back matter
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Your Publications</h2>
            {publications.length === 0 ? (
              <p className="text-surface-500 text-sm">No publications yet. Create one above.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publications.map(pub => (
                  <div key={pub.id} className="card">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-surface-900">{pub.title}</div>
                        <div className="text-xs text-surface-500 mt-1">{pub.publicationType.replace(/_/g, ' ')}</div>
                      </div>
                      <span className={`badge ${getStatusBadge(pub.status)}`}>{pub.status}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => { setSelected(pub); setTab('Overview'); }}
                        className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded hover:bg-primary-100"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => deletePublication(pub.id)}
                        className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Publication detail view */
        <div className="space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-surface-500">
            <button onClick={() => setSelected(null)} className="hover:text-surface-700">
              Publications
            </button>
            <span>/</span>
            <span className="text-surface-900 font-medium">{selected.title}</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-surface-200">
            {(['Overview', 'Metadata', 'Parts', 'Chapters', 'Contributors', 'Validation', 'Export'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-surface-500 hover:text-surface-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {tab === 'Overview' && (
              <OverviewTab dashboard={dashboard} selected={selected} onSync={syncToDocument} />
            )}
            {tab === 'Metadata' && (
              <MetadataTab publication={selected} />
            )}
            {tab === 'Parts' && (
              <PartsTab parts={parts} publicationId={selected.id} />
            )}
            {tab === 'Chapters' && (
              <ChaptersTab chapters={chapters} publicationId={selected.id} />
            )}
            {tab === 'Contributors' && (
              <ContributorsTab contributors={contributors} publicationId={selected.id} />
            )}
            {tab === 'Validation' && (
              <ValidationTab publicationId={selected.id} onValidate={runValidation} />
            )}
            {tab === 'Export' && (
              <ExportTab publicationId={selected.id} onExport={exportPublication} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'badge-info',
    IN_REVIEW: 'badge-warning',
    EDITING: 'badge-purple',
    FORMATTING: 'badge-purple',
    PRODUCTION: 'badge-purple',
    READY_FOR_EXPORT: 'badge-success',
    PUBLISHED: 'badge-success',
    ARCHIVED: 'badge-surface',
  };
  return map[status] || 'badge-default';
}

function OverviewTab({ dashboard, selected, onSync }: { dashboard: Dashboard | null; selected: Publication; onSync: () => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Word Count" value={dashboard?.wordCount ?? 0} />
        <StatCard label="Est. Pages" value={dashboard?.estimatedPages ?? 0} />
        <StatCard label="Chapters" value={dashboard?.chapterCount ?? 0} />
        <StatCard label="Figures" value={(dashboard?.figureCount ?? 0) + (dashboard?.tableCount ?? 0)} />
        <StatCard label="Glossary Terms" value={dashboard?.glossaryCount ?? 0} />
        <StatCard label="Contributors" value={dashboard?.contributorCount ?? 0} />
        <StatCard label="Versions" value={dashboard?.versionCount ?? 0} />
        <StatCard label="Back Matter" value={dashboard?.backMatterCount ?? 0} />
      </div>

      <div className="card">
        <h3 className="font-semibold text-surface-900 mb-3">Publication Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <DetailRow label="Title" value={selected.title} />
          <DetailRow label="Type" value={selected.publicationType.replace(/_/g, ' ')} />
          <DetailRow label="Author" value={selected.author || '—'} />
          <DetailRow label="Editor" value={selected.editor || '—'} />
          <DetailRow label="Publisher" value={selected.publisher || '—'} />
          <DetailRow label="Edition" value={selected.edition || '—'} />
          <DetailRow label="Year" value={selected.publicationYear || '—'} />
          <DetailRow label="Language" value={selected.language} />
          <DetailRow label="Trim Size" value={selected.trimSize || 'A4'} />
          <DetailRow label="Orientation" value={selected.orientation || 'Portrait'} />
          <DetailRow label="ISBN-13" value={selected.isbn13 || '—'} />
          <DetailRow label="Status" value={selected.status} />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onSync} className="btn-secondary">Sync to Document Studio</button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-2xl font-bold text-surface-900">{value}</div>
      <div className="text-sm text-surface-500">{label}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-surface-500 text-xs uppercase tracking-wide">{label}</div>
      <div className="text-surface-900 font-medium mt-1">{value}</div>
    </div>
  );
}

function MetadataTab({ publication }: { publication: Publication }) {
  const [form, setForm] = useState({
    title: publication.title,
    subtitle: publication.subtitle || '',
    author: publication.author || '',
    editor: publication.editor || '',
    publisher: publication.publisher || '',
    description: publication.description || '',
    isbn13: publication.isbn13 || '',
    trimSize: publication.trimSize || 'A4',
  });

  const update = async () => {
    try {
      await axios.put(`/api/v1/publishing/publications/${publication.id}`, form);
      alert('Updated');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Update failed');
    }
  };

  return (
    <div className="card max-w-2xl space-y-4">
      <h3 className="font-semibold text-surface-900">Publication Metadata</h3>
      <FormField label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} />
      <FormField label="Subtitle" value={form.subtitle} onChange={v => setForm({ ...form, subtitle: v })} />
      <FormField label="Author" value={form.author} onChange={v => setForm({ ...form, author: v })} />
      <FormField label="Editor" value={form.editor} onChange={v => setForm({ ...form, editor: v })} />
      <FormField label="Publisher" value={form.publisher} onChange={v => setForm({ ...form, publisher: v })} />
      <textarea
        className="input w-full"
        rows={4}
        placeholder="Description..."
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField label="ISBN-13" value={form.isbn13} onChange={v => setForm({ ...form, isbn13: v })} />
        <select
          className="input"
          value={form.trimSize}
          onChange={e => setForm({ ...form, trimSize: e.target.value })}
        >
          <option value="A4">A4</option>
          <option value="A5">A5</option>
          <option value="Letter">Letter</option>
          <option value="Digest">Digest</option>
        </select>
      </div>
      <button onClick={update} className="btn-primary">Save Changes</button>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-surface-700 mb-1">{label}</label>
      <input
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function PartsTab({ parts, publicationId }: { parts: Part[]; publicationId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-surface-900">Parts</h3>
        <button className="btn-secondary text-sm">+ Add Part</button>
      </div>
      {parts.length === 0 ? (
        <p className="text-surface-500 text-sm">No parts yet.</p>
      ) : (
        parts.map(part => (
          <div key={part.id} className="card">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-primary-600">I</span>
              <div className="flex-1">
                <div className="font-semibold text-surface-900">{part.title}</div>
                <div className="text-sm text-surface-500">{part.chapters?.length || 0} chapters</div>
              </div>
              <div className="flex gap-2">
                <button className="text-xs px-2 py-1 bg-surface-100 rounded">Edit</button>
                <button className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded">Delete</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ChaptersTab({ chapters, publicationId }: { chapters: Chapter[]; publicationId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-surface-900">Chapters</h3>
        <button className="btn-secondary text-sm">+ Add Chapter</button>
      </div>
      {chapters.length === 0 ? (
        <p className="text-surface-500 text-sm">No chapters yet.</p>
      ) : (
        chapters.map(ch => (
          <div key={ch.id} className="card flex items-center gap-4">
            <span className="text-lg font-bold text-surface-400 w-8">{ch.chapterNumber}</span>
            <div className="flex-1">
              <div className="font-medium text-surface-900">{ch.title}</div>
              <div className="text-xs text-surface-500">
                {ch.status} {ch.wordTarget ? `• ${ch.wordTarget} words target` : ''}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="text-xs px-2 py-1 bg-surface-100 rounded">Edit</button>
              <button className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded">Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ContributorsTab({ contributors, publicationId }: { contributors: Contributor[]; publicationId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-surface-900">Contributors</h3>
        <button className="btn-secondary text-sm">+ Add Contributor</button>
      </div>
      {contributors.length === 0 ? (
        <p className="text-surface-500 text-sm">No contributors yet.</p>
      ) : (
        contributors.map(c => (
          <div key={c.id} className="card flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium">
              {c.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-surface-900">{c.name}</div>
              <div className="text-xs text-surface-500">{c.role.replace(/_/g, ' ')}</div>
            </div>
            <div className="flex gap-2">
              <button className="text-xs px-2 py-1 bg-surface-100 rounded">Edit</button>
              <button className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded">Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ValidationTab({ publicationId, onValidate }: { publicationId: string; onValidate: () => void }) {
  const [issues, setIssues] = useState<Array<{ category: string; severity: string; message: string }>>([]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-surface-900">Validation</h3>
        <button onClick={onValidate} className="btn-primary">Run Validation</button>
      </div>
      {issues.length === 0 ? (
        <p className="text-surface-500 text-sm">No issues to show. Run validation to check.</p>
      ) : (
        issues.map((issue, i) => (
          <div key={i} className={`card border-l-4 ${
            issue.severity === 'ERROR' ? 'border-red-500' : issue.severity === 'WARNING' ? 'border-yellow-500' : 'border-green-500'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`badge ${
                issue.severity === 'ERROR' ? 'badge-error' : issue.severity === 'WARNING' ? 'badge-warning' : 'badge-success'
              }`}>{issue.severity}</span>
              <span className="text-sm text-surface-700">{issue.message}</span>
              <span className="text-xs text-surface-400 ml-auto">{issue.category}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ExportTab({ publicationId, onExport }: { publicationId: string; onExport: (f: string) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-surface-900">Export Options</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {['DOCX', 'PDF', 'MARKDOWN', 'HTML', 'TXT'].map(fmt => (
          <button
            key={fmt}
            onClick={() => onExport(fmt)}
            className="card hover:border-primary-400 transition-colors"
          >
            <div className="text-lg font-semibold text-surface-900">{fmt}</div>
            <div className="text-xs text-surface-500 mt-1">Download as {fmt.toLowerCase()}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

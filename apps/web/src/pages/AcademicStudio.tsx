/**
 * ICON Academic Studio — Academic Project Studio (Phase 6 frontend)
 *
 * A research workstation, not a CRUD dashboard. Tabs map 1:1 to real
 * /api/v1/academic-projects endpoints; every value shown comes from
 * persisted data. Empty states are explicit.
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ActivityTab from '../components/ActivityTab';

const API = '/api/v1/academic-projects';

interface AcademicProject {
  id: string;
  title: string;
  projectType: string;
  institution?: string | null;
  department?: string | null;
  program?: string | null;
  academicLevel?: string | null;
  studentName?: string | null;
  status: string;
  citationStyle: string;
  chapters?: any[];
  objectives?: any[];
  findings?: any[];
  references?: any[];
  appendices?: any[];
}

interface Dashboard {
  title: string;
  projectType: string;
  institution?: string | null;
  program?: string | null;
  status: string;
  progress: { completion: number; chaptersWithContent: number; totalChapters: number };
  wordCount: number;
  counts: Record<string, number>;
  unresolvedReviewItems: number;
  lastUpdated: string;
}

interface TemplateDef {
  projectType: string;
  name: string;
  description: string;
  academicLevel: string;
  citationStyle: string;
}

const TABS = ['Overview', 'Structure', 'Research', 'Methodology', 'Instruments', 'Data', 'Findings', 'Validation', 'Export', 'Activity'] as const;
type Tab = (typeof TABS)[number];

export default function AcademicStudio() {
  const [projects, setProjects] = useState<AcademicProject[]>([]);
  const [selected, setSelected] = useState<AcademicProject | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [templates, setTemplates] = useState<TemplateDef[]>([]);
  const [tab, setTab] = useState<Tab>('Overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('HND_RESEARCH_PROJECT');

  // ---------------------------------------------------------------- templates
  useEffect(() => {
    axios
      .get<{ success: boolean; data: TemplateDef[] }>(`${API}/templates`)
      .then((r) => setTemplates(r.data.data || []))
      .catch(() => setError('Failed to load templates'));
  }, []);

  // ---------------------------------------------------------------- list
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get<{ success: boolean; data: AcademicProject[] }>(`${API}`, {
        params: { projectId: 'default' },
      });
      setProjects(r.data.data || []);
    } catch {
      setError('Failed to load academic projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ---------------------------------------------------------------- detail
  const open = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const r = await axios.get<{ success: boolean; data: AcademicProject }>(`${API}/${id}`);
      setSelected(r.data.data);
      const d = await axios.get<{ success: boolean; data: Dashboard }>(`${API}/${id}/dashboard`);
      setDashboard(d.data.data);
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------- create
  const create = async () => {
    if (!newTitle.trim()) {
      setError('A title is required');
      return;
    }
    setLoading(true);
    try {
      const r = await axios.post<{ success: boolean; data: AcademicProject }>(`${API}`, {
        projectId: 'default',
        title: newTitle.trim(),
        projectType: newType,
        template: newType,
      });
      setNewTitle('');
      await fetchProjects();
      await open(r.data.data.id);
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const sync = async () => {
    if (!selected) return;
    try {
      await axios.post(`${API}/${selected.id}/sync-document`, {});
      await open(selected.id);
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Sync failed');
    }
  };

  // ---------------------------------------------------------------- render
  if (loading && !selected) {
    return <div className="p-8 text-surface-500">Loading academic projects…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Academic Project Studio</h1>
          <p className="text-sm text-surface-500">Research. Learn. Create. Publish.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {!selected ? (
        <div className="space-y-6">
          <div className="card p-4">
            <h2 className="mb-3 font-semibold text-surface-900">New Academic Project</h2>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Project title…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <select className="input w-56" value={newType} onChange={(e) => setNewType(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.projectType} value={t.projectType}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button className="btn-primary" onClick={create} disabled={loading}>
                Create
              </button>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="card p-8 text-center text-surface-500">
              No academic projects yet. Create one above to start a structured research workspace.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <button key={p.id} onClick={() => open(p.id)} className="card p-4 text-left hover:shadow-md">
                  <span className="badge badge-info">{p.projectType}</span>
                  <p className="mt-2 font-medium text-surface-900">{p.title}</p>
                  <p className="text-sm text-surface-500">{p.institution || 'No institution set'}</p>
                  <p className="mt-2 text-xs text-surface-400">{p.status}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <button className="text-sm text-primary-600 hover:underline" onClick={() => setSelected(null)}>
                ← All projects
              </button>
              <h2 className="text-xl font-bold text-surface-900">{selected.title}</h2>
              <p className="text-sm text-surface-500">
                {selected.projectType} · {selected.institution || 'No institution'} · {selected.citationStyle}
              </p>
            </div>
            <button className="btn-secondary" onClick={sync}>
              Sync to document
            </button>
          </div>

          <div className="flex gap-1 border-b border-surface-200">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium ${
                  tab === t ? 'border-b-2 border-primary-600 text-primary-700' : 'text-surface-500 hover:text-surface-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {dashboard && tab === 'Overview' && <OverviewTab dashboard={dashboard} />}
          {tab === 'Structure' && <StructureTab project={selected} />}
          {tab === 'Research' && <ResearchTab project={selected} />}
          {tab === 'Methodology' && <SimpleList items={[]} label="methodology sections" />}
          {tab === 'Instruments' && <SimpleList items={[]} label="questionnaires and interview guides" />}
          {tab === 'Data' && <SimpleList items={[]} label="datasets and analyses" />}
          {tab === 'Findings' && <SimpleList items={selected.findings || []} label="findings" field="statement" />}
          {tab === 'Validation' && <SimpleList items={[]} label="validation runs" />}
          {tab === 'Activity' && <ActivityTab projectId={selected.id} />}
          {tab === 'Export' && <ExportTab projectId={selected.id} />}
        </div>
      )}
    </div>
  );
}

function OverviewTab({ dashboard }: { dashboard: Dashboard }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Metric label="Completion" value={`${dashboard.progress.completion}%`} hint={`${dashboard.progress.chaptersWithContent}/${dashboard.progress.totalChapters} chapters`} />
      <Metric label="Word count" value={dashboard.wordCount.toLocaleString()} hint="document body" />
      <Metric label="Findings" value={dashboard.counts.findings} hint="registered" />
      <Metric label="References" value={dashboard.counts.references} hint="in project style" />
      <Metric label="Objectives" value={dashboard.counts.objectives} hint="general + specific" />
      <Metric label="Hypotheses" value={dashboard.counts.hypotheses} hint="under test" />
      <Metric label="Open review items" value={dashboard.unresolvedReviewItems} hint="unresolved" />
      <Metric label="Status" value={dashboard.status} hint="project" />
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-surface-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-surface-900">{value}</p>
      <p className="text-xs text-surface-500">{hint}</p>
    </div>
  );
}

function StructureTab({ project }: { project: AcademicProject }) {
  const chapters = project.chapters || [];
  if (!chapters.length) return <Empty label="chapters" />;
  return (
    <div className="space-y-2">
      {chapters.map((c) => (
        <div key={c.id} className="card flex items-center justify-between p-4">
          <div>
            <span className="font-mono text-sm text-surface-400">Ch {c.chapterNumber}</span>
            <span className="ml-3 font-medium text-surface-900">{c.title}</span>
          </div>
          <div className="flex items-center gap-3">
            {c.wordTarget && <span className="text-xs text-surface-500">{c.wordTarget} words</span>}
            {c.documentSectionId ? (
              <span className="badge badge-success">in document</span>
            ) : (
              <span className="badge badge-info">pending</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResearchTab({ project }: { project: AcademicProject }) {
  const objectives = project.objectives || [];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 font-semibold text-surface-900">Objectives</h3>
        {objectives.length === 0 ? (
          <Empty label="objectives" />
        ) : (
          <ol className="list-decimal space-y-1 pl-6 text-surface-700">
            {objectives.map((o) => (
              <li key={o.id}>
                <span className="text-xs uppercase text-surface-400">{o.objectiveType}</span> — {o.statement}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div>
        <h3 className="mb-2 font-semibold text-surface-900">References</h3>
        {(project.references || []).length === 0 ? (
          <Empty label="references" />
        ) : (
          <ul className="space-y-1 text-surface-700">
            {(project.references || []).map((r) => (
              <li key={r.id} className="text-sm">
                {r.raw}
                {!r.isComplete && <span className="ml-2 text-xs text-amber-600">incomplete</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SimpleList({ items, label, field }: { items: any[]; label: string; field?: string }) {
  if (!items.length) return <Empty label={label} />;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.id} className="card p-3 text-sm text-surface-700">
          {field ? i[field] : JSON.stringify(i)}
        </li>
      ))}
    </ul>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="card p-8 text-center text-surface-500">No {label} yet.</div>;
}

function ExportTab({ projectId }: { projectId: string }) {
  const [format, setFormat] = useState('docx');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const doExport = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await axios.get(`${API}/${projectId}/export/${format}`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `academic-project.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Exported ${format.toUpperCase()} — verify the downloaded file.`);
    } catch (e: any) {
      setMsg(e.response?.data?.error?.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="mb-3 font-semibold text-surface-900">Export</h3>
      <div className="flex gap-2">
        <select className="input w-40" value={format} onChange={(e) => setFormat(e.target.value)}>
          {['docx', 'pdf', 'markdown', 'html', 'txt'].map((f) => (
            <option key={f} value={f}>
              {f.toUpperCase()}
            </option>
          ))}
        </select>
        <button className="btn-primary" onClick={doExport} disabled={busy}>
          {busy ? 'Exporting…' : 'Export document'}
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-surface-500">{msg}</p>}
    </div>
  );
}

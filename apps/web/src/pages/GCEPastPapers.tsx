/**
 * ICON Academic Studio — GCE Past-Paper Intelligence Page
 *
 * Deterministic historical analysis only. Never predicts future exam content.
 * Uses the following public API endpoints:
 *   GET    /api/v1/gce/exam-boards          list boards
 *   POST   /api/v1/gce/exam-boards           create board
 *   GET    /api/v1/gce/subjects              list subjects (optional ?examBoardId&level)
 *   POST   /api/v1/gce/subjects              create subject
 *   GET    /api/v1/gce/syllabi               list syllabi
 *   POST   /api/v1/gce/syllabi/ingest        ingest syllabus text
 *   GET    /api/v1/gce/syllabi/:id           get syllabus with sections/topics
 *   GET    /api/v1/gce/papers                list papers
 *   POST   /api/v1/gce/papers/ingest         ingest past paper text
 *   GET    /api/v1/gce/papers/:id            get paper (questions + mappings + marking)
 *   POST   /api/v1/gce/papers/:id/marking-schemes/ingest  ingest marking scheme
 *   GET    /api/v1/gce/mappings              list mappings
 *   POST   /api/v1/gce/mappings              upsert mapping
 *   PUT    /api/v1/gce/mappings/:id/status   update mapping status
 *   GET    /api/v1/gce/questions/:questionId/mappings/suggest  suggest topic links
 *   GET    /api/v1/gce/analysis/historical   deterministic historical analysis
 *   GET    /api/v1/gce/search?q=...          search questions/topics/papers
 *   GET    /api/v1/gce/question-bank         list bank (paginated)
 *   POST   /api/v1/gce/question-bank         add item
 *   DELETE /api/v1/gce/question-bank/:itemId remove item
 *   GET    /api/v1/gce/mock-exams            list mock exams for project
 *   POST   /api/v1/gce/mock-exams            create mock exam
 *   GET    /api/v1/gce/mock-exams/:id        get mock exam
 *   POST   /api/v1/gce/mock-exams/:id/questions     add question
 *   DELETE /api/v1/gce/mock-exams/:mockExamId/questions/:questionId
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExamBoard { id: string; name: string; code?: string | null; description?: string | null; _count?: { subjects: number } }
interface Subject { id: string; name: string; code?: string | null; level?: string; examBoardId: string; _count?: { syllabi: number; pastPapers: number }; examBoard?: { name: string; code: string } }
interface SyllabusNode { title: string; code?: string | null; description?: string | null; children: SyllabusNode[]; level: number }
interface ParsedSyllabus { structured: boolean; needsReview: boolean; notes: string[]; nodes: SyllabusNode[] }
interface Syllabus {
  id: string; projectId?: string | null; examBoardId: string; subjectId: string;
  title: string; session?: string | null; version?: string | null; sourceId?: string | null;
  status: string; metadata: string; createdAt: string; updatedAt: string;
  sections?: SyllabusSection[]; topics?: SyllabusTopic[]; subject?: Subject; examBoard?: ExamBoard;
}
interface SyllabusSection { id: string; parentId?: string | null; order: number; code?: string | null; title: string; description?: string | null; level: number; topics?: SyllabusTopic[] }
interface SyllabusTopic { id: string; sectionId?: string | null; parentId?: string | null; order: number; code?: string | null; title: string; description?: string | null; level: number }
interface Paper { id: string; projectId: string; examBoardId: string; subjectId: string; year: number; session?: string | null; paperNumber?: string | null; examinerCode?: string | null; title: string; status: string; metadata: string; subject?: Subject; examBoard?: ExamBoard }
interface QuestionPart { id: string; label?: string | null; text: string; marks?: number | null; order: number }
interface ParsedMarkingPoint { pointText: string; marks?: number | null; partLabel?: string | null; matched?: boolean; questionNumber?: number | null }
interface PastPaperQuestion { id: string; pastPaperId: string; questionNumber: number; text: string; marks: number; questionType: string; commandVerb: string; section?: string | null; parts: QuestionPart[]; mappings: Array<{ topic: SyllabusTopic; status: string; confidence?: number }> }
interface Mapping { id: string; questionId: string; topicId: string; method: string; status: string; confidence?: number; rationale?: string; topic: SyllabusTopic; question: { questionNumber: number; text: string; marks: number; pastPaper: { year: number; paperNumber: string | null; session?: string | null } } }
interface HistoricalAnalysisSummary { importedPaperCount: number; papersWithMappedQuestions: number; mappedQuestionCount: number; totalSyllabusTopics: number; topicsCovered: number; topicsWithoutMappedQuestions: number; yearsObserved: number[]; marksStats: { min: number; max: number; mean: number }; overallTypes: Record<string, number>; overallVerbs: Record<string, number> }
interface TopicRow { topicId: string; topicTitle: string; topicCode: string | null; questionCount: number; yearsObserved: number[]; totalMarks: number; averageMarksPerQuestion: number; types: Record<string, number>; verbs: Record<string, number>; paperCount: number }
interface HistoricalAnalysis { summary: HistoricalAnalysisSummary; byTopic: TopicRow[]; byYear: Record<number, { questionCount: number; totalMarks: number }>; yearTopicMatrix: { year: number; counts: Record<string, number> }[]; uncoveredTopics: SyllabusTopic[] }
interface QuestionBankItem { id: string; projectId: string; questionText: string; marks?: number; topic?: string | null; topicId?: string | null; questionType?: string; commandVerb?: string; difficulty?: string; year?: number | null; paperTitle?: string | null; notes?: string | null }
interface MockExamQuestion { id: string; mockExamId: string; questionText: string; marks?: number; order: number }
interface MockExam {
  id: string; projectId: string; subjectId: string; title: string;
  duration?: number | null; totalMarks: number; configuration: string;
  questions: MockExamQuestion[];
  subject?: { name: string };
}
interface SearchResult { questions: Array<{ id: string; text: string; pastPaper: { year: number; paperNumber: string; subject?: { name: string } }; mappings: { topic: { id: string; title: string } }[] }>; topics: Array<{ id: string; title: string; syllabusId: string }>; papers: Array<{ id: string; year: number; paperNumber: string; title: string }> }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = '/api/v1';

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...((opts?.headers || {}) as Record<string, string>) },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  // Backend wraps every payload as { success, data } — unwrap it.
  const json = await res.json();
  if (json && typeof json === 'object' && 'data' in json) return json.data as T;
  return json as T;
}

function badgeColor(status: string) {
  const s = (status || '').toUpperCase();
  if (s === 'CONFIRMED') return 'bg-green-100 text-green-800 border border-green-200';
  if (s === 'REVIEWED') return 'bg-blue-100 text-blue-800 border border-blue-200';
  if (s === 'SUGGESTED') return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  if (s === 'REJECTED') return 'bg-red-100 text-red-800 border border-red-200';
  if (s === 'PARSED') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (s === 'ERROR') return 'bg-orange-100 text-orange-800 border border-orange-200';
  if (s === 'DRAFT') return 'bg-gray-100 text-gray-700 border border-gray-200';
  return 'bg-surface-100 text-surface-700 border border-surface-200';
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n) + '…';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-surface-200 p-4">
      <div className="text-sm text-surface-500">{label}</div>
      <div className="text-2xl font-semibold text-surface-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-surface-400 mt-1">{sub}</div>}
    </div>
  );
}

function TabNav({ tabs, active, onChange }: { tabs: Array<{ key: string; label: string; count?: number }>; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-surface-200 mb-4">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-2 text-xs bg-surface-100 px-1.5 py-0.5 rounded-full">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Select({ value, onChange, options, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; placeholder?: string; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Button({ children, onClick, variant = 'primary', disabled, className = '' }: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean; className?: string;
}) {
  const base = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-white text-surface-700 border border-surface-200 hover:bg-surface-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-surface-600 hover:bg-surface-100',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-auto m-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="text-lg font-semibold text-surface-900">{title}</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600"></div>
    </div>
  );
}

function EmptyState({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="text-center py-16 bg-surface-50 rounded-xl border border-dashed border-surface-200">
      <p className="text-surface-500 text-sm">{message}</p>
      {action && <Button variant="secondary" onClick={onAction} className="mt-4">{action}</Button>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function GCEPastPapers() {
  const [searchParams] = useSearchParams();
  // Optional project context — question bank & mock exams are project-scoped.
  const projectId = searchParams.get('projectId') || '';

  // Top-level filters
  const [boardFilter, setBoardFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [activeTab, setActiveTab] = useState('papers');

  // Boards & subjects
  const [boards, setBoards] = useState<ExamBoard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  // Papers
  const [papers, setPapers] = useState<Paper[]>([]);
  const [totalPapers, setTotalPapers] = useState(0);
  const [paperPage, setPaperPage] = useState(1);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [paperDetail, setPaperDetail] = useState<{ questions: PastPaperQuestion[]; markingPoints: ParsedMarkingPoint[] } | null>(null);

  // Syllabi
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [selectedSyllabus, setSelectedSyllabus] = useState<Syllabus | null>(null);

  // Mappings
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [mappingStatusFilter, setMappingStatusFilter] = useState('');

  // Analysis
  const [analysis, setAnalysis] = useState<HistoricalAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Question bank
  const [bankItems, setBankItems] = useState<QuestionBankItem[]>([]);
  const [bankTotal, setBankTotal] = useState(0);

  // Modals
  const [ingestModal, setIngestModal] = useState<string | null>(null); // 'paper' | 'syllabus' | 'marking' | 'bank' | 'mock'
  const [rawText, setRawText] = useState('');
  const [ingestMeta, setIngestMeta] = useState<Record<string, string>>({});
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [mockExamMeta, setMockExamMeta] = useState<{ projectId?: string; subjectId?: string; title: string }>({ title: '' });
  // Mock exams
  const [mockExams, setMockExams] = useState<MockExam[]>([]);

  // -----------------------------------------------------------------------
  // Load boards & subjects on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    setLoadingBoards(true);
    api<Array<ExamBoard>>('/gce/exam-boards')
      .then((d) => { setBoards(d); if (d.length > 0 && !boardFilter) setBoardFilter(d[0].id); })
      .catch(console.error)
      .finally(() => setLoadingBoards(false));
  }, []);

  useEffect(() => {
    if (!boardFilter) return;
    api<Array<Subject>>(`/gce/subjects?examBoardId=${encodeURIComponent(boardFilter)}`)
      .then((d) => { setSubjects(d); if (d.length > 0 && !subjectFilter) setSubjectFilter(d[0].id); })
      .catch(console.error);
  }, [boardFilter]);

  // -----------------------------------------------------------------------
  // Load papers
  // -----------------------------------------------------------------------
  const loadPapers = useCallback(() => {
    setLoadingPapers(true);
    const params = new URLSearchParams({ page: String(paperPage), pageSize: '20' });
    if (boardFilter) params.set('examBoardId', boardFilter);
    if (subjectFilter) params.set('subjectId', subjectFilter);
    api<{ data: { papers: Paper[]; total: number; page: number } }>(`/gce/papers?${params}`)
      .then((r) => { setPapers(r.data.papers); setTotalPapers(r.data.total); })
      .catch(console.error)
      .finally(() => setLoadingPapers(false));
  }, [boardFilter, subjectFilter, paperPage]);

  useEffect(() => { loadPapers(); }, [loadPapers]);

  // -----------------------------------------------------------------------
  // Load syllabi
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!subjectFilter) return;
    api<Array<Syllabus>>(`/gce/syllabi?subjectId=${encodeURIComponent(subjectFilter)}`)
      .then(setSyllabi).catch(console.error);
  }, [subjectFilter]);

  // -----------------------------------------------------------------------
  // Load mappings
  // -----------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams();
    if (mappingStatusFilter) params.set('status', mappingStatusFilter);
    if (subjectFilter) params.set('syllabusId', subjectFilter);
    api<Array<Mapping>>(`/gce/mappings?${params}`).then(setMappings).catch(console.error);
  }, [mappingStatusFilter, subjectFilter]);

  // -----------------------------------------------------------------------
  // Load analysis
  // -----------------------------------------------------------------------
  const loadAnalysis = useCallback(() => {
    setLoadingAnalysis(true);
    const params = new URLSearchParams();
    if (boardFilter) params.set('examBoardId', boardFilter);
    if (subjectFilter) params.set('subjectId', subjectFilter);
    api<{ data: HistoricalAnalysis }>(`/gce/analysis/historical?${params}`)
      .then((r) => setAnalysis(r.data))
      .catch(console.error)
      .finally(() => setLoadingAnalysis(false));
  }, [boardFilter, subjectFilter]);

  // -----------------------------------------------------------------------
  // Load bank
  // -----------------------------------------------------------------------
  useEffect(() => {
    api<{ data: { items: QuestionBankItem[]; total: number } }>(
      projectId ? `/gce/question-bank?projectId=${encodeURIComponent(projectId)}&topicId=${encodeURIComponent(subjectFilter || '')}&page=1&pageSize=50` : '/gce/question-bank?page=1&pageSize=50'
    )
      .then((r) => { setBankItems(r.data.items); setBankTotal(r.data.total); })
      .catch(console.error);
  }, [subjectFilter, projectId]);

  // -----------------------------------------------------------------------
  // Load mock exams
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!projectId) return;
    api<Array<MockExam>>(`/gce/mock-exams?projectId=${encodeURIComponent(projectId)}`)
      .then(setMockExams).catch(console.error);
  }, [projectId]);

  // -----------------------------------------------------------------------
  // Paper detail
  // -----------------------------------------------------------------------
  const openPaperDetail = (paper: Paper) => {
    setSelectedPaper(paper);
    api<{ data: { questions: PastPaperQuestion[]; markingPoints: ParsedMarkingPoint[] } }>(`/gce/papers/${paper.id}`)
      .then((r) => setPaperDetail(r.data))
      .catch(console.error);
  };

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------
  const doSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return; }
    setSearchLoading(true);
    try {
      const r = await api<{ data: SearchResult }>(`/gce/search?q=${encodeURIComponent(q)}&subjectId=${encodeURIComponent(subjectFilter)}`);
      setSearchResults(r.data);
    } catch (e) { console.error(e); }
    finally { setSearchLoading(false); }
  };

  // -----------------------------------------------------------------------
  // Ingestion handlers
  // -----------------------------------------------------------------------
  const handleIngest = async (kind: string) => {
    if (!rawText.trim()) { setIngestError('Raw text is required'); return; }
    setIngestError(null); setIngestResult(null);

    try {
      if (kind === 'paper' && subjectFilter) {
        const body = { rawText, projectId, examBoardId: boards.find(b => b.id === boardFilter)?.id || '', subjectId: subjectFilter, year: Number(ingestMeta.year || new Date().getFullYear()), title: ingestMeta.title || 'Untitled paper', ...Object.fromEntries(Object.entries(ingestMeta).filter(([k]) => k !== 'year' && k !== 'title')) };
        const r = await api<{ data: any }>('/gce/papers/ingest', { method: 'POST', body: JSON.stringify(body) });
        setIngestResult(JSON.stringify(r.data, null, 2));
        setRawText(''); setIngestModal(null); loadPapers();
      } else if (kind === 'syllabus' && subjectFilter) {
        const body = { rawText, projectId, examBoardId: boardFilter, subjectId: subjectFilter, title: ingestMeta.title || 'Untitled syllabus', ...Object.fromEntries(Object.entries(ingestMeta).filter(([k]) => k !== 'title')) };
        const r = await api<{ data: any }>('/gce/syllabi/ingest', { method: 'POST', body: JSON.stringify(body) });
        setIngestResult(JSON.stringify(r.data, null, 2));
        setRawText(''); setIngestModal(null);
      } else if (kind === 'marking' && selectedPaper) {
        const body = { rawText, pastPaperId: selectedPaper.id, title: ingestMeta.title || 'Marking scheme' };
        const r = await api<{ data: any }>(`/gce/papers/${selectedPaper.id}/marking-schemes/ingest`, { method: 'POST', body: JSON.stringify(body) });
        setIngestResult(JSON.stringify(r.data, null, 2));
        setRawText(''); setIngestModal(null);
      } else if (kind === 'bank') {
        const body = { projectId, questionText: rawText, ...Object.fromEntries(Object.entries(ingestMeta).filter(([k]) => k !== 'questionText')) };
        const r = await api<{ data: QuestionBankItem }>('/gce/question-bank', { method: 'POST', body: JSON.stringify(body) });
        setIngestResult(JSON.stringify(r.data, null, 2));
        setRawText(''); setIngestModal(null);
      } else if (kind === 'mock') {
        if (!projectId) { setIngestError('Project context required for mock exams'); return; }
        const body = { projectId, subjectId, title: mockExamMeta.title || 'Untitled mock exam' };
        const r = await api<{ data: MockExam }>('/gce/mock-exams', { method: 'POST', body: JSON.stringify(body) });
        setIngestResult(JSON.stringify(r.data, null, 2));
        setRawText(''); setIngestModal(null); setMockExams(prev => [...prev, r.data]);
      } else {
        setIngestError('Missing required context. Select a subject or paper first.');
      }
    } catch (e: any) { setIngestError(e.message); }
  };

  // -----------------------------------------------------------------------
  // Tabs
  // -----------------------------------------------------------------------
  const tabs = [
    { key: 'papers', label: 'Past Papers', count: totalPapers },
    { key: 'syllabi', label: 'Syllabi', count: syllabi.length },
    { key: 'mappings', label: 'Mappings', count: mappings.length },
    { key: 'analysis', label: 'Historical Analysis' },
    { key: 'search', label: 'Search' },
    { key: 'bank', label: 'Question Bank', count: bankTotal },
    { key: 'mock', label: 'Mock Exams', count: mockExams.length },
  ];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-surface-200 p-4">
        <Select value={boardFilter} onChange={setBoardFilter} options={boards.map(b => ({ value: b.id, label: `${b.name} (${b.code || '—'})` }))} placeholder="Select board…" />
        <Select value={subjectFilter} onChange={setSubjectFilter} options={subjects.map(s => ({ value: s.id, label: `${s.name} (${s.code || s.level || '—'})` }))} placeholder="Select subject…" />
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search papers, questions, topics…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch(searchQuery)}
            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <Button variant="ghost" onClick={() => doSearch(searchQuery)} disabled={searchLoading}>Search</Button>
        <Button onClick={() => { setIngestModal('paper'); setRawText(''); setIngestMeta({}); setIngestResult(null); setIngestError(null); }}>+ Ingest Paper</Button>
        <Button variant="secondary" onClick={loadAnalysis}>Refresh Analysis</Button>
      </div>

      <TabNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Papers */}
      {activeTab === 'papers' && (
        <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
          {loadingPapers ? <Spinner /> : papers.length === 0 ? (
            <EmptyState message="No past papers ingested. Click '+ Ingest Paper' to add your first paper." onAction={() => setIngestModal('paper')} />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  {['Year', 'Paper', 'Title', 'Status', 'Questions', ''].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-surface-500">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {papers.map((p) => (
                  <tr key={p.id} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="px-4 py-3 font-mono text-surface-700">{p.year}</td>
                    <td className="px-4 py-3 text-surface-500">{p.paperNumber || '—'}</td>
                    <td className="px-4 py-3 text-surface-900">{truncate(p.title, 60)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor(p.status)}`}>{p.status}</span></td>
                    <td className="px-4 py-3 text-surface-500">—</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" onClick={() => openPaperDetail(p)} className="text-xs">View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {totalPapers > 20 && (
            <div className="flex items-center justify-between px-4 py-3 bg-surface-50 border-t border-surface-200">
              <span className="text-xs text-surface-500">Page {paperPage} of {Math.ceil(totalPapers / 20)}</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setPaperPage(p => Math.max(1, p - 1))} disabled={paperPage <= 1}>Prev</Button>
                <Button variant="secondary" onClick={() => setPaperPage(p => p + 1)} disabled={paperPage * 20 >= totalPapers}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Syllabi */}
      {activeTab === 'syllabi' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {syllabi.length === 0 ? (
            <EmptyState message="No syllabi ingested for this subject." onAction={() => setIngestModal('syllabus')} />
          ) : syllabi.map((s) => (
            <div key={s.id} className="bg-white rounded-lg border border-surface-200 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedSyllabus(s)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-surface-900">{truncate(s.title, 40)}</h3>
                  <p className="text-xs text-surface-500 mt-1">{s.subject?.name} · {s.session || 'Any session'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor(s.status)}`}>{s.status}</span>
              </div>
              <p className="text-xs text-surface-400 mt-2 line-clamp-2">{s.sections?.length || 0} sections · {(s.topics || []).length} topics</p>
            </div>
          ))}
        </div>
      )}

      {/* Mappings */}
      {activeTab === 'mappings' && (
        <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-200 flex items-center gap-3">
            <span className="text-sm font-medium text-surface-700">All mappings</span>
            <Select value={mappingStatusFilter} onChange={setMappingStatusFilter} options={[{ value: '', label: 'All statuses' }, { value: 'CONFIRMED', label: 'Confirmed' }, { value: 'REVIEWED', label: 'Reviewed' }, { value: 'SUGGESTED', label: 'Suggested' }, { value: 'REJECTED', label: 'Rejected' }]} />
          </div>
          {mappings.length === 0 ? (
            <EmptyState message="No topic mappings found. Map questions to syllabus topics after ingestion." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  {['Question', 'Marks', 'Topic', 'Method', 'Status', 'Confidence', ''].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-surface-500">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="px-4 py-3 text-surface-900 max-w-xs">{truncate(m.question.text, 80)}</td>
                    <td className="px-4 py-3 text-surface-500">{m.question.marks}</td>
                    <td className="px-4 py-3 text-primary-700">{m.topic.title}</td>
                    <td className="px-4 py-3 text-surface-500 text-xs">{m.method}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor(m.status)}`}>{m.status}</span></td>
                    <td className="px-4 py-3 text-surface-500">{m.confidence != null ? `${Math.round(m.confidence * 100)}%` : '—'}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" onClick={() => {
                        const next = m.status === 'SUGGESTED' ? 'REVIEWED' : m.status === 'REVIEWED' ? 'CONFIRMED' : 'SUGGESTED';
                        fetch(`/api/v1/gce/mappings/${m.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) })
                          .then(() => setMappings(prev => prev.map(x => x.id === m.id ? { ...x, status: next } : x)))
                          .catch(console.error);
                      }} className="text-xs">Cycle status</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Historical Analysis */}
      {activeTab === 'analysis' && (
        <div className="space-y-4">
          {loadingAnalysis ? <Spinner /> : analysis ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Imported papers" value={analysis.summary.importedPaperCount} sub="total across scope" />
                <StatCard label="Papers with mapped questions" value={analysis.summary.papersWithMappedQuestions} sub={`${analysis.summary.papersWithMappedQuestions / Math.max(1, analysis.summary.importedPaperCount) * 100 | 0}% coverage`} />
                <StatCard label="Mapped questions" value={analysis.summary.mappedQuestionCount} sub="with confirmed/reviewed links" />
                <StatCard label="Topics covered" value={`${analysis.summary.topicsCovered} / ${analysis.summary.totalSyllabusTopics}`} sub={`${analysis.summary.topicsWithoutMappedQuestions} unmapped`} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-surface-200 p-4">
                  <h3 className="font-semibold text-surface-900 mb-3">Years observed</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.summary.yearsObserved.map(y => (
                      <span key={y} className="px-2 py-1 bg-primary-50 text-primary-700 text-sm rounded-md font-mono">{y}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-surface-200 p-4">
                  <h3 className="font-semibold text-surface-900 mb-3">Mark range</h3>
                  <p className="text-3xl font-semibold text-surface-900">{analysis.summary.marksStats.min}–{analysis.summary.marksStats.max}</p>
                  <p className="text-sm text-surface-500">Mean: {analysis.summary.marksStats.mean}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-surface-200 p-4">
                <h3 className="font-semibold text-surface-900 mb-3">Top topics by historical occurrence</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200">
                        {['Topic', 'Code', 'Questions', 'Years', 'Avg Marks', 'Types', 'Verbs'].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-surface-500">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.byTopic.slice(0, 15).map((row) => (
                        <tr key={row.topicId} className="border-b border-surface-100 hover:bg-surface-50">
                          <td className="px-3 py-2 text-surface-900">{row.topicTitle}</td>
                          <td className="px-3 py-2 font-mono text-xs text-surface-500">{row.topicCode || '—'}</td>
                          <td className="px-3 py-2 text-surface-700">{row.questionCount}</td>
                          <td className="px-3 py-2 text-surface-500 text-xs">{row.yearsObserved.join(', ')}</td>
                          <td className="px-3 py-2 text-surface-700">{row.averageMarksPerQuestion}</td>
                          <td className="px-3 py-2 text-xs text-surface-500">{Object.entries(row.types).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ')}</td>
                          <td className="px-3 py-2 text-xs text-surface-500">{Object.entries(row.verbs).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {analysis.uncoveredTopics.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">Uncovered topics (no historical questions found)</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.uncoveredTopics.map(t => (
                      <span key={t.id} className="px-2 py-1 bg-white border border-amber-200 text-amber-800 text-xs rounded-md">{t.title}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState message="Run historical analysis by selecting a board & subject, then click 'Refresh Analysis'." />
          )}
        </div>
      )}

      {/* Search */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          {searchLoading ? <Spinner /> : searchResults ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                {searchResults.questions.length > 0 && (
                  <div className="bg-white rounded-lg border border-surface-200 p-4">
                    <h3 className="font-semibold text-surface-900 mb-3">Questions ({searchResults.questions.length})</h3>
                    {searchResults.questions.map(q => (
                      <div key={q.id} className="py-3 border-b border-surface-100 last:border-0">
                        <p className="text-surface-900 text-sm">{truncate(q.text, 200)}</p>
                        <div className="flex gap-3 mt-1 text-xs text-surface-500">
                          <span>{q.pastPaper.year}</span>
                          <span>·</span>
                          <span>{q.pastPaper.paperNumber}</span>
                          {q.mappings.length > 0 && <><span>·</span><span className="text-primary-600">{q.mappings.map(m => m.topic.title).slice(0, 2).join(', ')}</span></>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.papers.length > 0 && (
                  <div className="bg-white rounded-lg border border-surface-200 p-4">
                    <h3 className="font-semibold text-surface-900 mb-3">Papers ({searchResults.papers.length})</h3>
                    <div className="space-y-2">
                      {searchResults.papers.map(p => (
                        <div key={p.id} className="flex items-center gap-3 text-sm">
                          <span className="font-mono text-surface-500 w-16">{p.year}</span>
                          <span className="text-surface-700">{truncate(p.title, 60)}</span>
                          <span className="text-xs text-surface-400 ml-auto">{p.paperNumber}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {searchResults.topics.length > 0 && (
                <div className="bg-white rounded-lg border border-surface-200 p-4">
                  <h3 className="font-semibold text-surface-900 mb-3">Topics ({searchResults.topics.length})</h3>
                  <div className="space-y-2">
                    {searchResults.topics.map(t => (
                      <div key={t.id} className="text-sm text-surface-700 py-1 border-b border-surface-100 last:border-0">{t.title}</div>
                    ))}
                  </div>
                </div>
              )}
              {searchResults.questions.length === 0 && searchResults.papers.length === 0 && searchResults.topics.length === 0 && (
                <EmptyState message="No results found for your query." />
              )}
            </div>
          ) : (
            <div className="text-center py-16 bg-surface-50 rounded-xl border border-dashed border-surface-200">
              <p className="text-surface-500 text-sm">Search across past-paper questions, topics, and papers.</p>
              <p className="text-surface-400 text-xs mt-2">Press Enter to search after typing.</p>
            </div>
          )}
        </div>
      )}

      {/* Question Bank */}
      {activeTab === 'bank' && (
        <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
            <span className="text-sm font-medium text-surface-700">Question bank ({bankTotal} items)</span>
            <Button variant="ghost" onClick={() => { setIngestModal('bank'); setRawText(''); setIngestMeta({}); setIngestResult(null); setIngestError(null); }} className="text-xs">+ Add from paper</Button>
          </div>
          {bankItems.length === 0 ? (
            <EmptyState message="Question bank is empty." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  {['Question', 'Marks', 'Topic', 'Type', 'Verb', 'Difficulty', 'Year'].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-surface-500">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {bankItems.map((item) => (
                  <tr key={item.id} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="px-4 py-3 text-surface-900 max-w-xs">{truncate(item.questionText, 80)}</td>
                    <td className="px-4 py-3 text-surface-500">{item.marks ?? '—'}</td>
                    <td className="px-4 py-3 text-primary-700">{item.topic || '—'}</td>
                    <td className="px-4 py-3 text-surface-500">{item.questionType || '—'}</td>
                    <td className="px-4 py-3 text-surface-500 text-xs">{item.commandVerb || '—'}</td>
                    <td className="px-4 py-3 text-surface-500">{item.difficulty || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-500">{item.year || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Mock Exams */}
      {activeTab === 'mock' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockExams.length === 0 ? (
            <EmptyState message="No mock exams created yet." onAction={() => { setIngestModal('mock'); setRawText(''); setIngestMeta({}); setIngestResult(null); setIngestError(null); }} />
          ) : mockExams.map((m) => (
            <div key={m.id} className="bg-white rounded-lg border border-surface-200 p-4">
              <h3 className="font-semibold text-surface-900">{m.title}</h3>
              <p className="text-xs text-surface-500 mt-1">{m.questions.length} questions · {m.totalMarks} marks</p>
              {m.duration && <p className="text-xs text-surface-400 mt-1">{m.duration} minutes</p>}
              <Button variant="ghost" className="mt-3 text-xs" onClick={() => { setIngestModal('add-mock-q'); setIngestMeta({ mockExamId: m.id }); setRawText(''); setIngestResult(null); setIngestError(null); }}>+ Add question</Button>
            </div>
          ))}
        </div>
      )}

      {/* Ingest modal */}
      <Modal open={!!ingestModal} onClose={() => { setIngestModal(null); setRawText(''); setIngestResult(null); setIngestError(null); }} title={
        ingestModal === 'paper' ? 'Ingest Past Paper' :
        ingestModal === 'syllabus' ? 'Ingest Syllabus' :
        ingestModal === 'marking' ? 'Ingest Marking Scheme' :
        ingestModal === 'bank' ? 'Add to Question Bank' :
        ingestModal === 'mock' ? 'Create Mock Exam' :
        'Ingest'
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Metadata</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Title" value={ingestMeta.title || ''} onChange={e => setIngestMeta(m => ({ ...m, title: e.target.value }))} className="px-3 py-2 border border-surface-200 rounded-lg text-sm" />
              {ingestModal === 'paper' && <input type="number" placeholder="Year" value={ingestMeta.year || ''} onChange={e => setIngestMeta(m => ({ ...m, year: e.target.value }))} className="px-3 py-2 border border-surface-200 rounded-lg text-sm" />}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Raw text / PDF extraction</label>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={12}
              placeholder={
                ingestModal === 'paper' ? 'Paste extracted paper text here (sections, questions, parts)…' :
                ingestModal === 'syllabus' ? 'Paste syllabus text here (topics, sections, codes)…' :
                ingestModal === 'marking' ? 'Paste marking-scheme text here (points, marks, labels)…' :
                ingestModal === 'bank' ? 'Paste the full question text here.' :
                'Enter exam name for the mock exam title.'
              }
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm font-mono bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {ingestError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{ingestError}</p>}
          {ingestResult && <pre className="text-xs bg-surface-900 text-green-400 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">{ingestResult}</pre>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setIngestModal(null); setRawText(''); setIngestResult(null); setIngestError(null); }}>Cancel</Button>
            <Button onClick={() => handleIngest(ingestModal || 'paper')}>Ingest</Button>
          </div>
        </div>
      </Modal>

      {/* Paper detail modal */}
      <Modal open={!!selectedPaper} onClose={() => { setSelectedPaper(null); setPaperDetail(null); }} title={
        selectedPaper ? `${selectedPaper.year} ${selectedPaper.paperNumber || ''} — ${selectedPaper.title}` : ''
      }>
        {paperDetail ? (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-surface-700 mb-2">Questions ({paperDetail.questions.length})</h4>
              {paperDetail.questions.map((q) => (
                <div key={q.id} className="bg-surface-50 rounded-lg p-3 mb-2 border border-surface-200">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded">Q{q.questionNumber}</span>
                    <span className="text-xs text-surface-500">{q.marks} marks · {q.questionType}</span>
                  </div>
                  <p className="text-sm text-surface-900 mt-2">{truncate(q.text, 300)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs bg-surface-200 px-2 py-0.5 rounded text-surface-700">{q.commandVerb}</span>
                    {q.section && <span className="text-xs bg-surface-200 px-2 py-0.5 rounded text-surface-700">{q.section}</span>}
                  </div>
                  {q.parts.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-primary-600 cursor-pointer">Parts ({q.parts.length})</summary>
                      {q.parts.map((p, i) => (
                        <div key={i} className="text-xs text-surface-600 mt-1 pl-4">{p.label || `part ${i + 1}`}: {truncate(p.text, 150)}</div>
                      ))}
                    </details>
                  )}
                  {q.mappings.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-surface-500">Topics: </span>
                      {q.mappings.map((m, i) => (
                        <span key={i} className={`text-xs ml-1 px-2 py-0.5 rounded-full ${badgeColor(m.status)}`}>{m.topic.title}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-200">
              <Button variant="secondary" onClick={() => { setIngestModal('marking'); setIngestMeta({}); setRawText(''); setIngestResult(null); setIngestError(null); }}>Ingest marking scheme</Button>
              <Button onClick={() => { setSelectedPaper(null); setPaperDetail(null); }}>Close</Button>
            </div>
          </div>
        ) : <Spinner />}
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

interface Source {
  id: string;
  name: string;
  type: string;
  mimeType?: string;
  sizeBytes: number;
  status: string;
  contentPreview?: string;
  metadata?: Record<string, unknown>;
  _count?: { chunks: number; citations: number; evidenceItems: number };
  createdAt: string;
  updatedAt: string;
}

interface ResearchNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  sources: string[];
  createdAt: string;
  updatedAt: string;
}

interface ResearchQuestion {
  id: string;
  question: string;
  hypothesis?: string;
  status: string;
  _count?: { evidenceItems: number };
  createdAt: string;
}

export default function Research() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<'sources' | 'questions' | 'notes'>('sources');
  const [sources, setSources] = useState<Source[]>([]);
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [questions, setQuestions] = useState<ResearchQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);

  // Load data when component mounts or projectId changes
  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sources
      const sourcesRes = await fetch(`/api/v1/sources?projectId=${projectId}`);
      const sourcesData = await sourcesRes.json();
      if (sourcesData.success) setSources(sourcesData.data);

      // Fetch notes
      const notesRes = await fetch(`/api/v1/research/notes?projectId=${projectId}`);
      const notesData = await notesRes.json();
      if (notesData.success) setNotes(notesData.data);

      // Fetch questions
      const questionsRes = await fetch(`/api/v1/research/questions?projectId=${projectId}`);
      const questionsData = await questionsRes.json();
      if (questionsData.success) setQuestions(questionsData.data);
    } catch (error) {
      console.error('Failed to fetch research data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !projectId) return;

    try {
      const response = await fetch(
        `/api/v1/research/search?projectId=${projectId}&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      if (data.success) setSearchResults(data.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      UPLOADED: 'badge-info',
      PROCESSING: 'badge-warning',
      PROCESSED: 'badge-success',
      ERROR: 'badge-error',
      DELETED: 'badge-default',
    };
    return `badge badge-${styles[status] || 'default'}`;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      PDF: '📕',
      DOCX: '📘',
      TXT: '📄',
      MARKDOWN: '📝',
      CSV: '📊',
      XLSX: '📈',
      IMAGE: '🖼️',
      NOTE: '📌',
    };
    return icons[type] || '📄';
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;
    
    try {
      const response = await fetch(`/api/v1/sources/${sourceId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setSources(sources.filter(s => s.id !== sourceId));
      }
    } catch (error) {
      console.error('Failed to delete source:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Research Workspace</h1>
        <Link 
          to={`/projects/${projectId}/new-source`}
          className="btn-primary"
        >
          + Add Source
        </Link>
      </div>

      {/* Search Bar */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sources, notes, and questions..."
            className="input flex-1"
          />
          <button type="submit" className="btn-primary">
            🔍 Search
          </button>
        </form>

        {searchResults && (
          <div className="mt-4 p-4 bg-surface-50 rounded-lg">
            <p className="text-sm text-surface-600">
              Found {searchResults.total} results
            </p>
            {searchResults.sources?.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Sources:</p>
                {searchResults.sources.map((s: any) => (
                  <p key={s.id} className="text-sm text-surface-700">• {s.name}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-200">
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'sources'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-surface-500 hover:text-surface-700'
          }`}
        >
          Sources ({sources.length})
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'questions'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-surface-500 hover:text-surface-700'
          }`}
        >
          Questions ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'notes'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-surface-500 hover:text-surface-700'
          }`}
        >
          Notes ({notes.length})
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card text-center py-8">
          <p className="text-surface-500">Loading...</p>
        </div>
      )}

      {/* Sources Tab */}
      {!loading && activeTab === 'sources' && (
        <div className="space-y-4">
          {sources.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-lg font-medium text-surface-600">No sources yet</p>
              <p className="text-sm text-surface-400 mt-1">Upload PDFs, DOCX, TXT, or Markdown files</p>
            </div>
          ) : (
            sources.map((source) => (
              <div key={source.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getTypeIcon(source.type)}</span>
                    <div>
                      <h3 className="font-medium text-surface-900">{source.name}</h3>
                      <p className="text-sm text-surface-500">
                        {source.type} • {formatFileSize(source.sizeBytes)} • Uploaded {new Date(source.createdAt).toLocaleDateString()}
                      </p>
                      {source.contentPreview && (
                        <p className="text-sm text-surface-600 mt-1 line-clamp-2">
                          {source.contentPreview.substring(0, 200)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getStatusBadge(source.status)}>{source.status}</span>
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-sm text-surface-500">
                  {source._count?.chunks > 0 && (
                    <span>📑 {source._count.chunks} chunks</span>
                  )}
                  {source._count?.citations > 0 && (
                    <span>📎 {source._count.citations} citations</span>
                  )}
                  {source._count?.evidenceItems > 0 && (
                    <span>🔗 {source._count.evidenceItems} evidence items</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Questions Tab */}
      {!loading && activeTab === 'questions' && (
        <div className="space-y-4">
          <button className="btn-secondary w-full py-3 border-dashed border-2">
            + New Research Question
          </button>
          
          {questions.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">❓</p>
              <p className="text-lg font-medium text-surface-600">No research questions</p>
              <p className="text-sm text-surface-400 mt-1">Define your research questions to guide your investigation</p>
            </div>
          ) : (
            questions.map((question) => (
              <div key={question.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-surface-900">{question.question}</h3>
                    {question.hypothesis && (
                      <p className="text-sm text-surface-600 mt-1">
                        <span className="font-medium">Hypothesis:</span> {question.hypothesis}
                      </p>
                    )}
                  </div>
                  <span className={`badge badge-${question.status === 'ANSWERED' ? 'success' : question.status === 'IN_PROGRESS' ? 'warning' : 'info'}`}>
                    {question.status}
                  </span>
                </div>
                {question._count?.evidenceItems > 0 && (
                  <p className="text-sm text-surface-500 mt-2">
                    🔗 {question._count.evidenceItems} evidence item{question._count.evidenceItems > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Notes Tab */}
      {!loading && activeTab === 'notes' && (
        <div className="space-y-4">
          <button className="btn-secondary w-full py-3 border-dashed border-2">
            + New Research Note
          </button>
          
          {notes.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-lg font-medium text-surface-600">No research notes</p>
              <p className="text-sm text-surface-400 mt-1">Capture insights and connect them to your sources</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-surface-900">{note.title}</h3>
                    <p className="text-sm text-surface-600 mt-1 line-clamp-2">{note.content}</p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {note.tags.map((tag, idx) => (
                          <span key={idx} className="badge badge-info text-xs">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-surface-400">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

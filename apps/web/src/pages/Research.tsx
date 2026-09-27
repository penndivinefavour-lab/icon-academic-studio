export default function Research() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-surface-900">Research Workspace</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Upload Sources</h2>
          <p className="text-surface-500 text-sm mb-4">
            Import PDFs, DOCX, TXT, Markdown, CSV, and XLSX files for research
          </p>
          <button className="btn-secondary w-full py-3 border-dashed border-2">
            📤 Upload Files
          </button>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Research Notes</h2>
          <p className="text-surface-500 text-sm mb-4">
            Capture insights and connect them to your sources
          </p>
          <button className="btn-secondary w-full py-3 border-dashed border-2">
            📝 Write Note
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-surface-900 mb-3">Research Questions</h2>
        <p className="text-surface-400 text-sm">No research questions defined yet</p>
      </div>
    </div>
  );
}

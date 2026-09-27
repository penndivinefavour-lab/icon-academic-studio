export default function Documents() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Documents</h1>
        <button className="btn-primary">+ New Document</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { type: 'Book Chapter', icon: '📖', count: 0 },
          { type: 'Research Paper', icon: '📄', count: 0 },
          { type: 'Thesis', icon: '🎓', count: 0 },
          { type: 'Exam Paper', icon: '✍️', count: 0 },
          { type: 'Study Guide', icon: '📚', count: 0 },
          { type: 'Report', icon: '📊', count: 0 },
        ].map((doc) => (
          <div key={doc.type} className="card">
            <div className="flex items-start justify-between">
              <span className="text-3xl">{doc.icon}</span>
              <span className="badge badge-info">{doc.count}</span>
            </div>
            <p className="mt-3 font-medium text-surface-900">{doc.type}</p>
            <p className="text-sm text-surface-500 mt-1">
              {doc.count === 0 ? 'No documents yet' : `${doc.count} document${doc.count > 1 ? 's' : ''}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

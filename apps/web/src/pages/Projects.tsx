export default function Projects() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Projects</h1>
        <button className="btn-primary">+ New Project</button>
      </div>

      <div className="card">
        <div className="text-center py-12 text-surface-400">
          <p className="text-4xl mb-3">📁</p>
          <p className="text-lg font-medium text-surface-600">No projects yet</p>
          <p className="text-sm mt-1">Create your first research project to get started</p>
        </div>
      </div>
    </div>
  );
}

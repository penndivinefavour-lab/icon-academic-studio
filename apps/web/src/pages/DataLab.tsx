export default function DataLab() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-surface-900">Data Lab</h1>

      <div className="card">
        <h2 className="text-lg font-semibold text-surface-900 mb-3">Upload Dataset</h2>
        <p className="text-surface-500 text-sm mb-4">
          Import CSV or Excel files for analysis
        </p>
        <button className="btn-secondary py-3 px-6 border-dashed border-2">
          📤 Import Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Analysis Tools</h2>
          <ul className="space-y-2 text-sm text-surface-600">
            <li className="flex items-center gap-2">📊 Descriptive Statistics</li>
            <li className="flex items-center gap-2">📈 Frequency Tables</li>
            <li className="flex items-center gap-2">🔀 Cross-tabulation</li>
            <li className="flex items-center gap-2">📉 Chart Generation</li>
          </ul>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Charts & Tables</h2>
          <p className="text-surface-400 text-sm">No visualizations created yet</p>
        </div>
      </div>
    </div>
  );
}

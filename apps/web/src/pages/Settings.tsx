export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-surface-900">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">General</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Language</label>
              <select className="input">
                <option>English (UK)</option>
                <option>English (US)</option>
                <option>French</option>
                <option>Spanish</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Default Citation Style</label>
              <select className="input">
                <option>APA 7th Edition</option>
                <option>MLA 9th Edition</option>
                <option>Chicago</option>
                <option>Harvard</option>
                <option>IEEE</option>
                <option>GB/T 7714</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Security</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">API Base URL</label>
              <input type="text" className="input" placeholder="http://localhost:4000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Environment
              </label>
              <div className="px-3 py-2 bg-surface-100 rounded-lg text-sm text-surface-600">
                Development
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Formatting Defaults</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Page Size</label>
              <select className="input">
                <option>A4</option>
                <option>Letter</option>
                <option>A5</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Font Family</label>
              <select className="input">
                <option>Georgia (Serif)</option>
                <option>Times New Roman</option>
                <option>Cambria</option>
                <option>Arial (Sans-serif)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">About</h2>
          <div className="space-y-2 text-sm text-surface-600">
            <p><strong>Version:</strong> 0.1.0 (Phase 1 - Foundation)</p>
            <p><strong>Built with:</strong> TypeScript, React, Express, Prisma</p>
            <p><strong>Architecture:</strong> Modular Monolith</p>
            <div className="pt-4 border-t border-surface-200">
              <p className="text-surface-500">
                ICON Academic Studio is designed for private academic research and document production.
                All data stays local unless explicitly configured otherwise.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

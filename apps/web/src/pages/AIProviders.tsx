export default function AIProviders() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">AI Providers</h1>
        <button className="btn-primary">+ Add Provider</button>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-surface-900 mb-3">Available Providers</h2>
        <p className="text-surface-500 text-sm mb-4">
          Configure AI providers for content generation and analysis
        </p>
        
        <div className="space-y-3">
          {[
            { name: 'Gemini', status: 'Not configured', icon: '🔷' },
            { name: 'OpenAI', status: 'Not configured', icon: '🟢' },
            { name: 'OpenRouter', status: 'Not configured', icon: '🔶' },
            { name: 'Ollama', status: 'Not configured', icon: '🦙' },
            { name: 'Custom Endpoint', status: 'Not configured', icon: '⚙️' },
          ].map((provider) => (
            <div key={provider.name} className="flex items-center justify-between p-4 rounded-lg bg-surface-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{provider.icon}</span>
                <div>
                  <p className="font-medium text-surface-900">{provider.name}</p>
                  <p className="text-sm text-surface-500">{provider.status}</p>
                </div>
              </div>
              <button className="btn-secondary text-sm">Configure</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-surface-900 mb-3">Security Notice</h2>
        <p className="text-sm text-surface-600">
          API keys are stored securely and never committed to version control. 
          Use environment variables or secure secret storage for production deployments.
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Research from './pages/Research';
import Documents from './pages/Documents';
import DataLab from './pages/DataLab';
import Templates from './pages/Templates';
import AIProviders from './pages/AIProviders';
import Settings from './pages/Settings';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/projects', label: 'Projects', icon: '📁' },
    { path: '/research', label: 'Research', icon: '🔍' },
    { path: '/documents', label: 'Documents', icon: '📄' },
    { path: '/data-lab', label: 'Data Lab', icon: '📈' },
    { path: '/templates', label: 'Templates', icon: '📋' },
    { path: '/ai-providers', label: 'AI Providers', icon: '🤖' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-surface-50">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-16'
          } bg-white border-r border-surface-200 flex flex-col transition-all duration-200`}
        >
          {/* Logo */}
          <div className="p-4 border-b border-surface-200">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                I
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="font-semibold text-surface-900">ICON Academic</h1>
                  <p className="text-xs text-surface-500">Studio</p>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-surface-600 hover:bg-surface-100 hover:text-surface-900 transition-colors"
                  >
                    <span className="text-xl">{item.icon}</span>
                    {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Toggle */}
          <div className="p-4 border-t border-surface-200">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full px-3 py-2 text-sm text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? '← Collapse' : '→'}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Header */}
          <header className="bg-white border-b border-surface-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900">
                {navItems.find((item) => item.path === window.location.pathname)?.label || 'Dashboard'}
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-surface-500">Private Research Workspace</span>
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium text-sm">
                  DI
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/research" element={<Research />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/data-lab" element={<DataLab />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/ai-providers" element={<AIProviders />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

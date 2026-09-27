import { Link } from 'react-router-dom';

export default function Dashboard() {
  const stats = [
    { label: 'Projects', value: '0', change: '+0 this month', color: 'blue' },
    { label: 'Sources', value: '0', change: 'Awaiting uploads', color: 'green' },
    { label: 'Documents', value: '0', change: 'No documents yet', color: 'purple' },
    { label: 'Datasets', value: '0', change: 'Ready for analysis', color: 'orange' },
  ];

  const recentProjects = [];
  const quickActions = [
    { label: 'Create New Project', path: '/projects/new', icon: '➕' },
    { label: 'Upload Source', path: '/research/upload', icon: '📤' },
    { label: 'Start Analysis', path: '/data-lab', icon: '📊' },
    { label: 'Configure AI', path: '/ai-providers', icon: '🤖' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="card">
        <h1 className="text-2xl font-bold text-surface-900 mb-2">Welcome to ICON Academic Studio</h1>
        <p className="text-surface-600">
          Research. Learn. Create. Publish. Your private academic production environment is ready.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-sm text-surface-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-surface-900">{stat.value}</p>
            <p className="text-xs text-surface-400 mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-surface-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-center"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-surface-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">Recent Projects</h2>
        {recentProjects.length === 0 ? (
          <div className="text-center py-8 text-surface-400">
            <p className="text-4xl mb-2">📭</p>
            <p>No projects yet. Create your first project to get started.</p>
            <Link to="/projects/new" className="mt-4 inline-block btn-primary">
              Create Project
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
                <div>
                  <p className="font-medium text-surface-900">{project.name}</p>
                  <p className="text-sm text-surface-500">{project.type}</p>
                </div>
                <span className={`badge badge-${project.status.toLowerCase()}`}>{project.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

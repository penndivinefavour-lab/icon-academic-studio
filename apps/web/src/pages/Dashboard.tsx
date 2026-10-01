import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API = '/api/v1';

interface Stats {
  projects: number;
  sources: number;
  documents: number;
  datasets: number;
}

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

interface NextAction {
  action: string;
  description: string;
  reason: string;
  category: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ projects: 0, sources: 0, documents: 0, datasets: 0 });
  const [projects, setProjects] = useState<Project[]>([]);
  const [nextActions, setNextActions] = useState<Record<string, NextAction>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch stats
        const [projectsRes, sourcesRes, documentsRes, datasetsRes] = await Promise.all([
          axios.get(`${API}/projects`),
          axios.get(`${API}/sources`),
          axios.get(`${API}/documents`),
          axios.get(`${API}/datasets`),
        ]);

        setStats({
          projects: projectsRes.data.meta?.total || projectsRes.data.data?.length || 0,
          sources: sourcesRes.data.data?.length || 0,
          documents: documentsRes.data.data?.length || 0,
          datasets: datasetsRes.data.data?.length || 0,
        });

        setProjects(projectsRes.data.data?.slice(0, 5) || []);
      } catch (e: any) {
        setError(e.response?.data?.error?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch next actions for each project
  useEffect(() => {
    if (projects.length === 0) return;

    const fetchNextActions = async () => {
      const actions: Record<string, NextAction> = {};
      for (const project of projects) {
        try {
          const res = await axios.get(`${API}/activities/project/${project.id}/next-action`);
          if (res.data.success) {
            actions[project.id] = res.data.data;
          }
        } catch {
          // Skip if no action available
        }
      }
      setNextActions(actions);
    };

    fetchNextActions();
  }, [projects]);

  const quickActions = [
    { label: 'New Project', path: '/academic-studio', icon: '📁', color: 'blue' },
    { label: 'Upload Source', path: '/research', icon: '📤', color: 'green' },
    { label: 'Data Lab', path: '/data-lab', icon: '📊', color: 'purple' },
    { label: 'AI Workspace', path: '/ai', icon: '🤖', color: 'yellow' },
  ];

  const getActionColor = (category: string) => {
    const colors: Record<string, string> = {
      research: 'bg-blue-100 text-blue-700',
      methodology: 'bg-purple-100 text-purple-700',
      data: 'bg-green-100 text-green-700',
      writing: 'bg-yellow-100 text-yellow-700',
      review: 'bg-orange-100 text-orange-700',
      publishing: 'bg-red-100 text-red-700',
    };
    return colors[category] || 'bg-surface-100 text-surface-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-surface-900 mb-2">Welcome to ICON Academic Studio</h1>
        <p className="text-surface-600">
          Research. Learn. Create. Publish. Your private academic production environment is ready.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Projects', value: stats.projects, change: 'active', color: 'blue' },
          { label: 'Sources', value: stats.sources, change: 'uploaded', color: 'green' },
          { label: 'Documents', value: stats.documents, change: 'created', color: 'purple' },
          { label: 'Datasets', value: stats.datasets, change: 'analyzed', color: 'yellow' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
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

      {/* Recent Projects with Next Actions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">Recent Projects</h2>
          <Link to="/academic-studio" className="text-sm text-primary-600 hover:underline">
            View all
          </Link>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center py-12 text-surface-400">
            <p className="text-4xl mb-3">📁</p>
            <p className="text-lg font-medium text-surface-600">No projects yet</p>
            <p className="text-sm mt-1">Create your first research project to get started</p>
            <Link to="/academic-studio" className="mt-4 inline-block btn-primary">
              Create Project
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/academic-studio`}
                className="flex items-center justify-between p-4 rounded-lg bg-surface-50 hover:bg-surface-100 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-surface-900">{project.name}</p>
                  <p className="text-sm text-surface-500">{project.type}</p>
                </div>
                <div className="flex items-center gap-4">
                  {nextActions[project.id] && (
                    <div className="hidden md:block text-right">
                      <p className={`text-xs font-medium px-2 py-1 rounded-full inline-block ${getActionColor(nextActions[project.id].category)}`}>
                        {nextActions[project.id].action}
                      </p>
                    </div>
                  )}
                  <span className={`badge badge-${project.status.toLowerCase()}`}>{project.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* All Projects Overview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">All Projects</h2>
          <Link to="/projects" className="text-sm text-primary-600 hover:underline">
            Manage
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-2 px-3 text-surface-500 font-medium">Project</th>
                <th className="text-left py-2 px-3 text-surface-500 font-medium">Type</th>
                <th className="text-left py-2 px-3 text-surface-500 font-medium">Status</th>
                <th className="text-left py-2 px-3 text-surface-500 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-surface-400">
                    No projects found
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="py-3 px-3 font-medium text-surface-900">{project.name}</td>
                    <td className="py-3 px-3 text-surface-600">{project.type}</td>
                    <td className="py-3 px-3">
                      <span className={`badge badge-${project.status.toLowerCase()}`}>{project.status}</span>
                    </td>
                    <td className="py-3 px-3 text-surface-500">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * ICON Academic Studio — Project Command Center (Phase 9)
 *
 * Unified workflow view showing progress, materials, AI activity, and next actions.
 * Connects all modules into a coherent academic production environment.
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = '/api/v1';

interface AcademicProject {
  id: string;
  title: string;
  projectType: string;
  status: string;
  chapterCount: number;
  objectivesCount: number;
  findingsCount: number;
  sourcesCount: number;
  datasetsCount: number;
  publicationCount: number;
}

interface NextAction {
  action: string;
  description: string;
  reason: string;
  category: 'research' | 'methodology' | 'data' | 'writing' | 'review' | 'publishing';
}

interface MaterialItem {
  id: string;
  type: string;
  title: string;
  count?: number;
}

interface WorkflowStage {
  stage: string;
  label: string;
  completed: boolean;
  active: boolean;
}

export default function ProjectCommandCenter({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<AcademicProject | null>(null);
  const [nextAction, setNextAction] = useState<NextAction | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch project data
  const fetchProject = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/academic-projects`, {
        params: { projectId }
      });
      const ap = res.data.data?.[0];
      if (ap) {
        setProject(ap);
        await fetchNextAction(projectId);
        await fetchMaterials(projectId);
        setWorkflow(calculateWorkflow(ap));
      }
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch next action
  const fetchNextAction = async (pid: string) => {
    try {
      const res = await axios.get(`${API_BASE}/activities/project/${pid}/next-action`);
      if (res.data.success) {
        setNextAction(res.data.data);
      }
    } catch {
      // No action available
    }
  };

  // Fetch materials summary
  const fetchMaterials = async (pid: string) => {
    try {
      const [sourcesRes, datasetsRes, docsRes, pubsRes] = await Promise.all([
        axios.get(`${API_BASE}/sources`, { params: { projectId: pid } }),
        axios.get(`${API_BASE}/datasets`, { params: { projectId: pid } }),
        axios.get(`${API_BASE}/documents`, { params: { projectId: pid } }),
        axios.get(`${API_BASE}/publishing/publications`, { params: { projectId: pid } }),
      ]);

      setMaterials([
        { id: '1', type: 'sources', title: 'Research Sources', count: sourcesRes.data.data?.length || 0 },
        { id: '2', type: 'evidence', title: 'Evidence Items', count: 0 },
        { id: '3', type: 'datasets', title: 'Datasets', count: datasetsRes.data.data?.length || 0 },
        { id: '4', type: 'analyses', title: 'Analyses', count: 0 },
        { id: '5', type: 'documents', title: 'Documents', count: docsRes.data.data?.length || 0 },
        { id: '6', type: 'publications', title: 'Publications', count: pubsRes.data.data?.length || 0 },
      ]);
    } catch {
      // Ignore material fetch errors
    }
  };

  // Calculate workflow stages
  const calculateWorkflow = (proj: AcademicProject): WorkflowStage[] => {
    return [
      { stage: 'discover', label: 'Discover', completed: true, active: false },
      { stage: 'research', label: 'Research', completed: proj.objectivesCount > 0, active: true },
      { stage: 'plan', label: 'Plan', completed: proj.chapterCount > 0, active: proj.findingsCount === 0 },
      { stage: 'collect', label: 'Collect', completed: proj.sourcesCount > 0, active: false },
      { stage: 'analyze', label: 'Analyze', completed: false, active: false },
      { stage: 'write', label: 'Write', completed: proj.findingsCount > 0, active: proj.findingsCount === 0 },
      { stage: 'review', label: 'Review', completed: false, active: false },
      { stage: 'publish', label: 'Publish', completed: false, active: false },
      { stage: 'export', label: 'Export', completed: false, active: false },
    ];
  };

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  if (loading) {
    return <div className="p-8 text-surface-500">Loading project command center...</div>;
  }

  if (!project) {
    return <div className="p-8 text-red-500">Project not found</div>;
  }

  const completionPercentage = calculateCompletion(project);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{project.title}</h1>
          <p className="text-sm text-surface-500 mt-1">
            {project.projectType} · {project.status}
          </p>
        </div>
        <span className="badge badge-primary">Command Center</span>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <p className="text-sm text-surface-500 mb-2">Project Progress</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-surface-900">{completionPercentage}%</span>
            <span className="text-surface-500 mb-1">complete</span>
          </div>
          <div className="mt-3 w-full bg-surface-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="card p-6">
          <p className="text-sm text-surface-500 mb-2">Next Action</p>
          {nextAction ? (
            <>
              <p className="font-semibold text-surface-900">{nextAction.action}</p>
              <p className="text-sm text-surface-600 mt-1">{nextAction.description}</p>
              <p className="text-xs text-surface-400 mt-2">{nextAction.reason}</p>
              <span className={`inline-block mt-3 text-xs font-medium px-2 py-1 rounded-full ${getCategoryColor(nextAction.category)}`}>
                {nextAction.category}
              </span>
            </>
          ) : (
            <p className="text-surface-500">No pending actions</p>
          )}
        </div>

        <div className="card p-6">
          <p className="text-sm text-surface-500 mb-2">Project Materials</p>
          <div className="space-y-2">
            {materials.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <span className="text-sm text-surface-700">{m.title}</span>
                <span className="text-sm font-medium text-surface-900">{m.count || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workflow Pipeline */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">Workflow Pipeline</h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {workflow.map((stage, idx) => (
            <div key={stage.stage} className="flex items-center">
              <div
                className={`flex flex-col items-center gap-2 px-3 py-2 rounded-lg min-w-[80px] ${
                  stage.active
                    ? 'bg-primary-100 border-2 border-primary-600'
                    : stage.completed
                    ? 'bg-green-100 border border-green-300'
                    : 'bg-surface-100 border border-surface-200'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${
                  stage.completed ? 'bg-green-500' : stage.active ? 'bg-primary-600 animate-pulse' : 'bg-surface-300'
                }`} />
                <span className={`text-xs font-medium ${
                  stage.active ? 'text-primary-700' : stage.completed ? 'text-green-700' : 'text-surface-500'
                }`}>
                  {stage.label}
                </span>
              </div>
              {idx < workflow.length - 1 && (
                <div className={`w-4 h-0.5 ${stage.completed ? 'bg-green-400' : 'bg-surface-300'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Materials Overview */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">Project Materials</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {materials.map((m) => (
            <div key={m.id} className="text-center p-4 bg-surface-50 rounded-lg">
              <p className="text-2xl font-bold text-surface-900">{m.count || 0}</p>
              <p className="text-xs text-surface-500 mt-1">{m.title}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

function calculateCompletion(project: AcademicProject): number {
  let score = 0;
  const max = 6;

  if (project.objectivesCount > 0) score++;
  if (project.chapterCount > 0) score++;
  if (project.sourcesCount > 0) score++;
  if (project.datasetsCount > 0) score++;
  if (project.findingsCount > 0) score++;
  if (project.publicationCount > 0) score++;

  return Math.round((score / max) * 100);
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    research: 'bg-blue-100 text-blue-700',
    methodology: 'bg-purple-100 text-purple-700',
    data: 'bg-green-100 text-green-700',
    writing: 'bg-yellow-100 text-yellow-700',
    review: 'bg-orange-100 text-orange-700',
    publishing: 'bg-red-100 text-red-700',
  };
  return colors[category] || 'bg-surface-100 text-surface-700';
}

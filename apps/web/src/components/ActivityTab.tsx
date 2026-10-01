/**
 * ICON Academic Studio — Activity Tab Component (Phase 9.1)
 *
 * Displays chronological project activity from the activity API.
 * Shows human-readable descriptions without exposing sensitive data.
 */
import { useState, useEffect } from 'react';
import axios from 'axios';

interface ActivityEvent {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  createdAt: string;
}

interface ActivityResponse {
  success: boolean;
  data: ActivityEvent[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export default function ActivityTab({ projectId }: { projectId: string }) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchActivities = async (pageNum: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get<{ success: boolean; data: ActivityEvent[]; meta: any }>(
        `/api/v1/activities/project/${projectId}`,
        { params: { limit: 20, offset: (pageNum - 1) * 20 } }
      );
      
      if (res.data.success) {
        setActivities(res.data.data);
        setTotalPages(res.data.meta.totalPages);
        setTotal(res.data.meta.total);
        setPage(pageNum);
      } else {
        setError('Failed to load activity');
      }
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(1);
  }, [projectId]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchActivities(newPage);
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      PROJECT_CREATED: 'badge-success',
      CHAPTER_CREATED: 'badge-info',
      SOURCE_ATTACHED: 'badge-warning',
      AI_GENERATED: 'badge-purple',
      CONTENT_VERIFIED: 'badge-success',
      CONTENT_REJECTED: 'badge-error',
      DOCUMENT_SYNCED: 'badge-primary',
      EXPORT_CREATED: 'badge-success',
    };
    return colors[action] || 'badge-info';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && activities.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-surface-400">Loading activity...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Failed to load activity</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
          <button 
            className="mt-3 text-sm text-red-700 hover:text-red-900 underline"
            onClick={() => fetchActivities(1)}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-lg font-medium text-surface-600">No activity yet</p>
        <p className="text-sm text-surface-500 mt-2">
          Project actions will appear here as you work.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-surface-900">Project Activity</h3>
        <span className="text-sm text-surface-500">{total} events</span>
      </div>

      {/* Activity List */}
      <div className="space-y-2">
        {activities.map((activity) => (
          <div key={activity.id} className="card p-4 flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-2 ${getActionBadge(activity.action).replace('badge-', 'bg-').replace('-500', '-500')}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getActionBadge(activity.action)}`}>
                  {activity.action.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-surface-400">{activity.entityType}</span>
              </div>
              <p className="mt-1 text-sm text-surface-700">{activity.description}</p>
              <p className="text-xs text-surface-400 mt-1">{formatTime(activity.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-surface-200">
          <p className="text-sm text-surface-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-sm px-3 py-1"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </button>
            <button
              className="btn-secondary text-sm px-3 py-1"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

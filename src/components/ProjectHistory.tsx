import React from 'react';
import { History, ExternalLink, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { ProjectHistory as ProjectHistoryType } from '@/types';
import { clearHistory } from '@/lib/storage';
import { GitBranch } from 'lucide-react';

interface ProjectHistoryProps {
  projects: ProjectHistoryType[];
  onClearHistory: () => void;
  onOpenRepoManager: () => void; // NEW!
}

export const ProjectHistory: React.FC<ProjectHistoryProps> = ({ projects, onClearHistory, onOpenRepoManager }) => {
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all project history?')) {
      clearHistory();
      onClearHistory();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-72 border-r border-zinc-800/50 bg-zinc-950/30 backdrop-blur-xl flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <History className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Recent Projects</h2>
          </div>
          <span className="text-xs text-zinc-500">{projects.length}</span>
        </div>
        
        {/* GitHub Repo Manager Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenRepoManager}
          className="w-full text-xs text-zinc-400 hover:text-purple-400 h-8 mb-2"
        >
          <GitBranch className="h-3 w-3 mr-1" />
          Manage Repositories
        </Button>
        
        {projects.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="w-full text-xs text-zinc-400 hover:text-red-400 h-7"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <History className="h-10 w-10 text-zinc-700 mb-3" />
            <p className="text-xs text-zinc-500">No projects yet</p>
            <p className="text-xs text-zinc-600 mt-1">Start building!</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="group relative bg-zinc-900/40 hover:bg-zinc-900/60 border border-zinc-800/50 hover:border-purple-500/30 rounded-lg p-3 transition-all duration-200 cursor-pointer"
            >
              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                {project.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                )}
              </div>

              {/* Project Name */}
              <h3 className="text-sm font-medium text-white mb-1 pr-6 truncate">
                {project.name}
              </h3>

              {/* Prompt Preview */}
              <p className="text-xs text-zinc-400 mb-2 line-clamp-2 leading-relaxed">
                {project.prompt}
              </p>

              {/* Quick Links */}
              {project.success && (
                <div className="flex items-center gap-1.5 mb-2">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-purple-400 bg-zinc-800/50 hover:bg-zinc-800 rounded transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Code
                    </a>
                  )}
                  {project.vercelUrl && (
                    <a
                      href={project.vercelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-purple-400 bg-zinc-800/50 hover:bg-zinc-800 rounded transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Live
                    </a>
                  )}
                  {project.supabaseUrl && (
                    <a
                      href={project.supabaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-purple-400 bg-zinc-800/50 hover:bg-zinc-800 rounded transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      DB
                    </a>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-zinc-600">
                {formatDate(project.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

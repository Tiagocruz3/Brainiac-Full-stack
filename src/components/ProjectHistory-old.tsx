import React from 'react';
import { History, ExternalLink, Github, Globe, Database, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { ProjectHistory as ProjectHistoryType } from '@/types';
import { formatDate } from '@/lib/utils';
import { clearHistory } from '@/lib/storage';

interface ProjectHistoryProps {
  projects: ProjectHistoryType[];
  onClearHistory: () => void;
}

export const ProjectHistory: React.FC<ProjectHistoryProps> = ({ projects, onClearHistory }) => {
  if (projects.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Project History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-zinc-500">
            <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No projects yet</p>
            <p className="text-sm mt-2">Start building to see your history here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all project history?')) {
      clearHistory();
      onClearHistory();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <History className="h-5 w-5" />
          <span>Recent Projects</span>
          <span className="text-sm font-normal text-zinc-400">({projects.length})</span>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-red-500/30 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-medium text-white mb-1">{project.name}</h3>
                <p className="text-sm text-zinc-400 line-clamp-2">{project.prompt}</p>
              </div>
              <div className={`shrink-0 ml-4 px-2 py-1 rounded-lg text-xs font-medium ${
                project.success 
                  ? 'bg-green-500/10 text-green-500' 
                  : 'bg-red-500/10 text-red-500'
              }`}>
                {project.success ? '✓ Success' : '✗ Failed'}
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-zinc-500 mb-3">
              <span>{formatDate(project.createdAt)}</span>
            </div>

            <div className="flex items-center space-x-2">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <Github className="h-3 w-3" />
                  <span>Code</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {project.vercelUrl && (
                <a
                  href={project.vercelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  <span>Live</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {project.supabaseUrl && (
                <a
                  href={project.supabaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <Database className="h-3 w-3" />
                  <span>Database</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

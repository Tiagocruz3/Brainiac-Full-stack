import React, { useState, useEffect } from 'react';
import { X, Trash2, ExternalLink, GitBranch, Calendar, Code, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';
import { listGithubRepos, deleteGithubRepo, GitHubRepo } from '@/lib/tools/github-manager';
import { loadSettings } from '@/lib/storage';

interface RepoManagerProps {
  onClose: () => void;
}

export const RepoManager: React.FC<RepoManagerProps> = ({ onClose }) => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRepos();
  }, []);

  const loadRepos = async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = loadSettings();
      
      if (!settings?.apiKeys.github?.token) {
        setError('GitHub token not configured');
        return;
      }

      const repoList = await listGithubRepos(settings.apiKeys.github.token);
      setRepos(repoList);
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (repo: GitHubRepo) => {
    if (!confirm(`⚠️ Are you sure you want to delete "${repo.name}"?\n\nThis action CANNOT be undone!`)) {
      return;
    }

    // Double confirmation for safety
    const confirmText = prompt(
      `Type the repository name "${repo.name}" to confirm deletion:`
    );

    if (confirmText !== repo.name) {
      alert('Repository name does not match. Deletion cancelled.');
      return;
    }

    try {
      setDeleting(repo.full_name);
      const settings = loadSettings();
      
      if (!settings?.apiKeys.github?.token) {
        throw new Error('GitHub token not configured');
      }

      await deleteGithubRepo(repo.full_name, settings.apiKeys.github.token);
      
      // Remove from list
      setRepos(prev => prev.filter(r => r.id !== repo.id));
      
      alert(`✅ Repository "${repo.name}" deleted successfully!`);
    } catch (err: any) {
      alert(`❌ Failed to delete repository: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatSize = (kb: number) => {
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <GitBranch className="h-6 w-6 text-red-400" />
              GitHub Repository Manager
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {repos.length} repositories • View, manage, and delete
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadRepos}
              disabled={loading}
              className="h-10 w-10"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/30">
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg focus:border-red-500 focus:outline-none text-white placeholder-zinc-500 text-sm"
          />
        </div>

        {/* Repository List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <Loader2 className="h-12 w-12 animate-spin mb-4" />
              <p>Loading repositories...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-400">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">{error}</p>
              <Button onClick={loadRepos} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <GitBranch className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg">No repositories found</p>
              {searchQuery && (
                <p className="text-sm mt-2">Try a different search term</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="group bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-700/50 hover:border-red-500/30 rounded-xl p-4 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Repo Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {repo.name}
                        </h3>
                        {repo.private && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full">
                            Private
                          </span>
                        )}
                      </div>
                      
                      {repo.description && (
                        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                          {repo.description}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                        {repo.language && (
                          <div className="flex items-center gap-1.5">
                            <Code className="h-3.5 w-3.5" />
                            <span>{repo.language}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Updated {formatDate(repo.updated_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>Size: {formatSize(repo.size)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors"
                        title="View on GitHub"
                      >
                        <ExternalLink className="h-4 w-4 text-zinc-400 hover:text-red-400" />
                      </a>
                      <button
                        onClick={() => handleDelete(repo)}
                        disabled={deleting === repo.full_name}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete repository"
                      >
                        {deleting === repo.full_name ? (
                          <Loader2 className="h-4 w-4 text-red-400 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/50 flex items-center justify-between text-sm">
          <div className="text-zinc-500">
            {filteredRepos.length !== repos.length && (
              <span>Showing {filteredRepos.length} of {repos.length} repositories</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-zinc-600">
            <AlertCircle className="h-4 w-4" />
            <span>Deletion is permanent and cannot be undone</span>
          </div>
        </div>
      </div>
    </div>
  );
};

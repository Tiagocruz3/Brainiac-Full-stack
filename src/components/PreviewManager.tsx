/**
 * PreviewManager Component
 * 
 * Manages the complete lifecycle of preview instances:
 * - Creates preview server via API
 * - Writes files incrementally as they're generated
 * - Tracks progress and status
 * - Handles cleanup on unmount
 * - Provides preview URL for embedding
 * 
 * Architecture Note:
 * This component runs in the browser and communicates with the
 * preview server API (Node.js backend) which handles actual file
 * system operations and Vite server management.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, CheckCircle, AlertCircle, FileText, Server, Zap } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/badge';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

export interface PreviewManagerProps {
  /** Project identifier */
  projectId: string;
  /** Files to preview (filename -> content) */
  files: Record<string, string>;
  /** Callback when preview is ready with URL */
  onPreviewReady?: (url: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback on status change */
  onStatusChange?: (status: PreviewStatus) => void;
  /** Auto-start preview (default: true) */
  autoStart?: boolean;
  /** Show progress UI (default: true) */
  showProgress?: boolean;
  /** Custom class name */
  className?: string;
  /** Children to render when preview is ready */
  children?: (props: PreviewManagerChildProps) => React.ReactNode;
}

export interface PreviewManagerChildProps {
  previewUrl: string;
  status: PreviewStatus;
  progress: PreviewProgress;
  refresh: () => void;
  restart: () => void;
}

export type PreviewStatus = 
  | 'idle' 
  | 'initializing' 
  | 'writing-files' 
  | 'starting-server' 
  | 'ready' 
  | 'error' 
  | 'stopped';

export interface PreviewProgress {
  current: number;
  total: number;
  percentage: number;
  currentFile?: string;
  message: string;
}

const API_BASE_URL = process.env.VITE_PREVIEW_API_URL || '/api/preview';

/**
 * PreviewManager Component
 */
export const PreviewManager: React.FC<PreviewManagerProps> = ({
  projectId,
  files,
  onPreviewReady,
  onError,
  onStatusChange,
  autoStart = true,
  showProgress = true,
  className,
  children,
}) => {
  const [status, setStatus] = useState<PreviewStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [serverId, setServerId] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<PreviewProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    message: 'Initializing...',
  });

  const isInitializedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Update status and notify parent
   */
  const updateStatus = useCallback((newStatus: PreviewStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  /**
   * Update progress
   */
  const updateProgress = useCallback((updates: Partial<PreviewProgress>) => {
    setProgress(prev => {
      const updated = { ...prev, ...updates };
      if (updated.total > 0) {
        updated.percentage = Math.round((updated.current / updated.total) * 100);
      }
      return updated;
    });
  }, []);

  /**
   * Create preview server and write files
   */
  const createPreview = useCallback(async () => {
    try {
      // Prevent duplicate initialization
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      // Create abort controller
      abortControllerRef.current = new AbortController();

      updateStatus('initializing');
      updateProgress({
        current: 0,
        total: Object.keys(files).length + 1, // +1 for server creation
        message: 'Creating preview server...',
      });

      // Step 1: Create preview server
      const createResponse = await fetch(`${API_BASE_URL}?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          files: {}, // Start with empty server, will add files incrementally
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create preview server');
      }

      const createData = await createResponse.json();
      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create preview server');
      }

      const { server } = createData;
      setServerId(server.id);
      setPreviewUrl(server.url);

      updateProgress({
        current: 1,
        message: 'Preview server created! Writing files...',
      });
      updateStatus('writing-files');

      // Step 2: Write files incrementally
      const fileEntries = Object.entries(files);
      let currentFileIndex = 0;

      for (const [path, content] of fileEntries) {
        // Check if aborted
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Preview creation cancelled');
        }

        currentFileIndex++;
        updateProgress({
          current: currentFileIndex + 1,
          currentFile: path,
          message: `Writing ${path}...`,
        });

        // Write file to preview server
        const updateResponse = await fetch(`${API_BASE_URL}?action=update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverId: server.id,
            files: [{
              path,
              content,
              operation: 'create',
            }],
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!updateResponse.ok) {
          throw new Error(`Failed to write ${path}`);
        }

        const updateData = await updateResponse.json();
        if (!updateData.success) {
          throw new Error(updateData.error || `Failed to write ${path}`);
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Step 3: Preview is ready
      updateStatus('ready');
      updateProgress({
        current: fileEntries.length + 1,
        message: 'Preview ready! 🎉',
      });

      onPreviewReady?.(server.url);

    } catch (err: any) {
      if (err.name === 'AbortError' || err.message.includes('cancelled')) {
        console.log('Preview creation cancelled');
        updateStatus('stopped');
        return;
      }

      console.error('Preview creation error:', err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      updateStatus('error');
      onError?.(error);
    }
  }, [projectId, files, onPreviewReady, onError, updateStatus, updateProgress]);

  /**
   * Destroy preview server
   */
  const destroyPreview = useCallback(async () => {
    if (!serverId) return;

    try {
      await fetch(`${API_BASE_URL}?serverId=${serverId}`, {
        method: 'DELETE',
      });
      console.log('Preview server destroyed:', serverId);
    } catch (err) {
      console.error('Failed to destroy preview:', err);
    }
  }, [serverId]);

  /**
   * Refresh preview (reload iframe)
   */
  const refresh = useCallback(() => {
    // Trigger iframe reload by updating URL with cache buster
    if (previewUrl) {
      const url = new URL(previewUrl);
      url.searchParams.set('_t', Date.now().toString());
      setPreviewUrl(url.toString());
    }
  }, [previewUrl]);

  /**
   * Restart preview (destroy and recreate)
   */
  const restart = useCallback(async () => {
    await destroyPreview();
    isInitializedRef.current = false;
    setStatus('idle');
    setError(null);
    setProgress({
      current: 0,
      total: 0,
      percentage: 0,
      message: 'Restarting...',
    });
    await createPreview();
  }, [destroyPreview, createPreview]);

  /**
   * Cancel preview creation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Auto-start on mount
   */
  useEffect(() => {
    if (autoStart && status === 'idle') {
      createPreview();
    }
  }, [autoStart, createPreview, status]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cancel();
      destroyPreview();
    };
  }, [destroyPreview, cancel]);

  /**
   * Render children with preview data
   */
  if (children && status === 'ready' && previewUrl) {
    return (
      <>
        {children({
          previewUrl,
          status,
          progress,
          refresh,
          restart,
        })}
      </>
    );
  }

  /**
   * Show progress UI
   */
  if (showProgress) {
    return (
      <Card className={cn('bg-zinc-900/50 border-zinc-800', className)}>
        <CardContent className="p-6">
          <PreviewProgress
            status={status}
            progress={progress}
            error={error}
            onRetry={restart}
            onCancel={cancel}
          />
        </CardContent>
      </Card>
    );
  }

  return null;
};

/**
 * Preview Progress UI Component
 */
interface PreviewProgressProps {
  status: PreviewStatus;
  progress: PreviewProgress;
  error: Error | null;
  onRetry: () => void;
  onCancel: () => void;
}

const PreviewProgress: React.FC<PreviewProgressProps> = ({
  status,
  progress,
  error,
  onRetry,
  onCancel,
}) => {
  // Error state
  if (status === 'error' && error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-500">Preview Failed</h3>
            <p className="text-xs text-zinc-400 mt-1">{error.message}</p>
          </div>
        </div>
        <Button onClick={onRetry} size="sm" variant="outline" className="w-full">
          Retry
        </Button>
      </div>
    );
  }

  // Ready state
  if (status === 'ready') {
    return (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center animate-in zoom-in duration-300">
          <CheckCircle className="h-5 w-5 text-green-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-green-500">Preview Ready!</h3>
          <p className="text-xs text-zinc-400 mt-1">
            All files written successfully
          </p>
        </div>
        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
          {progress.current}/{progress.total}
        </Badge>
      </div>
    );
  }

  // Loading states
  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
          {status === 'initializing' && (
            <Server className="h-5 w-5 text-purple-400 animate-pulse" />
          )}
          {status === 'writing-files' && (
            <FileText className="h-5 w-5 text-purple-400" />
          )}
          {status === 'starting-server' && (
            <Zap className="h-5 w-5 text-purple-400" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">
            {status === 'initializing' && 'Creating Preview Server...'}
            {status === 'writing-files' && 'Writing Files...'}
            {status === 'starting-server' && 'Starting Server...'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {progress.message}
          </p>
        </div>
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-400">
          {progress.current}/{progress.total}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out relative"
            style={{ width: `${progress.percentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            {progress.currentFile && (
              <span className="font-mono">
                {progress.currentFile.length > 30
                  ? '...' + progress.currentFile.slice(-30)
                  : progress.currentFile}
              </span>
            )}
          </span>
          <span className="text-purple-400 font-medium">
            {progress.percentage}%
          </span>
        </div>
      </div>

      {/* File List */}
      {status === 'writing-files' && progress.currentFile && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">Recent files:</p>
          <div className="text-xs text-zinc-500 font-mono bg-zinc-950/50 rounded p-2 max-h-20 overflow-y-auto">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
              <span>{progress.currentFile}</span>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {(status === 'initializing' || status === 'writing-files') && (
        <Button
          onClick={onCancel}
          size="sm"
          variant="ghost"
          className="w-full text-zinc-400 hover:text-white"
        >
          Cancel
        </Button>
      )}
    </div>
  );
};

/**
 * PreviewManager with Iframe
 * Convenience component that includes the preview iframe
 */
interface PreviewManagerWithIframeProps extends PreviewManagerProps {
  /** Iframe class name */
  iframeClassName?: string;
  /** Show iframe controls */
  showControls?: boolean;
}

export const PreviewManagerWithIframe: React.FC<PreviewManagerWithIframeProps> = ({
  iframeClassName,
  showControls = true,
  ...props
}) => {
  return (
    <PreviewManager {...props}>
      {({ previewUrl, status: _status, refresh, restart }) => (
        <div className="flex flex-col h-full">
          {/* Controls */}
          {showControls && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500/10 text-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Live
                </Badge>
                <span className="text-xs text-zinc-400 font-mono">{previewUrl}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={refresh}>
                  Refresh
                </Button>
                <Button size="sm" variant="ghost" onClick={restart}>
                  Restart
                </Button>
              </div>
            </div>
          )}

          {/* Iframe */}
          <iframe
            src={previewUrl}
            className={cn('flex-1 border-0 bg-white', iframeClassName)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            title="Preview"
          />
        </div>
      )}
    </PreviewManager>
  );
};

// Export types
export type { PreviewProgress };


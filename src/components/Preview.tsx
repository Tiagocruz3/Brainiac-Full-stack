/**
 * Preview Component
 * Embeds a live preview of the generated application
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw, ExternalLink, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/badge';
import { usePreviewServer, usePreviewIframe } from '@/hooks/usePreviewServer';
import { cn } from '@/lib/utils';

interface PreviewProps {
  /** Project identifier */
  projectId: string;
  /** Files to preview */
  files: Record<string, string>;
  /** Show preview controls */
  showControls?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when preview is ready */
  onReady?: (url: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export const Preview: React.FC<PreviewProps> = ({
  projectId,
  files,
  showControls = true,
  className,
  onReady,
  onError,
}) => {
  const {
    previewUrl,
    serverData,
    isLoading,
    error,
    createPreview,
    destroyPreview,
    checkHealth,
  } = usePreviewServer();

  const { iframeRef, isLoaded, refreshIframe, handleLoad } = usePreviewIframe();
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');

  // Create preview on mount
  useEffect(() => {
    if (projectId && files && !previewUrl) {
      createPreview(projectId, files).catch((err) => {
        console.error('Failed to create preview:', err);
        onError?.(err.message);
      });
    }

    return () => {
      // Cleanup on unmount
      destroyPreview().catch(console.error);
    };
  }, [projectId]);

  // Notify when ready
  useEffect(() => {
    if (previewUrl && isLoaded) {
      onReady?.(previewUrl);
    }
  }, [previewUrl, isLoaded, onReady]);

  // Notify on error
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Health check interval
  useEffect(() => {
    if (!previewUrl) return;

    const interval = setInterval(async () => {
      const healthy = await checkHealth();
      setHealthStatus(healthy ? 'healthy' : 'unhealthy');
    }, 5000);

    return () => clearInterval(interval);
  }, [previewUrl, checkHealth]);

  const handleRefresh = () => {
    refreshIframe();
  };

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  if (isLoading && !previewUrl) {
    return (
      <Card className={cn('flex items-center justify-center p-12', className)}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto" />
          <div>
            <p className="text-sm font-medium">Starting preview server...</p>
            <p className="text-xs text-zinc-500 mt-1">This may take a few seconds</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('flex items-center justify-center p-12', className)}>
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <div>
            <p className="text-sm font-medium text-red-500">Preview Error</p>
            <p className="text-xs text-zinc-500 mt-1">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => createPreview(projectId, files)}
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!previewUrl) {
    return null;
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Preview Controls */}
      {showControls && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <Badge variant={healthStatus === 'healthy' ? 'default' : 'destructive'}>
              {healthStatus === 'healthy' && <CheckCircle className="h-3 w-3 mr-1" />}
              {healthStatus === 'checking' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {healthStatus === 'unhealthy' && <AlertCircle className="h-3 w-3 mr-1" />}
              {healthStatus === 'healthy' ? 'Live' : healthStatus === 'checking' ? 'Checking' : 'Offline'}
            </Badge>
            <span className="text-xs text-zinc-400 font-mono">
              {serverData?.url || 'Loading...'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenInNewTab}
              className="h-8 w-8"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview Iframe */}
      <div className="flex-1 relative bg-white">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={previewUrl}
          onLoad={handleLoad}
          className={cn(
            'w-full h-full border-0',
            !isLoaded && 'opacity-0'
          )}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          title="Preview"
        />
      </div>
    </div>
  );
};

/**
 * Compact preview component without controls
 */
export const PreviewCompact: React.FC<Omit<PreviewProps, 'showControls'>> = (props) => {
  return <Preview {...props} showControls={false} />;
};

/**
 * Preview component with side-by-side code editor
 */
interface PreviewWithEditorProps extends PreviewProps {
  /** Code editor component */
  editor: React.ReactNode;
  /** Split ratio (0-100) */
  splitRatio?: number;
}

export const PreviewWithEditor: React.FC<PreviewWithEditorProps> = ({
  editor,
  splitRatio = 50,
  ...previewProps
}) => {
  return (
    <div className="flex h-full">
      {/* Editor */}
      <div style={{ width: `${splitRatio}%` }} className="border-r border-zinc-800">
        {editor}
      </div>

      {/* Preview */}
      <div style={{ width: `${100 - splitRatio}%` }}>
        <Preview {...previewProps} />
      </div>
    </div>
  );
};


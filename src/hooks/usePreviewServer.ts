/**
 * React Hook for Preview Server Management
 * 
 * Usage:
 * ```tsx
 * const { createPreview, updatePreview, previewUrl, isLoading } = usePreviewServer();
 * 
 * // Create a preview
 * await createPreview('my-project', {
 *   'src/App.tsx': '...',
 *   'src/main.tsx': '...',
 * });
 * 
 * // Preview URL is now available
 * <iframe src={previewUrl} />
 * 
 * // Update files
 * await updatePreview([{
 *   path: 'src/App.tsx',
 *   content: '// Updated',
 *   operation: 'update',
 * }]);
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { FileUpdate } from '@/types/preview';

interface PreviewServerData {
  id: string;
  url: string;
  port: number;
  status: string;
  projectId: string;
}

interface UsePreviewServerReturn {
  /** Current preview URL (null if no preview) */
  previewUrl: string | null;
  /** Server data */
  serverData: PreviewServerData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Create a new preview server */
  createPreview: (projectId: string, files: Record<string, string>) => Promise<void>;
  /** Update files in the preview */
  updatePreview: (files: FileUpdate[]) => Promise<void>;
  /** Destroy the preview server */
  destroyPreview: () => Promise<void>;
  /** Check server health */
  checkHealth: () => Promise<boolean>;
  /** Refresh the iframe */
  refreshPreview: () => void;
}

const API_BASE_URL = '/api/preview';

export function usePreviewServer(): UsePreviewServerReturn {
  const [serverData, setServerData] = useState<PreviewServerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serverData) {
        // Cleanup server on unmount
        destroyPreviewInternal(serverData.id).catch(console.error);
      }
    };
  }, []);

  /**
   * Create a new preview server
   */
  const createPreview = useCallback(async (
    projectId: string,
    files: Record<string, string>
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, files }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create preview');
      }

      setServerData(data.server);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update files in the preview
   */
  const updatePreview = useCallback(async (files: FileUpdate[]): Promise<void> => {
    if (!serverData) {
      throw new Error('No preview server active');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}?action=update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: serverData.id,
          files,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update preview');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [serverData]);

  /**
   * Destroy the preview server
   */
  const destroyPreview = useCallback(async (): Promise<void> => {
    if (!serverData) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await destroyPreviewInternal(serverData.id);
      setServerData(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [serverData]);

  /**
   * Check server health
   */
  const checkHealth = useCallback(async (): Promise<boolean> => {
    if (!serverData) {
      return false;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}?action=health&serverId=${serverData.id}`
      );
      const data = await response.json();
      return data.healthy || false;
    } catch {
      return false;
    }
  }, [serverData]);

  /**
   * Refresh the iframe
   */
  const refreshPreview = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  return {
    previewUrl: serverData?.url || null,
    serverData,
    isLoading,
    error,
    createPreview,
    updatePreview,
    destroyPreview,
    checkHealth,
    refreshPreview,
  };
}

/**
 * Internal helper to destroy a preview server
 */
async function destroyPreviewInternal(serverId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}?serverId=${serverId}`, {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to destroy preview');
  }
}

/**
 * Hook for managing preview iframe
 */
export function usePreviewIframe() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshIframe = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      setIsLoaded(false);
    }
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return {
    iframeRef,
    isLoaded,
    refreshIframe,
    handleLoad,
  };
}


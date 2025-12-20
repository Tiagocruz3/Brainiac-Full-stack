/**
 * PreviewIframe Component
 * Live preview with smooth animations and loading states
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface PreviewIframeProps {
  url: string;
  projectName?: string;
  className?: string;
}

export const PreviewIframe: React.FC<PreviewIframeProps> = ({
  url,
  projectName = 'Preview',
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    // Force iframe reload by changing key
    window.location.reload();
  };

  return (
    <motion.div
      className={`h-full flex flex-col border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <motion.div
                  className="w-3 h-3 rounded-full bg-yellow-500/80"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
            )}
            {!isLoading && !hasError && (
              <motion.div
                key="success"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <div className="w-3 h-3 rounded-full bg-green-500/80 animate-pulse" />
              </motion.div>
            )}
            {hasError && (
              <motion.div
                key="error"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
              </motion.div>
            )}
          </AnimatePresence>

          <span className="text-xs font-medium text-zinc-400">
            {isLoading && 'Loading Preview...'}
            {!isLoading && !hasError && 'Live Preview'}
            {hasError && 'Preview Error'}
          </span>
          
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <CheckCircle className="h-3 w-3 text-green-400" />
              </motion.div>
            )}
          </AnimatePresence>

          <span className="text-xs text-zinc-600">·</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 hover:underline truncate max-w-[200px]"
          >
            {url.replace('https://', '')}
          </a>
        </div>

        <div className="flex items-center gap-2">
          {hasError && (
            <Button
              onClick={handleRetry}
              size="sm"
              variant="ghost"
              className="h-6 gap-1 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          )}
          <button
            onClick={() => window.open(url, '_blank')}
            className="text-xs px-2 py-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <motion.div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-0.5"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <div className="w-full h-full rounded-2xl bg-zinc-950 flex items-center justify-center">
                  <motion.div
                    className="text-3xl"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🚀
                  </motion.div>
                </div>
              </motion.div>
              <p className="text-sm text-zinc-400 mb-2">Loading preview...</p>
              <motion.div
                className="flex justify-center gap-1"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="text-xs text-zinc-600">●</span>
                <span className="text-xs text-zinc-600">●</span>
                <span className="text-xs text-zinc-600">●</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center max-w-md px-4">
              <motion.div
                className="text-6xl mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                ⚠️
              </motion.div>
              <h3 className="text-lg font-semibold text-white mb-2">Preview Failed to Load</h3>
              <p className="text-sm text-zinc-400 mb-4">
                The preview couldn't be loaded. This might be because the deployment is still in progress.
              </p>
              <Button onClick={handleRetry} size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Iframe */}
      <motion.iframe
        src={url}
        className="w-full h-full bg-white"
        title={projectName}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        onLoad={handleLoad}
        onError={handleError}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading || hasError ? 0 : 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      />
    </motion.div>
  );
};


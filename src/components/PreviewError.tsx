/**
 * PreviewError Component
 * User-friendly error display with recovery options
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, Trash2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/Button';
import { PreviewError as PreviewErrorType, previewErrorHandler } from '@/lib/preview-errors';

interface PreviewErrorProps {
  error: PreviewErrorType;
  onRetry?: () => void;
  onClearCache?: () => void;
  className?: string;
}

export const PreviewError: React.FC<PreviewErrorProps> = ({
  error,
  onRetry,
  onClearCache,
  className = '',
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const severity = previewErrorHandler.getSeverity(error);
  const actionMessage = previewErrorHandler.getActionableMessage(error);

  // Color scheme based on severity
  const colors = {
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      text: 'text-yellow-400',
      icon: 'text-yellow-500',
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400',
      icon: 'text-red-500',
    },
    critical: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      text: 'text-red-300',
      icon: 'text-red-400',
    },
  };

  const colorScheme = colors[severity];

  return (
    <motion.div
      className={`h-full flex flex-col border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 ${colorScheme.bg} border-b ${colorScheme.border}`}>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <AlertTriangle className={`h-4 w-4 ${colorScheme.icon}`} />
          </motion.div>
          <span className={`text-sm font-medium ${colorScheme.text}`}>
            Preview Error
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error.retryable && onRetry && (
            <Button
              onClick={onRetry}
              size="sm"
              variant="ghost"
              className="h-6 gap-1 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
          )}
        </div>
      </div>

      {/* Error Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          {/* Error Icon */}
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
            style={{ 
              background: `linear-gradient(135deg, ${
                severity === 'critical' ? '#ef4444' : 
                severity === 'error' ? '#f59e0b' : 
                '#eab308'
              }15, ${
                severity === 'critical' ? '#dc2626' : 
                severity === 'error' ? '#d97706' : 
                '#ca8a04'
              }15)` 
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          >
            <AlertTriangle className={`h-10 w-10 ${colorScheme.icon}`} />
          </motion.div>

          {/* Error Message */}
          <motion.h3
            className="text-xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {error.message}
          </motion.h3>

          {/* Error Details */}
          {error.details && (
            <motion.p
              className="text-sm text-zinc-400 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {error.details}
            </motion.p>
          )}

          {/* Action Message */}
          <motion.div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colorScheme.bg} border ${colorScheme.border} mb-6`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className={`text-xs ${colorScheme.text}`}>
              💡 {actionMessage}
            </span>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {error.retryable && onRetry && (
              <Button onClick={onRetry} size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            
            {error.recoverable && onClearCache && (
              <Button onClick={onClearCache} size="sm" variant="outline" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear Cache & Retry
              </Button>
            )}
          </motion.div>

          {/* Helpful Links */}
          <motion.div
            className="mt-6 flex flex-col gap-2 text-xs text-zinc-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <a
              href="https://github.com/your-repo/docs/troubleshooting"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-zinc-400 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              View Troubleshooting Guide
            </a>
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="inline-flex items-center gap-1 hover:text-zinc-400 transition-colors"
            >
              {showTechnicalDetails ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
            </button>
          </motion.div>

          {/* Technical Details (Collapsible) */}
          <AnimatePresence>
            {showTechnicalDetails && (
              <motion.div
                className="mt-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 text-left"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-xs font-mono text-zinc-400 space-y-2">
                  <div>
                    <span className="text-zinc-500">Error Type:</span>{' '}
                    <span className={colorScheme.text}>{error.type}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Recoverable:</span>{' '}
                    <span className={error.recoverable ? 'text-green-400' : 'text-red-400'}>
                      {error.recoverable ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Retryable:</span>{' '}
                    <span className={error.retryable ? 'text-green-400' : 'text-red-400'}>
                      {error.retryable ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {error.technicalDetails && (
                    <div className="mt-2 pt-2 border-t border-zinc-800">
                      <span className="text-zinc-500 block mb-1">Stack Trace:</span>
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                        {typeof error.technicalDetails === 'string' 
                          ? error.technicalDetails 
                          : JSON.stringify(error.technicalDetails, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};


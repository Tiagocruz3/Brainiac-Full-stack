/**
 * PreviewNetwork Component
 * Shows network requests from preview iframe
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Network,
  Trash2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
import { NetworkRequest } from '@/types/preview-controls';

interface PreviewNetworkProps {
  requests: NetworkRequest[];
  onClear: () => void;
  className?: string;
}

export const PreviewNetwork: React.FC<PreviewNetworkProps> = ({
  requests,
  onClear,
  className = '',
}) => {
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(null);

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-zinc-500';
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 300 && status < 400) return 'text-blue-500';
    if (status >= 400 && status < 500) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'text-blue-400';
      case 'POST':
        return 'text-green-400';
      case 'PUT':
        return 'text-yellow-400';
      case 'DELETE':
        return 'text-red-400';
      case 'PATCH':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search;
    } catch {
      return url;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeStr}.${ms}`;
  };

  return (
    <div className={cn('flex h-full bg-zinc-950 border-t border-zinc-800', className)}>
      {/* Request List */}
      <div className="flex-1 flex flex-col border-r border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-zinc-300">Network</span>
            {requests.length > 0 && (
              <span className="text-xs text-zinc-500">
                ({requests.length})
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="h-6 w-6 p-0"
            title="Clear network log"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Requests */}
        <div className="flex-1 overflow-y-auto">
          {requests.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <div className="text-center">
                <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No network requests</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-900">
              {requests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-900/50 transition-colors text-left',
                    selectedRequest?.id === request.id && 'bg-zinc-900'
                  )}
                >
                  {/* Status Icon */}
                  <div>
                    {request.status ? (
                      request.status >= 200 && request.status < 300 ? (
                        <CheckCircle2 className={cn('h-4 w-4', getStatusColor(request.status))} />
                      ) : (
                        <XCircle className={cn('h-4 w-4', getStatusColor(request.status))} />
                      )
                    ) : (
                      <Clock className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>

                  {/* Request Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-xs font-mono font-bold', getMethodColor(request.method))}>
                        {request.method}
                      </span>
                      {request.status && (
                        <span className={cn('text-xs font-mono', getStatusColor(request.status))}>
                          {request.status}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 truncate font-mono">
                      {formatUrl(request.url)}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="text-xs text-zinc-500 font-mono">
                    {formatDuration(request.duration)}
                  </div>

                  <ChevronRight className="h-4 w-4 text-zinc-600" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Request Details */}
      {selectedRequest && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-96 flex flex-col bg-zinc-950"
        >
          {/* Details Header */}
          <div className="px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-zinc-300">Request Details</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedRequest(null)}
                className="h-6 text-xs"
              >
                Close
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-mono font-bold', getMethodColor(selectedRequest.method))}>
                {selectedRequest.method}
              </span>
              {selectedRequest.status && (
                <span className={cn('text-xs font-mono', getStatusColor(selectedRequest.status))}>
                  {selectedRequest.status} {selectedRequest.statusText}
                </span>
              )}
            </div>
          </div>

          {/* Details Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-mono">
            {/* General */}
            <div>
              <div className="text-zinc-500 font-bold mb-2">General</div>
              <div className="space-y-1">
                <div className="flex">
                  <span className="text-zinc-500 w-20">URL:</span>
                  <span className="text-zinc-300 break-all">{selectedRequest.url}</span>
                </div>
                <div className="flex">
                  <span className="text-zinc-500 w-20">Method:</span>
                  <span className="text-zinc-300">{selectedRequest.method}</span>
                </div>
                {selectedRequest.status && (
                  <div className="flex">
                    <span className="text-zinc-500 w-20">Status:</span>
                    <span className={getStatusColor(selectedRequest.status)}>
                      {selectedRequest.status} {selectedRequest.statusText}
                    </span>
                  </div>
                )}
                {selectedRequest.duration && (
                  <div className="flex">
                    <span className="text-zinc-500 w-20">Duration:</span>
                    <span className="text-zinc-300">{formatDuration(selectedRequest.duration)}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="text-zinc-500 w-20">Time:</span>
                  <span className="text-zinc-300">{formatTimestamp(selectedRequest.timestamp)}</span>
                </div>
              </div>
            </div>

            {/* Request Headers */}
            {selectedRequest.requestHeaders && Object.keys(selectedRequest.requestHeaders).length > 0 && (
              <div>
                <div className="text-zinc-500 font-bold mb-2">Request Headers</div>
                <div className="space-y-1">
                  {Object.entries(selectedRequest.requestHeaders).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="text-zinc-500 w-40 flex-shrink-0">{key}:</span>
                      <span className="text-zinc-300 break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Body */}
            {selectedRequest.requestBody && (
              <div>
                <div className="text-zinc-500 font-bold mb-2">Request Body</div>
                <pre className="text-zinc-300 bg-zinc-900 p-2 rounded overflow-x-auto">
                  {typeof selectedRequest.requestBody === 'string'
                    ? selectedRequest.requestBody
                    : JSON.stringify(selectedRequest.requestBody, null, 2)}
                </pre>
              </div>
            )}

            {/* Response Headers */}
            {selectedRequest.responseHeaders && Object.keys(selectedRequest.responseHeaders).length > 0 && (
              <div>
                <div className="text-zinc-500 font-bold mb-2">Response Headers</div>
                <div className="space-y-1">
                  {Object.entries(selectedRequest.responseHeaders).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="text-zinc-500 w-40 flex-shrink-0">{key}:</span>
                      <span className="text-zinc-300 break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response Body */}
            {selectedRequest.responseBody && (
              <div>
                <div className="text-zinc-500 font-bold mb-2">Response Body</div>
                <pre className="text-zinc-300 bg-zinc-900 p-2 rounded overflow-x-auto max-h-96">
                  {typeof selectedRequest.responseBody === 'string'
                    ? selectedRequest.responseBody
                    : JSON.stringify(selectedRequest.responseBody, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};


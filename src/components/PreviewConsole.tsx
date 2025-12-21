/**
 * PreviewConsole Component
 * Shows console logs, warnings, and errors from preview iframe
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  AlertTriangle,
  XCircle,
  Info,
  Trash2,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
import { ConsoleMessage } from '@/types/preview-controls';

interface PreviewConsoleProps {
  messages: ConsoleMessage[];
  onClear: () => void;
  className?: string;
}

export const PreviewConsole: React.FC<PreviewConsoleProps> = ({
  messages,
  onClear,
  className = '',
}) => {
  const [filter, setFilter] = useState<'all' | 'log' | 'warn' | 'error' | 'info'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filteredMessages = filter === 'all' 
    ? messages 
    : messages.filter(msg => msg.type === filter);

  const getMessageIcon = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />;
      default:
        return <Terminal className="h-4 w-4 text-zinc-500 flex-shrink-0" />;
    }
  };

  const getMessageColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400 bg-red-500/5';
      case 'warn':
        return 'text-yellow-400 bg-yellow-500/5';
      case 'info':
        return 'text-blue-400 bg-blue-500/5';
      default:
        return 'text-zinc-300';
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

  const getCounts = () => {
    return {
      all: messages.length,
      log: messages.filter(m => m.type === 'log').length,
      warn: messages.filter(m => m.type === 'warn').length,
      error: messages.filter(m => m.type === 'error').length,
      info: messages.filter(m => m.type === 'info').length,
    };
  };

  const counts = getCounts();

  return (
    <div className={cn('flex flex-col h-full bg-zinc-950 border-t border-zinc-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-red-500" />
          <span className="text-sm font-semibold text-zinc-300">Console</span>
          {filteredMessages.length > 0 && (
            <span className="text-xs text-zinc-500">
              ({filteredMessages.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="h-6 gap-1.5 text-xs"
            >
              <Filter className="h-3 w-3" />
              <span className="capitalize">{filter}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>

            {showFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowFilterMenu(false)}
                />
                <div className="absolute top-full right-0 mt-1 w-40 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="p-1">
                    {(['all', 'log', 'info', 'warn', 'error'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setFilter(type);
                          setShowFilterMenu(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-zinc-800 transition-colors',
                          filter === type && 'bg-zinc-800 text-red-400'
                        )}
                      >
                        <span className="capitalize">{type}</span>
                        <span className="text-zinc-500">
                          {counts[type]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Clear */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="h-6 w-6 p-0"
            title="Clear console"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <div className="text-center">
              <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No console messages</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredMessages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'flex items-start gap-2 px-3 py-2 border-b border-zinc-900 hover:bg-zinc-900/50',
                  getMessageColor(message.type)
                )}
              >
                {/* Icon */}
                <div className="mt-0.5">
                  {getMessageIcon(message.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="break-words whitespace-pre-wrap">
                    {message.message}
                  </div>
                  {message.args && message.args.length > 0 && (
                    <div className="mt-1 text-zinc-500">
                      {JSON.stringify(message.args, null, 2)}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-zinc-600 text-[10px] flex-shrink-0">
                  {formatTimestamp(message.timestamp)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};


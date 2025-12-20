import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ChevronDown, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { AgentMessage } from '@/types';
import { cn } from '@/lib/utils';

interface ChatProps {
  messages: AgentMessage[];
  onSendMessage: (message: string) => void;
  isBuilding: boolean;
  buildStatus?: {
    stage: string;
    message: string;
    progress: number;
  };
  onStopGeneration?: () => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isBuilding, buildStatus, onStopGeneration, selectedModel = 'claude-sonnet-4-20250514', onModelChange }) => {
  const [input, setInput] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableModels = [
    { id: 'claude-sonnet-4-20250514', name: 'Claude 4 Sonnet (Latest)', description: 'Most capable model' },
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', description: 'Fast and intelligent' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Oct)', description: 'Previous version' },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (June)', description: 'Stable version' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest and most compact' },
  ];

  // Debug logging
  useEffect(() => {
    console.log('Chat component update:', {
      isBuilding,
      buildStage: buildStatus?.stage,
      inputDisabled: isBuilding
    });
  }, [isBuilding, buildStatus]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    
    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isModelDropdownOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isBuilding) return;
    
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const examplePrompts = [
    "Create a todo app with Supabase",
    "Build a blog with authentication",
    "Make a landing page for a SaaS product",
  ];

  // Typing animation component
  const ThinkingIndicator = () => (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
        <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1.4s' }} />
        <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1.4s' }} />
      </div>
      <span className="text-xs text-zinc-400 font-medium">
        {buildStatus?.stage === 'idle' ? 'Thinking...' : 'Planning...'}
      </span>
    </div>
  );

  // Cursor typing animation for active thinking
  const CursorAnimation = () => (
    <span className="inline-block w-0.5 h-4 bg-purple-500 animate-pulse ml-0.5" />
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-6">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-purple-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Brainiac
              </h1>
            </div>
            <p className="text-base text-zinc-400 max-w-lg">
              Build full-stack applications with AI in minutes
            </p>
            
            <div className="space-y-2 w-full max-w-md">
              <p className="text-xs text-zinc-500 font-medium">Try one of these:</p>
              {examplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="w-full p-3 text-left rounded-lg border border-zinc-800/50 bg-zinc-900/30 hover:border-purple-500/30 hover:bg-zinc-900/50 transition-all text-sm text-zinc-300 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, i) => (
              <div
                key={i}
                className={cn(
                  'flex animate-in fade-in duration-300',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-2xl rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : message.content.startsWith('⚡')
                      ? 'bg-zinc-900/30 border border-purple-500/20 text-purple-300 text-xs px-3 py-2' // Compact step messages
                      : 'bg-zinc-800/60 text-zinc-100'
                  )}
                >
                  <p className={cn(
                    "whitespace-pre-wrap",
                    message.content.startsWith('⚡') ? 'text-xs' : 'text-sm'
                  )}>
                    {message.content}
                  </p>
                  {!message.content.startsWith('⚡') && (
                    <p className="text-xs opacity-60 mt-1.5">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {/* Thinking Animation - Shows when starting to process */}
            {isBuilding && (!buildStatus || buildStatus.stage === 'idle' || buildStatus.progress === 0) && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="max-w-2xl rounded-2xl px-4 py-3 bg-zinc-800/60 backdrop-blur-sm border border-purple-500/10 text-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                    </div>
                    <ThinkingIndicator />
                    <CursorAnimation />
                  </div>
                </div>
              </div>
            )}
            
            {/* Compact Build Status */}
            {isBuilding && buildStatus && buildStatus.stage !== 'idle' && buildStatus.progress > 0 && (
              <div className="flex justify-start">
                <div className="max-w-2xl w-full rounded-xl px-4 py-3 bg-gradient-to-br from-purple-900/10 to-zinc-900/30 border border-purple-500/20 backdrop-blur-sm shadow-lg shadow-purple-500/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {buildStatus.stage === 'complete' ? (
                        <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center animate-in zoom-in duration-300">
                          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : buildStatus.stage === 'error' ? (
                        <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center relative">
                          <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-ping" />
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white mb-1.5 animate-in fade-in slide-in-from-left-1 duration-300">
                        {buildStatus.message}
                        <span className="inline-block w-0.5 h-3.5 bg-purple-400 animate-pulse ml-1" />
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-700 ease-out relative"
                            style={{ width: `${buildStatus.progress}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                          </div>
                        </div>
                        <span className="text-xs text-purple-400 font-medium min-w-[3ch] text-right tabular-nums">
                          {buildStatus.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-transparent">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          {isBuilding && onStopGeneration && (
            <div className="mb-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={onStopGeneration}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
              >
                Stop Generating
              </Button>
            </div>
          )}
          
          {/* Claude-style Chat Input */}
          <div className="relative">
            {/* Model Selector Dropdown (Claude style) */}
            {onModelChange && (
              <div className="relative mb-2" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  disabled={isBuilding}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm font-medium text-zinc-300">
                    {availableModels.find(m => m.id === selectedModel)?.name}
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-zinc-400 transition-transform",
                    isModelDropdownOpen && "rotate-180"
                  )} />
                </button>
                
                {/* Dropdown Menu */}
                {isModelDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-80 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-zinc-800">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Select Model</p>
                    </div>
                    <div className="py-1 max-h-96 overflow-y-auto">
                      {availableModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            onModelChange(model.id);
                            setIsModelDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2.5 hover:bg-zinc-800/50 transition-colors flex items-start gap-3 text-left"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {selectedModel === model.id && (
                              <Check className="h-4 w-4 text-purple-400" />
                            )}
                            {selectedModel !== model.id && (
                              <div className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{model.name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{model.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Text Input */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Brainiac..."
                disabled={isBuilding}
                className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm px-4 py-3 pr-12 text-base text-white placeholder:text-zinc-500 focus:border-zinc-700 focus:outline-none disabled:opacity-50 min-h-[52px] max-h-[200px] shadow-lg"
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim() || isBuilding}
                className={cn(
                  "absolute right-2 bottom-2 h-8 w-8 rounded-lg inline-flex items-center justify-center transition-all focus:outline-none",
                  input.trim() && !isBuilding
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                {isBuilding ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-center">
            Brainiac can create React apps with Supabase, GitHub, and Vercel
          </p>
        </form>
      </div>
    </div>
  );
};

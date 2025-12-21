import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ChevronDown, Check, Cpu } from 'lucide-react';
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

export const Chat: React.FC<ChatProps> = ({ 
  messages, 
  onSendMessage, 
  isBuilding, 
  buildStatus, 
  onStopGeneration, 
  selectedModel = 'claude-sonnet-4-20250514', 
  onModelChange 
}) => {
  const [input, setInput] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableModels = [
    { id: 'claude-sonnet-4-20250514', name: 'Claude 4 Sonnet', badge: 'Latest', icon: '⚡' },
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', badge: 'Fast', icon: '🚀' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', badge: 'Stable', icon: '✨' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', badge: 'Powerful', icon: '💎' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', badge: 'Quick', icon: '🌸' },
  ];

  const currentModel = availableModels.find(m => m.id === selectedModel) || availableModels[0];

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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isBuilding) return;
    
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const examplePrompts = [
    "Build a todo app with dark mode",
    "Create a SaaS landing page",
    "Make a portfolio website",
  ];

  // Thinking animation
  const ThinkingIndicator = () => (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
        <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
      <span className="text-xs text-zinc-400">
        {buildStatus?.stage === 'idle' ? 'Thinking...' : 'Planning...'}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/25">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              What would you like to build?
            </h1>
            <p className="text-sm text-zinc-500 mb-8 max-w-md">
              I can create full-stack React applications with databases, authentication, and deployment.
            </p>
            
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {examplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="px-4 py-2 text-sm rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={cn(
                  'flex animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-red-600 text-white'
                      : message.content.startsWith('⚡')
                      ? 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-xs px-3 py-2'
                      : 'bg-zinc-900 text-zinc-100'
                  )}
                >
                  <p className={cn(
                    "whitespace-pre-wrap",
                    message.content.startsWith('⚡') ? 'text-xs' : 'text-sm leading-relaxed'
                  )}>
                    {message.content}
                  </p>
                  {!message.content.startsWith('⚡') && (
                    <p className="text-xs opacity-50 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {/* Thinking Animation */}
            {isBuilding && (!buildStatus || buildStatus.stage === 'idle' || buildStatus.progress === 0) && (
              <div className="flex justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <div className="bg-zinc-900 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-red-400 animate-pulse" />
                    <ThinkingIndicator />
                  </div>
                </div>
              </div>
            )}
            
            {/* Build Progress */}
            {isBuilding && buildStatus && buildStatus.stage !== 'idle' && buildStatus.progress > 0 && (
              <div className="flex justify-start">
                <div className="max-w-md w-full bg-zinc-900 rounded-2xl p-4 border border-zinc-800 animate-in fade-in-0 duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    {buildStatus.stage === 'complete' ? (
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-500" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center relative">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{buildStatus.message}</p>
                    </div>
                    <span className="text-sm text-red-400 font-mono">{buildStatus.progress}%</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${buildStatus.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Claude-style Input Bar */}
      <div className="p-4 border-t border-zinc-900">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          {/* Stop Button */}
          {isBuilding && onStopGeneration && (
            <div className="mb-3 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onStopGeneration}
                className="border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
              >
                Stop generating
              </Button>
            </div>
          )}
          
          {/* Input Container */}
          <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 focus-within:border-zinc-700 transition-colors">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Brainiac..."
              disabled={isBuilding}
              className="w-full resize-none bg-transparent px-4 pt-4 pb-12 text-sm text-white placeholder:text-zinc-500 focus:outline-none disabled:opacity-50 min-h-[56px] max-h-[200px]"
              rows={1}
            />
            
            {/* Bottom Bar - Model Selector + Send */}
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between">
              {/* Model Selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => !isBuilding && setIsModelDropdownOpen(!isModelDropdownOpen)}
                  disabled={isBuilding}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors",
                    isBuilding 
                      ? "text-zinc-600 cursor-not-allowed" 
                      : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
                  )}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span className="font-medium">{currentModel.name}</span>
                  <ChevronDown className={cn(
                    "h-3 w-3 transition-transform",
                    isModelDropdownOpen && "rotate-180"
                  )} />
                </button>
                
                {/* Dropdown */}
                {isModelDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl z-50 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                    <div className="p-2 space-y-0.5">
                      {availableModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            onModelChange?.(model.id);
                            setIsModelDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                            selectedModel === model.id 
                              ? "bg-red-500/10 text-white" 
                              : "hover:bg-zinc-800 text-zinc-400 hover:text-white"
                          )}
                        >
                          <span className="text-base">{model.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{model.name}</span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full",
                                selectedModel === model.id 
                                  ? "bg-red-500/20 text-red-300" 
                                  : "bg-zinc-800 text-zinc-500"
                              )}>
                                {model.badge}
                              </span>
                            </div>
                          </div>
                          {selectedModel === model.id && (
                            <Check className="h-4 w-4 text-red-400 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || isBuilding}
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                  input.trim() && !isBuilding
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
              >
                {isBuilding ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          
          {/* Footer */}
          <p className="text-[11px] text-zinc-600 mt-2 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
};

/**
 * CodeViewer Component
 * 
 * Shows generated code files with syntax highlighting and file tree
 * Similar to v0.dev and bolt.new
 */

import React, { useState } from 'react';
import { File, Folder, FolderOpen, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
import Editor from '@monaco-editor/react';

export interface CodeViewerProps {
  files: Record<string, string>;
  projectName?: string;
  deploymentUrl?: string;
  className?: string;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  files,
  projectName = 'Generated App',
  deploymentUrl,
  className,
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [displayedContent, setDisplayedContent] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);

  // Build file tree from flat file list
  const buildFileTree = (files: Record<string, string>): FileNode => {
    const root: FileNode = { name: 'root', path: '', type: 'folder', children: [] };
    
    Object.keys(files).sort().forEach(filePath => {
      const parts = filePath.split('/');
      let currentNode = root;
      
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const path = parts.slice(0, index + 1).join('/');
        
        if (!currentNode.children) {
          currentNode.children = [];
        }
        
        let node = currentNode.children.find(n => n.name === part);
        
        if (!node) {
          node = {
            name: part,
            path,
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : [],
            content: isFile ? files[filePath] : undefined,
          };
          currentNode.children.push(node);
        }
        
        currentNode = node;
      });
    });
    
    return root;
  };

  const fileTree = buildFileTree(files);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const copyToClipboard = async (content: string, fileName: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'tsx': '⚛️',
      'ts': '🔷',
      'jsx': '⚛️',
      'js': '📜',
      'json': '📋',
      'css': '🎨',
      'html': '🌐',
      'md': '📝',
      'config': '⚙️',
    };
    return iconMap[ext || ''] || '📄';
  };

  // Get Monaco language from file name
  const getMonacoLanguage = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'md': 'markdown',
      'py': 'python',
      'yml': 'yaml',
      'yaml': 'yaml',
    };
    return langMap[ext || ''] || 'plaintext';
  };

  const renderFileTree = (node: FileNode, depth = 0): React.ReactNode => {
    if (node.type === 'file') {
      const isSelected = selectedFile === node.path;
      const icon = getFileIcon(node.name);
      return (
        <div
          key={node.path}
          className={cn(
            'flex items-center gap-1.5 px-1.5 py-0.5 cursor-pointer hover:bg-zinc-800/50 rounded transition-colors',
            isSelected && 'bg-zinc-800/70 text-purple-400'
          )}
          style={{ paddingLeft: `${depth * 10 + 4}px` }}
          onClick={() => setSelectedFile(node.path)}
        >
          <span className="text-[10px]">{icon}</span>
          <span className="text-zinc-300 font-mono text-[11px] truncate">{node.name}</span>
        </div>
      );
    }

    const isExpanded = expandedFolders.has(node.path || 'root');
    
    if (node.name === 'root') {
      return node.children?.map(child => renderFileTree(child, 0));
    }

    return (
      <div key={node.path}>
        <div
          className="flex items-center gap-1.5 px-1.5 py-0.5 cursor-pointer hover:bg-zinc-800/50 rounded transition-colors"
          style={{ paddingLeft: `${depth * 10 + 4}px` }}
          onClick={() => toggleFolder(node.path)}
        >
          {isExpanded ? (
            <FolderOpen className="h-3 w-3 text-purple-400" />
          ) : (
            <Folder className="h-3 w-3 text-zinc-500" />
          )}
          <span className="text-zinc-400 font-medium font-mono text-[11px]">{node.name}</span>
        </div>
        {isExpanded && node.children?.map(child => renderFileTree(child, depth + 1))}
      </div>
    );
  };

  const selectedFileContent = selectedFile ? files[selectedFile] : null;
  const defaultFile = Object.keys(files).find(f => f.includes('App.tsx') || f.includes('App.jsx')) || Object.keys(files)[0];
  
  React.useEffect(() => {
    if (!selectedFile && defaultFile) {
      setSelectedFile(defaultFile);
    }
  }, [defaultFile, selectedFile]);

  // Typing animation effect
  React.useEffect(() => {
    if (!selectedFileContent) {
      setDisplayedContent('');
      setIsTyping(false);
      return;
    }

    // Reset and start typing animation
    setDisplayedContent('');
    setIsTyping(true);
    let currentIndex = 0;
    const typingSpeed = 3; // Characters per frame (faster = higher number)
    
    const typeInterval = setInterval(() => {
      if (currentIndex >= selectedFileContent.length) {
        setIsTyping(false);
        clearInterval(typeInterval);
        return;
      }

      // Type multiple characters at once for smoother animation
      const nextIndex = Math.min(currentIndex + typingSpeed, selectedFileContent.length);
      setDisplayedContent(selectedFileContent.substring(0, nextIndex));
      currentIndex = nextIndex;
    }, 16); // ~60fps

    return () => {
      clearInterval(typeInterval);
      setIsTyping(false);
    };
  }, [selectedFileContent]);

  return (
    <div className={cn('h-full flex flex-col border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950', className)}>
      {/* Compact Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="h-4 w-px bg-zinc-700 mx-1" />
          <span className="text-xs font-medium text-zinc-400">{projectName}</span>
          <span className="text-xs text-zinc-600">·</span>
          <span className="text-xs text-zinc-500">{Object.keys(files).length} files</span>
        </div>
        {deploymentUrl && (
          <Button
            onClick={() => window.open(deploymentUrl, '_blank')}
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs"
          >
            <ExternalLink className="h-3 w-3" />
            View Live
          </Button>
        )}
      </div>

      {/* Code Explorer - Claude Style */}
      <div className="flex-1 grid grid-cols-5 overflow-hidden">
        {/* Compact File Tree */}
        <div className="border-r border-zinc-800 overflow-hidden flex flex-col bg-zinc-950">
          <div className="px-2 py-1.5 bg-zinc-900/30 border-b border-zinc-800">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Explorer</span>
          </div>
          <div className="flex-1 overflow-y-auto p-1">
            {renderFileTree(fileTree)}
          </div>
        </div>

        {/* Compact Code Display */}
        <div className="col-span-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1 bg-zinc-900/30 border-b border-zinc-800">
            <span className="text-[11px] font-mono text-purple-400 truncate">
              {selectedFile || 'No file selected'}
            </span>
            {selectedFileContent && (
              <button
                onClick={() => copyToClipboard(selectedFileContent, selectedFile!)}
                className="flex items-center gap-1 px-2 py-0.5 hover:bg-zinc-800 rounded text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {copiedFile === selectedFile ? (
                  <>
                    <Check className="h-3 w-3 text-green-400" />
                    <span className="text-green-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-hidden bg-[#1e1e1e] relative">
            {selectedFileContent ? (
              <>
                <Editor
                  height="100%"
                  language={getMonacoLanguage(selectedFile!)}
                  value={displayedContent}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    padding: { top: 12, bottom: 12 },
                    scrollbar: {
                      vertical: 'auto',
                      horizontal: 'auto',
                      verticalScrollbarSize: 10,
                      horizontalScrollbarSize: 10,
                    },
                    renderLineHighlight: 'none',
                    overviewRulerBorder: false,
                    hideCursorInOverviewRuler: true,
                    overviewRulerLanes: 0,
                    cursorStyle: isTyping ? 'line' : 'line-thin',
                    cursorBlinking: isTyping ? 'blink' : 'solid',
                  }}
                  loading={
                    <div className="h-full flex items-center justify-center text-zinc-500">
                      <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full" />
                    </div>
                  }
                />
                {isTyping && (
                  <div className="absolute top-2 right-2 flex items-center gap-2 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-xs text-purple-400">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                    <span>Writing code...</span>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600">
                <div className="text-center">
                  <File className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-[11px]">Select a file to view</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


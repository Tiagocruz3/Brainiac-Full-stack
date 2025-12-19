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

  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'css': 'css',
      'html': 'html',
      'md': 'markdown',
    };
    return langMap[ext || ''] || 'text';
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

  const highlightSyntax = (code: string, _language: string): JSX.Element => {
    // Claude-style syntax highlighting with subtle colors
    const lines = code.split('\n');
    
    return (
      <>
        {lines.map((line, idx) => {
          let highlightedLine = line
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          
          // Keywords (purple/violet)
          const keywords = ['import', 'export', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'enum', 'async', 'await', 'from', 'default', 'extends', 'implements'];
          keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
            highlightedLine = highlightedLine.replace(regex, '<span class="text-violet-400">$1</span>');
          });
          
          // Strings (emerald/green)
          highlightedLine = highlightedLine.replace(/(["'`])((?:\\.|(?!\1).)*?)\1/g, '<span class="text-emerald-400">$1$2$1</span>');
          
          // Comments (muted gray)
          highlightedLine = highlightedLine.replace(/(\/\/.*$)/g, '<span class="text-zinc-600 italic">$1</span>');
          highlightedLine = highlightedLine.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-zinc-600 italic">$1</span>');
          
          // Numbers (amber)
          highlightedLine = highlightedLine.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>');
          
          // JSX/TSX components (cyan)
          highlightedLine = highlightedLine.replace(/&lt;(\/?[A-Z]\w*)/g, '<span class="text-cyan-400">&lt;$1</span>');
          highlightedLine = highlightedLine.replace(/&lt;(\/?[a-z]\w*)/g, '<span class="text-sky-400">&lt;$1</span>');
          
          // Function calls (blue)
          highlightedLine = highlightedLine.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="text-blue-400">$1</span>');
          
          return (
            <div key={idx} className="flex hover:bg-zinc-900/20 transition-colors">
              <span className="text-zinc-700 select-none w-8 text-right pr-2 flex-shrink-0 text-[10px] leading-[1.6]">
                {idx + 1}
              </span>
              <span className="flex-1 text-zinc-300" dangerouslySetInnerHTML={{ __html: highlightedLine || '&nbsp;' }} />
            </div>
          );
        })}
      </>
    );
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
          <div className="flex-1 overflow-auto bg-[#0a0a0a]">
            {selectedFileContent ? (
              <pre className="p-3 text-[11px] font-mono leading-[1.6]">
                {highlightSyntax(selectedFileContent, getLanguageFromFileName(selectedFile!))}
              </pre>
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


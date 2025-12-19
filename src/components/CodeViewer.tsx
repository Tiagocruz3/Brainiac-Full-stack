/**
 * CodeViewer Component
 * 
 * Shows generated code files with syntax highlighting and file tree
 * Similar to v0.dev and bolt.new
 */

import React, { useState } from 'react';
import { File, Folder, FolderOpen, Copy, Check, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
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
    // Simple syntax highlighting with color coding
    const lines = code.split('\n');
    
    return (
      <>
        {lines.map((line, idx) => {
          let highlightedLine = line;
          
          // Keywords
          const keywords = ['import', 'export', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'enum', 'async', 'await', 'from', 'default'];
          keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
            highlightedLine = highlightedLine.replace(regex, `<span class="text-purple-400">$1</span>`);
          });
          
          // Strings
          highlightedLine = highlightedLine.replace(/(["'`])(.*?)\1/g, '<span class="text-green-400">$1$2$1</span>');
          
          // Comments
          highlightedLine = highlightedLine.replace(/(\/\/.*$)/g, '<span class="text-zinc-500 italic">$1</span>');
          highlightedLine = highlightedLine.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-zinc-500 italic">$1</span>');
          
          // Numbers
          highlightedLine = highlightedLine.replace(/\b(\d+)\b/g, '<span class="text-yellow-400">$1</span>');
          
          // JSX tags
          highlightedLine = highlightedLine.replace(/&lt;(\/?[A-Z]\w*)/g, '<span class="text-pink-400">&lt;$1</span>');
          highlightedLine = highlightedLine.replace(/&lt;(\/?[a-z]\w*)/g, '<span class="text-blue-400">&lt;$1</span>');
          
          return (
            <div key={idx} className="flex">
              <span className="text-zinc-600 select-none w-12 text-right pr-4 flex-shrink-0">
                {idx + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: highlightedLine || ' ' }} />
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
            'flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-zinc-800/50 rounded text-sm transition-colors',
            isSelected && 'bg-zinc-800 text-purple-400 border-l-2 border-purple-500'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setSelectedFile(node.path)}
        >
          <span className="text-sm">{icon}</span>
          <span className="text-zinc-300 font-mono text-xs">{node.name}</span>
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
          className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-zinc-800/50 rounded text-sm transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => toggleFolder(node.path)}
        >
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-purple-400" />
          ) : (
            <Folder className="h-4 w-4 text-zinc-500" />
          )}
          <span className="text-zinc-300 font-medium font-mono text-xs">{node.name}</span>
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
    <div className={cn('h-full flex flex-col gap-4', className)}>
      {/* Header */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">{projectName}</h3>
              <p className="text-sm text-zinc-400 mt-1">
                {Object.keys(files).length} files generated
              </p>
            </div>
            {deploymentUrl && (
              <Button
                onClick={() => window.open(deploymentUrl, '_blank')}
                size="sm"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View Live
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Code Explorer */}
      <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden">
        {/* File Tree */}
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800 py-3 px-4">
            <CardTitle className="text-sm font-medium text-zinc-400">Files</CardTitle>
          </CardHeader>
          <CardContent className="p-2 overflow-y-auto max-h-[600px]">
            {renderFileTree(fileTree)}
          </CardContent>
        </Card>

        {/* Code Display */}
        <Card className="col-span-3 bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col">
          <CardHeader className="border-b border-zinc-800 py-3 px-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-400">
                {selectedFile || 'Select a file'}
              </CardTitle>
              {selectedFileContent && (
                <Button
                  onClick={() => copyToClipboard(selectedFileContent, selectedFile!)}
                  size="sm"
                  variant="ghost"
                  className="gap-2 h-8"
                >
                  {copiedFile === selectedFile ? (
                    <>
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            {selectedFileContent ? (
              <div className="h-full overflow-auto bg-zinc-950">
                <pre className="p-4 text-sm font-mono leading-relaxed">
                  {highlightSyntax(selectedFileContent, getLanguageFromFileName(selectedFile!))}
                </pre>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a file to view its contents</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


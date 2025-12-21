/**
 * Lazy Monaco Editor
 * Loads Monaco editor only when needed to improve performance
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load Monaco editor
const Editor = lazy(() =>
  import('@monaco-editor/react').then((module) => ({
    default: module.default,
  }))
);

interface LazyMonacoEditorProps {
  value: string;
  language: string;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
  className?: string;
  onMount?: (editor: any, monaco: any) => void;
  immediate?: boolean; // Skip lazy loading delay
}

export const LazyMonacoEditor: React.FC<LazyMonacoEditorProps> = ({
  value,
  language,
  onChange,
  readOnly = true,
  className = '',
  onMount,
  immediate = false,
}) => {
  const [shouldLoad, setShouldLoad] = useState(immediate);
  const [mounted, setMounted] = useState(false);

  // Delay loading slightly to prioritize initial render (unless immediate)
  useEffect(() => {
    if (immediate) {
      setShouldLoad(true);
      return;
    }
    
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [immediate]);

  // Track mount status for cleanup
  useEffect(() => {
    setMounted(true);
    console.log('🎨 Monaco Editor component mounted');

    return () => {
      setMounted(false);
      console.log('🧹 Monaco Editor component unmounted');
    };
  }, []);

  // Handle editor mount with cleanup
  const handleEditorMount = (editor: any, monaco: any) => {
    console.log('✅ Monaco Editor loaded');
    
    if (onMount) {
      onMount(editor, monaco);
    }

    // Dispose on unmount
    return () => {
      if (editor && !mounted) {
        console.log('🧹 Disposing Monaco Editor instance');
        editor.dispose();
      }
    };
  };

  // Loading fallback
  const LoadingFallback = () => (
    <div className={`flex items-center justify-center h-full bg-[#1e1e1e] ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
        <p className="text-sm text-zinc-400">Loading editor...</p>
      </div>
    </div>
  );

  if (!shouldLoad) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Editor
        value={value}
        language={language}
        onChange={onChange}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: true,
          folding: true,
          renderLineHighlight: 'all',
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            useShadows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
        onMount={handleEditorMount}
        className={className}
      />
    </Suspense>
  );
};

// Preload Monaco editor on hover or focus
export function useMonacoPreload() {
  const [preloaded, setPreloaded] = useState(false);

  const preload = () => {
    if (!preloaded) {
      console.log('⚡ Preloading Monaco Editor...');
      import('@monaco-editor/react');
      setPreloaded(true);
    }
  };

  return { preload, preloaded };
}


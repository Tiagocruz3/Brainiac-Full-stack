/**
 * PreviewManager Usage Examples
 * 
 * Demonstrates various ways to use the PreviewManager component
 * for managing preview lifecycle in the Brainiac app builder.
 */

import React, { useState, useEffect } from 'react';
import { PreviewManager, PreviewManagerWithIframe } from '@/components/PreviewManager';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Code2, Loader2, Play, Square } from 'lucide-react';

/**
 * Example 1: Basic Usage
 * Simple preview with auto-start
 */
export function BasicPreviewManagerExample() {
  const files = {
    'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Brainiac App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    'package.json': `{
  "name": "preview-app",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}`,
    'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`,
    'src/App.tsx': `export default function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'black',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold' }}>
          Hello from Brainiac! 🧠
        </h1>
        <p style={{ color: '#999', marginTop: '16px' }}>
          This preview was created automatically
        </p>
      </div>
    </div>
  );
}`,
  };

  return (
    <div className="h-screen p-6 bg-black">
      <PreviewManagerWithIframe
        projectId="basic-example"
        files={files}
        autoStart={true}
        showProgress={true}
        showControls={true}
        onPreviewReady={(url) => console.log('Preview ready:', url)}
        onError={(error) => console.error('Preview error:', error)}
        className="h-full"
      />
    </div>
  );
}

/**
 * Example 2: Incremental File Writing
 * Simulate AI generating files one by one
 */
export function IncrementalFileExample() {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Simulate AI generating files incrementally
  const generateFiles = async () => {
    setIsGenerating(true);
    setFiles({});

    const fileSequence = [
      ['index.html', '<!DOCTYPE html>...'],
      ['package.json', '{"name": "app"}...'],
      ['src/main.tsx', 'import React...'],
      ['src/App.tsx', 'export default function App()...'],
      ['src/components/Button.tsx', 'export const Button...'],
      ['src/components/Card.tsx', 'export const Card...'],
      ['src/styles/globals.css', '@tailwind base...'],
    ];

    for (const [path, content] of fileSequence) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setFiles(prev => ({ ...prev, [path]: content }));
    }

    setIsGenerating(false);
  };

  return (
    <div className="h-screen p-6 bg-black">
      <div className="max-w-7xl mx-auto h-full flex flex-col gap-4">
        {/* Header */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Incremental Preview Generation
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Watch as files are written incrementally
                </p>
              </div>
              <Button
                onClick={generateFiles}
                disabled={isGenerating}
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Code2 className="h-4 w-4 mr-2" />
                    Generate App
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          {/* File List */}
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Generated Files</span>
                <Badge variant="secondary">
                  {Object.keys(files).length} files
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                {Object.keys(files).length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-8">
                    No files yet. Click "Generate App" to start.
                  </p>
                ) : (
                  Object.entries(files).map(([path, content]) => (
                    <div
                      key={path}
                      className="p-3 bg-zinc-950/50 rounded border border-zinc-800 animate-in fade-in slide-in-from-left-2"
                    >
                      <p className="text-xs font-mono text-purple-400 mb-1">
                        {path}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {content.slice(0, 60)}...
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <div className="h-full">
            {Object.keys(files).length > 0 ? (
              <PreviewManagerWithIframe
                projectId="incremental-example"
                files={files}
                autoStart={true}
                showProgress={true}
                showControls={true}
                className="h-full"
              />
            ) : (
              <Card className="bg-zinc-900 border-zinc-800 h-full flex items-center justify-center">
                <div className="text-center text-zinc-500">
                  <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Waiting for files...</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 3: Custom Render Props
 * Use render props for full control over UI
 */
export function CustomRenderExample() {
  const files = {
    'src/App.tsx': `export default function App() {
      return <div>Custom Preview</div>;
    }`,
  };

  return (
    <div className="h-screen p-6 bg-black">
      <PreviewManager
        projectId="custom-render"
        files={files}
        autoStart={true}
        showProgress={false}
      >
        {({ previewUrl, status, progress, refresh, restart }) => (
          <div className="h-full flex flex-col">
            {/* Custom Header */}
            <Card className="bg-zinc-900 border-zinc-800 mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-white">
                      Preview Active
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {progress.percentage}% complete
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={refresh}>
                      Refresh
                    </Button>
                    <Button size="sm" variant="outline" onClick={restart}>
                      Restart
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Preview Frame */}
            <Card className="bg-zinc-900 border-zinc-800 flex-1 overflow-hidden">
              <CardContent className="p-0 h-full">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Custom Preview"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </PreviewManager>
    </div>
  );
}

/**
 * Example 4: Manual Control
 * Control preview lifecycle manually
 */
export function ManualControlExample() {
  const [previewActive, setPreviewActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const files = {
    'src/App.tsx': `export default function App() {
      return <h1>Manual Preview Control</h1>;
    }`,
  };

  return (
    <div className="h-screen p-6 bg-black">
      <div className="max-w-4xl mx-auto h-full flex flex-col gap-4">
        {/* Controls */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">
                  Manual Preview Control
                </h2>
                <p className="text-sm text-zinc-400">
                  Start and stop preview manually
                </p>
              </div>
              <div className="flex gap-2">
                {!previewActive ? (
                  <Button
                    onClick={() => setPreviewActive(true)}
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Preview
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setPreviewActive(false);
                      setPreviewUrl('');
                    }}
                    variant="destructive"
                    size="lg"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Preview
                  </Button>
                )}
              </div>
            </div>

            {previewUrl && (
              <div className="mt-4 p-3 bg-zinc-950/50 rounded border border-zinc-800">
                <p className="text-xs text-zinc-400 mb-1">Preview URL:</p>
                <p className="text-sm font-mono text-purple-400">{previewUrl}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Area */}
        <div className="flex-1">
          {previewActive ? (
            <PreviewManagerWithIframe
              projectId="manual-control"
              files={files}
              autoStart={true}
              showProgress={true}
              showControls={true}
              onPreviewReady={(url) => setPreviewUrl(url)}
              onError={(error) => {
                console.error(error);
                setPreviewActive(false);
              }}
              className="h-full"
            />
          ) : (
            <Card className="bg-zinc-900 border-zinc-800 h-full flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Start Preview" to begin</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Example 5: Integration with AI Agent
 * Real-world integration example
 */
export function AgentIntegrationFullExample() {
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, string> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedFiles(null);
    setPreviewUrl('');

    // Simulate AI agent generating code
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generated files from AI
    const files = {
      'index.html': '<!DOCTYPE html>...',
      'package.json': '{"name": "ai-app"}...',
      'src/main.tsx': 'import React...',
      'src/App.tsx': `export default function App() {
        return (
          <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h1>Generated by Brainiac AI! 🤖</h1>
          </div>
        );
      }`,
    };

    setGeneratedFiles(files);
    setIsGenerating(false);
  };

  return (
    <div className="h-screen p-6 bg-black">
      <div className="max-w-7xl mx-auto h-full flex flex-col gap-4">
        {/* Header */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  AI Agent + Live Preview
                </h2>
                <p className="text-sm text-zinc-400">
                  Generate code with AI and preview instantly
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    AI Generating...
                  </>
                ) : (
                  <>
                    <Code2 className="h-4 w-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Area */}
        <div className="flex-1">
          {generatedFiles ? (
            <PreviewManagerWithIframe
              projectId="ai-integration"
              files={generatedFiles}
              autoStart={true}
              showProgress={true}
              showControls={true}
              onPreviewReady={(url) => {
                setPreviewUrl(url);
                console.log('✅ Preview ready:', url);
              }}
              onError={(error) => {
                console.error('❌ Preview error:', error);
              }}
              onStatusChange={(status) => {
                console.log('📊 Status:', status);
              }}
              className="h-full"
            />
          ) : (
            <Card className="bg-zinc-900 border-zinc-800 h-full flex items-center justify-center">
              <div className="text-center text-zinc-500">
                <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-base mb-2">
                  {isGenerating ? 'AI is generating your app...' : 'Ready to generate'}
                </p>
                <p className="text-sm text-zinc-600">
                  Click "Generate with AI" to start
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Info */}
        {previewUrl && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Preview URL:</p>
                  <p className="text-sm font-mono text-purple-400">{previewUrl}</p>
                </div>
                <Button
                  onClick={() => window.open(previewUrl, '_blank')}
                  size="sm"
                  variant="outline"
                >
                  Open in New Tab
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


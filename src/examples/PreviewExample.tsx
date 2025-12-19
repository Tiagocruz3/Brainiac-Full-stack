/**
 * Preview System Integration Example
 * 
 * This file demonstrates how to integrate the preview system
 * into the Brainiac app builder.
 */

import React, { useState } from 'react';
import { Preview, PreviewWithEditor } from '@/components/Preview';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { usePreviewServer } from '@/hooks/usePreviewServer';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, Code2, Split } from 'lucide-react';

/**
 * Example 1: Basic Preview
 * Simple preview of generated code
 */
export function BasicPreviewExample() {
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
    'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`,
    'src/App.tsx': `export default function App() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Hello from Brainiac! 🧠
        </h1>
        <p className="text-zinc-400 mt-4">Built with AI in seconds</p>
      </div>
    </div>
  );
}`,
    'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
  };

  return (
    <div className="h-screen">
      <Preview
        projectId="example-basic"
        files={files}
        showControls={true}
        onReady={(url) => console.log('Preview ready:', url)}
        onError={(error) => console.error('Preview error:', error)}
      />
    </div>
  );
}

/**
 * Example 2: Preview with Live Code Editing
 * Split view with code editor and live preview
 */
export function LiveEditingExample() {
  const [code, setCode] = useState(`export default function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-8">
          Count: {count}
        </h1>
        <button
          onClick={() => setCount(count + 1)}
          className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          Increment
        </button>
      </div>
    </div>
  );
}`);

  const files = {
    'index.html': '...',
    'src/main.tsx': '...',
    'src/App.tsx': code,
  };

  const CodeEditor = () => (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-white">App.tsx</h3>
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="flex-1 p-4 bg-zinc-950 text-white font-mono text-sm resize-none focus:outline-none"
        spellCheck={false}
      />
    </div>
  );

  return (
    <div className="h-screen">
      <PreviewWithEditor
        projectId="example-live-edit"
        files={files}
        editor={<CodeEditor />}
        splitRatio={50}
        onReady={(url) => console.log('Live preview ready:', url)}
      />
    </div>
  );
}

/**
 * Example 3: Preview Dashboard
 * Manage multiple preview instances
 */
export function PreviewDashboardExample() {
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const createNewPreview = () => {
    const projectId = `project-${Date.now()}`;
    setProjects([...projects, projectId]);
    setSelectedProject(projectId);
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Preview Dashboard</h1>
          <Button onClick={createNewPreview}>
            <Eye className="h-4 w-4 mr-2" />
            New Preview
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="col-span-1">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Active Previews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {projects.map((projectId) => (
                  <button
                    key={projectId}
                    onClick={() => setSelectedProject(projectId)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedProject === projectId
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{projectId}</span>
                      <Badge variant="secondary">Live</Badge>
                    </div>
                  </button>
                ))}
                {projects.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-4">
                    No previews yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Area */}
          <div className="col-span-3">
            {selectedProject ? (
              <Preview
                projectId={selectedProject}
                files={{ 'src/App.tsx': '...' }}
                className="h-[800px]"
              />
            ) : (
              <Card className="bg-zinc-900 border-zinc-800 h-[800px] flex items-center justify-center">
                <div className="text-center text-zinc-500">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select or create a preview to get started</p>
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
 * Example 4: Integration with Brainiac Agent
 * Create preview from AI-generated code
 */
export function AgentIntegrationExample() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, string> | null>(null);
  const { createPreview, previewUrl, isLoading } = usePreviewServer();

  const generateApp = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const files = {
      'index.html': '...',
      'src/main.tsx': '...',
      'src/App.tsx': `export default function App() {
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black">
            <h1 className="text-4xl">Generated by Brainiac AI! 🤖</h1>
          </div>
        );
      }`,
    };
    
    setGeneratedFiles(files);
    setIsGenerating(false);
    
    // Create preview
    await createPreview('ai-generated', files);
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-5xl mx-auto">
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  AI App Generator
                </h2>
                <p className="text-sm text-zinc-400">
                  Generate an app and preview it instantly
                </p>
              </div>
              <Button
                onClick={generateApp}
                disabled={isGenerating || isLoading}
                size="lg"
              >
                {isGenerating || isLoading ? (
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

        {previewUrl && generatedFiles && (
          <div className="h-[700px]">
            <Preview
              projectId="ai-generated"
              files={generatedFiles}
              showControls={true}
            />
          </div>
        )}

        {!previewUrl && !isGenerating && (
          <Card className="bg-zinc-900 border-zinc-800 h-[700px] flex items-center justify-center">
            <div className="text-center text-zinc-500">
              <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Generate App" to start</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * Example 5: Multi-View Preview
 * Show desktop, tablet, and mobile views simultaneously
 */
export function MultiViewPreviewExample() {
  const files = {
    'src/App.tsx': `export default function App() {
      return (
        <div className="min-h-screen bg-black p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-4">
              Responsive Preview Test
            </h1>
            <p className="text-zinc-400">
              This preview shows how your app looks on different devices
            </p>
          </div>
        </div>
      );
    }`,
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Multi-View Preview</h1>
      
      <div className="grid grid-cols-3 gap-6">
        {/* Desktop */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Desktop</span>
              <Badge variant="secondary">1920×1080</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="aspect-video bg-white">
              <Preview
                projectId="multi-view-desktop"
                files={files}
                showControls={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tablet */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Tablet</span>
              <Badge variant="secondary">768×1024</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="aspect-[3/4] bg-white max-w-xs mx-auto">
              <Preview
                projectId="multi-view-tablet"
                files={files}
                showControls={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Mobile */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Mobile</span>
              <Badge variant="secondary">375×667</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="aspect-[9/16] bg-white max-w-[200px] mx-auto">
              <Preview
                projectId="multi-view-mobile"
                files={files}
                showControls={false}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


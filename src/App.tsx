import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Menu, X } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Settings } from './components/Settings';
import { Chat } from './components/Chat';
import { StatusBar } from './components/StatusBar';
import { ProjectHistory } from './components/ProjectHistory';
import { RepoManager } from './components/RepoManager';
import { CodeViewer } from './components/CodeViewer';
import { PreviewLoading } from './components/PreviewLoading';
import { PreviewIframe } from './components/PreviewIframe';
import { PreviewError } from './components/PreviewError';
import { SplitPane } from './components/SplitPane';
import { Settings as SettingsType, AgentMessage, BuildStatus, ProjectHistory as ProjectHistoryType } from './types';
import { hasValidSettings, loadHistory, loadSettings, saveProject } from './lib/storage';
import { generateId } from './lib/utils';
import { runAgent } from './lib/agent';
import { previewErrorHandler, PreviewError as PreviewErrorType } from './lib/preview-errors';
import { previewManager } from './lib/preview-manager';
import { usePreviewOptimization, usePerformanceMonitor } from './hooks/usePreviewOptimization';

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [repoManagerOpen, setRepoManagerOpen] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]); // Anthropic message format
  const [_currentProject, setCurrentProject] = useState<BuildStatus['currentProject']>();
  const [buildStatus, setBuildStatus] = useState<BuildStatus>({
    stage: 'idle',
    message: '',
    progress: 0,
  });
  const [_maxProgress, setMaxProgress] = useState(0); // Track highest progress
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [projectHistory, setProjectHistory] = useState<ProjectHistoryType[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('claude-sonnet-4-20250514');
  const [previewFiles, setPreviewFiles] = useState<Record<string, string> | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [currentProjectName, setCurrentProjectName] = useState<string>('');
  const [currentDeploymentUrl, setCurrentDeploymentUrl] = useState<string>('');
  const [filesGenerated, setFilesGenerated] = useState<number>(0);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [previewError, setPreviewError] = useState<PreviewErrorType | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Prevent late async updates from older runs (which can make the iframe show a "random" older site)
  const activeRunIdRef = useRef<string>('');

  const normalizeVercelPreviewUrl = (raw: unknown): string | null => {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withProtocol =
      trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
    try {
      const u = new URL(withProtocol);
      if (u.protocol !== 'https:') return null;
      if (!u.hostname.endsWith('.vercel.app')) return null;
      return u.toString();
    } catch {
      return null;
    }
  };

  // Performance optimization hooks
  const previewOptimization = usePreviewOptimization({
    debounceDelay: 500,
    throttleDelay: 1000,
    maxFileSize: 5 * 1024 * 1024, // 5MB
  });
  const performanceMonitor = usePerformanceMonitor('App');

  useEffect(() => {
    console.log('🚀 Brainiac App mounted');
    performanceMonitor.start();

    return () => {
      console.log('🧹 Brainiac App unmounting - cleaning up...');
      previewOptimization.cleanup();
      previewManager.dispose();
      performanceMonitor.end();
    };
  }, [previewOptimization, performanceMonitor]);

  useEffect(() => {
    // Check if settings exist on mount
    const valid = hasValidSettings();
    setHasSettings(valid);
    
    // Show settings modal if no valid settings
    if (!valid) {
      setSettingsOpen(true);
    }

    // Load project history
    setProjectHistory(loadHistory());
  }, []);

  const handleSettingsSave = (_settings: SettingsType) => {
    setHasSettings(true);
    // Settings are saved in the Settings component via localStorage
  };

  const handleSendMessage = async (message: string) => {
    if (!hasSettings) {
      setSettingsOpen(true);
      return;
    }

    // Add user message
    const userMessage: AgentMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Load settings
    const settings = loadSettings();
    if (!settings) {
      setSettingsOpen(true);
      return;
    }

    // Create abort controller for stop button
    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);
    setMaxProgress(0);

    // Add step messages to chat as we progress
    const addStepMessage = (step: string) => {
      const stepMessage: AgentMessage = {
        role: 'assistant',
        content: `⚡ ${step}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, stepMessage]);
    };

    try {
      // Generate a new project ID for this build
      const projectId = `project-${Date.now()}`;
      activeRunIdRef.current = projectId;
      setCurrentProjectId(projectId);
      setPreviewFiles(null); // Clear previous preview
      setPreviewError(null); // Clear previous errors
      setCurrentProjectName(message.slice(0, 50));
      setCurrentDeploymentUrl('');
      setFilesGenerated(0);
      setTotalFiles(17); // Standard template has ~17 files

      // Run the agent with conversation history for context!
      const result = await runAgent(
        message,
        settings.apiKeys,
        (stage, msg, progress) => {
          // Ignore stale progress from previous runs
          if (activeRunIdRef.current !== projectId) return;
          // Only increase progress, never decrease
          setMaxProgress(prev => {
            const newProgress = Math.max(prev, progress);
            setBuildStatus({
              stage: stage as any,
              message: msg,
              progress: newProgress,
            });
            return newProgress;
          });

          // Add step messages for key milestones
          if (progress === 15) addStepMessage('Initializing project setup...');
          if (progress === 20) addStepMessage('Configuring database...');
          if (progress === 50) addStepMessage('Database provisioned successfully!');
          if (progress === 58) addStepMessage('Setting up authentication...');
          if (progress === 60) {
            addStepMessage('Creating GitHub repository...');
          }
          if (progress === 70) addStepMessage('Generating application code...');
          if (progress === 80) addStepMessage('Deploying to production...');
          if (progress === 95) addStepMessage('Finalizing deployment...');
        },
        conversationHistory.length > 0 ? conversationHistory : undefined,
        controller.signal, // ← Pass abort signal!
        selectedModel, // ← Pass selected model!
        // 🎬 File update callback for live preview - simplified to avoid re-render loops
        (incomingFiles) => {
          // Ignore stale file updates from previous runs
          if (activeRunIdRef.current !== projectId) return;
          console.log('🎬 Received files for preview:', Object.keys(incomingFiles));
          const incomingCount = Object.keys(incomingFiles).length;
          
          // Update file count immediately
          setFilesGenerated(prev => Math.max(prev, incomingCount));
          
          // Merge files with existing - use functional update to get current state
          setPreviewFiles(prevFiles => {
            const mergedFiles = prevFiles ? { ...prevFiles, ...incomingFiles } : incomingFiles;
            console.log(`🎬 Total files in preview: ${Object.keys(mergedFiles).length}`);
            return mergedFiles;
          });
        }
      );

      // If user started a newer run while this one was in-flight, ignore this result
      if (activeRunIdRef.current !== projectId) {
        console.log('⚠️ Ignoring stale agent result for older run:', projectId);
        return;
      }

      // IMPORTANT: Reset UI state IMMEDIATELY
      console.log('✅ Build complete! Resetting UI state...');
      
      setIsGenerating(false);
      setAbortController(null);
      setBuildStatus({ stage: 'idle', message: '', progress: 0 });
      setMaxProgress(0);

      console.log('✅ UI state reset. Input should be enabled now.');

      // Add assistant response
      const assistantMessage: AgentMessage = {
        role: 'assistant',
        content: result.message,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update conversation history for next message
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: result.message },
      ]);

      // Save project context for follow-up edits
      if (result.data?.projectContext) {
        setCurrentProject(result.data.projectContext);
      }

      // Update deployment URL if available with error handling
      if (result.data?.vercelUrl) {
        try {
          const normalized = normalizeVercelPreviewUrl(result.data.vercelUrl);
          if (!normalized) {
            console.warn('⚠️ Ignoring invalid Vercel URL from agent:', result.data.vercelUrl);
          } else {
            setCurrentDeploymentUrl(normalized);
            console.log('✅ Deployment URL set:', normalized);
          }
        } catch (deployError) {
          console.error('❌ Failed to set deployment URL:', deployError);
          const error = previewErrorHandler.createError(deployError, 'deployment');
          setPreviewError(error);
          console.log(previewErrorHandler.formatForLogging(error));
        }
      }

      // Save to history
      if (result.success && result.data) {
        const project: ProjectHistoryType = {
          id: generateId(),
          name: message.slice(0, 50),
          prompt: message,
          githubUrl: result.data.githubUrl || '',
          vercelUrl: result.data.vercelUrl || '',
          supabaseUrl: result.data.supabaseUrl || '',
          createdAt: new Date().toISOString(),
          success: true,
        };
        saveProject(project);
        setProjectHistory(prev => [project, ...prev]);
      }
    } catch (error: any) {
      // Clear active run so late callbacks can't mutate UI after failure
      activeRunIdRef.current = '';
      // IMPORTANT: Reset UI state on error
      console.log('❌ Build error! Resetting UI state...');
      
      setIsGenerating(false);
      setAbortController(null);
      setBuildStatus({ stage: 'idle', message: '', progress: 0 });
      setMaxProgress(0);

      console.log('✅ UI state reset after error. Input should be enabled now.');
      
      console.error('Build error:', error);
      
      const errorMessage: AgentMessage = {
        role: 'assistant',
        content: `❌ Build failed: ${error.message || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);

      // Save failed project to history
      const project: ProjectHistoryType = {
        id: generateId(),
        name: message.slice(0, 50),
        prompt: message,
        githubUrl: '',
        vercelUrl: '',
        supabaseUrl: '',
        createdAt: new Date().toISOString(),
        success: false,
      };
      saveProject(project);
      setProjectHistory(prev => [project, ...prev]);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      console.log('⏹️ User clicked stop! Aborting build...');
      
      abortController.abort();
      activeRunIdRef.current = '';
      
      // Immediately reset UI
      setIsGenerating(false);
      setAbortController(null);
      setBuildStatus({ stage: 'idle', message: '', progress: 0 });
      setMaxProgress(0);

      console.log('✅ Build stopped. UI reset. Input should be enabled now.');
      
      const stopMessage: AgentMessage = {
        role: 'assistant',
        content: '⏹️ Generation stopped by user.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, stopMessage]);
    }
  };

  const handleClearHistory = () => {
    setProjectHistory([]);
  };

  const handleRetryPreview = () => {
    console.log('🔄 Retrying preview...');
    setPreviewError(null);
    
    // If we have the deployment URL, try reloading it
    if (currentDeploymentUrl) {
      const normalized = normalizeVercelPreviewUrl(currentDeploymentUrl);
      if (!normalized) {
        console.warn('⚠️ Not retrying preview; currentDeploymentUrl is invalid:', currentDeploymentUrl);
        return;
      }
      // Force iframe reload by updating the key
      setCurrentDeploymentUrl('');
      setTimeout(() => {
        setCurrentDeploymentUrl(normalized);
      }, 100);
    }
  };

  const handleClearCacheAndRetry = () => {
    console.log('🗑️ Clearing cache and retrying...');
    
    // Destroy current preview instance
    if (currentProjectId) {
      previewManager.destroyPreview(currentProjectId);
    }
    
    // Clear all preview-related state
    setPreviewFiles(null);
    setPreviewError(null);
    setCurrentDeploymentUrl('');
    setFilesGenerated(0);
    
    // Reset error handler retry counters
    previewErrorHandler.resetRetries(currentProjectId);
    
    // Wait a moment then try again
    setTimeout(() => {
      handleRetryPreview();
    }, 500);
  };

  // Cleanup old preview when starting new project
  useEffect(() => {
    return () => {
      if (currentProjectId) {
        console.log('🧹 Cleaning up preview for project:', currentProjectId);
        previewManager.destroyPreview(currentProjectId);
      }
    };
  }, [currentProjectId]);

  // Log preview manager status periodically (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const status = previewManager.getStatus();
        console.log('📊 Preview Manager Status:', {
          instances: `${status.instanceCount}/${status.maxInstances}`,
          memory: `${(status.totalMemory / 1024 / 1024).toFixed(2)}MB / ${(status.maxMemory / 1024 / 1024).toFixed(2)}MB`,
        });
      }, 60000); // Every minute

      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 h-10 w-10 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-72 border-r border-zinc-800/50 flex flex-col bg-zinc-950/30 backdrop-blur-xl
        md:relative fixed inset-y-0 left-0 z-50
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Compact Header */}
        <div className="p-4 border-b border-zinc-800/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <span className="text-white text-sm font-bold">B</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Brainiac</h1>
                <p className="text-xs text-zinc-500">AI App Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8 relative"
              >
                <SettingsIcon className="h-4 w-4" />
                {!hasSettings && (
                  <span className="absolute top-0.5 right-0.5 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </Button>
              {/* Close button (mobile only) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8 md:hidden"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {!hasSettings && (
            <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-500/90 flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <span>Configure API keys to start</span>
            </div>
          )}
        </div>

        {/* Project History */}
        <div className="flex-1 overflow-hidden">
          <ProjectHistory 
            projects={projectHistory}
            onClearHistory={handleClearHistory}
            onOpenRepoManager={() => {
              setRepoManagerOpen(true);
              setSidebarOpen(false);
            }}
          />
        </div>
      </div>

      {/* Main Content - Responsive SplitPane */}
      <div className="flex-1 overflow-hidden md:ml-0">
        <SplitPane
          chatContent={
            <Chat
              messages={messages}
              onSendMessage={handleSendMessage}
              isBuilding={isGenerating}
              buildStatus={buildStatus}
              onStopGeneration={handleStopGeneration}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          }
          codeContent={
            // Show loading state while generating and no files yet
            isGenerating && Object.keys(previewFiles || {}).length === 0 ? (
              <PreviewLoading
                stage={buildStatus.stage}
                filesGenerated={filesGenerated}
                totalFiles={totalFiles}
                message={buildStatus.message || 'Preparing preview...'}
                progress={buildStatus.progress}
              />
            ) : previewFiles && Object.keys(previewFiles).length > 0 ? (
              // Use stable key based on project name to prevent remounts
              <CodeViewer
                key={`code-viewer-${currentProjectName || 'default'}`}
                files={previewFiles}
                projectName={currentProjectName || 'Generated App'}
                deploymentUrl={currentDeploymentUrl}
                className="h-full"
              />
            ) : null
          }
          previewContent={
            // Show preview iframe or error
            currentDeploymentUrl && !previewError ? (
              <PreviewIframe
                url={currentDeploymentUrl}
                projectName={currentProjectName || 'Generated App'}
              />
            ) : previewError ? (
              <PreviewError
                error={previewError}
                onRetry={handleRetryPreview}
                onClearCache={handleClearCacheAndRetry}
              />
            ) : null
          }
        />
      </div>

      {/* Settings Modal */}
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSettingsSave}
      />

      {/* Repo Manager Modal */}
      {repoManagerOpen && (
        <RepoManager onClose={() => setRepoManagerOpen(false)} />
      )}

      {/* Status Bar - Only show errors */}
      {buildStatus.stage === 'error' && <StatusBar status={buildStatus} />}
    </div>
  );
}

export default App;

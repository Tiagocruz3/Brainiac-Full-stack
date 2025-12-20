import { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
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
import { Settings as SettingsType, AgentMessage, BuildStatus, ProjectHistory as ProjectHistoryType } from './types';
import { hasValidSettings, loadHistory, loadSettings, saveProject } from './lib/storage';
import { generateId } from './lib/utils';
import { runAgent } from './lib/agent';
import { previewErrorHandler, PreviewError as PreviewErrorType } from './lib/preview-errors';

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
        // 🎬 File update callback for live preview!
        (files) => {
          console.log('🎬 Received files for preview:', Object.keys(files));
          const fileCount = Object.keys(files).length;
          setFilesGenerated(fileCount);
          setPreviewFiles(files);
          if (fileCount >= totalFiles) {
            addStepMessage('🎬 All files generated!');
          }
        }
      );

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
          setCurrentDeploymentUrl(result.data.vercelUrl);
          console.log('✅ Deployment URL set:', result.data.vercelUrl);
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
      // Force iframe reload by updating the key
      setCurrentDeploymentUrl('');
      setTimeout(() => {
        setCurrentDeploymentUrl(currentDeploymentUrl);
      }, 100);
    }
  };

  const handleClearCacheAndRetry = () => {
    console.log('🗑️ Clearing cache and retrying...');
    
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

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Compact Sidebar */}
      <div className="w-72 border-r border-zinc-800/50 flex flex-col bg-zinc-950/30 backdrop-blur-xl">
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
            onOpenRepoManager={() => setRepoManagerOpen(true)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
        {/* Chat Column */}
        <div className={`flex flex-col ${(previewFiles || currentDeploymentUrl || previewError) ? 'md:w-1/2' : 'w-full'} transition-all duration-300`}>
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            isBuilding={isGenerating}
            buildStatus={buildStatus}
            onStopGeneration={handleStopGeneration}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>

        {/* Code Viewer + Live Preview + Error Column */}
        {(isGenerating || previewFiles || currentDeploymentUrl || previewError) && (
          <div className="flex flex-col md:w-1/2 gap-4 animate-in slide-in-from-right overflow-hidden">
            {/* Loading State - Show while building and before files are generated */}
            {isGenerating && !previewFiles && (
              <div className="flex-1 min-h-0">
                <PreviewLoading
                  stage={buildStatus.stage}
                  filesGenerated={filesGenerated}
                  totalFiles={totalFiles}
                  message={buildStatus.message || 'Preparing preview...'}
                />
              </div>
            )}

            {/* Code Viewer - Show when files are generated */}
            {previewFiles && currentProjectId && (
              <div className="flex-1 min-h-0">
                <CodeViewer
                  files={previewFiles}
                  projectName={currentProjectName || 'Generated App'}
                  deploymentUrl={currentDeploymentUrl}
                  className="h-full"
                />
              </div>
            )}
            
            {/* Live Preview Iframe - Show when deployment URL is available */}
            {currentDeploymentUrl && !previewError && (
              <div className="flex-1 min-h-0">
                <PreviewIframe
                  url={currentDeploymentUrl}
                  projectName={currentProjectName || 'Generated App'}
                />
              </div>
            )}

            {/* Preview Error - Show when an error occurs */}
            {previewError && (
              <div className="flex-1 min-h-0">
                <PreviewError
                  error={previewError}
                  onRetry={handleRetryPreview}
                  onClearCache={handleClearCacheAndRetry}
                />
              </div>
            )}
          </div>
        )}
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

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Settings } from './components/Settings';
import { Chat } from './components/Chat';
import { StatusBar } from './components/StatusBar';
import { ProjectHistory } from './components/ProjectHistory';
import { RepoManager } from './components/RepoManager';
import { Settings as SettingsType, AgentMessage, BuildStatus, ProjectHistory as ProjectHistoryType } from './types';
import { hasValidSettings, loadHistory, loadSettings, saveProject } from './lib/storage';
import { generateId } from './lib/utils';
import { runAgent } from './lib/agent';

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
          if (progress === 60) addStepMessage('Creating GitHub repository...');
          if (progress === 70) addStepMessage('Generating application code...');
          if (progress === 80) addStepMessage('Deploying to production...');
          if (progress === 95) addStepMessage('Finalizing deployment...');
        },
        conversationHistory.length > 0 ? conversationHistory : undefined,
        controller.signal, // ← Pass abort signal!
        selectedModel // ← Pass selected model!
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
      <div className="flex-1 flex flex-col">
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

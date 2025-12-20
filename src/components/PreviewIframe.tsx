/**
 * PreviewIframe Component
 * Advanced preview with device frames, devtools, and keyboard shortcuts
 * Includes build waiting animation to give Vercel time to deploy
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, ExternalLink, Rocket, CheckCircle2, Clock, Server, Zap } from 'lucide-react';
import { Button } from './ui/Button';
import { PreviewToolbar } from './PreviewToolbar';
import { PreviewConsole } from './PreviewConsole';
import { PreviewNetwork } from './PreviewNetwork';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { 
  DeviceFrame, 
  DEVICE_PRESETS, 
  Orientation, 
  ConsoleMessage, 
  NetworkRequest 
} from '@/types/preview-controls';
import { generateId } from '@/lib/utils';

interface PreviewIframeProps {
  url: string;
  projectName?: string;
  className?: string;
  buildDelay?: number; // Delay in ms before showing iframe (default 60 seconds)
}

// Build stages for the animation
const BUILD_STAGES = [
  { id: 'queued', label: 'Build queued', icon: Clock, duration: 5 },
  { id: 'installing', label: 'Installing dependencies', icon: Server, duration: 15 },
  { id: 'building', label: 'Building application', icon: Zap, duration: 25 },
  { id: 'deploying', label: 'Deploying to edge', icon: Rocket, duration: 10 },
  { id: 'ready', label: 'Ready!', icon: CheckCircle2, duration: 5 },
];

export const PreviewIframe: React.FC<PreviewIframeProps> = ({
  url,
  projectName = 'Preview',
  className = '',
  buildDelay = 60000, // 60 seconds default
}) => {
  const [isBuilding, setIsBuilding] = useState(true);
  const [buildProgress, setBuildProgress] = useState(0);
  const [currentBuildStage, setCurrentBuildStage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<DeviceFrame>(DEVICE_PRESETS[0]); // Desktop
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [scale, setScale] = useState(1);
  const [showConsole, setShowConsole] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const buildTimerRef = useRef<number | null>(null);
  
  // Build waiting animation
  useEffect(() => {
    if (!isBuilding) return;
    
    const totalDuration = buildDelay;
    const startTime = Date.now();
    
    // Calculate stage durations proportionally
    const totalStageDuration = BUILD_STAGES.reduce((acc, s) => acc + s.duration, 0);
    
    buildTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / totalDuration) * 100, 100);
      setBuildProgress(progress);
      
      // Determine current stage based on progress
      let accumulatedProgress = 0;
      for (let i = 0; i < BUILD_STAGES.length; i++) {
        const stageProgress = (BUILD_STAGES[i].duration / totalStageDuration) * 100;
        accumulatedProgress += stageProgress;
        if (progress < accumulatedProgress) {
          setCurrentBuildStage(i);
          break;
        }
      }
      
      // Finish building
      if (elapsed >= totalDuration) {
        if (buildTimerRef.current) {
          window.clearInterval(buildTimerRef.current);
        }
        setCurrentBuildStage(BUILD_STAGES.length - 1);
        setBuildProgress(100);
        
        // Small delay before showing iframe
        setTimeout(() => {
          setIsBuilding(false);
          console.log('✅ Build wait complete, showing preview');
        }, 500);
      }
    }, 100);
    
    return () => {
      if (buildTimerRef.current) {
        window.clearInterval(buildTimerRef.current);
      }
    };
  }, [isBuilding, buildDelay]);
  
  // Skip build animation handler
  const handleSkipBuild = () => {
    if (buildTimerRef.current) {
      window.clearInterval(buildTimerRef.current);
    }
    setIsBuilding(false);
    console.log('⏭️ Build wait skipped');
  };

  // Get viewport dimensions based on device and orientation
  const getViewportDimensions = () => {
    const { width, height } = currentDevice;
    if (orientation === 'landscape' && (currentDevice.id === 'mobile' || currentDevice.id === 'tablet')) {
      return { width: height, height: width };
    }
    return { width, height };
  };

  const viewport = getViewportDimensions();

  // Handlers
  const handleRefresh = () => {
    console.log('🔄 Refreshing preview...');
    setIframeKey(prev => prev + 1);
    setIsLoading(true);
  };

  const handleDeviceChange = (device: DeviceFrame) => {
    console.log('📱 Device changed:', device.name);
    setCurrentDevice(device);
  };

  const handleOrientationToggle = () => {
    setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait');
    console.log('🔄 Orientation toggled:', orientation === 'portrait' ? 'landscape' : 'portrait');
  };

  const handleScaleChange = (newScale: number) => {
    setScale(newScale);
    console.log('🔍 Scale changed:', Math.round(newScale * 100) + '%');
  };

  const handleOpenInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
    console.log('🔗 Opened in new tab:', url);
  };

  const handleCycleDevice = () => {
    const currentIndex = DEVICE_PRESETS.findIndex(d => d.id === currentDevice.id);
    const nextIndex = (currentIndex + 1) % DEVICE_PRESETS.length;
    setCurrentDevice(DEVICE_PRESETS[nextIndex]);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(2, prev + 0.25));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.25, prev - 0.25));
  };

  const handleClearConsole = () => {
    setConsoleMessages([]);
    console.log('🧹 Console cleared');
  };

  const handleClearNetwork = () => {
    setNetworkRequests([]);
    console.log('🧹 Network log cleared');
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onRefresh: handleRefresh,
    onCycleDevice: handleCycleDevice,
    onToggleOrientation: handleOrientationToggle,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onToggleConsole: () => setShowConsole(prev => !prev),
    onToggleNetwork: () => setShowNetwork(prev => !prev),
    onOpenInNewTab: handleOpenInNewTab,
  }, true);

  // Iframe event listeners
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Listen for console messages (requires postMessage from iframe)
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from the preview iframe
      try {
        const previewUrl = new URL(url);
        if (event.origin !== previewUrl.origin) return;

        if (event.data.type === 'console') {
          const message: ConsoleMessage = {
            id: generateId(),
            type: event.data.level || 'log',
            message: event.data.message,
            timestamp: Date.now(),
            args: event.data.args,
          };
          setConsoleMessages(prev => [...prev, message]);
        } else if (event.data.type === 'network') {
          const request: NetworkRequest = {
            id: generateId(),
            method: event.data.method,
            url: event.data.url,
            status: event.data.status,
            statusText: event.data.statusText,
            duration: event.data.duration,
            timestamp: Date.now(),
          };
          setNetworkRequests(prev => [...prev, request]);
        }
      } catch (error) {
        // Ignore invalid messages
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [url]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    console.log('✅ Preview loaded');
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    console.error('❌ Preview failed to load');
  };

  const devtoolsHeight = showConsole || showNetwork ? '40%' : '0%';

  return (
    <motion.div
      className={`h-full flex flex-col border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Toolbar */}
      <PreviewToolbar
        currentDevice={currentDevice}
        orientation={orientation}
        scale={scale}
        url={url}
        onRefresh={handleRefresh}
        onDeviceChange={handleDeviceChange}
        onOrientationToggle={handleOrientationToggle}
        onScaleChange={handleScaleChange}
        onOpenInNewTab={handleOpenInNewTab}
        showConsole={showConsole}
        showNetwork={showNetwork}
        onToggleConsole={() => setShowConsole(prev => !prev)}
        onToggleNetwork={() => setShowNetwork(prev => !prev)}
      />

      {/* Preview Area + DevTools */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview Viewport */}
        <div 
          className="relative bg-zinc-900 overflow-auto"
          style={{ 
            height: showConsole || showNetwork ? '60%' : '100%',
            transition: 'height 0.3s ease'
          }}
        >
          {/* Building Animation - Waits for Vercel deployment */}
          <AnimatePresence>
            {isBuilding && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-full max-w-md px-8">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <motion.div
                      className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-4"
                      animate={{ 
                        scale: [1, 1.05, 1],
                        boxShadow: [
                          '0 0 20px rgba(168, 85, 247, 0.2)',
                          '0 0 40px rgba(168, 85, 247, 0.4)',
                          '0 0 20px rgba(168, 85, 247, 0.2)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Rocket className="w-8 h-8 text-purple-400" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-white mb-2">Deploying to Vercel</h3>
                    <p className="text-sm text-zinc-400">
                      {projectName} is being built and deployed
                    </p>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">Build Progress</span>
                      <span className="text-xs text-purple-400 font-mono">{Math.round(buildProgress)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${buildProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                  
                  {/* Build Stages */}
                  <div className="space-y-3 mb-8">
                    {BUILD_STAGES.map((stage, index) => {
                      const StageIcon = stage.icon;
                      const isActive = index === currentBuildStage;
                      const isComplete = index < currentBuildStage;
                      
                      return (
                        <motion.div
                          key={stage.id}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            isActive ? 'bg-purple-500/10 border border-purple-500/20' :
                            isComplete ? 'opacity-60' : 'opacity-30'
                          }`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: isActive ? 1 : isComplete ? 0.6 : 0.3, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isComplete ? 'bg-green-500/20' :
                            isActive ? 'bg-purple-500/20' : 'bg-zinc-800'
                          }`}>
                            {isComplete ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            ) : isActive ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <StageIcon className="w-4 h-4 text-purple-400" />
                              </motion.div>
                            ) : (
                              <StageIcon className="w-4 h-4 text-zinc-600" />
                            )}
                          </div>
                          <span className={`text-sm ${
                            isActive ? 'text-purple-400 font-medium' :
                            isComplete ? 'text-green-400' : 'text-zinc-600'
                          }`}>
                            {stage.label}
                          </span>
                          {isActive && (
                            <motion.div
                              className="ml-auto flex gap-1"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <div className="w-1 h-1 rounded-full bg-purple-400" />
                              <div className="w-1 h-1 rounded-full bg-purple-400" />
                              <div className="w-1 h-1 rounded-full bg-purple-400" />
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  
                  {/* Skip Button */}
                  <div className="text-center">
                    <button
                      onClick={handleSkipBuild}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline"
                    >
                      Skip waiting (preview may fail if not ready)
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          <AnimatePresence>
            {!isBuilding && isLoading && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-zinc-950/95 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center">
                  <motion.div
                    className="inline-block"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full" />
                  </motion.div>
                  <p className="mt-4 text-sm text-zinc-400">Loading preview...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error State */}
          {!isBuilding && hasError && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-zinc-950/95 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center max-w-md px-4">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Preview Failed to Load</h3>
                <p className="text-sm text-zinc-400 mb-6">
                  The preview couldn't be loaded. This might be a temporary issue with the deployment.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleRefresh} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                  <Button onClick={handleOpenInNewTab} variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Scaled Iframe Container - Only render when not building */}
          {!isBuilding && (
            <div 
              className="flex items-center justify-center p-4 min-h-full"
              style={{
                minWidth: viewport.width * scale,
                minHeight: viewport.height * scale,
              }}
            >
              <motion.div
                className="bg-white shadow-2xl"
                style={{
                  width: viewport.width,
                  height: viewport.height,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: scale, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  src={url}
                  className="w-full h-full border-0"
                  onLoad={handleLoad}
                  onError={handleError}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                  title={projectName}
                />
              </motion.div>
            </div>
          )}
        </div>

        {/* DevTools Panel */}
        <AnimatePresence>
          {(showConsole || showNetwork) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: devtoolsHeight, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-zinc-800"
            >
              {showConsole && (
                <PreviewConsole
                  messages={consoleMessages}
                  onClear={handleClearConsole}
                  className="h-full"
                />
              )}
              {showNetwork && !showConsole && (
                <PreviewNetwork
                  requests={networkRequests}
                  onClear={handleClearNetwork}
                  className="h-full"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

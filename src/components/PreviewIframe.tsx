/**
 * PreviewIframe Component
 * Advanced preview with device frames, devtools, and keyboard shortcuts
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
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
}

export const PreviewIframe: React.FC<PreviewIframeProps> = ({
  url,
  projectName = 'Preview',
  className = '',
}) => {
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
          {/* Loading State */}
          <AnimatePresence>
            {isLoading && (
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
          {hasError && (
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

          {/* Scaled Iframe Container */}
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

/**
 * PreviewToolbar Component
 * Professional toolbar for preview controls (device frames, zoom, utilities)
 */

import React, { useState } from 'react';
import {
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Terminal,
  Network,
} from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
import { DeviceFrame, DEVICE_PRESETS, Orientation } from '@/types/preview-controls';

interface PreviewToolbarProps {
  currentDevice: DeviceFrame;
  orientation: Orientation;
  scale: number;
  url: string;
  onRefresh: () => void;
  onDeviceChange: (device: DeviceFrame) => void;
  onOrientationToggle: () => void;
  onScaleChange: (scale: number) => void;
  onOpenInNewTab: () => void;
  showConsole: boolean;
  showNetwork: boolean;
  onToggleConsole: () => void;
  onToggleNetwork: () => void;
  className?: string;
}

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  currentDevice,
  orientation,
  scale,
  url,
  onRefresh,
  onDeviceChange,
  onOrientationToggle,
  onScaleChange,
  onOpenInNewTab,
  showConsole,
  showNetwork,
  onToggleConsole,
  onToggleNetwork,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [customDimensions, setCustomDimensions] = useState({ width: 1920, height: 1080 });
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const getDeviceIcon = (deviceId: string) => {
    switch (deviceId) {
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      case 'laptop':
        return <Laptop className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const handleCustomDevice = () => {
    const customDevice: DeviceFrame = {
      id: 'custom',
      name: 'Custom',
      width: customDimensions.width,
      height: customDimensions.height,
      icon: '⚙️',
    };
    onDeviceChange(customDevice);
    setShowDeviceMenu(false);
  };

  // Mobile simplified toolbar
  if (isMobile) {
    return (
      <div className={cn('flex items-center justify-between gap-2 px-3 py-3 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-sm', className)}>
        {/* Left: Essential controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            className="h-9 w-9 p-0"
            title="Refresh preview"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyUrl}
            className="h-9 w-9 p-0"
            title="Copy URL"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenInNewTab}
            className="h-9 w-9 p-0"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Desktop full toolbar
  return (
    <div className={cn('flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-sm', className)}>
      {/* Left: Device & Controls */}
      <div className="flex items-center gap-2">
        {/* Device Selector */}
        <div className="relative">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDeviceMenu(!showDeviceMenu)}
            className="gap-2 h-7 text-xs"
          >
            {getDeviceIcon(currentDevice.id)}
            <span className="font-medium">{currentDevice.name}</span>
            <span className="text-zinc-500">
              {orientation === 'landscape' ? (
                `${currentDevice.height}×${currentDevice.width}`
              ) : (
                `${currentDevice.width}×${currentDevice.height}`
              )}
            </span>
            <ChevronDown className="h-3 w-3 text-zinc-500" />
          </Button>

          {/* Device Menu */}
          {showDeviceMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDeviceMenu(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="p-2">
                  <div className="text-xs font-semibold text-zinc-400 px-2 py-1 mb-1">
                    Device Presets
                  </div>
                  {DEVICE_PRESETS.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => {
                        onDeviceChange(device);
                        setShowDeviceMenu(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-2 py-1.5 rounded text-sm hover:bg-zinc-800 transition-colors',
                        currentDevice.id === device.id && 'bg-zinc-800 text-purple-400'
                      )}
                    >
                      {getDeviceIcon(device.id)}
                      <span className="flex-1 text-left font-medium">{device.name}</span>
                      <span className="text-xs text-zinc-500">
                        {device.width}×{device.height}
                      </span>
                    </button>
                  ))}
                  
                  {/* Custom Dimensions */}
                  <div className="mt-2 pt-2 border-t border-zinc-800">
                    <div className="text-xs font-semibold text-zinc-400 px-2 py-1 mb-1">
                      Custom Size
                    </div>
                    <div className="px-2 py-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={customDimensions.width}
                          onChange={(e) => setCustomDimensions({ ...customDimensions, width: parseInt(e.target.value) || 1920 })}
                          className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs"
                          placeholder="Width"
                        />
                        <span className="text-zinc-500 text-xs">×</span>
                        <input
                          type="number"
                          value={customDimensions.height}
                          onChange={(e) => setCustomDimensions({ ...customDimensions, height: parseInt(e.target.value) || 1080 })}
                          className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs"
                          placeholder="Height"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleCustomDevice}
                        className="w-full h-7 text-xs"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-zinc-800" />

        {/* Orientation Toggle (for mobile/tablet) */}
        {(currentDevice.id === 'mobile' || currentDevice.id === 'tablet') && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={onOrientationToggle}
              className="h-7 w-7 p-0"
              title={`Toggle orientation (O)\nCurrent: ${orientation}`}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <div className="h-5 w-px bg-zinc-800" />
          </>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onScaleChange(Math.max(0.25, scale - 0.25))}
            disabled={scale <= 0.25}
            className="h-7 w-7 p-0"
            title="Zoom out (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1 px-2 min-w-[60px] justify-center">
            <input
              type="range"
              min="0.25"
              max="2"
              step="0.25"
              value={scale}
              onChange={(e) => onScaleChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgb(168 85 247) 0%, rgb(168 85 247) ${((scale - 0.25) / 1.75) * 100}%, rgb(63 63 70) ${((scale - 0.25) / 1.75) * 100}%, rgb(63 63 70) 100%)`,
              }}
            />
            <span className="text-xs font-mono text-zinc-400 min-w-[36px]">
              {Math.round(scale * 100)}%
            </span>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onScaleChange(Math.min(2, scale + 0.25))}
            disabled={scale >= 2}
            className="h-7 w-7 p-0"
            title="Zoom in (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-zinc-800" />

        {/* Refresh */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          className="h-7 w-7 p-0"
          title="Refresh preview (R)"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: Utilities & DevTools */}
      <div className="flex items-center gap-2">
        {/* Console Toggle */}
        <Button
          size="sm"
          variant={showConsole ? 'default' : 'ghost'}
          onClick={onToggleConsole}
          className="h-7 gap-1.5 text-xs"
          title="Toggle console viewer"
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>Console</span>
        </Button>

        {/* Network Toggle */}
        <Button
          size="sm"
          variant={showNetwork ? 'default' : 'ghost'}
          onClick={onToggleNetwork}
          className="h-7 gap-1.5 text-xs"
          title="Toggle network viewer"
        >
          <Network className="h-3.5 w-3.5" />
          <span>Network</span>
        </Button>

        {/* Divider */}
        <div className="h-5 w-px bg-zinc-800" />

        {/* Copy URL */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopyUrl}
          className="h-7 w-7 p-0"
          title="Copy preview URL"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>

        {/* Open in New Tab */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenInNewTab}
          className="h-7 w-7 p-0"
          title="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};


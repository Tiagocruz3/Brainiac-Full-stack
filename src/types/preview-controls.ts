/**
 * Preview Controls Types
 * Device frames, toolbar actions, and devtools state
 */

export interface DeviceFrame {
  id: string;
  name: string;
  width: number;
  height: number;
  userAgent?: string;
  icon: string;
}

export const DEVICE_PRESETS: DeviceFrame[] = [
  {
    id: 'desktop',
    name: 'Desktop',
    width: 1920,
    height: 1080,
    icon: '🖥️',
  },
  {
    id: 'laptop',
    name: 'Laptop',
    width: 1440,
    height: 900,
    icon: '💻',
  },
  {
    id: 'tablet',
    name: 'Tablet',
    width: 768,
    height: 1024,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    icon: '📱',
  },
  {
    id: 'mobile',
    name: 'Mobile',
    width: 375,
    height: 667,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    icon: '📱',
  },
];

export type Orientation = 'portrait' | 'landscape';

export interface PreviewViewport {
  width: number;
  height: number;
  scale: number;
  orientation: Orientation;
  deviceFrame?: DeviceFrame;
}

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
  args?: any[];
}

export interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  duration?: number;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
}

export interface PreviewControlsState {
  viewport: PreviewViewport;
  consoleMessages: ConsoleMessage[];
  networkRequests: NetworkRequest[];
  showConsole: boolean;
  showNetwork: boolean;
  consoleFilter: 'all' | 'log' | 'warn' | 'error' | 'info';
}


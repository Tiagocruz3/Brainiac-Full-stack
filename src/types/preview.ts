// Preview server types for real-time code preview

export interface PreviewConfig {
  /** Port to run the preview server on (0 = auto-assign) */
  port?: number;
  /** Base directory for serving files */
  baseDir: string;
  /** Project name/identifier */
  projectId: string;
  /** Enable CORS for iframe embedding */
  cors?: boolean;
  /** Custom Vite config overrides */
  viteConfig?: Record<string, any>;
  /** Host to bind to (default: localhost) */
  host?: string;
  /** Enable HMR (Hot Module Reload) */
  hmr?: boolean;
}

export interface PreviewServer {
  /** Unique identifier for this preview instance */
  id: string;
  /** Port the server is running on */
  port: number;
  /** Base URL to access the preview */
  url: string;
  /** Current status of the server */
  status: 'starting' | 'running' | 'stopped' | 'error';
  /** Project identifier */
  projectId: string;
  /** Start the preview server */
  start(): Promise<void>;
  /** Stop the preview server */
  stop(): Promise<void>;
  /** Update files in the preview */
  updateFiles(files: FileUpdate[]): Promise<void>;
  /** Check if server is healthy */
  healthCheck(): Promise<boolean>;
}

export interface FileUpdate {
  /** File path relative to project root */
  path: string;
  /** File content (or null to delete) */
  content: string | null;
  /** Operation type */
  operation: 'create' | 'update' | 'delete';
}

export interface PreviewServerManager {
  /** Create a new preview server instance */
  createServer(config: PreviewConfig): Promise<PreviewServer>;
  /** Get an existing preview server by ID */
  getServer(id: string): PreviewServer | null;
  /** Stop and remove a preview server */
  destroyServer(id: string): Promise<void>;
  /** List all active preview servers */
  listServers(): PreviewServer[];
  /** Stop all preview servers */
  destroyAll(): Promise<void>;
}

export interface ViteServerInstance {
  /** Vite dev server instance */
  server: any; // ViteDevServer type
  /** HTTP server instance */
  httpServer: any;
  /** WebSocket server for HMR */
  ws: any;
  /** Close the server */
  close(): Promise<void>;
}

export interface PreviewError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface PreviewMetrics {
  serverId: string;
  uptime: number;
  requestCount: number;
  errorCount: number;
  lastActivity: Date;
  memoryUsage: number;
}


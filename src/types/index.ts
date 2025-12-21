// Core types for Brainiac

export interface ApiKeys {
  anthropic: string;
  supabase: {
    token: string;
    orgId: string;
  };
  github: {
    token: string;
    owner: string;
  };
  vercel: {
    token: string;
    teamId?: string; // Optional: support team-scoped tokens
  };
}

export interface UserPreferences {
  defaultPlan: 'free' | 'pro';
  defaultRegion: string;
}

export interface Settings {
  apiKeys: ApiKeys;
  preferences: UserPreferences;
}

export interface SupabaseProject {
  id: string;
  ref: string;
  name: string;
  region: string;
  status: string;
  project_url: string;
  anon_key: string;
  service_key: string;
  db_password: string;
  dashboard_url: string;
  created_at: string;
}

export interface BuildStatus {
  stage: 'idle' | 'preparing' | 'creating_supabase' | 'waiting_provisioning' | 'getting_keys' | 'creating_repo' | 'deploying' | 'complete' | 'error' | 'error_check' | 'auto_fix' | 'security_scan' | 'error_blocked' | 'waiting' | 'self_heal';
  message: string;
  progress: number;
  error?: string;
  currentProject?: {
    name: string;
    githubRepo: string;
    vercelProjectId: string;
    supabaseProjectRef: string;
  };
}

export interface ProjectHistory {
  id: string;
  name: string;
  prompt: string;
  githubUrl: string;
  vercelUrl: string;
  supabaseUrl: string;
  createdAt: string;
  success: boolean;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ToolResponse {
  success: boolean;
  data?: any;
  error?: string;
}

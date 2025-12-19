/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string
  readonly VITE_PREVIEW_API_URL?: string
  readonly VITE_ANTHROPIC_API_KEY?: string
  readonly VITE_SUPABASE_TOKEN?: string
  readonly VITE_SUPABASE_ORG_ID?: string
  readonly VITE_GITHUB_TOKEN?: string
  readonly VITE_GITHUB_OWNER?: string
  readonly VITE_VERCEL_TOKEN?: string
  readonly VITE_VERCEL_TEAM_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


import { ApiKeys } from '@/types';

export interface SupabaseProject {
  success: boolean;
  project_ref: string;
  project_url: string;
  anon_key: string;
  service_key: string;
  db_password: string;
  dashboard_url: string;
  table_created: boolean;
}

// Call n8n sub-workflow via webhook
export async function createSupabaseProject(
  appName: string,
  supabaseKeys: ApiKeys['supabase'],
  onProgress: (stage: string, message: string, progress: number) => void
): Promise<SupabaseProject> {
  
  onProgress('creating_supabase', `Creating Supabase project: ${appName}...`, 15);

  // Call your n8n workflow!
  const N8N_WEBHOOK_URL = 'https://wpiai-wpin8n.sot0ab.easypanel.host/webhook/brainiac-supabase';
  
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_name: appName,
      supabase_token: supabaseKeys.token,
      supabase_org_id: supabaseKeys.orgId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Supabase project: ${error}`);
  }

  const result = await response.json();

  // n8n workflow should return the complete project data
  return {
    success: true,
    project_ref: result.project_ref,
    project_url: result.project_url,
    anon_key: result.anon_key,
    service_key: result.service_key,
    db_password: result.db_password,
    dashboard_url: result.dashboard_url,
    table_created: result.table_created || false,
  };
}

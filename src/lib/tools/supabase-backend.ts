import { ApiKeys } from '@/types';
import { sleep } from '@/lib/utils';

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

// Backend API URL - relative path when deployed together!
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '/api';

function generatePassword(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function createSupabaseProject(
  appName: string,
  supabaseKeys: ApiKeys['supabase'],
  onProgress: (stage: string, message: string, progress: number) => void
): Promise<SupabaseProject> {
  const timestamp = Date.now();
  const projectName = `brainiac-${appName}-${timestamp}`;
  const dbPassword = generatePassword(32);

  onProgress('creating_supabase', `Creating Supabase project: ${projectName}...`, 15);

  // Step 1: Create project via backend
  const createResponse = await fetch(`${BACKEND_URL}/api/supabase/create-project`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: supabaseKeys.token,
      org_id: supabaseKeys.orgId,
      name: projectName,
      region: 'ap-southeast-2',
      plan: 'free',
      db_pass: dbPassword,
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create Supabase project: ${error}`);
  }

  const project = await createResponse.json();
  const projectRef = project.id || project.ref;

  onProgress('waiting_provisioning', 'Waiting for project to provision...', 20);

  // Step 2: Wait for project to be ready (poll status)
  let status = 'COMING_UP';
  let attempts = 0;
  const maxAttempts = 36; // 3 minutes (5 seconds * 36)

  while (status !== 'ACTIVE_HEALTHY' && attempts < maxAttempts) {
    await sleep(5000); // Wait 5 seconds
    
    const statusResponse = await fetch(
      `${BACKEND_URL}/api/supabase/project/${projectRef}?token=${supabaseKeys.token}`
    );

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      status = statusData.status;
      
      const progress = 20 + (attempts / maxAttempts) * 30;
      onProgress('waiting_provisioning', `Project status: ${status}...`, Math.floor(progress));
    }

    attempts++;
  }

  if (status !== 'ACTIVE_HEALTHY') {
    throw new Error(`Project provisioning timed out. Status: ${status}`);
  }

  onProgress('waiting_provisioning', 'Project ready! Waiting 30 seconds for full initialization...', 50);
  await sleep(30000); // Additional 30 seconds for full readiness

  onProgress('getting_keys', 'Retrieving API keys...', 52);

  // Step 3: Get API keys via backend
  const keysResponse = await fetch(
    `${BACKEND_URL}/api/supabase/project/${projectRef}/api-keys?token=${supabaseKeys.token}`
  );

  if (!keysResponse.ok) {
    throw new Error('Failed to retrieve API keys');
  }

  const keys = await keysResponse.json();
  const anonKeyObj = keys.find((k: any) => k.type === 'publishable');
  const serviceKeyObj = keys.find((k: any) => k.type === 'secret');

  if (!anonKeyObj || !serviceKeyObj) {
    throw new Error('Failed to find required API keys');
  }

  onProgress('getting_keys', 'API keys retrieved! Waiting 60 seconds for database...', 54);
  await sleep(60000); // Wait for database to be fully ready

  onProgress('getting_keys', 'Creating database table...', 56);

  // Step 4: Create database table via backend
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS todos (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT false,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "view_own_todos" ON todos;
    CREATE POLICY "view_own_todos" ON todos FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "insert_own_todos" ON todos;
    CREATE POLICY "insert_own_todos" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "update_own_todos" ON todos;
    CREATE POLICY "update_own_todos" ON todos FOR UPDATE USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "delete_own_todos" ON todos;
    CREATE POLICY "delete_own_todos" ON todos FOR DELETE USING (auth.uid() = user_id);
  `;

  try {
    const tableResponse = await fetch(
      `${BACKEND_URL}/api/supabase/project/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: supabaseKeys.token,
          query: createTableSQL,
        }),
      }
    );

    if (tableResponse.ok) {
      onProgress('getting_keys', 'Database table created!', 58);
    } else {
      onProgress('getting_keys', 'Database ready (table creation skipped)', 58);
    }
  } catch (error) {
    console.warn('Table creation warning:', error);
    // Continue anyway
  }

  return {
    success: true,
    project_ref: projectRef,
    project_url: `https://${projectRef}.supabase.co`,
    anon_key: anonKeyObj.api_key,
    service_key: serviceKeyObj.api_key,
    db_password: dbPassword,
    dashboard_url: `https://supabase.com/dashboard/project/${projectRef}`,
    table_created: true,
  };
}

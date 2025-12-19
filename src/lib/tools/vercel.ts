import { ApiKeys } from '@/types';
import { sleep } from '@/lib/utils';

export interface VercelProject {
  id: string;
  name: string;
  url: string;
}

export async function createVercelProject(
  input: { name: string; github_repo: string },
  vercelKeys: ApiKeys['vercel']
): Promise<VercelProject> {
  // Parse github_repo (format: owner/repo)
  const [owner, repo] = input.github_repo.split('/');

  // Wait for GitHub to sync (Vercel needs time to see new repos)
  console.log('⏳ Waiting 10 seconds for GitHub to sync with Vercel...');
  await sleep(10000);

  // IMPORTANT: Get the GitHub repo ID first
  // Vercel v13 API requires repoId, not just repo name
  let repoId: number;
  
  try {
    // We need to get this from the Vercel API's repo list
    const reposResponse = await fetch(
      `https://api.vercel.com/v6/integrations/git-repositories?${vercelKeys.teamId ? `teamId=${vercelKeys.teamId}&` : ''}search=${repo}`,
      {
        headers: {
          'Authorization': `Bearer ${vercelKeys.token}`,
        },
      }
    );

    if (reposResponse.ok) {
      const reposData = await reposResponse.json();
      const foundRepo = reposData.repositories?.find((r: any) => 
        r.name === repo && r.owner?.login === owner
      );
      
      if (foundRepo) {
        repoId = foundRepo.id;
      } else {
        // If not found in Vercel's list, try alternative approach
        // Use a simpler project creation method
        throw new Error('REPO_NOT_IN_VERCEL_LIST');
      }
    } else {
      throw new Error('REPO_NOT_IN_VERCEL_LIST');
    }
  } catch (error) {
    console.log('⚠️ Could not get repo ID from Vercel, using alternative method...');
    
    // Alternative: Create project first, then link to GitHub
    return await createVercelProjectAlternative(input, vercelKeys);
  }

  // Now create deployment with repoId
  let projectId: string;
  let deploymentUrl: string;
  let deploymentId: string | undefined;

  try {
    // Create deployment with proper repoId
    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelKeys.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: input.name,
        gitSource: {
          type: 'github',
          repoId: repoId, // ← FIXED! Now includes repoId
          ref: 'main',
        },
        project: input.name,
        target: 'production',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      
      // If repo not found, wait longer and retry once
      if (error.includes("can't be found")) {
        console.log('⏳ Repo not synced yet, waiting 20 more seconds...');
        await sleep(20000);
        
        // Retry
        const retryResponse = await fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelKeys.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: input.name,
            gitSource: {
              type: 'github',
              repo: input.github_repo,
              ref: 'main',
            },
            project: input.name,
            target: 'production',
          }),
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Failed after retry: ${await retryResponse.text()}`);
        }
        
        const retryData = await retryResponse.json();
        projectId = retryData.projectId;
        deploymentUrl = retryData.url;
      deploymentId = retryData.id;
      } else {
        throw new Error(`Failed to create Vercel project: ${error}`);
      }
    } else {
      const deployment = await response.json();
      projectId = deployment.projectId;
      deploymentUrl = deployment.url;
      deploymentId = deployment.id;
    }

    // Poll deployment status (but don't wait too long)
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes max (5 seconds * 24)
    let deploymentStatus = 'BUILDING';

    while (!['READY', 'ERROR', 'CANCELED'].includes(deploymentStatus) && attempts < maxAttempts) {
      await sleep(5000);

      const statusResponse = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId || projectId}`,
        {
          headers: {
            'Authorization': `Bearer ${vercelKeys.token}`,
          },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        deploymentStatus = statusData.readyState;
      }

      attempts++;
    }

    // Return even if still building (user can check later)
    return {
      id: projectId,
      name: input.name,
      url: deploymentUrl,
    };
  } catch (error: any) {
    console.error('Vercel deployment error:', error);
    throw error;
  }
}

// Alternative method: Create project without immediate deployment
async function createVercelProjectAlternative(
  input: { name: string; github_repo: string },
  vercelKeys: ApiKeys['vercel']
): Promise<VercelProject> {
  console.log('🔄 Using alternative Vercel project creation...');
  
  try {
    // Try to create the project (will auto-deploy from GitHub)
    const projectResponse = await fetch(
      `https://api.vercel.com/v9/projects${vercelKeys.teamId ? `?teamId=${vercelKeys.teamId}` : ''}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelKeys.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: input.name,
          framework: 'vite',
          gitRepository: {
            type: 'github',
            repo: input.github_repo,
          },
        }),
      }
    );

    if (!projectResponse.ok) {
      const errorText = await projectResponse.text();
      console.warn('Vercel project creation had issues:', errorText);
      
      // Even if it fails, return a "pending" result
      // The project might still be accessible via Vercel dashboard
      return {
        id: 'pending',
        name: input.name,
        url: `${input.name}.vercel.app`,
      };
    }

    const project = await projectResponse.json();
    const projectId = project.id;

    // Wait a moment for the project to be fully propagated in Vercel's systems
    console.log('⏳ Waiting for Vercel project to be ready...');
    await sleep(5000);

    // Check if the project has Git connected before trying to trigger deployment
    const hasGitConnection = project.link && project.link.type === 'github';

    if (hasGitConnection) {
      // Try to explicitly trigger an initial deployment instead of relying
      // on Vercel's "auto deploy on first import", which can be flaky.
      try {
        console.log('🚀 Triggering initial Vercel deployment for new project...');
        const deploymentResult = await triggerVercelDeployment(
          { project_id: projectId },
          vercelKeys
        );
        // Prefer the concrete deployment URL that Vercel returns here, as it
        // always points at an actual deployment instance.
        if (deploymentResult.url) {
          console.log('✅ Initial deployment triggered at:', deploymentResult.url);
          // Override the default project URL below with the real deployment URL
          const projectUrl = deploymentResult.url;
          return {
            id: projectId,
            name: input.name,
            url: projectUrl,
          };
        }
      } catch (deployError) {
        console.warn('Initial Vercel deployment trigger failed:', deployError);
        // Don't fail the whole flow – the user can still deploy from the dashboard
      }
    } else {
      console.log('⚠️ Project created but not connected to Git. You\'ll need to connect it manually in the Vercel dashboard to enable deployments.');
    }
    
    // Fallback: return the default project alias. This might 404 until the
    // first successful production deployment finishes.
    const projectUrl = `${input.name}.vercel.app`;
    
    return {
      id: projectId,
      name: input.name,
      url: projectUrl,
    };
  } catch (error) {
    // Last resort: return the expected URL
    // User can import manually if needed
    console.warn('Vercel alternative method encountered an error:', error);
    return {
      id: 'manual-import-needed',
      name: input.name,
      url: `${input.name}.vercel.app`,
    };
  }
}

export async function addVercelEnvVar(
  input: { project_id: string; key: string; value: string },
  vercelKeys: ApiKeys['vercel']
): Promise<{ success: boolean }> {
  const response = await fetch(
    `https://api.vercel.com/v10/projects/${input.project_id}/env`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelKeys.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: input.key,
        value: input.value,
        type: 'encrypted',
        target: ['production', 'preview', 'development'],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add environment variable: ${error}`);
  }

  return { success: true };
}

export async function triggerVercelDeployment(
  input: { project_id: string },
  vercelKeys: ApiKeys['vercel']
): Promise<{ success: boolean; url: string; id: string }> {
  // Get project details to find the git repo
  // Retry up to 3 times with delays, as newly created projects may not be immediately queryable
  let project: any;
  let lastError: any;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      console.log(`⏳ Retrying project fetch (attempt ${attempt + 1}/3)...`);
      await sleep(3000); // Wait 3 seconds between retries
    }
    
    const projectResponse = await fetch(
      `https://api.vercel.com/v9/projects/${input.project_id}${vercelKeys.teamId ? `?teamId=${vercelKeys.teamId}` : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${vercelKeys.token}`,
        },
      }
    );

    if (projectResponse.ok) {
      project = await projectResponse.json();
      break;
    } else {
      lastError = await projectResponse.text();
      if (projectResponse.status === 404 && attempt < 2) {
        // 404 might be temporary, retry
        continue;
      }
    }
  }
  
  if (!project) {
    throw new Error(`Project not found after 3 attempts. It may not have been created, or your token may not have access. Last error: ${lastError}. Try connecting the project to GitHub manually in the Vercel dashboard.`);
  }

  // Construct proper gitSource from project.link
  if (!project.link || !project.link.type) {
    throw new Error('Project is not connected to a Git repository. Connect it in the Vercel dashboard first.');
  }

  const gitSource: any = {
    type: project.link.type, // 'github'
    ref: 'main', // Default to main branch
  };

  // Add repoId if available (required for v13 API)
  if (project.link.repoId) {
    gitSource.repoId = project.link.repoId;
  } else if (project.link.repo) {
    // Fallback: use repo name format
    gitSource.repo = project.link.repo;
  }

  console.log('🚀 Triggering deployment with gitSource:', gitSource);

  // Trigger new deployment
  const response = await fetch(
    `https://api.vercel.com/v13/deployments${vercelKeys.teamId ? `?teamId=${vercelKeys.teamId}` : ''}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelKeys.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: project.name,
        project: input.project_id,
        target: 'production',
        gitSource: gitSource,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Deployment trigger failed:', error);
    throw new Error(`Failed to trigger deployment: ${error}`);
  }

  const deployment = await response.json();

  return {
    success: true,
    url: deployment.url,
    id: deployment.id,
  };
}

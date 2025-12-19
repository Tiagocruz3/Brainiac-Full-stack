import { ApiKeys } from '@/types';

export interface GithubRepo {
  html_url: string;
  clone_url: string;
  name: string;
  full_name: string;
}

export async function createGithubRepo(
  input: { name: string; description?: string; private?: boolean },
  githubKeys: ApiKeys['github']
): Promise<GithubRepo> {
  let repoName = input.name;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubKeys.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify({
        name: repoName,
        description: input.description || '',
        private: input.private || false,
        auto_init: false, // Don't auto-create README! We'll create it
      }),
    });

    if (response.ok) {
      return await response.json();
    }

    const errorText = await response.text();
    
    // If repo name already exists, add timestamp and retry
    if (response.status === 422 && errorText.includes('name already exists')) {
      attempts++;
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits
      repoName = `${input.name}-${timestamp}`;
      console.log(`⚠️  Repo name conflict, retrying with: ${repoName}`);
      continue;
    }
    
    throw new Error(`Failed to create GitHub repo: ${errorText}`);
  }

  throw new Error('Failed to create repo after multiple attempts');
}

export async function getGithubFile(
  input: { repo: string; path: string },
  githubKeys: ApiKeys['github']
): Promise<any> {
  const response = await fetch(
    `https://api.github.com/repos/${githubKeys.owner}/${input.repo}/contents/${input.path}`,
    {
      headers: {
        'Authorization': `Bearer ${githubKeys.token}`,
        'Accept': 'application/vnd.github+json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get file: ${error}`);
  }

  return await response.json();
}

export async function createGithubFile(
  input: { repo: string; path: string; content: string; message: string },
  githubKeys: ApiKeys['github']
): Promise<{ success: boolean }> {
  // Encode content to base64
  const encodedContent = btoa(unescape(encodeURIComponent(input.content)));

  const response = await fetch(
    `https://api.github.com/repos/${githubKeys.owner}/${input.repo}/contents/${input.path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubKeys.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify({
        message: input.message,
        content: encodedContent,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create file ${input.path}: ${error}`);
  }

  return { success: true };
}

export async function updateGithubFile(
  input: { repo: string; path: string; content: string; message: string; sha: string },
  githubKeys: ApiKeys['github']
): Promise<{ success: boolean }> {
  // Encode content to base64
  const encodedContent = btoa(unescape(encodeURIComponent(input.content)));

  const response = await fetch(
    `https://api.github.com/repos/${githubKeys.owner}/${input.repo}/contents/${input.path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubKeys.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify({
        message: input.message,
        content: encodedContent,
        sha: input.sha,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update file ${input.path}: ${error}`);
  }

  return { success: true };
}

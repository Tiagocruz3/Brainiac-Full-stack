export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  size: number;
  language: string | null;
  private: boolean;
  default_branch: string;
}

// List all repositories for the authenticated user
export async function listGithubRepos(
  githubToken: string
): Promise<GitHubRepo[]> {
  const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list repositories: ${error}`);
  }

  return await response.json();
}

// Get detailed information about a specific repository
export async function getGithubRepo(
  repoFullName: string,
  githubToken: string
): Promise<GitHubRepo> {
  const response = await fetch(`https://api.github.com/repos/${repoFullName}`, {
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get repository: ${error}`);
  }

  return await response.json();
}

// Delete a repository
export async function deleteGithubRepo(
  repoFullName: string,
  githubToken: string
): Promise<{ success: boolean }> {
  const response = await fetch(`https://api.github.com/repos/${repoFullName}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete repository: ${error}`);
  }

  return { success: true };
}

// Get repository statistics
export async function getRepoStats(
  repoFullName: string,
  githubToken: string
): Promise<{
  commits: number;
  branches: number;
  contributors: number;
}> {
  // Get branches
  const branchesResponse = await fetch(
    `https://api.github.com/repos/${repoFullName}/branches`,
    {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );

  const branches = branchesResponse.ok ? await branchesResponse.json() : [];

  // Get contributors
  const contributorsResponse = await fetch(
    `https://api.github.com/repos/${repoFullName}/contributors`,
    {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );

  const contributors = contributorsResponse.ok ? await contributorsResponse.json() : [];

  return {
    commits: 0, // Would need to count commits from all branches
    branches: branches.length,
    contributors: contributors.length,
  };
}

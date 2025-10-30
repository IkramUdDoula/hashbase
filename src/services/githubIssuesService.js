// GitHub Issues API service
import { getSecret, SECRET_KEYS } from './secretsService';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Fetch all repositories for the authenticated user
 * @returns {Promise<Array>} Array of repository objects
 */
export async function fetchUserRepositories() {
  const token = getSecret(SECRET_KEYS.GITHUB_TOKEN);
  
  if (!token) {
    throw new Error('GitHub token not configured. Please add it in Settings.');
  }

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token}`
  };

  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid GitHub token. Please check your credentials.');
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const repos = await response.json();
    
    return repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      description: repo.description,
      openIssuesCount: repo.open_issues_count,
      url: repo.html_url
    }));
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Fetch issues from selected repositories or all repositories
 * @param {Array<string>} repoFullNames - Array of repo full names (e.g., ['owner/repo'])
 * @param {string} state - Issue state: 'open', 'closed', or 'all'
 * @param {number} maxIssues - Maximum number of issues to fetch
 * @returns {Promise<Array>} Array of issue objects
 */
export async function fetchIssues(repoFullNames = [], state = 'open', maxIssues = 50) {
  const token = getSecret(SECRET_KEYS.GITHUB_TOKEN);
  
  if (!token) {
    throw new Error('GitHub token not configured. Please add it in Settings.');
  }

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token}`
  };

  try {
    let allIssues = [];

    // If no specific repos selected, fetch from all user repos
    if (repoFullNames.length === 0) {
      const repos = await fetchUserRepositories();
      repoFullNames = repos.map(repo => repo.fullName);
    }

    // Fetch issues from each repository
    for (const repoFullName of repoFullNames) {
      if (allIssues.length >= maxIssues) break;

      try {
        const response = await fetch(
          `${GITHUB_API_BASE}/repos/${repoFullName}/issues?state=${state}&per_page=30&sort=updated`,
          { headers }
        );

        if (response.ok) {
          const issues = await response.json();
          
          // Filter out pull requests (GitHub API returns PRs as issues)
          const actualIssues = issues.filter(issue => !issue.pull_request);
          
          for (const issue of actualIssues) {
            if (allIssues.length >= maxIssues) break;
            
            allIssues.push({
              id: issue.id,
              number: issue.number,
              title: issue.title,
              body: issue.body,
              state: issue.state,
              url: issue.html_url,
              createdAt: issue.created_at,
              updatedAt: issue.updated_at,
              closedAt: issue.closed_at,
              user: {
                login: issue.user.login,
                avatar: issue.user.avatar_url
              },
              labels: issue.labels.map(label => ({
                name: label.name,
                color: label.color
              })),
              comments: issue.comments,
              repo: {
                fullName: repoFullName,
                owner: repoFullName.split('/')[0],
                name: repoFullName.split('/')[1]
              }
            });
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch issues for ${repoFullName}:`, err);
      }
    }
    
    // Sort by updated date (most recent first)
    allIssues.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    return allIssues;
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Create a new issue in a repository
 * @param {string} repoFullName - Repository full name (e.g., 'owner/repo')
 * @param {string} title - Issue title
 * @param {string} body - Issue body/description
 * @param {Array<string>} labels - Array of label names
 * @returns {Promise<Object>} Created issue object
 */
export async function createIssue(repoFullName, title, body = '', labels = []) {
  const token = getSecret(SECRET_KEYS.GITHUB_TOKEN);
  
  if (!token) {
    throw new Error('GitHub token not configured. Please add it in Settings.');
  }

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${repoFullName}/issues`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          body,
          labels
        })
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid GitHub token. Please check your credentials.');
      } else if (response.status === 404) {
        throw new Error('Repository not found or you do not have permission to create issues.');
      } else if (response.status === 410) {
        throw new Error('Issues are disabled for this repository.');
      }
      throw new Error(`Failed to create issue: ${response.status}`);
    }

    const issue = await response.json();
    
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      url: issue.html_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      user: {
        login: issue.user.login,
        avatar: issue.user.avatar_url
      },
      labels: issue.labels.map(label => ({
        name: label.name,
        color: label.color
      })),
      comments: issue.comments,
      repo: {
        fullName: repoFullName,
        owner: repoFullName.split('/')[0],
        name: repoFullName.split('/')[1]
      }
    };
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Check if GitHub is configured (has token)
 * @returns {boolean} True if configured
 */
export function isGitHubConfigured() {
  const token = getSecret(SECRET_KEYS.GITHUB_TOKEN);
  return !!token;
}

/**
 * Get stored repository selection preferences
 * @returns {Object} Object with selectedRepos array and selectAll boolean
 */
export function getRepoSelectionPreferences() {
  try {
    const stored = localStorage.getItem('github_issues_repo_selection');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading repo selection preferences:', error);
  }
  return { selectedRepos: [], selectAll: true };
}

/**
 * Save repository selection preferences
 * @param {Array<string>} selectedRepos - Array of selected repo full names
 * @param {boolean} selectAll - Whether to select all repos
 */
export function saveRepoSelectionPreferences(selectedRepos, selectAll) {
  try {
    localStorage.setItem('github_issues_repo_selection', JSON.stringify({
      selectedRepos,
      selectAll
    }));
  } catch (error) {
    console.error('Error saving repo selection preferences:', error);
    throw error;
  }
}

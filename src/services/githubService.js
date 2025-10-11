// GitHub API service for fetching commit logs
import { getSecret, SECRET_KEYS } from './secretsService';

const GITHUB_API_BASE = 'https://api.github.com';
const MAX_REPOS = 10; // Limit number of repos to fetch from
const COMMITS_PER_REPO = 3; // Commits to fetch per repo

/**
 * Fetch commits from all user repositories
 * @param {number} maxCommits - Maximum total commits to return (default: 20)
 * @returns {Promise<Array>} Array of commit objects with repo info and status
 */
export async function fetchAllUserCommits(maxCommits = 20) {
  const token = getSecret(SECRET_KEYS.GITHUB_TOKEN);
  
  if (!token) {
    throw new Error('GitHub token not configured. Please add it in Settings.');
  }

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token}`
  };

  try {
    // Get authenticated user's repositories
    const reposResponse = await fetch(
      `${GITHUB_API_BASE}/user/repos?sort=pushed&per_page=${MAX_REPOS}&affiliation=owner`,
      { headers }
    );

    if (!reposResponse.ok) {
      if (reposResponse.status === 401) {
        throw new Error('Invalid GitHub token. Please check your credentials.');
      }
      throw new Error(`GitHub API error: ${reposResponse.status}`);
    }

    const repos = await reposResponse.json();
    
    // Fetch commits from each repository
    const allCommits = [];
    
    for (const repo of repos) {
      if (allCommits.length >= maxCommits) break;
      
      try {
        const commitsResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${repo.owner.login}/${repo.name}/commits?per_page=${COMMITS_PER_REPO}`,
          { headers }
        );

        if (commitsResponse.ok) {
          const commits = await commitsResponse.json();
          
          for (const commit of commits) {
            if (allCommits.length >= maxCommits) break;
            
            // Fetch commit status
            let status = null;
            try {
              const statusResponse = await fetch(
                `${GITHUB_API_BASE}/repos/${repo.owner.login}/${repo.name}/commits/${commit.sha}/status`,
                { headers }
              );
              
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                status = statusData.state; // success, failure, pending, or error
              }
            } catch (err) {
              console.warn('Failed to fetch commit status:', err);
            }
            
            allCommits.push({
              sha: commit.sha,
              message: commit.commit.message,
              author: {
                name: commit.commit.author.name,
                email: commit.commit.author.email,
                username: commit.author?.login || commit.commit.author.name
              },
              date: commit.commit.author.date,
              url: commit.html_url,
              repo: {
                name: repo.name,
                owner: repo.owner.login,
                fullName: repo.full_name
              },
              status: status
            });
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch commits for ${repo.name}:`, err);
      }
    }
    
    // Sort by date (most recent first)
    allCommits.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return allCommits;
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Fetch recent commits from a GitHub repository (legacy function)
 * @param {string} owner - Repository owner (username or organization)
 * @param {string} repo - Repository name
 * @param {number} perPage - Number of commits to fetch (default: 10)
 * @returns {Promise<Array>} Array of commit objects
 */
export async function fetchCommits(owner, repo, perPage = 10) {
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
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=${perPage}`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid GitHub token. Please check your credentials.');
      } else if (response.status === 404) {
        throw new Error('Repository not found. Please check owner and repo name.');
      } else {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
    }

    const commits = await response.json();
    
    return commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        avatar: commit.author?.avatar_url || null,
        username: commit.author?.login || null
      },
      date: commit.commit.author.date,
      url: commit.html_url,
      stats: commit.stats || null
    }));
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Get the configured repository from localStorage
 * @returns {Object|null} Object with owner and repo, or null if not configured
 */
export function getConfiguredRepo() {
  try {
    const stored = localStorage.getItem('github_repo_config');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading GitHub repo config:', error);
  }
  return null;
}

/**
 * Set the repository configuration
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 */
export function setConfiguredRepo(owner, repo) {
  try {
    localStorage.setItem('github_repo_config', JSON.stringify({ owner, repo }));
  } catch (error) {
    console.error('Error saving GitHub repo config:', error);
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

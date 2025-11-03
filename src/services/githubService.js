// GitHub API service for fetching commit logs
import { getSecret, SECRET_KEYS } from './secretsService';

const GITHUB_API_BASE = 'https://api.github.com';
const MAX_REPOS = 10; // Limit number of repos to fetch from
const COMMITS_PER_REPO = 3; // Commits to fetch per repo

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
 * Fetch all branches for a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} headers - Request headers
 * @returns {Promise<Array>} Array of branch objects
 */
async function fetchRepoBranches(owner, repo, headers) {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches?per_page=100`,
      { headers }
    );
    
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (err) {
    console.warn(`Failed to fetch branches for ${owner}/${repo}:`, err);
    return [];
  }
}

/**
 * Fetch commits from selected repositories or all repositories
 * Now fetches commits from ALL branches of each repository
 * @param {Array<string>} repoFullNames - Array of repo full names (e.g., ['owner/repo'])
 * @param {number} maxCommits - Maximum total commits to return (default: 20)
 * @returns {Promise<Array>} Array of commit objects with repo info and status
 */
export async function fetchAllUserCommits(repoFullNames = [], maxCommits = 20) {
  const token = getSecret(SECRET_KEYS.GITHUB_TOKEN);
  
  if (!token) {
    throw new Error('GitHub token not configured. Please add it in Settings.');
  }

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token}`
  };

  try {
    let repos;
    
    // If no specific repos selected, fetch all user repos
    if (repoFullNames.length === 0) {
      const allRepos = await fetchUserRepositories();
      repos = allRepos.slice(0, MAX_REPOS).map(r => ({
        name: r.name,
        owner: { login: r.owner },
        full_name: r.fullName
      }));
    } else {
      // Use selected repos
      repos = repoFullNames.map(fullName => {
        const [owner, name] = fullName.split('/');
        return {
          name,
          owner: { login: owner },
          full_name: fullName
        };
      });
    }
    
    // Fetch commits from each repository (all branches)
    const allCommits = [];
    const seenCommitShas = new Set(); // To deduplicate commits across branches
    
    for (const repo of repos) {
      if (allCommits.length >= maxCommits) break;
      
      try {
        // Fetch all branches for this repository
        const branches = await fetchRepoBranches(repo.owner.login, repo.name, headers);
        
        // Fetch commits from each branch
        for (const branch of branches) {
          if (allCommits.length >= maxCommits) break;
          
          try {
            const commitsResponse = await fetch(
              `${GITHUB_API_BASE}/repos/${repo.owner.login}/${repo.name}/commits?sha=${branch.name}&per_page=${COMMITS_PER_REPO}`,
              { headers }
            );

            if (commitsResponse.ok) {
              const commits = await commitsResponse.json();
              
              for (const commit of commits) {
                if (allCommits.length >= maxCommits) break;
                
                // Skip if we've already seen this commit (it's in multiple branches)
                if (seenCommitShas.has(commit.sha)) continue;
                seenCommitShas.add(commit.sha);
                
                // Fetch commit status (optional, can be slow)
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
                  branch: branch.name,
                  status: status
                });
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch commits for ${repo.name} branch ${branch.name}:`, err);
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

/**
 * Fetch detailed commit information including stats and files
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} sha - Commit SHA
 * @returns {Promise<Object>} Detailed commit object with stats and files
 */
export async function fetchCommitDetails(owner, repo, sha) {
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
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${sha}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch commit details: ${response.status}`);
    }

    const commit = await response.json();
    
    return {
      sha: commit.sha,
      stats: commit.stats || null, // { total, additions, deletions }
      files: commit.files ? commit.files.map(file => ({
        filename: file.filename,
        status: file.status, // added, removed, modified, renamed
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch
      })) : []
    };
  } catch (error) {
    console.error('Error fetching commit details:', error);
    throw error;
  }
}

/**
 * Get stored repository selection preferences for commits
 * @returns {Object} Object with selectedRepos array and selectAll boolean
 */
export function getCommitRepoSelectionPreferences() {
  try {
    const stored = localStorage.getItem('github_commits_repo_selection');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading commit repo selection preferences:', error);
  }
  return { selectedRepos: [], selectAll: true };
}

/**
 * Save repository selection preferences for commits
 * @param {Array<string>} selectedRepos - Array of selected repo full names
 * @param {boolean} selectAll - Whether to select all repos
 */
export function saveCommitRepoSelectionPreferences(selectedRepos, selectAll) {
  try {
    localStorage.setItem('github_commits_repo_selection', JSON.stringify({
      selectedRepos,
      selectAll
    }));
  } catch (error) {
    console.error('Error saving commit repo selection preferences:', error);
    throw error;
  }
}

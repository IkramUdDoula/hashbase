// Landing page form submission service
// Submits form data as GitHub issues

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Get GitHub configuration from environment variables
 * @returns {Object} Configuration object with token and repo info
 */
function getGitHubConfig() {
  return {
    token: import.meta.env.VITE_GITHUB_LANDING_TOKEN,
    owner: import.meta.env.VITE_GITHUB_LANDING_OWNER,
    repo: import.meta.env.VITE_GITHUB_LANDING_REPO
  };
}

/**
 * Check if GitHub form submission is configured
 * @returns {boolean} True if all required config is present
 */
export function isFormSubmissionConfigured() {
  const config = getGitHubConfig();
  return !!(config.token && config.owner && config.repo);
}

/**
 * Submit form data as a GitHub issue
 * @param {Object} formData - Form data object
 * @param {string} formData.name - User's name
 * @param {string} formData.email - User's email
 * @param {string} formData.message - User's message
 * @returns {Promise<Object>} Created issue object
 */
export async function submitFormAsIssue(formData) {
  const config = getGitHubConfig();
  
  if (!isFormSubmissionConfigured()) {
    throw new Error('GitHub form submission not configured. Please set VITE_GITHUB_LANDING_TOKEN, VITE_GITHUB_LANDING_OWNER, and VITE_GITHUB_LANDING_REPO in .env');
  }

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${config.token}`,
    'Content-Type': 'application/json'
  };

  // Create issue title and body
  const title = `Early Access Request: ${formData.name}`;
  const body = `**Name:** ${formData.name}
**Email:** ${formData.email}

**Message:**
${formData.message || '_No message provided_'}

---
_Submitted via Hashbase landing page on ${new Date().toLocaleString()}_`;

  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/issues`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          body,
          labels: ['early-access', 'landing-page']
        })
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid GitHub token. Please check VITE_GITHUB_LANDING_TOKEN.');
      } else if (response.status === 404) {
        throw new Error('Repository not found. Please check VITE_GITHUB_LANDING_OWNER and VITE_GITHUB_LANDING_REPO.');
      } else if (response.status === 410) {
        throw new Error('Issues are disabled for this repository.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create issue: ${response.status}`);
    }

    const issue = await response.json();
    
    return {
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url
    };
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}

/**
 * PostHog Error Tracking Service
 * Handles API calls to PostHog for error tracking data
 */

import { getSecrets, SECRET_KEYS } from './secretsService';

const POSTHOG_API_BASE = 'https://app.posthog.com';

/**
 * Get the PostHog API base URL from settings or use default
 * @param {string} projectUrl - Optional project URL from settings
 * @returns {string} API base URL
 */
function getPostHogApiBase(projectUrl = null) {
  if (projectUrl) {
    // Ensure URL has protocol
    let url = projectUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    // Remove trailing slash
    return url.replace(/\/$/, '');
  }
  return POSTHOG_API_BASE;
}

/**
 * Check if PostHog is configured with an access token
 * @returns {boolean}
 */
export function isPostHogConfigured() {
  const secrets = getSecrets();
  return !!secrets[SECRET_KEYS.POSTHOG_ACCESS_TOKEN];
}

/**
 * Get PostHog access token from secrets
 * @returns {string|null}
 */
function getAccessToken() {
  const secrets = getSecrets();
  return secrets[SECRET_KEYS.POSTHOG_ACCESS_TOKEN] || null;
}

/**
 * Check if ErrorTrackingQuery API is available
 * @param {string} projectId - PostHog project ID
 * @returns {Promise<boolean>}
 */
export async function isErrorTrackingApiAvailable(projectId) {
  const token = getAccessToken();
  if (!token || !projectId) {
    return false;
  }

  try {
    // Try to use ErrorTrackingQuery API with minimal query
    const query = {
      kind: 'ErrorTrackingQuery',
      dateRange: {
        date_from: '-1d',
        date_to: null
      },
      limit: 1,
      filterTestAccounts: false
    };

    const response = await fetch(`${POSTHOG_API_BASE}/api/environments/${projectId}/query/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    // If we get 404 or 405, the API endpoint doesn't exist
    if (response.status === 404 || response.status === 405) {
      return false;
    }

    // If we get 200, the API is available and working
    if (response.ok) {
      return true;
    }

    // For 400, check if it's a query format issue or API not available
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      // If error is parse_error or mentions ErrorTrackingQuery not being recognized, API not available
      if (errorData.code === 'parse_error' ||
          errorData.detail?.includes('ErrorTrackingQuery') || 
          errorData.message?.includes('ErrorTrackingQuery') ||
          errorData.detail?.includes('query kind') ||
          errorData.code === 'invalid_input') {
        return false;
      }
      return true;
    }

    // For other errors, assume API not available
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Fetch available hosts from error data
 * @param {string} projectId - PostHog project ID
 * @returns {Promise<Array<string>>} Array of unique hosts
 */
export async function fetchAvailableHosts(projectId) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  if (!projectId) {
    throw new Error('PostHog project ID not configured');
  }

  try {
    const query = {
      kind: 'EventsQuery',
      select: [
        'properties.$current_url'
      ],
      orderBy: ['timestamp DESC'],
      limit: 1000,
      where: [
        "event = '$exception'",
        "properties.$current_url IS NOT NULL"
      ]
    };

    const response = await fetch(`${POSTHOG_API_BASE}/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`PostHog API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract unique hosts from URLs
    const hosts = new Set();
    (data.results || []).forEach(result => {
      const url = result[0];
      if (url) {
        try {
          const urlObj = new URL(url);
          hosts.add(urlObj.hostname);
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
    
    return Array.from(hosts).sort();
  } catch (error) {
    console.error('Error fetching available hosts:', error);
    throw error;
  }
}

/**
 * Fetch errors from PostHog using the Query API
 * @param {string} projectId - PostHog project ID
 * @param {number} maxErrors - Maximum number of errors to fetch
 * @param {boolean} filterTestAccounts - Filter out internal and test users
 * @param {Array<string>} filterHosts - Array of hosts to filter errors from
 * @param {number} lastSeenDays - How far back to look for errors (in days)
 * @returns {Promise<Array>} Array of error objects
 */
export async function fetchErrors(projectId, maxErrors = 50, filterTestAccounts = true, filterHosts = [], lastSeenDays = 30) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  if (!projectId) {
    throw new Error('PostHog project ID not configured');
  }

  try {
    // Check if ErrorTrackingQuery API is available
    const hasErrorTrackingApi = await isErrorTrackingApiAvailable(projectId);
    
    if (hasErrorTrackingApi) {
      // Use the newer ErrorTrackingQuery API which supports filterTestAccounts
      return await fetchErrorsWithErrorTrackingApi(projectId, maxErrors, filterTestAccounts, filterHosts, lastSeenDays);
    } else {
      // Fallback to EventsQuery API
      return await fetchErrorsWithEventsQuery(projectId, maxErrors, filterHosts, lastSeenDays);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch errors using ErrorTrackingQuery API (supports filterTestAccounts)
 * @private
 */
async function fetchErrorsWithErrorTrackingApi(projectId, maxErrors, filterTestAccounts, filterHosts, lastSeenDays) {
  const token = getAccessToken();
  
  const query = {
    kind: 'ErrorTrackingQuery',
    dateRange: {
      date_from: `-${lastSeenDays}d`,
      date_to: null
    },
    limit: maxErrors,
    filterTestAccounts: filterTestAccounts,
    orderBy: 'last_seen'
  };

  const response = await fetch(`${POSTHOG_API_BASE}/api/environments/${projectId}/query/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid PostHog access token');
    } else if (response.status === 403) {
      throw new Error('Access denied. Check your PostHog permissions.');
    } else if (response.status === 404) {
      throw new Error('Project not found. Check your project ID.');
    } else if (response.status === 400) {
      // 400 might mean the query format is wrong or API changed
      // Fall back to EventsQuery
      return await fetchErrorsWithEventsQuery(projectId, maxErrors, filterHosts, lastSeenDays);
    }
    throw new Error(`PostHog API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Transform ErrorTrackingQuery results
  let errors = transformErrorTrackingData(data.results || []);
  
  // Apply host filtering if specified
  if (filterHosts && filterHosts.length > 0) {
    errors = errors.filter(error => {
      if (!error.environment?.url) return false;
      try {
        const urlObj = new URL(error.environment.url);
        return filterHosts.includes(urlObj.hostname);
      } catch (e) {
        return false;
      }
    });
  }
  
  return errors;
}

/**
 * Fetch errors using EventsQuery API (fallback, no filterTestAccounts)
 * @private
 */
async function fetchErrorsWithEventsQuery(projectId, maxErrors, filterHosts, lastSeenDays) {
  const token = getAccessToken();
  
  const query = {
    kind: 'EventsQuery',
    select: [
      'uuid',
      'timestamp',
      'issue_id',
      'properties.$exception_type',
      'properties.$exception_message',
      'properties.$exception_fingerprint',
      'properties.$exception_stack_trace_raw',
      'properties.$exception_synthetic',
      'properties.$exception_handled',
      'properties.$exception_level',
      'properties.$lib',
      'properties.$lib_version',
      'properties.$browser',
      'properties.$browser_version',
      'properties.$os',
      'properties.$os_version',
      'properties.$current_url',
      'properties.$exception_component',
      'properties.$exception_values',
      'person.id',
      'person.properties.email'
    ],
    orderBy: ['timestamp DESC'],
    limit: maxErrors * 2,
    where: [
      "event = '$exception'",
      `timestamp >= now() - interval ${lastSeenDays} day`
    ]
  };
  
  // Add host filter if specified
  if (filterHosts && filterHosts.length > 0) {
    const hostConditions = filterHosts.map(host => 
      `properties.$current_url LIKE '%${host}%'`
    ).join(' OR ');
    query.where.push(`(${hostConditions})`);
  }

  const response = await fetch(`${POSTHOG_API_BASE}/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid PostHog access token');
    } else if (response.status === 403) {
      throw new Error('Access denied. Check your PostHog permissions.');
    } else if (response.status === 404) {
      throw new Error('Project not found. Check your project ID.');
    }
    throw new Error(`PostHog API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Transform the data into a more usable format
  const errors = transformErrorData(data.results || []);
  
  // Group errors by fingerprint to get occurrence counts
  const groupedErrors = groupErrorsByFingerprint(errors);
  
  return groupedErrors.slice(0, maxErrors);
}


/**
 * Transform ErrorTrackingQuery results into a structured format
 * @param {Array} results - Raw results from ErrorTrackingQuery API
 * @returns {Array} Transformed error objects
 */
function transformErrorTrackingData(results) {
  return results.map((issue, index) => {
    return {
      id: issue.id || `error-${index}`,
      issueId: issue.id,
      timestamp: issue.last_seen,
      type: issue.exception_type || 'Error',
      message: issue.description || issue.exception_message || 'Unknown error',
      exceptionValue: issue.exception_message,
      fingerprint: issue.fingerprint,
      stackTrace: null, // Not available in summary
      synthetic: false,
      handled: true,
      level: issue.level || 'error',
      lib: null,
      libVersion: null,
      component: null,
      environment: {
        browser: null,
        os: null,
        url: null
      },
      userId: null,
      userEmail: null,
      firstSeen: issue.first_seen,
      lastSeen: issue.last_seen,
      occurrences: issue.occurrences || 0,
      affectedUsers: issue.users || 0,
      status: issue.status || 'active',
      severity: issue.level || 'medium'
    };
  });
}

/**
 * Transform raw PostHog error data into a structured format
 * @param {Array} results - Raw results from PostHog API
 * @returns {Array} Transformed error objects
 */
function transformErrorData(results) {
  return results.map((result, index) => {
    // Map result array indices to properties
    const uuid = result[0];
    const timestamp = result[1];
    const issueId = result[2];
    const exceptionType = result[3];
    const exceptionMessage = result[4];
    const exceptionFingerprint = result[5];
    const stackTrace = result[6];
    const synthetic = result[7];
    const handled = result[8];
    const level = result[9];
    const lib = result[10];
    const libVersion = result[11];
    const browser = result[12];
    const browserVersion = result[13];
    const os = result[14];
    const osVersion = result[15];
    const currentUrl = result[16];
    const component = result[17];
    const exceptionValues = result[18];
    const personId = result[19];
    const personEmail = result[20];
    
    // Parse exception values if it's a JSON string
    let parsedExceptionValues = null;
    if (exceptionValues) {
      try {
        parsedExceptionValues = typeof exceptionValues === 'string' 
          ? JSON.parse(exceptionValues) 
          : exceptionValues;
      } catch (e) {
        parsedExceptionValues = exceptionValues;
      }
    }
    
    // Get the first exception value as the primary message
    const exceptionValue = Array.isArray(parsedExceptionValues) && parsedExceptionValues.length > 0
      ? parsedExceptionValues[0]
      : null;
    
    return {
      id: uuid || `error-${index}`,
      issueId: issueId, // PostHog's issue ID for direct linking
      timestamp: timestamp,
      type: exceptionType || 'Error',
      message: exceptionMessage || exceptionValue || 'Unknown error',
      exceptionValue: exceptionValue,
      fingerprint: exceptionFingerprint,
      stackTrace: stackTrace,
      synthetic: synthetic === 'true' || synthetic === true,
      handled: handled === 'true' || handled === true,
      level: level || 'error',
      lib: lib,
      libVersion: libVersion,
      component: component,
      environment: {
        browser: browser ? `${browser}${browserVersion ? ' ' + browserVersion : ''}` : null,
        os: os ? `${os}${osVersion ? ' ' + osVersion : ''}` : null,
        url: currentUrl
      },
      userId: personId,
      userEmail: personEmail,
      firstSeen: timestamp,
      lastSeen: timestamp,
      occurrences: 1
    };
  });
}

/**
 * Group errors by fingerprint to calculate occurrences and affected users
 * @param {Array} errors - Array of error objects
 * @returns {Array} Grouped error objects
 */
function groupErrorsByFingerprint(errors) {
  const grouped = {};
  
  errors.forEach(error => {
    const key = error.fingerprint || `${error.type}-${error.message}`;
    
    if (!grouped[key]) {
      grouped[key] = {
        ...error,
        occurrences: 1,
        affectedUsers: new Set([error.userId]).size,
        userIds: new Set([error.userId])
      };
    } else {
      grouped[key].occurrences += 1;
      grouped[key].userIds.add(error.userId);
      grouped[key].affectedUsers = grouped[key].userIds.size;
      
      // Update last seen
      if (new Date(error.timestamp) > new Date(grouped[key].lastSeen)) {
        grouped[key].lastSeen = error.timestamp;
      }
      
      // Update first seen
      if (new Date(error.timestamp) < new Date(grouped[key].firstSeen)) {
        grouped[key].firstSeen = error.timestamp;
      }
    }
  });
  
  // Convert to array and remove userIds set
  return Object.values(grouped).map(error => {
    const { userIds, ...rest } = error;
    return rest;
  });
}

/**
 * Fetch error details by ID
 * @param {string} projectId - PostHog project ID
 * @param {string} errorId - Error UUID
 * @returns {Promise<Object>} Error details
 */
export async function fetchErrorDetails(projectId, errorId) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  try {
    const query = {
      kind: 'EventsQuery',
      select: ['*'],
      where: [
        "event = '$exception'",
        `uuid = '${errorId}'`
      ],
      limit: 1
    };

    const response = await fetch(`${POSTHOG_API_BASE}/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`PostHog API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return transformErrorData(data.results)[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching PostHog error details:', error);
    throw error;
  }
}

/**
 * Get error statistics for a project
 * @param {string} projectId - PostHog project ID
 * @returns {Promise<Object>} Error statistics
 */
export async function fetchErrorStats(projectId) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  try {
    const query = {
      kind: 'EventsQuery',
      select: [
        'count()',
        'count(distinct person.id)'
      ],
      where: [
        "event = '$exception'",
        "timestamp > now() - interval 7 day"
      ]
    };

    const response = await fetch(`${POSTHOG_API_BASE}/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`PostHog API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      totalErrors: data.results?.[0]?.[0] || 0,
      affectedUsers: data.results?.[0]?.[1] || 0
    };
  } catch (error) {
    console.error('Error fetching PostHog error stats:', error);
    throw error;
  }
}

/**
 * Fetch issue ID from fingerprint using PostHog's query API
 * @param {string} projectId - PostHog project ID
 * @param {string} fingerprint - Error fingerprint
 * @returns {Promise<string|null>} Issue ID or null if not found
 */
export async function fetchIssueIdFromFingerprint(projectId, fingerprint) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  try {
    // Use PostHog's query API with ErrorTrackingQuery to find the issue by fingerprint
    const query = {
      kind: 'ErrorTrackingQuery',
      fingerprints: [fingerprint],
      dateRange: {
        date_from: '-30d', // Last 30 days
        date_to: null
      },
      filterTestAccounts: false,
      orderBy: 'last_seen'
    };

    const response = await fetch(`${POSTHOG_API_BASE}/api/environments/${projectId}/query/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Return the first issue ID if found
    if (data.results && data.results.length > 0) {
      return data.results[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching issue ID from fingerprint:', error);
    return null;
  }
}

/**
 * Fetch stack frames for error traces
 * @param {string} projectId - PostHog project ID
 * @param {Array<string>} rawIds - Array of raw frame IDs
 * @returns {Promise<Array>} Array of stack frame objects
 */
export async function fetchStackFrames(projectId, rawIds) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  if (!rawIds || rawIds.length === 0) {
    return [];
  }

  try {
    const response = await fetch(`${POSTHOG_API_BASE}/api/environments/${projectId}/error_tracking/stack_frames/batch_get/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw_ids: rawIds })
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching stack frames:', error);
    return [];
  }
}

/**
 * Fetch error event details including stack trace
 * @param {string} projectId - PostHog project ID
 * @param {string} errorId - Error UUID
 * @returns {Promise<Object|null>} Error event with stack trace
 */
export async function fetchErrorEvent(projectId, errorId) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  try {
    const query = {
      kind: 'EventsQuery',
      select: [
        'uuid',
        'timestamp',
        'properties.$exception_type',
        'properties.$exception_message',
        'properties.$exception_fingerprint',
        'properties.$exception_stack_trace_raw',
        'properties.$exception_list'
      ],
      where: [
        "event = '$exception'",
        `uuid = '${errorId}'`
      ],
      limit: 1
    };

    const response = await fetch(`${POSTHOG_API_BASE}/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      // Failed to fetch error event
      return null;
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const exceptionList = result[6];
      
      // Parse exception list if it's a JSON string
      let frames = null;
      if (exceptionList) {
        try {
          const parsed = typeof exceptionList === 'string' 
            ? JSON.parse(exceptionList) 
            : exceptionList;
          
          // Extract frames from the first exception's stacktrace
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].stacktrace && parsed[0].stacktrace.frames) {
            frames = parsed[0].stacktrace.frames;
          }
        } catch (e) {
          // Failed to parse exception list
        }
      }
      return {
        uuid: result[0],
        timestamp: result[1],
        type: result[2],
        message: result[3],
        fingerprint: result[4],
        stackTraceRaw: result[5],
        frames: frames
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching error event:', error);
    return null;
  }
}

// ============================================================================
// SURVEYS API
// ============================================================================

/**
 * Fetch surveys from PostHog
 * @param {string} projectId - PostHog project ID
 * @param {Object} options - Fetch options
 * @param {number} options.limit - Maximum number of surveys to fetch
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.search - Search query
 * @returns {Promise<Object>} Surveys data with count and results
 */
export async function fetchSurveys(projectId, options = {}) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  if (!projectId) {
    throw new Error('PostHog project ID not configured');
  }

  const { limit = 50, offset = 0, search = '' } = options;

  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    const response = await fetch(`${POSTHOG_API_BASE}/api/projects/${projectId}/surveys?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid PostHog access token');
      } else if (response.status === 403) {
        throw new Error('Access denied. Check your PostHog permissions.');
      } else if (response.status === 404) {
        throw new Error('Project not found. Check your project ID.');
      }
      throw new Error(`PostHog API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      count: data.count || 0,
      next: data.next,
      previous: data.previous,
      results: data.results || []
    };
  } catch (error) {
    console.error('Error fetching PostHog surveys:', error);
    throw error;
  }
}

/**
 * Fetch a single survey's details
 * @param {string} projectId - PostHog project ID
 * @param {string} surveyId - Survey UUID
 * @returns {Promise<Object>} Survey details
 */
export async function fetchSurveyDetails(projectId, surveyId) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  if (!projectId || !surveyId) {
    throw new Error('Project ID and Survey ID are required');
  }

  try {
    const response = await fetch(`${POSTHOG_API_BASE}/api/projects/${projectId}/surveys/${surveyId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch survey details: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching survey details:', error);
    throw error;
  }
}

/**
 * Fetch survey statistics
 * @param {string} projectId - PostHog project ID
 * @param {string} surveyId - Survey UUID
 * @param {Object} options - Options for date range
 * @param {string} options.date_from - ISO timestamp for start date
 * @param {string} options.date_to - ISO timestamp for end date
 * @returns {Promise<Object>} Survey statistics
 */
export async function fetchSurveyStats(projectId, surveyId, options = {}) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  if (!projectId || !surveyId) {
    throw new Error('Project ID and Survey ID are required');
  }

  try {
    const params = new URLSearchParams();
    if (options.date_from) {
      params.append('date_from', options.date_from);
    }
    if (options.date_to) {
      params.append('date_to', options.date_to);
    }

    const queryString = params.toString();
    const url = `${POSTHOG_API_BASE}/api/projects/${projectId}/surveys/${surveyId}/stats${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching survey stats:', error);
    return null;
  }
}

/**
 * Fetch all survey responses count
 * @param {string} projectId - PostHog project ID
 * @param {string} projectUrl - Optional PostHog instance URL
 * @returns {Promise<Object>} Response counts for all surveys
 */
export async function fetchAllSurveyResponsesCount(projectId, projectUrl = null) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  try {
    const apiBase = getPostHogApiBase(projectUrl);
    const response = await fetch(
      `${apiBase}/api/projects/${projectId}/surveys/responses_count/`, 
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch survey responses count: ${response.status}`);
      return {};
    }

    const data = await response.json();
    return data || {};
  } catch (error) {
    console.error('Error fetching survey responses count:', error);
    return {};
  }
}

/**
 * Fetch survey responses using the Query API
 * Survey responses are stored as 'survey sent' events in PostHog
 * @param {string} projectId - PostHog project ID
 * @param {string} surveyId - Survey UUID
 * @param {number} limit - Number of responses to fetch
 * @returns {Promise<Object>} Survey responses with counts and breakdowns
 */
export async function fetchSurveyResponses(projectId, surveyId, limit = 100) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  if (!projectId || !surveyId) {
    throw new Error('Project ID and Survey ID are required');
  }

  try {
    // Query for 'survey sent' events which contain the responses
    const query = {
      kind: 'EventsQuery',
      select: [
        'uuid',
        'timestamp',
        'properties.$survey_id',
        'properties.$survey_response',
        'properties.$survey_response_1',
        'properties.$survey_response_2',
        'properties.$survey_response_3',
        'distinct_id'
      ],
      where: [
        `event = 'survey sent'`,
        `properties.$survey_id = '${surveyId}'`
      ],
      orderBy: ['timestamp DESC'],
      limit: limit
    };

    const response = await fetch(
      `${POSTHOG_API_BASE}/api/projects/${projectId}/query/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      }
    );

    if (!response.ok) {
      return { count: 0, results: [] };
    }

    const data = await response.json();
    return {
      count: data.results?.length || 0,
      results: data.results || []
    };
  } catch (error) {
    console.error('Error fetching survey responses:', error);
    return { count: 0, results: [] };
  }
}

/**
 * Fetch detailed survey responses using HogQL query
 * This provides more comprehensive data including user info and all response fields
 * @param {string} projectId - PostHog project ID
 * @param {string} projectUrl - PostHog instance URL
 * @param {string} surveyId - Survey UUID
 * @param {Object} survey - Survey object with questions
 * @param {Object} options - Query options
 * @param {string} options.date_from - Start date (ISO format)
 * @param {string} options.date_to - End date (ISO format)
 * @param {number} options.limit - Maximum responses to fetch
 * @returns {Promise<Object>} Detailed survey responses with user info
 */
export async function fetchDetailedSurveyResponses(projectId, projectUrl, surveyId, survey, options = {}) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  if (!projectId || !surveyId) {
    throw new Error('Project ID and Survey ID are required');
  }

  const { date_from, date_to, limit = 100 } = options;
  const apiBase = getPostHogApiBase(projectUrl);

  try {
    // Build dynamic HogQL query based on survey questions
    const questionSelects = [];
    if (survey?.questions) {
      survey.questions.forEach((question, index) => {
        const questionId = question.id || `question_${index}`;
        const responseProperty = `$survey_response${index === 0 ? '' : '_' + index}`;
        
        if (question.type === 'multiple_choice' || question.type === 'single_choice') {
          // For choice questions, extract as array
          questionSelects.push(`
            if(
                JSONHas(events.properties, '${responseProperty}') AND length(JSONExtractArrayRaw(events.properties, '${responseProperty}')) > 0,
                JSONExtractArrayRaw(events.properties, '${responseProperty}'),
                JSONExtractArrayRaw(events.properties, '$survey_response_${index}')
            ) AS q${index}_response`);
        } else {
          // For other types (rating, text, etc.), extract as string
          questionSelects.push(`
            COALESCE(
                NULLIF(JSONExtractString(events.properties, '${responseProperty}'), ''),
                NULLIF(JSONExtractString(events.properties, '$survey_response_${index}'), '')
            ) AS q${index}_response`);
        }
      });
    }

    const hogqlQuery = `
      SELECT
        ${questionSelects.join(',')},
        person.properties.email,
        person.properties.Email,
        person.properties.$email,
        person.properties.name,
        person.properties.Name,
        person.properties.username,
        person.properties.Username,
        person.properties.UserName,
        events.distinct_id,
        events.timestamp
      FROM events
      WHERE event = 'survey sent'
        AND properties.$survey_id = '${surveyId}'
        ${date_from ? `AND timestamp >= '${date_from}'` : ''}
        ${date_to ? `AND timestamp <= '${date_to}'` : ''}
        AND uuid in (
          SELECT
            argMax(uuid, timestamp)
          FROM events
          WHERE and(
            equals(event, 'survey sent'),
            equals(JSONExtractString(properties, '$survey_id'), '${surveyId}'),
            ${date_from ? `greaterOrEquals(timestamp, '${date_from}'),` : ''}
            ${date_to ? `lessOrEquals(timestamp, '${date_to}')` : 'true'}
          )
          GROUP BY
            if(
              JSONHas(properties, '$survey_submission_id'),
              JSONExtractString(properties, '$survey_submission_id'),
              toString(uuid)
            )
        )
      ORDER BY events.timestamp DESC
      LIMIT ${limit}
    `;

    const query = {
      kind: 'HogQLQuery',
      query: hogqlQuery.trim(),
      filters: {
        properties: []
      }
    };

    const response = await fetch(
      `${apiBase}/api/environments/${projectId}/query/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch detailed survey responses: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching detailed survey responses:', error);
    return null;
  }
}

/**
 * Fetch aggregated survey question results
 * @param {string} projectId - PostHog project ID
 * @param {string} surveyId - Survey UUID
 * @param {Array} questions - Array of survey questions
 * @returns {Promise<Object>} Aggregated results per question
 */
export async function fetchSurveyQuestionResults(projectId, surveyId, questions = []) {
  const responses = await fetchSurveyResponses(projectId, surveyId, 1000);
  
  if (!responses.results || responses.results.length === 0) {
    return null;
  }

  // Aggregate responses by question
  const questionResults = {};
  
  questions.forEach((question, index) => {
    const responseKey = `properties.$survey_response${index === 0 ? '' : '_' + index}`;
    const responseCounts = {};
    let total = 0;
    let sum = 0;

    responses.results.forEach(result => {
      const response = result[index + 2]; // Offset by 2 (uuid, timestamp)
      if (response !== null && response !== undefined && response !== '') {
        total++;
        responseCounts[response] = (responseCounts[response] || 0) + 1;
        
        // For rating questions, calculate average
        if (question.type === 'rating' && !isNaN(response)) {
          sum += Number(response);
        }
      }
    });

    questionResults[`question_${index}`] = {
      total,
      choices: responseCounts,
      average: question.type === 'rating' && total > 0 ? sum / total : null
    };
  });

  return questionResults;
}

/**
 * Parse and aggregate detailed survey responses
 * @param {Object} responseData - Raw response data from HogQL query
 * @param {Object} survey - Survey object with questions
 * @returns {Object} Aggregated statistics per question
 */
export function aggregateSurveyResponses(responseData, survey) {
  if (!responseData?.results || responseData.results.length === 0) {
    return null;
  }

  const stats = {
    totalResponses: responseData.results.length,
    uniqueUsers: new Set(),
    questions: {},
    responsesByDate: {},
    userEmails: []
  };

  responseData.results.forEach(result => {
    // Extract user info (last few columns)
    const numQuestions = survey?.questions?.length || 0;
    const distinctId = result[numQuestions + 8]; // distinct_id position
    const timestamp = result[numQuestions + 9]; // timestamp position
    const email = result[numQuestions] || result[numQuestions + 1] || result[numQuestions + 2];
    
    if (distinctId) {
      stats.uniqueUsers.add(distinctId);
    }
    
    if (email) {
      stats.userEmails.push(email);
    }

    // Track responses by date
    if (timestamp) {
      const date = new Date(timestamp).toISOString().split('T')[0];
      stats.responsesByDate[date] = (stats.responsesByDate[date] || 0) + 1;
    }

    // Process each question's responses
    survey?.questions?.forEach((question, index) => {
      if (!stats.questions[index]) {
        stats.questions[index] = {
          question: question.question,
          type: question.type,
          responses: {},
          total: 0,
          sum: 0,
          values: []
        };
      }

      const response = result[index];
      
      if (response !== null && response !== undefined && response !== '') {
        stats.questions[index].total++;
        
        // Handle array responses (multiple choice)
        if (Array.isArray(response)) {
          response.forEach(choice => {
            const cleanChoice = choice.replace(/^"|"$/g, ''); // Remove quotes
            stats.questions[index].responses[cleanChoice] = 
              (stats.questions[index].responses[cleanChoice] || 0) + 1;
          });
        } else {
          // Handle single value responses
          const cleanResponse = typeof response === 'string' 
            ? response.replace(/^"|"$/g, '') 
            : response;
          
          stats.questions[index].responses[cleanResponse] = 
            (stats.questions[index].responses[cleanResponse] || 0) + 1;
          
          // For rating questions, track numeric values
          if (question.type === 'rating' && !isNaN(cleanResponse)) {
            const numValue = Number(cleanResponse);
            stats.questions[index].sum += numValue;
            stats.questions[index].values.push(numValue);
          }
        }
      }
    });
  });

  // Calculate averages and percentages
  Object.keys(stats.questions).forEach(qIndex => {
    const q = stats.questions[qIndex];
    
    if (q.type === 'rating' && q.values.length > 0) {
      q.average = q.sum / q.values.length;
      q.min = Math.min(...q.values);
      q.max = Math.max(...q.values);
    }
    
    // Calculate percentages
    q.percentages = {};
    Object.keys(q.responses).forEach(response => {
      q.percentages[response] = (q.responses[response] / q.total) * 100;
    });
  });

  stats.uniqueUsers = stats.uniqueUsers.size;
  
  return stats;
}

/**
 * Fetch survey activity log
 * @param {string} projectId - PostHog project ID
 * @param {string} surveyId - Survey UUID
 * @returns {Promise<Array>} Activity log entries
 */
export async function fetchSurveyActivity(projectId, surveyId) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  if (!projectId || !surveyId) {
    throw new Error('Project ID and Survey ID are required');
  }

  try {
    const response = await fetch(`${POSTHOG_API_BASE}/api/projects/${projectId}/surveys/${surveyId}/activity`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch survey activity: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.results || data || [];
  } catch (error) {
    console.error('Error fetching survey activity:', error);
    return [];
  }
}

/**
 * Update a survey
 * @param {string} projectId - PostHog project ID
 * @param {string} surveyId - Survey UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated survey
 */
export async function updateSurvey(projectId, surveyId, updates) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('PostHog access token not configured');
  }

  if (!projectId || !surveyId) {
    throw new Error('Project ID and Survey ID are required');
  }

  try {
    const response = await fetch(`${POSTHOG_API_BASE}/api/projects/${projectId}/surveys/${surveyId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `Failed to update survey: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating survey:', error);
    throw error;
  }
}

/**
 * Get survey status based on dates and archived flag
 * @param {Object} survey - Survey object
 * @returns {string} Status: 'running', 'draft', 'completed', 'paused', 'archived'
 */
export function getSurveyStatus(survey) {
  if (survey.archived) {
    return 'archived';
  }

  const now = new Date();
  const startDate = survey.start_date ? new Date(survey.start_date) : null;
  const endDate = survey.end_date ? new Date(survey.end_date) : null;

  // If no start date, it's a draft
  if (!startDate) {
    return 'draft';
  }

  // If start date is in the future, it's a draft
  if (startDate > now) {
    return 'draft';
  }

  // If end date exists and is in the past, it's completed
  if (endDate && endDate < now) {
    return 'completed';
  }

  // If has responses limit and reached it, it's completed
  if (survey.responses_limit && survey.response_count >= survey.responses_limit) {
    return 'completed';
  }

  // Otherwise, it's running
  return 'running';
}

/**
 * Calculate survey completion rate
 * @param {Object} survey - Survey object
 * @returns {number} Completion rate percentage (0-100)
 */
export function getSurveyCompletionRate(survey) {
  if (!survey.responses_limit || survey.responses_limit === 0) {
    return 0;
  }

  const rate = (survey.response_count / survey.responses_limit) * 100;
  return Math.min(100, Math.round(rate * 10) / 10); // Round to 1 decimal
}

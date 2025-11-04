/**
 * PostHog Error Tracking Service
 * Handles API calls to PostHog for error tracking data
 */

import { getSecrets, SECRET_KEYS } from './secretsService';

const POSTHOG_API_BASE = 'https://app.posthog.com';

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
      // If error mentions 'ErrorTrackingQuery' not being recognized, API not available
      if (errorData.detail?.includes('ErrorTrackingQuery') || 
          errorData.message?.includes('ErrorTrackingQuery')) {
        return false;
      }
      // Otherwise it's just a bad query format, but API exists
      return true;
    }

    // For other errors, assume API not available
    return false;
  } catch (error) {
    console.warn('ErrorTrackingQuery API check failed:', error);
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
 * @param {string} status - Error status filter ('active', 'resolved', 'all')
 * @param {number} maxErrors - Maximum number of errors to fetch
 * @param {boolean} filterTestAccounts - Filter out internal and test users
 * @param {Array<string>} filterHosts - Array of hosts to filter errors from
 * @returns {Promise<Array>} Array of error objects
 */
export async function fetchErrors(projectId, status = 'active', maxErrors = 50, filterTestAccounts = true, filterHosts = []) {
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
      return await fetchErrorsWithErrorTrackingApi(projectId, status, maxErrors, filterTestAccounts, filterHosts);
    } else {
      // Fallback to EventsQuery API
      return await fetchErrorsWithEventsQuery(projectId, status, maxErrors, filterHosts);
    }
  } catch (error) {
    console.error('Error fetching PostHog errors:', error);
    throw error;
  }
}

/**
 * Fetch errors using ErrorTrackingQuery API (supports filterTestAccounts)
 * @private
 */
async function fetchErrorsWithErrorTrackingApi(projectId, status, maxErrors, filterTestAccounts, filterHosts) {
  const token = getAccessToken();
  
  const query = {
    kind: 'ErrorTrackingQuery',
    dateRange: {
      date_from: '-30d',
      date_to: null
    },
    limit: maxErrors,
    filterTestAccounts: filterTestAccounts,
    orderBy: 'last_seen'
  };

  // Add status filter if needed
  if (status === 'active') {
    query.filterGroup = {
      type: 'AND',
      values: [
        {
          type: 'property',
          key: 'status',
          value: ['active'],
          operator: 'exact'
        }
      ]
    };
  } else if (status === 'resolved') {
    query.filterGroup = {
      type: 'AND',
      values: [
        {
          type: 'property',
          key: 'status',
          value: ['resolved'],
          operator: 'exact'
        }
      ]
    };
  }

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
      console.warn('ErrorTrackingQuery returned 400, falling back to EventsQuery');
      return await fetchErrorsWithEventsQuery(projectId, status, maxErrors, filterHosts);
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
async function fetchErrorsWithEventsQuery(projectId, status, maxErrors, filterHosts) {
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
    limit: maxErrors,
    where: [
      "event = '$exception'"
    ]
  };

  // Add status filter if not 'all'
  if (status === 'active') {
    query.where.push("properties.$exception_resolved != true");
  } else if (status === 'resolved') {
    query.where.push("properties.$exception_resolved = true");
  }
  
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
  
  return groupedErrors;
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
      occurrences: 1,
      status: 'active' // Will be determined by query filter
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
      console.warn(`Failed to fetch issue ID for fingerprint: ${response.status}`);
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
    console.log('Fetching stack frames for raw_ids:', rawIds);
    const response = await fetch(`${POSTHOG_API_BASE}/api/environments/${projectId}/error_tracking/stack_frames/batch_get/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw_ids: rawIds })
    });

    if (!response.ok) {
      console.warn(`Failed to fetch stack frames: ${response.status}`);
      const errorText = await response.text();
      console.warn('Stack frames error response:', errorText);
      return [];
    }

    const data = await response.json();
    console.log('Stack frames response:', data);
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
      console.warn(`Failed to fetch error event: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log('Error event data:', data);
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const exceptionList = result[6];
      
      console.log('Exception list raw:', exceptionList);
      
      // Parse exception list if it's a JSON string
      let frames = null;
      if (exceptionList) {
        try {
          const parsed = typeof exceptionList === 'string' 
            ? JSON.parse(exceptionList) 
            : exceptionList;
          console.log('Parsed exception list:', parsed);
          
          // Extract frames from the first exception in the list
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].stacktrace) {
            frames = parsed[0].stacktrace.frames;
            console.log('Extracted frames from stacktrace:', frames);
          }
        } catch (e) {
          console.error('Failed to parse exception list:', e);
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

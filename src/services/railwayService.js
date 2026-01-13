// Railway API service for fetching projects, deployments, and usage data
// Uses Railway's GraphQL API via backend proxy

import { getSecret, SECRET_KEYS, hasSecret } from './secretsService';

const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is not set');
}

/**
 * Get Railway API headers
 */
function getRailwayHeaders() {
  const token = getSecret(SECRET_KEYS.RAILWAY_TOKEN);
  return {
    'Content-Type': 'application/json',
    'X-Railway-Token': token || '',
  };
}

/**
 * Execute a GraphQL query against Railway API via proxy
 */
async function executeQuery(query, variables = {}) {
  const response = await fetch(`${API_BASE_URL}/api/railway/graphql`, {
    method: 'POST',
    headers: getRailwayHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Railway API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'GraphQL error');
  }

  return data.data;
}

/**
 * Check if Railway is configured
 */
export function isRailwayConfigured() {
  return hasSecret(SECRET_KEYS.RAILWAY_TOKEN);
}

/**
 * Fetch user info to verify token
 */
async function fetchMe() {
  const query = `
    query {
      me {
        id
        name
        email
      }
    }
  `;
  
  try {
    const data = await executeQuery(query);
    return data.me;
  } catch (error) {
    // If 'me' query fails, token might be a project/team token
    console.warn('Railway: me query failed, might be using project/team token');
    return null;
  }
}

/**
 * Fetch all projects for the authenticated user
 * Works with personal tokens
 */
export async function fetchProjects() {
  // First try to get user info
  const me = await fetchMe();
  
  if (me) {
    // Personal token - query via me
    const query = `
      query {
        me {
          projects {
            edges {
              node {
                id
                name
                description
                createdAt
                updatedAt
                services {
                  edges {
                    node {
                      id
                      name
                      icon
                    }
                  }
                }
                environments {
                  edges {
                    node {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await executeQuery(query);
    const projects = data.me?.projects?.edges?.map(edge => ({
      id: edge.node.id,
      name: edge.node.name,
      description: edge.node.description,
      createdAt: edge.node.createdAt,
      updatedAt: edge.node.updatedAt,
      services: edge.node.services?.edges?.map(s => ({
        id: s.node.id,
        name: s.node.name,
        icon: s.node.icon,
      })) || [],
      environments: edge.node.environments?.edges?.map(e => ({
        id: e.node.id,
        name: e.node.name,
      })) || [],
    })) || [];

    return projects;
  } else {
    // Project/Team token - query directly
    const query = `
      query {
        projects {
          edges {
            node {
              id
              name
              description
              createdAt
              updatedAt
              services {
                edges {
                  node {
                    id
                    name
                    icon
                  }
                }
              }
              environments {
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await executeQuery(query);
    const projects = data.projects?.edges?.map(edge => ({
      id: edge.node.id,
      name: edge.node.name,
      description: edge.node.description,
      createdAt: edge.node.createdAt,
      updatedAt: edge.node.updatedAt,
      services: edge.node.services?.edges?.map(s => ({
        id: s.node.id,
        name: s.node.name,
        icon: s.node.icon,
      })) || [],
      environments: edge.node.environments?.edges?.map(e => ({
        id: e.node.id,
        name: e.node.name,
      })) || [],
    })) || [];

    return projects;
  }
}

/**
 * Fetch deployments for a project
 */
export async function fetchDeployments(projectId, environmentId = null, limit = 10) {
  const query = `
    query getDeployments($projectId: String!, $first: Int) {
      deployments(
        first: $first
        input: {
          projectId: $projectId
        }
      ) {
        edges {
          node {
            id
            status
            createdAt
            staticUrl
            service {
              id
              name
            }
            environment {
              id
              name
            }
          }
        }
      }
    }
  `;

  const variables = { projectId, first: limit };

  const data = await executeQuery(query, variables);
  return data.deployments?.edges?.map(edge => ({
    id: edge.node.id,
    status: edge.node.status,
    createdAt: edge.node.createdAt,
    staticUrl: edge.node.staticUrl,
    service: edge.node.service,
    environment: edge.node.environment,
  })) || [];
}

/**
 * Fetch project usage/metrics
 */
export async function fetchProjectUsage(projectId, startDate, endDate) {
  const query = `
    query($projectId: String!, $startDate: DateTime!, $endDate: DateTime!) {
      usage(
        projectId: $projectId
        startDate: $startDate
        endDate: $endDate
        groupBy: [PROJECT]
        measurements: [CPU_USAGE, MEMORY_USAGE_GB, NETWORK_TX_GB]
      ) {
        measurement
        value
      }
    }
  `;

  const variables = {
    projectId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };

  const data = await executeQuery(query, variables);
  return data.usage || [];
}

/**
 * Fetch estimated usage cost
 */
export async function fetchEstimatedUsage(projectId) {
  const query = `
    query($projectId: String!) {
      estimatedUsage(projectId: $projectId) {
        estimatedValue
        measurement
      }
    }
  `;

  const data = await executeQuery(query, { projectId });
  return data.estimatedUsage || [];
}

/**
 * Fetch deployment logs
 */
export async function fetchDeploymentLogs(deploymentId, limit = 100) {
  const query = `
    query($deploymentId: String!, $limit: Int) {
      deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
        message
        timestamp
        severity
      }
    }
  `;

  const data = await executeQuery(query, { deploymentId, limit });
  return data.deploymentLogs || [];
}

/**
 * Fetch service metrics (CPU, Memory)
 */
export async function fetchServiceMetrics(serviceId, environmentId, startDate, endDate) {
  const query = `
    query($serviceId: String!, $environmentId: String!, $startDate: DateTime!, $endDate: DateTime!) {
      metrics(
        serviceId: $serviceId
        environmentId: $environmentId
        startDate: $startDate
        endDate: $endDate
        measurements: [CPU_USAGE, MEMORY_USAGE_GB]
        sampleRateSeconds: 300
      ) {
        measurement
        values {
          ts
          value
        }
      }
    }
  `;

  const variables = {
    serviceId,
    environmentId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };

  const data = await executeQuery(query, variables);
  return data.metrics || [];
}

/**
 * Restart a deployment
 */
export async function restartDeployment(deploymentId) {
  const query = `
    mutation($id: String!) {
      deploymentRestart(id: $id)
    }
  `;

  await executeQuery(query, { id: deploymentId });
  return true;
}

/**
 * Get project URL in Railway dashboard
 */
export function getRailwayProjectUrl(projectId) {
  return `https://railway.app/project/${projectId}`;
}

/**
 * Get deployment URL in Railway dashboard
 */
export function getRailwayDeploymentUrl(projectId, deploymentId) {
  return `https://railway.app/project/${projectId}/deployment/${deploymentId}`;
}

/**
 * Get stored project selection preferences
 */
export function getProjectSelectionPreferences() {
  try {
    const stored = localStorage.getItem('railway_project_selection');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading project selection preferences:', error);
  }
  return { selectedProjects: [], selectAll: true };
}

/**
 * Save project selection preferences
 */
export function saveProjectSelectionPreferences(selectedProjects, selectAll) {
  try {
    localStorage.setItem('railway_project_selection', JSON.stringify({
      selectedProjects,
      selectAll
    }));
  } catch (error) {
    console.error('Error saving project selection preferences:', error);
    throw error;
  }
}

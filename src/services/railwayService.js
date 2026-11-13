// Railway API service for fetching projects, deployments, and usage data
// Uses Railway's GraphQL API via backend proxy

import { getSecret, SECRET_KEYS, hasSecret } from './secretsService';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

class RailwayAuthorizationError extends Error {}

async function executeQuery(query, variables = {}, signal, projectScoped = false) {
  const token = getSecret(SECRET_KEYS.RAILWAY_TOKEN)?.trim();
  const tokenHeader = projectScoped ? 'X-Railway-Project-Token' : 'X-Railway-Token';
  const response = await fetch(`${API_BASE_URL}/api/railway/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [tokenHeader]: token || '',
    },
    body: JSON.stringify({ query, variables }),
    signal,
  });

  const result = await response.json().catch(() => null);
  const errors = result?.errors ?? [];
  const message = errors.map(error => error.message).filter(Boolean).join(' ');
  if (response.status === 401 || response.status === 403 || errors.some(error =>
    /^(not authorized|unauthorized|forbidden|invalid token|project token not found)[.!]?$/i.test(error.message)
  )) {
    throw new RailwayAuthorizationError(message || result?.message || 'Railway denied access.');
  }
  if (message) {
    throw new Error(message);
  }
  if (!response.ok || !result?.data) {
    throw new Error(result?.message || `Railway API request failed (HTTP ${response.status}).`);
  }

  return result.data;
}

/**
 * Check if Railway is configured
 */
export function isRailwayConfigured() {
  return hasSecret(SECRET_KEYS.RAILWAY_TOKEN);
}

const projectDetails = `
  fragment ProjectDetails on Project {
    id
    name
    description
    createdAt
    updatedAt
    services {
      edges {
        node { id name icon }
      }
    }
    environments {
      edges {
        node { id name }
      }
    }
  }
`;

function formatProject(project) {
  return {
    ...project,
    services: project.services.edges.map(({ node }) => node),
    environments: project.environments.edges.map(({ node }) => node),
  };
}

async function fetchAccountProjects(signal) {
  const query = `
    query RailwayProjects {
      me {
        workspaces {
          projects {
            edges {
              node { ...ProjectDetails }
            }
          }
        }
      }
      externalWorkspaces {
        projects { ...ProjectDetails }
      }
    }

    ${projectDetails}
  `;

  const { me, externalWorkspaces } = await executeQuery(query, {}, signal);
  const workspaceProjects = me.workspaces.flatMap(workspace =>
    workspace.projects.edges.map(({ node }) => node)
  );
  const sharedProjects = externalWorkspaces.flatMap(workspace => workspace.projects);
  return formatProjects([...workspaceProjects, ...sharedProjects]);
}

async function fetchWorkspaceProjects(signal) {
  const { apiToken } = await executeQuery(`
    query RailwayTokenWorkspaces {
      apiToken { workspaces { id } }
    }
  `, {}, signal);

  const projects = await Promise.all(apiToken.workspaces.map(async ({ id }) => {
    const data = await executeQuery(`
      query RailwayWorkspaceProjects($workspaceId: String!) {
        projects(workspaceId: $workspaceId) {
          edges {
            node { ...ProjectDetails }
          }
        }
      }

      ${projectDetails}
    `, { workspaceId: id }, signal);
    return data.projects.edges.map(({ node }) => node);
  }));
  return formatProjects(projects.flat());
}

async function fetchScopedProject(signal) {
  const { projectToken } = await executeQuery(`
    query RailwayTokenProject {
      projectToken {
        project { id name description createdAt updatedAt }
        environment {
          id
          name
          serviceInstances {
            edges {
              node { serviceId serviceName }
            }
          }
        }
      }
    }
  `, {}, signal, true);

  const { project, environment } = projectToken;
  return [{
    ...project,
    scopedEnvironmentId: environment.id,
    environments: [{ id: environment.id, name: environment.name }],
    services: environment.serviceInstances.edges.map(({ node }) => ({
      id: node.serviceId,
      name: node.serviceName,
    })),
  }];
}

export async function fetchProjects(signal) {
  for (const discoverProjects of [fetchAccountProjects, fetchWorkspaceProjects, fetchScopedProject]) {
    try {
      return await discoverProjects(signal);
    } catch (error) {
      if (!(error instanceof RailwayAuthorizationError)) throw error;
    }
  }

  throw new Error('Railway rejected this token. Check or replace it in Settings → Secrets.');
}

function formatProjects(projects) {
  const projectsById = new Map(projects.map(project => [project.id, project]));
  return [...projectsById.values()]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map(formatProject);
}

/**
 * Fetch recent deployments across the project or within a specific environment.
 */
export async function fetchDeployments(project, { limit = 10, signal } = {}) {
  const query = `
    query RailwayDeployments($input: DeploymentListInput!, $first: Int) {
      deployments(input: $input, first: $first) {
        edges {
          node {
            id
            status
            createdAt
            url
            staticUrl
            serviceId
            environmentId
          }
        }
      }
    }
  `;

  const { id: projectId, scopedEnvironmentId } = project;
  const input = { projectId, environmentId: scopedEnvironmentId };
  const { deployments } = await executeQuery(query, { input, first: limit }, signal, Boolean(scopedEnvironmentId));
  return deployments.edges.map(({ node }) => ({
    ...node,
    service: project.services.find(service => service.id === node.serviceId),
    environment: project.environments.find(environment => environment.id === node.environmentId),
  }));
}

/**
 * Railway can return a bare hostname in staticUrl.
 */
export function getDeploymentPublicUrl(deployment) {
  const address = deployment.staticUrl || deployment.url;
  if (!address) return null;

  try {
    const url = new URL(address.includes('://') ? address : `https://${address}`);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
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
  return `https://railway.com/project/${projectId}`;
}

/**
 * Get deployment URL in Railway dashboard
 */
export function getRailwayDeploymentUrl(projectId, deploymentId) {
  return `https://railway.com/project/${projectId}/deployment/${deploymentId}`;
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

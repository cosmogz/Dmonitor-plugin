import { getMobileApiBaseUrl, getMobileApiToken } from './mobileConfig';

export type ServiceHealth = {
  status: string;
};

export type ServiceVersion = {
  version: string;
};

function getApiBaseUrl() {
  return getMobileApiBaseUrl().replace(/\/$/, '');
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function requestJson<T>(path: string, body: unknown): Promise<T> {
  const token = getMobileApiToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getBackendBaseUrl() {
  return getApiBaseUrl();
}

export function fetchHealth() {
  return request<ServiceHealth>('/health');
}

export function fetchVersion() {
  return request<ServiceVersion>('/version');
}

export function submitReading(body: unknown) {
  return requestJson<{ message: string; created: boolean; conflict: boolean }>('/api/v1/readings', body);
}
export async function fetchDashboardMetrics() {
  const config = await loadMobileConfig();
  const response = await fetch(`${config.apiBaseUrl}/api/dashboard/metrics`, {
    headers: { Authorization: `Bearer ${config.apiToken}` },
  });
  return response.json();
}

export async function fetchLatestReading() {
  const config = await loadMobileConfig();
  const response = await fetch(`${config.apiBaseUrl}/api/readings/latest`, {
    headers: { Authorization: `Bearer ${config.apiToken}` },
  });
  return response.json();
}

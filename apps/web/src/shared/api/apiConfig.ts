interface ApiLocation {
  readonly hostname: string;
  readonly protocol: string;
}

export function resolveApiBaseUrl(
  configuredBaseUrl = import.meta.env.VITE_API_BASE_URL,
  location: ApiLocation | null = globalThis.location === undefined ? null : globalThis.location,
): string {
  if (configuredBaseUrl) return configuredBaseUrl;
  if (!location) return 'http://127.0.0.1:3000';

  return `${location.protocol}//${location.hostname}:3000`;
}

export const apiBaseUrl = resolveApiBaseUrl();

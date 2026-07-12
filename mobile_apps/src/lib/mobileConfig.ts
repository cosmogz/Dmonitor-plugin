import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'dmonitor-mobile-config';

export type MobileConfig = {
  apiBaseUrl: string;
  apiToken: string;
};

const defaultConfig: MobileConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:3000',
  apiToken: process.env.EXPO_PUBLIC_API_TOKEN?.trim() || '',
};

let runtimeConfig: MobileConfig = { ...defaultConfig };

export function getMobileConfig() {
  return runtimeConfig;
}

export function getMobileApiBaseUrl() {
  return runtimeConfig.apiBaseUrl;
}

export function getMobileApiToken() {
  return runtimeConfig.apiToken;
}

export async function loadMobileConfig() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    runtimeConfig = { ...defaultConfig };
    return runtimeConfig;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MobileConfig>;
    runtimeConfig = {
      apiBaseUrl: parsed.apiBaseUrl?.trim() || defaultConfig.apiBaseUrl,
      apiToken: parsed.apiToken?.trim() || defaultConfig.apiToken,
    };
  } catch {
    runtimeConfig = { ...defaultConfig };
  }

  return runtimeConfig;
}

export async function saveMobileConfig(partial: Partial<MobileConfig>) {
  const nextConfig: MobileConfig = {
    apiBaseUrl: partial.apiBaseUrl?.trim() || runtimeConfig.apiBaseUrl,
    apiToken: partial.apiToken?.trim() || runtimeConfig.apiToken,
  };

  runtimeConfig = nextConfig;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextConfig));
  return nextConfig;
}

export async function clearMobileSession() {
  runtimeConfig = {
    ...runtimeConfig,
    apiToken: '',
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(runtimeConfig));
  return runtimeConfig;
}

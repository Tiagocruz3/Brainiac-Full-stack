import { Settings, ProjectHistory } from '@/types';

const STORAGE_KEYS = {
  SETTINGS: 'brainiac_settings',
  HISTORY: 'brainiac_history',
  THEME: 'brainiac_theme',
};

// Settings Management
export const saveSettings = (settings: Settings): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export const loadSettings = (): Settings | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return null;
  }
};

export const clearSettings = (): void => {
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
};

// Project History Management
export const saveProject = (project: ProjectHistory): void => {
  try {
    const history = loadHistory();
    history.unshift(project); // Add to beginning
    
    // Keep only last 50 projects
    if (history.length > 50) {
      history.splice(50);
    }
    
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save project:', error);
  }
};

export const loadHistory = (): ProjectHistory[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
};

// Validation
export const validateSettings = (settings: Settings): boolean => {
  return !!(
    settings.apiKeys.anthropic &&
    settings.apiKeys.supabase.token &&
    settings.apiKeys.supabase.orgId &&
    settings.apiKeys.github.token &&
    settings.apiKeys.github.owner &&
    settings.apiKeys.vercel.token
  );
};

// Check if settings exist and are valid
export const hasValidSettings = (): boolean => {
  const settings = loadSettings();
  return settings !== null && validateSettings(settings);
};

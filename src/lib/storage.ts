// Storage utilities for Chrome extension

import type { Settings } from './types';
import { DEFAULT_BACKEND_URL } from './api-client';

const DEFAULT_SETTINGS: Settings = {
    backendUrl: DEFAULT_BACKEND_URL
};

export async function getSettings(): Promise<Settings> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
            resolve({ ...DEFAULT_SETTINGS, ...result.settings });
        });
    });
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    return new Promise((resolve) => {
        chrome.storage.local.set({ settings: updated }, resolve);
    });
}

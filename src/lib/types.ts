// Type definitions for AI Answer Extension

export interface Settings {
    backendUrl: string; // Backend URL host
}

export interface AIResponse {
    success: boolean;
    answer?: string;
    error?: string;
    quotaExceeded?: boolean;
    extracted_text?: string;
}

export interface Message {
    action: 'capture' | 'analyze' | 'getSettings' | 'saveSettings' | 'testConnection';
    data?: unknown;
}

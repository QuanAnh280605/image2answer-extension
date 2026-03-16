import type { AIResponse } from './types';

// Default backend URL
export const DEFAULT_BACKEND_URL = 'http://localhost:8000';

export async function getBackendUrl(): Promise<string> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
            resolve(result.settings?.backendUrl || DEFAULT_BACKEND_URL);
        });
    });
}

export async function healthCheck(backendUrl?: string): Promise<boolean> {
    const url = backendUrl || await getBackendUrl();
    try {
        const response = await fetch(`${url}/health`, { method: 'GET' });
        if (!response.ok) return false;
        const data = await response.json();
        return data.status === 'ok';
    } catch (e) {
        return false;
    }
}

export async function analyzeViaBackend(
    base64Image: string
): Promise<AIResponse> {
    const url = await getBackendUrl();

    try {
        const response = await fetch(`${url}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: base64Image,
                system_prompt_type: "default",
                verbose: false
            })
        });

        if (!response.ok) {
            return {
                success: false,
                error: `HTTP Error: ${response.status} ${response.statusText}`,
                quotaExceeded: response.status === 429
            };
        }

        const data = await response.json();
        return data;
    } catch (error) {
        return {
            success: false,
            error: `Network Error: Lỗi kết nối đến backend URL (${url}). Hãy đảm bảo server đang chạy.`
        };
    }
}

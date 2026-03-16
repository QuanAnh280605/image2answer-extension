// AI Service - Integration with Backend API

import type { AIResponse } from './types';
import { analyzeViaBackend } from './api-client';

// Main analyze function (now routes to your backend server)
export async function analyzeImage(
    base64Image: string
): Promise<AIResponse> {
    // Call the newly implemented API client
    return await analyzeViaBackend(base64Image);
}

// Popup Script - Main UI Logic

import type { Settings } from './lib/types';

// DOM Elements
const captureBtn = document.getElementById('captureBtn') as HTMLButtonElement;
const analyzeBtn = document.getElementById('analyzeBtn') as HTMLButtonElement;
const previewDiv = document.getElementById('preview') as HTMLDivElement;
const previewImg = document.getElementById('previewImg') as HTMLImageElement;
const resultDiv = document.getElementById('result') as HTMLDivElement;
const answerDiv = document.getElementById('answer') as HTMLDivElement;
const errorDiv = document.getElementById('error') as HTMLDivElement;
const loadingDiv = document.getElementById('loading') as HTMLDivElement;

let currentScreenshot: string | null = null;

// Utility functions
function showError(message: string) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

function showLoading(show: boolean) {
    if (show) {
        loadingDiv.classList.remove('hidden');
    } else {
        loadingDiv.classList.add('hidden');
    }
}

// Load saved settings
async function loadSettings() {
    // Setting logic removed
}

// Capture screenshot
async function captureScreenshot() {
    try {
        showLoading(true);
        errorDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');

        const response = await chrome.runtime.sendMessage({ action: 'capture' });

        if (response.success) {
            currentScreenshot = response.screenshot as string;
            previewImg.src = currentScreenshot;
            previewDiv.classList.remove('hidden');
            analyzeBtn.disabled = false;
        } else {
            showError(response.error || 'Không thể chụp màn hình');
        }
    } catch (error) {
        showError('Lỗi: ' + String(error));
    } finally {
        showLoading(false);
    }
}

// Analyze with AI
async function analyzeWithAI() {
    if (!currentScreenshot) {
        showError('Vui lòng chụp màn hình trước');
        return;
    }

    try {
        showLoading(true);
        errorDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');

        const response = await chrome.runtime.sendMessage({
            action: 'analyze',
            data: {
                screenshot: currentScreenshot
            },
        });

        if (response.success && response.answer) {
            answerDiv.textContent = response.answer;
            resultDiv.classList.remove('hidden');
        } else {
            showError(response.error || 'Không thể lấy đáp án');
        }
    } catch (error) {
        showError('Lỗi: ' + String(error));
    } finally {
        showLoading(false);
    }
}

// Event listeners
captureBtn.addEventListener('click', captureScreenshot);
analyzeBtn.addEventListener('click', analyzeWithAI);

// Initialize
loadSettings();

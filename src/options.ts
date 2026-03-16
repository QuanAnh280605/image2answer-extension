// Options Page Script

import { getSettings, saveSettings } from './lib/storage';
import { healthCheck } from './lib/api-client';
import type { Settings } from './lib/types';

// DOM Elements
const form = document.getElementById('settingsForm') as HTMLFormElement;
const backendUrlInput = document.getElementById('backendUrl') as HTMLInputElement;
const testConnBtn = document.getElementById('testConnBtn') as HTMLButtonElement;
const messageDiv = document.getElementById('message') as HTMLDivElement;
const statusIndicator = document.getElementById('statusIndicator') as HTMLDivElement;

// Show message
function showMessage(text: string, type: 'success' | 'error') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    if (type !== 'error') {
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 3000);
    }
}

// Load settings
async function loadSettings() {
    const settings = await getSettings();
    backendUrlInput.value = settings.backendUrl || 'http://localhost:8000';

    // Quick test on start
    await checkConnectionStatus(backendUrlInput.value);
}

async function checkConnectionStatus(url: string) {
    statusIndicator.innerHTML = '<i>Đang kiểm tra kết nối với Backend...</i>';
    const isReady = await healthCheck(url);
    if(isReady) {
        statusIndicator.innerHTML = '<b style="color:var(--success)">🟢 Backend trực tuyến (sẵn sàng)</b>';
    } else {
        statusIndicator.innerHTML = '<b style="color:var(--danger)">🔴 Backend ngoại tuyến / Lỗi mạng</b> <br/><small>Hãy đảm bảo máy chủ extension của bạn đang chạy ở cổng phù hợp.</small>';
    }
}

// Save settings
async function handleSubmit(e: Event) {
    e.preventDefault();

    const settings: Partial<Settings> = {
        backendUrl: backendUrlInput.value.trim(),
    };

    try {
        await saveSettings(settings);
        showMessage('✅ Đã lưu cài đặt thành công!', 'success');
        await checkConnectionStatus(settings.backendUrl!);
    } catch (error) {
        showMessage('❌ Lỗi khi lưu: ' + String(error), 'error');
    }
}

// Event listeners
form.addEventListener('submit', handleSubmit);
testConnBtn.addEventListener('click', () => {
    checkConnectionStatus(backendUrlInput.value.trim());
});

// Initialize
loadSettings();

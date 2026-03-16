// Content Script - Region Selection and Overlay
import { marked } from 'marked';

// Configure marked for safe rendering (sync mode)
marked.use({
    breaks: true,
    gfm: true,
    async: false
});

// State
let isSelecting = false;
let startX = 0;
let startY = 0;
let selectionBox: HTMLDivElement | null = null;
let overlay: HTMLDivElement | null = null;

// Create selection overlay
function createSelectionOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'ai-answer-overlay';
    overlay.innerHTML = `
    <div class="ai-answer-instruction">
      🎯 Kéo chuột để chọn vùng cần hỏi AI
      <span class="ai-answer-cancel">Nhấn ESC để hủy</span>
    </div>
  `;
    document.body.appendChild(overlay);
}

// Create selection box
function createSelectionBox() {
    selectionBox = document.createElement('div');
    selectionBox.id = 'ai-answer-selection';
    document.body.appendChild(selectionBox);
}

// Start selection mode
function startSelection() {
    isSelecting = false;
    createSelectionOverlay();
    createSelectionBox();

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
}

// Mouse events
function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; // Only left click

    isSelecting = true;
    startX = e.pageX;
    startY = e.pageY;

    if (selectionBox) {
        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0';
        selectionBox.style.height = '0';
        selectionBox.style.display = 'block';
    }
}

function onMouseMove(e: MouseEvent) {
    if (!isSelecting || !selectionBox) return;

    const currentX = e.pageX;
    const currentY = e.pageY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
}

function onMouseUp(e: MouseEvent) {
    if (!isSelecting || !selectionBox) return;

    isSelecting = false;

    const rect = {
        left: parseInt(selectionBox.style.left),
        top: parseInt(selectionBox.style.top),
        width: parseInt(selectionBox.style.width),
        height: parseInt(selectionBox.style.height),
    };

    // Minimum size check
    if (rect.width < 10 || rect.height < 10) {
        cleanup();
        return;
    }

    // Hide selection UI and capture
    cleanup();

    // Send capture request to background
    chrome.runtime.sendMessage({
        action: 'captureRegion',
        data: {
            rect: rect,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            devicePixelRatio: window.devicePixelRatio,
        }
    });
}

function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        cleanup();
    }
}

// Cleanup selection UI
function cleanup() {
    isSelecting = false;

    if (overlay) {
        overlay.remove();
        overlay = null;
    }
    if (selectionBox) {
        selectionBox.remove();
        selectionBox = null;
    }

    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDown);
}

// Show result overlay
function showResult(answer: string) {
    // Remove existing result
    const existing = document.getElementById('ai-answer-result');
    if (existing) existing.remove();

    const resultDiv = document.createElement('div');
    resultDiv.id = 'ai-answer-result';

    // Parse markdown to HTML
    console.log('[AI Answer] Raw answer:', answer);
    const htmlContent = marked.parse(answer) as string;
    console.log('[AI Answer] Parsed HTML:', htmlContent);

    // Build HTML structure
    const headerDiv = document.createElement('div');
    headerDiv.className = 'ai-answer-result-header';
    headerDiv.innerHTML = `
      <span>🤖 AI Answer</span>
      <button class="ai-answer-close" id="ai-answer-close-btn">✕</button>
    `;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'ai-answer-result-content ai-answer-markdown';
    contentDiv.innerHTML = htmlContent;

    resultDiv.appendChild(headerDiv);
    resultDiv.appendChild(contentDiv);
    document.body.appendChild(resultDiv);

    // Make draggable
    makeDraggable(resultDiv);

    // Close button
    document.getElementById('ai-answer-close-btn')?.addEventListener('click', () => {
        resultDiv.remove();
    });
}

// Show loading
function showLoading() {
    const existing = document.getElementById('ai-answer-result');
    if (existing) existing.remove();

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'ai-answer-result';
    loadingDiv.innerHTML = `
    <div class="ai-answer-result-header">
      <span>🤖 AI Answer</span>
      <button class="ai-answer-close" id="ai-answer-close-btn">✕</button>
    </div>
    <div class="ai-answer-result-content ai-answer-loading">
      <div class="ai-answer-spinner"></div>
      <span>Đang xử lý...</span>
    </div>
  `;
    document.body.appendChild(loadingDiv);

    document.getElementById('ai-answer-close-btn')?.addEventListener('click', () => {
        loadingDiv.remove();
    });
}

// Show error
function showError(error: string) {
    const existing = document.getElementById('ai-answer-result');
    if (existing) existing.remove();

    const errorDiv = document.createElement('div');
    errorDiv.id = 'ai-answer-result';
    errorDiv.innerHTML = `
    <div class="ai-answer-result-header ai-answer-error">
      <span>❌ Lỗi</span>
      <button class="ai-answer-close" id="ai-answer-close-btn">✕</button>
    </div>
    <div class="ai-answer-result-content">${escapeHtml(error)}</div>
  `;
    document.body.appendChild(errorDiv);

    document.getElementById('ai-answer-close-btn')?.addEventListener('click', () => {
        errorDiv.remove();
    });
}

// Helper: Escape HTML
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// Helper: Make element draggable
function makeDraggable(element: HTMLElement) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const header = element.querySelector('.ai-answer-result-header') as HTMLElement;
    if (!header) return;

    header.style.cursor = 'move';

    header.addEventListener('mousedown', (e) => {
        if ((e.target as HTMLElement).classList.contains('ai-answer-close')) return;
        isDragging = true;
        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        element.style.left = (e.clientX - offsetX) + 'px';
        element.style.top = (e.clientY - offsetY) + 'px';
        element.style.right = 'auto';
        element.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startSelection') {
        startSelection();
        sendResponse({ success: true });
    }

    if (message.action === 'showLoading') {
        showLoading();
        sendResponse({ success: true });
    }

    if (message.action === 'showResult') {
        showResult(message.data.answer);
        sendResponse({ success: true });
    }

    if (message.action === 'showError') {
        showError(message.data.error);
        sendResponse({ success: true });
    }

    return true;
});

console.log('AI Answer Extension - Content Script loaded');

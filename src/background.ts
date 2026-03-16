// Background Service Worker for Chrome Extension

import { analyzeImage } from './lib/ai-service';
import { getSettings } from './lib/storage';

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'ai-answer-capture',
        title: '🤖 AI Answer - Chụp và hỏi',
        contexts: ['page', 'image', 'selection']
    });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'ai-answer-capture' && tab?.id) {
        // Inject content script if needed and start selection
        try {
            await chrome.tabs.sendMessage(tab.id, { action: 'startSelection' });
        } catch (e) {
            // Content script not loaded, inject it first
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ['content.css']
            });
            // Wait a bit then try again
            setTimeout(async () => {
                await chrome.tabs.sendMessage(tab.id!, { action: 'startSelection' });
            }, 100);
        }
    }
});

// Capture visible tab screenshot
async function captureScreenshot(): Promise<string> {
    const dataUrl = await chrome.tabs.captureVisibleTab({
        format: 'png',
        quality: 100,
    });
    return dataUrl;
}

// Crop image from screenshot
async function cropImage(
    dataUrl: string,
    rect: { left: number; top: number; width: number; height: number },
    scrollX: number,
    scrollY: number,
    devicePixelRatio: number
): Promise<string> {
    // Create offscreen canvas for cropping
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    // Adjust for scroll position and device pixel ratio
    const cropX = (rect.left - scrollX) * devicePixelRatio;
    const cropY = (rect.top - scrollY) * devicePixelRatio;
    const cropWidth = rect.width * devicePixelRatio;
    const cropHeight = rect.height * devicePixelRatio;

    // Use OffscreenCanvas
    const canvas = new OffscreenCanvas(cropWidth, cropHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(
        bitmap,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
    );

    const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });

    // Convert to base64
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(croppedBlob);
    });
}

// Handle messages from popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Capture full tab
    if (message.action === 'capture') {
        captureScreenshot()
            .then((screenshot) => sendResponse({ success: true, screenshot }))
            .catch((error) => sendResponse({ success: false, error: String(error) }));
        return true;
    }

    // Capture region (from context menu)
    if (message.action === 'captureRegion') {
        const { rect, scrollX, scrollY, devicePixelRatio } = message.data;

        (async () => {
            try {
                // Show loading in content script
                if (sender.tab?.id) {
                    await chrome.tabs.sendMessage(sender.tab.id, { action: 'showLoading' });
                }

                // Capture and crop
                const screenshot = await captureScreenshot();
                const croppedImage = await cropImage(screenshot, rect, scrollX, scrollY, devicePixelRatio);

                // Get settings and analyze
                const result = await analyzeImage(croppedImage);

                // Send result to content script
                if (sender.tab?.id) {
                    if (result.success && result.answer) {
                        await chrome.tabs.sendMessage(sender.tab.id, {
                            action: 'showResult',
                            data: { answer: result.answer }
                        });
                    } else {
                        await chrome.tabs.sendMessage(sender.tab.id, {
                            action: 'showError',
                            data: { error: result.error || 'Unknown error' }
                        });
                    }
                }

                sendResponse(result);
            } catch (error) {
                if (sender.tab?.id) {
                    await chrome.tabs.sendMessage(sender.tab.id, {
                        action: 'showError',
                        data: { error: String(error) }
                    });
                }
                sendResponse({ success: false, error: String(error) });
            }
        })();

        return true;
    }

    // Analyze with AI (from popup)
    if (message.action === 'analyze') {
        const { screenshot } = message.data as {
            screenshot: string;
        };
        analyzeImage(screenshot)
            .then((result) => sendResponse(result))
            .catch((error) => sendResponse({ success: false, error: String(error) }));
        return true;
    }

    // Get settings
    if (message.action === 'getSettings') {
        getSettings()
            .then((settings) => sendResponse({ success: true, settings }))
            .catch((error) => sendResponse({ success: false, error: String(error) }));
        return true;
    }
});

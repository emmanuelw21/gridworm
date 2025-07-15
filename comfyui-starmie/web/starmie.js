/**
 * Starmie Web Extension for ComfyUI
 * Injects star buttons into the ComfyUI interface
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Track starred items
const starredItems = new Set();

// Load starred items from localStorage
function loadStarredItems() {
    const saved = localStorage.getItem('starmie_starred_items');
    if (saved) {
        const items = JSON.parse(saved);
        items.forEach(item => starredItems.add(item));
    }
}

// Save starred items to localStorage
function saveStarredItems() {
    localStorage.setItem('starmie_starred_items', JSON.stringify([...starredItems]));
}

// Create star button element
function createStarButton(filepath, isStarred = false) {
    const button = document.createElement('button');
    button.className = 'starmie-star-btn';
    button.innerHTML = isStarred ? '⭐' : '☆';
    button.title = isStarred ? 'Unstar this output' : 'Star this output';
    button.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(0, 0, 0, 0.7);
        border: none;
        border-radius: 4px;
        color: #FFD700;
        cursor: pointer;
        font-size: 20px;
        padding: 5px 10px;
        z-index: 1000;
        transition: all 0.2s ease;
    `;
    
    button.onmouseover = () => {
        button.style.background = 'rgba(0, 0, 0, 0.9)';
        button.style.transform = 'scale(1.1)';
    };
    
    button.onmouseout = () => {
        button.style.background = 'rgba(0, 0, 0, 0.7)';
        button.style.transform = 'scale(1)';
    };
    
    button.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (starredItems.has(filepath)) {
            // Unstar - not implemented for now
            starredItems.delete(filepath);
            button.innerHTML = '☆';
            button.title = 'Star this output';
        } else {
            // Star the item
            try {
                const response = await fetch('/starmie/star', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ filepath })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    starredItems.add(filepath);
                    button.innerHTML = '⭐';
                    button.title = 'Unstar this output';
                    showNotification('Output starred! ⭐', 'success');
                } else {
                    throw new Error('Failed to star output');
                }
            } catch (error) {
                console.error('Error starring output:', error);
                showNotification('Failed to star output', 'error');
            }
        }
        
        saveStarredItems();
    };
    
    return button;
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'starmie-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Inject star buttons into preview images
function injectStarButtons() {
    // Find all preview containers
    const previewContainers = document.querySelectorAll('.preview-image:not(.starmie-enhanced)');
    
    previewContainers.forEach(container => {
        container.classList.add('starmie-enhanced');
        container.style.position = 'relative';
        
        // Try to find the image source
        const img = container.querySelector('img');
        if (img && img.src) {
            // Extract filepath from src
            const filepath = img.src.replace(window.location.origin, '');
            const isStarred = starredItems.has(filepath);
            
            const starButton = createStarButton(filepath, isStarred);
            container.appendChild(starButton);
        }
    });
}

// Enhanced observer for ComfyUI's dynamic content
function setupObserver() {
    const observer = new MutationObserver((mutations) => {
        let shouldInject = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // Check if new nodes contain preview images
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList?.contains('preview-image') || 
                            node.querySelector?.('.preview-image')) {
                            shouldInject = true;
                        }
                    }
                });
            }
        });
        
        if (shouldInject) {
            // Debounce injection
            clearTimeout(observer.injectionTimeout);
            observer.injectionTimeout = setTimeout(injectStarButtons, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Add CSS styles
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .starmie-star-btn:active {
            transform: scale(0.95) !important;
        }
        
        .preview-image.starred {
            box-shadow: 0 0 10px #FFD700;
        }
    `;
    document.head.appendChild(style);
}

// Initialize when app is ready
app.registerExtension({
    name: "Starmie",
    async setup() {
        console.log("Starmie extension loaded");
        
        // Load saved starred items
        loadStarredItems();
        
        // Add styles
        addStyles();
        
        // Setup observer
        setupObserver();
        
        // Initial injection
        setTimeout(injectStarButtons, 1000);
        
        // Listen for ComfyUI events
        api.addEventListener("executed", (e) => {
            // Reinject buttons after workflow execution
            setTimeout(injectStarButtons, 500);
        });
        
        api.addEventListener("progress", (e) => {
            // You can add progress indicators here if needed
        });
    }
});
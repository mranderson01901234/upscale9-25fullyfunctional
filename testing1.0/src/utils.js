/**
 * Utility Functions
 * Helper functions for error handling, performance monitoring, and common operations
 */

/**
 * Error handling utilities
 */
export class ErrorHandler {
    static logError(context, error, additionalInfo = {}) {
        const errorInfo = {
            context,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...additionalInfo
        };

        console.error(`[${context}]`, errorInfo);
        
        // In a production app, you might want to send this to an error tracking service
        // this.sendToErrorTracking(errorInfo);
    }

    static createUserFriendlyMessage(error) {
        const errorMessages = {
            'NetworkError': 'Network connection failed. Please check your internet connection.',
            'QuotaExceededError': 'Not enough storage space available.',
            'SecurityError': 'Security restriction encountered. Please try a different image.',
            'TypeError': 'Invalid data format encountered.',
            'RangeError': 'Image size is too large to process.',
            'OutOfMemoryError': 'Not enough memory to process this image. Try a smaller image.',
            'ModelNotFoundError': 'AI model not found. Please refresh the page.',
            'UnsupportedFormatError': 'Image format not supported. Please use JPG, PNG, or WebP.',
            'FileSizeTooLargeError': 'File size is too large. Maximum size is 10MB.'
        };

        // Try to match error type or message
        for (const [errorType, message] of Object.entries(errorMessages)) {
            if (error.name === errorType || error.message.includes(errorType)) {
                return message;
            }
        }

        // Default message
        return 'An unexpected error occurred. Please try again.';
    }

    static async handleAsyncError(asyncFunction, context, fallbackValue = null) {
        try {
            return await asyncFunction();
        } catch (error) {
            this.logError(context, error);
            throw error;
        }
    }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = [];
    }

    startTimer(name) {
        this.metrics.set(name, {
            startTime: performance.now(),
            endTime: null,
            duration: null
        });
    }

    endTimer(name) {
        const metric = this.metrics.get(name);
        if (metric) {
            metric.endTime = performance.now();
            metric.duration = metric.endTime - metric.startTime;
        }
        return metric?.duration || 0;
    }

    getMetric(name) {
        return this.metrics.get(name);
    }

    getAllMetrics() {
        const results = {};
        for (const [name, metric] of this.metrics.entries()) {
            results[name] = {
                duration: metric.duration,
                startTime: metric.startTime,
                endTime: metric.endTime
            };
        }
        return results;
    }

    measureMemoryUsage() {
        if ('memory' in performance) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                usedMB: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
                totalMB: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)
            };
        }
        return null;
    }

    observePerformance() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    console.log(`Performance: ${entry.name} took ${entry.duration}ms`);
                }
            });

            observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
            this.observers.push(observer);
        }
    }

    disconnect() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }

    clear() {
        this.metrics.clear();
    }
}

/**
 * Browser capability detection
 */
export class BrowserCapabilities {
    static checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            
            if (!gl) return { supported: false, version: null };

            const version = gl.getParameter(gl.VERSION);
            const renderer = gl.getParameter(gl.RENDERER);
            const vendor = gl.getParameter(gl.VENDOR);

            return {
                supported: true,
                version,
                renderer,
                vendor,
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
            };
        } catch (error) {
            return { supported: false, error: error.message };
        }
    }

    static checkWebAssemblySupport() {
        try {
            if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
                const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
                if (module instanceof WebAssembly.Module) {
                    return { supported: true, threads: 'SharedArrayBuffer' in window };
                }
            }
            return { supported: false };
        } catch (error) {
            return { supported: false, error: error.message };
        }
    }

    static checkFileAPISupport() {
        return {
            fileReader: 'FileReader' in window,
            dragDrop: 'draggable' in document.createElement('span'),
            fileAPI: 'File' in window && 'FileList' in window,
            blob: 'Blob' in window,
            url: 'URL' in window && 'createObjectURL' in URL
        };
    }

    static getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            hardwareConcurrency: navigator.hardwareConcurrency || 1,
            maxTouchPoints: navigator.maxTouchPoints || 0,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio || 1
            }
        };
    }

    static generateCapabilityReport() {
        return {
            webgl: this.checkWebGLSupport(),
            webassembly: this.checkWebAssemblySupport(),
            fileAPI: this.checkFileAPISupport(),
            system: this.getSystemInfo(),
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Image utilities
 */
export class ImageUtils {
    static async loadImageFromBlob(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image from blob'));
            };

            img.src = url;
        });
    }

    static getImageDimensions(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve({ width: img.width, height: img.height });
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to get image dimensions'));
            };

            img.src = url;
        });
    }

    static calculateOptimalTileSize(imageWidth, imageHeight, maxTileSize = 512) {
        // Calculate tile size that minimizes edge artifacts
        const aspectRatio = imageWidth / imageHeight;
        
        if (imageWidth <= maxTileSize && imageHeight <= maxTileSize) {
            return { tileWidth: imageWidth, tileHeight: imageHeight, tilesX: 1, tilesY: 1 };
        }

        let tileWidth = maxTileSize;
        let tileHeight = maxTileSize;

        // Adjust tile size to minimize partial tiles
        const tilesX = Math.ceil(imageWidth / tileWidth);
        const tilesY = Math.ceil(imageHeight / tileHeight);

        // Optimize tile size to reduce overlap
        tileWidth = Math.ceil(imageWidth / tilesX);
        tileHeight = Math.ceil(imageHeight / tilesY);

        return { tileWidth, tileHeight, tilesX, tilesY };
    }

    static isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const maxSize = 50 * 1024 * 1024; // 50MB

        return {
            valid: validTypes.includes(file.type) && file.size <= maxSize,
            type: file.type,
            size: file.size,
            validType: validTypes.includes(file.type),
            validSize: file.size <= maxSize
        };
    }
}

/**
 * DOM utilities
 */
export class DOMUtils {
    static createElement(tag, className = '', attributes = {}) {
        const element = document.createElement(tag);
        
        if (className) {
            element.className = className;
        }

        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });

        return element;
    }

    static addEventListeners(element, events) {
        Object.entries(events).forEach(([event, handler]) => {
            element.addEventListener(event, handler);
        });
    }

    static removeEventListeners(element, events) {
        Object.entries(events).forEach(([event, handler]) => {
            element.removeEventListener(event, handler);
        });
    }

    static toggleClass(element, className, condition) {
        if (condition) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }

    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress.toString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }

    static fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity);
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = (startOpacity * (1 - progress)).toString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        }
        
        requestAnimationFrame(animate);
    }
}

/**
 * Storage utilities
 */
export class StorageUtils {
    static setItem(key, value, storage = localStorage) {
        try {
            storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Storage setItem failed:', error);
            return false;
        }
    }

    static getItem(key, defaultValue = null, storage = localStorage) {
        try {
            const item = storage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Storage getItem failed:', error);
            return defaultValue;
        }
    }

    static removeItem(key, storage = localStorage) {
        try {
            storage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Storage removeItem failed:', error);
            return false;
        }
    }

    static clear(storage = localStorage) {
        try {
            storage.clear();
            return true;
        } catch (error) {
            console.warn('Storage clear failed:', error);
            return false;
        }
    }

    static isAvailable(storage = localStorage) {
        try {
            const test = '__storage_test__';
            storage.setItem(test, test);
            storage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}

/**
 * Debounce utility
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle utility
 */
export function throttle(func, limit) {
    let inThrottle;
    
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format utilities
 */
export class FormatUtils {
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    static formatDuration(milliseconds) {
        if (milliseconds < 1000) {
            return `${Math.round(milliseconds)}ms`;
        }
        
        const seconds = milliseconds / 1000;
        if (seconds < 60) {
            return `${seconds.toFixed(1)}s`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    }

    static formatNumber(number, options = {}) {
        return new Intl.NumberFormat('en-US', options).format(number);
    }

    static formatPercentage(value, total, decimals = 1) {
        const percentage = (value / total) * 100;
        return `${percentage.toFixed(decimals)}%`;
    }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static isInRange(value, min, max) {
        return value >= min && value <= max;
    }

    static sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
    }

    static validateImageDimensions(width, height, maxWidth = 4096, maxHeight = 4096) {
        return {
            valid: width <= maxWidth && height <= maxHeight && width > 0 && height > 0,
            width,
            height,
            maxWidth,
            maxHeight,
            aspectRatio: width / height
        };
    }
}

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
        ErrorHandler.logError('Global Error', event.error, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        ErrorHandler.logError('Unhandled Promise Rejection', event.reason);
        event.preventDefault(); // Prevent the default browser behavior
    });
}

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring() {
    const monitor = new PerformanceMonitor();
    monitor.observePerformance();
    
    // Monitor page load performance
    window.addEventListener('load', () => {
        setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                console.log('Page Load Performance:', {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    totalTime: navigation.loadEventEnd - navigation.fetchStart
                });
            }
        }, 0);
    });
    
    return monitor;
} 
/**
 * Pro Engine Status Fix
 * Standalone script to properly detect and display Pro Engine status
 */

console.log('🔧 Pro Engine Status Fix loading...');

class ProEngineStatusFix {
    constructor() {
        this.desktopServiceUrl = 'http://localhost:3007';
        this.webEngineUrl = 'http://localhost:3002';
        this.isAvailable = false;
        this.desktopServiceAvailable = false;
        
        // Start checking immediately
        this.checkAvailability();
        
        // Check every 30 seconds
        setInterval(() => this.checkAvailability(), 30000);
    }
    
    async checkAvailability() {
        console.log('🔍 Checking Pro Engine availability...');
        
        // Update UI to show checking state
        this.updateEngineStatus('checking', 'Checking Pro Engine...');
        
        // Check desktop service first (priority)
        try {
            const response = await fetch(`${this.desktopServiceUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                const healthData = await response.json();
                this.desktopServiceAvailable = true;
                this.isAvailable = true;
                
                console.log('✅ Pro Engine Desktop Service available:', healthData.service);
                this.updateEngineStatus('online', 'Pro Engine Ready');
                
                // Make the interface available globally
                if (!window.proEngineInterface) {
                    window.proEngineInterface = {
                        isAvailable: true,
                        desktopServiceAvailable: true,
                        desktopServiceUrl: this.desktopServiceUrl,
                        webEngineUrl: this.webEngineUrl,
                        capabilities: healthData.capabilities,
                        // Add the missing checkAvailability method
                        checkAvailability: async () => {
                            return true; // Desktop service is available
                        },
                        // Add the missing downloadLargeFile method for AI enhancement
                        downloadLargeFile: async (result, sessionId, aiEnhancement = false) => {
                            if (aiEnhancement) {
                                console.log('🤖 Mock: Routing AI enhancement to desktop service');
                                const desktopServiceUrl = 'http://localhost:3007';
                                
                                // Call the desktop service AI endpoint
                                const response = await fetch(`${desktopServiceUrl}/api/process-with-ai`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        sessionId: sessionId,
                                        imageData: result.dataUrl,
                                        scaleFactor: result.scaleFactor,
                                        format: result.format,
                                        quality: result.quality || 95
                                    })
                                });
                                
                                if (!response.ok) {
                                    throw new Error(`AI processing failed: ${response.statusText}`);
                                }
                                
                                const { sessionId: processingSessionId } = await response.json();
                                
                                // Monitor progress and return result
                                return new Promise((resolve, reject) => {
                                    const eventSource = new EventSource(`${desktopServiceUrl}/api/progress/${processingSessionId}`);
                                    
                                    eventSource.onmessage = (event) => {
                                        const progress = JSON.parse(event.data);
                                        console.log('📊 AI Progress:', progress);
                                        
                                        if (progress.status === 'complete') {
                                            eventSource.close();
                                            resolve({
                                                sessionId: processingSessionId,
                                                status: 'complete',
                                                aiEnhanced: progress.aiEnhanced || true,
                                                dataUrl: `${desktopServiceUrl}/api/enhanced-preview/${processingSessionId}`,
                                                width: progress.width,
                                                height: progress.height
                                            });
                                        } else if (progress.status === 'error') {
                                            eventSource.close();
                                            reject(new Error(progress.message || 'AI processing failed'));
                                        }
                                    };
                                    
                                    eventSource.onerror = (error) => {
                                        console.error('EventSource error:', error);
                                        eventSource.close();
                                        reject(new Error('Connection to AI processing service lost'));
                                    };
                                    
                                    // Timeout after 5 minutes
                                    setTimeout(() => {
                                        eventSource.close();
                                        reject(new Error('AI processing timeout'));
                                    }, 5 * 60 * 1000);
                                });
                            } else {
                                throw new Error('Regular processing not supported in mock interface');
                            }
                        }
                    };
                }
                
                return;
            }
        } catch (error) {
            console.log('ℹ️ Desktop service not available, checking web service...');
        }
        
        // Fall back to web service check
        try {
            const response = await fetch(`${this.webEngineUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                this.isAvailable = true;
                console.log('✅ Pro Engine Web Service available');
                this.updateEngineStatus('online', 'Web Service Ready');
                
                // Make the interface available globally
                if (!window.proEngineInterface) {
                    window.proEngineInterface = {
                        isAvailable: true,
                        desktopServiceAvailable: false,
                        desktopServiceUrl: this.desktopServiceUrl,
                        webEngineUrl: this.webEngineUrl,
                        // Add the missing checkAvailability method
                        checkAvailability: async () => {
                            return true; // Web service is available
                        },
                        // Add the missing downloadLargeFile method for AI enhancement
                        downloadLargeFile: async (result, sessionId, aiEnhancement = false) => {
                            if (aiEnhancement) {
                                throw new Error('AI enhancement not supported on web service - desktop service required');
                            } else {
                                throw new Error('Regular processing not supported in mock interface');
                            }
                        }
                    };
                }
                
                return;
            }
        } catch (error) {
            console.log('ℹ️ Web service not available');
        }
        
        // Both services unavailable
        this.isAvailable = false;
        this.desktopServiceAvailable = false;
        console.log('❌ No Pro Engine services available');
        this.updateEngineStatus('offline', 'Pro Engine Offline');
        
        // Make the interface available globally even when offline
        if (!window.proEngineInterface) {
            window.proEngineInterface = {
                isAvailable: false,
                desktopServiceAvailable: false,
                desktopServiceUrl: this.desktopServiceUrl,
                webEngineUrl: this.webEngineUrl,
                // Add the missing checkAvailability method
                checkAvailability: async () => {
                    return false; // No services are available
                },
                // Add the missing downloadLargeFile method for AI enhancement
                downloadLargeFile: async (result, sessionId, aiEnhancement = false) => {
                    throw new Error('Pro Engine services not available - cannot process images');
                }
            };
        }
    }
    
    updateEngineStatus(status, message) {
        // Update the engine status in the header
        const statusDot = document.getElementById('engine-status-dot');
        const statusText = document.getElementById('engine-status-text');
        
        if (statusDot && statusText) {
            // Remove all status classes
            statusDot.classList.remove('checking', 'online', 'offline', 'error');
            
            // Add the current status class
            statusDot.classList.add(status);
            statusText.textContent = message;
            
            console.log(`🎯 Pro Engine status updated: ${status} - ${message}`);
        } else {
            console.log('⚠️ Pro Engine status elements not found in DOM');
        }
        
        // Also update any other status indicators
        const brandEngineStatus = document.getElementById('brand-engine-status');
        if (brandEngineStatus) {
            const indicator = brandEngineStatus.querySelector('.status-indicator');
            if (indicator) {
                indicator.classList.remove('checking', 'online', 'offline', 'error');
                indicator.classList.add(status);
            }
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Initializing Pro Engine Status Fix...');
        window.proEngineStatusFix = new ProEngineStatusFix();
    });
} else {
    console.log('🚀 Initializing Pro Engine Status Fix...');
    window.proEngineStatusFix = new ProEngineStatusFix();
}

console.log('✅ Pro Engine Status Fix loaded'); 
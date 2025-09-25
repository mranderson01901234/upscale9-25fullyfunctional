/**
 * AI Enhancement Display Fix
 * 
 * This module fixes the critical disconnect between AI enhancement completion
 * and result display in the web application.
 * 
 * Issues Fixed:
 * 1. AI enhancement completes but image doesn't display
 * 2. Progress monitoring disconnects from result display
 * 3. Image presentation manager integration failures
 * 4. Cross-origin image loading issues
 * 5. Result formatting and display pipeline breaks
 */

class AIEnhancementDisplayFix {
    constructor() {
        this.isFixActive = true;
        this.activeEnhancements = new Map();
        console.log('🔧 AI Enhancement Display Fix initialized');
    }

    /**
     * Enhanced monitoring with proper result display integration
     */
    async monitorAIEnhancementWithDisplay(sessionId, progressCallback = null) {
        console.log(`🎯 Starting enhanced AI monitoring for session: ${sessionId}`);
        
        return new Promise((resolve, reject) => {
            let eventSource;
            let progressUpdateCount = 0;
            let lastProgressTime = Date.now();
            
            try {
                const progressUrl = `http://localhost:3007/api/progress/${sessionId}`;
                eventSource = new EventSource(progressUrl);
                console.log('✅ EventSource created for AI monitoring:', progressUrl);
            } catch (error) {
                console.error('❌ EventSource creation failed:', error);
                return this.fallbackPollingForAI(sessionId, resolve, reject, progressCallback);
            }
            
            eventSource.onmessage = async (event) => {
                try {
                    progressUpdateCount++;
                    lastProgressTime = Date.now();
                    
                    const progress = JSON.parse(event.data);
                    console.log(`📊 AI Progress update #${progressUpdateCount}:`, progress);
                    
                    // Update UI progress
                    if (progressCallback) {
                        progressCallback(progress.progress, progress.message);
                    }
                    
                    // Update global progress if available
                    if (window.app?.presentationManager?.updateEnhancementProgress) {
                        window.app.presentationManager.updateEnhancementProgress(
                            progress.progress, 
                            progress.message,
                            progress.stage || 'processing'
                        );
                    }
                    
                    // Handle completion
                    if (progress.status === 'complete') {
                        eventSource.close();
                        console.log('🎉 AI Enhancement completed, initiating display sequence');
                        
                        // CRITICAL FIX: Ensure proper display integration
                        const result = await this.handleAIEnhancementCompletion(sessionId, progress);
                        resolve(result);
                        
                    } else if (progress.status === 'error') {
                        eventSource.close();
                        console.error('❌ AI Enhancement failed:', progress.message);
                        reject(new Error(progress.message || 'AI Enhancement failed'));
                    }
                    
                } catch (error) {
                    console.error('❌ Progress parsing error:', error);
                }
            };
            
            eventSource.onerror = (error) => {
                console.error('❌ EventSource error:', error);
                eventSource.close();
                
                // Fallback to polling if EventSource fails
                if (progressUpdateCount === 0) {
                    console.log('🔄 EventSource failed, switching to polling fallback');
                    this.fallbackPollingForAI(sessionId, resolve, reject, progressCallback);
                } else {
                    reject(new Error('Connection to AI service lost'));
                }
            };
            
            // Enhanced timeout with completion check
            setTimeout(async () => {
                const timeSinceLastProgress = Date.now() - lastProgressTime;
                if (timeSinceLastProgress > 60000) { // 1 minute without progress
                    console.warn('⚠️ AI processing timeout, checking for completion');
                    eventSource.close();
                    
                    // Try to get final result
                    try {
                        const result = await this.checkForCompletedAIResult(sessionId);
                        if (result) {
                            resolve(result);
                        } else {
                            reject(new Error('AI Enhancement timeout - no result found'));
                        }
                    } catch (error) {
                        reject(new Error('AI Enhancement timeout'));
                    }
                } else {
                    eventSource.close();
                    reject(new Error('AI Enhancement timeout'));
                }
            }, 10 * 60 * 1000); // 10 minute timeout
        });
    }

    /**
     * Handle AI enhancement completion with proper display integration
     */
    async handleAIEnhancementCompletion(sessionId, progress) {
        console.log('🎯 Handling AI enhancement completion for session:', sessionId);
        
        try {
            // Step 1: Get session result data
            const sessionResult = await this.getSessionResultData(sessionId);
            console.log('📊 Session result data retrieved:', sessionResult);
            
            // Step 2: Load the enhanced image
            const enhancedImageUrl = `http://localhost:3007/api/enhanced-preview/${sessionId}?t=${Date.now()}`;
            const enhancedImage = await this.loadEnhancedImage(enhancedImageUrl);
            console.log('🖼️ Enhanced image loaded:', enhancedImage.width + 'x' + enhancedImage.height);
            
            // Step 3: Create comprehensive result object
            const result = {
                sessionId: sessionId,
                status: 'complete',
                message: 'AI Enhancement completed successfully',
                aiEnhanced: true,
                width: enhancedImage.width,
                height: enhancedImage.height,
                dimensions: {
                    width: enhancedImage.width,
                    height: enhancedImage.height
                },
                dataUrl: enhancedImageUrl,
                image: enhancedImage,
                filename: sessionResult?.filename,
                fileSize: sessionResult?.fileSize,
                processingTime: sessionResult?.processingTime,
                isProEngineResult: true,
                downloadUrl: `http://localhost:3007/api/download/${sessionId}`
            };
            
            // Step 4: Display the result properly
            await this.displayAIEnhancementResult(result);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error handling AI enhancement completion:', error);
            
            // Fallback: Still try to display something
            const fallbackResult = {
                sessionId: sessionId,
                status: 'complete',
                message: 'AI Enhancement completed (display error)',
                aiEnhanced: true,
                dataUrl: `http://localhost:3007/api/enhanced-preview/${sessionId}`,
                downloadUrl: `http://localhost:3007/api/download/${sessionId}`
            };
            
            await this.displayAIEnhancementFallback(fallbackResult);
            return fallbackResult;
        }
    }

    /**
     * Get session result data from server
     */
    async getSessionResultData(sessionId) {
        try {
            const response = await fetch(`http://localhost:3007/api/session-result/${sessionId}`);
            if (!response.ok) {
                throw new Error(`Failed to get session result: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.warn('⚠️ Could not get session result data:', error);
            return null;
        }
    }

    /**
     * Load enhanced image with multiple fallback methods
     */
    async loadEnhancedImage(imageUrl) {
        console.log('🔄 Loading enhanced image:', imageUrl);
        
        // Method 1: Standard image loading with CORS
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            const loadPromise = new Promise((resolve, reject) => {
                img.onload = () => {
                    console.log('✅ Enhanced image loaded via standard method');
                    resolve(img);
                };
                img.onerror = (error) => {
                    console.log('❌ Standard image load failed:', error);
                    reject(error);
                };
                setTimeout(() => reject(new Error('Image load timeout')), 15000);
            });
            
            img.src = imageUrl;
            return await loadPromise;
            
        } catch (error) {
            console.log('❌ Standard image loading failed, trying fetch method');
        }
        
        // Method 2: Fetch with blob conversion
        try {
            const response = await fetch(imageUrl, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            
            const img = new Image();
            const loadPromise = new Promise((resolve, reject) => {
                img.onload = () => {
                    URL.revokeObjectURL(objectUrl);
                    console.log('✅ Enhanced image loaded via fetch method');
                    resolve(img);
                };
                img.onerror = (error) => {
                    URL.revokeObjectURL(objectUrl);
                    reject(error);
                };
                setTimeout(() => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('Blob image load timeout'));
                }, 10000);
            });
            
            img.src = objectUrl;
            return await loadPromise;
            
        } catch (error) {
            console.error('❌ All image loading methods failed:', error);
            throw new Error('Failed to load enhanced image');
        }
    }

    /**
     * Display AI enhancement result with proper integration
     */
    async displayAIEnhancementResult(result) {
        console.log('🎨 Displaying AI enhancement result');
        
        try {
            // Method 1: Use ImagePresentationManager if available
            if (window.app?.presentationManager) {
                console.log('✅ Using ImagePresentationManager for display');
                
                // Update the enhanced image in the presentation manager
                window.app.presentationManager.enhancedImage = result;
                
                // Display the enhanced result
                window.app.presentationManager.displayEnhancedResult(result, true); // true = AI enhanced
                
                // Show success notification
                window.app.presentationManager.showNotification(
                    'AI Enhancement completed! Faces have been enhanced with CodeFormer.',
                    'success'
                );
                
                return;
            }
            
            // Method 2: Direct DOM manipulation fallback
            console.log('🔄 Using direct DOM manipulation fallback');
            await this.displayResultDirectly(result);
            
        } catch (error) {
            console.error('❌ Error displaying AI enhancement result:', error);
            await this.displayAIEnhancementFallback(result);
        }
    }

    /**
     * Display result directly in DOM
     */
    async displayResultDirectly(result) {
        console.log('🖼️ Displaying result directly in DOM');
        
        // Find enhanced container
        const enhancedContainer = document.getElementById('enhanced-container') || 
                                 document.querySelector('.enhanced-panel') ||
                                 document.querySelector('.main-content-area');
        
        if (!enhancedContainer) {
            console.error('❌ No enhanced container found');
            return;
        }
        
        // Clear existing content
        const enhancedPreview = document.getElementById('enhanced-preview');
        const enhancedPlaceholder = document.getElementById('enhanced-placeholder');
        
        if (enhancedPlaceholder) {
            enhancedPlaceholder.classList.add('hidden');
        }
        
        // Create or update enhanced image display
        let enhancedImage = document.getElementById('enhanced-image');
        if (!enhancedImage) {
            const previewDiv = document.createElement('div');
            previewDiv.id = 'enhanced-preview';
            previewDiv.className = 'image-preview';
            
            enhancedImage = document.createElement('img');
            enhancedImage.id = 'enhanced-image';
            enhancedImage.className = 'preview-image';
            enhancedImage.alt = 'AI Enhanced Result';
            
            previewDiv.appendChild(enhancedImage);
            enhancedContainer.appendChild(previewDiv);
        }
        
        // Set the enhanced image source
        enhancedImage.src = result.dataUrl;
        enhancedImage.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        // Show the enhanced preview
        if (enhancedPreview) {
            enhancedPreview.classList.remove('hidden');
        }
        
        // Update info display
        const enhancedInfo = document.getElementById('enhanced-info');
        if (enhancedInfo) {
            const megapixels = ((result.width * result.height) / 1000000).toFixed(1);
            enhancedInfo.textContent = `${result.width}×${result.height} (${megapixels}MP) - AI Enhanced`;
        }
        
        // Update panel title
        const panelTitle = document.querySelector('.enhanced-panel .panel-title');
        if (panelTitle) {
            panelTitle.textContent = 'AI Enhanced Result';
        }
        
        console.log('✅ AI enhancement result displayed directly in DOM');
    }

    /**
     * Fallback display method
     */
    async displayAIEnhancementFallback(result) {
        console.log('⚠️ Using AI enhancement display fallback');
        
        // Create a success message overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            max-width: 400px;
        `;
        
        overlay.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">🤖✅</div>
            <h3 style="margin: 0 0 10px 0; font-size: 18px;">AI Enhancement Complete!</h3>
            <p style="margin: 0 0 15px 0; font-size: 14px;">Your image has been enhanced with AI face processing</p>
            <p style="margin: 0 0 15px 0; font-size: 12px; opacity: 0.9;">File saved to Downloads/ProUpscaler/</p>
            <button onclick="this.parentElement.remove()" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
            ">Close</button>
        `;
        
        document.body.appendChild(overlay);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 5000);
    }

    /**
     * Check for completed AI result (timeout fallback)
     */
    async checkForCompletedAIResult(sessionId) {
        try {
            // Check if enhanced preview is available
            const previewUrl = `http://localhost:3007/api/enhanced-preview/${sessionId}`;
            const response = await fetch(previewUrl, { method: 'HEAD' });
            
            if (response.ok) {
                console.log('✅ Found completed AI result');
                return await this.handleAIEnhancementCompletion(sessionId, { 
                    status: 'complete', 
                    aiEnhanced: true 
                });
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error checking for completed result:', error);
            return null;
        }
    }

    /**
     * Fallback polling method
     */
    async fallbackPollingForAI(sessionId, resolve, reject, progressCallback) {
        console.log('🔄 Starting fallback polling for AI enhancement');
        
        let attempts = 0;
        const maxAttempts = 120; // 10 minutes with 5-second intervals
        
        const poll = async () => {
            attempts++;
            
            try {
                const progressUrl = `http://localhost:3007/api/progress-status/${sessionId}`;
                const response = await fetch(progressUrl);
                
                if (response.ok) {
                    const progress = await response.json();
                    
                    if (progressCallback) {
                        progressCallback(progress.progress, progress.message);
                    }
                    
                    if (progress.status === 'complete') {
                        const result = await this.handleAIEnhancementCompletion(sessionId, progress);
                        resolve(result);
                        return;
                    } else if (progress.status === 'error') {
                        reject(new Error(progress.message || 'AI Enhancement failed'));
                        return;
                    }
                }
                
                if (attempts >= maxAttempts) {
                    reject(new Error('AI Enhancement polling timeout'));
                    return;
                }
                
                setTimeout(poll, 5000); // Poll every 5 seconds
                
            } catch (error) {
                console.error('❌ Polling error:', error);
                if (attempts >= maxAttempts) {
                    reject(error);
                } else {
                    setTimeout(poll, 5000);
                }
            }
        };
        
        poll();
    }
}

// Initialize the fix
window.aiEnhancementDisplayFix = new AIEnhancementDisplayFix();

console.log('🔧 AI Enhancement Display Fix loaded and ready'); 
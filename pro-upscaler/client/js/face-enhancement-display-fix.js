/**
 * Comprehensive Face Enhancement Display Fix
 * Specifically addresses face enhancement display issues with improved timeouts,
 * better error handling, and face enhancement specific logic
 */

console.log('🎭 Loading Comprehensive Face Enhancement Display Fix...');

// Retry counter to prevent infinite loops
let faceEnhancementFixRetryCount = 0;
const faceEnhancementMaxFixRetries = 10;

// Comprehensive face enhancement display fix
const fixFaceEnhancementDisplay = () => {
    console.log('🎭 Applying Comprehensive Face Enhancement Display Fix...');
    
    // Check if ProEngineInterface class exists (not instance)
    if (typeof ProEngineInterface !== 'undefined' && ProEngineInterface.prototype) {
        const originalTryMultipleImageLoadMethods = ProEngineInterface.prototype.tryMultipleImageLoadMethods;
        const originalDisplayEnhancedInCanvas = ProEngineInterface.prototype.displayEnhancedInCanvas;
        
        // Enhanced tryMultipleImageLoadMethods with face enhancement specific logic
        ProEngineInterface.prototype.tryMultipleImageLoadMethods = async function(previewImageUrl, sessionId, wasAiEnhanced) {
            console.log(`🎭 Using face enhancement aware image loading for: ${previewImageUrl} (AI Enhanced: ${wasAiEnhanced})`);
            
            // Face enhancement specific timeout - AI processing takes longer
            const loadTimeout = wasAiEnhanced ? 30000 : 15000; // 30s for face enhancement, 15s for regular
            
            // Method 1: Enhanced blob approach with face enhancement support
            try {
                console.log(`🔄 Method 1: Enhanced blob approach (timeout: ${loadTimeout}ms)...`);
                
                const response = await fetch(previewImageUrl, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: {
                        'Accept': 'image/*',
                        'X-Enhancement-Type': wasAiEnhanced ? 'face-enhancement' : 'standard',
                        'X-Session-Id': sessionId
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const blob = await response.blob();
                console.log(`✅ Blob created for ${wasAiEnhanced ? 'face enhancement' : 'standard'}, size: ${blob.size} bytes`);
                
                const imageUrl = URL.createObjectURL(blob);
                
                const img = new Image();
                const loadPromise = new Promise((resolve, reject) => {
                    img.onload = () => {
                        console.log(`✅ ${wasAiEnhanced ? 'Face enhanced' : 'Standard'} image loaded via blob: ${img.width}×${img.height}`);
                        URL.revokeObjectURL(imageUrl);
                        resolve(img);
                    };
                    img.onerror = (error) => {
                        console.log(`❌ ${wasAiEnhanced ? 'Face enhanced' : 'Standard'} blob image load failed:`, error);
                        URL.revokeObjectURL(imageUrl);
                        reject(error);
                    };
                    
                    // Face enhancement aware timeout
                    setTimeout(() => {
                        console.log(`❌ ${wasAiEnhanced ? 'Face enhanced' : 'Standard'} image load timeout (${loadTimeout}ms)`);
                        URL.revokeObjectURL(imageUrl);
                        reject(new Error(`${wasAiEnhanced ? 'Face enhancement' : 'Standard'} image load timeout`));
                    }, loadTimeout);
                });
                
                img.src = imageUrl;
                const loadedImg = await loadPromise;
                
                console.log(`✅ Method 1 success: ${wasAiEnhanced ? 'Face-enhanced' : 'Upscaled'} image loaded: ${loadedImg.width}×${loadedImg.height}`);
                
                // Use enhanced display method for face enhancement
                if (wasAiEnhanced) {
                    await this.displayFaceEnhancedImage(loadedImg);
                } else {
                    this.displayImageInEnhancedElement(loadedImg, wasAiEnhanced);
                }
                
                // Create side-by-side comparison
                await this.createSideBySideComparison(loadedImg, wasAiEnhanced);
                return true;
                
            } catch (error) {
                console.log(`❌ Method 1 failed for ${wasAiEnhanced ? 'face enhancement' : 'standard'}:`, error.message);
            }
            
            // Method 2: Session result direct fetch (face enhancement specific)
            if (wasAiEnhanced) {
                try {
                    console.log('🔄 Method 2: Face enhancement session result direct fetch...');
                    
                    const sessionResult = await this.getSessionResult(sessionId);
                    if (sessionResult && sessionResult.processedImageUrl) {
                        console.log('✅ Got face enhancement session result, trying direct URL');
                        
                        const directSuccess = await this.tryDirectImageLoad(sessionResult.processedImageUrl, sessionId, true);
                        if (directSuccess) {
                            console.log('✅ Method 2 success: Face enhancement direct URL loaded');
                            return true;
                        }
                    }
                } catch (error) {
                    console.log('❌ Method 2 failed:', error.message);
                }
            }
            
            // Method 3: Fallback to original method
            try {
                console.log('🔄 Method 3: Fallback to original approach...');
                return await originalTryMultipleImageLoadMethods.call(this, previewImageUrl, sessionId, wasAiEnhanced);
            } catch (error) {
                console.log('❌ Method 3 failed:', error.message);
            }
            
            // Method 4: Direct image element display with face enhancement handling
            try {
                console.log('🔄 Method 4: Direct image element display...');
                
                const enhancedImage = document.getElementById('enhanced-image');
                const enhancedPreview = document.getElementById('enhanced-preview');
                const enhancedPlaceholder = document.getElementById('enhanced-placeholder');
                
                if (enhancedImage && enhancedPreview) {
                    const cacheBustUrl = `${previewImageUrl}?t=${Date.now()}&face=${wasAiEnhanced}`;
                    enhancedImage.src = cacheBustUrl;
                    
                    enhancedImage.onload = () => {
                        console.log(`✅ Method 4 success: ${wasAiEnhanced ? 'Face enhanced' : 'Standard'} image element loaded`);
                        
                        // Show enhanced preview, hide placeholder
                        if (enhancedPlaceholder) enhancedPlaceholder.classList.add('hidden');
                        enhancedPreview.classList.remove('hidden');
                        
                        // Update info with face enhancement indicator
                        const enhancedInfo = document.getElementById('enhanced-info');
                        if (enhancedInfo) {
                            const megapixels = ((enhancedImage.naturalWidth * enhancedImage.naturalHeight) / 1000000).toFixed(1);
                            const faceEnhancementText = wasAiEnhanced ? ' • CodeFormer Face Enhanced' : '';
                            enhancedInfo.textContent = `${enhancedImage.naturalWidth}×${enhancedImage.naturalHeight} • ${megapixels}MP${faceEnhancementText}`;
                        }
                        
                        // Enable download button
                        const downloadBtn = document.getElementById('download-result');
                        if (downloadBtn) {
                            downloadBtn.disabled = false;
                        }
                        
                        // Show success notification for face enhancement
                        if (wasAiEnhanced && window.app?.presentationManager?.showNotification) {
                            window.app.presentationManager.showNotification(
                                'Face enhancement completed! Faces have been enhanced with CodeFormer.',
                                'success'
                            );
                        }
                    };
                    
                    enhancedImage.onerror = () => {
                        console.log(`❌ Method 4 failed: ${wasAiEnhanced ? 'Face enhanced' : 'Standard'} image element error`);
                    };
                    
                    return true;
                }
                
            } catch (error) {
                console.log('❌ Method 4 failed:', error.message);
            }
            
            return false;
        };
        
        // Enhanced displayEnhancedInCanvas with face enhancement awareness
        ProEngineInterface.prototype.displayEnhancedInCanvas = async function(sessionId, wasAiEnhanced = false) {
            try {
                const previewImageUrl = `${this.desktopServiceUrl}/api/enhanced-preview/${sessionId}`;
                console.log(`🎭 Loading ${wasAiEnhanced ? 'face-enhanced' : 'upscaled'} image for canvas display: ${previewImageUrl}`);
                
                // Face enhancement specific handling
                if (wasAiEnhanced) {
                    console.log('🎭 Face enhancement detected - using specialized loading with extended timeouts');
                    
                    // Try to get the result directly from session first
                    try {
                        const sessionResult = await this.getSessionResult(sessionId);
                        if (sessionResult && sessionResult.processedImageUrl) {
                            console.log('✅ Got face enhancement session result, trying direct URL first');
                            const success = await this.tryMultipleImageLoadMethods(
                                sessionResult.processedImageUrl, 
                                sessionId, 
                                wasAiEnhanced
                            );
                            if (success) {
                                console.log('✅ Face enhancement direct URL display successful');
                                return;
                            }
                        }
                    } catch (error) {
                        console.log('❌ Face enhancement session result method failed:', error.message);
                    }
                }
                
                // Try multiple approaches for better browser compatibility
                const success = await this.tryMultipleImageLoadMethods(previewImageUrl, sessionId, wasAiEnhanced);
                
                if (!success) {
                    console.log(`⚠️ All ${wasAiEnhanced ? 'face enhancement' : 'standard'} image loading methods failed`);
                    this.handlePreviewLoadFailure(sessionId, wasAiEnhanced);
                }
                
            } catch (error) {
                console.error(`❌ Error displaying ${wasAiEnhanced ? 'face-enhanced' : 'upscaled'} image in canvas:`, error);
                this.handlePreviewLoadFailure(sessionId, wasAiEnhanced);
            }
        };
        
        // Add face enhancement specific display method
        ProEngineInterface.prototype.displayFaceEnhancedImage = async function(img) {
            console.log('🎭 Displaying face-enhanced image with special handling...');
            
            const enhancedImage = document.getElementById('enhanced-image');
            const enhancedPreview = document.getElementById('enhanced-preview');
            const enhancedPlaceholder = document.getElementById('enhanced-placeholder');
            const enhancedInfo = document.getElementById('enhanced-info');
            
            if (enhancedImage && enhancedPreview) {
                // Create canvas to convert image to data URL (handles CORS issues)
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Set the data URL as src
                enhancedImage.src = canvas.toDataURL('image/png');
                
                // Show enhanced preview, hide placeholder
                if (enhancedPlaceholder) enhancedPlaceholder.classList.add('hidden');
                enhancedPreview.classList.remove('hidden');
                
                // Update info with face enhancement specific text
                if (enhancedInfo) {
                    const megapixels = ((img.width * img.height) / 1000000).toFixed(1);
                    enhancedInfo.textContent = `${img.width}×${img.height} • ${megapixels}MP • CodeFormer Face Enhanced`;
                }
                
                // Enable download button
                const downloadBtn = document.getElementById('download-result');
                if (downloadBtn) {
                    downloadBtn.disabled = false;
                }
                
                // Show face enhancement completion notification
                if (window.app?.presentationManager?.showNotification) {
                    window.app.presentationManager.showNotification(
                        'Face enhancement completed! Faces have been enhanced with CodeFormer AI.',
                        'success'
                    );
                }
                
                console.log('✅ Face-enhanced image displayed successfully');
            } else {
                console.warn('⚠️ Enhanced image elements not found for face enhancement display');
            }
        };
        
        // Add direct image load method for face enhancement
        ProEngineInterface.prototype.tryDirectImageLoad = async function(imageUrl, sessionId, wasAiEnhanced) {
            try {
                console.log(`🔄 Trying direct image load: ${imageUrl}`);
                
                const img = new Image();
                const loadTimeout = wasAiEnhanced ? 30000 : 15000;
                
                const loadPromise = new Promise((resolve, reject) => {
                    img.onload = () => {
                        console.log(`✅ Direct image load success: ${img.width}×${img.height}`);
                        resolve(img);
                    };
                    img.onerror = reject;
                    setTimeout(() => reject(new Error('Direct image load timeout')), loadTimeout);
                });
                
                img.crossOrigin = 'anonymous';
                img.src = `${imageUrl}?t=${Date.now()}`;
                
                const loadedImg = await loadPromise;
                
                if (wasAiEnhanced) {
                    await this.displayFaceEnhancedImage(loadedImg);
                } else {
                    this.displayImageInEnhancedElement(loadedImg, wasAiEnhanced);
                }
                
                await this.createSideBySideComparison(loadedImg, wasAiEnhanced);
                return true;
                
            } catch (error) {
                console.log('❌ Direct image load failed:', error.message);
                return false;
            }
        };
        
        console.log('✅ Comprehensive Face Enhancement Display Fix applied to ProEngineInterface');
        faceEnhancementFixRetryCount = 0; // Reset counter on success
    } else {
        faceEnhancementFixRetryCount++;
        if (faceEnhancementFixRetryCount <= faceEnhancementMaxFixRetries) {
            console.warn(`⚠️ ProEngineInterface not found, retrying in 1 second... (${faceEnhancementFixRetryCount}/${faceEnhancementMaxFixRetries})`);
            setTimeout(fixFaceEnhancementDisplay, 1000);
        } else {
            console.error('❌ ProEngineInterface not found after maximum retries. Face enhancement display fix disabled.');
        }
    }
};

// Apply the fix when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixFaceEnhancementDisplay);
} else {
    // DOM already loaded
    setTimeout(fixFaceEnhancementDisplay, 100);
}

// Export for global access
window.faceEnhancementDisplayFix = {
    fixFaceEnhancementDisplay
};

console.log('✅ Comprehensive Face Enhancement Display Fix loaded and ready');

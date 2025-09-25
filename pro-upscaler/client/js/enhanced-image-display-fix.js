/**
 * Enhanced Image Display Fix
 * Fixes the issue where AI-enhanced images are not showing in the enhanced canvas
 */

console.log('🔧 Loading Enhanced Image Display Fix...');

// Retry counter to prevent infinite loops
let fixRetryCount = 0;
const maxFixRetries = 10;

// Fix the image loading timeout and display issues
const fixEnhancedImageDisplay = () => {
    console.log('🎨 Applying Enhanced Image Display Fix...');
    
    // Check if ProEngineInterface class exists (not instance)
    if (window.proEngineInterface) {
        const originalTryMultipleImageLoadMethods = window.proEngineInterface.tryMultipleImageLoadMethods;
        
        window.proEngineInterface.tryMultipleImageLoadMethods = async function(previewImageUrl, sessionId, wasAiEnhanced) {
            console.log('🔧 Using fixed image loading method for:', previewImageUrl);
            
            // Method 1: Direct canvas approach (bypasses CORS issues)
            try {
                console.log('🔄 Trying Method 1: Direct canvas approach...');
                
                const response = await fetch(previewImageUrl, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: {
                        'Accept': 'image/*'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const blob = await response.blob();
                const imageUrl = URL.createObjectURL(blob);
                
                const img = new Image();
                const loadPromise = new Promise((resolve, reject) => {
                    img.onload = () => {
                        console.log('✅ Image loaded via blob method');
                        URL.revokeObjectURL(imageUrl); // Clean up
                        resolve(img);
                    };
                    img.onerror = (error) => {
                        console.log('❌ Blob image load failed:', error);
                        URL.revokeObjectURL(imageUrl); // Clean up
                        reject(error);
                    };
                    
                    // Shorter timeout for blob method
                    setTimeout(() => {
                        console.log('❌ Blob image load timeout');
                        URL.revokeObjectURL(imageUrl); // Clean up
                        reject(new Error('Blob image load timeout'));
                    }, 10000);
                });
                
                img.src = imageUrl;
                const loadedImg = await loadPromise;
                
                console.log(`✅ Method 1 success: ${wasAiEnhanced ? 'AI-enhanced' : 'Upscaled'} image loaded: ${loadedImg.width}×${loadedImg.height}`);
                
                // Display in enhanced image element
                this.displayImageInEnhancedElement(loadedImg, wasAiEnhanced);
                
                // Also create side-by-side comparison
                await this.createSideBySideComparison(loadedImg, wasAiEnhanced);
                return true;
                
            } catch (error) {
                console.log('❌ Method 1 failed:', error.message);
            }
            
            // Method 2: Fallback to original method
            try {
                console.log('🔄 Trying Method 2: Fallback to original approach...');
                return await originalTryMultipleImageLoadMethods.call(this, previewImageUrl, sessionId, wasAiEnhanced);
            } catch (error) {
                console.log('❌ Method 2 failed:', error.message);
            }
            
            // Method 3: Direct image element display
            try {
                console.log('🔄 Trying Method 3: Direct image element display...');
                
                const enhancedImage = document.getElementById('enhanced-image');
                const enhancedPreview = document.getElementById('enhanced-preview');
                const enhancedPlaceholder = document.getElementById('enhanced-placeholder');
                
                if (enhancedImage && enhancedPreview) {
                    enhancedImage.src = previewImageUrl + '?t=' + Date.now();
                    
                    enhancedImage.onload = () => {
                        console.log('✅ Method 3 success: Direct image element loaded');
                        
                        // Show enhanced preview, hide placeholder
                        if (enhancedPlaceholder) enhancedPlaceholder.classList.add('hidden');
                        enhancedPreview.classList.remove('hidden');
                        
                        // Update info
                        const enhancedInfo = document.getElementById('enhanced-info');
                        if (enhancedInfo) {
                            const megapixels = ((enhancedImage.naturalWidth * enhancedImage.naturalHeight) / 1000000).toFixed(1);
                            enhancedInfo.textContent = `${enhancedImage.naturalWidth}×${enhancedImage.naturalHeight} • ${megapixels}MP${wasAiEnhanced ? ' • AI Enhanced' : ''}`;
                        }
                        
                        // Enable download button
                        const downloadBtn = document.getElementById('download-result');
                        if (downloadBtn) {
                            downloadBtn.disabled = false;
                        }
                    };
                    
                    enhancedImage.onerror = () => {
                        console.log('❌ Method 3 failed: Direct image element error');
                    };
                    
                    return true;
                }
                
            } catch (error) {
                console.log('❌ Method 3 failed:', error.message);
            }
            
            return false;
        };
        
        // Add the displayImageInEnhancedElement method
        ProEngineInterface.prototype.displayImageInEnhancedElement = function(img, wasAiEnhanced) {
            console.log('🖼️ Displaying image in enhanced element...');
            
            const enhancedImage = document.getElementById('enhanced-image');
            const enhancedPreview = document.getElementById('enhanced-preview');
            const enhancedPlaceholder = document.getElementById('enhanced-placeholder');
            const enhancedInfo = document.getElementById('enhanced-info');
            
            if (enhancedImage && enhancedPreview) {
                // Create canvas to convert image to data URL
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
                
                // Update info
                if (enhancedInfo) {
                    const megapixels = ((img.width * img.height) / 1000000).toFixed(1);
                    enhancedInfo.textContent = `${img.width}×${img.height} • ${megapixels}MP${wasAiEnhanced ? ' • AI Enhanced' : ''}`;
                }
                
                // Enable download button
                const downloadBtn = document.getElementById('download-result');
                if (downloadBtn) {
                    downloadBtn.disabled = false;
                }
                
                console.log('✅ Image displayed in enhanced element successfully');
            } else {
                console.warn('⚠️ Enhanced image elements not found');
            }
        };
        
        console.log('✅ Enhanced Image Display Fix applied to ProEngineInterface');
        fixRetryCount = 0; // Reset counter on success
    } else {
        fixRetryCount++;
        if (fixRetryCount <= maxFixRetries) {
            console.warn(`⚠️ ProEngineInterface not found, retrying in 1 second... (${fixRetryCount}/${maxFixRetries})`);
            setTimeout(fixEnhancedImageDisplay, 1000);
        } else {
            console.error('❌ ProEngineInterface not found after maximum retries. Enhanced image display fix disabled.');
        }
    }
};

// Apply the fix when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixEnhancedImageDisplay);
} else {
    // DOM already loaded
    setTimeout(fixEnhancedImageDisplay, 100);
}

// Export for global access
window.enhancedImageDisplayFix = {
    fixEnhancedImageDisplay
};

console.log('✅ Enhanced Image Display Fix loaded and ready'); 
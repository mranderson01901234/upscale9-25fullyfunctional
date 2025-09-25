/**
 * AI Enhancement Status Fix
 * Ensures AI enhancement status is properly maintained throughout the display pipeline
 * Updated to preserve detailed dimension information
 */

console.log('🔧 Loading AI Enhancement Status Fix...');

// Track AI enhancement status globally
let globalAIEnhancementStatus = false;
let lastProcessingWasAIEnhanced = false;

// Fix the AI enhancement status passing issue
const fixAIEnhancementStatus = () => {
    console.log('🎭 Applying AI Enhancement Status Fix...');
    
    // Check if ImagePresentationManager exists
    if (typeof ImagePresentationManager !== 'undefined' && ImagePresentationManager.prototype) {
        const originalDisplayEnhancedResult = ImagePresentationManager.prototype.displayEnhancedResult;
        
        // Override displayEnhancedResult to maintain AI enhancement status
        ImagePresentationManager.prototype.displayEnhancedResult = function(result, aiEnhanced = false) {
            console.log(`🎭 displayEnhancedResult called with aiEnhanced: ${aiEnhanced}`);
            
            // Update global status
            globalAIEnhancementStatus = aiEnhanced;
            lastProcessingWasAIEnhanced = aiEnhanced;
            
            // Store AI enhancement status in the result object
            if (result) {
                result.isAIEnhanced = aiEnhanced;
                result.enhancementType = aiEnhanced ? 'face-enhancement' : 'standard';
            }
            
            // Call original method
            const result_return = originalDisplayEnhancedResult.call(this, result, aiEnhanced);
            
            // Ensure panel title is set correctly
            setTimeout(() => {
                const panelTitle = document.querySelector('.enhanced-panel .panel-title');
                if (panelTitle) {
                    if (aiEnhanced) {
                        panelTitle.textContent = 'AI Enhanced Result';
                        console.log('✅ Panel title set to: AI Enhanced Result');
                    } else {
                        panelTitle.textContent = 'Upscaled Result';
                        console.log('✅ Panel title set to: Upscaled Result');
                    }
                }
                
                // Preserve detailed dimension information and add AI enhancement status
                const enhancedInfo = document.getElementById('enhanced-info');
                if (enhancedInfo) {
                    const currentText = enhancedInfo.textContent;
                    
                    // If the text already contains detailed dimension info (Full: ... Display: ...), preserve it
                    if (currentText.includes('Full:') && currentText.includes('Display:')) {
                        // Add AI Enhanced status if not already present
                        if (aiEnhanced && !currentText.includes('AI Enhanced')) {
                            enhancedInfo.textContent = currentText + ' • AI Enhanced';
                            console.log('✅ Preserved detailed dimensions and added AI Enhanced status');
                        } else if (!aiEnhanced && currentText.includes('AI Enhanced')) {
                            enhancedInfo.textContent = currentText.replace(' • AI Enhanced', '');
                            console.log('✅ Preserved detailed dimensions and removed AI Enhanced status');
                        }
                    } else {
                        // Fallback to simple dimension display if detailed info not available
                        const enhancedImage = document.getElementById('enhanced-image');
                        if (enhancedImage && enhancedImage.naturalWidth) {
                            const megapixels = ((enhancedImage.naturalWidth * enhancedImage.naturalHeight) / 1000000).toFixed(1);
                            const statusText = aiEnhanced ? ' • AI Enhanced' : '';
                            enhancedInfo.textContent = `${enhancedImage.naturalWidth}×${enhancedImage.naturalHeight} • ${megapixels}MP${statusText}`;
                            console.log('✅ Fallback: Enhanced info set with AI status');
                        }
                    }
                }
            }, 200);
            
            return result_return;
        };
        
        console.log('✅ AI Enhancement Status Fix applied to ImagePresentationManager');
    }
    
    // Check if ProEngineInterface exists
    if (typeof ProEngineInterface !== 'undefined' && ProEngineInterface.prototype) {
        const originalProcessWithAIEnhancement = ProEngineInterface.prototype.processWithAIEnhancement;
        
        // Override processWithAIEnhancement to maintain AI enhancement status
        ProEngineInterface.prototype.processWithAIEnhancement = function(imageData, scaleFactor, aiPreferences = {}) {
            console.log(`🤖 ProEngineInterface.processWithAIEnhancement called with scaleFactor: ${scaleFactor}`);
            
            // Update global status
            globalAIEnhancementStatus = true;
            lastProcessingWasAIEnhanced = true;
            
            // Call original method
            const result = originalProcessWithAIEnhancement.call(this, imageData, scaleFactor, aiPreferences);
            
            // Ensure AI enhancement status is maintained
            setTimeout(() => {
                const panelTitle = document.querySelector('.enhanced-panel .panel-title');
                if (panelTitle) {
                    panelTitle.textContent = 'AI Enhanced Result';
                    console.log('✅ ProEngine: Panel title set to: AI Enhanced Result');
                }
                
                // Preserve detailed dimension information and add AI enhancement status
                const enhancedInfo = document.getElementById('enhanced-info');
                if (enhancedInfo) {
                    const currentText = enhancedInfo.textContent;
                    
                    // If the text already contains detailed dimension info (Full: ... Display: ...), preserve it
                    if (currentText.includes('Full:') && currentText.includes('Display:')) {
                        // Add AI Enhanced status if not already present
                        if (!currentText.includes('AI Enhanced')) {
                            enhancedInfo.textContent = currentText + ' • AI Enhanced';
                            console.log('✅ ProEngine: Preserved detailed dimensions and added AI Enhanced status');
                        }
                    } else {
                        // Fallback to simple dimension display if detailed info not available
                        const enhancedImage = document.getElementById('enhanced-image');
                        if (enhancedImage && enhancedImage.naturalWidth) {
                            const megapixels = ((enhancedImage.naturalWidth * enhancedImage.naturalHeight) / 1000000).toFixed(1);
                            enhancedInfo.textContent = `${enhancedImage.naturalWidth}×${enhancedImage.naturalHeight} • ${megapixels}MP • AI Enhanced`;
                            console.log('✅ ProEngine: Fallback enhanced info set to: AI Enhanced');
                        }
                    }
                }
            }, 200);
            
            return result;
        };
        
        console.log('✅ AI Enhancement Status Fix applied to ProEngineInterface');
    }
    
    // Add global function to check AI enhancement status
    window.getAIEnhancementStatus = () => {
        return {
            global: globalAIEnhancementStatus,
            lastProcessing: lastProcessingWasAIEnhanced,
            panelTitle: document.querySelector('.enhanced-panel .panel-title')?.textContent,
            enhancedInfo: document.getElementById('enhanced-info')?.textContent
        };
    };
    
    // Add function to force AI enhancement status
    window.forceAIEnhancementStatus = (aiEnhanced) => {
        console.log(`🎭 Forcing AI enhancement status to: ${aiEnhanced}`);
        globalAIEnhancementStatus = aiEnhanced;
        lastProcessingWasAIEnhanced = aiEnhanced;
        
        const panelTitle = document.querySelector('.enhanced-panel .panel-title');
        if (panelTitle) {
            panelTitle.textContent = aiEnhanced ? 'AI Enhanced Result' : 'Upscaled Result';
        }
        
        const enhancedInfo = document.getElementById('enhanced-info');
        if (enhancedInfo) {
            const currentText = enhancedInfo.textContent;
            
            // Preserve detailed dimension information
            if (currentText.includes('Full:') && currentText.includes('Display:')) {
                if (aiEnhanced && !currentText.includes('AI Enhanced')) {
                    enhancedInfo.textContent = currentText + ' • AI Enhanced';
                } else if (!aiEnhanced && currentText.includes('AI Enhanced')) {
                    enhancedInfo.textContent = currentText.replace(' • AI Enhanced', '');
                }
            } else {
                // Fallback for simple dimension display
                if (aiEnhanced && !currentText.includes('AI Enhanced')) {
                    enhancedInfo.textContent = currentText + ' • AI Enhanced';
                } else if (!aiEnhanced && currentText.includes('AI Enhanced')) {
                    enhancedInfo.textContent = currentText.replace(' • AI Enhanced', '');
                }
            }
        }
    };
};

// Apply the fix when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixAIEnhancementStatus);
} else {
    setTimeout(fixAIEnhancementStatus, 100);
}

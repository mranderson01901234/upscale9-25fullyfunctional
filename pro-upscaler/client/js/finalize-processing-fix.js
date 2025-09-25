/**
 * Finalize Processing Fix
 * Fixes the finalizeProcessing method to use correct AI enhancement status
 */

console.log('🔧 Loading Finalize Processing Fix...');

// Fix the finalizeProcessing method to use correct AI enhancement status
const fixFinalizeProcessing = () => {
    console.log('🎭 Applying Finalize Processing Fix...');
    
    // Check if ImagePresentationManager exists
    if (typeof ImagePresentationManager !== 'undefined' && ImagePresentationManager.prototype) {
        const originalFinalizeProcessing = ImagePresentationManager.prototype.finalizeProcessing;
        
        // Override finalizeProcessing to use correct AI enhancement status
        ImagePresentationManager.prototype.finalizeProcessing = async function(result, settings) {
            console.log('🎭 finalizeProcessing called - checking AI enhancement status');
            
            // Determine AI enhancement status from result or settings
            let aiEnhanced = false;
            
            // Check if result has AI enhancement flag
            if (result && result.isAIEnhanced) {
                aiEnhanced = result.isAIEnhanced;
                console.log('✅ AI enhancement status from result.isAIEnhanced:', aiEnhanced);
            }
            // Check if result has enhancement type
            else if (result && result.enhancementType === 'face-enhancement') {
                aiEnhanced = true;
                console.log('✅ AI enhancement status from result.enhancementType: face-enhancement');
            }
            // Check if settings indicate AI enhancement
            else if (settings && settings.enhancementType === 'face-enhancement') {
                aiEnhanced = true;
                console.log('✅ AI enhancement status from settings.enhancementType: face-enhancement');
            }
            // Check global status
            else if (window.aiEnhancementStatusFix && window.aiEnhancementStatusFix.getStatus) {
                const status = window.aiEnhancementStatusFix.getStatus();
                aiEnhanced = status.global || status.lastProcessing;
                console.log('✅ AI enhancement status from global status:', aiEnhanced);
            }
            // Check if this is a ProEngine result (likely AI enhanced)
            else if (result && result.isProEngineResult) {
                aiEnhanced = true; // Assume ProEngine results are AI enhanced
                console.log('✅ AI enhancement status assumed from isProEngineResult: true');
            }
            
            console.log(`🎭 finalizeProcessing using aiEnhanced: ${aiEnhanced}`);
            
            await this.delay(300);
            
            // Display enhanced result with correct AI enhancement status
            this.displayEnhancedResult(result, aiEnhanced);
            
            // Auto-download if result is available (always use full-resolution data)
            if (result && !result.isProEngineResult) {
                try {
                    const fileName = this.generateFileName(settings.outputFormat);
                    const downloadLocation = this.getDownloadLocation();
                    
                    // Use existing FileHandler to download the full-resolution image
                    if (this.fileHandler && typeof this.fileHandler.downloadFile === 'function') {
                        this.fileHandler.downloadFile(result, fileName);
                    } else {
                        // Fallback: create download link for full-resolution image
                        const link = document.createElement('a');
                        link.download = fileName;
                        link.href = result.dataUrl;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                    
                    const megapixels = ((result.width * result.height) / 1000000).toFixed(1);
                    this.showNotification(`Full-resolution image downloaded: ${result.width}×${result.height} (${megapixels}MP)`, 'success');
                } catch (error) {
                    console.error('Download error:', error);
                    this.showNotification('Download failed', 'error');
                }
            }
        };
        
        console.log('✅ Finalize Processing Fix applied to ImagePresentationManager');
    }
};

// Apply the fix when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixFinalizeProcessing);
} else {
    setTimeout(fixFinalizeProcessing, 100);
}

// Export for global access
window.finalizeProcessingFix = {
    fixFinalizeProcessing
};

console.log('✅ Finalize Processing Fix loaded and ready');

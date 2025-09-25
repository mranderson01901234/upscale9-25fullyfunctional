/**
 * ProEngineInterface AI Enhancement Fix Patch
 * 
 * This patch modifies the ProEngineInterface to use the enhanced AI monitoring
 * and display system that properly handles result presentation.
 */

// Wait for the AI enhancement display fix to be loaded
const waitForAIFix = () => {
    return new Promise((resolve) => {
        if (window.aiEnhancementDisplayFix) {
            resolve(window.aiEnhancementDisplayFix);
        } else {
            setTimeout(() => waitForAIFix().then(resolve), 100);
        }
    });
};

// Patch the ProEngineInterface class
const patchProEngineInterface = async () => {
    console.log('🔧 Patching ProEngineInterface for AI enhancement fixes');
    
    if (!window.ProEngineInterface) {
        console.warn('⚠️ ProEngineInterface not found, waiting...');
        setTimeout(patchProEngineInterface, 1000);
        return;
    }
    
    const aiDisplayFix = await waitForAIFix();
    
    // Store original methods
    const originalMonitorDesktopProcessing = window.ProEngineInterface.prototype.monitorDesktopProcessing;
    const originalProcessWithDesktopService = window.ProEngineInterface.prototype.processWithDesktopService;
    
    // Enhanced monitorDesktopProcessing method
    window.ProEngineInterface.prototype.monitorDesktopProcessing = function(sessionId) {
        console.log('🎯 Using enhanced AI monitoring for session:', sessionId);
        
        // Check if this is an AI enhancement session
        const isAISession = sessionId.includes('_ai') || sessionId.includes('ai');
        
        if (isAISession) {
            console.log('🤖 AI session detected, using enhanced monitoring');
            return aiDisplayFix.monitorAIEnhancementWithDisplay(sessionId, (progress, message) => {
                // Update UI progress if callback available
                if (window.app?.presentationManager?.updateEnhancementProgress) {
                    window.app.presentationManager.updateEnhancementProgress(progress, message, 'ai-processing');
                }
            });
        } else {
            console.log('🔧 Regular processing session, using standard monitoring');
            return originalMonitorDesktopProcessing.call(this, sessionId);
        }
    };
    
    // Enhanced processWithDesktopService method
    window.ProEngineInterface.prototype.processWithDesktopService = function(result, sessionId, aiEnhancement = false) {
        console.log(`🔧 Enhanced processWithDesktopService: AI=${aiEnhancement}, Session=${sessionId}`);
        
        if (aiEnhancement) {
            console.log('🤖 AI enhancement requested, ensuring proper session ID');
            
            // Ensure AI session ID format
            if (!sessionId.includes('_ai')) {
                sessionId = sessionId + '_ai';
            }
            
            // Update result object with AI session ID
            const enhancedResult = { ...result, sessionId: sessionId };
            
            return originalProcessWithDesktopService.call(this, enhancedResult, sessionId, aiEnhancement);
        } else {
            return originalProcessWithDesktopService.call(this, result, sessionId, aiEnhancement);
        }
    };
    
    // Enhanced displayEnhancedInCanvas method (if it exists)
    if (window.ProEngineInterface.prototype.displayEnhancedInCanvas) {
        const originalDisplayEnhancedInCanvas = window.ProEngineInterface.prototype.displayEnhancedInCanvas;
        
        window.ProEngineInterface.prototype.displayEnhancedInCanvas = async function(sessionId, wasAiEnhanced = false) {
            console.log(`🎨 Enhanced displayEnhancedInCanvas: Session=${sessionId}, AI=${wasAiEnhanced}`);
            
            if (wasAiEnhanced) {
                console.log('🤖 AI enhanced result, using enhanced display system');
                
                try {
                    // Use the enhanced display system
                    const result = await aiDisplayFix.handleAIEnhancementCompletion(sessionId, {
                        status: 'complete',
                        aiEnhanced: true
                    });
                    
                    console.log('✅ Enhanced AI display completed');
                    return result;
                    
                } catch (error) {
                    console.error('❌ Enhanced AI display failed, falling back to original:', error);
                    return originalDisplayEnhancedInCanvas.call(this, sessionId, wasAiEnhanced);
                }
            } else {
                return originalDisplayEnhancedInCanvas.call(this, sessionId, wasAiEnhanced);
            }
        };
    }
    
    console.log('✅ ProEngineInterface patched for AI enhancement fixes');
};

// Patch the global downloadLargeFile function if it exists
const patchGlobalDownloadLargeFile = async () => {
    if (window.downloadLargeFile && typeof window.downloadLargeFile === 'function') {
        console.log('🔧 Patching global downloadLargeFile function');
        
        const originalDownloadLargeFile = window.downloadLargeFile;
        
        window.downloadLargeFile = async function(result, sessionId, aiEnhancement = false) {
            console.log(`🎯 Enhanced downloadLargeFile: AI=${aiEnhancement}, Session=${sessionId}`);
            
            if (aiEnhancement) {
                console.log('🤖 AI enhancement requested via global function');
                
                // Ensure we have a ProEngineInterface instance
                if (window.proEngineInterface || (window.app && window.app.proEngineInterface)) {
                    const proEngine = window.proEngineInterface || window.app.proEngineInterface;
                    return proEngine.processWithDesktopService(result, sessionId, aiEnhancement);
                }
            }
            
            return originalDownloadLargeFile.call(this, result, sessionId, aiEnhancement);
        };
        
        console.log('✅ Global downloadLargeFile patched');
    }
};

// Initialize patches
const initializePatches = async () => {
    try {
        await patchProEngineInterface();
        await patchGlobalDownloadLargeFile();
        
        console.log('🎉 All AI enhancement patches applied successfully');
        
        // Test the patches
        if (window.ProEngineInterface) {
            console.log('✅ ProEngineInterface patching verified');
        }
        
    } catch (error) {
        console.error('❌ Error applying AI enhancement patches:', error);
    }
};

// Wait for DOM and dependencies, then initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePatches);
} else {
    // DOM already loaded
    setTimeout(initializePatches, 100);
}

console.log('🔧 ProEngineInterface AI Enhancement Fix Patch loaded'); 
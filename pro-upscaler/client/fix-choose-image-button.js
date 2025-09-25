/**
 * Choose Image Button Fix
 * Ensures the Choose Image button works even if the main event listeners fail
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Choose Image Button Fix loaded');
    
    // Wait a moment for other scripts to initialize
    setTimeout(() => {
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('upload-area');
        const uploadButton = document.querySelector('.upload-button');
        
        console.log('🔧 Choose Image elements check:');
        console.log('  - fileInput:', !!fileInput);
        console.log('  - uploadArea:', !!uploadArea);
        console.log('  - uploadButton:', !!uploadButton);
        
        if (fileInput && uploadButton) {
            // Remove any existing listeners by cloning the button
            const newUploadButton = uploadButton.cloneNode(true);
            uploadButton.parentNode.replaceChild(newUploadButton, uploadButton);
            
            // Add reliable click handler
            newUploadButton.addEventListener('click', function(e) {
                console.log('🔧 Choose Image button clicked (backup handler)');
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    fileInput.click();
                    console.log('✅ File input triggered successfully');
                } catch (error) {
                    console.error('❌ Failed to trigger file input:', error);
                }
            });
            
            // Also handle upload area clicks
            if (uploadArea) {
                uploadArea.addEventListener('click', function(e) {
                    // Only trigger if not clicking the button itself
                    if (e.target !== newUploadButton && !newUploadButton.contains(e.target)) {
                        console.log('🔧 Upload area clicked (backup handler)');
                        try {
                            fileInput.click();
                            console.log('✅ File input triggered from area');
                        } catch (error) {
                            console.error('❌ Failed to trigger file input from area:', error);
                        }
                    }
                });
            }
            
            // Add file change handler
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    console.log('✅ File selected:', file.name, file.size, 'bytes');
                    
                    // Try to trigger the main app's file handler
                    if (window.app && window.app.presentationManager && typeof window.app.presentationManager.handleFile === 'function') {
                        console.log('🔧 Using main app file handler');
                        window.app.presentationManager.handleFile(file);
                    } else {
                        console.warn('⚠️ Main app file handler not available');
                        // Could add a basic file display here if needed
                    }
                } else {
                    console.log('❌ No file selected');
                }
            });
            
            console.log('✅ Choose Image button backup handlers attached');
        } else {
            console.error('❌ Required elements for Choose Image button not found');
        }
    }, 1000);
}); 
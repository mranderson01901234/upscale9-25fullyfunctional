/**
 * MAIN.JS ERROR BYPASS
 * Catches any errors from main.js and provides fallback functionality
 */

console.log('🛡️ Main.js Error Bypass loaded');

// Global error handler for main.js
window.addEventListener('error', function(e) {
    if (e.filename && (e.filename.includes('main.js') || e.message.includes('main.js'))) {
        console.log('🛡️ Caught main.js error, preventing crash:', e.message);
        e.preventDefault();
        
        // Initialize fallback app functionality
        setTimeout(() => {
            initializeFallbackApp();
        }, 100);
        
        return true;
    }
});

// Module loading error handler
window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && e.reason.message && e.reason.message.includes('main.js')) {
        console.log('🛡️ Caught main.js module error:', e.reason.message);
        e.preventDefault();
        
        // Initialize fallback app functionality
        setTimeout(() => {
            initializeFallbackApp();
        }, 100);
    }
});

function initializeFallbackApp() {
    if (window.fallbackAppInitialized) return;
    window.fallbackAppInitialized = true;
    
    console.log('🛡️ Initializing fallback app functionality...');
    
    // Create minimal app object for compatibility
    if (!window.app) {
        window.app = {
            presentationManager: null,
            updateAuthenticationUI: function(isSignedIn, user) {
                console.log('🛡️ Fallback: updateAuthenticationUI called');
                // This will be handled by the comprehensive fix
            },
            showNotification: function(message, type) {
                console.log(`🛡️ Fallback notification: ${message} (${type})`);
                // This will be handled by the comprehensive fix
            },
            showAuthModal: function(mode = 'signin') {
                console.log('🛡️ Fallback: showAuthModal called with mode:', mode);
                // Use the authService directly if available
                if (window.authService) {
                    if (mode === 'signin') {
                        if (typeof window.authService.showSignInModal === 'function') {
                            window.authService.showSignInModal();
                        } else {
                            console.warn('🛡️ authService.showSignInModal not available');
                        }
                    } else if (mode === 'signup') {
                        if (typeof window.authService.showSignUpModal === 'function') {
                            window.authService.showSignUpModal();
                        } else {
                            console.warn('🛡️ authService.showSignUpModal not available');
                        }
                    }
                } else {
                    console.warn('🛡️ No authService available for showAuthModal');
                }
            },
            getCurrentSettings: function() {
                console.log('🛡️ Fallback: getCurrentSettings called');
                return {
                    scaleFactor: 2,
                    outputFormat: 'jpeg',
                    aiEnhancement: true,
                    enhancementType: 'super-resolution',
                    faceEnhancement: false,
                    artifactRemoval: false,
                    quality: 95
                };
            }
        };
    }
    
    // Initialize presentation manager fallback
    if (!window.app.presentationManager) {
        window.app.presentationManager = {
            handleFile: function(file) {
                console.log('🛡️ Fallback: handleFile called for', file.name);
                // Prevent infinite loop by directly handling the file instead of calling integration function
                handleFileDirectly(file);
            },
            showNotification: function(message, type) {
                console.log(`🛡️ Fallback notification: ${message} (${type})`);
                // This will be handled by the comprehensive fix
            }
        };
    }
    
    console.log('✅ Fallback app functionality initialized');
    
    // Setup direct button event listeners as backup
    setupDirectButtonHandlers();
}

function setupDirectButtonHandlers() {
    console.log('🛡️ Setting up direct button handlers...');
    
    // Wait for DOM to be ready
    const setupButtons = () => {
        const signinBtn = document.getElementById('signin-button');
        const signupBtn = document.getElementById('signup-button');
        
        if (signinBtn && !signinBtn.hasAttribute('data-fallback-handler')) {
            signinBtn.setAttribute('data-fallback-handler', 'true');
            signinBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🛡️ Direct signin button clicked');
                handleDirectSignIn();
            });
            console.log('✅ Signin button handler attached');
        }
        
        if (signupBtn && !signupBtn.hasAttribute('data-fallback-handler')) {
            signupBtn.setAttribute('data-fallback-handler', 'true');
            signupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🛡️ Direct signup button clicked');
                handleDirectSignUp();
            });
            console.log('✅ Signup button handler attached');
        }
    };
    
    // Try immediately and also after DOM is ready
    setupButtons();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupButtons);
    }
}

function handleDirectSignIn() {
    console.log('🛡️ Direct sign in handler called');
    
    // Try window.app.showAuthModal first
    if (window.app && typeof window.app.showAuthModal === 'function') {
        console.log('🛡️ Using window.app.showAuthModal for signin');
        window.app.showAuthModal('signin');
        return;
    }
    
    // Try authService methods
    if (window.authService && typeof window.authService.showSignInModal === 'function') {
        console.log('🛡️ Using authService.showSignInModal');
        window.authService.showSignInModal();
        return;
    }
    
    // Direct DOM manipulation fallback
    console.log('🛡️ Using direct DOM manipulation for signin');
    const authModal = document.getElementById('auth-modal');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const modalTitle = document.getElementById('auth-modal-title');
    
    if (authModal && signinForm) {
        authModal.classList.remove('hidden');
        signinForm.classList.remove('hidden');
        if (signupForm) signupForm.classList.add('hidden');
        if (modalTitle) modalTitle.textContent = 'Sign In';
        
        // Focus on email input
        const emailInput = document.getElementById('signin-email');
        if (emailInput) setTimeout(() => emailInput.focus(), 100);
    } else {
        console.error('🛡️ Auth modal elements not found');
        alert('Authentication system not available. Please refresh the page.');
    }
}

function handleDirectSignUp() {
    console.log('🛡️ Direct sign up handler called');
    
    // Try window.app.showAuthModal first
    if (window.app && typeof window.app.showAuthModal === 'function') {
        console.log('🛡️ Using window.app.showAuthModal for signup');
        window.app.showAuthModal('signup');
        return;
    }
    
    // Try authService methods
    if (window.authService && typeof window.authService.showSignUpModal === 'function') {
        console.log('🛡️ Using authService.showSignUpModal');
        window.authService.showSignUpModal();
        return;
    }
    
    // Direct DOM manipulation fallback
    console.log('🛡️ Using direct DOM manipulation for signup');
    const authModal = document.getElementById('auth-modal');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const modalTitle = document.getElementById('auth-modal-title');
    
    if (authModal && signupForm) {
        authModal.classList.remove('hidden');
        if (signinForm) signinForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        if (modalTitle) modalTitle.textContent = 'Create Account';
        
        // Focus on email input
        const emailInput = document.getElementById('signup-email');
        if (emailInput) setTimeout(() => emailInput.focus(), 100);
    } else {
        console.error('🛡️ Auth modal elements not found');
        alert('Authentication system not available. Please refresh the page.');
    }
}

function handleFileDirectly(file) {
    console.log('🛡️ Direct file handler for', file.name);
    
    // Validate file
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
        console.log('🛡️ Invalid file type:', file.type);
        return;
    }
    
    if (file.size > 1.5 * 1024 * 1024 * 1024) {
        console.log('🛡️ File too large:', file.size);
        return;
    }
    
    // Try to call comprehensive fix handler if available, but avoid circular calls
    if (window.handleFileUploadWithIntegration && !window.handlingFileDirectly) {
        window.handlingFileDirectly = true;
        try {
            // Create a simplified file display
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    // Store image data globally
                    window.currentImageData = {
                        file: file,
                        dataUrl: e.target.result,
                        width: img.width,
                        height: img.height,
                        size: file.size
                    };
                    
                    // Try to display in UI if elements exist
                    const uploadArea = document.getElementById('upload-area');
                    const originalPreview = document.getElementById('original-preview');
                    
                    if (uploadArea && originalPreview) {
                        uploadArea.style.display = 'none';
                        originalPreview.innerHTML = '';
                        originalPreview.appendChild(img);
                        originalPreview.style.display = 'block';
                        
                        // Add basic styling
                        img.style.maxWidth = '100%';
                        img.style.height = 'auto';
                        img.style.borderRadius = '8px';
                    }
                    
                    console.log('✅ File handled directly:', file.name);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } finally {
            window.handlingFileDirectly = false;
        }
    } else {
        console.log('🛡️ No comprehensive fix available, basic file logging only');
    }
}

console.log('🛡️ Main.js Error Bypass ready');

// Proactively initialize fallback app after a short delay to ensure it's available
// This helps prevent infinite loops in premium-header.js
setTimeout(() => {
    if (!window.app) {
        console.log('🛡️ No window.app detected, proactively initializing fallback...');
        initializeFallbackApp();
    } else {
        // Even if window.app exists, make sure button handlers are set up
        setupDirectButtonHandlers();
    }
}, 10);

// Also set up button handlers when DOM is fully loaded as a backup
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🛡️ DOM loaded - ensuring button handlers are set up');
        setupDirectButtonHandlers();
    }, 100);
}); 
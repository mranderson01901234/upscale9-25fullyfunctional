/**
 * Signin Button Fix
 * Ensures signin/signup buttons work properly regardless of main.js status
 */

console.log('🔐 Signin Button Fix loading...');

class SigninButtonFix {
    constructor() {
        this.initialized = false;
        this.retryCount = 0;
        this.maxRetries = 20; // 10 seconds max
        
        this.initializeButtons();
    }
    
    initializeButtons() {
        // Wait for auth service and DOM to be ready
        if (!window.authService || !document.getElementById('signin-button')) {
            this.retryCount++;
            if (this.retryCount < this.maxRetries) {
                console.log(`🔄 Waiting for auth service and DOM... (${this.retryCount}/${this.maxRetries})`);
                setTimeout(() => this.initializeButtons(), 500);
                return;
            } else {
                console.error('❌ Could not initialize signin buttons - auth service or DOM not ready');
                return;
            }
        }
        
        if (this.initialized) return;
        
        console.log('🔐 Initializing signin button handlers...');
        
        // Get button elements
        const signinBtn = document.getElementById('signin-button');
        const signupBtn = document.getElementById('signup-button');
        const signoutBtn = document.getElementById('signout-button');
        
        // Clear any existing event listeners by cloning and replacing
        if (signinBtn) {
            const newSigninBtn = signinBtn.cloneNode(true);
            signinBtn.parentNode.replaceChild(newSigninBtn, signinBtn);
            
            newSigninBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔐 Signin button clicked');
                this.handleSignIn();
            });
            console.log('✅ Signin button handler attached');
        }
        
        if (signupBtn) {
            const newSignupBtn = signupBtn.cloneNode(true);
            signupBtn.parentNode.replaceChild(newSignupBtn, signupBtn);
            
            newSignupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔐 Signup button clicked');
                this.handleSignUp();
            });
            console.log('✅ Signup button handler attached');
        }
        
        if (signoutBtn) {
            const newSignoutBtn = signoutBtn.cloneNode(true);
            signoutBtn.parentNode.replaceChild(newSignoutBtn, signoutBtn);
            
            newSignoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔐 Signout button clicked');
                this.handleSignOut();
            });
            console.log('✅ Signout button handler attached');
        }
        
        this.initialized = true;
        console.log('✅ Signin button fix initialized successfully');
    }
    
    handleSignIn() {
        if (window.authService && typeof window.authService.showSignInModal === 'function') {
            console.log('🔐 Opening signin modal...');
            window.authService.showSignInModal();
        } else {
            console.error('❌ Auth service showSignInModal not available');
            alert('Authentication service not available. Please refresh the page.');
        }
    }
    
    handleSignUp() {
        if (window.authService && typeof window.authService.showSignUpModal === 'function') {
            console.log('🔐 Opening signup modal...');
            window.authService.showSignUpModal();
        } else {
            console.error('❌ Auth service showSignUpModal not available');
            alert('Authentication service not available. Please refresh the page.');
        }
    }
    
    handleSignOut() {
        if (window.authService && typeof window.authService.signOut === 'function') {
            console.log('🔐 Signing out...');
            window.authService.signOut();
        } else {
            console.error('❌ Auth service signOut not available');
            alert('Authentication service not available. Please refresh the page.');
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            console.log('🚀 Initializing Signin Button Fix...');
            window.signinButtonFix = new SigninButtonFix();
        }, 1000); // Give other scripts time to load
    });
} else {
    setTimeout(() => {
        console.log('🚀 Initializing Signin Button Fix...');
        window.signinButtonFix = new SigninButtonFix();
    }, 1000);
}

console.log('✅ Signin Button Fix loaded'); 
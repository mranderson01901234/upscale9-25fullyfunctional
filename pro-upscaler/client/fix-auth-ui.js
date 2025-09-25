/**
 * Authentication UI Fix
 * This script ensures that the authentication UI updates properly after sign-in
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Authentication UI Fix loaded');
    
    // DISABLED: Backup auth state listener (causes conflicts with main auth service)
    // The main supabase-auth-service.js already handles auth state changes properly
    // This backup listener was causing immediate sign-outs and duplicate notifications
    if (false && window.authService && window.authService.supabase) {
        console.log('🔧 Adding backup auth state listener');
        
        window.authService.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔧 Backup auth listener - Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session?.user) {
                console.log('🔧 Backup listener: User signed in, forcing UI update');
                
                // Force update the UI elements directly
                setTimeout(() => {
                    updateAuthenticationUIDirectly(true, session.user);
                    
                    // Hide auth modal if it's still open
                    const authModal = document.getElementById('auth-modal');
                    if (authModal && !authModal.classList.contains('hidden')) {
                        authModal.classList.add('hidden');
                        console.log('🔧 Forced auth modal to close');
                    }
                    
                    // Show success notification
                    showNotificationDirectly('Successfully signed in!', 'success');
                }, 500);
                
            } else if (event === 'SIGNED_OUT') {
                console.log('🔧 Backup listener: User signed out, forcing UI update');
                setTimeout(() => {
                    updateAuthenticationUIDirectly(false);
                }, 500);
            }
        });
    }
    
    // Direct UI update function
    function updateAuthenticationUIDirectly(isSignedIn, user = null) {
        console.log('🔧 Direct UI update:', isSignedIn, user?.email);
        
        const signedOutState = document.getElementById('signed-out-state');
        const signedInState = document.getElementById('signed-in-state');
        const userEmail = document.getElementById('user-email');
        const dropdownEmail = document.getElementById('dropdown-user-email');
        const avatarText = document.getElementById('avatar-text');
        
        if (isSignedIn && user) {
            // Show signed in state
            if (signedOutState) {
                signedOutState.classList.add('hidden');
                console.log('🔧 Hidden signed out state');
            }
            if (signedInState) {
                signedInState.classList.remove('hidden');
                console.log('🔧 Shown signed in state');
            }
            
            // Update user email
            const email = user.email || 'User';
            if (userEmail) {
                userEmail.textContent = email;
                console.log('🔧 Updated user email:', email);
            }
            if (dropdownEmail) {
                dropdownEmail.textContent = email;
            }
            
            // Update avatar
            if (avatarText) {
                avatarText.textContent = email.charAt(0).toUpperCase();
            }
            
            // Update tier if available
            const userTier = document.getElementById('user-tier');
            const dropdownTier = document.getElementById('dropdown-user-tier');
            if (userTier || dropdownTier) {
                const tier = user.subscription_tier || user.tier || 'free';
                const displayTier = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
                
                if (userTier) {
                    userTier.textContent = displayTier;
                    userTier.className = `tier-badge tier-${tier.toLowerCase()}`;
                }
                if (dropdownTier) {
                    dropdownTier.textContent = `${displayTier} Plan`;
                }
            }
            
        } else {
            // Show signed out state
            if (signedOutState) {
                signedOutState.classList.remove('hidden');
                console.log('🔧 Shown signed out state');
            }
            if (signedInState) {
                signedInState.classList.add('hidden');
                console.log('🔧 Hidden signed in state');
            }
        }
    }
    
    // Direct notification function
    function showNotificationDirectly(message, type = 'info') {
        console.log('🔧 Showing notification:', message);
        
        // Try to use existing notification system first
        if (window.app && typeof window.app.showNotification === 'function') {
            window.app.showNotification(message, type);
            return;
        }
        
        // Fallback: create our own notification
        let container = document.getElementById('main-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'main-notifications';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            pointer-events: auto;
            padding: 12px 16px;
            background: hsl(var(--card));
            border: 1px solid hsl(var(--border));
            border-radius: 6px;
            color: hsl(var(--foreground));
            font-size: 13px;
            font-weight: 500;
            max-width: 360px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        if (type === 'success') {
            notification.style.borderColor = '#22c55e';
            notification.style.background = 'rgba(34, 197, 94, 0.1)';
        }
        
        container.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }
    
    console.log('✅ Authentication UI Fix ready');
}); 
// Service Worker Cleanup
// This script cleans up any old service worker registrations that might be causing 404 errors

(function() {
    'use strict';
    
    console.log('🧹 Service Worker Cleanup: Starting...');
    
    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
        // Get all service worker registrations
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            if (registrations.length > 0) {
                console.log(`🧹 Found ${registrations.length} service worker registration(s) to clean up`);
                
                // Unregister all service workers
                registrations.forEach(function(registration) {
                    console.log('🧹 Unregistering service worker:', registration.scope);
                    registration.unregister().then(function(success) {
                        if (success) {
                            console.log('✅ Service worker unregistered successfully');
                        } else {
                            console.log('⚠️ Service worker unregistration failed');
                        }
                    });
                });
            } else {
                console.log('🧹 No service workers found to clean up');
            }
        }).catch(function(error) {
            console.error('🧹 Error checking service worker registrations:', error);
        });
    } else {
        console.log('🧹 Service workers not supported in this browser');
    }
    
    console.log('🧹 Service Worker Cleanup: Complete');
})(); 
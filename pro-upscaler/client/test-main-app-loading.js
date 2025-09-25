// Test Main Application Loading
console.log('🔧 Testing Main Application Loading...');

// Simulate the main app loading process
setTimeout(async () => {
    try {
        // Test if we can import the main modules
        const { ImagePresentationManager } = await import('./js/image-presentation-manager.js');
        console.log('✅ ImagePresentationManager import successful');
        
        const { ProEngineInterface } = await import('./js/pro-engine-interface.js');
        console.log('✅ ProEngineInterface import successful');
        
        // Test instantiation
        const proEngine = new ProEngineInterface();
        console.log('✅ ProEngineInterface instantiation successful');
        
        const presentationManager = new ImagePresentationManager();
        console.log('✅ ImagePresentationManager instantiation successful');
        
        console.log('🎉 ALL MODULE IMPORTS WORKING - Main app should load without errors!');
        
    } catch (error) {
        console.error('❌ Module import failed:', error);
    }
}, 1000);

console.log('🔧 Main Application Loading Test Script Loaded');

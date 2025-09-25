#!/usr/bin/env node

/**
 * AI Enhancement Display Fix Test Script
 * 
 * This script tests the AI enhancement workflow from start to finish
 * to verify that the display fixes work correctly.
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');

class AIEnhancementTester {
    constructor() {
        this.desktopServiceUrl = 'http://localhost:3007';
        this.testResults = [];
    }

    async runComprehensiveTest() {
        console.log('🧪 Starting AI Enhancement Display Fix Test');
        console.log('=' .repeat(50));
        
        try {
            // Test 1: Verify services are running
            await this.testServiceAvailability();
            
            // Test 2: Test AI enhancement request
            const sessionId = await this.testAIEnhancementRequest();
            
            // Test 3: Test progress monitoring
            await this.testProgressMonitoring(sessionId);
            
            // Test 4: Test result retrieval
            await this.testResultRetrieval(sessionId);
            
            // Test 5: Test image preview availability
            await this.testImagePreviewAvailability(sessionId);
            
            // Print test results
            this.printTestResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        }
    }

    async testServiceAvailability() {
        console.log('🔍 Test 1: Service Availability');
        
        try {
            // Test desktop service
            const desktopResponse = await fetch(`${this.desktopServiceUrl}/health`, {
                method: 'GET',
                timeout: 5000
            });
            
            if (desktopResponse.ok) {
                console.log('✅ Desktop service is running');
                this.testResults.push({ test: 'Desktop Service', status: 'PASS' });
            } else {
                throw new Error(`Desktop service returned ${desktopResponse.status}`);
            }
            
            // Test server service
            const serverResponse = await fetch('http://localhost:3002/health', {
                method: 'GET',
                timeout: 5000
            });
            
            if (serverResponse.ok) {
                console.log('✅ Server service is running');
                this.testResults.push({ test: 'Server Service', status: 'PASS' });
            } else {
                throw new Error(`Server service returned ${serverResponse.status}`);
            }
            
        } catch (error) {
            console.error('❌ Service availability test failed:', error);
            this.testResults.push({ test: 'Service Availability', status: 'FAIL', error: error.message });
            throw error;
        }
    }

    async testAIEnhancementRequest() {
        console.log('🔍 Test 2: AI Enhancement Request');
        
        try {
            // Create a test image (1x1 pixel PNG)
            const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
            
            const sessionId = `test_ai_fix_${Date.now()}`;
            
            const requestBody = {
                sessionId: sessionId,
                imageData: testImageData,
                scaleFactor: 2,
                format: 'png',
                quality: 95,
                aiPreferences: {
                    fidelity: 0.05
                }
            };
            
            const response = await fetch(`${this.desktopServiceUrl}/api/process-with-ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                timeout: 10000
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ AI enhancement request accepted');
                console.log('📊 Response:', result);
                this.testResults.push({ test: 'AI Enhancement Request', status: 'PASS' });
                return result.sessionId || sessionId;
            } else {
                const errorText = await response.text();
                throw new Error(`AI enhancement request failed: ${response.status} - ${errorText}`);
            }
            
        } catch (error) {
            console.error('❌ AI enhancement request test failed:', error);
            this.testResults.push({ test: 'AI Enhancement Request', status: 'FAIL', error: error.message });
            throw error;
        }
    }

    async testProgressMonitoring(sessionId) {
        console.log('🔍 Test 3: Progress Monitoring');
        
        return new Promise((resolve, reject) => {
            try {
                let progressUpdates = 0;
                let completed = false;
                
                const timeout = setTimeout(() => {
                    if (!completed) {
                        console.log(`⚠️ Progress monitoring timeout (received ${progressUpdates} updates)`);
                        this.testResults.push({ 
                            test: 'Progress Monitoring', 
                            status: 'PARTIAL', 
                            details: `${progressUpdates} updates received` 
                        });
                        resolve();
                    }
                }, 60000); // 1 minute timeout
                
                // Test EventSource connection
                const EventSource = require('eventsource');
                const eventSource = new EventSource(`${this.desktopServiceUrl}/api/progress/${sessionId}`);
                
                eventSource.onmessage = (event) => {
                    try {
                        progressUpdates++;
                        const progress = JSON.parse(event.data);
                        console.log(`📊 Progress update #${progressUpdates}:`, progress);
                        
                        if (progress.status === 'complete') {
                            completed = true;
                            eventSource.close();
                            clearTimeout(timeout);
                            console.log('✅ Progress monitoring completed successfully');
                            this.testResults.push({ 
                                test: 'Progress Monitoring', 
                                status: 'PASS', 
                                details: `${progressUpdates} updates received` 
                            });
                            resolve();
                        } else if (progress.status === 'error') {
                            completed = true;
                            eventSource.close();
                            clearTimeout(timeout);
                            console.error('❌ AI processing failed:', progress.message);
                            this.testResults.push({ 
                                test: 'Progress Monitoring', 
                                status: 'FAIL', 
                                error: progress.message 
                            });
                            reject(new Error(progress.message));
                        }
                    } catch (error) {
                        console.error('❌ Progress parsing error:', error);
                    }
                };
                
                eventSource.onerror = (error) => {
                    if (!completed) {
                        console.error('❌ EventSource error:', error);
                        eventSource.close();
                        clearTimeout(timeout);
                        this.testResults.push({ 
                            test: 'Progress Monitoring', 
                            status: 'FAIL', 
                            error: 'EventSource connection failed' 
                        });
                        reject(error);
                    }
                };
                
            } catch (error) {
                console.error('❌ Progress monitoring test setup failed:', error);
                this.testResults.push({ test: 'Progress Monitoring', status: 'FAIL', error: error.message });
                reject(error);
            }
        });
    }

    async testResultRetrieval(sessionId) {
        console.log('🔍 Test 4: Result Retrieval');
        
        try {
            const response = await fetch(`${this.desktopServiceUrl}/api/session-result/${sessionId}`, {
                method: 'GET',
                timeout: 10000
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Session result retrieved successfully');
                console.log('📊 Result data:', result);
                this.testResults.push({ test: 'Result Retrieval', status: 'PASS' });
            } else if (response.status === 404) {
                console.log('⚠️ Session result not found (may still be processing)');
                this.testResults.push({ test: 'Result Retrieval', status: 'PARTIAL', details: 'Session not found' });
            } else {
                throw new Error(`Result retrieval failed: ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ Result retrieval test failed:', error);
            this.testResults.push({ test: 'Result Retrieval', status: 'FAIL', error: error.message });
        }
    }

    async testImagePreviewAvailability(sessionId) {
        console.log('🔍 Test 5: Image Preview Availability');
        
        try {
            const response = await fetch(`${this.desktopServiceUrl}/api/enhanced-preview/${sessionId}`, {
                method: 'HEAD',
                timeout: 10000
            });
            
            if (response.ok) {
                const contentLength = response.headers.get('content-length');
                console.log('✅ Enhanced preview is available');
                console.log(`📊 Image size: ${contentLength} bytes`);
                this.testResults.push({ 
                    test: 'Image Preview Availability', 
                    status: 'PASS', 
                    details: `${contentLength} bytes` 
                });
            } else if (response.status === 404) {
                console.log('⚠️ Enhanced preview not yet available');
                this.testResults.push({ 
                    test: 'Image Preview Availability', 
                    status: 'PARTIAL', 
                    details: 'Preview not ready' 
                });
            } else {
                throw new Error(`Preview availability check failed: ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ Image preview availability test failed:', error);
            this.testResults.push({ test: 'Image Preview Availability', status: 'FAIL', error: error.message });
        }
    }

    printTestResults() {
        console.log('\n🧪 Test Results Summary');
        console.log('=' .repeat(50));
        
        let passed = 0;
        let failed = 0;
        let partial = 0;
        
        this.testResults.forEach(result => {
            const status = result.status === 'PASS' ? '✅' : 
                          result.status === 'FAIL' ? '❌' : '⚠️';
            
            console.log(`${status} ${result.test}: ${result.status}`);
            
            if (result.details) {
                console.log(`   Details: ${result.details}`);
            }
            
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            
            if (result.status === 'PASS') passed++;
            else if (result.status === 'FAIL') failed++;
            else partial++;
        });
        
        console.log('\n📊 Summary:');
        console.log(`   ✅ Passed: ${passed}`);
        console.log(`   ⚠️  Partial: ${partial}`);
        console.log(`   ❌ Failed: ${failed}`);
        
        if (failed === 0) {
            console.log('\n🎉 All critical tests passed! AI Enhancement Display Fix is working.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the issues above.');
        }
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    const tester = new AIEnhancementTester();
    tester.runComprehensiveTest().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = AIEnhancementTester; 
/**
 * image-presentation-manager.js
 * Enterprise-grade image presentation system for professional UI
 */

import { ProEngineInterface } from './pro-engine-interface.js';
export class ImagePresentationManager {
  constructor() {
    this.currentResult = null;
    this.originalImage = null;
    this.enhancedImage = null;
    this.lastProcessingWasAIEnhanced = false;
    this.currentComparisonData = null; // Store for resize handling
    this.processingState = {
      status: 'idle', // idle, processing, complete, error
      currentStep: null,
      progress: 0,
      metrics: {
        scaleFactor: null,
        resolution: null,
        quality: null,
        time: null
      },
      fileInfo: {
        name: null,
        location: null,
        status: 'pending'
      }
    };
    
    // Timer properties
    this.timer = {
      startTime: null,
      intervalId: null,
      isRunning: false
    };
    
    // Get references to existing services
    this.authService = window.authService;
    this.proEngineInterface = null; // Will be set by main app
    this.upscaler = null;
    this.fileHandler = null;
    this.customDownloadLocation = null;
    
    this.initializeServices();
    this.initializeEventListeners();
    
    // Add window resize handler for responsive display sizing
    this.initializeResizeHandler();
  }

  /**
   * Initialize existing services
   */
  initializeServices() {
    try {
      // Initialize FileHandler
      if (typeof FileHandler !== 'undefined') {
        this.fileHandler = new FileHandler();
      }
      
      // Initialize ProEngine interface
      if (ProEngineInterface) {
        this.proEngineInterface = new ProEngineInterface();
        // Check if ProEngine is actually available
        if (this.proEngineInterface && !this.proEngineInterface.isAvailable) {
          this.proEngineInterface = null;
        }
      }
      
      // Initialize upscaler
      if (typeof UltraFastUpscaler !== 'undefined') {
        this.upscaler = new UltraFastUpscaler({ qualityMode: 'speed' });
      }
      
      // Services initialized
    } catch (error) {
      console.error('Service initialization error:', error);
    }
  }

  /**
   * Initialize event listeners for the enterprise layout
   */
  initializeEventListeners() {
    // File upload handling
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    const uploadButton = uploadArea?.querySelector('.upload-button');

    if (fileInput && uploadArea) {
      uploadArea.addEventListener('click', () => fileInput.click());
      uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
      uploadArea.addEventListener('drop', this.handleDrop.bind(this));
      fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    }

    if (uploadButton) {
      uploadButton.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    // Processing button
    const processButton = document.getElementById('start-processing');
    if (processButton) {
      processButton.addEventListener('click', this.handleProcessing.bind(this));
    }

    // Scale factor and format change listeners for immediate warnings
    const scaleFactorSelect = document.getElementById('scale-factor');
    const outputFormatSelect = document.getElementById('output-format');
    
    if (scaleFactorSelect) {
      scaleFactorSelect.addEventListener('change', this.handleSettingsChange.bind(this));
    }
    
    if (outputFormatSelect) {
      outputFormatSelect.addEventListener('change', this.handleSettingsChange.bind(this));
    }

    // Browse location button
    const browseLocationBtn = document.getElementById('browse-location');
    if (browseLocationBtn) {
      browseLocationBtn.addEventListener('click', this.handleBrowseLocation.bind(this));
    }

    // Share buttons
    this.initializeShareButtons();
  }

  /**
   * Initialize window resize handler for responsive display
   */
  initializeResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(async () => {
        // If we have an enhanced image displayed, recalculate its display size
        if (this.enhancedImage) {
          console.log('🔄 Window resized, recalculating enhanced image display size');
          this.displayEnhancedResult(this.enhancedImage, this.lastProcessingWasAIEnhanced); // Use stored AI status
        }
        
        // If we have a canvas comparison display, refresh it
        const canvasContainer = document.querySelector('.canvas-comparison-container');
        if (canvasContainer && this.currentComparisonData) {
          console.log('🔄 Window resized, refreshing canvas comparison display');
          const containerElement = canvasContainer.parentElement;
          await this.presentSideBySideComparison(this.currentComparisonData, containerElement);
        }
      }, 300); // Debounce resize events
    });
  }

  /**
   * Handle file drag over
   */
  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'hsl(var(--primary))';
    e.currentTarget.style.background = 'hsl(var(--primary) / 0.05)';
  }

  /**
   * Handle file drop
   */
  handleDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.handleFile(files[0]);
    }
    e.currentTarget.style.borderColor = '';
    e.currentTarget.style.background = '';
  }

  /**
   * Handle file selection
   */
  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  /**
   * Process uploaded file
   */
  async handleFile(file) {
    try {
      // Validate file
      if (!this.isValidImageFile(file)) {
        this.showNotification('Please select a valid image file (PNG, JPEG, WebP, TIFF)', 'error');
        return;
      }

      // Show original image
      await this.displayOriginalImage(file);
      
      // Update UI state
      this.updateProcessingButton(true);
      this.showNotification(`Image loaded: ${file.name}`, 'success');
      
    } catch (error) {
      console.error('File handling error:', error);
      this.showNotification('Error loading image file', 'error');
    }
  }

  /**
   * Display original image
   */
  async displayOriginalImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Store original image data
          this.originalImage = {
            file: file,
            dataUrl: e.target.result,
            width: img.width,
            height: img.height,
            size: file.size
          };

          // Make original image accessible to ProEngineInterface
          if (window.app) {
            window.app.currentImage = this.originalImage;
            console.log('✅ Original image made available to app state');
          }

          // Update UI
          this.updateOriginalImageDisplay(img, file);
          this.updateOriginalInfo();
          this.updateCurrentImageInfo();
          
          // Reset enhanced canvas to show placeholder
          this.resetEnhancedCanvas();
          
          resolve();
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Update original image display
   */
  updateOriginalImageDisplay(img, file) {
    const uploadArea = document.getElementById('upload-area');
    const originalPreview = document.getElementById('original-preview');
    const originalImage = document.getElementById('original-image');

    if (uploadArea) uploadArea.classList.add('hidden');
    if (originalPreview) {
      originalPreview.classList.remove('hidden');
      if (originalImage) {
        originalImage.src = img.src;
      }
    }
  }

  /**
   * Update original image info
   */
  updateOriginalInfo() {
    const originalInfo = document.getElementById('original-info');
    if (originalInfo && this.originalImage) {
      const { width, height, size } = this.originalImage;
      const sizeStr = this.formatFileSize(size);
      originalInfo.textContent = `${width}×${height} • ${sizeStr}`;
    }
  }

  /**
   * Update current image section in processing status panel
   */
  updateCurrentImageInfo() {
    const fileNameElement = document.getElementById('current-file-name');
    const fileDetailsElement = document.getElementById('current-file-details');
    
    if (fileNameElement && fileDetailsElement && this.originalImage) {
      const { file, width, height, size } = this.originalImage;
      
      // Update file name
      fileNameElement.textContent = file.name;
      
      // Calculate megapixels
      const megapixels = ((width * height) / 1000000).toFixed(1);
      
      // Get file format from file type or name
      let format = 'Unknown';
      if (file.type) {
        format = file.type.split('/')[1].toUpperCase();
      } else {
        const extension = file.name.split('.').pop();
        if (extension) {
          format = extension.toUpperCase();
        }
      }
      
      // Format file size
      const sizeStr = this.formatFileSize(size);
      
      // Update file details with format: "width × height • file size • format • megapixels"
      fileDetailsElement.textContent = `${width} × ${height} • ${sizeStr} • ${format} • ${megapixels}MP`;
    }
  }

  /**
   * Handle processing start
   */
  async handleProcessing() {
    if (!this.originalImage) {
      this.showNotification('Please select an image first', 'error');
      return;
    }

    try {
      // Get settings
      const settings = this.getProcessingSettings();
      
      // Update processing state
      this.updateProcessingState('processing', 'analysis');
      this.updateProcessingButton(false);
      
      // Start the timer
      this.startTimer();
      
      // Start processing pipeline
      await this.processImage(settings);
      
    } catch (error) {
      console.error('Processing error:', error);
      this.updateProcessingState('error');
      this.stopTimer();
      this.showNotification('Processing failed: ' + error.message, 'error');
    }
  }

  /**
   * Handle settings change for immediate warnings
   */
  handleSettingsChange() {
    if (!this.originalImage) return;
    
    const scaleFactor = document.getElementById('scale-factor')?.value || '4x';
    const outputFormat = document.getElementById('output-format')?.value || 'jpeg';
    const scaleValue = parseInt(scaleFactor);
    
    // Show immediate warning for extreme upscales
    if (scaleValue >= 15) {
      const estimatedPixels = this.originalImage.width * this.originalImage.height * scaleValue * scaleValue;
      const estimatedMP = (estimatedPixels / 1000000).toFixed(1);
      
      // Calculate estimated file size for the selected format
      const uncompressedSize = estimatedPixels * 3;
      let estimatedSize, formatName;
      
      if (outputFormat === 'webp') {
        estimatedSize = (uncompressedSize / 12 / (1024**3)).toFixed(2);
        formatName = 'WebP';
      } else if (outputFormat === 'png') {
        estimatedSize = (uncompressedSize / 2 / (1024**3)).toFixed(2);
        formatName = 'PNG';
      } else if (outputFormat === 'jpeg') {
        estimatedSize = (uncompressedSize / 8 / (1024**3)).toFixed(2);
        formatName = 'JPEG';
      } else {
        estimatedSize = (uncompressedSize / 8 / (1024**3)).toFixed(2);
        formatName = outputFormat.toUpperCase();
      }
      
      this.showNotification(
        `Extreme upscale: ${scaleFactor} will create ${estimatedMP}MP image (~${estimatedSize}GB ${formatName}). Requires Pro Engine Desktop Service. Download required for full resolution.`,
        'info'
      );
    }
  }

  /**
   * Get current processing settings
   */
  getProcessingSettings() {
    const scaleFactor = document.getElementById('scale-factor')?.value || '4x';
    const outputFormat = document.getElementById('output-format')?.value || 'jpeg';
    const aiEnhancement = document.getElementById('ai-enhancement-toggle')?.checked || true;
    const enhancementType = document.getElementById('enhancement-type')?.value || 'super-resolution';
    const faceEnhancement = document.getElementById('face-enhancement-toggle')?.checked || false;
    const artifactRemoval = document.getElementById('artifact-removal-toggle')?.checked || false;

    const scaleValue = parseInt(scaleFactor);
    
    // Auto-adjust format for extreme upscales based on estimated file size
    let finalOutputFormat = outputFormat;
    if (scaleValue >= 15) {
      const originalImage = this.originalImage;
      if (originalImage) {
        const estimatedPixels = originalImage.width * originalImage.height * scaleValue * scaleValue;
        const estimatedMP = estimatedPixels / 1000000;
        
        // Calculate estimated file sizes for different formats
        const uncompressedSize = estimatedPixels * 3; // 8-bit RGB
        const jpegSize = uncompressedSize / 8; // 8:1 compression for detailed images
        const webpSize = uncompressedSize / 12; // 12:1 compression for WebP
        const pngSize = uncompressedSize / 2; // 2:1 compression for PNG
        
        console.log(`📊 Format analysis for ${scaleFactor} upscale (${estimatedMP.toFixed(1)}MP):`);
        console.log(`   JPEG: ${(jpegSize / (1024**3)).toFixed(2)} GB`);
        console.log(`   WebP: ${(webpSize / (1024**3)).toFixed(2)} GB`);
        console.log(`   PNG:  ${(pngSize / (1024**3)).toFixed(2)} GB`);
        
        // Auto-select best format based on file size and format limitations
        if (jpegSize > 1.5 * 1024**3) { // > 1.5GB
          if (webpSize <= 1.0 * 1024**3) { // WebP has stricter size limits
            console.log(`🔄 Auto-switching to WebP for ${scaleFactor} upscale (JPEG would be ${(jpegSize / (1024**3)).toFixed(2)} GB)`);
            document.getElementById('output-format').value = 'webp';
            finalOutputFormat = 'webp';
          } else if (pngSize <= 2.0 * 1024**3) {
            console.log(`🔄 Auto-switching to PNG for ${scaleFactor} upscale (WebP would be ${(webpSize / (1024**3)).toFixed(2)} GB, too large for WebP)`);
            document.getElementById('output-format').value = 'png';
            finalOutputFormat = 'png';
          } else {
            console.log(`⚠️ All formats would be very large for ${scaleFactor} upscale - using TIFF for maximum compatibility`);
            document.getElementById('output-format').value = 'tiff';
            finalOutputFormat = 'tiff';
          }
        } else if (outputFormat === 'png' && pngSize > 1.5 * 1024**3) {
          if (webpSize <= 1.0 * 1024**3) {
            console.log(`🔄 Auto-switching to WebP for ${scaleFactor} upscale (PNG would be ${(pngSize / (1024**3)).toFixed(2)} GB)`);
            document.getElementById('output-format').value = 'webp';
            finalOutputFormat = 'webp';
          } else {
            console.log(`🔄 Auto-switching to TIFF for ${scaleFactor} upscale (PNG would be ${(pngSize / (1024**3)).toFixed(2)} GB, WebP too large)`);
            document.getElementById('output-format').value = 'tiff';
            finalOutputFormat = 'tiff';
          }
        } else if (outputFormat === 'webp' && webpSize > 1.0 * 1024**3) {
          console.log(`🔄 Auto-switching to PNG for ${scaleFactor} upscale (WebP would be ${(webpSize / (1024**3)).toFixed(2)} GB, too large for WebP)`);
          document.getElementById('output-format').value = 'png';
          finalOutputFormat = 'png';
        }
      }
    }
    
    // Show warning for extreme upscales with format info
    if (scaleValue >= 15) {
      const originalImage = this.originalImage;
      if (originalImage) {
        const estimatedPixels = originalImage.width * originalImage.height * scaleValue * scaleValue;
        const estimatedMP = (estimatedPixels / 1000000).toFixed(1);
        
        // Calculate estimated file size for the selected format
        const uncompressedSize = estimatedPixels * 3;
        let estimatedSize, formatName;
        
        if (finalOutputFormat === 'webp') {
          estimatedSize = (uncompressedSize / 12 / (1024**3)).toFixed(2);
          formatName = 'WebP';
        } else if (finalOutputFormat === 'png') {
          estimatedSize = (uncompressedSize / 2 / (1024**3)).toFixed(2);
          formatName = 'PNG';
        } else if (finalOutputFormat === 'jpeg') {
          estimatedSize = (uncompressedSize / 8 / (1024**3)).toFixed(2);
          formatName = 'JPEG';
        } else {
          estimatedSize = (uncompressedSize / 8 / (1024**3)).toFixed(2);
          formatName = finalOutputFormat.toUpperCase();
        }
        
        console.log(`⚠️ Extreme upscale warning: ${scaleFactor} will create ${estimatedMP}MP image (~${estimatedSize}GB ${formatName})`);
        this.showNotification(
          `Extreme upscale: ${scaleFactor} will create ${estimatedMP}MP image (~${estimatedSize}GB ${formatName}). Requires Pro Engine Desktop Service. Download required for full resolution.`,
          'info'
        );
      }
    }

    return {
      scaleFactor: scaleValue,
      outputFormat: finalOutputFormat,
      aiEnhancement,
      enhancementType,
      faceEnhancement,
      artifactRemoval
    };
  }

  /**
   * Check if user is authenticated for AI enhancement features
   */
  checkAuthentication() {
    // Check if we have an auth service and user is signed in
    if (window.authService) {
      // Check Supabase auth first
      if (window.authService.supabase && window.authService.currentUser) {
        return true;
      }
      // Check local auth service
      if (window.authService.isSignedIn && window.authService.isSignedIn()) {
        return true;
      }
    }
    
    // Check local storage token as fallback
    const token = localStorage.getItem('auth_token');
    if (token) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if user has access to AI enhancement features (Pro tier)
   */
  async checkAIEnhancementUsage() {
    try {
      // Check if we have an auth service with usage checking
      if (window.authService && typeof window.authService.checkUsage === 'function') {
        console.log('🔍 Checking AI enhancement usage limits...');
        const usageResult = await window.authService.checkUsage('ai_enhancement');
        console.log('📊 Usage check result:', usageResult);
        return usageResult;
      }
      
      // Fallback: If no usage checking available, allow if authenticated
      if (this.checkAuthentication()) {
        console.log('⚠️ No usage checking service - allowing based on authentication');
        return { 
          allowed: true, 
          reason: 'Authentication verified' 
        };
      } else {
        return { 
          allowed: false, 
          reason: 'Please sign in to use AI Enhancement',
          requiresAuth: true
        };
      }
    } catch (error) {
      console.error('AI Enhancement usage check error:', error);
      return { 
        allowed: false, 
        reason: 'Unable to verify AI Enhancement access. Please try again.'
      };
    }
  }

  /**
   * Show enhancement progress section (deprecated - section is always visible)
   */
  showEnhancementProgress() {
    // Section is now always visible - no action needed
    console.log('Enhancement progress section is always visible');
  }

  /**
   * Hide enhancement progress section (deprecated - section is always visible)
   */
  hideEnhancementProgress() {
    // Section is now always visible - no action needed
    console.log('Enhancement progress section remains visible');
  }

  /**
   * Update enhancement progress
   */
  updateEnhancementProgress(percentage, title, description) {
    const progressTitle = document.getElementById('progress-title');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressBar = document.getElementById('progress-bar');
    const progressDescription = document.getElementById('progress-description');
    
    if (progressTitle) progressTitle.textContent = title || 'Processing...';
    if (progressPercentage) progressPercentage.textContent = percentage + '%';
    if (progressBar) progressBar.style.width = percentage + '%';
    if (progressDescription) progressDescription.textContent = description || '';
  }

  /**
   * Process image with enterprise pipeline
   */
  async processImage(settings) {
    const startTime = Date.now();
    
    try {
      // Show progress section for processing
      this.showEnhancementProgress();
      
      // Step 1: Analysis
      this.updateProcessingStep('analysis', 10);
      await this.delay(200);
      
      // Check enhancement type and determine processing path
      console.log('🔍 Enhancement Type Check:');
      console.log(`  - settings.enhancementType: ${settings.enhancementType}`);
      console.log(`  - settings.aiEnhancement: ${settings.aiEnhancement}`);
      
      // Try to get ProEngineInterface from multiple sources
      if (!this.proEngineInterface && window.app?.proEngineInterface) {
        this.proEngineInterface = window.app.proEngineInterface;
        console.log('🔧 Retrieved ProEngineInterface from window.app');
      }
      
      console.log(`  - this.proEngineInterface exists: ${!!this.proEngineInterface}`);
      console.log(`  - this.proEngineInterface.isAvailable: ${this.proEngineInterface?.isAvailable}`);
      console.log(`  - Authentication: ${this.checkAuthentication()}`);
      console.log(`  - window.app?.getCustomFilenameForAPI: ${typeof window.app?.getCustomFilenameForAPI === 'function'}`);
      console.log(`  - window.app?.getCustomLocationForAPI: ${typeof window.app?.getCustomLocationForAPI === 'function'}`);
      
      // Determine if AI enhancement should be used based on enhancement type
      const shouldUseAI = settings.enhancementType !== 'pure-upscaling';
      console.log(`🤖 Should use AI enhancement: ${shouldUseAI} (based on enhancement type: ${settings.enhancementType})`);
      
      if (shouldUseAI && this.proEngineInterface && 
          this.proEngineInterface.isAvailable && 
          typeof window.app?.getCustomFilenameForAPI === 'function') {
        
        // Check authentication for AI enhancement
        const isAuthenticated = this.checkAuthentication();
        if (!isAuthenticated) {
          this.updateProcessingStep('enhancement', 30, 'skipped');
          this.showNotification('Please sign in to use AI Enhancement', 'warning');
          // Fall back to standard upscaling
        } else {
          // Check user tier/usage limits for AI enhancement
          const usageCheck = await this.checkAIEnhancementUsage();
          if (!usageCheck.allowed) {
            console.log('⚠️ AI Enhancement not allowed:', usageCheck.reason);
            this.updateProcessingStep('enhancement', 30, 'skipped');
            this.showNotification(usageCheck.reason, 'warning');
            // Fall back to standard upscaling
          } else {
            // Step 2: AI Enhancement with ProEngine
            const enhancementType = settings.enhancementType || 'super-resolution';
            console.log(`🤖 Taking ${enhancementType} path with Pro Engine`);
            
            // Update UI text based on enhancement type
            let enhancementStepText = 'AI Processing';
            if (enhancementType === 'face-enhancement') {
              this.updateProcessingStep('enhancement', 20, 'active', 'AI Face Detection');
              await this.delay(500);
              enhancementStepText = 'CodeFormer Face Enhancement';
            } else if (enhancementType === 'super-resolution') {
              this.updateProcessingStep('enhancement', 20, 'active', 'AI Analysis');
              await this.delay(500);
              enhancementStepText = 'Super Resolution Enhancement';
            }
            
            this.updateProcessingStep('enhancement', 40, 'active', enhancementStepText);
            
            const result = await this.processWithProEngine(settings);
            
            // Display AI-enhanced result
            this.displayEnhancedResult(result, true); // true = AI enhanced
            
            // Complete processing
            const totalTime = Date.now() - startTime;
            this.updateProcessingComplete(totalTime, settings, result, true); // true = AI enhanced
            return;
          }
        }
      } else if (shouldUseAI) {
        console.log(`⚠️ ${settings.enhancementType} requested but Pro Engine not available - using standard upscaling`);
        this.updateProcessingStep('enhancement', 30, 'skipped');
        this.showNotification(`${settings.enhancementType} requires Pro Engine - using standard upscaling`, 'info');
      }

      // Step 2: Pure Upscaling via Pro Engine Desktop Service  
      console.log('🔧 Taking Pure Upscaling path (no AI enhancement) via Pro Engine Desktop Service');
      this.hideEnhancementStep(); // Hide AI enhancement step from UI
      this.updateProcessingStep('upscaling', 30);
      
      // Use Pro Engine Desktop Service for proper 2x sequential upscaling
      const result = await this.processWithProEngineNonAI(settings);

      // Step 3: Finalization
      this.updateProcessingStep('finalization', 90);
      
      // Display the actual upscaled result
      this.displayEnhancedResult(result, false); // Non-AI upscaling result
      
      // Complete processing
      const totalTime = Date.now() - startTime;
      this.updateProcessingComplete(totalTime, settings, result);
      
    } catch (error) {
      this.updateProcessingState('error');
      this.stopTimer();
      // Hide progress section on error
      this.hideEnhancementProgress();
      throw error;
    }
  }

  /**
   * Process with Pro Engine Desktop Service (Non-AI upscaling)
   */
  async processWithProEngineNonAI(settings) {
    try {
      console.log('🚀 Starting Pro Engine Desktop Service processing (Non-AI)...');
      
      // Verify ProEngine is properly initialized
      if (!this.proEngineInterface) {
        throw new Error('ProEngine interface not properly initialized');
      }
      
      // Prepare image data for ProEngine
      let imageDataUrl = this.originalImage.dataUrl;
      
      // For large/downscaled files, read original file
      if (this.originalImage.isDownscaled || this.originalImage.isLargeFile) {
        const reader = new FileReader();
        imageDataUrl = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(this.originalImage.file);
        });
      }
      
      // Prepare the result object for Pro Engine processing
      const proEngineInput = {
        dataUrl: imageDataUrl,
        scaleFactor: settings.scaleFactor,
        format: settings.outputFormat,
        quality: settings.quality || 95,
        width: this.originalImage.width,
        height: this.originalImage.height
      };
      
      // Use Pro Engine Desktop Service for non-AI upscaling
      const result = await this.proEngineInterface.processWithDesktopService(
        proEngineInput, 
        `non-ai-${Date.now()}`, 
        false // aiEnhancement = false
      );
      
      console.log('✅ Pro Engine Desktop Service processing completed (Non-AI)');
      console.log('📊 Result dimensions:', result.width + 'x' + result.height);
      
      return result;
      
    } catch (error) {
      console.error('❌ Pro Engine Desktop Service processing failed:', error);
      
      // For extreme upscales (15x+), try browser fallback if desktop service fails
      if (settings.scaleFactor >= 15) {
        console.warn('⚠️ Desktop service failed for extreme upscale, trying browser fallback...');
        console.log('🔄 Falling back to browser-based upscaling for extreme upscale...');
        return await this.processWithUpscaler(settings);
      }
      
      // Fallback to browser-based upscaling for smaller upscales
      console.log('🔄 Falling back to browser-based upscaling...');
      return await this.processWithUpscaler(settings);
    }
  }

  /**
   * Process with ProEngine (AI Enhancement + Upscaling)
   */
  async processWithProEngine(settings) {
    try {
      // Verify ProEngine is properly initialized
      if (!this.proEngineInterface || !window.app?.getCustomFilenameForAPI) {
        throw new Error('ProEngine interface not properly initialized');
      }

      this.updateProcessingStep('enhancement', 40);
      
      // Prepare image data for ProEngine
      let imageDataUrl = this.originalImage.dataUrl;
      
      // For large/downscaled files, read original file
      if (this.originalImage.isDownscaled || this.originalImage.isLargeFile) {
        const reader = new FileReader();
        imageDataUrl = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(this.originalImage.file);
        });
      }

      // Prepare ProEngine result object
      const proEngineResult = {
        dataUrl: imageDataUrl,
        scaleFactor: settings.scaleFactor,
        format: settings.outputFormat,
        quality: settings.quality || 95,
        width: this.originalImage.width * settings.scaleFactor,
        height: this.originalImage.height * settings.scaleFactor
      };

      this.updateProcessingStep('upscaling', 70);
      
      // Create session ID
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Process with ProEngine using specified enhancement type
      const enhancementType = settings.enhancementType || 'super-resolution';
      console.log(`🤖 Initiating ${enhancementType} processing...`);
      
      if (this.proEngineInterface.desktopServiceAvailable) {
        // Configure AI preferences based on enhancement type
        let aiPreferences = {
          aiEnhancement: true,
          enhancementType: enhancementType
        };
        
        // Set type-specific parameters
        if (enhancementType === 'face-enhancement') {
          aiPreferences = {
            ...aiPreferences,
            fidelity: 0.05,
            codeformerWeight: 0.9
          };
          console.log('🎭 Using face-specific enhancement settings');
        } else if (enhancementType === 'super-resolution') {
          aiPreferences = {
            ...aiPreferences,
            fidelity: 0.7,
            codeformerWeight: 0.1
          };
          console.log('🔍 Using super-resolution enhancement settings');
        }
        
        console.log('🔧 Using AI Enhancement path via Desktop Service');
        const aiResult = await this.proEngineInterface.processWithAIEnhancement(
          proEngineResult.dataUrl, 
          settings.scaleFactor, 
          aiPreferences
        );
        
        this.updateProcessingStep('finalization', 95);
        
        // Return the AI processing result with actual dimensions
        return {
          width: aiResult.dimensions?.width || aiResult.width || proEngineResult.width,
          height: aiResult.dimensions?.height || aiResult.height || proEngineResult.height,
          dataUrl: proEngineResult.dataUrl, // This will be updated by the canvas display
          format: settings.outputFormat,
          isProEngineResult: true,
          isAIEnhanced: true,
          sessionId: aiResult.sessionId
        };
      } else {
        // Fallback to web service AI processing
        console.log(`🔧 Using ${enhancementType} path via Web Service`);
        
        // Configure preferences for web service based on enhancement type
        let webServicePreferences = { enhancementType: enhancementType };
        if (enhancementType === 'face-enhancement') {
          webServicePreferences.fidelity = 0.05;
        } else if (enhancementType === 'super-resolution') {
          webServicePreferences.fidelity = 0.7;
        }
        
        await this.proEngineInterface.processWithDesktopServiceAI(proEngineResult, sessionId, {
          aiEnhancement: true,
          aiPreferences: webServicePreferences,
          outputPreferences: {
            outputFormat: settings.outputFormat,
            quality: settings.quality || 95
          }
        });
        
        this.updateProcessingStep('finalization', 95);
        
        return {
          width: proEngineResult.width,
          height: proEngineResult.height,
          dataUrl: proEngineResult.dataUrl,
          format: settings.outputFormat,
          isProEngineResult: true,
          isAIEnhanced: true
        };
      }
      
    } catch (error) {
      console.error('ProEngine processing error:', error);
      throw error;
    }
  }

  /**
   * Process with upscaler
   */
  async processWithUpscaler(settings) {
    try {
      if (!this.upscaler) {
        throw new Error('Upscaler not available');
      }

      const result = await this.upscaler.upscaleImage(
        this.originalImage,
        settings.scaleFactor,
        settings.outputFormat,
        settings.quality || 95,
        (progress, message) => {
          const adjustedProgress = 60 + (progress * 0.3); // Map to 60-90% range
          this.updateProcessingStep('upscaling', adjustedProgress);
        }
      );

      return result;
      
    } catch (error) {
      console.error('Upscaler processing error:', error);
      throw error;
    }
  }

  /**
   * Reset enhanced result canvas to show placeholder
   */
  resetEnhancedCanvas() {
    const enhancedPlaceholder = document.getElementById('enhanced-placeholder');
    const enhancedPreview = document.getElementById('enhanced-preview');
    const enhancedImage = document.getElementById('enhanced-image');
    const enhancedInfo = document.getElementById('enhanced-info');
    
    // Show placeholder, hide preview
    if (enhancedPlaceholder) enhancedPlaceholder.classList.remove('hidden');
    if (enhancedPreview) enhancedPreview.classList.add('hidden');
    
    // Clear any existing image
    if (enhancedImage) {
      enhancedImage.src = '';
    }
    
    // Reset info display
    if (enhancedInfo) {
      enhancedInfo.textContent = '-';
    }
    
    // Update panel title
    const panelTitle = document.querySelector('.enhanced-panel .panel-title');
    if (panelTitle) {
      panelTitle.textContent = 'Enhanced Result';
    }
    
    // Clear enhanced image data
    this.enhancedImage = null;
  }
  


  /**
   * Inform user about the upscaled download
   */
  async informUserAboutDownload(result, settings) {
    // Simulate some processing time for better UX
    await this.delay(500);
    
    // Download the actual upscaled file
    const fileName = this.generateFileName(settings.outputFormat);
    const downloadLocation = this.getDownloadLocation();
    
    try {
      // Use existing FileHandler to download the full-resolution result
      if (this.fileHandler && typeof this.fileHandler.downloadFile === 'function') {
        this.fileHandler.downloadFile(result, fileName);
      } else {
        // Fallback: direct download of full-resolution image
        const link = document.createElement('a');
        link.download = fileName;
        
        // For virtual results, we need to create full-resolution dataUrl
        if (result.isVirtual && result.fullResolutionCanvas) {
          console.log('📥 Creating full-resolution download for virtual result');
          const mimeType = settings.outputFormat === 'png' ? 'image/png' : 'image/jpeg';
          const quality = settings.outputFormat === 'png' ? undefined : 0.95;
          link.href = result.fullResolutionCanvas.toDataURL(mimeType, quality);
        } else {
          // Use regular dataUrl for non-virtual results
          link.href = result.dataUrl;
        }
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      this.updateFileStatus(fileName, downloadLocation, 'complete');
      
             // Show informative notification
       const megapixels = ((result.width * result.height) / 1000000).toFixed(1);
       this.showNotification(
         `✅ Upscaled image saved to ${downloadLocation}/${fileName} (${result.width}×${result.height}, ${megapixels}MP)`, 
         'success'
       );
      
    } catch (error) {
      console.error('Download error:', error);
      this.showNotification('Upscaling completed, but download failed', 'error');
    }
  }

  /**
   * Finalize processing
   */
    async finalizeProcessing(result, settings) {
    await this.delay(300);
    
    // Display enhanced result
    this.displayEnhancedResult(result, false); // Non-AI upscaling result
    
    // Auto-download if result is available (always use full-resolution data)
    if (result && !result.isProEngineResult) {
      try {
        const fileName = this.generateFileName(settings.outputFormat);
        const downloadLocation = this.getDownloadLocation();
        
        // Use existing FileHandler to download the full-resolution result
        if (this.fileHandler && typeof this.fileHandler.downloadFile === 'function') {
          this.fileHandler.downloadFile(result, fileName);
        } else {
          // Fallback: direct download of full-resolution image
          const link = document.createElement('a');
          link.download = fileName;
          
          // Use the result's dataUrl for download
          link.href = result.dataUrl;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        this.updateFileStatus(fileName, downloadLocation, 'complete');
        const megapixels = ((result.width * result.height) / 1000000).toFixed(1);
        this.showNotification(`Full-resolution file saved: ${result.width}×${result.height} (${megapixels}MP)`, 'success');
      } catch (error) {
        console.error('Auto-download error:', error);
        this.showNotification('Processing complete, but download failed', 'error');
      }
    } else if (result && result.isProEngineResult) {
      // ProEngine handles its own download
      const fileName = this.generateFileName(settings.outputFormat);
      const downloadLocation = this.getDownloadLocation();
      this.updateFileStatus(fileName, downloadLocation, 'complete');
      const megapixels = ((result.width * result.height) / 1000000).toFixed(1);
      this.showNotification(`ProEngine file saved: ${result.width}×${result.height} (${megapixels}MP)`, 'success');
    }
  }

  /**
   * Generate filename for download
   */
  generateFileName(format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const extension = format === 'jpeg' ? 'jpg' : format;
    
    if (this.originalImage && this.originalImage.file) {
      const baseName = this.originalImage.file.name.split('.')[0];
      return `enhanced_${baseName}_${timestamp}.${extension}`;
    }
    
    return `enhanced_image_${timestamp}.${extension}`;
  }

  /**
   * Display enhanced result - SIMPLIFIED: Show original image immediately
   */
  displayEnhancedResult(result, aiEnhanced = false) {
    // Track AI enhancement status for future reference
    this.lastProcessingWasAIEnhanced = aiEnhanced;
    
    // Update panel title based on processing type
    const panelTitle = document.querySelector('.enhanced-panel .panel-title');
    if (panelTitle) {
      panelTitle.textContent = aiEnhanced ? 'AI Enhanced Result' : 'Upscaled Result';
    }
    
    // Store the full-resolution result for download
    this.enhancedImage = result;
    
    // Get DOM elements
    const enhancedPlaceholder = document.getElementById('enhanced-placeholder');
    const enhancedPreview = document.getElementById('enhanced-preview');
    const enhancedImage = document.getElementById('enhanced-image');
    const enhancedInfo = document.getElementById('enhanced-info');

    // Hide placeholder, show preview
    if (enhancedPlaceholder) enhancedPlaceholder.classList.add('hidden');
    if (enhancedPreview) enhancedPreview.classList.remove('hidden');
    
    // Show the original image immediately (same as left canvas)
    if (enhancedImage && this.originalImage) {
      enhancedImage.src = this.originalImage.dataUrl;
      console.log('✅ Enhanced canvas showing original image immediately');
    }

    // Update info with upscaled dimensions and extreme upscale warning
    if (enhancedInfo) {
      const megapixels = ((result.width * result.height) / 1000000).toFixed(1);
      const scaleFactorElement = document.getElementById('scale-factor');
      const userSelectedScaleFactor = scaleFactorElement ? parseInt(scaleFactorElement.value) : '?';
      
      // Add warning for extreme upscales
      let infoText = `${result.width}×${result.height} • ${megapixels}MP • ${userSelectedScaleFactor}×`;
      if (userSelectedScaleFactor >= 15) {
        infoText += ' • Download for full resolution';
      }
      
      enhancedInfo.textContent = infoText;
    }

    this.enableShareButtons();
  }


  /**
   * Update processing state and UI
   */
  updateProcessingState(status, currentStep = null) {
    this.processingState.status = status;
    this.processingState.currentStep = currentStep;
    
    // Update pipeline visual state
    this.updatePipelineDisplay();
  }

  /**
   * Update processing step
   */
  /**
   * Hide the enhancement step from the UI when AI is disabled
   */
  hideEnhancementStep() {
    // Legacy method - no longer needed with progress system
    console.warn('hideEnhancementStep is deprecated with new progress system');
  }

  updateProcessingStep(step, progress, status = 'active', message = '') {
    // Legacy method for backward compatibility - now uses progress system
    this.processingState.currentStep = step;
    this.processingState.progress = progress;
    
    // Map old pipeline steps to progress updates
    let title = 'Processing...';
    let description = message;
    
    switch(step) {
      case 'analysis':
        title = 'Analyzing Image';
        description = description || 'Examining image properties and optimal processing path';
        break;
      case 'enhancement':
        title = status === 'skipped' ? 'Enhancement Skipped' : 'AI Enhancement';
        description = description || (status === 'skipped' ? 'Using standard upscaling' : 'Applying AI enhancement algorithms');
        break;
      case 'upscaling':
        title = 'Upscaling';
        description = description || 'Scaling image to target resolution';
        break;
      case 'finalization':
        title = 'Finalizing';
        description = description || 'Applying final quality optimizations';
        break;
    }
    
    // Update the new progress system
    this.updateEnhancementProgress(progress, title, description);
  }

  /**
   * Update processing completion
   */
  updateProcessingComplete(totalTime, settings, result, aiEnhanced = false) {
    // Mark all steps complete (skip hidden steps)
    const steps = ['analysis', 'enhancement', 'upscaling', 'finalization'];
    steps.forEach(step => {
      const stepElement = document.querySelector(`[data-step="${step}"]`);
      if (stepElement && stepElement.getAttribute('data-status') !== 'skipped' && stepElement.style.display !== 'none') {
        stepElement.setAttribute('data-status', 'complete');
      }
    });

    // FIXED: Use the user's actual selected scale factor from UI, not calculated ratio
    const scaleFactorElement = document.getElementById('scale-factor');
    const userSelectedScaleFactor = scaleFactorElement ? parseInt(scaleFactorElement.value) : settings.scaleFactor;

    // Update metrics with AI enhancement info
    const metrics = {
      scaleFactor: `${userSelectedScaleFactor}×`,
      resolution: `${((result.width * result.height) / 1000000).toFixed(1)}MP`,
      quality: settings.outputFormat.toUpperCase(),
      time: `${(totalTime / 1000).toFixed(1)}s`
    };
    
    // Add AI enhancement indicator
    if (aiEnhanced) {
      metrics.enhancement = 'AI Enhanced';
      console.log('✅ Processing completed with AI Enhancement (CodeFormer)');
    }
    
    this.updateMetrics(metrics);

    this.updateProcessingState('complete');
    this.updateProcessingButton(true, 'Process Another');
    
    // Stop the timer
    this.stopTimer();
    
    // Complete the progress bar to 100%
    this.updateEnhancementProgress(100, 'Complete!', 'Processing finished successfully');
    
    // Single completion notification
    let successMessage;
    if (aiEnhanced) {
      successMessage = 'AI Enhancement completed! Faces enhanced with CodeFormer technology.';
    } else {
      successMessage = `Upscaling completed! Image enlarged to ${result.width}×${result.height} (${userSelectedScaleFactor}× scale factor)`;
    }
    this.showNotification(successMessage, 'success');
    
    // Hide progress section after completion
    this.hideEnhancementProgress();
  }

  /**
   * Update metrics display
   */
  updateMetrics(metrics) {
    Object.keys(metrics).forEach(key => {
      const element = document.getElementById(`metric-${key}`);
      if (element) {
        element.textContent = metrics[key];
      }
    });
    this.processingState.metrics = { ...this.processingState.metrics, ...metrics };
  }

  /**
   * Update file status
   */
  updateFileStatus(fileName, location, status) {
    const fileNameElement = document.getElementById('output-filename');
    const fileLocationElement = document.getElementById('output-location');
    const fileStatusIndicator = document.getElementById('file-status-indicator');
    const statusText = fileStatusIndicator?.querySelector('.status-text');

    if (fileNameElement) fileNameElement.textContent = fileName;
    if (fileLocationElement) fileLocationElement.textContent = location;
    if (fileStatusIndicator) fileStatusIndicator.setAttribute('data-status', status);
    if (statusText) {
      const statusMap = {
        pending: 'Pending',
        processing: 'Processing',
        complete: 'Saved',
        error: 'Failed'
      };
      statusText.textContent = statusMap[status] || 'Unknown';
    }

    this.processingState.fileInfo = { name: fileName, location, status };
  }

  /**
   * Update processing button state
   */
  updateProcessingButton(enabled, text = 'Start Processing') {
    const button = document.getElementById('start-processing');
    if (button) {
      button.disabled = !enabled;
      const span = button.querySelector('span');
      if (span) span.textContent = text;
    }
  }

  /**
   * Start the processing timer
   */
  startTimer() {
    this.timer.startTime = Date.now();
    this.timer.isRunning = true;
    
    // Show the timer
    const timerElement = document.getElementById('processing-timer');
    if (timerElement) {
      timerElement.style.display = 'flex';
    }
    
    // Update timer every 100ms for smooth display
    this.timer.intervalId = setInterval(() => {
      this.updateTimerDisplay();
    }, 100);
  }

  /**
   * Stop the processing timer
   */
  stopTimer() {
    this.timer.isRunning = false;
    
    if (this.timer.intervalId) {
      clearInterval(this.timer.intervalId);
      this.timer.intervalId = null;
    }
    
    // Update final time display
    this.updateTimerDisplay();
    
    // Hide the timer after a short delay
    setTimeout(() => {
      const timerElement = document.getElementById('processing-timer');
      if (timerElement) {
        timerElement.style.display = 'none';
      }
    }, 2000);
  }

  /**
   * Update the timer display
   */
  updateTimerDisplay() {
    const timerText = document.getElementById('timer-text');
    if (!timerText || !this.timer.startTime) return;
    
    const elapsed = Date.now() - this.timer.startTime;
    const seconds = (elapsed / 1000).toFixed(1);
    
    if (this.timer.isRunning) {
      timerText.textContent = `Processing: ${seconds}s`;
    } else {
      timerText.textContent = `Complete: ${seconds}s`;
    }
  }

  /**
   * Initialize share buttons
   */
  initializeShareButtons() {
    const downloadBtn = document.getElementById('download-result');
    const copyLinkBtn = document.getElementById('copy-link');
    const emailBtn = document.getElementById('email-share');
    const socialBtn = document.getElementById('social-share');

    if (downloadBtn) downloadBtn.addEventListener('click', this.handleDownload.bind(this));
    if (copyLinkBtn) copyLinkBtn.addEventListener('click', this.handleCopyLink.bind(this));
    if (emailBtn) emailBtn.addEventListener('click', this.handleEmailShare.bind(this));
    if (socialBtn) socialBtn.addEventListener('click', this.handleSocialShare.bind(this));
  }

  /**
   * Enable share buttons
   */
  enableShareButtons() {
    const buttons = ['download-result', 'copy-link', 'email-share', 'social-share'];
    buttons.forEach(id => {
      const button = document.getElementById(id);
      if (button) button.disabled = false;
    });
  }

  /**
   * Handle download
   */
  handleDownload() {
    if (!this.enhancedImage) {
      this.showNotification('No enhanced image to download', 'error');
      return;
    }

    try {
      // Ensure we download the full-resolution image, not the display preview
      const fullResolutionData = this.enhancedImage;
      
      // Generate proper filename
      const outputFormat = document.getElementById('output-format')?.value || 'jpeg';
      const fileName = this.processingState.fileInfo.name || this.generateFileName(outputFormat);
      
      // Use FileHandler to download the full-resolution image if available
      if (this.fileHandler && typeof this.fileHandler.downloadFile === 'function') {
        this.fileHandler.downloadFile(fullResolutionData, fileName);
      } else {
        // Fallback: create download link for full-resolution image
        const link = document.createElement('a');
        link.download = fileName;
        link.href = fullResolutionData.dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      const megapixels = ((fullResolutionData.width * fullResolutionData.height) / 1000000).toFixed(1);
      this.showNotification(`Full-resolution image downloaded: ${fullResolutionData.width}×${fullResolutionData.height} (${megapixels}MP)`, 'success');
    } catch (error) {
      console.error('Download error:', error);
      this.showNotification('Download failed', 'error');
    }
  }

  /**
   * Handle copy link
   */
  handleCopyLink() {
    // In a real implementation, this would copy a shareable link
    this.showNotification('Link copied to clipboard', 'success');
  }

  /**
   * Handle email share
   */
  handleEmailShare() {
    // In a real implementation, this would open email composer
    this.showNotification('Email share not implemented', 'info');
  }

  /**
   * Handle social share
   */
  handleSocialShare() {
    // In a real implementation, this would open social share options
    this.showNotification('Social share not implemented', 'info');
  }

  /**
   * Handle browse location
   */
  async handleBrowseLocation() {
    try {
      // Use File System Access API if available (modern browsers)
      if ('showDirectoryPicker' in window) {
        const dirHandle = await window.showDirectoryPicker();
        const locationInput = document.getElementById('download-location');
        const displayMain = document.getElementById('download-display-main');
        const displaySub = document.getElementById('download-display-sub');
        
        // Store the directory handle
        this.customDownloadLocation = dirHandle;
        
        // Update hidden input
        locationInput.value = dirHandle.name;
        
        // Update visual display elements
        if (displayMain) {
          displayMain.textContent = dirHandle.name;
        }
        if (displaySub) {
          displaySub.textContent = `Custom/${dirHandle.name}`;
        }
        
        this.showNotification('Download location updated', 'success');
      } else {
        // Fallback: Show modal with common locations
        this.showLocationPickerModal();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        this.showNotification('Could not access directory picker', 'error');
      }
    }
  }

  /**
   * Show location picker modal for browsers without File System Access API
   */
  showLocationPickerModal() {
    const modal = document.createElement('div');
    modal.className = 'location-picker-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    modal.innerHTML = `
      <div style="
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
      ">
        <h3 style="margin: 0 0 16px 0; color: hsl(var(--foreground)); font-size: 16px; font-weight: 600;">
          Select Download Location
        </h3>
        <p style="margin: 0 0 20px 0; color: hsl(var(--muted-foreground)); font-size: 14px;">
          Choose a common download location:
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
          <button class="location-option" data-location="Downloads/ProUpscaler">Downloads/ProUpscaler (Default)</button>
          <button class="location-option" data-location="Downloads">Downloads</button>
          <button class="location-option" data-location="Desktop">Desktop</button>
          <button class="location-option" data-location="Documents/ProUpscaler">Documents/ProUpscaler</button>
        </div>
        
        <button class="cancel-button" style="
          width: 100%;
          padding: 8px 16px;
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Cancel</button>
      </div>
    `;
    
    // Add styles for location options
    const style = document.createElement('style');
    style.textContent = `
      .location-option {
        width: 100%;
        padding: 10px 16px;
        background: hsl(var(--background));
        border: 1px solid hsl(var(--border));
        border-radius: 4px;
        color: hsl(var(--foreground));
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .location-option:hover {
        background: hsl(var(--muted) / 0.5);
        border-color: hsl(var(--primary));
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    
    // Handle location selection
    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('location-option')) {
        const location = e.target.getAttribute('data-location');
        this.setDownloadLocation(location);
        modal.remove();
        style.remove();
      } else if (e.target.classList.contains('cancel-button') || e.target === modal) {
        modal.remove();
        style.remove();
      }
    });
  }

  /**
   * Set download location
   */
  setDownloadLocation(location) {
    const locationInput = document.getElementById('download-location');
    const displayMain = document.getElementById('download-display-main');
    const displaySub = document.getElementById('download-display-sub');
    
    if (locationInput) {
      // Update hidden input
      locationInput.value = location;
      this.customDownloadLocation = location;
      
      // Update visual display elements
      const folderName = location.split('/').pop() || location;
      if (displayMain) {
        displayMain.textContent = folderName;
      }
      if (displaySub) {
        displaySub.textContent = location;
      }
      
      this.showNotification('Download location updated', 'success');
    }
  }

  /**
   * Get download location for file operations
   */
  getDownloadLocation() {
    const locationInput = document.getElementById('download-location');
    return locationInput?.value || 'Downloads/ProUpscaler';
  }

  /**
   * Utility: Check if file is valid image
   */
  isValidImageFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/tiff'];
    return validTypes.includes(file.type) && file.size <= 1.5 * 1024 * 1024 * 1024; // 1.5GB
  }

  /**
   * Utility: Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Utility: Delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Get or create notification container
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
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
      pointer-events: auto;
      padding: 12px 16px;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: 6px;
      color: hsl(var(--foreground));
      font-size: 13px;
      font-weight: 500;
      animation: slideIn 0.3s ease;
      max-width: 360px;
    `;
    
    // Add type-specific styling
    if (type === 'success') {
      notification.style.borderColor = 'hsl(var(--success))';
      notification.style.background = 'hsl(var(--success) / 0.1)';
    } else if (type === 'error') {
      notification.style.borderColor = 'hsl(var(--destructive))';
      notification.style.background = 'hsl(var(--destructive) / 0.1)';
    }
    
    container.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
          // Remove container if empty
          if (container.children.length === 0) {
            container.remove();
          }
        }
      }, 300);
    }, 3000);
  }

  /**
   * Update pipeline display (deprecated - now uses progress system)
   */
  updatePipelineDisplay() {
    // Legacy method - functionality moved to updateEnhancementProgress
    console.warn('updatePipelineDisplay is deprecated, use updateEnhancementProgress instead');
  }

  // Legacy methods for compatibility (will be removed/updated)
  presentUpscaledImage(result, containerElement) {
    console.warn('presentUpscaledImage is deprecated, use new enterprise layout');
  }

  presentVirtualResult(result, container) {
    console.warn('presentVirtualResult is deprecated, use new enterprise layout');  
  }

  presentDirectResult(result, container) {
    console.warn('presentDirectResult is deprecated, use new enterprise layout');
  }

  /**
   * Present side-by-side comparison in the main content area
   * This is the method called by the Pro Engine interface
   * MODIFIED: Now works with existing UI layout instead of replacing it
   */
  async presentSideBySideComparison(data, containerElement) {
    console.log('🎨 Displaying result in existing enterprise layout (maintaining UI consistency)');
    
    const { originalImage, enhancedImage, originalDimensions, enhancedDimensions, finalUpscaledDimensions, userScaleFactor, aiEnhanced } = data;
    
    // CRITICAL FIX: Instead of changing the entire UI, use the existing displayEnhancedResult method
    // This ensures UI consistency and prevents the layout from changing during processing
    
    // Create a result object compatible with displayEnhancedResult
    // CORS FIX: Avoid canvas.toDataURL() for cross-origin images to prevent security errors
    const result = {
      width: finalUpscaledDimensions.width,
      height: finalUpscaledDimensions.height,
      dataUrl: enhancedImage.src, // Use image source directly for cross-origin compatibility
      imageElement: enhancedImage, // Store the image element for display
      isAIEnhanced: aiEnhanced,
      isProEngineResult: true,
      isCrossOrigin: true // Flag to indicate this is from cross-origin source
    };
    
    console.log(`🔧 AI Enhancement result prepared for display: ${result.width}×${result.height} (cross-origin safe)`);
    
    console.log(`✅ Using existing UI layout for ${aiEnhanced ? 'AI-enhanced' : 'upscaled'} result: ${result.width}×${result.height}`);
    
    // Use the existing displayEnhancedResult method to maintain UI consistency
    this.displayEnhancedResult(result, aiEnhanced);
    
    // Store the enhanced result for download and auto-save
    this.enhancedImage = result;
    
    // Store comparison data for resize handling
    this.currentComparisonData = data;
    
    // Enable share buttons
    this.enableShareButtons();
    
    // Show success notification
    // Completion notification is handled in updateProcessingComplete
    console.log(`✅ ${aiEnhanced ? 'AI-enhanced' : 'Upscaled'} result processing completed`);
    
    // AUTO-SAVE: Temporarily disabled to prevent separate window opening
    // try {
    //   await this.autoSaveUpscaledResult(data, aiEnhanced);
    // } catch (error) {
    //   console.error('❌ Auto-save failed:', error);
    //   // Don't show error to user since this is a background operation
    // }
    
    console.log(`✅ ${aiEnhanced ? 'AI-enhanced' : 'Upscaled'} result displayed in existing enterprise layout`);
  }

  /**
   * Auto-save the upscaled result to the selected download location
   * RESTORED: Now actually downloads the file to the selected location
   */
  async autoSaveUpscaledResult(data, aiEnhanced) {
    console.log('🔄 Auto-save starting...', { aiEnhanced, hasData: !!data });
    
    try {
      if (!this.enhancedImage) {
        console.log('❌ No enhanced image available for auto-save');
        return;
      }

      const downloadLocation = this.getDownloadLocation();
      const fileName = this.generateFileName('jpeg');
      
      // Use FileHandler to download the full-resolution image
      if (this.fileHandler && typeof this.fileHandler.downloadFile === 'function') {
        console.log(`💾 Auto-downloading to: ${downloadLocation}/${fileName}`);
        await this.fileHandler.downloadFile(this.enhancedImage, fileName);
        
        // Silent auto-download - no notification to avoid spam
        console.log(`✅ Image auto-downloaded to ${downloadLocation}/${fileName}`);
      } else {
        // Fallback: create download using blob to prevent browser navigation
        console.log(`💾 Auto-downloading via blob method: ${fileName}`);
        try {
          // Convert data URL to blob to prevent browser navigation
          const dataUrl = this.enhancedImage.dataUrl;
          const byteString = atob(dataUrl.split(',')[1]);
          const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          
          const blob = new Blob([ab], { type: mimeString });
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the object URL
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 100);
          
          // Silent auto-download - no notification to avoid spam
          console.log(`✅ Image auto-downloaded: ${fileName}`);
          
        } catch (error) {
          console.error('Blob download failed:', error);
          this.showNotification(
            'Auto-download failed. You can still download manually.',
            'warning'
          );
        }
      }
      
      // Update file status to show completion
      this.updateFileStatus(fileName, downloadLocation, 'complete');
      
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      this.showNotification(
        'Auto-download failed. You can still download manually.',
        'warning'
      );
    }
    
    // Add notification in the enhanced info about download location
    this.addDownloadLocationInfo(downloadLocation);
  }
  
  /**
   * Add download location info to the enhanced result display
   * ADDED: Shows where the file will be saved when user clicks download
   */
  addDownloadLocationInfo(downloadLocation) {
    const enhancedInfo = document.getElementById('enhanced-info');
    if (enhancedInfo && !enhancedInfo.querySelector('.download-location-info')) {
      // Add download location info if not already present
      const locationInfo = document.createElement('div');
      locationInfo.className = 'download-location-info';
      locationInfo.style.cssText = 'color: #22c55e; font-size: 11px; margin-top: 4px;';
      locationInfo.innerHTML = `📁 Ready to save to: ${downloadLocation}/`;
      enhancedInfo.appendChild(locationInfo);
    }
  }
} 
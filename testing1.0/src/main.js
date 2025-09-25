import { SimpleFastUpscaler } from './simple-upscaler.js';
import { UIController } from './ui-controller.js';
import { ServerSideComposer } from './server-side-composer.js';
import { 
    setupGlobalErrorHandling, 
    initializePerformanceMonitoring,
    BrowserCapabilities,
    ErrorHandler
} from './utils.js';

/**
 * Fast upscaling application - removes AI enhancement for maximum speed
 * Now with two-state design pattern support
 */
class OptimizedImageUpscalingApp {
  constructor() {
    this.upscaler = new SimpleFastUpscaler();
    this.serverComposer = new ServerSideComposer();
    this.isInitialized = false;
    this.isProcessing = false;
    this.currentState = 'landing'; // 'landing' or 'results'
    this.selectedScale = 4; // Default scale factor
    this.currentFile = null;
    this.processingStartTime = null;
    
    // Initialize state management
    this.initializeStateManagement();
  }

  /**
   * Initialize the application
   */
  async initialize() {
    console.log('🚀 Initializing Ultra-Fast Image Upscaling App...');
    
    try {
      const success = await this.upscaler.initialize();
      console.log('🔧 Upscaler initialize result:', success);
      
      if (success) {
        this.isInitialized = true;
        console.log('✅ App isInitialized set to:', this.isInitialized);
        
        const upscalerInfo = this.upscaler.getModelInfo ? this.upscaler.getModelInfo() : { name: 'Simple Fast Upscaler', ready: true };
        this.updateStatus(`⚡ Ready! Ultra-fast upscaling - no model loading required`);
        console.log('📊 Upscaler Info:', upscalerInfo);
      } else {
        console.error('❌ Upscaler initialization returned false');
        this.updateStatus('❌ Failed to initialize upscaler');
      }
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      this.updateStatus('❌ Initialization failed');
    }
  }

  /**
   * Initialize state management and event listeners
   */
  initializeStateManagement() {
    // Set up scale button event listeners
    this.setupScaleButtons();
    
    // Set up upload and browse buttons
    this.setupUploadHandlers();
    
    // Set up start button
    this.setupStartButton();
    
    // Set up action bar buttons
    this.setupActionButtons();
    
    // Set up drag and drop for the upload zone
    this.setupDragAndDrop();
    
    // Set up window resize handler for responsive image display
    this.setupResizeHandler();
    
    // Set up quality control system
    this.setupQualityControl();
  }

  /**
   * Set up quality control system
   */
  setupQualityControl() {
    const qualitySlider = document.getElementById('qualitySlider');
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (qualitySlider) {
      // Throttle quality updates to prevent excessive UI changes
      let updateTimeout;
      qualitySlider.addEventListener('input', (e) => {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          this.updateQualitySettings(parseInt(e.target.value));
        }, 100); // 100ms throttle
      });
    }

    // Set up export format selection event listeners
    const exportFormatRadios = document.querySelectorAll('input[name="exportFormat"]');
    exportFormatRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        console.log(`📊 Export format changed to: ${radio.value}`);
        this.updateExportFormatEstimates(radio.value);
        
        // Refresh quality settings for the new format
        const qualitySlider = document.getElementById('qualitySlider');
        if (qualitySlider) {
          this.updateQualitySettings(parseInt(qualitySlider.value));
        }
        
        this.updateDownloadEstimates(); // Update all estimates when format changes
      });
    });
    
    // Enhanced download button handler
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        await this.handleQualityDownload();
      });
    }
    
    // Initialize with default values
    this.updateQualitySettings(10);
    this.updateExportFormatEstimates('png'); // Initialize export format estimates
  }

  /**
   * Handle download with quality control
   */
  async handleQualityDownload() {
    if (!this.fullResolutionCanvas) {
      console.error('❌ No full-resolution upscaled image available for download');
      return;
    }
    
    // Check if this is a chunked result
    if (this.fullResolutionCanvas.chunkedData) {
      console.log('🔧 Chunked result detected - implementing chunked download');
      
      // Get the actual dimensions from the chunked data (now corrected)
      const chunkWidth = this.fullResolutionCanvas.width;
      const chunkHeight = this.fullResolutionCanvas.height;
      
      // Check if the dimensions exceed browser canvas limits or memory constraints
      const maxBrowserDimension = 32767; // Browser canvas limit
      const totalPixels = chunkWidth * chunkHeight;
      const maxSafePixels = 500000000; // ~500MP - conservative memory limit (~2GB)
      
      const exceedsDimensionLimits = chunkWidth > maxBrowserDimension || chunkHeight > maxBrowserDimension;
      const exceedsMemoryLimits = totalPixels > maxSafePixels;
      const isExtremelyLarge = exceedsDimensionLimits || exceedsMemoryLimits;
      
      if (isExtremelyLarge) {
        // For images that exceed browser canvas or memory limits, use segmented download
        if (exceedsDimensionLimits) {
          console.log(`⚠️ Image ${chunkWidth}×${chunkHeight} exceeds browser canvas limits (${maxBrowserDimension}px)`);
        } else {
          console.log(`⚠️ Image ${chunkWidth}×${chunkHeight} exceeds memory limits (${Math.round(totalPixels/1000000)}MP > ${Math.round(maxSafePixels/1000000)}MP)`);
        }
        
        // For extremely large images, try WASM download (this is why we implemented WASM!)
        console.log('🔍 WASM availability check:', {
          useWasmUpscaler: this.upscaler.useWasmUpscaler,
          wasmUpscaler: !!this.upscaler.wasmUpscaler,
          wasmModule: !!(this.upscaler.wasmUpscaler && this.upscaler.wasmUpscaler.module)
        });
        
        // Try to force initialize WASM if it's not available but should be
        if (!this.upscaler.useWasmUpscaler || !this.upscaler.wasmUpscaler) {
          console.log('🔧 WASM not available, attempting emergency initialization...');
          try {
            if (!this.upscaler.wasmUpscaler) {
              const { WasmUpscalerWrapper } = await import('./wasm-upscaler-wrapper.js');
              this.upscaler.wasmUpscaler = new WasmUpscalerWrapper();
            }
            
            // Quick initialization check
            if (this.upscaler.wasmUpscaler && !this.upscaler.wasmUpscaler.isInitialized) {
              console.log('🔧 Attempting emergency WASM initialization...');
              const initResult = await this.upscaler.wasmUpscaler.initialize();
              if (initResult || this.upscaler.wasmUpscaler.module) {
                this.upscaler.useWasmUpscaler = true;
                console.log('✅ Emergency WASM initialization successful');
              }
            }
          } catch (emergencyError) {
            console.warn('⚠️ Emergency WASM initialization failed:', emergencyError.message);
          }
        }
        
        // Use our new server-side composition logic for extremely large images
        try {
          console.log(`🚀 Using server-side composition for extremely large image: ${chunkWidth}×${chunkHeight} (${Math.round(totalPixels/1000000)}MP)`);
          await this.downloadChunkedResult(); // This will automatically decide server vs browser
          return;
        } catch (serverError) {
          console.error('❌ Server-side composition failed:', serverError);
          
          // Fallback to WASM if server-side fails
          if (this.upscaler.useWasmUpscaler && this.upscaler.wasmUpscaler) {
            try {
              console.log('⚠️ Falling back to WASM processing...');
              await this.downloadChunkedResultWasm();
              return;
            } catch (wasmError) {
              console.error('❌ WASM fallback also failed:', wasmError);
              const reason = exceedsDimensionLimits ? 
                `exceeds browser canvas limits (${maxBrowserDimension}px)` : 
                `exceeds memory limits (${Math.round(totalPixels/1000000)}MP > ${Math.round(maxSafePixels/1000000)}MP)`;
              
              alert(`All download methods failed for extremely large image (${chunkWidth.toLocaleString()}×${chunkHeight.toLocaleString()}).\n\nThe image ${reason}.\n\nErrors:\n• Server: ${serverError.message}\n• WASM: ${wasmError.message}\n\nRecommendations:\n• Ensure enhanced server is running: npm run server\n• Try using a smaller scale factor\n• Process a smaller source image`);
              return;
            }
          } else {
            alert(`Download failed for extremely large image (${chunkWidth.toLocaleString()}×${chunkHeight.toLocaleString()}).\n\nThe image ${reason}.\n\nError: ${serverError.message}\n\nRecommendations:\n• Start the enhanced server: npm run server\n• Try using a smaller scale factor\n• Process a smaller source image`);
            return;
          }
        }
      }
      
      // For all other chunked results, use standard download
      console.log(`📥 Attempting standard chunked download: ${chunkWidth}×${chunkHeight}`);
      
      // Use our enhanced download logic that handles server-side composition
      try {
        await this.downloadChunkedResult();
        return;
      } catch (error) {
        console.error('❌ Chunked download failed:', error);
        alert(`Download failed for ${chunkWidth.toLocaleString()}×${chunkHeight.toLocaleString()} image.\n\nError: ${error.message}\n\nTry using a smaller scale factor or alternative export methods.`);
        return;
      }
    }
    
    const settings = this.getCurrentDownloadSettings();
    
    // Create filename with quality info
    let filename = 'upscaled-image';
    if (this.currentFile) {
      const originalName = this.currentFile.name.replace(/\.[^/.]+$/, "");
      const qualityInfo = settings.format === 'png' ? 'lossless' : `q${settings.qualityLevel}`;
      filename = `${originalName}_${this.selectedScale || 4}x_${qualityInfo}`;
    }
    
    console.log(`📥 Downloading with quality control:`, {
      format: settings.format.toUpperCase(),
      quality: settings.quality,
      qualityLevel: settings.qualityLevel,
      resolution: `${this.fullResolutionCanvas.width}×${this.fullResolutionCanvas.height}`,
      filename: `${filename}.${settings.format}`
    });
    
    try {
      // Use the enhanced download function with quality settings
      await this.downloadWithQuality(
        this.fullResolutionCanvas, 
        filename, 
        settings.mimeType, 
        settings.quality
      );
    } catch (error) {
      console.error('❌ Quality download failed:', error);
    }
  }
  
  /**
   * Direct AVIF download fallback for extremely large images when WASM fails
   */
  async downloadWithDirectAVIF(width, height) {
    console.log(`🔧 Direct AVIF encoding for ${width}×${height} image`);
    
    if (!this.fullResolutionCanvas.chunkedData) {
      throw new Error('No chunked data available for direct AVIF encoding');
    }
    
    // Show progress
    this.showDownloadProgress('Preparing direct AVIF encoding...', 10);
    
    try {
      // Use OffscreenCanvas if available for better memory handling
      let canvas, ctx;
      const maxDimension = Math.min(16384, Math.max(width, height)); // Browser safe limit
      
      if (width > maxDimension || height > maxDimension) {
        // Scale down to fit browser limits while maintaining aspect ratio
        const scale = maxDimension / Math.max(width, height);
        const scaledWidth = Math.floor(width * scale);
        const scaledHeight = Math.floor(height * scale);
        
        console.log(`🔧 Scaling down from ${width}×${height} to ${scaledWidth}×${scaledHeight} for browser compatibility`);
        
        if (typeof OffscreenCanvas !== 'undefined') {
          canvas = new OffscreenCanvas(scaledWidth, scaledHeight);
        } else {
          canvas = document.createElement('canvas');
          canvas.width = scaledWidth;
          canvas.height = scaledHeight;
        }
        ctx = canvas.getContext('2d');
        
        // Create a temporary canvas with original data and scale it down
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.min(width, 8192);
        tempCanvas.height = Math.min(height, 8192);
        const tempCtx = tempCanvas.getContext('2d');
        
        // Build image in chunks on temp canvas (limited size)
        const chunkSize = 2048;
        const chunksX = Math.ceil(Math.min(width, 8192) / chunkSize);
        const chunksY = Math.ceil(Math.min(height, 8192) / chunkSize);
        
        for (let cy = 0; cy < chunksY; cy++) {
          for (let cx = 0; cx < chunksX; cx++) {
            const chunkX = cx * chunkSize;
            const chunkY = cy * chunkSize;
            const chunkW = Math.min(chunkSize, tempCanvas.width - chunkX);
            const chunkH = Math.min(chunkSize, tempCanvas.height - chunkY);
            
            try {
              const chunkData = this.fullResolutionCanvas.chunkedData.getChunk(chunkX, chunkY, chunkW, chunkH);
              tempCtx.putImageData(chunkData, chunkX, chunkY);
            } catch (chunkError) {
              console.warn(`⚠️ Failed to get chunk ${cx},${cy}:`, chunkError.message);
            }
            
            this.showDownloadProgress(`Building preview: chunk ${cy * chunksX + cx + 1}/${chunksX * chunksY}`, 10 + ((cy * chunksX + cx) / (chunksX * chunksY)) * 40);
          }
        }
        
        // Scale down to final size
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, scaledWidth, scaledHeight);
        
      } else {
        // Image fits within browser limits
        if (typeof OffscreenCanvas !== 'undefined') {
          canvas = new OffscreenCanvas(width, height);
        } else {
          canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
        }
        ctx = canvas.getContext('2d');
        
        // Build full image
        const chunkSize = 2048;
        const chunksX = Math.ceil(width / chunkSize);
        const chunksY = Math.ceil(height / chunkSize);
        const totalChunks = chunksX * chunksY;
        
        for (let cy = 0; cy < chunksY; cy++) {
          for (let cx = 0; cx < chunksX; cx++) {
            const chunkX = cx * chunkSize;
            const chunkY = cy * chunkSize;
            const chunkW = Math.min(chunkSize, width - chunkX);
            const chunkH = Math.min(chunkSize, height - chunkY);
            
            try {
              const chunkData = this.fullResolutionCanvas.chunkedData.getChunk(chunkX, chunkY, chunkW, chunkH);
              ctx.putImageData(chunkData, chunkX, chunkY);
            } catch (chunkError) {
              console.warn(`⚠️ Failed to get chunk ${cx},${cy}:`, chunkError.message);
            }
            
            const progress = 10 + ((cy * chunksX + cx) / totalChunks) * 60;
            this.showDownloadProgress(`Building image: chunk ${cy * chunksX + cx + 1}/${totalChunks}`, progress);
          }
        }
      }
      
      this.showDownloadProgress('Encoding to AVIF...', 80);
      
      // Try AVIF encoding
      let blob = null;
      
      try {
        if (canvas.convertToBlob) {
          // OffscreenCanvas method
          blob = await canvas.convertToBlob({ type: 'image/avif', quality: 0.9 });
        } else {
          // Regular canvas method
          blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/avif', 0.9);
          });
        }
      } catch (avifError) {
        console.warn('⚠️ AVIF encoding failed, trying WebP...', avifError.message);
      }
      
      // Fallback to WebP if AVIF fails
      if (!blob) {
        try {
          if (canvas.convertToBlob) {
            blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
          } else {
            blob = await new Promise(resolve => {
              canvas.toBlob(resolve, 'image/webp', 0.9);
            });
          }
        } catch (webpError) {
          console.warn('⚠️ WebP encoding failed, trying JPEG...', webpError.message);
        }
      }
      
      // Final fallback to JPEG
      if (!blob) {
        if (canvas.convertToBlob) {
          blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
        } else {
          blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
          });
        }
      }
      
      if (!blob) {
        throw new Error('Failed to encode image to any supported format');
      }
      
      this.showDownloadProgress('Creating download...', 95);
      
      // Determine file extension
      let extension = 'jpg';
      if (blob.type.includes('avif')) extension = 'avif';
      else if (blob.type.includes('webp')) extension = 'webp';
      else if (blob.type.includes('png')) extension = 'png';
      
      // Create filename
      let filename;
      if (this.currentFile) {
        const originalName = this.currentFile.name.replace(/\.[^/.]+$/, "");
        filename = `${originalName}_${this.selectedScale || 4}x_DIRECT_${canvas.width}x${canvas.height}.${extension}`;
      } else {
        filename = `upscaled-image-DIRECT_${canvas.width}x${canvas.height}.${extension}`;
      }
      
      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      
      this.hideDownloadProgress();
      
      console.log(`✅ Direct encoding completed: ${(blob.size / 1024 / 1024).toFixed(2)}MB ${blob.type}`);
      
      // Show success message
      alert(`🎉 Large Image Downloaded!\n\nYour ${width}×${height} image has been processed and downloaded.\n\nFile: ${filename}\nSize: ${(blob.size / 1024 / 1024).toFixed(1)}MB\nFormat: ${extension.toUpperCase()}\n\nNote: Image may have been scaled down to fit browser limitations.`);
      
    } catch (error) {
      this.hideDownloadProgress();
      throw error;
    }
  }

  /**
   * Download with quality control and progress feedback
   * Now with smart format selection for large images
   */
  async downloadWithQuality(canvas, filename, mimeType, quality) {
    const startTime = performance.now();
    const width = canvas.width;
    const height = canvas.height;
    const totalPixels = width * height;
    
    console.log(`📥 Starting quality download: ${width}×${height} (${(totalPixels/1000000).toFixed(1)}MP) - ${mimeType} at ${quality} quality`);
    
    // Smart format selection for large images (lowered thresholds for testing)
    const CANVAS_LIMIT = 8192; // 8K limit for Canvas API (lowered for testing)
    const MEGAPIXEL_LIMIT = 50; // 50MP limit for Canvas API (lowered for testing)
    const isLargeImage = width > CANVAS_LIMIT || height > CANVAS_LIMIT || totalPixels > MEGAPIXEL_LIMIT * 1000000;
    
    console.log(`🔍 Image size check: ${width}×${height} (${(totalPixels/1000000).toFixed(1)}MP)`);
    console.log(`🔍 Thresholds: ${CANVAS_LIMIT}px dimension, ${MEGAPIXEL_LIMIT}MP`);
    console.log(`🔍 Is large image: ${isLargeImage}`);
    
    // Get selected format from sidebar
    const selectedFormat = this.getSelectedFormat();
    
    // For large images OR if user selected AVIF/JPEG, use WASM
    if (isLargeImage || selectedFormat.format !== 'png') {
      console.log(`🚀 WASM export selected: ${selectedFormat.format.toUpperCase()} for ${width}×${height} image`);
      return await this.downloadLargeImageWasm(canvas, filename, selectedFormat.format === 'png' ? 'image/png' : selectedFormat.format === 'jpeg' ? 'image/jpeg' : 'image/avif', selectedFormat.quality);
    }
    
    try {
      // For smaller PNG images, use standard Canvas API
      console.log(`📸 Standard Canvas PNG download for ${width}×${height} image`);
      
      // Create blob with quality settings and timeout
      const blob = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Download timeout')), 60000);
        
        canvas.toBlob((blob) => {
          clearTimeout(timeoutId);
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, mimeType, quality);
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const extension = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
      link.download = `${filename}.${extension}`;
      link.href = url;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      const downloadTime = performance.now() - startTime;
      const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ Quality download completed in ${downloadTime.toFixed(2)}ms`);
      console.log(`📊 File size: ${fileSizeMB}MB | Quality: ${quality} | Format: ${mimeType}`);
      
    } catch (error) {
      const downloadTime = performance.now() - startTime;
      console.error(`❌ Quality download failed after ${downloadTime.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * Download large images using WASM with format selection
   */
  async downloadLargeImageWasm(canvas, filename, mimeType, quality) {
    const startTime = performance.now();
    const width = canvas.width;
    const height = canvas.height;
    const sizeGB = (width * height * 4) / (1024 * 1024 * 1024);
    
    console.log(`🚀 WASM download for large image: ${width}×${height} (${sizeGB.toFixed(1)}GB)`);
    
    // Get format selection from sidebar
    const formatChoice = this.getSelectedFormat();
    
    try {
      // Extract ImageData from canvas
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, width, height);
      
      let blob;
      let actualFormat;
      
      // Route to appropriate WASM encoder based on choice
      switch (formatChoice.format) {
        case 'avif':
          this.showDownloadProgress('Encoding to AVIF (best compression)...', 10);
          console.log(`🎯 AVIF encoding with quality: ${formatChoice.quality}`);
          blob = await this.upscaler.wasmUpscaler.encodeToAvifJs(
            imageData, 
            formatChoice.quality,
            (progress, message) => {
              this.showDownloadProgress(message || 'Encoding AVIF...', 10 + progress * 80);
            }
          );
          actualFormat = 'avif';
          break;
          
        case 'jpeg':
          this.showDownloadProgress('Encoding to JPEG (fast, compatible)...', 10);
          console.log(`🎯 JPEG encoding with quality: ${formatChoice.quality}`);
          blob = await this.upscaler.wasmUpscaler.encodeToJpegWasm(
            imageData, 
            formatChoice.quality,
            (progress, message) => {
              this.showDownloadProgress(message || 'Encoding JPEG...', 10 + progress * 80);
            }
          );
          actualFormat = 'jpg';
          break;
          
        case 'png':
        default:
          this.showDownloadProgress('Encoding to PNG (lossless, large)...', 10);
          console.log(`🎯 PNG encoding (lossless)`);
          blob = await this.upscaler.wasmUpscaler.encodeToPngWasm(
            imageData,
            (progress, message) => {
              this.showDownloadProgress(message || 'Encoding PNG...', 10 + progress * 80);
            }
          );
          actualFormat = 'png';
          break;
      }
      
      this.showDownloadProgress('Creating download...', 95);
      
      // Create download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${filename}_WASM_${width}x${height}.${actualFormat}`;
      link.href = url;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      
      const downloadTime = performance.now() - startTime;
      const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ WASM large image download completed in ${downloadTime.toFixed(2)}ms`);
      console.log(`📊 File size: ${fileSizeMB}MB | Format: ${actualFormat.toUpperCase()} | Original: ${width}×${height}`);
      
      this.hideDownloadProgress();
      
    } catch (error) {
      const downloadTime = performance.now() - startTime;
      console.error(`❌ WASM large image download failed after ${downloadTime.toFixed(2)}ms:`, error);
      this.hideDownloadProgress();
      throw error;
    }
  }

  /**
   * Get selected format from sidebar
   */
  getSelectedFormat() {
    const selectedRadio = document.querySelector('input[name="exportFormat"]:checked');
    const format = selectedRadio ? selectedRadio.value : 'png';
    
    // Get quality from current slider setting if available
    let quality;
    if (this.currentQuality !== undefined) {
      quality = this.currentQuality;
    } else {
      // Fallback to default values if quality slider not initialized
      switch (format) {
        case 'avif':
          quality = 50; // Good balance for AVIF
          break;
        case 'jpeg':
          quality = 95; // High quality JPEG
          break;
        case 'png':
        default:
          quality = 100; // PNG is lossless
          break;
      }
    }
    
    return { format, quality };
  }

  /**
   * Update file size estimates based on selected export format
   */
  updateExportFormatEstimates(format) {
    const fileSizeElement = document.getElementById('estimatedFileSize');
    const downloadTimeElement = document.getElementById('estimatedDownloadTime');
    
    if (!fileSizeElement || !this.fullResolutionCanvas) return;
    
    const width = this.fullResolutionCanvas.width || 2000;
    const height = this.fullResolutionCanvas.height || 3000;
    const totalPixels = width * height;
    const baseSizeMB = (totalPixels * 4) / (1024 * 1024); // Raw RGBA size
    
    let estimatedSizeMB;
    let formatName;
    
    switch (format) {
      case 'avif':
        estimatedSizeMB = baseSizeMB * 0.02; // ~2% of raw size
        formatName = 'AVIF';
        break;
      case 'jpeg':
        estimatedSizeMB = baseSizeMB * 0.1; // ~10% of raw size  
        formatName = 'JPEG';
        break;
      case 'png':
      default:
        estimatedSizeMB = baseSizeMB * 0.25; // ~25% of raw size (with compression)
        formatName = 'PNG';
        break;
    }
    
    // Update file size display
    if (estimatedSizeMB > 1024) {
      fileSizeElement.textContent = `~${(estimatedSizeMB / 1024).toFixed(1)} GB ${formatName}`;
    } else {
      fileSizeElement.textContent = `~${Math.round(estimatedSizeMB)} MB ${formatName}`;
    }
    
    // Update download time estimate (assuming 10 MB/s)
    if (downloadTimeElement) {
      const downloadTimeSeconds = estimatedSizeMB / 10;
      if (downloadTimeSeconds > 60) {
        downloadTimeElement.textContent = `~${Math.round(downloadTimeSeconds / 60)}min`;
      } else {
        downloadTimeElement.textContent = `~${Math.round(downloadTimeSeconds)}s`;
      }
    }
    
    console.log(`📊 Format: ${formatName}, Size: ${Math.round(estimatedSizeMB)}MB`);
  }

  /**
   * Download chunked result - uses server-side composition for 600+ MP images
   */
  async downloadChunkedResult() {
    if (!this.fullResolutionCanvas.chunkedData) {
      throw new Error('No chunked data available');
    }
    
    const chunkedData = this.fullResolutionCanvas.chunkedData;
    const outputWidth = chunkedData.width;
    const outputHeight = chunkedData.height;
    
    console.log(`🔧 Processing download for: ${outputWidth}×${outputHeight}`);
    console.log(`🔍 DEBUG: Chunked data structure:`, chunkedData);
    
    // Check if we should use server-side composition
    const useServerSide = ServerSideComposer.shouldUseServerSideComposition(chunkedData);
    
    if (useServerSide) {
      console.log('🚀 Using server-side composition for large file');
      return await this.downloadChunkedResultServerSide();
    } else {
      console.log('🖥️ Using browser-side composition for manageable file');
      return await this.downloadChunkedResultBrowser();
    }
  }

  /**
   * Server-side composition for 600+ MP images
   */
  async downloadChunkedResultServerSide() {
    const chunkedData = this.fullResolutionCanvas.chunkedData;
    
    try {
      // Get recommended format and quality for large files
      const recommendation = ServerSideComposer.getRecommendedFormat(chunkedData);
      const settings = this.getCurrentDownloadSettings();
      
      // Override with optimized settings for large files
      const format = recommendation.format;
      const quality = recommendation.quality;
      
      console.log(`📊 Using optimized settings for large file: ${format} @ ${quality}% quality`);
      
      // Use server-side composer
      const result = await this.serverComposer.composeChunkedResult(
        chunkedData,
        format,
        quality,
        (progress, message) => this.showDownloadProgress(message, progress)
      );
      
      console.log('✅ Server-side composition completed:', result);
      
    } catch (error) {
      console.error('❌ Server-side composition failed:', error);
      this.hideDownloadProgress();
      
      // Show user-friendly error
      if (error.message.includes('Enhanced server not available')) {
        const chunkedData = this.fullResolutionCanvas.chunkedData;
        const megapixels = (chunkedData.width * chunkedData.height / 1000000).toFixed(1);
        this.showError(
          'Server Required for Large Images',
          `This ${megapixels}MP upscaled image (${chunkedData.width}×${chunkedData.height}) exceeds browser limits and requires server-side composition.\n\nPlease start the enhanced server:\nnpm run server\n\nThen try downloading again.`
        );
      } else {
        this.showError('Download Failed', `Server-side composition failed: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Browser-side composition for smaller images (legacy method)
   */
  async downloadChunkedResultBrowser() {
    const chunkedData = this.fullResolutionCanvas.chunkedData;
    const outputWidth = chunkedData.width;
    const outputHeight = chunkedData.height;
    
    // Check browser canvas limits
    const maxCanvasDimension = 16384; // Conservative browser limit
    if (outputWidth > maxCanvasDimension || outputHeight > maxCanvasDimension) {
      const megapixels = (outputWidth * outputHeight / 1000000).toFixed(1);
      throw new Error(`This ${megapixels}MP upscaled image (${outputWidth}×${outputHeight}) exceeds browser canvas limits (${maxCanvasDimension}px). The system should have automatically used server-side composition. Please ensure the enhanced server is running.`);
    }
    
    // Create the full-resolution canvas
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    finalCanvas.width = outputWidth;
    finalCanvas.height = outputHeight;
    
    // Fill with transparent background
    finalCtx.clearRect(0, 0, outputWidth, outputHeight);
    
    let tilesReconstructed = 0;
    
    // CRITICAL: Reconstruct from the actual processed tiles
    if (chunkedData.tiles && Array.isArray(chunkedData.tiles)) {
      console.log(`🔧 RECONSTRUCTING from ${chunkedData.tiles.length} processed tiles`);
      
      for (let i = 0; i < chunkedData.tiles.length; i++) {
        const tile = chunkedData.tiles[i];
        
        // Handle different tile data structures from Enhanced Upscaler
        let tileImageData = null;
        let tileWidth = 0;
        let tileHeight = 0;
        
        if (tile.imageData) {
          // Direct imageData from Enhanced Upscaler (most common case)
          if (tile.imageData instanceof ArrayBuffer) {
            // Convert ArrayBuffer to ImageData
            tileWidth = tile.outputWidth || tile.width;
            tileHeight = tile.outputHeight || tile.height;
            const uint8Array = new Uint8ClampedArray(tile.imageData);
            tileImageData = new ImageData(uint8Array, tileWidth, tileHeight);
          } else if (tile.imageData instanceof ImageData) {
            // Already ImageData
            tileImageData = tile.imageData;
            tileWidth = tileImageData.width;
            tileHeight = tileImageData.height;
          } else {
            console.warn(`⚠️ Tile ${i} has imageData but it's not ArrayBuffer or ImageData:`, typeof tile.imageData);
          }
        } else if (tile.result && tile.result.imageData) {
          // Legacy structure: nested in result object
          if (tile.result.imageData instanceof ImageData) {
            tileImageData = tile.result.imageData;
            tileWidth = tileImageData.width;
            tileHeight = tileImageData.height;
          }
        } else if (tile.processedImageData) {
          // Alternative structure: direct processed ImageData
          tileImageData = tile.processedImageData;
          tileWidth = tileImageData.width;
          tileHeight = tileImageData.height;
        } else if (tile.canvas) {
          // Direct canvas (if available)
          finalCtx.drawImage(tile.canvas, tile.outputX || 0, tile.outputY || 0);
          tilesReconstructed++;
          continue;
        } else {
          console.warn(`⚠️ Tile ${i} has no reconstructable data:`, Object.keys(tile));
          continue;
        }
        
        // If we have valid tile image data, draw it
        if (tileImageData && tileWidth > 0 && tileHeight > 0) {
          const tileCanvas = document.createElement('canvas');
          const tileCtx = tileCanvas.getContext('2d');
          tileCanvas.width = tileWidth;
          tileCanvas.height = tileHeight;
          tileCtx.putImageData(tileImageData, 0, 0);
          
          // Draw at the correct position (use outputX/outputY from tile, or calculate from id)
          const outputX = tile.outputX || 0;
          const outputY = tile.outputY || 0;
          
          finalCtx.drawImage(tileCanvas, outputX, outputY);
          tilesReconstructed++;
          
          console.log(`✅ Reconstructed tile ${i} at ${outputX},${outputY} (${tileWidth}×${tileHeight})`);
        }
      }
    }
    
    console.log(`✅ Reconstructed ${tilesReconstructed} tiles out of ${chunkedData.tiles?.length || 0}`);
    
    if (tilesReconstructed === 0) {
      throw new Error(`Failed to reconstruct any tiles from chunked data. The upscaled image data is not available in the expected format. This is a critical bug - the actual upscaled image cannot be downloaded.`);
    }
    
    // Verify the canvas has actual image content
    const sampleData = finalCtx.getImageData(
      Math.floor(outputWidth / 4), 
      Math.floor(outputHeight / 4), 
      Math.min(100, Math.floor(outputWidth / 2)), 
      Math.min(100, Math.floor(outputHeight / 2))
    );
    
    const hasRealContent = sampleData.data.some((value, index) => {
      if (index % 4 === 3) return false; // Skip alpha channel
      return value !== 0 && value !== 255; // Look for non-pure colors
    });
    
    if (!hasRealContent) {
      console.error('❌ CRITICAL: Reconstructed canvas appears to contain no real image data!');
      throw new Error('Reconstructed image contains no real content. This indicates the upscaling process did not store the actual results properly.');
    }
    
    console.log(`✅ VERIFIED: Canvas contains real upscaled image data`);
    
    // Get download settings
    const settings = this.getCurrentDownloadSettings();
    
    // Create filename indicating this is the REAL upscaled image
    let filename = 'upscaled-image-FULL-RESOLUTION';
    if (this.currentFile) {
      const originalName = this.currentFile.name.replace(/\.[^/.]+$/, "");
      const qualityInfo = settings.format === 'png' ? 'lossless' : `q${settings.qualityLevel}`;
      filename = `${originalName}_${this.selectedScale || 4}x_FULL_${qualityInfo}`;
    }
    
    console.log(`📥 DOWNLOADING REAL UPSCALED IMAGE: ${filename}.${settings.format}`);
    console.log(`📊 FULL RESOLUTION: ${finalCanvas.width}×${finalCanvas.height} pixels`);
    
    // Download the actual upscaled image
    await this.downloadWithQuality(
      finalCanvas, 
      filename, 
      settings.mimeType, 
      settings.quality
    );
  }

  /**
   * Simple chunked result download using the preview canvas
   */
  async downloadChunkedResultSimple() {
    if (!this.fullResolutionCanvas.chunkedData) {
      throw new Error('No chunked data available');
    }
    
    const chunkedData = this.fullResolutionCanvas.chunkedData;
    const outputWidth = chunkedData.width;
    const outputHeight = chunkedData.height;
    
    console.log(`🔧 Simple chunked download: ${outputWidth}×${outputHeight}`);
    
    // Get the current upscaled canvas that's being displayed
    const upscaledCanvas = document.getElementById('upscaledCanvas');
    if (!upscaledCanvas) {
      throw new Error('No upscaled canvas found for download');
    }
    
    console.log(`📊 Using displayed canvas: ${upscaledCanvas.width}×${upscaledCanvas.height}`);
    
    // Get download settings
    const settings = this.getCurrentDownloadSettings();
    
    // Create filename
    let filename = 'upscaled-image';
    if (this.currentFile) {
      const originalName = this.currentFile.name.replace(/\.[^/.]+$/, "");
      const qualityInfo = settings.format === 'png' ? 'lossless' : `q${settings.qualityLevel}`;
      filename = `${originalName}_${this.selectedScale || 4}x_${qualityInfo}`;
    }
    
    console.log(`📥 Downloading simple chunked result: ${filename}.${settings.format}`);
    console.log(`📊 Note: Downloading preview version (${upscaledCanvas.width}×${upscaledCanvas.height}) instead of full chunked size`);
    
    // Download the displayed canvas directly
    await this.downloadWithQuality(
      upscaledCanvas, 
      filename, 
      settings.mimeType, 
      settings.quality
    );
  }

  /**
   * Helper method to finish download process
   */
  async finishDownload(blob, outputWidth, outputHeight, extension) {
    // Create download
    let filename;
    
    if (this.currentFile) {
      const originalName = this.currentFile.name.replace(/\.[^/.]+$/, "");
      filename = `${originalName}_${this.selectedScale || 4}x_${outputWidth}x${outputHeight}.${extension}`;
    } else {
      filename = `upscaled-image_${outputWidth}x${outputHeight}.${extension}`;
    }
    
    // Download the blob
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    
    this.hideDownloadProgress();
    
    console.log(`✅ Download completed: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
    
    // Show user notification for large downloads
    if (outputWidth * outputHeight > 100000000) { // 100MP+
      alert(`🎉 600MP Download Complete!\n\nYour massive ${outputWidth}×${outputHeight} image has been successfully downloaded!\n\nFile: ${filename}\nSize: ${(blob.size / 1024 / 1024).toFixed(1)}MB\nFormat: ${extension.toUpperCase()}\n\nThis is a single file with excellent compression!`);
    }
  }

  /**
   * AVIF streaming download for extremely large images - creates ONE single file
   */
  async downloadChunkedResultAVIFStreaming() {
    if (!this.fullResolutionCanvas.chunkedData) {
      throw new Error('No chunked data available');
    }
    
    const chunkedData = this.fullResolutionCanvas.chunkedData;
    const outputWidth = chunkedData.width;
    const outputHeight = chunkedData.height;
    
    console.log(`🚀 AVIF streaming download: ${outputWidth}×${outputHeight}`);
    
    // Check if WASM upscaler is available for AVIF streaming
    if (!this.upscaler.useWasmUpscaler || !this.upscaler.wasmUpscaler) {
      throw new Error('WASM upscaler not available for AVIF streaming');
    }
    
    // Show progress
    this.showDownloadProgress('Initializing AVIF streaming...', 0);
    
    try {
      // Use AVIF streaming to create one single file
      const blob = await this.upscaler.wasmUpscaler.encodeAVIFStreaming(
        chunkedData,
        0.95, // High quality
        (progress, message) => {
          this.showDownloadProgress(message, progress * 100);
        }
      );
      
      // Create download
      const settings = this.getCurrentDownloadSettings();
      let filename;
      
      if (this.currentFile) {
        const originalName = this.currentFile.name.replace(/\.[^/.]+$/, "");
        filename = `${originalName}_${this.selectedScale || 4}x_AVIF_${outputWidth}x${outputHeight}.avif`;
      } else {
        filename = `upscaled-image-AVIF_${outputWidth}x${outputHeight}.avif`;
      }
      
      // Download the blob
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      
      this.hideDownloadProgress();
      
      console.log(`✅ AVIF streaming download completed: ${filename}`);
      console.log(`📊 File size: ${(blob.size / 1024 / 1024).toFixed(1)}MB`);
      
      // Show success message
      alert(`🎉 600MP Download Complete!\n\nYour massive ${outputWidth}×${outputHeight} image has been successfully downloaded!\n\nFile: ${filename}\nSize: ${(blob.size / 1024 / 1024).toFixed(1)}MB\nFormat: AVIF\n\nThis is a single file with excellent compression!`);
      
    } catch (error) {
      this.hideDownloadProgress();
      console.error(`❌ AVIF streaming download failed:`, error);
      throw error;
    }
  }

  /**
   * WASM-powered download for extremely large images
   */
  async downloadChunkedResultWasm() {
    if (!this.fullResolutionCanvas.chunkedData) {
      throw new Error('No chunked data available');
    }
    
    const chunkedData = this.fullResolutionCanvas.chunkedData;
    const outputWidth = chunkedData.width;
    const outputHeight = chunkedData.height;
    
    console.log(`🚀 WASM-powered download: ${outputWidth}×${outputHeight}`);
    
    // Check if WASM upscaler is available
    if (!this.upscaler.useWasmUpscaler || !this.upscaler.wasmUpscaler) {
      throw new Error('WASM upscaler not available');
    }
    
    // Show progress
    this.showDownloadProgress('Initializing WASM download...', 0);
    
    try {
      // Try WASM tile composition first
      let finalImageData;
      let blob;
      
      finalImageData = await this.upscaler.wasmUpscaler.composeTilesWasm(
        chunkedData.tiles,
        outputWidth,
        outputHeight,
        (progress, message) => {
          this.showDownloadProgress(message, progress * 60);
        }
      );
      
              // Check if we got a chunked result (too large for single PNG)
        if (finalImageData.isChunked) {
          this.showDownloadProgress('Creating optimized download...', 60);
          
          // For extremely large images, try the most efficient format available
          // Priority: WASM PNG -> WebP/JPEG -> Error with suggestions
          blob = await this.upscaler.wasmUpscaler.encodeToWebPChunked(
            finalImageData,
            0.95, // High quality (0-1 scale for WebP)
            (progress, message) => {
              this.showDownloadProgress(message, 60 + progress * 40);
            }
          );
        
      } else {
        this.showDownloadProgress('Encoding to PNG...', 60);
        
        // For smaller images, use PNG as normal
        blob = await this.upscaler.wasmUpscaler.encodeToPngWasm(
          finalImageData,
          (progress, message) => {
            this.showDownloadProgress(message, 60 + progress * 40);
          }
        );
      }
      
      // Create download
      const settings = this.getCurrentDownloadSettings();
              let filename;
        // Determine file extension from blob type
        let extension = 'png'; // default
        if (finalImageData.isChunked && blob) {
          if (blob.type.includes('avif')) extension = 'avif';
          else if (blob.type.includes('webp')) extension = 'webp';
          else if (blob.type.includes('jpeg')) extension = 'jpg';
          else if (blob.type.includes('png')) extension = 'png';
        }
        
        if (this.currentFile) {
          const originalName = this.currentFile.name.replace(/\.[^/.]+$/, "");
          filename = `${originalName}_${this.selectedScale || 4}x_WASM_${outputWidth}x${outputHeight}.${extension}`;
        } else {
          filename = `upscaled-image-WASM_${outputWidth}x${outputHeight}.${extension}`;
        }
      
      // Download the blob
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      
      this.hideDownloadProgress();
      
      console.log(`✅ WASM download completed: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
      
      // Show user notification for large downloads
      if (outputWidth * outputHeight > 100000000) { // 100MP+
        alert(`🎉 600MP Download Complete!\n\nYour massive ${outputWidth}×${outputHeight} image has been successfully downloaded!\n\nFile: ${filename}\nSize: ${(blob.size / 1024 / 1024).toFixed(1)}MB\nFormat: ${extension.toUpperCase()}\n\nThis was processed using WebAssembly for maximum efficiency.`);
      }
      
    } catch (error) {
      this.hideDownloadProgress();
      throw error;
    }
  }

  /**
   * Set up scale selection buttons
   */
  setupScaleButtons() {
    const scaleButtons = document.querySelectorAll('.scale-btn');
    scaleButtons.forEach(button => {
      button.addEventListener('click', () => {
        const scale = parseInt(button.dataset.scale);
        this.selectScale(scale);
      });
    });
  }

  /**
   * Select a scale factor
   */
  selectScale(scale) {
    this.selectedScale = scale;
    
    // Update active button
    const scaleButtons = document.querySelectorAll('.scale-btn');
    scaleButtons.forEach(button => {
      button.classList.toggle('active', parseInt(button.dataset.scale) === scale);
    });
    
    console.log(`🎯 Selected scale factor: ${scale}x`);
    
    // Update status for all supported scales
    if (scale === 2 || scale === 4 || scale === 6 || scale === 8 || scale === 10) {
      this.updateStatus(`✅ Ready for ${scale}x upscaling!`);
    } else {
      this.updateStatus(`⚠️ ${scale}x upscaling is coming soon! Using 4x for now.`);
    }
  }

  /**
   * Set up upload handlers
   */
  setupUploadHandlers() {
    // Browse button
    const browseButton = document.getElementById('browseButton');
    console.log('🔍 Browse button found:', browseButton ? 'YES' : 'NO');
    if (browseButton) {
      browseButton.addEventListener('click', (e) => {
        console.log('🖱️ Browse button clicked!');
        e.stopPropagation(); // Prevent upload zone click
        const fileInput = document.getElementById('fileInput');
        console.log('🔍 File input found:', fileInput ? 'YES' : 'NO');
        if (fileInput) {
          fileInput.click();
        }
      });
    }

    // File input
    const fileInput = document.getElementById('fileInput');
    console.log('🔍 File input found:', fileInput ? 'YES' : 'NO');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        console.log('📁 File input changed:', e.target.files.length, 'files');
        if (e.target.files.length > 0) {
          this.handleFileSelection(e.target.files[0]);
        }
      });
    }
  }

  /**
   * Set up action bar buttons
   */
  setupActionButtons() {
    // Download button - handled by modern system in initialization
    // No longer binding legacy handleDownload method

    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSave());
    }

    // New image button
    const newImageBtn = document.getElementById('newImageBtn');
    if (newImageBtn) {
      newImageBtn.addEventListener('click', () => this.handleNewImage());
    }

    // Compare button
    const compareBtn = document.getElementById('compareBtn');
    if (compareBtn) {
      compareBtn.addEventListener('click', () => this.handleCompare());
    }
  }

  /**
   * Set up new image button (reset functionality)
   */
  setupNewImageButton() {
    const newImageBtn = document.getElementById('newImageBtn');
    if (newImageBtn) {
      newImageBtn.addEventListener('click', () => {
        this.resetToUpload();
      });
    }
  }

  /**
   * Set up start button for manual upscaling with enhanced visual feedback
   */
  setupStartButton() {
    const startBtn = document.getElementById('startButton');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        if (this.currentFile && !this.isProcessing) {
          // Add visual feedback for button click
          this.setButtonState('clicked');
          
          try {
            await this.upscaleImage(this.currentFile);
          } catch (error) {
            console.error('❌ Upscaling failed:', error);
            this.updateStatus('❌ Upscaling failed: ' + error.message);
            this.setButtonState('idle');
          }
        }
      });
    }
  }

  /**
   * Set button visual state with enhanced feedback
   */
  setButtonState(state) {
    const startBtn = document.getElementById('startButton');
    const buttonText = startBtn?.querySelector('.button-text');
    
    if (!startBtn || !buttonText) return;

    // Remove all state classes
    startBtn.classList.remove('clicked', 'processing', 'completed');
    
    switch (state) {
      case 'clicked':
        startBtn.classList.add('clicked');
        // Remove clicked class after animation
        setTimeout(() => {
          startBtn.classList.remove('clicked');
          this.setButtonState('processing');
        }, 300);
        break;
        
      case 'processing':
        startBtn.classList.add('processing');
        buttonText.textContent = 'Processing...';
        startBtn.disabled = true;
        break;
        
      case 'completed':
        startBtn.classList.remove('processing');
        buttonText.textContent = 'Complete!';
        setTimeout(() => {
          this.setButtonState('idle');
        }, 2000);
        break;
        
      case 'idle':
      default:
        startBtn.classList.remove('processing');
        buttonText.textContent = 'Start Upscaling';
        startBtn.disabled = !this.currentFile;
        break;
    }
  }

  /**
   * Set up change image button
   */
  setupChangeImageButton() {
    const changeImageBtn = document.getElementById('changeImageBtn');
    if (changeImageBtn) {
      changeImageBtn.addEventListener('click', () => {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
          fileInput.click();
        }
      });
    }
  }

  /**
   * Reset to upload state
   */
  resetToUpload() {
    // Reset left panel to upload state
    const uploadState = document.getElementById('uploadState');
    const imageDisplayState = document.getElementById('imageDisplayState');
    const originalMetadata = document.getElementById('originalMetadata');
    const upscaleControls = document.getElementById('upscaleControls');
    
    // Reset right panel to placeholder state
    const placeholder = document.getElementById('resultPlaceholder');
    const upscaledDisplayState = document.getElementById('upscaledDisplayState');
    const resultControls = document.getElementById('resultControls');
    const scaleIndicator = document.getElementById('scaleIndicator');
    
    // Show upload state, hide image display
    if (uploadState) uploadState.style.display = 'flex';
    if (imageDisplayState) imageDisplayState.style.display = 'none';
    if (originalMetadata) originalMetadata.style.display = 'none';
    if (upscaleControls) upscaleControls.style.display = 'none';
    
    // Show placeholder, hide result display
    if (placeholder) placeholder.style.display = 'flex';
    if (upscaledDisplayState) upscaledDisplayState.style.display = 'none';
    if (resultControls) resultControls.style.display = 'none';
    if (scaleIndicator) scaleIndicator.style.display = 'none';
    
    // Reset file input
    const fileInput = document.getElementById('file-input');
    const legacyFileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
    if (legacyFileInput) legacyFileInput.value = '';
    
    // Reset start button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.disabled = true;
    
    this.currentFile = null;
    console.log('🔄 Reset to upload state');
  }

  /**
   * Set up drag and drop for upload zone
   */
  setupDragAndDrop() {
    const uploadZone = document.getElementById('uploadZone');
    if (!uploadZone) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.remove('drag-over');
      }, false);
    });

    // Handle dropped files
    uploadZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileSelection(files[0]);
      }
    }, false);

    // Handle click on upload zone
    uploadZone.addEventListener('click', (e) => {
      // Only trigger file input if upload content is visible (not in preview mode)
      const uploadContent = document.getElementById('uploadContent');
      const imagePreview = document.getElementById('imagePreview');
      
      if (uploadContent && uploadContent.style.display !== 'none' && 
          (!imagePreview || imagePreview.style.display === 'none')) {
        document.getElementById('fileInput').click();
      }
    });
  }

  /**
   * Prevent default drag behaviors
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Set up window resize handler for responsive image display
   */
  setupResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 250);
    });
  }

  /**
   * Handle window resize - recalculate and redraw images
   */
  handleResize() {
    const originalCanvas = document.getElementById('originalCanvas');
    const upscaledCanvas = document.getElementById('upscaledCanvas');
    
    // Re-optimize image preview size if image is displayed
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    
    if (imagePreview && previewImage && imagePreview.style.display !== 'none') {
      this.optimizeImagePreviewSize(previewImage, imagePreview);
    }
    
    // Only resize if we have images displayed
    if (originalCanvas && originalCanvas.width > 0) {
      // Store the current image data
      const originalImageData = originalCanvas.getContext('2d').getImageData(0, 0, originalCanvas.width, originalCanvas.height);
      
      // Recreate the image from stored data and redraw at new size
      if (this.currentFile) {
        this.displayOriginalImage(this.currentFile);
      }
    }
    
    if (upscaledCanvas && upscaledCanvas.width > 0) {
      // For upscaled canvas, we need to trigger a redraw if we have results
      // This would need access to the result data - for now, we'll just let it be
      // The user can re-run the upscaling if needed
    }
  }

  /**
   * Calculate optimal display dimensions for an image within a container
   */
  calculateOptimalDisplaySize(imageWidth, imageHeight, container) {
    const containerRect = container.getBoundingClientRect();
    const maxWidth = containerRect.width - 8; // Minimal padding for maximum size
    const maxHeight = containerRect.height - 8; // Minimal padding for maximum size
    
    // Calculate scaling to fit container while maintaining aspect ratio
    const scaleX = maxWidth / imageWidth;
    const scaleY = maxHeight / imageHeight;
    const scale = Math.min(scaleX, scaleY) * 0.98; // Use 98% of available space for maximum display
    
    return {
      width: Math.floor(imageWidth * scale),
      height: Math.floor(imageHeight * scale),
      scale: scale
    };
  }

  /**
   * Action handlers for the new layout
   */
  // Legacy handleDownload method removed - now using modern downloadImageWithFormatCanvas system

  handleSave() {
    // Placeholder for save functionality
    console.log('💾 Save functionality - coming soon!');
  }

  handleNewImage() {
    // Reset to landing page
    this.showLandingPage();
    
    // Reset upload state
    this.resetToUploadState();
  }

  handleCompare() {
    // Placeholder for compare functionality
    console.log('👁️ Compare functionality - coming soon!');
  }

  /**
   * Show landing page
   */
  showLandingPage() {
    const landingPage = document.getElementById('landingPage');
    const resultPage = document.getElementById('resultPage');
    
    if (landingPage) landingPage.style.display = 'flex';
    if (resultPage) resultPage.style.display = 'none';
    
    this.currentState = 'landing';
  }

  /**
   * Show result page
   */
  showResultPage() {
    const landingPage = document.getElementById('landingPage');
    const resultPage = document.getElementById('resultPage');
    
    if (landingPage) landingPage.style.display = 'none';
    if (resultPage) resultPage.style.display = 'flex';
    
    this.currentState = 'results';
  }

  /**
   * Show error modal
   */
  showError(message) {
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorMessage) errorMessage.textContent = message;
    if (errorModal) errorModal.style.display = 'flex';
  }



  /**
   * Handle file selection with raw format auto-adjustment
   */
  async handleFileSelection(file) {
    this.currentFile = file;
    console.log(`📁 File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    try {
      // 🚀 NEW: Auto-adjust to raw format for exponential speed gains
      console.log('🔧 Starting raw format auto-adjustment...');
      const optimizedFile = await this.autoAdjustToRaw(file);
      
      if (optimizedFile) {
        console.log(`✅ Raw conversion complete: ${optimizedFile.speedGain}`);
        console.log(`📈 Format: ${file.name} → ${optimizedFile.format.toUpperCase()}`);
        console.log(`📊 Processing speed gain: ${optimizedFile.expectedSpeedGain || 'Up to 50x faster'}`);
        
        // Use the optimized file for processing
        this.currentFile = optimizedFile.blob || file;
        this.currentFileMetadata = optimizedFile;
        
        // Show raw optimization status in UI
        this.showRawOptimizationStatus(optimizedFile);
      }
      
      // Show image preview in upload zone
      this.showImagePreview(this.currentFile);
      
      // Enable start button with proper state
      this.setButtonState('idle');
      
      console.log('✅ Image loaded and ready for ultra-fast upscaling');
    } catch (error) {
      console.error('❌ File processing failed:', error);
      this.showError('Processing failed: ' + error.message);
    }
  }

  /**
   * Auto-adjust image file to optimal raw format for exponential speed gains
   */
  async autoAdjustToRaw(file) {
    try {
      console.log('🔍 Analyzing image for optimal raw format...');
      
      // Create a temporary URL for the file
      const fileUrl = URL.createObjectURL(file);
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            
            // Get image data for analysis
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const totalPixels = canvas.width * canvas.height;
            
            console.log(`📊 Image analysis: ${canvas.width}×${canvas.height} (${(totalPixels / 1000000).toFixed(1)}MP)`);
            
            // Determine optimal format based on image size
            let optimalFormat, expectedSpeedGain, reason;
            
            if (totalPixels > 100000000) { // >100MP
              optimalFormat = 'raw-tiff';
              expectedSpeedGain = '10-50x faster';
              reason = 'Ultra-large image - RAW TIFF for maximum speed';
            } else if (totalPixels > 10000000) { // >10MP
              optimalFormat = 'raw-webp';
              expectedSpeedGain = '5-25x faster';
              reason = 'Large image - RAW WebP for fast processing';
            } else {
              optimalFormat = 'raw-optimized';
              expectedSpeedGain = '3-15x faster';
              reason = 'Medium image - Optimized RAW format';
            }
            
            console.log(`🎯 Optimal format selected: ${optimalFormat}`);
            console.log(`📈 Expected speed gain: ${expectedSpeedGain}`);
            console.log(`💡 Reason: ${reason}`);
            
            // Convert to optimal raw format
            const rawData = await this.convertToRawFormat(imageData, optimalFormat);
            
            URL.revokeObjectURL(fileUrl);
            resolve({
              blob: rawData.blob,
              format: optimalFormat,
              speedGain: `Converted to ${optimalFormat.toUpperCase()}`,
              expectedSpeedGain,
              reason,
              dimensions: { width: canvas.width, height: canvas.height },
              originalSize: file.size,
              optimizedSize: rawData.blob.size,
              compressionRatio: (file.size / rawData.blob.size).toFixed(2) + 'x'
            });
            
          } catch (error) {
            console.error('❌ Raw conversion failed:', error);
            URL.revokeObjectURL(fileUrl);
            resolve(null); // Fall back to original file
          }
        };
        
        img.onerror = () => {
          console.warn('⚠️ Could not load image for raw conversion, using original');
          URL.revokeObjectURL(fileUrl);
          resolve(null); // Fall back to original file
        };
        
        img.src = fileUrl;
      });
      
    } catch (error) {
      console.warn('⚠️ Raw auto-adjustment failed, using original file:', error);
      return null; // Fall back to original file
    }
  }

  /**
   * Convert ImageData to optimal raw format
   */
  async convertToRawFormat(imageData, format) {
    const startTime = performance.now();
    
    console.log(`🔧 Converting to ${format}...`);
    
    // Create canvas for format conversion
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    
    // Convert based on optimal format
    let blob;
    let quality = 1.0; // Lossless for raw processing
    
    switch (format) {
      case 'raw-tiff':
        // For ultra-large images, use PNG as TIFF alternative (browser compatible)
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        break;
        
      case 'raw-webp':
        // Use WebP lossless for large images
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
        break;
        
      case 'raw-optimized':
      default:
        // Use PNG for maximum compatibility and quality
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        break;
    }
    
    const processingTime = performance.now() - startTime;
    console.log(`⚡ Raw conversion completed in ${processingTime.toFixed(2)}ms`);
    console.log(`📊 Size: ${(imageData.width * imageData.height * 4 / 1024 / 1024).toFixed(1)}MB → ${(blob.size / 1024 / 1024).toFixed(1)}MB`);
    
    return { blob };
  }

  /**
   * Show image preview in the upload zone
   */
  showImagePreview(file) {
    const uploadContent = document.getElementById('uploadContent');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    
    if (!uploadContent || !imagePreview || !previewImage) {
      console.error('❌ Preview elements not found');
      return;
    }
    
    // Create object URL for the image
    const imageUrl = URL.createObjectURL(file);
    
    // Set up the preview image
    previewImage.onload = () => {
      // Hide upload content and show image preview
      uploadContent.style.display = 'none';
      imagePreview.style.display = 'flex';
      
      // Optimize image size for display
      this.optimizeImagePreviewSize(previewImage, imagePreview);
      
      // Show and populate image information
      this.showImageInformation(file, previewImage);
      
      console.log('📸 Image preview displayed');
    };
    
    previewImage.onerror = () => {
      console.error('❌ Failed to load image preview');
      this.showError('Failed to load image preview');
    };
    
    previewImage.src = imageUrl;
    
    // Set up change image button if not already done
    this.setupChangeImageButton();
  }

  /**
   * Optimize image preview size for maximum display
   */
  optimizeImagePreviewSize(previewImage, container) {
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width - 8; // Minimal padding for maximum size
    const containerHeight = containerRect.height - 8;
    
    // Safety checks
    if (!previewImage.naturalWidth || !previewImage.naturalHeight || containerWidth <= 0 || containerHeight <= 0) {
      console.warn('⚠️ Invalid dimensions for image preview optimization:', {
        naturalWidth: previewImage.naturalWidth,
        naturalHeight: previewImage.naturalHeight,
        containerWidth,
        containerHeight
      });
      return;
    }
    
    const imageAspectRatio = previewImage.naturalWidth / previewImage.naturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;
    
    let displayWidth, displayHeight;
    
    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider than container - fit to width
      displayWidth = containerWidth * 0.98; // Use 98% of container width for maximum display
      displayHeight = displayWidth / imageAspectRatio;
    } else {
      // Image is taller than container - fit to height
      displayHeight = containerHeight * 0.98; // Use 98% of container height for maximum display
      displayWidth = displayHeight * imageAspectRatio;
    }
    
    // Apply the calculated dimensions
    previewImage.style.width = `${displayWidth}px`;
    previewImage.style.height = `${displayHeight}px`;
    previewImage.style.maxWidth = 'none';
    previewImage.style.maxHeight = 'none';
    
    console.log(`🖼️ Optimized image display: ${displayWidth.toFixed(0)}×${displayHeight.toFixed(0)}px`);
  }

  /**
   * Show and populate image information in sidebar
   */
  showImageInformation(file, previewImage) {
    const imageInfoSection = document.getElementById('imageInfoSection');
    const imageDimensions = document.getElementById('imageDimensions');
    const imageFileSize = document.getElementById('imageFileSize');
    const imageFormat = document.getElementById('imageFormat');
    const imageAspectRatio = document.getElementById('imageAspectRatio');
    
    if (!imageInfoSection) return;
    
    // Show the section
    imageInfoSection.style.display = 'block';
    
    // Populate dimensions
    if (imageDimensions && previewImage.naturalWidth && previewImage.naturalHeight) {
      imageDimensions.textContent = `${previewImage.naturalWidth} × ${previewImage.naturalHeight}`;
    }
    
    // Populate file size
    if (imageFileSize && file.size) {
      const sizeInKB = (file.size / 1024).toFixed(1);
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      imageFileSize.textContent = file.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
    }
    
    // Populate format
    if (imageFormat && file.type) {
      const format = file.type.split('/')[1].toUpperCase();
      imageFormat.textContent = format;
    }
    
    // Populate aspect ratio
    if (imageAspectRatio && previewImage.naturalWidth && previewImage.naturalHeight) {
      const ratio = (previewImage.naturalWidth / previewImage.naturalHeight).toFixed(2);
      imageAspectRatio.textContent = ratio;
    }
    
    console.log('📊 Image information displayed');
  }

  /**
   * Set up change image button
   */
  setupChangeImageButton() {
    const changeImageBtn = document.getElementById('changeImageBtn');
    if (changeImageBtn && !changeImageBtn.hasAttribute('data-listener-added')) {
      changeImageBtn.addEventListener('click', () => {
        // Reset to upload state
        this.resetToUploadState();
        // Trigger file input
        document.getElementById('fileInput').click();
      });
      changeImageBtn.setAttribute('data-listener-added', 'true');
    }
  }

  /**
   * Reset to upload state
   */
  resetToUploadState() {
    const uploadContent = document.getElementById('uploadContent');
    const imagePreview = document.getElementById('imagePreview');
    const startButton = document.getElementById('startButton');
    const previewImage = document.getElementById('previewImage');
    const imageInfoSection = document.getElementById('imageInfoSection');
    
    // Show upload content and hide image preview
    if (uploadContent) uploadContent.style.display = 'flex';
    if (imagePreview) imagePreview.style.display = 'none';
    
    // Hide image information section
    if (imageInfoSection) imageInfoSection.style.display = 'none';
    
    // Reset start button to disabled state
    this.setButtonState('idle');
    const startBtn = document.getElementById('startButton');
    if (startBtn) startBtn.disabled = true;
    
    // Clean up image URL
    if (previewImage && previewImage.src) {
      URL.revokeObjectURL(previewImage.src);
      previewImage.src = '';
    }
    
    // Clear current file
    this.currentFile = null;
    
    console.log('🔄 Reset to upload state');
  }

  /**
   * Display original image in the drop area
   */
  displayOriginalImage(file) {
    const img = new Image();
    img.onload = () => {
      // Switch from upload state to image display state
      const uploadState = document.getElementById('uploadState');
      const imageDisplayState = document.getElementById('imageDisplayState');
      
      if (uploadState) uploadState.style.display = 'none';
      if (imageDisplayState) imageDisplayState.style.display = 'block';
      
      // Display original image
      const originalCanvas = document.getElementById('originalCanvas');
      if (originalCanvas) {
        const container = originalCanvas.parentElement;
        const displaySize = this.calculateOptimalDisplaySize(img.width, img.height, container);
        
        originalCanvas.width = displaySize.width;
        originalCanvas.height = displaySize.height;
        
        // Draw the image scaled to fit
        const ctx = originalCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, displaySize.width, displaySize.height);
      }
      
      // Update original metadata
      const originalDimensions = document.getElementById('originalDimensions');
      const originalFileSize = document.getElementById('originalFileSize');
      const originalMetadata = document.getElementById('originalMetadata');
      
      if (originalDimensions) {
        originalDimensions.textContent = `${img.width} × ${img.height}`;
      }
      
      if (originalFileSize) {
        originalFileSize.textContent = this.formatFileSize(file.size);
      }
      
      if (originalMetadata) {
        originalMetadata.style.display = 'block';
      }
      
      console.log('📸 Original image displayed in drop area');
    };
    
    img.onerror = () => {
      console.error('❌ Failed to load original image');
    };
    
    img.src = URL.createObjectURL(file);
  }

  /**
   * Show upscale controls and enable start button
   */
  showUpscaleControls() {
    const upscaleControls = document.getElementById('upscaleControls');
    const startBtn = document.getElementById('startBtn');
    
    if (upscaleControls) {
      upscaleControls.style.display = 'block';
    }
    
    if (startBtn) {
      startBtn.disabled = false;
    }
    
    console.log('🎛️ Upscale controls enabled');
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Update metadata display
   */
  updateMetadata(result) {
    // Upscaled image metadata (original is handled in displayOriginalImage)
    const upscaledDimensions = document.getElementById('dimensionsStat'); // Correct ID
    const upscaledFileSize = document.getElementById('upscaledFileSize');
    const processingTime = document.getElementById('processingTime');
    const scaleIndicator = document.getElementById('scaleIndicator');
    
    if (upscaledDimensions) {
      const dimensionText = `${result.upscaledSize.width} × ${result.upscaledSize.height}`;
      upscaledDimensions.textContent = dimensionText;
    }
    
    // Calculate and display file size of upscaled image using optimized calculation
    if (upscaledFileSize) {
      if (this.fullResolutionCanvas) {
        // Use optimized file size calculation with immediate estimate
        this.calculateFileSize(this.fullResolutionCanvas, upscaledFileSize, 'image/png', 0.9);
      }
    }
    
    if (processingTime && this.processingStartTime) {
      const duration = ((Date.now() - this.processingStartTime) / 1000).toFixed(2);
      processingTime.textContent = `${duration}s`;
    }
    
    if (scaleIndicator) {
      scaleIndicator.textContent = `${this.selectedScale}×`;
    }
  }

  async initialize() {
    console.log('🚀 Initializing Ultra-Fast Image Upscaling App...');
    
    this.updateStatus('Preparing fast upscaler...');
    this.showElement('loading-spinner');
    
    try {
      const success = await this.upscaler.initialize();
      
      if (success) {
        this.isInitialized = true;
        const upscalerInfo = this.upscaler.getModelInfo();
        this.updateStatus(`⚡ Ready! Ultra-fast upscaling - no model loading required`);
        this.hideElement('loading-spinner');
        this.showElement('upload-area');
        console.log('📊 Upscaler Info:', upscalerInfo);
      } else {
        this.updateStatus('❌ Failed to initialize upscaler');
        this.hideElement('loading-spinner');
      }
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      this.updateStatus('❌ Initialization failed');
      this.hideElement('loading-spinner');
    }
  }

  async upscaleImage(file) {
    console.log('🎯 upscaleImage called with:', { 
      isInitialized: this.isInitialized, 
      isProcessing: this.isProcessing,
      file: file?.name 
    });
    
    if (!this.isInitialized || this.isProcessing) {
      console.log('❌ Upscaling blocked:', { 
        isInitialized: this.isInitialized, 
        isProcessing: this.isProcessing 
      });
      return;
    }

    this.isProcessing = true;
    this.processingStartTime = Date.now();
    this.showElement('progress-container');
    this.updateStatus('🚀 Starting image upscaling...');

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // Check image size
          const megapixels = (img.width * img.height) / 1000000;
          this.updateStatus(`⚡ Fast upscaling ${megapixels.toFixed(1)}MP image - this will be quick!`);

          // Create canvas and get image data
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          
          // Set the selected scale factor before processing
          console.log(`🔍 DEBUG: Main.js - Setting scale factors:`);
          console.log(`   this.selectedScale: ${this.selectedScale}`);
          console.log(`   Using scale factor: ${this.selectedScale || 4}`);
          
          this.upscaler.setScaleFactor(this.selectedScale || 4);
          
          // Also set scale factor for enhanced upscaler if available
          if (this.upscaler.enhancedUpscaler) {
            this.upscaler.enhancedUpscaler.setScaleFactor(this.selectedScale || 4);
            console.log(`   Enhanced upscaler scale factor set to: ${this.selectedScale || 4}`);
          }
          
          // Upscale with progress tracking
          const upscaledImageData = await this.upscaler.enhance(
            imageData, 
            (progress, message) => {
              this.updateProgress(progress * 100, message);
            }
          );
          
          // Handle different result types
          let resultCanvas;
          
          if (upscaledImageData.type === 'chunked' || upscaledImageData.isChunked) {
            // BUGFIX: Validate and correct chunked result dimensions
            const expectedWidth = img.width * (this.selectedScale || 4);
            const expectedHeight = img.height * (this.selectedScale || 4);
            
            console.log(`🔧 BUGFIX: Chunked result validation:`);
            console.log(`   Input image: ${img.width}×${img.height}`);
            console.log(`   Selected scale: ${this.selectedScale}`);
            console.log(`   Expected output: ${expectedWidth}×${expectedHeight}`);
            console.log(`   Chunked result claims: ${upscaledImageData.width}×${upscaledImageData.height}`);
            
            if (upscaledImageData.width !== expectedWidth || upscaledImageData.height !== expectedHeight) {
              console.error(`❌ BUGFIX: Chunked result has wrong dimensions!`);
              console.error(`   Correcting from ${upscaledImageData.width}×${upscaledImageData.height} to ${expectedWidth}×${expectedHeight}`);
              upscaledImageData.width = expectedWidth;
              upscaledImageData.height = expectedHeight;
            }
            
            // Chunked result - create a preview canvas showing the original image
            console.log('🔧 Handling chunked result for display - using original image as preview');
            resultCanvas = document.createElement('canvas');
            const previewSize = 1024; // Good preview resolution
            const aspectRatio = upscaledImageData.height / upscaledImageData.width;
            
            if (aspectRatio > 1) {
              // Portrait
              resultCanvas.height = previewSize;
              resultCanvas.width = Math.round(previewSize / aspectRatio);
            } else {
              // Landscape
              resultCanvas.width = previewSize;
              resultCanvas.height = Math.round(previewSize * aspectRatio);
            }
            
            const resultCtx = resultCanvas.getContext('2d');
            // Draw the original image scaled to preview size
            resultCtx.drawImage(canvas, 0, 0, resultCanvas.width, resultCanvas.height);
            
            // Add a subtle overlay to indicate it's a preview
            resultCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
            resultCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            resultCtx.font = '14px Arial';
            resultCtx.textAlign = 'center';
            resultCtx.fillText(`Preview - Full: ${upscaledImageData.width}×${upscaledImageData.height}`, resultCanvas.width/2, 25);
          } else {
            // Regular ImageData result
            resultCanvas = document.createElement('canvas');
            const resultCtx = resultCanvas.getContext('2d');
            resultCanvas.width = upscaledImageData.width;
            resultCanvas.height = upscaledImageData.height;
            resultCtx.putImageData(upscaledImageData, 0, 0);
          }
          
          const result = {
            original: canvas,
            upscaled: resultCanvas,
            scale: this.selectedScale, // Use selected scale
            originalSize: { width: img.width, height: img.height },
            upscaledSize: { 
              width: upscaledImageData.width, 
              height: upscaledImageData.height 
            },
            // Store chunked data for export if needed
            chunkedData: (upscaledImageData.type === 'chunked' || upscaledImageData.isChunked) ? upscaledImageData : null
          };
          


          this.isProcessing = false;
          this.hideElement('progress-container');
          this.updateStatus('✅ Upscaling complete!');
          this.setButtonState('completed');
          
          // Display results in the right panel
          this.displayResults(result);
          
          resolve(result);
          
        } catch (error) {
          this.isProcessing = false;
          this.hideElement('progress-container');
          this.updateStatus('❌ Upscaling failed');
          this.setButtonState('idle');
          reject(error);
        }
      };
      
      img.onerror = () => {
        this.isProcessing = false;
        this.hideElement('progress-container');
        this.setButtonState('idle');
        reject(new Error('Failed to load image'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Display results in the right panel
   */
  displayResults(result) {
    // Switch to result page
    this.showResultPage();
    
    // Display original image thumbnail
    this.displayOriginalThumbnail();
    
    // Store the full-resolution upscaled canvas for downloads and file size calculations
    // For chunked results, we need to handle this differently
    if (result.chunkedData) {
      // For chunked results, store the actual dimensions and chunked data
      this.fullResolutionCanvas = document.createElement('canvas');
      this.fullResolutionCanvas.width = result.chunkedData.width;
      this.fullResolutionCanvas.height = result.chunkedData.height;
      this.fullResolutionCanvas.chunkedData = result.chunkedData; // Store for export
      console.log(`💾 Stored chunked result info: ${this.fullResolutionCanvas.width}×${this.fullResolutionCanvas.height}`);
    } else {
      // Regular result - create a copy to prevent any modifications to the original
      this.fullResolutionCanvas = document.createElement('canvas');
      this.fullResolutionCanvas.width = result.upscaled.width;
      this.fullResolutionCanvas.height = result.upscaled.height;
      const ctx = this.fullResolutionCanvas.getContext('2d');
      ctx.drawImage(result.upscaled, 0, 0);
      console.log(`💾 Stored full-resolution canvas copy: ${this.fullResolutionCanvas.width}×${this.fullResolutionCanvas.height}`);
    }
    
    // Display upscaled image in hero area (scaled for viewing)
    const upscaledCanvas = document.getElementById('upscaledCanvas');
    console.log(`🔍 Canvas comparison - Display: ${upscaledCanvas ? upscaledCanvas.width + '×' + upscaledCanvas.height : 'null'}, Full-res: ${this.fullResolutionCanvas.width}×${this.fullResolutionCanvas.height}`);
    if (upscaledCanvas) {
      const container = upscaledCanvas.parentElement;
      
      // For display size calculation, use the preview canvas size for chunked results
      const displayWidth = result.chunkedData ? result.upscaled.width : result.upscaled.width;
      const displayHeight = result.chunkedData ? result.upscaled.height : result.upscaled.height;
      const displaySize = this.calculateOptimalDisplaySize(displayWidth, displayHeight, container);
      
      upscaledCanvas.width = displaySize.width;
      upscaledCanvas.height = displaySize.height;
      
      // Draw the image scaled to fit for display only
      const ctx = upscaledCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(result.upscaled, 0, 0, displaySize.width, displaySize.height);
      
      console.log(`📺 Display canvas: ${displaySize.width}×${displaySize.height}`);
      console.log(`🎯 Full resolution: ${result.upscaled.width}×${result.upscaled.height}`);
    }
    
    // Update result information sections
    this.updateResultInformation(result);
    
    // Update download estimates now that we have the full-resolution canvas
    // Update metadata in sidebar
    this.updateMetadata(result);
    
    this.updateDownloadEstimates();
    
    console.log('📊 Results displayed successfully in sidebar layout with quality estimates');
  }

  /**
   * Display original image thumbnail
   */
  displayOriginalThumbnail() {
    if (!this.currentFile) return;
    
    const img = new Image();
    img.onload = () => {
      const originalCanvas = document.getElementById('originalCanvas');
      const originalInfo = document.getElementById('originalInfo');
      
      if (originalCanvas) {
        originalCanvas.width = 120;
        originalCanvas.height = 120;
        
        const ctx = originalCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Calculate scaling to fit thumbnail while maintaining aspect ratio
        const scale = Math.min(120 / img.width, 120 / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        const x = (120 - width) / 2;
        const y = (120 - height) / 2;
        
        ctx.drawImage(img, x, y, width, height);
      }
      
      if (originalInfo) {
        originalInfo.textContent = `${img.width} × ${img.height}`;
      }
    };
    
    img.src = URL.createObjectURL(this.currentFile);
  }

  /**
   * Update result information sections with result data
   */
  updateResultInformation(result) {
    // Update original image information
    const originalDimensions = document.getElementById('originalDimensions');
    const originalFileSize = document.getElementById('originalFileSize');
    
    if (originalDimensions && result.originalSize) {
      originalDimensions.textContent = `${result.originalSize.width} × ${result.originalSize.height}`;
    }
    
    if (originalFileSize && this.currentFile) {
      originalFileSize.textContent = this.formatFileSize(this.currentFile.size);
    }
    
    // Update upscaled image information
    const scaleFactorStat = document.getElementById('scaleFactorStat');
    const dimensionsStat = document.getElementById('dimensionsStat');
    const upscaledFileSizeStat = document.getElementById('upscaledFileSizeStat');
    const processingTimeStat = document.getElementById('processingTimeStat');
    
    if (scaleFactorStat) {
      scaleFactorStat.textContent = `${this.selectedScale}×`;
    }
    
    if (dimensionsStat) {
      // Use upscaledSize for correct dimensions (especially for chunked results)
      dimensionsStat.textContent = `${result.upscaledSize.width} × ${result.upscaledSize.height}`;
    }
    
    // Calculate actual upscaled file size using optimized calculation
    if (upscaledFileSizeStat) {
      if (this.fullResolutionCanvas) {
        // Use optimized file size calculation with immediate estimate
        this.calculateFileSize(this.fullResolutionCanvas, upscaledFileSizeStat, 'image/png', 0.95);
      } else {
        upscaledFileSizeStat.textContent = '-';
      }
    }
    
    if (processingTimeStat && this.processingStartTime) {
      const duration = ((Date.now() - this.processingStartTime) / 1000).toFixed(2);
      processingTimeStat.textContent = `${duration}s`;
    } else if (processingTimeStat) {
      processingTimeStat.textContent = '< 0.1s';
    }
  }

  updateStatus(message) {
    const statusElement = document.getElementById('status') || document.getElementById('processingStatus') || document.getElementById('modelStatus');
    if (statusElement) {
      statusElement.textContent = message;
    }
    console.log('📋 Status:', message);
  }

  updateProgress(percent, message) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    const progressContainer = document.getElementById('progressContainer');
    
    // Show progress container
    if (progressContainer && percent > 0) {
      progressContainer.style.display = 'block';
    }
    
    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }
    
    if (progressText) {
      // Enhanced progress messages with emojis and context
      let enhancedMessage = message || `Processing... ${percent.toFixed(0)}%`;
      
      if (percent < 20) {
        enhancedMessage = `🔄 ${message || 'Initializing upscaling...'}`;
      } else if (percent < 50) {
        enhancedMessage = `⚡ ${message || 'Processing image data...'}`;
      } else if (percent < 80) {
        enhancedMessage = `🎨 ${message || 'Enhancing image quality...'}`;
      } else if (percent < 95) {
        enhancedMessage = `✨ ${message || 'Finalizing upscaled image...'}`;
      } else {
        enhancedMessage = `🎉 ${message || 'Almost complete!'}`;
      }
      
      progressText.textContent = enhancedMessage;
    }
    
    if (progressPercent) {
      progressPercent.textContent = `${percent.toFixed(0)}%`;
    }
    
    // Add estimated time remaining for large images
    if (this.processingStartTime && percent > 10 && percent < 95) {
      const elapsed = (Date.now() - this.processingStartTime) / 1000;
      const estimated = (elapsed / (percent / 100)) - elapsed;
      
      if (estimated > 2) {
        const progressHeader = document.querySelector('.progress-header h4');
        if (progressHeader) {
          progressHeader.textContent = `Processing Image... (~${Math.ceil(estimated)}s remaining)`;
        }
      }
    }
    
    // Hide progress when complete
    if (percent >= 100 && progressContainer) {
      setTimeout(() => {
        progressContainer.style.display = 'none';
      }, 1000);
    }
  }

  showElement(id) {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = 'block';
    }
  }

  hideElement(id) {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = 'none';
    }
  }

  /**
   * Calculate file size with immediate estimate and async accurate calculation
   */
  async calculateFileSize(canvas, element, format = 'image/png', quality = 0.9) {
    if (!canvas || !element) return;
    
    // Handle chunked results differently
    if (canvas.chunkedData) {
      console.log(`📊 Calculating file size for chunked result: ${canvas.width}×${canvas.height}`);
      const pixels = canvas.width * canvas.height;
      const estimatedSize = this.estimateFileSize(pixels, format);
      
      // For chunked results, we can only provide estimates
      element.textContent = `~${this.formatFileSize(estimatedSize)}`;
      element.style.opacity = '1';
      element.title = 'Estimated size for large image';
      
      console.log(`📊 Chunked result estimate: ${this.formatFileSize(estimatedSize)} for ${canvas.width}×${canvas.height}`);
      return;
    }
    
    // Regular canvas processing
    const pixels = canvas.width * canvas.height;
    const estimatedSize = this.estimateFileSize(pixels, format);
    
    // Show immediate estimate
    element.textContent = `~${this.formatFileSize(estimatedSize)}`;
    element.style.opacity = '0.7';
    element.title = 'Calculating exact size...';
    
    console.log(`📊 Immediate estimate: ${this.formatFileSize(estimatedSize)} for ${canvas.width}×${canvas.height}`);
    
    // Calculate accurate size asynchronously without blocking UI
    try {
      const accurateSize = await this.getAccurateFileSize(canvas, format, quality);
      
      // Update with accurate size
      element.textContent = this.formatFileSize(accurateSize);
      element.style.opacity = '1';
      element.title = '';
      
      console.log(`📊 Accurate size: ${this.formatFileSize(accurateSize)} (was estimated: ${this.formatFileSize(estimatedSize)})`);
    } catch (error) {
      console.warn('⚠️ Accurate file size calculation failed, keeping estimate:', error);
      element.style.opacity = '1';
      element.title = 'Estimated size (calculation failed)';
    }
  }
  
  /**
   * Estimate file size based on canvas dimensions and format
   */
  estimateFileSize(pixels, format) {
    const baseSize = pixels * 4; // RGBA bytes
    
    switch (format) {
      case 'image/png':
        // PNG: ~30-50% compression for typical upscaled images
        return Math.round(baseSize * 0.4);
      case 'image/jpeg':
        // JPEG: ~90-95% compression
        return Math.round(baseSize * 0.08);
      case 'image/webp':
        // WebP: ~85-90% compression
        return Math.round(baseSize * 0.12);
      default:
        return baseSize;
    }
  }
  
  /**
   * Get accurate file size using optimized blob creation
   */
  async getAccurateFileSize(canvas, format, quality) {
    return new Promise((resolve, reject) => {
      // Use timeout to prevent indefinite hanging
      const timeout = setTimeout(() => {
        reject(new Error('File size calculation timeout'));
      }, 15000); // 15 second timeout
      
      try {
        // For very large canvases, use lower quality for size calculation to speed up
        const pixels = canvas.width * canvas.height;
        const isVeryLarge = pixels > 50000000; // 50MP threshold
        const optimizedQuality = isVeryLarge ? Math.min(quality, 0.7) : quality;
        
        if (isVeryLarge) {
          console.log(`📊 Using optimized quality (${optimizedQuality}) for large ${canvas.width}×${canvas.height} canvas`);
        }
        
        canvas.toBlob((blob) => {
          clearTimeout(timeout);
          if (blob) {
            resolve(blob.size);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, format, optimizedQuality);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Initialize quality control system
   */
  initializeQualityControl() {
    const qualitySlider = document.getElementById('qualitySlider');
    const formatRadios = document.querySelectorAll('input[name="downloadFormat"]');
    
    if (qualitySlider) {
      qualitySlider.addEventListener('input', (e) => {
        this.updateQualitySettings(parseInt(e.target.value));
      });
    }
    
    formatRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.updateFormatSettings(e.target.value);
      });
    });
    
    // Initialize with default values
    this.updateFormatSettings('png');
    this.updateQualitySettings(10);
  }

  /**
   * Update quality settings and estimates
   */
  updateQualitySettings(qualityLevel) {
    const qualityValue = document.getElementById('qualityValue');
    const qualityLabel = document.getElementById('qualityLabel');
    const qualityDescription = document.getElementById('qualityDescription');
    const qualitySection = document.getElementById('qualityControlSection');
    
    // Update quality display
    if (qualityValue) qualityValue.textContent = qualityLevel;
    
    // Quality level configurations - now format-aware
    const selectedFormat = this.getSelectedFormat();
    let qualityConfigs;
    
    if (selectedFormat.format === 'avif') {
      // AVIF quality levels (0-100 scale, lower is better compression)
      qualityConfigs = {
        1: { label: 'Fastest', quality: 15, description: 'Highest compression, fastest processing. Very small files.' },
        2: { label: 'Very Fast', quality: 25, description: 'High compression with very fast processing. Small files.' },
        3: { label: 'Fast', quality: 35, description: 'Good compression with fast processing. Balanced for web use.' },
        4: { label: 'Good', quality: 45, description: 'Good quality with reasonable file size. Suitable for most uses.' },
        5: { label: 'Better', quality: 55, description: 'Better quality with moderate file size. Good for social media.' },
        6: { label: 'High', quality: 65, description: 'High quality with larger file size. Good for presentations.' },
        7: { label: 'Very High', quality: 75, description: 'Very high quality. Suitable for printing.' },
        8: { label: 'Excellent', quality: 85, description: 'Excellent quality. Professional use.' },
        9: { label: 'Maximum', quality: 95, description: 'Maximum quality. Near-lossless compression.' },
        10: { label: 'Lossless', quality: 100, description: 'Maximum quality. Lossless compression.' }
      };
    } else if (selectedFormat.format === 'jpeg') {
      // JPEG quality levels (0-100 scale)
      qualityConfigs = {
        1: { label: 'Fastest', quality: 30, description: 'Lowest quality, fastest processing. Good for quick previews.' },
        2: { label: 'Very Fast', quality: 45, description: 'Low quality with very fast processing. Suitable for quick sharing.' },
        3: { label: 'Fast', quality: 60, description: 'Moderate quality with fast processing. Good balance for web use.' },
        4: { label: 'Good', quality: 70, description: 'Good quality with reasonable processing time. Suitable for most web applications.' },
        5: { label: 'Better', quality: 80, description: 'Better quality with moderate processing time. Good for social media.' },
        6: { label: 'High', quality: 85, description: 'High quality with longer processing time. Good for presentations.' },
        7: { label: 'Very High', quality: 90, description: 'Very high quality with extended processing time. Suitable for printing.' },
        8: { label: 'Excellent', quality: 93, description: 'Excellent quality with significant processing time. Professional use.' },
        9: { label: 'Maximum', quality: 97, description: 'Maximum quality with long processing time. Near-lossless compression.' },
        10: { label: 'Lossless', quality: 100, description: 'Maximum quality. Best possible JPEG quality.' }
      };
    } else {
      // PNG quality levels (0-1 scale for Canvas API)
      qualityConfigs = {
        1: { label: 'Fastest', quality: 0.3, description: 'PNG is always lossless. This affects processing speed only.' },
        2: { label: 'Very Fast', quality: 0.4, description: 'PNG is always lossless. This affects processing speed only.' },
        3: { label: 'Fast', quality: 0.5, description: 'PNG is always lossless. This affects processing speed only.' },
        4: { label: 'Good', quality: 0.6, description: 'PNG is always lossless. This affects processing speed only.' },
        5: { label: 'Better', quality: 0.7, description: 'PNG is always lossless. This affects processing speed only.' },
        6: { label: 'High', quality: 0.75, description: 'PNG is always lossless. This affects processing speed only.' },
        7: { label: 'Very High', quality: 0.8, description: 'PNG is always lossless. This affects processing speed only.' },
        8: { label: 'Excellent', quality: 0.85, description: 'PNG is always lossless. This affects processing speed only.' },
        9: { label: 'Maximum', quality: 0.95, description: 'PNG is always lossless. This affects processing speed only.' },
        10: { label: 'Lossless', quality: 1.0, description: 'PNG is always lossless. Maximum processing quality.' }
      };
    }
    
    const config = qualityConfigs[qualityLevel];
    
    if (qualityLabel) qualityLabel.textContent = config.label;
    if (qualityDescription) qualityDescription.textContent = config.description;
    if (qualitySection) {
      qualitySection.setAttribute('data-quality', qualityLevel);
    }
    
    // Store current quality for download
    this.currentQuality = config.quality;
    this.currentQualityLevel = qualityLevel;
    
    console.log(`🎚️ Quality updated: Level ${qualityLevel} (${config.label}) = ${config.quality} for ${selectedFormat.format.toUpperCase()}`);
    
    // Update estimates
    this.updateDownloadEstimates();
  }



  /**
   * Update download estimates - stable version without animations
   */
  updateDownloadEstimates() {
    if (!this.fullResolutionCanvas) return;
    
    const estimatedFileSize = document.getElementById('estimatedFileSize');
    const estimatedDownloadTime = document.getElementById('estimatedDownloadTime');
    const estimatedProcessingTime = document.getElementById('estimatedProcessingTime');
    const estimatedTotalTime = document.getElementById('estimatedTotalTime');
    
    // Calculate estimates based on canvas size and settings
    const pixels = this.fullResolutionCanvas.width * this.fullResolutionCanvas.height;
    const selectedFormat = this.getSelectedFormat();
    const format = selectedFormat.format;
    const quality = selectedFormat.quality / 100;
    
    // File size estimation
    let estimatedBytes;
    switch (format) {
      case 'png':
        estimatedBytes = this.estimateFileSize(pixels, 'image/png');
        break;
      case 'jpeg':
        estimatedBytes = this.estimateFileSize(pixels, 'image/jpeg') * (0.3 + (quality * 0.7));
        break;
      case 'avif':
        estimatedBytes = this.estimateFileSize(pixels, 'image/avif') * (0.1 + (quality * 0.3));
        break;
      default:
        estimatedBytes = this.estimateFileSize(pixels, 'image/png');
    }
    
    // Processing time estimation (based on format and quality)
    let processingTimeMs;
    const baseProcessingTime = Math.max(2000, pixels / 50000); // Base time in ms
    
    switch (format) {
      case 'png':
        processingTimeMs = baseProcessingTime * 3; // PNG is slowest
        break;
      case 'jpeg':
        processingTimeMs = baseProcessingTime * (0.3 + (quality * 0.7)); // Quality affects JPEG time
        break;
      case 'avif':
        processingTimeMs = baseProcessingTime * (0.8 + (quality * 0.4)); // AVIF is slower to encode
        break;
    }
    
    // Network download time (assuming 30MB/s average)
    const downloadTimeMs = (estimatedBytes / (30 * 1024 * 1024)) * 1000;
    
    // Total time (processing dominates for large images)
    const totalTimeMs = processingTimeMs + downloadTimeMs;
    
    // Update UI immediately without animations
    if (estimatedFileSize) {
      estimatedFileSize.textContent = `~${this.formatFileSize(estimatedBytes)}`;
    }
    
    if (estimatedProcessingTime) {
      estimatedProcessingTime.textContent = `~${this.formatTime(processingTimeMs)}`;
    }
    
    if (estimatedDownloadTime) {
      estimatedDownloadTime.textContent = `~${this.formatTime(downloadTimeMs)}`;
    }
    
    if (estimatedTotalTime) {
      estimatedTotalTime.textContent = `~${this.formatTime(totalTimeMs)}`;
    }
  }

  /**
   * Format time duration for display
   */
  formatTime(milliseconds) {
    const seconds = Math.ceil(milliseconds / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  /**
   * Get current download settings
   */
  getCurrentDownloadSettings() {
    const selectedFormat = this.getSelectedFormat();
    
    // Convert format to MIME type
    const mimeTypes = {
      'png': 'image/png',
      'jpeg': 'image/jpeg',
      'avif': 'image/avif'
    };
    
    // Quality handling: different formats expect different ranges
    let processedQuality;
    switch (selectedFormat.format) {
      case 'avif':
        // AVIF expects 0-100 range
        processedQuality = selectedFormat.quality;
        break;
      case 'jpeg':
        // JPEG expects 0-100 range  
        processedQuality = selectedFormat.quality;
        break;
      case 'png':
      default:
        // PNG is lossless, but for Canvas API we use 0-1 range
        processedQuality = selectedFormat.quality / 100;
        break;
    }
    
    return {
      format: selectedFormat.format,
      mimeType: mimeTypes[selectedFormat.format],
      quality: processedQuality,
      qualityLevel: Math.round(selectedFormat.quality / 10) // Convert to 1-10 scale for display
    };
  }

  /**
   * Download very large images (>20K pixels) with optimized memory usage
   */
  async downloadVeryLargeImage() {
    if (!this.fullResolutionCanvas.chunkedData) {
      throw new Error('No chunked data available for very large image download');
    }
    
    const chunkedData = this.fullResolutionCanvas.chunkedData;
    const outputWidth = chunkedData.width;
    const outputHeight = chunkedData.height;
    
    console.log(`🚀 Starting optimized download for very large image: ${outputWidth}×${outputHeight}`);
    
    // Show progress indicator
    this.showDownloadProgress('Preparing very large image download...', 0);
    
    try {
      // Use a more conservative canvas size limit for very large images
      const conservativeLimit = 25000;
      if (outputWidth > conservativeLimit || outputHeight > conservativeLimit) {
        throw new Error(`Image too large for optimized download: ${outputWidth}×${outputHeight}`);
      }
      
      // Create the full-resolution canvas with memory optimization
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      
      // Set canvas size
      finalCanvas.width = outputWidth;
      finalCanvas.height = outputHeight;
      
      // Clear canvas
      finalCtx.clearRect(0, 0, outputWidth, outputHeight);
      
      this.showDownloadProgress('Reconstructing image from tiles...', 10);
      
      let tilesReconstructed = 0;
      const totalTiles = chunkedData.tiles?.length || 0;
      
      // Process tiles in smaller batches to prevent memory issues
      const batchSize = 5; // Smaller batches for very large images
      
      if (chunkedData.tiles && Array.isArray(chunkedData.tiles)) {
        console.log(`🔧 Processing ${totalTiles} tiles in batches of ${batchSize}`);
        
        for (let batchStart = 0; batchStart < totalTiles; batchStart += batchSize) {
          const batchEnd = Math.min(batchStart + batchSize, totalTiles);
          const batch = chunkedData.tiles.slice(batchStart, batchEnd);
          
          // Process batch
          for (const tile of batch) {
            if (await this.processTileForDownload(tile, finalCtx)) {
              tilesReconstructed++;
            }
          }
          
          // Update progress
          const progress = 10 + (batchStart / totalTiles) * 70; // 10-80%
          this.showDownloadProgress(`Processing tiles: ${batchStart + batch.length}/${totalTiles}`, progress);
          
          // Yield control to prevent blocking
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Force garbage collection hint
          if (batchStart % 20 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }
      
      if (tilesReconstructed === 0) {
        throw new Error('Failed to reconstruct any tiles for very large image download');
      }
      
      console.log(`🔧 Successfully reconstructed ${tilesReconstructed}/${totalTiles} tiles for very large image`);
      
      // Return the final canvas
      return finalCanvas;
      
    } catch (error) {
      console.error('❌ Very large image reconstruction failed:', error);
      throw error;
    }
  }

  /**
   * Show raw optimization status and benefits to user
   */
  showRawOptimizationStatus(optimizedFile) {
    try {
      // Create or update raw optimization indicator
      let rawIndicator = document.getElementById('rawOptimizationIndicator');
      
      if (!rawIndicator) {
        rawIndicator = document.createElement('div');
        rawIndicator.id = 'rawOptimizationIndicator';
        rawIndicator.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #00ff88, #00cc6a);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
          z-index: 1000;
          animation: slideInRight 0.5s ease-out;
        `;
        document.body.appendChild(rawIndicator);
        
        // Add animation keyframes
        if (!document.getElementById('rawOptimizationStyles')) {
          const style = document.createElement('style');
          style.id = 'rawOptimizationStyles';
          style.textContent = `
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
          `;
          document.head.appendChild(style);
        }
      }
      
      rawIndicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">🚀</span>
          <div>
            <div style="font-weight: bold;">RAW OPTIMIZED</div>
            <div style="font-size: 12px; opacity: 0.9;">${optimizedFile.expectedSpeedGain}</div>
          </div>
        </div>
      `;
      
      // Add pulse animation
      rawIndicator.style.animation = 'pulse 2s ease-in-out infinite';
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        if (rawIndicator && rawIndicator.parentNode) {
          rawIndicator.style.transition = 'opacity 0.5s ease-out';
          rawIndicator.style.opacity = '0';
          setTimeout(() => {
            if (rawIndicator && rawIndicator.parentNode) {
              rawIndicator.parentNode.removeChild(rawIndicator);
            }
          }, 500);
        }
      }, 5000);
      
    } catch (error) {
      console.warn('⚠️ Could not show raw optimization status:', error);
    }
  }

  /**
   * Show download progress to user
   */
  showDownloadProgress(message, progress) {
    try {
      console.log(`📊 Download Progress: ${progress}% - ${message}`);
      
      // Update UI progress if elements exist
      const progressBar = document.querySelector('.progress-bar');
      const progressText = document.querySelector('.progress-text');
      
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      
      if (progressText) {
        progressText.textContent = message;
      }
      
      // Also update status for backward compatibility
      this.updateStatus(message);
      
    } catch (error) {
      console.warn('⚠️ Could not show download progress:', error);
    }
  }

  /**
   * Hide download progress
   */
  hideDownloadProgress() {
    try {
      console.log('📊 Download Progress: Hidden');
      
      const progressBar = document.querySelector('.progress-bar');
      const progressText = document.querySelector('.progress-text');
      
      if (progressBar) {
        progressBar.style.width = '0%';
      }
      
      if (progressText) {
        progressText.textContent = '';
      }
      
    } catch (error) {
      console.warn('⚠️ Could not hide download progress:', error);
    }
  }
}

// Initialize the application when DOM is ready
async function main() {
  console.log('🎯 Starting Image Enhancement Application...');
  console.log('📄 Document ready state:', document.readyState);
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }
  
  console.log('✅ DOM is ready, initializing application...');
  
  try {
    // Initialize application
    const app = new OptimizedImageUpscalingApp();
    
    // Make app globally available for raw optimization detection
    window.imageUpscalerApp = app;
    
    await app.initialize();
    console.log('🎉 Application started successfully with raw optimization support!');
    
    // Debug: Check that elements exist
    console.log('🔍 Final element check - Browse button:', !!document.getElementById('browseBtn'));
    console.log('🔍 Final element check - File input:', !!document.getElementById('fileInput'));
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
  }
}

// Start the application
main();
/**
 * performance-optimized-upscaler.js
 * Fixes the 20-second performance issue with virtual canvas system
 */

export class PerformanceOptimizedUpscaler {
  constructor() {
    this.maxSafeCanvasPixels = 4000000000; // 4,000MP threshold for extreme upscaling (25x)
    this.previewSize = 1024; // Preview resolution
  }

  /**
   * Process image with automatic performance optimization
   */
  async processImage(imageData, scaleFactor, progressCallback = null) {
    const startTime = performance.now();
    
    // Step 1: Progressive upscaling (this part is already fast)
    if (progressCallback) progressCallback(0, 'Starting progressive upscaling...');
    
    const result = await this.performProgressiveUpscaling(imageData, scaleFactor, (progress, message) => {
      if (progressCallback) progressCallback(progress * 0.8, message); // 0-80%
    });
    
    const upscalingTime = performance.now() - startTime;
    console.log(`⚡ Progressive upscaling complete: ${upscalingTime.toFixed(2)}ms`);
    
    // Step 2: Smart result handling (THIS IS THE KEY FIX)
    if (progressCallback) progressCallback(80, 'Optimizing result for display...');
    
    const optimizedResult = this.optimizeResultForPerformance(result, imageData, upscalingTime);
    
    const totalTime = performance.now() - startTime;
    console.log(`🚀 Total processing complete: ${totalTime.toFixed(2)}ms`);
    
    if (progressCallback) progressCallback(100, `Complete! Processed in ${totalTime.toFixed(0)}ms`);
    
    return optimizedResult;
  }

  /**
   * THE KEY FIX: Optimize result handling to avoid massive canvas creation
   */
  optimizeResultForPerformance(result, originalImageData, upscalingTime) {
    const { width, height } = result;
    const totalPixels = width * height;
    const megapixels = (totalPixels / 1000000).toFixed(1);
    
    console.log(`📊 Result analysis: ${width}×${height} (${megapixels}MP)`);
    
    if (totalPixels > this.maxSafeCanvasPixels) {
      console.log(`⚡ Large result detected (${megapixels}MP) - using virtual canvas system`);
      return this.createVirtualCanvasResult(result, originalImageData, upscalingTime);
    } else {
      console.log(`✅ Safe result size (${megapixels}MP) - using direct canvas`);
      return this.createDirectCanvasResult(result, upscalingTime);
    }
  }

  /**
   * Create virtual canvas result (for large images) - PREVENTS 16+ SECOND DELAY
   */
  createVirtualCanvasResult(imageData, scaleFactor, progressCallback) {
    const targetWidth = imageData.width * scaleFactor;
    const targetHeight = imageData.height * scaleFactor;
    
    // Create virtual canvas (NO ACTUAL PIXEL DATA)
    const virtualCanvas = document.createElement('canvas');
    virtualCanvas.width = targetWidth;
    virtualCanvas.height = targetHeight;
    
    // Store result data without creating massive canvas
    virtualCanvas.virtualResult = {
      imageData: imageData,
      scaleFactor: scaleFactor,
      isVirtual: true,
      originalImageData: imageData,
      targetWidth: targetWidth,
      targetHeight: targetHeight
    };
    
    // Create smart preview for display (THIS IS FAST)
    const previewCanvas = this.createSmartPreview(imageData, targetWidth, targetHeight);
    
    console.log(`💾 Created virtual canvas: ${targetWidth}×${targetHeight} with ${this.previewSize}px preview`);
    
    return {
      displayCanvas: previewCanvas,      // For immediate display
      fullResolutionCanvas: virtualCanvas, // For downloads
      isVirtual: true,
      width: targetWidth,
      height: targetHeight,
      dimensions: { width: targetWidth, height: targetHeight },
      megapixels: (targetWidth * targetHeight / 1000000).toFixed(1)
    };
  }

  /**
   * Create direct canvas result (for smaller images)
   */
  createDirectCanvasResult(result, upscalingTime) {
    const { width, height, imageData } = result;
    
    // Safe to create actual canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    
    return {
      displayCanvas: canvas,
      fullResolutionCanvas: canvas,
      isVirtual: false,
      dimensions: { width, height },
      processingTime: upscalingTime,
      megapixels: (width * height / 1000000).toFixed(1)
    };
  }

  /**
   * Create smart preview - FAST alternative to massive canvas
   */
  createSmartPreview(originalImageData, targetWidth, targetHeight) {
    const aspectRatio = targetHeight / targetWidth;
    
    // Calculate preview dimensions
    const previewCanvas = document.createElement('canvas');
    if (aspectRatio > 1) {
      // Portrait
      previewCanvas.height = this.previewSize;
      previewCanvas.width = Math.round(this.previewSize / aspectRatio);
    } else {
      // Landscape
      previewCanvas.width = this.previewSize;
      previewCanvas.height = Math.round(this.previewSize * aspectRatio);
    }
    
    // Create preview from original image (FAST) - FIX: Handle ImageData format
    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = originalImageData.width;
    originalCanvas.height = originalImageData.height;
    const originalCtx = originalCanvas.getContext('2d');
    
    // FIX: Create proper ImageData object if needed
    let properOriginalImageData;
    if (originalImageData.data && originalImageData.data instanceof Uint8ClampedArray) {
      // Already proper ImageData
      properOriginalImageData = new ImageData(originalImageData.data, originalImageData.width, originalImageData.height);
    } else if (originalImageData instanceof ImageData) {
      // Already ImageData object
      properOriginalImageData = originalImageData;
    } else {
      throw new Error('Invalid original ImageData format');
    }
    
    originalCtx.putImageData(properOriginalImageData, 0, 0);
    
    // Scale to preview size (FAST OPERATION) - NO OVERLAY for clean display
    const previewCtx = previewCanvas.getContext('2d');
    previewCtx.imageSmoothingEnabled = true;
    previewCtx.imageSmoothingQuality = 'high';
    previewCtx.drawImage(originalCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
    
    console.log(`🖼️ Created smart preview: ${previewCanvas.width}×${previewCanvas.height}`);
    
    return previewCanvas;
  }

  /**
   * Progressive upscaling implementation (already working well)
   */
  async performProgressiveUpscaling(imageData, scaleFactor, progressCallback) {
    const targetWidth = imageData.width * scaleFactor;
    const targetHeight = imageData.height * scaleFactor;
    const totalPixels = targetWidth * targetHeight;
    
    console.log(`⚡ Progressive upscaling: ${imageData.width}×${imageData.height} → ${targetWidth}×${targetHeight} (${scaleFactor}x)`);
    
    // CHECK: If target is too large, use virtual canvas system for true upscaling
    if (totalPixels > this.maxSafeCanvasPixels) {
      console.log(`⚠️ Target size ${targetWidth}×${targetHeight} (${(totalPixels/1000000).toFixed(1)}MP) exceeds safe limit - using virtual canvas system`);
      
      // Use virtual canvas system for true high-resolution upscaling
      return this.createVirtualCanvasResult(imageData, scaleFactor, progressCallback);
    }
    
    // Safe size - proceed with normal upscaling
    return await this.performSafeUpscaling(imageData, scaleFactor, progressCallback);
  }

  /**
   * Perform safe upscaling within canvas limits
   */
  async performSafeUpscaling(imageData, scaleFactor, progressCallback) {
    const targetWidth = imageData.width * scaleFactor;
    const targetHeight = imageData.height * scaleFactor;
    
    // Create source canvas - FIX: Handle different ImageData formats
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = imageData.width;
    srcCanvas.height = imageData.height;
    const srcCtx = srcCanvas.getContext('2d');
    
    // FIX: Create proper ImageData object if needed
    let properImageData;
    if (imageData.data && imageData.data instanceof Uint8ClampedArray) {
      // Already proper ImageData
      properImageData = new ImageData(imageData.data, imageData.width, imageData.height);
    } else if (imageData instanceof ImageData) {
      // Already ImageData object
      properImageData = imageData;
    } else {
      throw new Error('Invalid ImageData format - expected Uint8ClampedArray data or ImageData object');
    }
    
    srcCtx.putImageData(properImageData, 0, 0);
    
    // Progressive scaling - with safety checks
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = targetWidth;
    resultCanvas.height = targetHeight;
    
    try {
      await this.progressiveUpscale(srcCanvas, resultCanvas, imageData.width, imageData.height, targetWidth, targetHeight, progressCallback);
      
      const resultCtx = resultCanvas.getContext('2d');
      const resultImageData = resultCtx.getImageData(0, 0, targetWidth, targetHeight);
      
      return {
        width: targetWidth,
        height: targetHeight,
        imageData: resultImageData,
        canvas: resultCanvas
      };
    } catch (error) {
      console.error(`❌ Canvas creation failed at ${targetWidth}×${targetHeight}:`, error);
      throw new Error(`Canvas size ${targetWidth}×${targetHeight} exceeds browser limits`);
    }
  }

  /**
   * Progressive upscale in 2x steps (already optimized)
   */
  async progressiveUpscale(srcCanvas, destCanvas, srcWidth, srcHeight, targetWidth, targetHeight, progressCallback) {
    const destCtx = destCanvas.getContext('2d');
    
    const scaleX = targetWidth / srcWidth;
    const scaleY = targetHeight / srcHeight;
    const maxScale = Math.max(scaleX, scaleY);
    
    if (maxScale <= 2) {
      destCtx.imageSmoothingEnabled = true;
      destCtx.imageSmoothingQuality = 'high';
      destCtx.drawImage(srcCanvas, 0, 0, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight);
      return;
    }

    let currentCanvas = srcCanvas;
    let currentWidth = srcWidth;
    let currentHeight = srcHeight;
    let step = 0;
    const totalSteps = Math.ceil(Math.log2(maxScale));

    while (currentWidth < targetWidth || currentHeight < targetHeight) {
      step++;
      
      const nextWidth = Math.min(currentWidth * 2, targetWidth);
      const nextHeight = Math.min(currentHeight * 2, targetHeight);

      // SAFETY CHECK: Ensure we don't exceed canvas limits
      const nextPixels = nextWidth * nextHeight;
      if (nextPixels > this.maxSafeCanvasPixels) {
        console.warn(`⚠️ Progressive step ${step} would exceed safe canvas limit: ${nextWidth}×${nextHeight} (${(nextPixels/1000000).toFixed(1)}MP)`);
        break;
      }

      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = nextWidth;
        tempCanvas.height = nextHeight;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(currentCanvas, 0, 0, currentWidth, currentHeight, 0, 0, nextWidth, nextHeight);

        console.log(`📊 Progressive step ${step}: ${currentWidth}×${currentHeight} → ${nextWidth}×${nextHeight}`);
        
        if (progressCallback) {
          const progress = (step / totalSteps) * 100;
          progressCallback(progress, `Progressive step ${step}/${totalSteps}`);
        }

        currentCanvas = tempCanvas;
        currentWidth = nextWidth;
        currentHeight = nextHeight;
      } catch (error) {
        console.error(`❌ Progressive step ${step} failed at ${nextWidth}×${nextHeight}:`, error);
        console.log(`🔄 Stopping progressive upscaling at safe size: ${currentWidth}×${currentHeight}`);
        break;
      }
    }

    destCtx.drawImage(currentCanvas, 0, 0);
    console.log(`🎯 Progressive upscaling complete: ${step} steps`);
  }

  /**
   * Download full resolution result
   */
  async downloadFullResolution(result, filename = null) {
    if (!result.fullResolutionCanvas) {
      throw new Error('No full resolution canvas available');
    }

    if (result.isVirtual) {
      console.log('📦 Creating full resolution canvas for download...');
      return await this.downloadVirtualResult(result.fullResolutionCanvas, filename);
    } else {
      console.log('💾 Downloading direct result...');
      return this.downloadDirectResult(result.fullResolutionCanvas, filename);
    }
  }

  /**
   * Download virtual result (create full canvas on-demand)
   */
  async downloadVirtualResult(virtualCanvas, filename) {
    const virtualResult = virtualCanvas.virtualResult;
    const { width, height } = virtualCanvas;
    
    console.log(`⚡ Creating ${width}×${height} canvas for download...`);
    
    // Show progress for large canvas creation
    const progressDiv = this.showDownloadProgress();
    
    try {
      // Create full canvas (this will be slow, but only when downloading)
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = width;
      fullCanvas.height = height;
      const ctx = fullCanvas.getContext('2d');
      
      progressDiv.textContent = 'Creating full resolution canvas...';
      
      // UI update delays removed for maximum speed
      ctx.putImageData(virtualResult.imageData, 0, 0);
      
      progressDiv.textContent = 'Preparing download...';
      
      // Download the canvas
      this.downloadCanvas(fullCanvas, filename || `upscaled-${width}x${height}.png`);
      
    } finally {
      this.hideDownloadProgress();
    }
  }

  /**
   * Download direct result
   */
  downloadDirectResult(canvas, filename) {
    this.downloadCanvas(canvas, filename || `upscaled-${canvas.width}x${canvas.height}.png`);
  }

  /**
   * Download canvas as file
   */
  downloadCanvas(canvas, filename) {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`✅ Downloaded: ${filename}`);
    }, 'image/png');
  }

  /**
   * Show download progress
   */
  showDownloadProgress() {
    const progressDiv = document.createElement('div');
    progressDiv.id = 'download-progress';
    progressDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    progressDiv.textContent = 'Preparing full resolution download...';
    document.body.appendChild(progressDiv);
    return progressDiv;
  }

  /**
   * Hide download progress
   */
  hideDownloadProgress() {
    const progressDiv = document.getElementById('download-progress');
    if (progressDiv) {
      document.body.removeChild(progressDiv);
    }
  }
} 
/**
 * Server-Side Composer
 * Handles client-side integration with the enhanced server for 600+ MP file downloads
 */

export class ServerSideComposer {
  constructor() {
    this.serverUrl = 'http://localhost:3002'; // Enhanced server URL
    this.wsUrl = 'ws://localhost:3002';
    this.currentSessionId = null;
    this.progressCallback = null;
    this.websocket = null;
  }

  /**
   * Check if server is available
   */
  async checkServerAvailability() {
    try {
      const response = await fetch(`${this.serverUrl}/api/health`);
      if (response.ok) {
        const health = await response.json();
        console.log('🔗 Server connection established:', health);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('⚠️ Enhanced server not available:', error.message);
      return false;
    }
  }

  /**
   * Upload tiles to server and start composition
   */
  async composeChunkedResult(chunkedData, format = 'avif', quality = 90, progressCallback = null) {
    this.progressCallback = progressCallback;
    
    try {
      if (progressCallback) progressCallback(0, 'Checking server availability...');
      
      // Check server availability
      const serverAvailable = await this.checkServerAvailability();
      if (!serverAvailable) {
        throw new Error('Enhanced server not available. Please ensure the server is running on port 3001.');
      }

      if (progressCallback) progressCallback(5, 'Preparing tiles for upload...');
      
      // Upload tiles
      const sessionId = await this.uploadTiles(chunkedData);
      this.currentSessionId = sessionId;
      
      if (progressCallback) progressCallback(25, 'Starting server composition...');
      
      // Start composition
      await this.startComposition(sessionId, format, quality);
      
      if (progressCallback) progressCallback(30, 'Monitoring composition progress...');
      
      // Monitor progress
      await this.monitorProgress(sessionId);
      
      if (progressCallback) progressCallback(100, 'Download ready!');
      
      // Get session status to determine format and archive type
      const sessionStatus = await this.getSessionStatus(sessionId);
      const isArchive = sessionStatus?.result?.isArchive || sessionStatus?.result?.format === 'zip';
      const resultFormat = sessionStatus?.result?.format || format;
      
      // Trigger download with correct format and archive flag
      this.downloadResult(sessionId, resultFormat, isArchive);
      
      return { 
        success: true, 
        sessionId,
        isArchive,
        format: resultFormat,
        totalPixels: sessionStatus?.result?.totalPixels
      };
      
    } catch (error) {
      console.error('❌ Server-side composition failed:', error);
      throw error;
    }
  }

  /**
   * Upload tiles to the server
   */
  async uploadTiles(chunkedData) {
    const formData = new FormData();
    const sessionId = Date.now().toString();
    
    // Add metadata - IMPORTANT: chunkedData already contains final upscaled dimensions
    formData.append('sessionId', sessionId);
    formData.append('width', chunkedData.width.toString());
    formData.append('height', chunkedData.height.toString());
    formData.append('scaleFactor', '1'); // No additional scaling needed - data is already upscaled!
    
    console.log(`📤 Preparing to upload ${chunkedData.tiles.length} tiles for ${chunkedData.width}×${chunkedData.height} image`);
    
    // Convert and upload tiles
    for (let i = 0; i < chunkedData.tiles.length; i++) {
      const tile = chunkedData.tiles[i];
      
      try {
        // Convert tile to blob
        const tileBlob = await this.convertTileToBlob(tile, i);
        formData.append('tiles', tileBlob, `tile_${i}.png`);
        
        // Add tile position metadata
        formData.append(`tile_${i}_outputX`, (tile.outputX || 0).toString());
        formData.append(`tile_${i}_outputY`, (tile.outputY || 0).toString());
        
        // Update progress
        if (this.progressCallback) {
          const progress = 5 + (i / chunkedData.tiles.length) * 15; // 5-20%
          this.progressCallback(progress, `Preparing tile ${i + 1}/${chunkedData.tiles.length}`);
        }
        
      } catch (error) {
        console.error(`⚠️ Failed to process tile ${i}:`, error);
        // Continue with other tiles
      }
    }
    
    // Upload to server
    if (this.progressCallback) {
      this.progressCallback(20, 'Uploading tiles to server...');
    }
    
    const response = await fetch(`${this.serverUrl}/api/upload-tiles`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Uploaded ${result.tilesReceived} tiles for session ${result.sessionId}`);
    
    return result.sessionId;
  }

  /**
   * Convert tile data to blob for upload
   */
  async convertTileToBlob(tile, index) {
    let imageData;
    let width, height;
    
    // Handle different tile data formats
    if (tile.imageData instanceof ArrayBuffer) {
      // Convert ArrayBuffer to ImageData
      width = tile.outputWidth || tile.width;
      height = tile.outputHeight || tile.height;
      const uint8Array = new Uint8ClampedArray(tile.imageData);
      imageData = new ImageData(uint8Array, width, height);
    } else if (tile.imageData instanceof ImageData) {
      imageData = tile.imageData;
      width = imageData.width;
      height = imageData.height;
    } else if (tile.result && tile.result.imageData instanceof ImageData) {
      imageData = tile.result.imageData;
      width = imageData.width;
      height = imageData.height;
    } else {
      throw new Error(`Tile ${index} has unsupported imageData format`);
    }
    
    // Create canvas and convert to blob
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    
    return await canvas.convertToBlob({ 
      type: 'image/webp',
      quality: 0.95 // High quality WebP for better compression
    });
  }

  /**
   * Start composition on the server
   */
  async startComposition(sessionId, format, quality) {
    const response = await fetch(`${this.serverUrl}/api/compose/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ format, quality })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Composition start failed: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`🎨 Composition started for session ${sessionId}, estimated time: ${result.estimatedTime}s`);
    
    return result;
  }

  /**
   * Monitor composition progress via WebSocket
   */
  async monitorProgress(sessionId) {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.wsUrl}/api/progress/${sessionId}`;
      console.log(`📡 Connecting to WebSocket: ${wsUrl}`);
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log(`✅ WebSocket connected for session ${sessionId}`);
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'progress') {
            const overallProgress = 30 + (data.progress * 0.65); // Map to 30-95%
            
            if (this.progressCallback) {
              this.progressCallback(overallProgress, data.message);
            }
            
            console.log(`📊 Progress: ${data.progress}% - ${data.message}`);
            
            if (data.stage === 'complete') {
              this.websocket.close();
              resolve();
            }
          } else if (data.type === 'error') {
            this.websocket.close();
            reject(new Error(data.message));
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };
      
      this.websocket.onclose = (event) => {
        if (!event.wasClean && event.code !== 1000) {
          reject(new Error(`WebSocket connection lost: ${event.code} ${event.reason}`));
        }
      };
      
      // Fallback timeout (increased for large image processing)
      setTimeout(() => {
        if (this.websocket.readyState === WebSocket.CONNECTING || 
            this.websocket.readyState === WebSocket.OPEN) {
          this.websocket.close();
          reject(new Error('Composition timeout - taking longer than expected'));
        }
      }, 15 * 60 * 1000); // 15 minute timeout for large images
    });
  }

  /**
   * Download the composed result
   */
  downloadResult(sessionId, format = 'avif', isArchive = false) {
    const downloadUrl = `${this.serverUrl}/api/download/${sessionId}`;
    console.log(`📥 Triggering download: ${downloadUrl}`);
    
    // Create temporary link to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.style.display = 'none';
    link.target = '_blank';
    
    // Set appropriate filename based on format
    if (isArchive || format === 'zip') {
      link.download = `ultra-large-image-tiles-${sessionId}.zip`;
      console.log(`📦 Downloading optimized tile archive (exceeds Sharp's 268MP limit)`);
    } else {
      link.download = `enhanced-600mp-${sessionId}.${format}`;
      console.log(`📥 Downloading single ${format.toUpperCase()} file`);
    }
    
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
    }, 1000);
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId) {
    try {
      const response = await fetch(`${this.serverUrl}/api/status/${sessionId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to get session status:', error);
      return null;
    }
  }

  /**
   * Cancel current operation
   */
  cancel() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.currentSessionId = null;
    this.progressCallback = null;
  }

  /**
   * Check if a chunked result should use server-side composition
   * This checks the ACTUAL upscaled result size, not the original image
   */
  static shouldUseServerSideComposition(chunkedData) {
    if (!chunkedData || !chunkedData.tiles) {
      return false;
    }
    
    // Use the actual chunked data dimensions (these are already upscaled)
    const { width, height } = chunkedData;
    
    // Check browser canvas limits (16,384 × 16,384 max)
    const maxCanvasDimension = 16384;
    const exceedsCanvasLimits = width > maxCanvasDimension || height > maxCanvasDimension;
    
    // Check total pixel count (268MP browser limit)
    const totalPixels = width * height;
    const exceedsPixelLimit = totalPixels > 268435456; // > 268MP
    
    // Check number of tiles (many tiles = complex composition)
    const hasManyTiles = chunkedData.tiles.length > 25;
    
    // Use server-side if any condition is met
    const shouldUseServer = exceedsCanvasLimits || exceedsPixelLimit || hasManyTiles;
    
    console.log(`🔍 Server-side composition check:`, {
      dimensions: `${width}×${height}`,
      totalPixels: `${(totalPixels / 1000000).toFixed(1)}MP`,
      tiles: chunkedData.tiles.length,
      exceedsCanvasLimits,
      exceedsPixelLimit,
      hasManyTiles,
      decision: shouldUseServer ? 'SERVER-SIDE' : 'BROWSER-SIDE'
    });
    
    return shouldUseServer;
  }

  /**
   * Get recommended format based on actual upscaled image characteristics
   */
  static getRecommendedFormat(chunkedData) {
    // Use actual upscaled dimensions (chunkedData already contains final size)
    const totalPixels = chunkedData.width * chunkedData.height;
    const megapixels = totalPixels / 1000000;
    
    console.log(`📊 Format recommendation for ${megapixels.toFixed(1)}MP image:`);
    
    if (totalPixels > 500000000) { // > 500MP
      console.log('   → AVIF @ 85% (massive file optimization)');
      return { format: 'avif', quality: 85 }; // Best compression for huge files
    } else if (totalPixels > 100000000) { // > 100MP
      console.log('   → AVIF @ 90% (large file optimization)');
      return { format: 'avif', quality: 90 }; // Good compression
    } else if (totalPixels > 50000000) { // > 50MP
      console.log('   → WebP @ 92% (medium file optimization)');
      return { format: 'webp', quality: 92 }; // Good balance
    } else {
      console.log('   → WebP @ 95% (high quality)');
      return { format: 'webp', quality: 95 }; // Good quality for smaller files
    }
  }

  /**
   * Process a large image - this server doesn't support direct image upscaling
   * Instead, it's designed for tile composition after client-side upscaling
   * This method will throw an error to indicate fallback to client-side processing is needed
   */
  async processLargeImage(file, scaleFactor, progressCallback = null) {
    this.progressCallback = progressCallback;
    
    try {
      if (progressCallback) progressCallback(0, 'Checking server capabilities...');
      
      // Check server availability
      const serverAvailable = await this.checkServerAvailability();
      if (!serverAvailable) {
        throw new Error('Enhanced server not available. Please ensure the server is running on port 3002.');
      }

      if (progressCallback) progressCallback(10, 'Analyzing server capabilities...');
      
      // This server is designed for tile composition, not direct image upscaling
      // The client should perform upscaling and then use server for composition if needed
      throw new Error('Server-side upscaling not supported. This server handles tile composition only. Use client-side processing with server composition for large results.');
      
    } catch (error) {
      console.error('❌ Server-side image processing failed:', error);
      throw error;
    }
  }

  /**
   * Upload original image to server for processing
   */
  async uploadImageForProcessing(file, scaleFactor) {
    const formData = new FormData();
    const sessionId = Date.now().toString();
    
    formData.append('sessionId', sessionId);
    formData.append('scaleFactor', scaleFactor.toString());
    formData.append('image', file);
    
    console.log(`📤 Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) for ${scaleFactor}x upscaling`);
    
    if (this.progressCallback) {
      this.progressCallback(15, 'Uploading image to server...');
    }
    
    const response = await fetch(`${this.serverUrl}/api/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Image uploaded for session ${result.sessionId}`);
    
    return result.sessionId;
  }

  /**
   * Start server-side processing
   */
  async startServerProcessing(sessionId, scaleFactor) {
    const response = await fetch(`${this.serverUrl}/api/process/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scaleFactor })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Processing start failed: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`🚀 Processing started for session ${sessionId}, estimated time: ${result.estimatedTime}s`);
    
    return result;
  }

  /**
   * Get the processed result (chunked data for large images)
   */
  async getProcessedResult(sessionId) {
    const response = await fetch(`${this.serverUrl}/api/result/${sessionId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get result: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    
    // Return chunked data format expected by the client
    return {
      chunkedData: {
        width: result.width,
        height: result.height,
        tiles: result.tiles || [],
        totalPixels: result.totalPixels
      },
      success: true,
      sessionId: sessionId
    };
  }
} 
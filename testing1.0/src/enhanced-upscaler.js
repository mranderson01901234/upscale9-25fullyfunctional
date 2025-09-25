/**
 * Enhanced Upscaler with Web Workers and Adaptive Tiling
 * Provides ultra-fast client-side upscaling for large images
 */
export class EnhancedUpscaler {
  constructor() {
    this.isInitialized = false;
    this.scaleFactor = 4;
    this.workers = [];
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    this.tileSize = 512; // Base tile size
    this.overlap = 32; // Overlap to prevent seams
    this.adaptiveTiler = null;
    this.progressCallback = null;
  }

  /**
   * Initialize the enhanced upscaler with web workers
   */
  async initialize() {
    console.log('🚀 Initializing Enhanced Upscaler with Web Workers + Tiling...');
    
    try {
      // Create adaptive tiler
      this.adaptiveTiler = new AdaptiveTiler();
      await this.adaptiveTiler.initialize();
      
      // Initialize web workers for parallel processing
      await this.initializeWorkers();
      
      this.isInitialized = true;
      console.log(`✅ Enhanced Upscaler initialized with ${this.workers.length} workers`);
      return true;
    } catch (error) {
      console.error('❌ Enhanced Upscaler initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Initialize web workers for parallel tile processing
   */
  async initializeWorkers() {
    const workerCount = Math.min(this.maxWorkers, 4); // Cap at 4 workers for stability
    
    for (let i = 0; i < workerCount; i++) {
      try {
        const worker = new Worker('/src/worker-upscaler.js', { type: 'module' });
        
        // Test worker with a simple message
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Worker timeout')), 5000);
          
          worker.onmessage = (e) => {
            if (e.data.type === 'ready') {
              clearTimeout(timeout);
              resolve();
            }
          };
          
          worker.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
          
          worker.postMessage({ type: 'init' });
        });
        
        this.workers.push(worker);
      } catch (error) {
        console.warn(`⚠️ Failed to initialize worker ${i}:`, error.message);
      }
    }
    
    if (this.workers.length === 0) {
      throw new Error('No workers could be initialized');
    }
    
    console.log(`✅ Initialized ${this.workers.length} web workers`);
  }

  /**
   * Enhanced upscaling with tiling and web workers
   */
  async enhance(imageData, progressCallback) {
    if (!this.isInitialized) {
      throw new Error('Enhanced upscaler not initialized');
    }
    
    this.progressCallback = progressCallback;
    const startTime = performance.now();
    
    if (progressCallback) progressCallback(0, 'Analyzing image for optimal tiling...');
    
    // Calculate output dimensions
    const outputWidth = imageData.width * this.scaleFactor;
    const outputHeight = imageData.height * this.scaleFactor;
    
    console.log(`🔧 Enhanced upscaling: ${imageData.width}×${imageData.height} → ${outputWidth}×${outputHeight}`);
    
    // Create tiles using adaptive tiler
    if (progressCallback) progressCallback(5, 'Creating optimal tile layout...');
    
    const tiles = this.adaptiveTiler.createTiles(imageData, this.tileSize, this.overlap);
    console.log(`📊 Created ${tiles.length} tiles for parallel processing`);
    
    // Process tiles in parallel using web workers
    if (progressCallback) progressCallback(15, `Processing ${tiles.length} tiles in parallel...`);
    
    const processedTiles = await this.processTilesInParallel(tiles);
    
    // Compose final result
    if (progressCallback) progressCallback(85, 'Composing final high-resolution result...');
    
    const result = await this.composeTiles(processedTiles, outputWidth, outputHeight);
    
    const processingTime = performance.now() - startTime;
    console.log(`✅ Enhanced upscaling complete: ${processingTime.toFixed(2)}ms`);
    
    if (progressCallback) progressCallback(100, 'Enhanced upscaling complete!');
    
    // Create chunked data structure for large image handling
    const chunkedData = {
      width: outputWidth,
      height: outputHeight,
      tiles: processedTiles.map((tile, index) => ({
        index,
        x: tile.outputX,
        y: tile.outputY,
        width: tile.outputWidth,
        height: tile.outputHeight,
        canvas: tile.canvas,
        imageData: tile.processedData
      })),
      getChunk: (x, y, width, height) => {
        // Find tiles that intersect with the requested chunk
        const relevantTiles = processedTiles.filter(tile => 
          !(tile.outputX + tile.outputWidth <= x || 
            tile.outputX >= x + width || 
            tile.outputY + tile.outputHeight <= y || 
            tile.outputY >= y + height)
        );
        
        // Create a canvas for the chunk
        const chunkCanvas = document.createElement('canvas');
        chunkCanvas.width = width;
        chunkCanvas.height = height;
        const ctx = chunkCanvas.getContext('2d');
        
        // Composite relevant tiles into the chunk
        relevantTiles.forEach(tile => {
          const srcX = Math.max(0, x - tile.outputX);
          const srcY = Math.max(0, y - tile.outputY);
          const dstX = Math.max(0, tile.outputX - x);
          const dstY = Math.max(0, tile.outputY - y);
          const copyWidth = Math.min(tile.outputWidth - srcX, width - dstX);
          const copyHeight = Math.min(tile.outputHeight - srcY, height - dstY);
          
          if (copyWidth > 0 && copyHeight > 0) {
            ctx.drawImage(tile.canvas, srcX, srcY, copyWidth, copyHeight, dstX, dstY, copyWidth, copyHeight);
          }
        });
        
        return ctx.getImageData(0, 0, width, height);
      }
    };
    
    // Return result with chunked data for large image handling
    return {
      ...result,
      chunkedData
    };
  }

  /**
   * Process tiles in parallel using web workers
   */
  async processTilesInParallel(tiles) {
    const processedTiles = new Array(tiles.length);
    const workerPromises = [];
    
    for (let i = 0; i < tiles.length; i++) {
      const workerIndex = i % this.workers.length;
      const worker = this.workers[workerIndex];
      const tile = tiles[i];
      
      const promise = new Promise((resolve, reject) => {
        const messageHandler = (e) => {
          if (e.data.tileIndex === i) {
            worker.removeEventListener('message', messageHandler);
            
            if (e.data.error) {
              reject(new Error(e.data.error));
            } else {
              // Create canvas from processed data
              const canvas = document.createElement('canvas');
              canvas.width = e.data.outputWidth;
              canvas.height = e.data.outputHeight;
              const ctx = canvas.getContext('2d');
              
              const imageData = new ImageData(
                new Uint8ClampedArray(e.data.processedData),
                e.data.outputWidth,
                e.data.outputHeight
              );
              
              ctx.putImageData(imageData, 0, 0);
              
              processedTiles[i] = {
                ...tile,
                canvas,
                processedData: imageData,
                outputWidth: e.data.outputWidth,
                outputHeight: e.data.outputHeight,
                outputX: tile.x * this.scaleFactor,
                outputY: tile.y * this.scaleFactor
              };
              
              // Update progress
              const completedTiles = processedTiles.filter(t => t).length;
              const progress = 15 + (completedTiles / tiles.length) * 70; // 15-85%
              if (this.progressCallback) {
                this.progressCallback(progress, `Processed ${completedTiles}/${tiles.length} tiles`);
              }
              
              resolve();
            }
          }
        };
        
        worker.addEventListener('message', messageHandler);
        
        worker.postMessage({
          type: 'upscale',
          tileIndex: i,
          imageData: {
            data: Array.from(tile.imageData.data),
            width: tile.imageData.width,
            height: tile.imageData.height
          },
          scaleFactor: this.scaleFactor
        });
      });
      
      workerPromises.push(promise);
    }
    
    await Promise.all(workerPromises);
    return processedTiles;
  }

  /**
   * Compose tiles into final result
   */
  async composeTiles(tiles, outputWidth, outputHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw all tiles onto the final canvas
    tiles.forEach(tile => {
      ctx.drawImage(tile.canvas, tile.outputX, tile.outputY);
    });
    
    return {
      width: outputWidth,
      height: outputHeight,
      canvas,
      imageData: ctx.getImageData(0, 0, outputWidth, outputHeight)
    };
  }

  /**
   * Set scale factor
   */
  setScaleFactor(factor) {
    this.scaleFactor = factor;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.workers.forEach(worker => {
      worker.terminate();
    });
    this.workers = [];
    this.isInitialized = false;
    
    if (this.adaptiveTiler) {
      this.adaptiveTiler.cleanup();
      this.adaptiveTiler = null;
    }
  }
}

/**
 * Adaptive Tiler - Creates optimal tile layout for images
 */
class AdaptiveTiler {
  constructor() {
    this.browserInfo = this.detectBrowser();
  }

  async initialize() {
    console.log('🔧 Initializing Adaptive Tiler...');
    return true;
  }

  /**
   * Create tiles for an image
   */
  createTiles(imageData, baseTileSize, overlap) {
    const { width, height } = imageData;
    const tiles = [];
    
    // Adapt tile size based on image size and browser capabilities
    const tileSize = this.getOptimalTileSize(width, height, baseTileSize);
    const step = tileSize - overlap;
    
    console.log(`📊 Tiling ${width}×${height} image with ${tileSize}px tiles (${overlap}px overlap)`);
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const tileWidth = Math.min(tileSize, width - x);
        const tileHeight = Math.min(tileSize, height - y);
        
        // Extract tile image data
        const tileImageData = this.extractTile(imageData, x, y, tileWidth, tileHeight);
        
        tiles.push({
          x,
          y,
          width: tileWidth,
          height: tileHeight,
          imageData: tileImageData
        });
      }
    }
    
    console.log(`✅ Created ${tiles.length} tiles`);
    return tiles;
  }

  /**
   * Extract a tile from image data
   */
  extractTile(imageData, x, y, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Create temporary canvas with full image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    
    // Extract tile
    ctx.drawImage(tempCanvas, x, y, width, height, 0, 0, width, height);
    
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Get optimal tile size based on image dimensions and browser
   */
  getOptimalTileSize(width, height, baseTileSize) {
    const totalPixels = width * height;
    
    // Adjust tile size based on image size
    if (totalPixels > 50000000) { // 50MP+
      return Math.min(baseTileSize, 256); // Smaller tiles for very large images
    } else if (totalPixels > 10000000) { // 10MP+
      return Math.min(baseTileSize, 384);
    } else {
      return baseTileSize;
    }
  }

  /**
   * Detect browser for optimization
   */
  detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return { browser: 'chrome', engine: 'blink' };
    if (ua.includes('Firefox')) return { browser: 'firefox', engine: 'gecko' };
    if (ua.includes('Safari')) return { browser: 'safari', engine: 'webkit' };
    return { browser: 'unknown', engine: 'unknown' };
  }

  cleanup() {
    // Cleanup if needed
  }
} 
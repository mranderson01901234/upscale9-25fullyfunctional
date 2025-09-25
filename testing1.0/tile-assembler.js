import sharp from 'sharp';
import { readFile, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Automated Tile Assembler - Reconstructs large images from tiles
 * Handles images that exceed Sharp's pixel limits by processing in chunks
 */
export class TileAssembler {
  constructor() {
    this.maxChunkPixels = 200000000; // 200MP chunks to stay under Sharp's 268MP limit
    this.outputFormats = ['avif', 'webp', 'jpeg', 'png'];
  }

  /**
   * Assemble tiles into a single image file
   */
  async assembleTiles(tilesData, outputPath, options = {}) {
    const {
      format = 'avif',
      quality = 90,
      width,
      height,
      progressCallback
    } = options;

    console.log(`🔧 Starting tile assembly: ${tilesData.length} tiles → ${width}×${height} ${format.toUpperCase()}`);

    if (progressCallback) progressCallback(5, 'Analyzing tile layout...');

    // Sort tiles by position for efficient processing
    const sortedTiles = this.sortTilesByPosition(tilesData);
    
    if (progressCallback) progressCallback(15, 'Calculating optimal processing strategy...');

    // Check if we can process as single image or need chunked approach
    const totalPixels = width * height;
    
    if (totalPixels <= this.maxChunkPixels) {
      // Small enough for direct processing
      await this.assembleDirectly(sortedTiles, width, height, outputPath, format, quality, progressCallback);
      return outputPath;
    } else {
      // Use chunked processing for very large images
      return await this.assembleInChunks(sortedTiles, width, height, outputPath, format, quality, progressCallback);
    }
  }

  /**
   * Direct assembly for images under the pixel limit
   */
  async assembleDirectly(tiles, width, height, outputPath, format, quality, progressCallback) {
    if (progressCallback) progressCallback(20, 'Creating base canvas...');

    // Create base image
    const baseImage = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });

    if (progressCallback) progressCallback(30, 'Creating optimized composition (zero-copy)...');

    // OPTIMIZED: Create composite operations without redundant file reads
    // Sharp can read directly from file paths - no need to buffer in memory
    const composite = [];
    let validTiles = 0;
    
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      
      try {
        // Quick validation without reading the entire file
        if (existsSync(tile.path)) {
          composite.push({
            input: tile.path, // Let Sharp read directly from file (zero-copy)
            top: parseInt(tile.outputY) || 0,
            left: parseInt(tile.outputX) || 0,
            blend: 'over'
          });
          validTiles++;
        }

      } catch (error) {
        console.warn(`⚠️ Skipping invalid tile ${tile.path}:`, error.message);
      }
    }
    
    console.log(`⚡ TURBO OPTIMIZATION: ${validTiles}/${tiles.length} tiles ready (${((validTiles/tiles.length)*100).toFixed(1)}% success, zero I/O redundancy)`);

    if (progressCallback) progressCallback(70, 'Compositing final image...');

    // Apply format-specific optimization
    let pipeline = baseImage.composite(composite);
    pipeline = this.applyFormatOptimization(pipeline, format, quality);

    if (progressCallback) progressCallback(90, 'Writing final image...');

    await pipeline.toFile(outputPath);

    if (progressCallback) progressCallback(100, 'Assembly complete!');

    console.log(`✅ Direct assembly complete: ${outputPath}`);
  }

  /**
   * Chunked assembly for very large images
   */
  async assembleInChunks(tiles, width, height, outputPath, format, quality, progressCallback) {
    if (progressCallback) progressCallback(20, 'Planning chunked assembly...');

    // Calculate chunk dimensions
    const chunkHeight = Math.floor(Math.sqrt(this.maxChunkPixels * height / width));
    const chunkWidth = Math.floor(this.maxChunkPixels / chunkHeight);
    
    const chunksX = Math.ceil(width / chunkWidth);
    const chunksY = Math.ceil(height / chunkHeight);
    
    console.log(`📊 Chunked assembly: ${chunksX}×${chunksY} chunks of ~${chunkWidth}×${chunkHeight}`);

    const tempChunks = [];
    
    // Process each chunk
    for (let chunkY = 0; chunkY < chunksY; chunkY++) {
      for (let chunkX = 0; chunkX < chunksX; chunkX++) {
        const chunkIndex = chunkY * chunksX + chunkX;
        const totalChunks = chunksX * chunksY;
        
        if (progressCallback) {
          const progress = 20 + ((chunkIndex / totalChunks) * 60);
          progressCallback(progress, `Processing chunk ${chunkIndex + 1}/${totalChunks}...`);
        }

        const chunkStartX = chunkX * chunkWidth;
        const chunkStartY = chunkY * chunkHeight;
        const chunkEndX = Math.min(chunkStartX + chunkWidth, width);
        const chunkEndY = Math.min(chunkStartY + chunkHeight, height);
        
        const actualChunkWidth = chunkEndX - chunkStartX;
        const actualChunkHeight = chunkEndY - chunkStartY;

        // Find tiles that intersect with this chunk
        const chunkTiles = tiles.filter(tile => {
          const tileX = parseInt(tile.outputX) || 0;
          const tileY = parseInt(tile.outputY) || 0;
          const tileWidth = tile.width || 512; // Estimate tile size
          const tileHeight = tile.height || 512;

          return !(tileX + tileWidth <= chunkStartX || 
                   tileX >= chunkEndX || 
                   tileY + tileHeight <= chunkStartY || 
                   tileY >= chunkEndY);
        });

        if (chunkTiles.length > 0) {
          const chunkPath = `${outputPath}_chunk_${chunkIndex}.png`;
          await this.processChunk(chunkTiles, chunkStartX, chunkStartY, actualChunkWidth, actualChunkHeight, chunkPath);
          tempChunks.push({
            path: chunkPath,
            x: chunkStartX,
            y: chunkStartY,
            width: actualChunkWidth,
            height: actualChunkHeight
          });
        }
      }
    }

    if (progressCallback) progressCallback(85, 'Combining chunks into final image...');

    // Combine all chunks into final image
    const finalOutputPath = await this.combineChunks(tempChunks, width, height, outputPath, format, quality);

    // Clean up temporary chunk files
    for (const chunk of tempChunks) {
      try {
        await unlink(chunk.path);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup chunk ${chunk.path}:`, error.message);
      }
    }

    if (progressCallback) progressCallback(100, 'Chunked assembly complete!');

    console.log(`✅ Chunked assembly complete: ${finalOutputPath}`);
    return finalOutputPath;
  }

  /**
   * Process a single chunk
   */
  async processChunk(tiles, offsetX, offsetY, chunkWidth, chunkHeight, chunkPath) {
    const baseImage = sharp({
      create: {
        width: chunkWidth,
        height: chunkHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });

    const composite = [];
    
    for (const tile of tiles) {
      try {
        const tileBuffer = await readFile(tile.path);
        const tileX = (parseInt(tile.outputX) || 0) - offsetX;
        const tileY = (parseInt(tile.outputY) || 0) - offsetY;
        
        composite.push({
          input: tileBuffer,
          top: tileY,
          left: tileX,
          blend: 'over'
        });
      } catch (error) {
        console.warn(`⚠️ Failed to load tile for chunk:`, error.message);
      }
    }

    await baseImage.composite(composite).png().toFile(chunkPath);
  }

  /**
   * Combine chunks into final image or create optimized archive
   */
  async combineChunks(chunks, width, height, outputPath, format, quality) {
    const totalPixels = width * height;
    const sharpPixelLimit = 268435456; // Sharp's 268MP limit
    
    if (totalPixels > sharpPixelLimit) {
      console.log(`⚠️ Image ${width}×${height} (${(totalPixels/1000000).toFixed(1)}MP) exceeds Sharp's ${(sharpPixelLimit/1000000).toFixed(0)}MP limit`);
      console.log(`🔄 Creating optimized tile archive instead of single file`);
      
      // Create ZIP archive with optimized tiles and return the path
      const zipPath = await this.createOptimizedTileArchive(chunks, width, height, outputPath, format, quality);
      return zipPath;
    }

    // Original combine method for smaller images
    const baseImage = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });

    const composite = [];
    
    for (const chunk of chunks) {
      const chunkBuffer = await readFile(chunk.path);
      composite.push({
        input: chunkBuffer,
        top: chunk.y,
        left: chunk.x,
        blend: 'over'
      });
    }

    let pipeline = baseImage.composite(composite);
    pipeline = this.applyFormatOptimization(pipeline, format, quality);
    
    await pipeline.toFile(outputPath);
    return outputPath;
  }

  /**
   * Create optimized tile archive for ultra-large images
   */
  async createOptimizedTileArchive(chunks, width, height, outputPath, format, quality) {
    const archiver = (await import('archiver')).default;
    const { createWriteStream } = await import('fs');
    
    // Change output to ZIP format
    const zipPath = outputPath.replace(/\.[^.]+$/, '-optimized-tiles.zip');
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    
    return new Promise(async (resolve, reject) => {
      output.on('close', () => {
        console.log(`✅ Created optimized tile archive: ${zipPath}`);
        resolve(zipPath);
      });

      archive.on('error', reject);
      archive.pipe(output);

      // Add reconstruction metadata
      const metadata = {
        originalDimensions: `${width}×${height}`,
        totalPixels: width * height,
        megapixels: (width * height / 1000000).toFixed(1),
        exceedsSharpLimit: true,
        chunks: chunks.length,
        format: format,
        quality: quality,
        reconstructionInstructions: [
          'This image exceeds Sharp\'s 268MP processing limit',
          'Use external tools for reconstruction:',
          '1. ImageMagick: montage *.avif -tile WxH -geometry +0+0 result.avif',
          '2. GIMP: Import as layers and arrange manually',
          '3. Python: Use PIL/Pillow to stitch chunks',
          'Chunks are optimized and ready for reconstruction'
        ]
      };
      archive.append(JSON.stringify(metadata, null, 2), { name: 'RECONSTRUCTION_INFO.json' });

      // Add optimized chunks to archive
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          // Optimize chunk and add to archive
          const optimizedBuffer = await sharp(chunk.path)
            .toFormat(format, { 
              quality: Math.max(80, quality),
              effort: format === 'avif' ? 4 : undefined
            })
            .toBuffer();
          
          const filename = `chunk_${String(i).padStart(3, '0')}_x${chunk.x}_y${chunk.y}_${chunk.width}x${chunk.height}.${format}`;
          archive.append(optimizedBuffer, { name: filename });
          
        } catch (error) {
          console.warn(`⚠️ Failed to optimize chunk ${i}:`, error.message);
        }
      }

      await archive.finalize();
    });
  }

  /**
   * Apply format-specific optimizations
   */
  applyFormatOptimization(pipeline, format, quality) {
    switch (format) {
      case 'avif':
        return pipeline.avif({
          quality: Math.max(10, Math.min(100, quality)),
          effort: 4,
          chromaSubsampling: '4:2:0' // Better compression for large images
        });
      case 'webp':
        return pipeline.webp({
          quality: Math.max(10, Math.min(100, quality)),
          effort: 4
        });
      case 'jpeg':
        return pipeline.jpeg({
          quality: Math.max(10, Math.min(100, quality)),
          mozjpeg: true
        });
      case 'png':
        return pipeline.png({
          compressionLevel: 6
        });
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Sort tiles by position for optimal processing
   */
  sortTilesByPosition(tiles) {
    return tiles.sort((a, b) => {
      const aY = parseInt(a.outputY) || 0;
      const bY = parseInt(b.outputY) || 0;
      if (aY !== bY) return aY - bY;
      
      const aX = parseInt(a.outputX) || 0;
      const bX = parseInt(b.outputX) || 0;
      return aX - bX;
    });
  }

  /**
   * Extract tile metadata from file paths
   */
  extractTileMetadata(tiles) {
    return tiles.map(tile => {
      // Extract position from filename like: tile_001_x9600_y0.avif
      const filename = tile.originalname || tile.filename || '';
      const xMatch = filename.match(/x(\d+)/);
      const yMatch = filename.match(/y(\d+)/);
      
      return {
        ...tile,
        outputX: xMatch ? parseInt(xMatch[1]) : (tile.outputX || 0),
        outputY: yMatch ? parseInt(yMatch[1]) : (tile.outputY || 0)
      };
    });
  }
}

export const tileAssembler = new TileAssembler(); 
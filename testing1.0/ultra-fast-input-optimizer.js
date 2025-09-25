import sharp from 'sharp';
import { readFile } from 'fs/promises';

/**
 * Ultra-Fast Input Optimizer
 * Analyzes and optimizes input images for processing
 */
export const ultraFastInputOptimizer = {
  /**
   * Analyze optimal format for an image
   */
  async analyzeOptimalFormat(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const fileBuffer = await readFile(imagePath);
      
      const analysis = {
        originalFormat: metadata.format,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
        fileSize: fileBuffer.length,
        megapixels: (metadata.width * metadata.height) / 1000000,
        recommendedFormat: 'webp' // Default recommendation
      };

      // Determine optimal format based on image characteristics
      if (analysis.hasAlpha) {
        analysis.recommendedFormat = 'webp'; // Good alpha support
      } else if (analysis.megapixels > 50) {
        analysis.recommendedFormat = 'avif'; // Better compression for large images
      } else if (metadata.format === 'jpeg' && !analysis.hasAlpha) {
        analysis.recommendedFormat = 'jpeg'; // Keep JPEG if already optimized
      } else {
        analysis.recommendedFormat = 'webp'; // General purpose
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing image format:', error);
      return {
        originalFormat: 'unknown',
        width: 0,
        height: 0,
        channels: 3,
        hasAlpha: false,
        fileSize: 0,
        megapixels: 0,
        recommendedFormat: 'webp',
        error: error.message
      };
    }
  },

  /**
   * Convert image to all optimal formats
   */
  async convertToAllOptimalFormats(imagePath, outputDir, baseName) {
    const results = {
      webp: null,
      avif: null,
      jpeg: null
    };

    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();

      // Convert to WebP
      try {
        const webpPath = `${outputDir}/${baseName}.webp`;
        await image.clone().webp({ quality: 85, effort: 4 }).toFile(webpPath);
        results.webp = { path: webpPath, success: true };
      } catch (error) {
        results.webp = { error: error.message, success: false };
      }

      // Convert to AVIF (if not too large)
      if (metadata.width * metadata.height <= 100000000) { // 100MP limit for AVIF
        try {
          const avifPath = `${outputDir}/${baseName}.avif`;
          await image.clone().avif({ quality: 80, effort: 4 }).toFile(avifPath);
          results.avif = { path: avifPath, success: true };
        } catch (error) {
          results.avif = { error: error.message, success: false };
        }
      } else {
        results.avif = { error: 'Image too large for AVIF', success: false };
      }

      // Convert to JPEG (if no alpha)
      if (!metadata.hasAlpha) {
        try {
          const jpegPath = `${outputDir}/${baseName}.jpeg`;
          await image.clone().jpeg({ quality: 90 }).toFile(jpegPath);
          results.jpeg = { path: jpegPath, success: true };
        } catch (error) {
          results.jpeg = { error: error.message, success: false };
        }
      } else {
        results.jpeg = { error: 'Image has alpha channel', success: false };
      }

      return results;
    } catch (error) {
      console.error('Error converting image formats:', error);
      return {
        webp: { error: error.message, success: false },
        avif: { error: error.message, success: false },
        jpeg: { error: error.message, success: false }
      };
    }
  },

  /**
   * Get optimal processing parameters for an image
   */
  async getOptimalProcessingParams(imagePath) {
    const analysis = await this.analyzeOptimalFormat(imagePath);
    
    return {
      tileSize: analysis.megapixels > 100 ? 1024 : 512,
      overlap: analysis.megapixels > 100 ? 64 : 32,
      format: analysis.recommendedFormat,
      quality: analysis.megapixels > 100 ? 85 : 90,
      effort: 4
    };
  }
}; 
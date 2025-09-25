/**
 * Image Processor
 * Handles image loading, canvas manipulation, preprocessing, and utility functions
 */
export class ImageProcessor {
    constructor() {
        this.maxImageSize = 2048; // Maximum dimension for processing
        this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
    }

    /**
     * Load image from file
     * @param {File} file - Image file
     * @returns {Promise<HTMLImageElement>} Loaded image
     */
    async loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            // Validate file
            if (!this.validateFile(file)) {
                reject(new Error('Invalid file format or size'));
                return;
            }

            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }

    /**
     * Load image from URL
     * @param {string} url - Image URL
     * @returns {Promise<HTMLImageElement>} Loaded image
     */
    async loadImageFromUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image from URL'));
            
            img.crossOrigin = 'anonymous';
            img.src = url;
        });
    }

    /**
     * Validate file format and size
     * @param {File} file - File to validate
     * @returns {boolean} Validation result
     */
    validateFile(file) {
        // Check file type
        if (!this.supportedFormats.includes(file.type)) {
            return false;
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            return false;
        }

        return true;
    }

    /**
     * Create canvas from image
     * @param {HTMLImageElement} image - Source image
     * @param {number} maxSize - Maximum dimension (optional)
     * @returns {HTMLCanvasElement} Canvas with image
     */
    createCanvasFromImage(image, maxSize = null) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let { width, height } = image;

        // Resize if needed
        if (maxSize && (width > maxSize || height > maxSize)) {
            const scale = maxSize / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image with high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, width, height);

        return canvas;
    }

    /**
     * Get ImageData from canvas
     * @param {HTMLCanvasElement} canvas - Source canvas
     * @returns {ImageData} Image data
     */
    getImageDataFromCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    /**
     * Create canvas from ImageData
     * @param {ImageData} imageData - Source image data
     * @returns {HTMLCanvasElement} Canvas with image data
     */
    createCanvasFromImageData(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = imageData.width;
        canvas.height = imageData.height;

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    /**
     * Resize image maintaining aspect ratio
     * @param {HTMLImageElement} image - Source image
     * @param {number} maxWidth - Maximum width
     * @param {number} maxHeight - Maximum height
     * @returns {HTMLCanvasElement} Resized canvas
     */
    resizeImage(image, maxWidth, maxHeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate new dimensions
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
        const newWidth = Math.round(image.width * scale);
        const newHeight = Math.round(image.height * scale);

        canvas.width = newWidth;
        canvas.height = newHeight;

        // High quality resize
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, newWidth, newHeight);

        return canvas;
    }

    /**
     * Crop image to square
     * @param {HTMLImageElement} image - Source image
     * @param {number} size - Target size
     * @returns {HTMLCanvasElement} Cropped canvas
     */
    cropToSquare(image, size) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = size;
        canvas.height = size;

        // Calculate crop area (center crop)
        const minDim = Math.min(image.width, image.height);
        const cropX = (image.width - minDim) / 2;
        const cropY = (image.height - minDim) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
            image,
            cropX, cropY, minDim, minDim,
            0, 0, size, size
        );

        return canvas;
    }

    /**
     * Pad image to make it divisible by a factor
     * @param {ImageData} imageData - Source image data
     * @param {number} factor - Padding factor (e.g., 32 for divisibility by 32)
     * @returns {ImageData} Padded image data
     */
    padImage(imageData, factor = 32) {
        const { width, height, data } = imageData;
        
        // Calculate padded dimensions
        const paddedWidth = Math.ceil(width / factor) * factor;
        const paddedHeight = Math.ceil(height / factor) * factor;
        
        if (paddedWidth === width && paddedHeight === height) {
            return imageData; // No padding needed
        }

        // Create padded image data
        const paddedData = new Uint8ClampedArray(paddedWidth * paddedHeight * 4);
        
        // Fill with black (or you could use edge pixels for better results)
        paddedData.fill(0);
        
        // Copy original image to center
        const offsetX = Math.floor((paddedWidth - width) / 2);
        const offsetY = Math.floor((paddedHeight - height) / 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIndex = (y * width + x) * 4;
                const dstIndex = ((y + offsetY) * paddedWidth + (x + offsetX)) * 4;
                
                paddedData[dstIndex] = data[srcIndex];
                paddedData[dstIndex + 1] = data[srcIndex + 1];
                paddedData[dstIndex + 2] = data[srcIndex + 2];
                paddedData[dstIndex + 3] = data[srcIndex + 3];
            }
        }
        
        return new ImageData(paddedData, paddedWidth, paddedHeight);
    }

    /**
     * Remove padding from image
     * @param {ImageData} paddedImageData - Padded image data
     * @param {number} originalWidth - Original width
     * @param {number} originalHeight - Original height
     * @returns {ImageData} Unpadded image data
     */
    removePadding(paddedImageData, originalWidth, originalHeight) {
        const { width: paddedWidth, height: paddedHeight, data: paddedData } = paddedImageData;
        
        if (paddedWidth === originalWidth && paddedHeight === originalHeight) {
            return paddedImageData; // No padding to remove
        }

        // Calculate offset
        const offsetX = Math.floor((paddedWidth - originalWidth) / 2);
        const offsetY = Math.floor((paddedHeight - originalHeight) / 2);
        
        // Extract original region
        const originalData = new Uint8ClampedArray(originalWidth * originalHeight * 4);
        
        for (let y = 0; y < originalHeight; y++) {
            for (let x = 0; x < originalWidth; x++) {
                const srcIndex = ((y + offsetY) * paddedWidth + (x + offsetX)) * 4;
                const dstIndex = (y * originalWidth + x) * 4;
                
                originalData[dstIndex] = paddedData[srcIndex];
                originalData[dstIndex + 1] = paddedData[srcIndex + 1];
                originalData[dstIndex + 2] = paddedData[srcIndex + 2];
                originalData[dstIndex + 3] = paddedData[srcIndex + 3];
            }
        }
        
        return new ImageData(originalData, originalWidth, originalHeight);
    }

    /**
     * Convert canvas to blob
     * @param {HTMLCanvasElement} canvas - Source canvas
     * @param {string} format - Output format (image/jpeg, image/png, image/webp)
     * @param {number} quality - Quality (0-1) for lossy formats
     * @returns {Promise<Blob>} Image blob
     */
    async canvasToBlob(canvas, format = 'image/png', quality = 0.9) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert canvas to blob'));
                }
            }, format, quality);
        });
    }

    /**
     * Download image from canvas
     * @param {HTMLCanvasElement} canvas - Source canvas
     * @param {string} filename - Download filename
     * @param {string} format - Image format
     * @param {number} quality - Quality for lossy formats
     */
    async downloadImage(canvas, filename = 'enhanced-image', format = 'image/png', quality = 0.9) {
        try {
            const blob = await this.canvasToBlob(canvas, format, quality);
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.style.display = 'none';
            link.target = '_self';
            link.download = `${filename}.${this.getFileExtension(format)}`;
            
            // Force download behavior
            link.setAttribute('download', link.download);
            
            document.body.appendChild(link);
            link.click();
            
            // Clean up with longer delay to ensure download starts for large files
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 1000); // Increased to 1 second for large image downloads
            
        } catch (error) {
            console.error('Failed to download image:', error);
            throw error;
        }
    }

    /**
     * Get file extension from MIME type
     * @param {string} mimeType - MIME type
     * @returns {string} File extension
     */
    getFileExtension(mimeType) {
        const extensions = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp'
        };
        return extensions[mimeType] || 'png';
    }

    /**
     * Calculate image quality metrics (basic implementation)
     * @param {ImageData} original - Original image data
     * @param {ImageData} enhanced - Enhanced image data
     * @returns {Object} Quality metrics
     */
    calculateQualityMetrics(original, enhanced) {
        // This is a simplified implementation
        // In a real application, you might want to implement proper PSNR, SSIM, etc.
        
        const originalSize = original.width * original.height;
        const enhancedSize = enhanced.width * enhanced.height;
        const scaleFactor = Math.sqrt(enhancedSize / originalSize);
        
        // Calculate basic statistics
        const originalMean = this.calculateMean(original.data);
        const enhancedMean = this.calculateMean(enhanced.data);
        
        return {
            scaleFactor: scaleFactor.toFixed(2),
            originalResolution: `${original.width}x${original.height}`,
            enhancedResolution: `${enhanced.width}x${enhanced.height}`,
            originalMean: originalMean.toFixed(2),
            enhancedMean: enhancedMean.toFixed(2),
            pixelIncrease: `${((enhancedSize / originalSize - 1) * 100).toFixed(1)}%`
        };
    }

    /**
     * Calculate mean pixel value
     * @param {Uint8ClampedArray} data - Image data
     * @returns {number} Mean value
     */
    calculateMean(data) {
        let sum = 0;
        let count = 0;
        
        // Only consider RGB channels, skip alpha
        for (let i = 0; i < data.length; i += 4) {
            sum += data[i] + data[i + 1] + data[i + 2];
            count += 3;
        }
        
        return sum / count;
    }

    /**
     * Create thumbnail from image
     * @param {HTMLImageElement} image - Source image
     * @param {number} size - Thumbnail size
     * @returns {HTMLCanvasElement} Thumbnail canvas
     */
    createThumbnail(image, size = 150) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = size;
        canvas.height = size;

        // Calculate dimensions to maintain aspect ratio
        const scale = size / Math.max(image.width, image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (size - width) / 2;
        const y = (size - height) / 2;

        // Fill background
        ctx.fillStyle = '#1a1a1d';
        ctx.fillRect(0, 0, size, size);

        // Draw image
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, x, y, width, height);

        return canvas;
    }

    /**
     * Apply basic image filters (for demonstration)
     * @param {ImageData} imageData - Source image data
     * @param {string} filter - Filter type
     * @returns {ImageData} Filtered image data
     */
    applyFilter(imageData, filter) {
        const { width, height, data } = imageData;
        const filteredData = new Uint8ClampedArray(data);

        switch (filter) {
            case 'grayscale':
                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    filteredData[i] = gray;
                    filteredData[i + 1] = gray;
                    filteredData[i + 2] = gray;
                }
                break;

            case 'brightness':
                const brightness = 20;
                for (let i = 0; i < data.length; i += 4) {
                    filteredData[i] = Math.min(255, data[i] + brightness);
                    filteredData[i + 1] = Math.min(255, data[i + 1] + brightness);
                    filteredData[i + 2] = Math.min(255, data[i + 2] + brightness);
                }
                break;

            case 'contrast':
                const contrast = 1.2;
                for (let i = 0; i < data.length; i += 4) {
                    filteredData[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128));
                    filteredData[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128));
                    filteredData[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128));
                }
                break;

            default:
                return imageData;
        }

        return new ImageData(filteredData, width, height);
    }

    /**
     * Get image information
     * @param {HTMLImageElement} image - Source image
     * @param {File} file - Original file (optional)
     * @returns {Object} Image information
     */
    getImageInfo(image, file = null) {
        const info = {
            width: image.width,
            height: image.height,
            aspectRatio: (image.width / image.height).toFixed(2),
            megapixels: ((image.width * image.height) / 1000000).toFixed(2),
            format: file ? file.type : 'unknown',
            fileSize: file ? this.formatFileSize(file.size) : 'unknown',
            fileName: file ? file.name : 'unknown'
        };

        return info;
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Check if image needs preprocessing
     * @param {HTMLImageElement} image - Source image
     * @returns {Object} Preprocessing recommendations
     */
    analyzeImage(image) {
        const analysis = {
            needsResize: image.width > this.maxImageSize || image.height > this.maxImageSize,
            recommendedSize: null,
            aspectRatio: image.width / image.height,
            isSquare: Math.abs(image.width - image.height) < 10,
            megapixels: (image.width * image.height) / 1000000
        };

        if (analysis.needsResize) {
            const scale = this.maxImageSize / Math.max(image.width, image.height);
            analysis.recommendedSize = {
                width: Math.round(image.width * scale),
                height: Math.round(image.height * scale)
            };
        }

        return analysis;
    }
} 
/**
 * Worker Upscaler - Web Worker for parallel tile processing
 * Provides fast upscaling using bicubic interpolation
 */

// Worker message handler
self.addEventListener('message', async (e) => {
  const { type, tileIndex, imageData, scaleFactor } = e.data;
  
  try {
    switch (type) {
      case 'init':
        // Initialize worker
        self.postMessage({ type: 'ready' });
        break;
        
      case 'upscale':
        // Process tile upscaling
        const result = await upscaleTile(imageData, scaleFactor, tileIndex);
        self.postMessage({
          type: 'result',
          tileIndex,
          ...result
        });
        break;
        
      default:
        self.postMessage({
          type: 'error',
          tileIndex,
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      tileIndex,
      error: error.message
    });
  }
});

/**
 * Upscale a tile using bicubic interpolation
 */
async function upscaleTile(imageData, scaleFactor, tileIndex) {
  const { data, width, height } = imageData;
  const inputData = new Uint8ClampedArray(data);
  
  const outputWidth = width * scaleFactor;
  const outputHeight = height * scaleFactor;
  const outputData = new Uint8ClampedArray(outputWidth * outputHeight * 4);
  
  // Bicubic upscaling
  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const srcX = x / scaleFactor;
      const srcY = y / scaleFactor;
      
      const pixel = bicubicInterpolation(inputData, width, height, srcX, srcY);
      const outputIndex = (y * outputWidth + x) * 4;
      
      outputData[outputIndex] = Math.round(pixel[0]);     // R
      outputData[outputIndex + 1] = Math.round(pixel[1]); // G
      outputData[outputIndex + 2] = Math.round(pixel[2]); // B
      outputData[outputIndex + 3] = Math.round(pixel[3]); // A
    }
  }
  
  return {
    processedData: Array.from(outputData),
    outputWidth,
    outputHeight
  };
}

/**
 * Bicubic interpolation for high-quality upscaling
 */
function bicubicInterpolation(data, width, height, x, y) {
  const x1 = Math.floor(x);
  const y1 = Math.floor(y);
  const dx = x - x1;
  const dy = y - y1;
  
  const result = [0, 0, 0, 0]; // RGBA
  
  // Bicubic kernel
  for (let i = -1; i <= 2; i++) {
    for (let j = -1; j <= 2; j++) {
      const px = Math.max(0, Math.min(width - 1, x1 + j));
      const py = Math.max(0, Math.min(height - 1, y1 + i));
      const pixelIndex = (py * width + px) * 4;
      
      const wx = cubicWeight(dx - j);
      const wy = cubicWeight(dy - i);
      const weight = wx * wy;
      
      result[0] += data[pixelIndex] * weight;     // R
      result[1] += data[pixelIndex + 1] * weight; // G
      result[2] += data[pixelIndex + 2] * weight; // B
      result[3] += data[pixelIndex + 3] * weight; // A
    }
  }
  
  // Clamp values to valid range
  return result.map(v => Math.max(0, Math.min(255, v)));
}

/**
 * Cubic weight function for bicubic interpolation
 */
function cubicWeight(t) {
  const a = -0.5; // Catmull-Rom spline parameter
  const absT = Math.abs(t);
  
  if (absT <= 1) {
    return (a + 2) * absT * absT * absT - (a + 3) * absT * absT + 1;
  } else if (absT <= 2) {
    return a * absT * absT * absT - 5 * a * absT * absT + 8 * a * absT - 4 * a;
  } else {
    return 0;
  }
}

console.log('🔧 Worker Upscaler initialized'); 
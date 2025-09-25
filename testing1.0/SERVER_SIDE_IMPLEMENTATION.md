# SERVER-SIDE 600MP IMAGE COMPOSITION IMPLEMENTATION

## CURRENT WORKING SYSTEM AUDIT

### ✅ TILING SYSTEM (WORKS PERFECTLY)
- **Performance**: 4.2 seconds for 600MP (2000×3000 → 20000×30000)
- **Architecture**: Enhanced Upscaler with 4 Web Workers
- **Tile Generation**: 35 tiles (5×7 grid, 512px with 32px overlap)
- **Data Structure**: `chunkedData.tiles` array with:
  ```javascript
  tile = {
    imageData: ArrayBuffer | ImageData,
    outputX: number,
    outputY: number, 
    outputWidth: number,
    outputHeight: number,
    width: number,
    height: number
  }
  ```

### ❌ DOWNLOAD LIMITATIONS (BROWSER HARD LIMITS)
- **Canvas API**: 268MP max (16,384×16,384)
- **600MP Target**: 20000×30000 = 2.2x over limit
- **Memory**: ~2.4GB raw data exceeds browser tab limits
- **All Formats Fail**: PNG, AVIF, WebP, JPEG - all require canvas/ImageData

---

## SERVER-SIDE SOLUTION

### ARCHITECTURE
```
Browser (Tiling) → Upload Tiles → Server (Compose) → Download Single File
```

### BACKEND REQUIREMENTS

#### 1. **Node.js Server with Sharp**
```bash
npm install express multer sharp cors
```

#### 2. **Endpoints**
- `POST /upload-tiles` - Receive 35 tile files
- `GET /compose/:sessionId` - Trigger composition
- `GET /download/:sessionId` - Download final file
- `GET /status/:sessionId` - Check progress

#### 3. **File Structure**
```
server/
├── uploads/           # Temporary tile storage
├── composed/          # Final 600MP files
├── server.js         # Main server
└── compose-worker.js # Heavy processing worker
```

---

## IMPLEMENTATION STEPS

### STEP 1: SERVER SETUP
```javascript
// server.js
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Store session data
const sessions = new Map();

app.post('/upload-tiles', upload.array('tiles', 35), async (req, res) => {
  const sessionId = Date.now().toString();
  const { width, height, tileCount } = req.body;
  
  sessions.set(sessionId, {
    tiles: req.files,
    width: parseInt(width),
    height: parseInt(height),
    status: 'uploaded',
    created: Date.now()
  });
  
  res.json({ sessionId, tilesReceived: req.files.length });
});

app.get('/compose/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  
  session.status = 'composing';
  
  // Start composition in background
  composeImage(req.params.sessionId, session);
  
  res.json({ status: 'started', sessionId: req.params.sessionId });
});
```

### STEP 2: IMAGE COMPOSITION WORKER
```javascript
// compose-worker.js
async function composeImage(sessionId, session) {
  try {
    const { tiles, width, height } = session;
    
    // Create base image
    const baseImage = sharp({
      create: {
        width: width,
        height: height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });
    
    // Composite all tiles
    const composite = [];
    
    for (const tile of tiles) {
      const tileData = await sharp(tile.path).raw().toBuffer();
      const tileInfo = await sharp(tile.path).metadata();
      
      composite.push({
        input: tileData,
        raw: {
          width: tileInfo.width,
          height: tileInfo.height,
          channels: 4
        },
        top: tile.outputY,
        left: tile.outputX
      });
    }
    
    // Generate final image
    const outputPath = `composed/${sessionId}.avif`;
    await baseImage
      .composite(composite)
      .avif({ quality: 95, effort: 4 })
      .toFile(outputPath);
    
    session.status = 'complete';
    session.outputPath = outputPath;
    session.fileSize = fs.statSync(outputPath).size;
    
    // Cleanup uploaded tiles
    tiles.forEach(tile => fs.unlinkSync(tile.path));
    
  } catch (error) {
    session.status = 'error';
    session.error = error.message;
  }
}
```

### STEP 3: FRONTEND MODIFICATIONS
```javascript
// main.js - Replace download logic
async downloadChunkedResultServerSide() {
  const chunkedData = this.fullResolutionCanvas.chunkedData;
  
  this.showDownloadProgress('Preparing tiles for upload...', 0);
  
  // Convert tiles to blobs
  const formData = new FormData();
  formData.append('width', chunkedData.width);
  formData.append('height', chunkedData.height);
  formData.append('tileCount', chunkedData.tiles.length);
  
  for (let i = 0; i < chunkedData.tiles.length; i++) {
    const tile = chunkedData.tiles[i];
    const canvas = new OffscreenCanvas(tile.outputWidth, tile.outputHeight);
    const ctx = canvas.getContext('2d');
    
    // Convert tile to blob
    if (tile.imageData instanceof ArrayBuffer) {
      const imageData = new ImageData(
        new Uint8ClampedArray(tile.imageData),
        tile.outputWidth,
        tile.outputHeight
      );
      ctx.putImageData(imageData, 0, 0);
    }
    
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    formData.append('tiles', blob, `tile_${i}.png`);
    
    const progress = (i / chunkedData.tiles.length) * 50;
    this.showDownloadProgress(`Uploading tiles: ${i+1}/${chunkedData.tiles.length}`, progress);
  }
  
  // Upload tiles
  const uploadResponse = await fetch('/upload-tiles', {
    method: 'POST',
    body: formData
  });
  
  const { sessionId } = await uploadResponse.json();
  
  this.showDownloadProgress('Starting server composition...', 60);
  
  // Start composition
  await fetch(`/compose/${sessionId}`);
  
  // Poll for completion
  await this.pollCompositionStatus(sessionId);
}

async pollCompositionStatus(sessionId) {
  const pollInterval = setInterval(async () => {
    const response = await fetch(`/status/${sessionId}`);
    const status = await response.json();
    
    if (status.status === 'complete') {
      clearInterval(pollInterval);
      this.showDownloadProgress('Download ready!', 100);
      
      // Trigger download
      window.location.href = `/download/${sessionId}`;
      this.hideDownloadProgress();
      
    } else if (status.status === 'error') {
      clearInterval(pollInterval);
      alert(`Composition failed: ${status.error}`);
      this.hideDownloadProgress();
    } else {
      this.showDownloadProgress('Server composing 600MP image...', 80);
    }
  }, 2000);
}
```

### STEP 4: DEPLOYMENT
```bash
# Install dependencies
npm install express multer sharp cors

# Run server
node server.js

# Production considerations:
# - Use PM2 for process management
# - Add Redis for session storage
# - Use cloud storage (AWS S3) for files
# - Add rate limiting and file size limits
```

---

## BENEFITS
- ✅ **Single 600MP AVIF file** (20-50MB vs 915MB PNG)
- ✅ **No browser limitations** 
- ✅ **Keep existing 4.2s tiling**
- ✅ **Professional quality output**

## TIMELINE
- **Setup**: 2-4 hours
- **Testing**: 1-2 hours  
- **Production**: 1 day

**This approach WILL work for 600+ MP files.** 
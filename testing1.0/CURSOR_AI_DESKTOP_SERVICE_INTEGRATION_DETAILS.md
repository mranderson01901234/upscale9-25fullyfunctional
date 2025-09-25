# Cursor AI: Desktop Service Integration Details

## Complete Analysis Report for Desktop Service Integration

**Generated:** Sunday, September 21, 2025  
**Codebase:** /home/mranderson/testing1.0  
**Analysis Target:** Download system for desktop service integration

---

## 1. Download URL Structure and Endpoint Details

### Exact Download URL Format
```javascript
// In src/server-side-composer.js line 275:
const downloadUrl = `${this.serverUrl}/api/download/${sessionId}`;

// Real examples:
// http://localhost:3002/api/download/1758462109469
// http://localhost:3002/api/download/1758462432656
```

### Server Endpoint Implementation
```javascript
// In server-ultra-fast.js lines 686-746:
app.get('/api/download/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;           // Extract sessionId from URL path
    const session = sessions.get(sessionId);    // Get session from memory Map
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (session.status !== 'complete' || !session.result) {
      return res.status(400).json({ 
        error: 'Composition not complete',
        status: session.status 
      });
    }
    
    const filePath = session.result.outputPath;  // Get actual file path
    
    // File validation and streaming...
  } catch (error) {
    console.error('Ultra-fast download error:', error);
    res.status(500).json({
      error: 'Download failed',
      details: error.message
    });
  }
});
```

**URL Parameters:** None - sessionId is extracted from path parameter only  
**Query Parameters:** Not used  
**Authentication:** None required  

---

## 2. Session Management Implementation

### Session Creation and Tracking
```javascript
// SessionId generation in src/server-side-composer.js line 93:
const sessionId = Date.now().toString();

// Session storage in server-ultra-fast.js lines 592-600:
sessions.set(sessionId, {
  tiles,
  width: parseInt(width),
  height: parseInt(height),
  scaleFactor: parseInt(scaleFactor),
  status: 'uploaded',        // Initial status
  created: Date.now(),       // Timestamp for cleanup
  ip: req.ip                 // Client IP for security
});

// Session status progression:
// 'uploaded' → 'composing' → 'complete'
```

### Client-Side Session Tracking
```javascript
// In src/server-side-composer.js lines 10-12:
this.serverUrl = 'http://localhost:3002';
this.wsUrl = 'ws://localhost:3002';
this.currentSessionId = null;  // Stored in memory, not localStorage
```

### Session to File Mapping
```javascript
// Server maps sessionId to actual file via session.result.outputPath
// File naming convention (server-ultra-fast.js line 721):
const filename = `enhanced-ultra-fast-${sessionId}.${extension}`;

// Examples:
// enhanced-ultra-fast-1758462109469.avif
// enhanced-ultra-fast-1758462109469.png  
// enhanced-ultra-fast-1758462109469.zip (for large images)
```

---

## 3. Download Initiation Flow

### Complete Download Trigger Implementation
```javascript
// In src/server-side-composer.js lines 274-300:
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
  link.click();                    // ← DESKTOP SERVICE INTERCEPT POINT
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
  }, 1000);
}
```

### Processing Completion Detection
```javascript
// WebSocket completion detection in src/server-side-composer.js lines 236-239:
if (data.stage === 'complete') {
  this.websocket.close();
  resolve();
}

// Server sets completion in server-ultra-fast.js lines 647-649:
session.status = 'complete';
session.result = result;
session.completed = Date.now();
```

---

## 4. File Naming and Format Handling

### Output Filename Determination
```javascript
// Server-side filename construction (server-ultra-fast.js lines 720-721):
const extension = format === 'zip' ? 'zip' : format;
const filename = `enhanced-ultra-fast-${sessionId}.${extension}`;

// Content-Disposition header (line 726):
res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

// Client-side filename (src/server-side-composer.js lines 285-291):
if (isArchive || format === 'zip') {
  link.download = `ultra-large-image-tiles-${sessionId}.zip`;
} else {
  link.download = `enhanced-600mp-${sessionId}.${format}`;
}
```

### Format and Quality Parameters
```javascript
// Format stored in session during composition (server-ultra-fast.js lines 636-637):
session.format = format;
session.quality = quality;

// Supported formats with MIME types (lines 712-718):
const mimeType = {
  'avif': 'image/avif',
  'webp': 'image/webp', 
  'png': 'image/png',
  'jpeg': 'image/jpeg',
  'zip': 'application/zip'
}[format] || 'application/octet-stream';
```

---

## 5. Error Handling and Timeout Logic

### Download Failure Scenarios
```javascript
// Server-side error handling (server-ultra-fast.js lines 739-745):
} catch (error) {
  console.error('Ultra-fast download error:', error);
  res.status(500).json({
    error: 'Download failed',
    details: error.message
  });
}

// Session validation errors (lines 691-700):
if (!session) {
  return res.status(404).json({ error: 'Session not found' });
}

if (session.status !== 'complete' || !session.result) {
  return res.status(400).json({ 
    error: 'Composition not complete',
    status: session.status 
  });
}

// File not found error (lines 704-706):
if (!existsSync(filePath)) {
  return res.status(404).json({ error: 'File not found' });
}
```

### Timeout Configurations
```javascript
// WebSocket timeout (src/server-side-composer.js lines 261-267):
setTimeout(() => {
  if (this.websocket.readyState === WebSocket.CONNECTING || 
      this.websocket.readyState === WebSocket.OPEN) {
    this.websocket.close();
    reject(new Error('Composition timeout - taking longer than expected'));
  }
}, 15 * 60 * 1000); // 15 minute timeout for large images

// Session timeout (server-ultra-fast.js line 25):
sessionTimeout: 2 * 60 * 60 * 1000, // 2 hours

// Download cleanup timeout (line 737):
setTimeout(() => cleanupSession(sessionId), 10 * 60 * 1000); // 10 minutes
```

---

## 6. Progress Tracking and User Feedback

### Current Progress Indication
```javascript
// WebSocket progress messages (server-ultra-fast.js lines 451-467):
function sendProgress(sessionId, progress, message, stage = 'processing') {
  const client = progressClients.get(sessionId);
  if (client && client.readyState === 1) {
    try {
      client.send(JSON.stringify({
        type: 'progress',
        progress,
        message,
        stage,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error(`Failed to send progress to ${sessionId}:`, error);
      progressClients.delete(sessionId);
    }
  }
}

// Client progress handling (src/server-side-composer.js lines 227-235):
if (data.type === 'progress') {
  const overallProgress = 30 + (data.progress * 0.65); // Map to 30-95%
  
  if (this.progressCallback) {
    this.progressCallback(overallProgress, data.message);
  }
  
  console.log(`📊 Progress: ${data.progress}% - ${data.message}`);
}
```

### User Notification System
```javascript
// Console logging throughout process:
console.log(`📥 Triggering download: ${downloadUrl}`);
console.log(`📦 Downloading optimized tile archive (exceeds Sharp's 268MP limit)`);
console.log(`📥 Downloading single ${format.toUpperCase()} file`);

// Status updates in main.js:
this.updateStatus('✅ Processing complete!');
this.updateStatus('✅ Server processing complete!');
this.updateStatus('✅ Download complete!');
```

---

## 7. File System Integration

### Download Destination Handling
```javascript
// Current browser download behavior:
// - Files download to browser's default download folder
// - No user location selection
// - Automatic filename conflict resolution by browser

// Server file storage (server-ultra-fast.js line 27):
composedDir: join(__dirname, 'composed')
// Resolves to: /home/mranderson/testing1.0/composed/

// File cleanup after download (lines 774-799):
async function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  try {
    // Clean up tiles
    if (session.tiles) {
      for (const tile of session.tiles) {
        if (existsSync(tile.path)) {
          await unlink(tile.path);
        }
      }
    }
    
    // Clean up final output file
    if (session.result && session.result.outputPath && existsSync(session.result.outputPath)) {
      await unlink(session.result.outputPath);
    }
    
    sessions.delete(sessionId);
    progressClients.delete(sessionId);
  } catch (error) {
    console.error(`Failed to cleanup ${sessionId}:`, error);
  }
}
```

---

## 8. WebSocket/Real-time Communication

### WebSocket Connection Setup
```javascript
// Client connection (src/server-side-composer.js lines 214-217):
const wsUrl = `${this.wsUrl}/api/progress/${sessionId}`;
console.log(`📡 Connecting to WebSocket: ${wsUrl}`);
this.websocket = new WebSocket(wsUrl);

// Server WebSocket handling (server-ultra-fast.js lines 428-448):
wss.on('connection', (ws, req) => {
  const sessionId = req.url.split('/').pop();
  console.log(`📡 Ultra-fast WebSocket connected: ${sessionId}`);
  
  progressClients.set(sessionId, ws);
  
  ws.on('close', () => {
    progressClients.delete(sessionId);
    console.log(`📡 Ultra-fast WebSocket disconnected: ${sessionId}`);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${sessionId}:`, error);
    progressClients.delete(sessionId);
  });
});
```

### WebSocket Message Format
```javascript
// Progress message structure:
{
  type: 'progress',
  progress: 85,                    // 0-100
  message: 'Composing tiles...',   // Human readable status
  stage: 'processing',             // 'processing' or 'complete'
  timestamp: 1758462109469         // Unix timestamp
}

// Error message structure:
{
  type: 'error',
  message: 'Composition failed'
}
```

---

## 9. Configuration and Environment

### Key Configuration Values
```javascript
// Server configuration (server-ultra-fast.js lines 21-29):
const CONFIG = {
  port: process.env.PORT || 3002,              // Server port
  maxTileSize: 100 * 1024 * 1024,             // 100MB per tile
  maxTiles: 100,                               // Maximum tiles per session
  sessionTimeout: 2 * 60 * 60 * 1000,         // 2 hours
  uploadDir: join(__dirname, 'uploads'),        // /home/mranderson/testing1.0/uploads
  composedDir: join(__dirname, 'composed'),     // /home/mranderson/testing1.0/composed
  cleanupInterval: 15 * 60 * 1000              // 15 minutes
};

// Client configuration (src/server-side-composer.js lines 8-9):
this.serverUrl = 'http://localhost:3002';    // HTTP endpoint
this.wsUrl = 'ws://localhost:3002';          // WebSocket endpoint
```

### Environment Variables
- `PORT`: Server port (default: 3002)
- `NODE_ENV`: Development vs production mode (affects error details)

### Development vs Production Differences
```javascript
// Error detail exposure (server-ultra-fast.js lines 826-827):
details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
```

---

## 10. Integration Points for Desktop Service

### Primary Integration Point: Download Trigger
```javascript
// FILE: src/server-side-composer.js
// LINE: 294
// CURRENT CODE:
link.click();

// DESKTOP SERVICE REPLACEMENT:
// Replace this line with:
if (window.desktopService && window.desktopService.downloadFile) {
  window.desktopService.downloadFile(downloadUrl, outputPath);
} else {
  link.click(); // Fallback to browser download
}
```

### Secondary Integration Point: Canvas Download
```javascript
// FILE: src/image-processor.js  
// LINES: 308-309
// CURRENT CODE:
document.body.appendChild(link);
link.click();

// DESKTOP SERVICE REPLACEMENT:
if (window.desktopService && window.desktopService.downloadBlob) {
  window.desktopService.downloadBlob(blob, `${filename}.${this.getFileExtension(format)}`);
} else {
  document.body.appendChild(link);
  link.click();
}
```

### Configuration Integration Point
```javascript
// FILE: src/server-side-composer.js
// LINES: 8-9
// CURRENT CODE:
this.serverUrl = 'http://localhost:3002';

// DESKTOP SERVICE ENHANCEMENT:
this.serverUrl = window.desktopService?.getServerUrl() || 'http://localhost:3002';
```

---

## 11. Desktop Service Interface Requirements

### Required Desktop Service Methods
```javascript
// Desktop service interface that needs to be implemented:
window.desktopService = {
  // Download file from URL to specified path
  downloadFile: async (downloadUrl, outputPath) => {
    // Implementation should:
    // 1. Fetch file from downloadUrl
    // 2. Save to outputPath with proper permissions
    // 3. Handle errors gracefully
    // 4. Return success/failure status
  },
  
  // Download blob data to file
  downloadBlob: async (blob, filename) => {
    // Implementation should:
    // 1. Convert blob to file data
    // 2. Save with specified filename
    // 3. Handle path selection if needed
  },
  
  // Get server URL (optional enhancement)
  getServerUrl: () => {
    // Return configured server URL
    return 'http://localhost:3002';
  }
};
```

### Integration Validation
```javascript
// Add to application initialization:
if (window.desktopService) {
  console.log('✅ Desktop service detected');
  // Verify required methods exist
  const requiredMethods = ['downloadFile', 'downloadBlob'];
  const missingMethods = requiredMethods.filter(method => !window.desktopService[method]);
  if (missingMethods.length > 0) {
    console.warn('⚠️ Missing desktop service methods:', missingMethods);
  }
} else {
  console.log('ℹ️ Using browser download fallback');
}
```

---

## 12. Complete Download Flow Summary

### Step-by-Step Process
1. **Session Creation**: `sessionId = Date.now().toString()` (line 93, server-side-composer.js)
2. **File Upload**: Tiles uploaded to `/home/mranderson/testing1.0/uploads/${sessionId}/`
3. **Session Storage**: `sessions.set(sessionId, {...})` (line 592, server-ultra-fast.js)
4. **Composition Start**: Status changes to 'composing' (line 635, server-ultra-fast.js)
5. **Progress Updates**: WebSocket messages sent via `sendProgress()` (line 451, server-ultra-fast.js)
6. **Completion**: Status changes to 'complete' (line 647, server-ultra-fast.js)
7. **Download Trigger**: `downloadResult()` called (line 274, server-side-composer.js)
8. **File Served**: `/api/download/${sessionId}` endpoint streams file (line 686, server-ultra-fast.js)
9. **Cleanup**: Files deleted after 10 minutes (line 737, server-ultra-fast.js)

### Example Real Session Flow
```
SessionId: 1758462109469
Upload URL: POST http://localhost:3002/api/upload-tiles
WebSocket: ws://localhost:3002/api/progress/1758462109469
Download URL: GET http://localhost:3002/api/download/1758462109469
Output File: enhanced-ultra-fast-1758462109469.avif
File Path: /home/mranderson/testing1.0/composed/[generated-filename]
```

---

## 13. Error Scenarios and Recovery

### Common Error Cases
1. **Session Not Found (404)**: SessionId doesn't exist in memory
2. **Processing Incomplete (400)**: Session status is not 'complete'
3. **File Not Found (404)**: Output file was deleted or doesn't exist
4. **WebSocket Timeout (15min)**: Large image processing exceeded timeout
5. **Server Error (500)**: File read/stream errors

### Recovery Mechanisms
- Session cleanup after 2 hours (automatic)
- File cleanup after 10 minutes post-download
- WebSocket reconnection not implemented (single-use)
- No retry mechanism for failed downloads

---

**End of Analysis Report**

This comprehensive report contains all implementation details necessary for perfect desktop service integration without breaking existing browser-based functionality. The integration points are clearly identified with exact file locations and line numbers for seamless implementation. 
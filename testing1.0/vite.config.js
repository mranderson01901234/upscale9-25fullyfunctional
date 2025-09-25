import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      allow: ['..']
    },
    watch: {
      ignored: ['**/realesrgan_env/**', '**/node_modules/**', '**/.git/**']
    }
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  },
  assetsInclude: ['**/*.wasm'], // Include WASM files as assets
  define: {
    global: 'globalThis'
  },
  worker: {
    format: 'es'
  }
}); 
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'



// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (!normalized.includes('node_modules')) return;

          if (
            normalized.includes('/node_modules/react/') ||
            normalized.includes('/node_modules/react-dom/') ||
            normalized.includes('/node_modules/scheduler/') ||
            normalized.includes('/node_modules/react-router/') ||
            normalized.includes('/node_modules/react-router-dom/') ||
            normalized.includes('/node_modules/@remix-run/router/')
          ) {
            return 'vendor-react';
          }
          if (normalized.includes('/node_modules/recharts/') || normalized.includes('/node_modules/d3-')) {
            return 'vendor-charts';
          }
          if (normalized.includes('/node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
          if (normalized.includes('/node_modules/axios/')) {
            return 'vendor-http';
          }
          if (normalized.includes('/node_modules/gsap/') || normalized.includes('/node_modules/@gsap/')) {
            return 'vendor-gsap';
          }
          if (normalized.includes('/node_modules/html5-qrcode/')) {
            return 'vendor-scanner';
          }
          if (normalized.includes('/node_modules/qrcode.react/')) {
            return 'vendor-qrcode';
          }
          if (normalized.includes('/node_modules/@hello-pangea/')) {
            return 'vendor-dnd';
          }
          if (
            normalized.includes('/node_modules/browser-image-compression/') ||
            normalized.includes('/node_modules/react-image-crop/')
          ) {
            return 'vendor-image';
          }
          if (normalized.includes('/node_modules/react-hot-toast/')) {
            return 'vendor-ui';
          }
        },
      },
    },
    target: 'es2020',
    cssMinify: true,
  },
})

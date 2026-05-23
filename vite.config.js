import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate heavy libraries into their own cacheable chunks
          three: ['three'],
          gsap: ['gsap']
        }
      }
    }
  },
  plugins: [
    ViteImageOptimizer(),
    viteCompression({ algorithm: 'brotliCompress' }),
    visualizer({ open: false, gzipSize: true, brotliSize: true }) // Set open to false for development ease
  ]
});

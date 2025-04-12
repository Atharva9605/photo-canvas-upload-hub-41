
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Add buffer and process polyfills
      "buffer": "buffer",
      "process": "process"
    },
  },
  define: {
    // Add Node.js polyfills with better values
    'process.env': process.env,
    'process.browser': true,
    'process.version': JSON.stringify('16.0.0'),
    'Buffer': ['buffer', 'Buffer'],
    'global': 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
}));

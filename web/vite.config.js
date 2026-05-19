import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    viteSingleFile()
  ],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'index-dev.html',
      output: {
        inlineDynamicImports: true
      }
    }
  },
  server: {
    proxy: {
      '/admin/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})

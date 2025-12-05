import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true, // 允许外部访问
    // 如果使用本地后端，取消下面的注释
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8080',  // 本地后端服务端口
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, '/api'),
    //   },
    // },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
})


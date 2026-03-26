// 专门为 content-overlay.js 生成一个自包含的 IIFE bundle。
// 该脚本通过 chrome.scripting.executeScript 注入页面，必须是无外部依赖的单文件格式。
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false, // 不清空主构建产物
    lib: {
      entry: resolve(__dirname, 'src/content/overlay.tsx'),
      name: 'ContentOverlay',
      formats: ['iife'],
      fileName: () => 'content-overlay.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})

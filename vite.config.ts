/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler|react-is|react-compiler-runtime)[\\/]/,
              priority: 10,
            },
            {
              // html2canvas/jsPDF (y sus dependencias) quedan afuera del
              // chunk 'vendor' a propósito: solo se usan en el flujo
              // "Assinar e Imprimir" (capturePrintAreaToPdf, importado
              // dinámicamente en AppContext.tsx), y entre las dos pesan
              // ~600KB minificados. Agruparlas acá las metía en el chunk
              // eager que baja TODO usuario en la carga inicial, aunque
              // nunca firme nada — al excluirlas, caen en un chunk propio
              // que Rolldown solo pide cuando se llama al import() dinámico.
              name: 'vendor',
              test: /[\\/]node_modules[\\/](?!html2canvas|jspdf|css-line-break|text-segmentation|fflate|fast-png)/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})

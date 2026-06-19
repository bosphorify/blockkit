import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The package is consumed via `file:../..`, which symlinks the repo. Without
// dedupe, `react`/BlockNote would resolve twice (once from the repo's
// node_modules, once from the demo's) — breaking hooks and Mantine context.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      '@blocknote/core',
      '@blocknote/mantine',
      '@blocknote/react',
      '@mantine/core',
      '@mantine/hooks',
    ],
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/owner/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_DEV_PORT || process.env.PORT || 5173),
  },
})


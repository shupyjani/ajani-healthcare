import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
    include: ['src/**/*.test.{js,jsx}'],
    // Placeholder EmailJS identifiers so the contact form renders in its
    // configured state under test. These are not credentials and are not the
    // values used by any deployed build; real values come from a .env file
    // that git ignores.
    env: {
      VITE_EMAILJS_SERVICE_ID: 'test_service_id',
      VITE_EMAILJS_TEMPLATE_ID: 'test_template_id',
      VITE_EMAILJS_PUBLIC_KEY: 'test_public_key',
    },
  },
})

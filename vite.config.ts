import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" TS error
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioritize VITE_API_KEY, then VITE_GEMINI_API_KEY, then API_KEY
  const apiKey = env.VITE_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY || '';

  return {
    plugins: [react()],
    server: {
      port: 3000,
    },
    define: {
      // Polyfill process.env.API_KEY for the Google GenAI SDK to work as expected in the browser
      'process.env.API_KEY': JSON.stringify(apiKey),
    }
  }
})
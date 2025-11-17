import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  server:{
    port:process.env.PORT as unknown as number,
  },
  plugins: [react()],
  base:process.env.VITE_BASE_PATH 
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

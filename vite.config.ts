import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs, so the build works from any path, such as GitHub Pages' /life-timeline/.
  base: './',
});

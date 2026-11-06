import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://squint.example.com',
  base: '/',
  
  // Output als statische HTML-Dateien
  output: 'static',
  
  // Adapter für statische Sites
  adapter: undefined,
  
  // TypeScript-Unterstützung
  typescript: {
    strict: true,
  },
  
  // Markdown-Unterstützung
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
  
  // Image-Optimierung
  image: {
    service: {
      entrypoint: '@astrojs/image/sharp',
    },
    domains: [],
  },
});

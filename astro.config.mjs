import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // Leave output as static (default)
  site: 'https://cyan476.github.io',
  base: '/cyanide-net', // Must match your exact repository name!
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [mdx()]
});
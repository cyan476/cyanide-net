import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static',
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx()],
  adapter: cloudflare()
});
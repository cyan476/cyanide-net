import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import tina from '@tinacms/astro/integration';
import { tinaAdminDevRedirect } from '@tinacms/astro/vite';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [
      tailwindcss(),
      tinaAdminDevRedirect()
    ],
    ssr: {
      noExternal: ['@tinacms/astro', '@tinacms/bridge']
    }
  },
  integrations: [
    mdx(),
    tina()
  ]
});
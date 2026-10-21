import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import { sidebar } from './content-map.mjs';
import mermaidFigures from './scripts/remark-mermaid.mjs';
import { docsOrigin, repositoryOrigin } from './site-config.mjs';

export default defineConfig({
  site: docsOrigin,
  base: '/guide',
  trailingSlash: 'always',
  output: 'static',
  outDir: '../../dist/guide',
  publicDir: './static',
  build: { inlineStylesheets: 'never' },
  // Documentation owns its CSS pipeline independently of the product toolchain.
  vite: { css: { postcss: { plugins: [] } }, build: { assetsInlineLimit: 0 } },
  markdown: { processor: unified({ remarkPlugins: [mermaidFigures] }) },
  integrations: [starlight({
    title: 'POS Platform',
    description: 'Arquitectura, implementación y evidencia técnica del POS corporativo multipaís.',
    locales: { root: { label: 'Español', lang: 'es' } },
    sidebar,
    customCss: ['./src/styles/custom.css'],
    components: { Footer: './src/components/DocsFooter.astro' },
    social: [{ icon: 'github', label: 'Repositorio de documentación', href: repositoryOrigin }],
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
    expressiveCode: { themes: ['github-light', 'github-dark'] },
    pagination: false,
    credits: false,
    favicon: '/favicon.svg',
  })],
});

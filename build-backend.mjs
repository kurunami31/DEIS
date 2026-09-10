import { build } from 'esbuild';

await build({
  entryPoints: ['backend/src/app.js'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'api/app.mjs',
  external: ['@prisma/client', '.prisma/client'],
  treeShaking: true,
  minify: false,
});

console.log('Backend bundled to api/app.mjs');

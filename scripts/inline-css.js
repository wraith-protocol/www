import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const inlinePolicyPath = path.join(rootDir, 'node_modules', '.tmp', 'csp-inline-policy.json');

async function main() {
  const htmlPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error('dist/index.html not found! Run build first.');
    process.exit(1);
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    console.error('dist/assets directory not found!');
    process.exit(1);
  }

  const files = fs.readdirSync(assetsDir);
  const cssFile = files.find((f) => f.endsWith('.css'));

  if (!cssFile) {
    console.log('No CSS file found to inline.');
    return;
  }

  const cssPath = path.join(assetsDir, cssFile);
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  if (/<\/style/i.test(cssContent)) {
    console.error(`Refusing to inline ${cssFile}: contains raw </style sequence.`);
    process.exit(1);
  }

  console.log(`Inlining CSS from assets/${cssFile} (${cssContent.length} bytes)...`);

  const cssRegex =
    /<link[^>]*rel="stylesheet"[^>]*href="\/assets\/index-[^>]*\.css"[^>]*>|<link[^>]*href="\/assets\/index-[^>]*\.css"[^>]*rel="stylesheet"[^>]*>/;

  if (cssRegex.test(html)) {
    const styleSha256 = `sha256-${crypto.createHash('sha256').update(cssContent, 'utf8').digest('base64')}`;
    html = html.replace(cssRegex, () => `<style>${cssContent}</style>`);
    fs.writeFileSync(htmlPath, html, 'utf8');

    fs.mkdirSync(path.dirname(inlinePolicyPath), { recursive: true });
    fs.writeFileSync(
      inlinePolicyPath,
      JSON.stringify(
        {
          sourceAsset: `assets/${cssFile}`,
          inlineStyleHashes: [styleSha256],
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );

    console.log(`Successfully inlined CSS into dist/index.html (${styleSha256})!`);

    fs.unlinkSync(cssPath);
    console.log(`Deleted original CSS file ${cssFile}`);
  } else {
    console.warn('Could not find CSS link tag in dist/index.html');
  }
}

main().catch((err) => {
  console.error('Error inlining CSS:', err);
  process.exit(1);
});

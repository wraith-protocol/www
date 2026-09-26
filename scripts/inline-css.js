import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');

async function main() {
  const htmlPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error('dist/index.html not found! Run build first.');
    process.exit(1);
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // Find css files in dist/assets
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

  console.log(`Inlining CSS from assets/${cssFile} (${cssContent.length} bytes)...`);

  // Find the stylesheet link tag
  // We match any link tag with rel="stylesheet" pointing to /assets/index-....css
  const cssRegex =
    /<link[^>]*rel="stylesheet"[^>]*href="\/assets\/index-[^>]*\.css"[^>]*>|<link[^>]*href="\/assets\/index-[^>]*\.css"[^>]*rel="stylesheet"[^>]*>/;

  if (cssRegex.test(html)) {
    html = html.replace(cssRegex, `<style>${cssContent}</style>`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('Successfully inlined CSS into dist/index.html!');

    // Delete the css file to keep dist clean
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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  const publicFontsDir = path.resolve(__dirname, '../public/fonts');
  if (!fs.existsSync(publicFontsDir)) {
    fs.mkdirSync(publicFontsDir, { recursive: true });
  }

  console.log('Fetching CSS from Google Fonts...');
  const res = await fetch(GOOGLE_FONTS_URL, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch fonts CSS: ${res.statusText}`);
  }

  const css = await res.text();

  // Find all segments that are '/* latin */' followed by '@font-face { ... }'
  const blocks = [];
  const regex = /\/\*\s*latin\s*\*\/[\s\S]*?@font-face\s*\{([\s\S]*?)\}/g;
  let match;

  while ((match = regex.exec(css)) !== null) {
    blocks.push(match[0]);
  }

  console.log(`Found ${blocks.length} latin font-face blocks.`);

  let localCss = '';

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Extract font-family, weight, style, and URL
    const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)['"]?/);
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const styleMatch = block.match(/font-style:\s*([^;]+)/);
    const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    const unicodeRangeMatch = block.match(/unicode-range:\s*([^;]+)/);

    if (!familyMatch || !weightMatch || !urlMatch) {
      continue;
    }

    const family = familyMatch[1];
    const weight = weightMatch[1];
    const style = styleMatch ? styleMatch[1].trim() : 'normal';
    const remoteUrl = urlMatch[1];
    const unicodeRange = unicodeRangeMatch ? unicodeRangeMatch[1].trim() : '';

    const fontName = `${family.toLowerCase().replace(/\s+/g, '-')}-${weight}-${style}.woff2`;
    const localPath = path.join(publicFontsDir, fontName);

    console.log(`Downloading ${family} (Weight: ${weight}, Style: ${style})...`);
    const fontRes = await fetch(remoteUrl);
    if (!fontRes.ok) {
      throw new Error(`Failed to download font file: ${remoteUrl}`);
    }

    const buffer = Buffer.from(await fontRes.arrayBuffer());
    fs.writeFileSync(localPath, buffer);
    console.log(`Saved to public/fonts/${fontName}`);

    // Build local @font-face
    localCss += `/* latin - ${family} ${weight} ${style} */
@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url('/fonts/${fontName}') format('woff2');
  unicode-range: ${unicodeRange};
}\n\n`;
  }

  const cssPath = path.resolve(__dirname, '../public/fonts/fonts.css');
  fs.writeFileSync(cssPath, localCss);
  console.log(`Generated local font CSS at public/fonts/fonts.css`);
}

main().catch((err) => {
  console.error('Error running download script:', err);
  process.exit(1);
});

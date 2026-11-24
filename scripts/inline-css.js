import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const defaultDistDir = path.join(rootDir, 'dist');
const defaultInlinePolicyPath = path.join(
  rootDir,
  'node_modules',
  '.tmp',
  'csp-inline-policy.json',
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildStylesheetLinkRegex(cssFile) {
  const escapedCssFile = escapeRegExp(cssFile);
  const relAttr = 'rel=["\']stylesheet["\']';
  const hrefAttr = `href=["']/assets/${escapedCssFile}["']`;
  return new RegExp(
    `<link\\b[^>]*${relAttr}[^>]*${hrefAttr}[^>]*>|<link\\b[^>]*${hrefAttr}[^>]*${relAttr}[^>]*>`,
  );
}

/**
 * Inlines the built stylesheet into `dist/index.html`, writes the generated
 * inline `<style>` SHA-256 policy JSON, and removes the original CSS asset.
 * Always fails closed by throwing if any required file or tag replacement fails.
 */
export function inlineCss(options = {}) {
  const distDir = path.resolve(options.distDir ?? defaultDistDir);
  const inlinePolicyPath = path.resolve(options.inlinePolicyPath ?? defaultInlinePolicyPath);

  fs.rmSync(inlinePolicyPath, { force: true });

  const htmlPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`dist/index.html not found at ${htmlPath}. Run build first.`);
  }

  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    throw new Error(`dist/assets directory not found at ${assetsDir}.`);
  }

  const files = fs.readdirSync(assetsDir).sort();
  const cssFile =
    files.find((file) => /^index-.*\.css$/.test(file)) ??
    files.find((file) => file.endsWith('.css'));

  if (!cssFile) {
    throw new Error(`No CSS asset found to inline in ${assetsDir}.`);
  }

  const cssPath = path.join(assetsDir, cssFile);
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  if (/<\/style/i.test(cssContent)) {
    throw new Error(`Refusing to inline ${cssFile}: contains raw </style sequence.`);
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const cssRegex = buildStylesheetLinkRegex(cssFile);
  if (!cssRegex.test(html)) {
    throw new Error(
      `Failed to inline CSS: could not find stylesheet <link> tag for /assets/${cssFile} in ${htmlPath}.`,
    );
  }

  const styleSha256 = `sha256-${crypto.createHash('sha256').update(cssContent, 'utf8').digest('base64')}`;
  const replacedHtml = html.replace(cssRegex, () => `<style>${cssContent}</style>`);
  if (replacedHtml === html) {
    throw new Error(`Failed to inline CSS: replacement produced unchanged HTML in ${htmlPath}.`);
  }

  fs.writeFileSync(htmlPath, replacedHtml, 'utf8');

  const sourceAsset = `assets/${cssFile}`;
  const inlineStyleHashes = [styleSha256];
  fs.mkdirSync(path.dirname(inlinePolicyPath), { recursive: true });
  fs.writeFileSync(
    inlinePolicyPath,
    JSON.stringify(
      {
        sourceAsset,
        inlineStyleHashes,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  fs.unlinkSync(cssPath);
  console.log(`Successfully inlined ${sourceAsset} into ${htmlPath} (${styleSha256})!`);

  return {
    sourceAsset,
    inlineStyleHashes,
  };
}

function parseCliArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dist') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --dist');
      }
      options.distDir = value;
      i += 1;
    } else if (arg.startsWith('--dist=')) {
      const value = arg.slice('--dist='.length);
      if (!value) {
        throw new Error('Missing value for --dist');
      }
      options.distDir = value;
    } else if (arg === '--policy') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --policy');
      }
      options.inlinePolicyPath = value;
      i += 1;
    } else if (arg.startsWith('--policy=')) {
      const value = arg.slice('--policy='.length);
      if (!value) {
        throw new Error('Missing value for --policy');
      }
      options.inlinePolicyPath = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv);
  inlineCss(options);
}

const argv1 = process.argv[1];
const isMain =
  typeof argv1 === 'string' &&
  (import.meta.url === pathToFileURL(argv1).href ||
    fileURLToPath(import.meta.url) === path.resolve(argv1));

if (isMain) {
  main().catch((err) => {
    console.error('Error inlining CSS:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

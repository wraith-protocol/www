/**
 * Generate src/data/blog-manifest.json from the MDX blog posts.
 *
 * Frontmatter is parsed and validated exactly once, here. Every downstream
 * consumer (app, RSS, sitemap, related posts, OG images) reads the manifest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BlogManifestError,
  buildBlogManifest,
  serializeBlogManifest,
} from './blog-manifest-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const contentDir = path.join(rootDir, 'src', 'content', 'blog');
const outputPath = path.join(rootDir, 'src', 'data', 'blog-manifest.json');
const authorsPath = path.join(rootDir, 'src', 'data', 'authors.json');
const optOutPath = path.join(rootDir, 'src', 'data', 'authors-optout.json');

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readSources() {
  if (!fs.existsSync(contentDir)) return [];

  return fs
    .readdirSync(contentDir)
    .filter((file) => /\.mdx?$/.test(file))
    .sort()
    .map((file) => ({
      slug: file.replace(/\.mdx?$/, ''),
      sourceFile: `src/content/blog/${file}`,
      source: fs.readFileSync(path.join(contentDir, file), 'utf8'),
    }));
}

function main() {
  const sources = readSources();

  let entries;
  try {
    entries = buildBlogManifest(sources, {
      authors: readJson(authorsPath, {}),
      optOut: readJson(optOutPath, []),
    });
  } catch (error) {
    if (error instanceof BlogManifestError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  fs.writeFileSync(outputPath, serializeBlogManifest(entries));
  const published = entries.filter((entry) => !entry.draft).length;
  console.log(`Generated blog-manifest.json with ${entries.length} posts (${published} published)`);
}

main();

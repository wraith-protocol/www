import { buildManifestEntries, writeManifest } from './lib/blog-manifest.mjs';

const entries = buildManifestEntries();
writeManifest(entries);

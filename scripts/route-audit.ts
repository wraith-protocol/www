/**
 * Prints the inventory-selected Lighthouse URLs for CI.
 *
 * `LIGHTHOUSE_BASE_URL` defaults to the local preview origin. The workflows
 * feed this list into the Lighthouse action instead of keeping a second URL
 * array in the workflow or the LHCI config.
 */

import { getLighthousePages } from '../src/routes/inventory';

const baseUrl = (process.env.LIGHTHOUSE_BASE_URL ?? 'http://localhost:4173').replace(/\/+$/, '');
const pages = getLighthousePages();

if (pages.length === 0) {
  console.error('No routes have policy.lighthouse enabled in src/routes/inventory.ts');
  process.exit(1);
}

for (const page of pages) {
  console.log(`${baseUrl}${page}`);
}

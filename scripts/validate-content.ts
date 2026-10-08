/**
 * Content collection validator — issue #156
 *
 * Validates every JSON data file in src/data/ at build time:
 *   • Required fields are present and have the correct type
 *   • No duplicate slugs / ids within a collection
 *   • URL strings are valid absolute URLs
 *   • Date strings are valid ISO-8601 dates
 *   • Localized i18n files (es.json, pt.json) have the same key shape as en.json
 *
 * On failure: prints source file + record identifier, exits 1.
 * On success: prints a tally and exits 0.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isIsoDate } from '../src/utils/date.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataDir = join(root, 'src', 'data');
const i18nDir = join(root, 'src', 'i18n');

// ---------------------------------------------------------------------------
// Tiny validation DSL (no runtime deps)
// ---------------------------------------------------------------------------

type Ctx = { file: string; record: string };

interface Failure {
  file: string;
  record: string;
  message: string;
}

const failures: Failure[] = [];

function fail(ctx: Ctx, message: string): void {
  failures.push({ file: ctx.file, record: ctx.record, message });
}

// ---------------------------------------------------------------------------
// Primitive checks
// ---------------------------------------------------------------------------

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// isIsoDate is imported from ../src/utils/date.ts

function isUrl(v: unknown): boolean {
  if (!isString(v) || v.trim().length === 0) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Field assertion helpers
// ---------------------------------------------------------------------------

function requireNonEmpty(ctx: Ctx, obj: Record<string, unknown>, field: string): void {
  if (!isNonEmptyString(obj[field])) {
    fail(ctx, `field "${field}" must be a non-empty string (got ${JSON.stringify(obj[field])})`);
  }
}

function requireNumber(ctx: Ctx, obj: Record<string, unknown>, field: string): void {
  if (!isNumber(obj[field])) {
    fail(ctx, `field "${field}" must be a finite number (got ${JSON.stringify(obj[field])})`);
  }
}

function requireBoolean(ctx: Ctx, obj: Record<string, unknown>, field: string): void {
  if (!isBoolean(obj[field])) {
    fail(ctx, `field "${field}" must be a boolean (got ${JSON.stringify(obj[field])})`);
  }
}

function requireArray(ctx: Ctx, obj: Record<string, unknown>, field: string): void {
  if (!isArray(obj[field])) {
    fail(ctx, `field "${field}" must be an array (got ${JSON.stringify(obj[field])})`);
  }
}

function requireUrl(ctx: Ctx, obj: Record<string, unknown>, field: string): void {
  if (!isUrl(obj[field])) {
    fail(ctx, `field "${field}" must be a valid absolute URL (got ${JSON.stringify(obj[field])})`);
  }
}

function requireUrlOrInternalPath(ctx: Ctx, obj: Record<string, unknown>, field: string): void {
  const value = obj[field];

  if (!isString(value) || (!isUrl(value) && !/^\/(?!\/)/.test(value))) {
    fail(
      ctx,
      `field "${field}" must be a valid absolute URL or root-relative path (got ${JSON.stringify(value)})`,
    );
  }
}

function optionalUrl(ctx: Ctx, obj: Record<string, unknown>, field: string): void {
  if (field in obj && obj[field] !== '' && obj[field] != null && !isUrl(obj[field])) {
    fail(
      ctx,
      `field "${field}" must be a valid absolute URL when present (got ${JSON.stringify(obj[field])})`,
    );
  }
}

function requireIsoDate(ctx: Ctx, obj: Record<string, unknown>, field: string): void {
  if (!isIsoDate(obj[field])) {
    fail(
      ctx,
      `field "${field}" must be a valid ISO date string (got ${JSON.stringify(obj[field])})`,
    );
  }
}

function optionalIsoDate(ctx: Ctx, obj: Record<string, unknown>, field: string): void {
  if (field in obj && obj[field] != null && obj[field] !== '' && !isIsoDate(obj[field])) {
    fail(
      ctx,
      `field "${field}" must be a valid ISO date string when present (got ${JSON.stringify(obj[field])})`,
    );
  }
}

function requireOneOf<T extends string>(
  ctx: Ctx,
  obj: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
): void {
  if (!allowed.includes(obj[field] as T)) {
    fail(
      ctx,
      `field "${field}" must be one of [${allowed.join(', ')}] (got ${JSON.stringify(obj[field])})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Duplicate-slug / id detector
// ---------------------------------------------------------------------------

function checkNoDuplicates(file: string, items: Record<string, unknown>[], key: string): void {
  const seen = new Map<string, number>();
  for (const item of items) {
    const v = item[key];
    if (!isString(v)) continue;
    const prev = seen.get(v);
    if (prev !== undefined) {
      const ctx: Ctx = { file, record: `${key}="${v}"` };
      fail(ctx, `duplicate ${key} "${v}" (also at index ${prev})`);
    } else {
      seen.set(v, items.indexOf(item));
    }
  }
}

// ---------------------------------------------------------------------------
// JSON loader
// ---------------------------------------------------------------------------

function loadJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function relPath(abs: string): string {
  return abs.replace(root + '/', '');
}

// ---------------------------------------------------------------------------
// Collection validators
// ---------------------------------------------------------------------------

// ── case-studies.json ──────────────────────────────────────────────────────

function validateCaseStudies(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw) || !isArray(raw['entries'])) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be { entries: [] }' });
    return;
  }
  const entries = raw['entries'] as unknown[];
  checkNoDuplicates(relPath(file), entries as Record<string, unknown>[], 'id');
  checkNoDuplicates(relPath(file), entries as Record<string, unknown>[], 'slug');

  entries.forEach((entry, i) => {
    if (!isObject(entry)) {
      failures.push({ file: relPath(file), record: `entries[${i}]`, message: 'must be an object' });
      return;
    }
    const ctx: Ctx = { file: relPath(file), record: `entries[${i}] id="${entry['id']}"` };
    requireNonEmpty(ctx, entry, 'id');
    requireNonEmpty(ctx, entry, 'slug');
    requireNonEmpty(ctx, entry, 'org');
    requireNonEmpty(ctx, entry, 'logo');
    requireNonEmpty(ctx, entry, 'industry');
    requireNonEmpty(ctx, entry, 'useCase');
    requireIsoDate(ctx, entry, 'integrationDate');
    requireOneOf(ctx, entry, 'status', ['production', 'pilot', 'archived'] as const);
    requireNonEmpty(ctx, entry, 'quote');
    requireNonEmpty(ctx, entry, 'quotee');
    requireNonEmpty(ctx, entry, 'summary');
    requireNonEmpty(ctx, entry, 'challenge');
    requireNonEmpty(ctx, entry, 'solution');
    requireArray(ctx, entry, 'chains');
    requireNonEmpty(ctx, entry, 'testimonial');

    if (!isObject(entry['results'])) {
      fail(ctx, 'field "results" must be an object');
    }
    if (!isObject(entry['technical'])) {
      fail(ctx, 'field "technical" must be an object');
    }
  });
}

// ── authors.json ───────────────────────────────────────────────────────────

function validateAuthors(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be a JSON object' });
    return;
  }
  for (const [id, author] of Object.entries(raw)) {
    const ctx: Ctx = { file: relPath(file), record: `author id="${id}"` };
    if (!isObject(author)) {
      fail(ctx, 'author entry must be an object');
      continue;
    }
    requireNonEmpty(ctx, author, 'name');
    requireNonEmpty(ctx, author, 'bio');
    requireBoolean(ctx, author, 'optIn');

    // avatar is optional but if present must be a string
    if ('avatar' in author && author['avatar'] != null && !isString(author['avatar'])) {
      fail(ctx, 'field "avatar" must be a string when present');
    }
    // links is optional but if present validate known URL fields
    if ('links' in author && author['links'] != null) {
      if (!isObject(author['links'])) {
        fail(ctx, 'field "links" must be an object');
      } else {
        const links = author['links'] as Record<string, unknown>;
        for (const urlField of ['website', 'github', 'twitter'] as const) {
          optionalUrl(ctx, links, urlField);
        }
      }
    }
  }
}

// ── contributors.json ──────────────────────────────────────────────────────

function validateContributors(file: string): void {
  const raw = loadJson(file);
  if (!isArray(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an array' });
    return;
  }
  checkNoDuplicates(relPath(file), raw as Record<string, unknown>[], 'username');

  (raw as unknown[]).forEach((entry, i) => {
    if (!isObject(entry)) {
      failures.push({ file: relPath(file), record: `[${i}]`, message: 'must be an object' });
      return;
    }
    const ctx: Ctx = {
      file: relPath(file),
      record: `contributors[${i}] username="${entry['username']}"`,
    };
    requireNonEmpty(ctx, entry, 'username');
    requireUrl(ctx, entry, 'avatar');
    requireUrl(ctx, entry, 'profile');
    requireNumber(ctx, entry, 'prCount');
    requireArray(ctx, entry, 'waves');
  });
}

// ── faq.json ───────────────────────────────────────────────────────────────

function validateFaq(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an object' });
    return;
  }
  // Validate categories
  if (!isArray(raw['categories'])) {
    failures.push({
      file: relPath(file),
      record: '<root>',
      message: 'field "categories" must be an array',
    });
  } else {
    const cats = raw['categories'] as unknown[];
    checkNoDuplicates(relPath(file), cats as Record<string, unknown>[], 'id');
    cats.forEach((cat, i) => {
      if (!isObject(cat)) return;
      const ctx: Ctx = {
        file: relPath(file),
        record: `categories[${i}] id="${(cat as Record<string, unknown>)['id']}"`,
      };
      requireNonEmpty(ctx, cat as Record<string, unknown>, 'id');
      requireNonEmpty(ctx, cat as Record<string, unknown>, 'title');
    });
  }

  // Build category id set for cross-reference check
  const categoryIds = new Set<string>();
  if (isArray(raw['categories'])) {
    for (const cat of raw['categories'] as unknown[]) {
      if (isObject(cat) && isString(cat['id'])) categoryIds.add(cat['id']);
    }
  }

  // Validate entries
  if (!isArray(raw['entries'])) {
    failures.push({
      file: relPath(file),
      record: '<root>',
      message: 'field "entries" must be an array',
    });
    return;
  }
  const entries = raw['entries'] as unknown[];
  checkNoDuplicates(relPath(file), entries as Record<string, unknown>[], 'id');

  entries.forEach((entry, i) => {
    if (!isObject(entry)) return;
    const ctx: Ctx = { file: relPath(file), record: `entries[${i}] id="${entry['id']}"` };
    requireNonEmpty(ctx, entry, 'id');
    requireNonEmpty(ctx, entry, 'category');
    requireNonEmpty(ctx, entry, 'question');
    requireNonEmpty(ctx, entry, 'answer');
    // category must reference a known category id
    if (
      categoryIds.size > 0 &&
      isString(entry['category']) &&
      !categoryIds.has(entry['category'])
    ) {
      fail(ctx, `field "category" value "${entry['category']}" does not match any category id`);
    }
    // tags optional but must be an array of strings when present
    if ('tags' in entry && entry['tags'] != null) {
      if (!isArray(entry['tags'])) {
        fail(ctx, 'field "tags" must be an array');
      } else {
        for (const tag of entry['tags'] as unknown[]) {
          if (!isString(tag)) {
            fail(ctx, `field "tags" entries must be strings (got ${JSON.stringify(tag)})`);
          }
        }
      }
    }
  });
}

// ── chains.json ────────────────────────────────────────────────────────────

const CHAIN_STATUSES = ['live', 'testnet', 'devnet', 'planned'] as const;

function validateChains(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an object' });
    return;
  }
  requireNonEmpty({ file: relPath(file), record: '<root>' }, raw, 'title');
  requireNonEmpty({ file: relPath(file), record: '<root>' }, raw, 'description');

  if (!isArray(raw['columns'])) {
    failures.push({
      file: relPath(file),
      record: '<root>',
      message: 'field "columns" must be an array',
    });
  }

  if (!isArray(raw['chains'])) {
    failures.push({
      file: relPath(file),
      record: '<root>',
      message: 'field "chains" must be an array',
    });
    return;
  }
  const chains = raw['chains'] as unknown[];
  checkNoDuplicates(relPath(file), chains as Record<string, unknown>[], 'id');

  chains.forEach((chain, i) => {
    if (!isObject(chain)) return;
    const ctx: Ctx = { file: relPath(file), record: `chains[${i}] id="${chain['id']}"` };
    requireNonEmpty(ctx, chain, 'id');
    requireNonEmpty(ctx, chain, 'name');
    requireNumber(ctx, chain, 'blockTime');
    requireNumber(ctx, chain, 'medianFee');
    requireNonEmpty(ctx, chain, 'finality');
    requireNonEmpty(ctx, chain, 'wallets');
    requireOneOf(ctx, chain, 'status', CHAIN_STATUSES);
    requireNonEmpty(ctx, chain, 'audit');
    requireUrl(ctx, chain, 'docs');
    requireNonEmpty(ctx, chain, 'description');
  });
}

// ── wave.json (grants) ─────────────────────────────────────────────────────

const WAVE_STATUSES = ['open', 'closed', 'upcoming'] as const;

function validateWave(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an object' });
    return;
  }

  // currentWave
  if ('currentWave' in raw && raw['currentWave'] != null) {
    const w = raw['currentWave'] as Record<string, unknown>;
    const ctx: Ctx = { file: relPath(file), record: `currentWave id="${w['id']}"` };
    requireNonEmpty(ctx, w, 'id');
    requireNonEmpty(ctx, w, 'name');
    requireOneOf(ctx, w, 'status', WAVE_STATUSES);
    requireIsoDate(ctx, w, 'openDate');
    requireIsoDate(ctx, w, 'closeDate');
    requireNonEmpty(ctx, w, 'budget');
    requireNonEmpty(ctx, w, 'description');
    requireNonEmpty(ctx, w, 'howToApply');
    requireUrl(ctx, w, 'applyUrl');
    requireNonEmpty(ctx, w, 'rewardRange');
    requireArray(ctx, w, 'eligibility');
    requireArray(ctx, w, 'reviewCriteria');
  }

  // pastWaves
  if ('pastWaves' in raw) {
    if (!isArray(raw['pastWaves'])) {
      failures.push({
        file: relPath(file),
        record: '<root>',
        message: 'field "pastWaves" must be an array',
      });
    } else {
      const past = raw['pastWaves'] as unknown[];
      checkNoDuplicates(relPath(file), past as Record<string, unknown>[], 'id');
      past.forEach((w, i) => {
        if (!isObject(w)) return;
        const ctx: Ctx = { file: relPath(file), record: `pastWaves[${i}] id="${w['id']}"` };
        requireNonEmpty(ctx, w, 'id');
        requireNonEmpty(ctx, w, 'name');
        requireOneOf(ctx, w, 'status', WAVE_STATUSES);
        requireNonEmpty(ctx, w, 'budget');
      });
    }
  }

  // faq entries
  if ('faq' in raw) {
    if (!isArray(raw['faq'])) {
      failures.push({
        file: relPath(file),
        record: '<root>',
        message: 'field "faq" must be an array',
      });
    } else {
      const faqEntries = raw['faq'] as unknown[];
      checkNoDuplicates(relPath(file), faqEntries as Record<string, unknown>[], 'id');
      faqEntries.forEach((entry, i) => {
        if (!isObject(entry)) return;
        const ctx: Ctx = { file: relPath(file), record: `faq[${i}] id="${entry['id']}"` };
        requireNonEmpty(ctx, entry, 'id');
        requireNonEmpty(ctx, entry, 'question');
        requireNonEmpty(ctx, entry, 'answer');
      });
    }
  }
}

// ── ecosystem.json ─────────────────────────────────────────────────────────

function validateEcosystem(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an object' });
    return;
  }

  // Validate categories
  if (!isArray(raw['categories'])) {
    failures.push({
      file: relPath(file),
      record: '<root>',
      message: 'field "categories" must be an array',
    });
  } else {
    const cats = raw['categories'] as unknown[];
    checkNoDuplicates(relPath(file), cats as Record<string, unknown>[], 'id');
    cats.forEach((cat, i) => {
      if (!isObject(cat)) return;
      const ctx: Ctx = {
        file: relPath(file),
        record: `categories[${i}] id="${(cat as Record<string, unknown>)['id']}"`,
      };
      requireNonEmpty(ctx, cat as Record<string, unknown>, 'id');
      requireNonEmpty(ctx, cat as Record<string, unknown>, 'label');
      requireNonEmpty(ctx, cat as Record<string, unknown>, 'description');
    });
  }

  // Build category id set
  const categoryIds = new Set<string>();
  if (isArray(raw['categories'])) {
    for (const cat of raw['categories'] as unknown[]) {
      if (isObject(cat) && isString(cat['id'])) categoryIds.add(cat['id']);
    }
  }

  // Validate partners
  if (!isArray(raw['partners'])) {
    failures.push({
      file: relPath(file),
      record: '<root>',
      message: 'field "partners" must be an array',
    });
    return;
  }
  const partners = raw['partners'] as unknown[];

  partners.forEach((partner, i) => {
    if (!isObject(partner)) return;
    const ctx: Ctx = { file: relPath(file), record: `partners[${i}] name="${partner['name']}"` };
    requireNonEmpty(ctx, partner, 'name');
    requireNonEmpty(ctx, partner, 'shortName');
    requireNonEmpty(ctx, partner, 'description');
    requireNonEmpty(ctx, partner, 'category');
    requireUrl(ctx, partner, 'link');
    requireNonEmpty(ctx, partner, 'logo');
    requireNumber(ctx, partner, 'width');
    // category must reference a known category id
    if (
      categoryIds.size > 0 &&
      isString(partner['category']) &&
      !categoryIds.has(partner['category'])
    ) {
      fail(
        ctx,
        `field "category" value "${partner['category']}" does not match any ecosystem category id`,
      );
    }
  });
}

// ── roadmap.json ───────────────────────────────────────────────────────────

const ROADMAP_STATUSES = ['shipped', 'in-progress', 'planned'] as const;

function validateRoadmap(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an object' });
    return;
  }
  optionalUrl({ file: relPath(file), record: '<root>' }, raw, 'docsUrl');

  if (!isArray(raw['milestones'])) {
    failures.push({
      file: relPath(file),
      record: '<root>',
      message: 'field "milestones" must be an array',
    });
    return;
  }
  const milestones = raw['milestones'] as unknown[];
  checkNoDuplicates(relPath(file), milestones as Record<string, unknown>[], 'id');

  milestones.forEach((m, i) => {
    if (!isObject(m)) return;
    const ctx: Ctx = { file: relPath(file), record: `milestones[${i}] id="${m['id']}"` };
    requireNonEmpty(ctx, m, 'id');
    requireNonEmpty(ctx, m, 'phase');
    requireNonEmpty(ctx, m, 'title');
    requireOneOf(ctx, m, 'status', ROADMAP_STATUSES);
    requireNonEmpty(ctx, m, 'summary');
    requireArray(ctx, m, 'highlights');
  });
}

// ── blog-posts.json ────────────────────────────────────────────────────────

function validateBlogPosts(file: string): void {
  const raw = loadJson(file);
  if (!isArray(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an array' });
    return;
  }
  checkNoDuplicates(relPath(file), raw as Record<string, unknown>[], 'slug');

  (raw as unknown[]).forEach((post, i) => {
    if (!isObject(post)) return;
    const ctx: Ctx = { file: relPath(file), record: `posts[${i}] slug="${post['slug']}"` };
    requireNonEmpty(ctx, post, 'slug');
    requireNonEmpty(ctx, post, 'title');
    requireNonEmpty(ctx, post, 'excerpt');
    requireIsoDate(ctx, post, 'publishedAt');
    requireNonEmpty(ctx, post, 'author');
    requireUrl(ctx, post, 'url');
  });
}

// ── vitals fixtures (TypeScript source, not JSON — skip structural check) ──
// vitalsData.ts and vitalsFixtures.ts are TypeScript modules whose shape is
// enforced by the compiler; no separate JSON validation needed.

// ── trust.json ─────────────────────────────────────────────────────────────

function validateTrust(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an object' });
    return;
  }

  // audits section
  if ('audits' in raw) {
    const audits = raw['audits'];
    if (!isObject(audits)) {
      failures.push({ file: relPath(file), record: 'audits', message: 'must be an object' });
    } else {
      requireNonEmpty({ file: relPath(file), record: 'audits' }, audits, 'eyebrow');
      if (!isArray(audits['items'])) {
        failures.push({
          file: relPath(file),
          record: 'audits',
          message: 'field "items" must be an array',
        });
      } else {
        (audits['items'] as unknown[]).forEach((item, i) => {
          if (!isObject(item)) return;
          const ctx: Ctx = { file: relPath(file), record: `audits.items[${i}]` };
          requireNonEmpty(ctx, item, 'label');
          requireNonEmpty(ctx, item, 'status');
          requireNonEmpty(ctx, item, 'detail');
          optionalUrl(ctx, item, 'link');
        });
      }
    }
  }

  // integrations section
  if ('integrations' in raw) {
    const integ = raw['integrations'];
    if (!isObject(integ)) {
      failures.push({ file: relPath(file), record: 'integrations', message: 'must be an object' });
    } else {
      const ctx: Ctx = { file: relPath(file), record: 'integrations' };
      requireNonEmpty(ctx, integ, 'eyebrow');
      requireNumber(ctx, integ, 'count');
      requireNonEmpty(ctx, integ, 'label');
      optionalUrl(ctx, integ, 'link');
    }
  }

  // uptime section
  if ('uptime' in raw) {
    const uptime = raw['uptime'];
    if (!isObject(uptime)) {
      failures.push({ file: relPath(file), record: 'uptime', message: 'must be an object' });
    } else {
      const ctx: Ctx = { file: relPath(file), record: 'uptime' };
      requireNonEmpty(ctx, uptime, 'eyebrow');
      requireNonEmpty(ctx, uptime, 'fallbackPercent');
      requireNonEmpty(ctx, uptime, 'windowLabel');
      requireUrlOrInternalPath(ctx, uptime, 'statusPageUrl');
    }
  }
}

// ── showcase.json ──────────────────────────────────────────────────────────

function validateShowcase(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw) || !isArray(raw['entries'])) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be { entries: [] }' });
    return;
  }
  const entries = raw['entries'] as unknown[];
  entries.forEach((entry, i) => {
    if (!isObject(entry)) {
      failures.push({ file: relPath(file), record: `entries[${i}]`, message: 'must be an object' });
      return;
    }
    const ctx: Ctx = { file: relPath(file), record: `entries[${i}] name="${entry['name']}"` };
    requireNonEmpty(ctx, entry, 'name');
    requireNonEmpty(ctx, entry, 'logo');
    requireNonEmpty(ctx, entry, 'description');
    requireUrl(ctx, entry, 'url');
    requireBoolean(ctx, entry, 'stellar');
  });
}

// ── incidents.json ─────────────────────────────────────────────────────────

const INCIDENT_STATUSES = ['investigating', 'identified', 'monitoring', 'resolved'] as const;
const INCIDENT_IMPACTS = ['none', 'minor', 'major', 'critical'] as const;

function validateIncidents(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw) || !isArray(raw['incidents'])) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be { incidents: [] }' });
    return;
  }
  const incidents = raw['incidents'] as unknown[];
  checkNoDuplicates(relPath(file), incidents as Record<string, unknown>[], 'id');

  incidents.forEach((inc, i) => {
    if (!isObject(inc)) {
      failures.push({
        file: relPath(file),
        record: `incidents[${i}]`,
        message: 'must be an object',
      });
      return;
    }
    const ctx: Ctx = { file: relPath(file), record: `incidents[${i}] id="${inc['id']}"` };
    requireNonEmpty(ctx, inc, 'id');
    requireNonEmpty(ctx, inc, 'title');
    requireOneOf(ctx, inc, 'status', INCIDENT_STATUSES);
    requireOneOf(ctx, inc, 'impact', INCIDENT_IMPACTS);
    requireIsoDate(ctx, inc, 'date');
    optionalIsoDate(ctx, inc, 'resolvedAt');

    if (!isArray(inc['updates'])) {
      fail(ctx, 'field "updates" must be an array');
    } else {
      (inc['updates'] as unknown[]).forEach((u, j) => {
        if (!isObject(u)) return;
        const uctx: Ctx = { file: relPath(file), record: `incidents[${i}].updates[${j}]` };
        requireIsoDate(uctx, u, 'timestamp');
        requireNonEmpty(uctx, u, 'message');
      });
    }
  });
}

// ── security.json ──────────────────────────────────────────────────────────

function validateSecurity(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an object' });
    return;
  }

  // contact
  if ('contact' in raw) {
    const contact = raw['contact'];
    if (!isObject(contact)) {
      failures.push({ file: relPath(file), record: 'contact', message: 'must be an object' });
    } else {
      const ctx: Ctx = { file: relPath(file), record: 'contact' };
      requireNonEmpty(ctx, contact, 'email');
      optionalUrl(ctx, contact, 'acknowledgments');
    }
  }

  // audits section
  if ('audits' in raw) {
    const audits = raw['audits'];
    if (!isObject(audits)) {
      failures.push({ file: relPath(file), record: 'audits', message: 'must be an object' });
    } else {
      const ctx: Ctx = { file: relPath(file), record: 'audits' };
      optionalIsoDate(ctx, audits, 'lastCompleted');
      optionalIsoDate(ctx, audits, 'nextScheduled');
      optionalUrl(ctx, audits, 'reports');
    }
  }

  // bounty section
  if ('bounty' in raw) {
    const bounty = raw['bounty'];
    if (!isObject(bounty)) {
      failures.push({ file: relPath(file), record: 'bounty', message: 'must be an object' });
    } else {
      const ctx: Ctx = { file: relPath(file), record: 'bounty' };
      requireNonEmpty(ctx, bounty, 'status');
      optionalUrl(ctx, bounty, 'url');
    }
  }

  // disclosures section
  if ('disclosures' in raw) {
    const disclosures = raw['disclosures'];
    if (!isObject(disclosures)) {
      failures.push({ file: relPath(file), record: 'disclosures', message: 'must be an object' });
    } else {
      const ctx: Ctx = { file: relPath(file), record: 'disclosures' };
      requireNumber(ctx, disclosures, 'count');
      optionalUrl(ctx, disclosures, 'public');
    }
  }
}

// ── blog-manifest.json ─────────────────────────────────────────────────────

function validateBlogManifest(file: string): void {
  const raw = loadJson(file);
  if (!isArray(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an array' });
    return;
  }
  checkNoDuplicates(relPath(file), raw as Record<string, unknown>[], 'slug');

  (raw as unknown[]).forEach((post, i) => {
    if (!isObject(post)) {
      failures.push({ file: relPath(file), record: `[${i}]`, message: 'must be an object' });
      return;
    }
    const ctx: Ctx = { file: relPath(file), record: `manifest[${i}] slug="${post['slug']}"` };
    requireNonEmpty(ctx, post, 'slug');
    requireNonEmpty(ctx, post, 'title');
    requireNonEmpty(ctx, post, 'excerpt');
    requireIsoDate(ctx, post, 'date');
    requireNonEmpty(ctx, post, 'author');
    requireUrl(ctx, post, 'url');
  });
}

// ── authors-optout.json ────────────────────────────────────────────────────

function validateAuthorsOptout(file: string): void {
  const raw = loadJson(file);
  if (!isArray(raw)) {
    failures.push({
      file: relPath(file),
      record: '<root>',
      message: 'must be an array of strings',
    });
    return;
  }
  (raw as unknown[]).forEach((entry, i) => {
    if (!isNonEmptyString(entry)) {
      failures.push({
        file: relPath(file),
        record: `[${i}]`,
        message: `must be a non-empty string (got ${JSON.stringify(entry)})`,
      });
    }
  });
}

// ── contributors-optout.json ───────────────────────────────────────────────

function validateContributorsOptout(file: string): void {
  const raw = loadJson(file);
  if (!isArray(raw)) {
    failures.push({
      file: relPath(file),
      record: '<root>',
      message: 'must be an array of strings',
    });
    return;
  }
  (raw as unknown[]).forEach((entry, i) => {
    if (!isNonEmptyString(entry)) {
      failures.push({
        file: relPath(file),
        record: `[${i}]`,
        message: `must be a non-empty string (got ${JSON.stringify(entry)})`,
      });
    }
  });
}

// ── team.json ──────────────────────────────────────────────────────────────

function validateTeam(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an object' });
    return;
  }
  requireNonEmpty({ file: relPath(file), record: '<root>' }, raw, 'mission');

  const validatePerson = (ctx: Ctx, person: Record<string, unknown>): void => {
    requireNonEmpty(ctx, person, 'name');
    requireNonEmpty(ctx, person, 'role');
    // bio optional for contributors
    if ('bio' in person && person['bio'] != null && !isNonEmptyString(person['bio'])) {
      fail(ctx, 'field "bio" must be a non-empty string when present');
    }
    optionalUrl(ctx, person, 'github');
    optionalUrl(ctx, person, 'twitter');
  };

  for (const section of ['team', 'advisors', 'contributors'] as const) {
    if (!(section in raw)) continue;
    if (!isArray(raw[section])) {
      failures.push({
        file: relPath(file),
        record: '<root>',
        message: `field "${section}" must be an array`,
      });
      continue;
    }
    (raw[section] as unknown[]).forEach((person, i) => {
      if (!isObject(person)) {
        failures.push({
          file: relPath(file),
          record: `${section}[${i}]`,
          message: 'must be an object',
        });
        return;
      }
      const ctx: Ctx = { file: relPath(file), record: `${section}[${i}] name="${person['name']}"` };
      validatePerson(ctx, person);
    });
  }
}

// ── threat-model.json ──────────────────────────────────────────────────────

function validateThreatModel(file: string): void {
  const raw = loadJson(file);
  if (!isObject(raw)) {
    failures.push({ file: relPath(file), record: '<root>', message: 'must be an object' });
    return;
  }
  const rootCtx: Ctx = { file: relPath(file), record: '<root>' };
  requireNonEmpty(rootCtx, raw, 'title');
  requireNonEmpty(rootCtx, raw, 'overview');

  // schema block
  if ('schema' in raw) {
    const schema = raw['schema'];
    if (!isObject(schema)) {
      fail(rootCtx, 'field "schema" must be an object');
    } else {
      requireNonEmpty({ file: relPath(file), record: 'schema' }, schema, 'name');
    }
  }

  // threatActors
  if ('threatActors' in raw) {
    if (!isArray(raw['threatActors'])) {
      fail(rootCtx, 'field "threatActors" must be an array');
    } else {
      (raw['threatActors'] as unknown[]).forEach((actor, i) => {
        if (!isObject(actor)) return;
        const ctx: Ctx = { file: relPath(file), record: `threatActors[${i}]` };
        requireNonEmpty(ctx, actor, 'key');
        requireNonEmpty(ctx, actor, 'label');
      });
    }
  }

  // approaches
  if (!isArray(raw['approaches'])) {
    fail(rootCtx, 'field "approaches" must be an array');
  } else {
    (raw['approaches'] as unknown[]).forEach((approach, i) => {
      if (!isObject(approach)) return;
      const ctx: Ctx = { file: relPath(file), record: `approaches[${i}] key="${approach['key']}"` };
      requireNonEmpty(ctx, approach, 'key');
      requireNonEmpty(ctx, approach, 'label');
      if ('cells' in approach && !isObject(approach['cells'])) {
        fail(ctx, 'field "cells" must be an object');
      }
    });
  }

  // footnotes
  if ('footnotes' in raw) {
    if (!isArray(raw['footnotes'])) {
      fail(rootCtx, 'field "footnotes" must be an array');
    } else {
      (raw['footnotes'] as unknown[]).forEach((fn, i) => {
        if (!isObject(fn)) return;
        const ctx: Ctx = { file: relPath(file), record: `footnotes[${i}]` };
        requireNumber(ctx, fn, 'id');
        requireNonEmpty(ctx, fn, 'text');
      });
    }
  }
}

// ---------------------------------------------------------------------------
// i18n shape validator
// Checks that every non-English locale JSON has the same leaf-key structure
// as en.json, flagging both missing and extra keys.
// ---------------------------------------------------------------------------

function extractLeafKeys(obj: unknown, prefix = ''): string[] {
  if (!isObject(obj)) return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (isObject(v)) {
      keys.push(...extractLeafKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function validateI18n(): void {
  const files = readdirSync(i18nDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ name: f, path: join(i18nDir, f) }));

  const enFile = files.find((f) => f.name === 'en.json');
  if (!enFile) {
    failures.push({
      file: 'src/i18n/en.json',
      record: '<root>',
      message: 'en.json reference file not found',
    });
    return;
  }

  const enKeys = extractLeafKeys(loadJson(enFile.path));
  const enRelPath = relPath(enFile.path);

  for (const localeFile of files) {
    if (localeFile.name === 'en.json') continue;
    const locale = localeFile.name.replace('.json', '');
    const fileRel = relPath(localeFile.path);
    const localeKeys = extractLeafKeys(loadJson(localeFile.path));

    const enSet = new Set(enKeys);
    const localeSet = new Set(localeKeys);

    const missing = enKeys.filter((k) => !localeSet.has(k));
    const extra = localeKeys.filter((k) => !enSet.has(k));

    for (const k of missing) {
      failures.push({
        file: fileRel,
        record: `locale="${locale}"`,
        message: `key "${k}" is present in ${enRelPath} but missing in ${fileRel}`,
      });
    }
    for (const k of extra) {
      failures.push({
        file: fileRel,
        record: `locale="${locale}"`,
        message: `key "${k}" is in ${fileRel} but not in ${enRelPath} (extra key)`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Runner — dynamic file discovery
//
// Every *.json file in src/data/ must have a registered validator.
// Adding a new collection without a schema causes an immediate build failure,
// so new files can never silently bypass the gate.
// ---------------------------------------------------------------------------

/**
 * Map from basename (e.g. "trust.json") to its validator function.
 * Add a new entry here whenever a new *.json file is added to src/data/.
 */
const SCHEMA_MAP: Record<string, (f: string) => void> = {
  'case-studies.json': validateCaseStudies,
  'authors.json': validateAuthors,
  'contributors.json': validateContributors,
  'faq.json': validateFaq,
  'chains.json': validateChains,
  'wave.json': validateWave,
  'ecosystem.json': validateEcosystem,
  'roadmap.json': validateRoadmap,
  'blog-posts.json': validateBlogPosts,
  'trust.json': validateTrust,
  'showcase.json': validateShowcase,
  'incidents.json': validateIncidents,
  'security.json': validateSecurity,
  'blog-manifest.json': validateBlogManifest,
  'authors-optout.json': validateAuthorsOptout,
  'contributors-optout.json': validateContributorsOptout,
  'team.json': validateTeam,
  'threat-model.json': validateThreatModel,
};

console.log('\n🔍 Validating content collections…\n');

// Discover every *.json file in src/data/ at runtime.
const dataFiles = readdirSync(dataDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

// Fail loudly for any file with no registered schema so nothing sneaks through.
const unregistered = dataFiles.filter((f) => !(f in SCHEMA_MAP));
if (unregistered.length > 0) {
  for (const f of unregistered) {
    console.error(
      `  ✗  src/data/${f} — no validator registered. Add one to SCHEMA_MAP in scripts/validate-content.ts.`,
    );
    failures.push({
      file: `src/data/${f}`,
      record: '<root>',
      message: 'no validator registered in SCHEMA_MAP — add one to validate-content.ts',
    });
  }
}

let checked = 0;
for (const basename of dataFiles) {
  const fn = SCHEMA_MAP[basename];
  if (!fn) continue; // already reported above
  const file = join(dataDir, basename);
  const before = failures.length;
  fn(file);
  const count = failures.length - before;
  const rel = relPath(file);
  if (count === 0) {
    console.log(`  ✅  ${rel}`);
  } else {
    console.log(`  ❌  ${rel} — ${count} issue(s)`);
  }
  checked++;
}

// i18n validation
console.log('\n🔍 Validating i18n locale shape…\n');
const beforeI18n = failures.length;
validateI18n();
const i18nCount = failures.length - beforeI18n;
if (i18nCount === 0) {
  console.log('  ✅  src/i18n/ — all locales match en.json shape\n');
} else {
  console.log(`  ❌  src/i18n/ — ${i18nCount} parity issue(s)\n`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (failures.length === 0) {
  console.log(`✅  Content validation passed — ${checked} collection(s) checked.\n`);
  process.exit(0);
} else {
  console.error(`\n🚨  Content validation failed — ${failures.length} error(s):\n`);
  for (const f of failures) {
    console.error(`  ${f.file}  [${f.record}]`);
    console.error(`    → ${f.message}\n`);
  }
  process.exit(1);
}

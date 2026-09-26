import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  organization,
  article,
  faqPage,
  howTo,
  breadcrumbList,
  SITE_URL,
} from '../src/utils/jsonld.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const errors = [];

function fail(message) {
  errors.push(message);
  console.error(`❌ ${message}`);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

// --- Local schema.org structural validator ---------------------------------

const VALID_TYPES = new Set([
  'Organization',
  'Article',
  'FAQPage',
  'HowTo',
  'BreadcrumbList',
  'WebPage',
  'ImageObject',
  'ListItem',
  'Question',
  'Answer',
  'HowToStep',
]);

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateBase(blob, path) {
  if (!isObject(blob)) return fail(`${path}: not an object`);
  if (blob['@context'] !== 'https://schema.org') {
    fail(`${path}: @context must be https://schema.org (got ${JSON.stringify(blob['@context'])})`);
  }
  if (typeof blob['@type'] !== 'string') {
    fail(`${path}: @type is required`);
  } else if (!VALID_TYPES.has(blob['@type'])) {
    fail(`${path}: unknown @type "${blob['@type']}"`);
  }
}

function validateArticle(blob, path) {
  if (typeof blob.headline !== 'string' || !blob.headline)
    fail(`${path}: Article.headline required`);
  if (!isObject(blob.author)) fail(`${path}: Article.author required`);
  else if (blob.author['@type'] !== 'Organization')
    fail(`${path}: Article.author must be Organization`);
  if (!isObject(blob.publisher)) fail(`${path}: Article.publisher required`);
  else if (blob.publisher['@type'] !== 'Organization')
    fail(`${path}: Article.publisher must be Organization`);
  if (typeof blob.datePublished !== 'string') fail(`${path}: Article.datePublished required`);
}

function validateFaqPage(blob, path) {
  if (!Array.isArray(blob.mainEntity) || blob.mainEntity.length === 0) {
    return fail(`${path}: FAQPage.mainEntity must be a non-empty array`);
  }
  blob.mainEntity.forEach((item, i) => {
    const sub = `${path}.mainEntity[${i}]`;
    if (item['@type'] !== 'Question') fail(`${sub}: must be Question`);
    if (typeof item.name !== 'string' || !item.name) fail(`${sub}: Question.name required`);
    if (!isObject(item.acceptedAnswer)) fail(`${sub}: acceptedAnswer required`);
    else {
      if (item.acceptedAnswer['@type'] !== 'Answer') fail(`${sub}: acceptedAnswer must be Answer`);
      if (typeof item.acceptedAnswer.text !== 'string' || !item.acceptedAnswer.text) {
        fail(`${sub}: acceptedAnswer.text required`);
      }
    }
  });
}

function validateHowTo(blob, path) {
  if (typeof blob.name !== 'string' || !blob.name) fail(`${path}: HowTo.name required`);
  if (!Array.isArray(blob.step) || blob.step.length === 0) {
    return fail(`${path}: HowTo.step must be a non-empty array`);
  }
  blob.step.forEach((step, i) => {
    const sub = `${path}.step[${i}]`;
    if (step['@type'] !== 'HowToStep') fail(`${sub}: must be HowToStep`);
    if (typeof step.name !== 'string' || !step.name) fail(`${sub}: HowToStep.name required`);
    if (typeof step.text !== 'string' || !step.text) fail(`${sub}: HowToStep.text required`);
    if (typeof step.position !== 'number') fail(`${sub}: HowToStep.position required`);
  });
}

function validateBreadcrumb(blob, path) {
  if (!Array.isArray(blob.itemListElement) || blob.itemListElement.length === 0) {
    return fail(`${path}: BreadcrumbList.itemListElement must be a non-empty array`);
  }
  blob.itemListElement.forEach((item, i) => {
    const sub = `${path}.itemListElement[${i}]`;
    if (item['@type'] !== 'ListItem') fail(`${sub}: must be ListItem`);
    if (typeof item.position !== 'number') fail(`${sub}: ListItem.position required`);
    if (typeof item.name !== 'string' || !item.name) fail(`${sub}: ListItem.name required`);
    if (typeof item.item !== 'string' || !item.item) fail(`${sub}: ListItem.item required`);
  });
}

function validate(blob, label) {
  validateBase(blob, label);
  switch (blob['@type']) {
    case 'Article':
      validateArticle(blob, label);
      break;
    case 'FAQPage':
      validateFaqPage(blob, label);
      break;
    case 'HowTo':
      validateHowTo(blob, label);
      break;
    case 'BreadcrumbList':
      validateBreadcrumb(blob, label);
      break;
    case 'Organization':
      if (typeof blob.name !== 'string') fail(`${label}: Organization.name required`);
      if (typeof blob.url !== 'string') fail(`${label}: Organization.url required`);
      break;
    default:
      break;
  }
}

// --- Build every emitted blob -----------------------------------------------

const blobs = [];

// 1. Organization (mirrors index.html)
blobs.push({ label: 'Organization (home)', blob: organization() });

// 2. Case study Articles + breadcrumbs (from data)
const caseStudies = JSON.parse(
  readFileSync(resolve(root, 'src/data/case-studies.json'), 'utf8'),
).entries;
caseStudies.forEach((study) => {
  const url = `${SITE_URL}/case-studies/${study.slug}`;
  blobs.push({
    label: `Article (case-study:${study.slug})`,
    blob: article({
      headline: `${study.org} - ${study.useCase}`,
      description: study.summary,
      datePublished: study.integrationDate,
      authorName: study.org,
      url,
    }),
  });
  blobs.push({
    label: `BreadcrumbList (case-study:${study.slug})`,
    blob: breadcrumbList([
      { name: 'Home', url: SITE_URL },
      { name: 'Case Studies', url: `${SITE_URL}/case-studies` },
      { name: study.org, url },
    ]),
  });
});

// 3. FAQPage (from data)
const faq = JSON.parse(readFileSync(resolve(root, 'src/data/faq.json'), 'utf8'));
blobs.push({
  label: 'FAQPage (/faq)',
  blob: faqPage(faq.entries.map((e) => ({ question: e.question, answer: e.answer }))),
});

// 4. Blog Articles + breadcrumbs (parse MDX frontmatter)
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    const value = raw.trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }
  return data;
}

const blogDir = resolve(root, 'src/content/blog');
readdirSync(blogDir)
  .filter((file) => file.endsWith('.mdx'))
  .forEach((file) => {
    const fm = parseFrontmatter(readFileSync(resolve(blogDir, file), 'utf8'));
    const slug = file.replace(/\.mdx$/, '');
    const url = `${SITE_URL}/blog/${slug}`;
    blobs.push({
      label: `Article (blog:${slug})`,
      blob: article({
        headline: fm.title || slug,
        description: fm.excerpt || '',
        datePublished: fm.date || '',
        authorName: fm.author || 'Wraith Team',
        url,
      }),
    });
    blobs.push({
      label: `BreadcrumbList (blog:${slug})`,
      blob: breadcrumbList([
        { name: 'Home', url: SITE_URL },
        { name: 'Blog', url: `${SITE_URL}/blog` },
        { name: fm.title || slug, url },
      ]),
    });
  });

// 5. HowTo (from grant wave data)
const wave = JSON.parse(readFileSync(resolve(root, 'src/data/wave.json'), 'utf8')).currentWave;
if (wave) {
  blobs.push({
    label: 'HowTo (/grants)',
    blob: howTo({
      name: `How to apply for ${wave.name}`,
      description:
        'Follow these steps to submit a proposal and get funded through the Wraith grant program.',
      url: `${SITE_URL}/grants`,
      steps: [
        {
          name: 'Confirm eligibility',
          text: `Review the eligibility criteria: ${(wave.eligibility ?? []).join(' ')}`,
        },
        {
          name: 'Prepare your proposal',
          text: wave.howToApply ?? 'Include a clear scope, timeline, and budget breakdown.',
        },
        {
          name: 'Submit on Drips',
          text: `Open the Drips grant page and submit before the wave closes: ${wave.applyUrl}`,
          url: wave.applyUrl,
        },
        {
          name: 'Await review',
          text: `Proposals are reviewed against: ${(wave.reviewCriteria ?? []).join(' ')}`,
        },
      ],
    }),
  });
}

// 6. Blog author breadcrumb (sample)
blobs.push({
  label: 'BreadcrumbList (/blog/author:sample)',
  blob: breadcrumbList([
    { name: 'Home', url: SITE_URL },
    { name: 'Blog', url: `${SITE_URL}/blog` },
    { name: 'Wraith Team', url: `${SITE_URL}/blog/author/wraith-team` },
  ]),
});

// --- Validate + report -----------------------------------------------------

console.log(`Validating ${blobs.length} JSON-LD blobs...\n`);
errors.length = 0;
blobs.forEach(({ label, blob }) => {
  const before = errors.length;
  validate(blob, label);
  if (errors.length === before) ok(label);
});

if (errors.length > 0) {
  console.error(`\nJSON-LD validation failed: ${errors.length} error(s).`);
  process.exit(1);
}

console.log(`\nAll ${blobs.length} JSON-LD blobs are valid.`);

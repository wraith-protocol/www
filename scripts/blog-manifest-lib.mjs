/**
 * Structured blog frontmatter parser, validator, and manifest builder.
 *
 * This module is the single source of truth for how blog frontmatter is
 * parsed. It implements a small, strict YAML subset (mappings, sequences,
 * quoted scalars, block scalars, flow arrays, comments) instead of the
 * line-splitting/regex parsing that used to be duplicated in every publisher.
 *
 * `scripts/gen-blog-manifest.mjs` writes the artifact; the app, RSS, sitemap,
 * related-posts and OG generators all read that artifact.
 */

export const SUPPORTED_LOCALES = ['en', 'es', 'pt'];
export const BLOG_URL_PREFIX = 'https://usewraith.xyz/blog';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export class FrontmatterError extends Error {
  constructor(file, message) {
    super(`${message}`);
    this.name = 'FrontmatterError';
    this.file = file;
    this.reason = message;
  }
}

export class BlogManifestError extends Error {
  constructor(messages) {
    const list = Array.isArray(messages) ? messages : [messages];
    super(`Invalid blog content:\n${list.map((message) => `  - ${message}`).join('\n')}`);
    this.name = 'BlogManifestError';
    this.messages = list;
  }
}

// ─── YAML subset parser ──────────────────────────────────────────────────────

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripInlineComment(text) {
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote === "'") {
      if (char === "'" && text[i + 1] === "'") i += 1;
      else if (char === "'") quote = null;
      continue;
    }
    if (quote === '"') {
      if (char === '\\') i += 1;
      else if (char === '"') quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === '#' && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i).trimEnd();
    }
  }
  return text;
}

function parsePlainScalar(text) {
  const value = stripInlineComment(text).trim();
  if (value === '') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d*\.\d+$/.test(value)) return Number(value);
  return value;
}

function readQuotedScalar(text, quote) {
  let value = '';
  for (let i = 1; i < text.length; i += 1) {
    const char = text[i];
    if (quote === "'") {
      if (char === "'") {
        if (text[i + 1] === "'") {
          value += "'";
          i += 1;
          continue;
        }
        return { value, closed: true, rest: text.slice(i + 1) };
      }
      value += char;
      continue;
    }
    if (char === '"') {
      return { value, closed: true, rest: text.slice(i + 1) };
    }
    if (char === '\\') {
      const next = text[i + 1];
      const escapes = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', 0: '\0' };
      if (next === 'u') {
        const hex = text.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          return { value, closed: false, rest: '', invalid: `invalid \\u escape "${hex}"` };
        }
        value += String.fromCharCode(parseInt(hex, 16));
        i += 5;
        continue;
      }
      if (next in escapes) {
        value += escapes[next];
        i += 1;
        continue;
      }
      value += next ?? '';
      i += 1;
      continue;
    }
    value += char;
  }
  return { value, closed: false, rest: '' };
}

class YamlSubsetParser {
  constructor(text, file) {
    this.lines = text.split('\n');
    this.file = file;
    this.index = 0;
  }

  error(message, line) {
    const suffix = line ? ` (line ${line})` : '';
    throw new FrontmatterError(this.file, `${message}${suffix}`);
  }

  peek() {
    while (this.index < this.lines.length) {
      const raw = this.lines[this.index];
      const trimmed = raw.trim();
      if (trimmed === '' || trimmed.startsWith('#')) {
        this.index += 1;
        continue;
      }
      if (/^\t/.test(raw) || /^ *\t/.test(raw)) {
        this.error('tab indentation is not allowed in frontmatter', this.index + 2);
      }
      const match = /^( *)(.*)$/.exec(raw);
      return {
        indent: match[1].length,
        text: match[2],
        raw,
        line: this.index + 2,
      };
    }
    return null;
  }

  parseDocument() {
    const first = this.peek();
    if (!first) return {};
    if (first.indent !== 0) {
      this.error('frontmatter keys must start at column 0', first.line);
    }
    if (first.text.startsWith('-')) {
      this.error('frontmatter must be a mapping of keys to values', first.line);
    }
    const value = this.parseMapping(0);
    const remaining = this.peek();
    if (remaining) {
      this.error(`unexpected content "${remaining.text}"`, remaining.line);
    }
    if (!isPlainObject(value)) {
      this.error('frontmatter must be a mapping of keys to values', first.line);
    }
    return value;
  }

  parseMapping(indent) {
    const result = {};

    for (;;) {
      const line = this.peek();
      if (!line || line.indent < indent) break;
      if (line.indent > indent) {
        this.error('unexpected indentation', line.line);
      }
      if (line.text === '-' || line.text.startsWith('- ')) {
        this.error('sequence entry is not valid here; expected "key: value"', line.line);
      }

      const separator = this.findKeySeparator(line.text);
      if (separator === -1) {
        this.error(`expected "key: value" but found "${line.text}"`, line.line);
      }

      const key = line.text.slice(0, separator).trim();
      if (!key) this.error('empty key', line.line);
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        this.error(`duplicate key "${key}"`, line.line);
      }

      const rest = line.text.slice(separator + 1).trim();
      this.index += 1;

      if (rest === '' || rest.startsWith('#')) {
        result[key] = this.parseNestedValue(indent);
      } else if (rest.startsWith('|') || rest.startsWith('>')) {
        result[key] = this.parseBlockScalar(rest, indent, line.line);
      } else {
        result[key] = this.parseInlineValue(rest, indent, line.line);
      }
    }

    return result;
  }

  findKeySeparator(text) {
    let quote = null;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quote) {
        if (quote === "'" && char === "'") {
          if (text[i + 1] === "'") i += 1;
          else quote = null;
        } else if (quote === '"' && char === '"') {
          quote = null;
        } else if (quote === '"' && char === '\\') {
          i += 1;
        }
        continue;
      }
      if (char === "'" || char === '"') {
        quote = char;
        continue;
      }
      if (char === ':' && (i === text.length - 1 || /\s/.test(text[i + 1]))) {
        return i;
      }
    }
    return -1;
  }

  parseNestedValue(parentIndent) {
    const line = this.peek();
    if (!line) return null;
    if (line.indent > parentIndent) {
      return this.parseBlock(line.indent);
    }
    if (line.indent === parentIndent && (line.text === '-' || line.text.startsWith('- '))) {
      return this.parseSequence(line.indent);
    }
    return null;
  }

  parseBlock(indent) {
    const line = this.peek();
    if (!line || line.indent < indent) return null;
    if (line.text === '-' || line.text.startsWith('- ')) {
      return this.parseSequence(line.indent);
    }
    return this.parseMapping(line.indent);
  }

  parseSequence(indent) {
    const items = [];

    for (;;) {
      const line = this.peek();
      if (!line || line.indent < indent) break;
      if (line.indent > indent) {
        this.error('unexpected indentation in sequence', line.line);
      }
      if (!(line.text === '-' || line.text.startsWith('- '))) break;

      const rest = line.text === '-' ? '' : line.text.slice(2).trim();
      this.index += 1;

      if (rest === '' || rest.startsWith('#')) {
        const nested = this.peek();
        items.push(nested && nested.indent > indent ? this.parseBlock(nested.indent) : null);
      } else if (rest.startsWith('|') || rest.startsWith('>')) {
        items.push(this.parseBlockScalar(rest, indent, line.line));
      } else {
        items.push(this.parseInlineValue(rest, indent, line.line));
      }
    }

    return items;
  }

  parseInlineValue(text, parentIndent, line) {
    const value = text.trim();

    if (value.startsWith('[')) {
      return this.parseFlowSequence(value, line);
    }
    if (value.startsWith('{')) {
      this.error('flow mappings are not supported in blog frontmatter', line);
    }
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0];
      let { value: parsed, closed, rest, invalid } = readQuotedScalar(value, quote);
      if (invalid) this.error(invalid, line);
      while (!closed) {
        const next = this.lines[this.index];
        if (next === undefined) {
          this.error('unterminated quoted value', line);
        }
        this.index += 1;
        const result = readQuotedScalar(` ${next.trim()}`, quote);
        if (result.invalid) this.error(result.invalid, line);
        parsed += result.closed ? result.value.replace(/^ /, ' ') : result.value;
        closed = result.closed;
        rest = result.rest;
      }
      const trailing = stripInlineComment(rest).trim();
      if (trailing !== '') {
        this.error(`unexpected text after quoted value: "${trailing}"`, line);
      }
      return parsed;
    }

    return parsePlainScalar(value);
  }

  parseFlowSequence(text, line) {
    let source = text;
    while (!this.hasClosingBracket(source)) {
      const next = this.lines[this.index];
      if (next === undefined) {
        this.error('unterminated flow sequence', line);
      }
      this.index += 1;
      source += `\n${next.trim()}`;
    }

    const body = source.slice(1, source.lastIndexOf(']'));
    const items = [];
    let current = '';
    let quote = null;

    for (let i = 0; i < body.length; i += 1) {
      const char = body[i];
      if (quote) {
        current += char;
        if (quote === "'" && char === "'") {
          if (body[i + 1] === "'") {
            current += body[i + 1];
            i += 1;
          } else {
            quote = null;
          }
        } else if (quote === '"' && char === '"' && body[i - 1] !== '\\') {
          quote = null;
        }
        continue;
      }
      if (char === "'" || char === '"') {
        quote = char;
        current += char;
        continue;
      }
      if (char === ',') {
        items.push(current);
        current = '';
        continue;
      }
      current += char;
    }
    items.push(current);

    const parsed = [];
    for (const rawItem of items) {
      const item = rawItem.trim();
      if (item === '') continue;
      if (item.startsWith('[') || item.startsWith('{')) {
        this.error('nested flow collections are not supported in blog frontmatter', line);
      }
      if (item.startsWith('"') || item.startsWith("'")) {
        const quote = item[0];
        const result = readQuotedScalar(item, quote);
        if (!result.closed) this.error('unterminated quoted value', line);
        const trailing = stripInlineComment(result.rest).trim();
        if (trailing !== '') {
          this.error(`unexpected text after quoted value: "${trailing}"`, line);
        }
        parsed.push(result.value);
        continue;
      }
      parsed.push(parsePlainScalar(item));
    }

    return parsed;
  }

  hasClosingBracket(text) {
    let quote = null;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quote) {
        if (quote === "'" && char === "'") {
          if (text[i + 1] === "'") i += 1;
          else quote = null;
        } else if (quote === '"' && char === '"' && text[i - 1] !== '\\') {
          quote = null;
        }
        continue;
      }
      if (char === "'" || char === '"') {
        quote = char;
        continue;
      }
      if (char === ']') return true;
    }
    return false;
  }

  parseBlockScalar(indicator, parentIndent, line) {
    const style = indicator[0];
    const chomp = indicator.includes('-') ? 'strip' : indicator.includes('+') ? 'keep' : 'clip';
    const trailing = indicator.slice(1).replace(/[+-]/g, '').trim();
    if (trailing && !trailing.startsWith('#')) {
      this.error(`invalid block scalar header "${indicator}"`, line);
    }

    const collected = [];
    while (this.index < this.lines.length) {
      const raw = this.lines[this.index];
      if (raw.trim() === '') {
        collected.push({ raw, blank: true });
        this.index += 1;
        continue;
      }
      const indent = /^( *)/.exec(raw)[1].length;
      if (indent <= parentIndent) break;
      collected.push({ raw, blank: false, indent });
      this.index += 1;
    }

    while (collected.length > 0 && collected[collected.length - 1].blank) {
      collected.pop();
    }
    if (collected.length === 0) return '';

    const baseIndent = Math.min(
      ...collected.filter((entry) => !entry.blank).map((entry) => entry.indent),
    );
    const lines = collected.map((entry) => (entry.blank ? '' : entry.raw.slice(baseIndent)));

    const value =
      style === '|'
        ? lines.join('\n')
        : lines.reduce((acc, current) => {
            if (current === '') return `${acc}\n`;
            if (acc === '' || acc.endsWith('\n')) return `${acc}${current}`;
            return `${acc} ${current}`;
          }, '');

    if (chomp === 'strip') return value.replace(/\n+$/, '');
    if (chomp === 'keep') return value;
    return value.replace(/\n+$/, '') + '\n';
  }
}

/**
 * Parse a Markdown/MDX document into structured frontmatter and body.
 * Throws FrontmatterError when the block is missing, unterminated, or invalid.
 */
export function parseFrontmatter(source, file = '<blog post>') {
  const text = String(source)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');
  const lines = text.split('\n');

  if (lines[0] === undefined || lines[0].trimEnd() !== '---') {
    throw new FrontmatterError(
      file,
      'missing frontmatter block (expected "---" on the first line)',
    );
  }

  let closing = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trimEnd() === '---') {
      closing = i;
      break;
    }
  }
  if (closing === -1) {
    throw new FrontmatterError(file, 'unterminated frontmatter block (missing closing "---")');
  }

  const yaml = lines.slice(1, closing).join('\n');
  const content = lines
    .slice(closing + 1)
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\s+$/, '');

  const data = new YamlSubsetParser(yaml, file).parseDocument();
  return { data, content };
}

// ─── Validation and normalization ───────────────────────────────────────────

function normalizeDate(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!DATE_PATTERN.test(raw)) return null;
  const date = new Date(`${raw.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  const [year, month, day] = raw.slice(0, 10).split('-').map(Number);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return raw.slice(0, 10);
}

function resolveAuthorFields(author, authors, optOut) {
  const collapsed = { authorName: 'Wraith Team', authorId: null };
  if (!author) return collapsed;
  if (optOut.includes(author)) return collapsed;

  const profile = authors[author];
  if (profile && profile.optIn) return { authorName: profile.name, authorId: author };
  if (profile && !profile.optIn) return collapsed;
  return { authorName: author, authorId: null };
}

export function deriveExcerpt(content, limit = 160) {
  let inCodeFence = false;
  const paragraph = [];

  for (const line of String(content).split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;
    if (trimmed === '') {
      if (paragraph.length > 0) break;
      continue;
    }
    if (/^(#|>|<|---)/.test(trimmed)) {
      if (paragraph.length > 0) break;
      continue;
    }
    if (/^\[[^\]]+\]\([^)]+\)$/.test(trimmed)) continue;
    paragraph.push(trimmed);
  }

  return paragraph
    .join(' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .slice(0, limit)
    .trim();
}

/**
 * Validate normalized frontmatter fields. Returns a list of human-readable
 * problems; an empty list means the post is publishable.
 */
export function validateFrontmatter(data, { slug } = {}) {
  const problems = [];

  if (slug !== undefined && !SLUG_PATTERN.test(slug)) {
    problems.push(`slug "${slug}" must be lowercase kebab-case (letters, digits, single hyphens)`);
  }
  if (typeof data.title !== 'string' || data.title.trim() === '') {
    problems.push(`required field "title" must be a non-empty string`);
  }
  if (typeof data.author !== 'string' || data.author.trim() === '') {
    problems.push(`required field "author" must be a non-empty string`);
  }
  if (!normalizeDate(data.date ?? data.publishedAt)) {
    problems.push(
      `required field "date" must be a valid ISO date (YYYY-MM-DD), got ${JSON.stringify(
        data.date ?? data.publishedAt ?? null,
      )}`,
    );
  }
  if (!Array.isArray(data.tags)) {
    problems.push(`required field "tags" must be an array of strings`);
  } else {
    data.tags.forEach((tag, index) => {
      if (typeof tag !== 'string' || tag.trim() === '') {
        problems.push(`field "tags[${index}]" must be a non-empty string`);
      }
    });
  }
  if (data.locale !== undefined && !SUPPORTED_LOCALES.includes(data.locale)) {
    problems.push(
      `field "locale" must be one of [${SUPPORTED_LOCALES.join(', ')}], got ${JSON.stringify(
        data.locale,
      )}`,
    );
  }
  if (data.draft !== undefined && typeof data.draft !== 'boolean') {
    problems.push(`field "draft" must be a boolean (true or false)`);
  }
  if (data.excerpt !== undefined && typeof data.excerpt !== 'string') {
    problems.push(`field "excerpt" must be a string when present`);
  }

  return problems;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const result = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const trimmed = tag.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function createEntry({ slug, data, content, sourceFile, authors, optOut }) {
  const author = String(data.author).trim();
  const tags = normalizeTags(data.tags);
  const { authorName, authorId } = resolveAuthorFields(author, authors, optOut);

  return {
    slug,
    title: String(data.title).trim(),
    excerpt: data.excerpt ? String(data.excerpt).trim() : deriveExcerpt(content),
    content,
    date: normalizeDate(data.date ?? data.publishedAt),
    author,
    authorName,
    authorId,
    tags,
    locale: data.locale ?? 'en',
    draft: data.draft === true,
    url: `${BLOG_URL_PREFIX}/${slug}`,
    sourceFile,
  };
}

/**
 * Build the deterministic blog manifest from parsed sources.
 *
 * @param {Array<{slug: string, sourceFile: string, source: string}>} sources
 * @param {{authors?: Record<string, {name: string, optIn?: boolean}>, optOut?: string[]}} [options]
 * @returns {Array<Record<string, unknown>>} entries sorted newest-first, then by slug
 * @throws {BlogManifestError} when any post fails validation
 */
export function buildBlogManifest(sources, options = {}) {
  const authors = options.authors ?? {};
  const optOut = options.optOut ?? [];
  const errors = [];
  const seen = new Map();
  const entries = [];

  for (const source of sources) {
    const label = source.sourceFile ?? source.slug ?? '<blog post>';
    const slug = source.slug;
    const seenAt = seen.get(slug);
    if (seenAt) {
      errors.push(`${label}: duplicate slug "${slug}" (also defined by ${seenAt})`);
      continue;
    }
    seen.set(slug, label);

    let parsed;
    try {
      parsed = parseFrontmatter(source.source, label);
    } catch (error) {
      if (error instanceof FrontmatterError) {
        errors.push(`${label}: ${error.reason}`);
        continue;
      }
      throw error;
    }

    const problems = validateFrontmatter(parsed.data, { slug });
    if (problems.length > 0) {
      for (const problem of problems) errors.push(`${label}: ${problem}`);
      continue;
    }

    entries.push(
      createEntry({
        slug,
        data: parsed.data,
        content: parsed.content,
        sourceFile: label,
        authors,
        optOut,
      }),
    );
  }

  if (errors.length > 0) {
    throw new BlogManifestError(errors);
  }

  return entries.sort(
    (left, right) =>
      Date.parse(right.date) - Date.parse(left.date) || left.slug.localeCompare(right.slug),
  );
}

const PRINT_WIDTH = 100;

function serializeTags(tags, indent) {
  const items = tags.map((tag) => JSON.stringify(tag));
  const inline = `[${items.join(', ')}]`;
  if (indent.length + '"tags": '.length + inline.length + 1 <= PRINT_WIDTH) {
    return `${indent}"tags": ${inline},`;
  }
  return `${indent}"tags": [\n${items
    .map((item) => `${indent}  ${item}`)
    .join(',\n')}\n${indent}],`;
}

/**
 * Serialize a manifest with stable key order and a trailing newline. Output is
 * deterministic and matches the repository's Prettier settings so a generated
 * file never fails `pnpm format:check`.
 */
export function serializeBlogManifest(entries) {
  const blocks = entries.map((entry) => {
    const indent = '    ';
    const lines = [
      `${indent}"slug": ${JSON.stringify(entry.slug)},`,
      `${indent}"title": ${JSON.stringify(entry.title)},`,
      `${indent}"excerpt": ${JSON.stringify(entry.excerpt)},`,
      `${indent}"content": ${JSON.stringify(entry.content)},`,
      `${indent}"date": ${JSON.stringify(entry.date)},`,
      `${indent}"author": ${JSON.stringify(entry.author)},`,
      `${indent}"authorName": ${JSON.stringify(entry.authorName)},`,
      `${indent}"authorId": ${JSON.stringify(entry.authorId)},`,
      serializeTags(entry.tags, indent),
      `${indent}"locale": ${JSON.stringify(entry.locale)},`,
      `${indent}"draft": ${JSON.stringify(entry.draft)},`,
      `${indent}"url": ${JSON.stringify(entry.url)},`,
      `${indent}"sourceFile": ${JSON.stringify(entry.sourceFile)}`,
    ];
    return `  {\n${lines.join('\n')}\n  }`;
  });

  return `[\n${blocks.join(',\n')}\n]\n`;
}

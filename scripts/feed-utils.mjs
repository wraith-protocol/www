function slugifyTag(tag) {
  return String(tag)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const ARCHIVE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidArchiveSlug(slug) {
  return typeof slug === 'string' && ARCHIVE_SLUG_PATTERN.test(slug);
}

function parseTags(raw) {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }

  if (typeof raw !== 'string') return [];

  const value = raw.trim();
  if (!value) return [];

  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  return value
    .split(/[\s,]+/)
    .map((item) => item.replace(/^['"]|['"]$/g, '').trim())
    .filter(Boolean);
}

export { slugifyTag, parseTags, isValidArchiveSlug };

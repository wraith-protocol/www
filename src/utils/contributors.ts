import optOutData from '../data/contributors-optout.json';

/**
 * Filters out contributors who appear in the opt-out list.
 * Comparison is case-insensitive so handle casing differences
 * between data sources are handled gracefully.
 *
 * If every contributor for a project is opted out, an empty
 * array is returned — callers should handle this gracefully
 * (e.g. render no contributor tags).
 */
export function filterOptedOutContributors(
  contributors: string[],
  optOutList: string[] = optOutData,
): string[] {
  const lowerOptOut = new Set(optOutList.map((name) => name.toLowerCase()));
  return contributors.filter((contributor) => !lowerOptOut.has(contributor.toLowerCase()));
}

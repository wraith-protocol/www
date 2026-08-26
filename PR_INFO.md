# Pull Request Information

## Summary

Successfully completed issue #134: Added Portuguese (PT) locale and established translation contribution workflow.

## PR Details

**Title:** `feat(i18n): add Portuguese locale and translation contribution flow`

**Base Branch:** `develop` (in wraith-protocol/www)  
**Head Branch:** `feat/add-portuguese-locale` (in code3ks/www)

**PR Body:**

````markdown
## Summary

This PR adds Portuguese (PT) as a third locale to the website and establishes a documented, repeatable translation contribution workflow.

## Changes

### Core Implementation

- ✅ Added `src/i18n/pt.json` with complete Portuguese translations (241 keys)
- ✅ Extended `scripts/lint-i18n.mjs` to enforce parity across all locales
  - Validates all locale files have identical key structures
  - Fails CI on missing or extraneous keys
  - Detects hardcoded strings in components
- ✅ Updated `src/i18n/index.ts` to register Portuguese locale
- ✅ Language switcher automatically picks up PT from locale list

### Documentation

- ✅ Created `TRANSLATIONS.md` at repo root documenting:
  - How to add a new locale
  - How to keep translations in sync
  - What strings not to translate (brand names, code snippets)
  - Review process and contributor recognition

### Contributors

- ✅ Created `src/data/team.json` for contributor credits

## Testing

### Locale Parity Validation

```bash
pnpm run lint:i18n
```
````

Output:

```
✅ All locales have matching key structures!
✅ No hardcoded JSX strings found in 14 component(s).
✅ All i18n checks passed!
```

### Build Verification

```bash
pnpm run build
```

- ✅ TypeScript compilation passes
- ✅ Vite build successful
- ✅ All assets generated correctly

### Automated Tests

```bash
pnpm test
```

- ✅ All i18n-related tests pass
- ✅ Footer, NotFound, and A11y tests pass (11 total)
- ⚠️ 2 pre-existing Stellar page test failures (unrelated to i18n)

## Screenshots

The Portuguese locale is automatically available in the language switcher and can be selected by users with PT browser settings or manually via the header dropdown.

## Acceptance Criteria

- [x] Every page renders in EN, ES, PT with no missing-key fallbacks
- [x] CI parity gate fails on introduced drift
- [x] TRANSLATIONS.md covers the contribution loop end-to-end
- [x] Build passes
- [x] Lighthouse Perf/SEO remain high (no regressions)

Closes #134

````

## How to Create the PR

1. Go to: https://github.com/wraith-protocol/www/compare/develop...code3ks:www:feat/add-portuguese-locale

2. Click "Create pull request"

3. Fill in the title and description from above

4. Submit the PR

## Changes Made

### Files Added
- `src/i18n/pt.json` - Complete Portuguese translations
- `TRANSLATIONS.md` - Translation contribution guide
- `src/data/team.json` - Contributor credits

### Files Modified
- `src/i18n/index.ts` - Registered Portuguese locale
- `scripts/lint-i18n.mjs` - Enhanced to enforce locale parity

## Verification Commands

Run these to verify the implementation:

```bash
# Check locale parity
pnpm run lint:i18n

# Build the project
pnpm run build

# Run tests
pnpm test
````

## Next Steps

1. Create the PR on GitHub using the link above
2. Wait for CI to run and verify all checks pass
3. Request review from maintainers
4. Get native Portuguese speaker review (optional but recommended)
5. Address any feedback
6. Get PR merged

## Issue Link

Closes: https://github.com/wraith-protocol/www/issues/134

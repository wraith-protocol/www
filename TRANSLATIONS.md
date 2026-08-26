# Translation Contribution Guide

This document outlines the process for adding new locales and maintaining translation parity across the Wraith Protocol website.

## Overview

Wraith Protocol uses [react-i18next](https://react.i18next.com/) for internationalization. Translation files are located in `src/i18n/` and follow a strict key structure to ensure consistency across all supported languages.

## Currently Supported Locales

- **English (en)** — Reference locale
- **Spanish (es)** — Spanish translation
- **Portuguese (pt)** — Portuguese translation

## Adding a New Locale

### 1. Create the Translation File

Create a new JSON file in `src/i18n/` named after the [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes):

```bash
# Example: Adding French
cp src/i18n/en.json src/i18n/fr.json
```

### 2. Translate the Content

Open the new file and translate **all values** while keeping the keys unchanged:

**✅ Correct:**

```json
{
  "hero": {
    "heading": "Paiements privés pour chaque chaîne."
  }
}
```

**❌ Incorrect (do not change keys):**

```json
{
  "héros": {
    "titre": "Paiements privés pour chaque chaîne."
  }
}
```

### 3. Register the Locale

Update `src/i18n/index.ts` to import and register the new locale:

```typescript
import fr from './fr.json';

export const SUPPORTED_LOCALES = ['en', 'es', 'pt', 'fr'] as const;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    pt: { translation: pt },
    fr: { translation: fr },
  },
  // ... rest of config
});
```

### 4. Verify Parity

Run the i18n linter to ensure your translation file has all required keys:

```bash
pnpm run lint:i18n
```

The linter will report any missing or extraneous keys. Fix all issues before submitting.

### 5. Test Locally

Start the development server and test the new locale:

```bash
pnpm run dev
```

Use the language switcher in the header to verify all pages render correctly with no missing translations.

### 6. Build and Validate

Run a production build to ensure everything compiles:

```bash
pnpm run build
```

## Translation Guidelines

### What to Translate

✅ **DO translate:**

- All user-facing text
- Navigation labels
- Headings and descriptions
- Button text
- Error messages
- Accessibility labels (aria-label, alt text)

### What NOT to Translate

❌ **DO NOT translate:**

- Brand names: `WRAITH`, `Wraith Protocol`, `Stellar`, `Horizen`, `Solana`, `CKB`
- Technical terms: `ERC-5564`, `ERC-6538`, `SDK`, `API`, `TypeScript`, `Soroban`
- Code snippets: `npm i @wraith-protocol/sdk`
- URLs and domain names
- File extensions and technical identifiers
- Symbols and arrows: `↗`, `·`

### Translation Best Practices

1. **Maintain tone and voice**: Wraith's tone is technical but approachable. Avoid overly formal or casual translations.

2. **Preserve meaning**: Translate the intent, not just the literal words. Technical concepts should remain accurate.

3. **Keep formatting**: Maintain the same capitalization style as the original:
   - `"LIVE ON TESTNET"` → `"EN VIVO EN TESTNET"` (all caps)
   - `"Read the Docs"` → `"Leer la Documentación"` (title case)

4. **Interpolation variables**: Never translate variable names in curly braces:

   ```json
   "switchTo": "Switch to {{lang}}"  → "Cambiar a {{lang}}"
   ```

5. **HTML entities**: Preserve special characters and HTML entities as-is.

## Keeping Translations in Sync

### When Keys Change

If the reference locale (`en.json`) is updated with new keys or structural changes:

1. Pull the latest changes from the repository
2. Run `pnpm run lint:i18n` to identify missing keys
3. Add the missing translations to your locale file
4. Submit a pull request with the updates

### Continuous Parity Enforcement

The CI pipeline runs `lint:i18n` on every pull request and will **fail** if:

- Any locale is missing keys present in `en.json`
- Any locale has extra keys not present in `en.json`
- Any component contains hardcoded multi-word strings not wrapped in `t()`

This ensures that no locale drifts out of sync with the reference.

## Review Process

### For New Locales

1. **Technical review**: Maintainers verify the locale is properly registered and passes all automated checks
2. **Native speaker review**: A native speaker reviews the translation for accuracy and natural phrasing
3. **Build verification**: Maintainers verify the production build completes and all pages render correctly

### For Translation Updates

1. Run `pnpm run lint:i18n` locally before submitting
2. Provide context in your PR description about what changed
3. Tag a native speaker for review if possible

## Contributor Recognition

Contributors who provide or maintain translations are credited in `src/data/team.json` under the `contributors` section (opt-in). If you'd like to be credited, include the following in your pull request:

```json
{
  "name": "Your Name",
  "role": "Translator (Portuguese)",
  "github": "your-github-username"
}
```

## SEO and hreflang

The site automatically generates `hreflang` tags for all supported locales. When you add a new locale, the SEO metadata will automatically include it — no manual configuration needed.

## Getting Help

- **Questions about translation?** Open a discussion in the repository
- **Found a translation error?** Open an issue or submit a PR with the fix
- **Need context for a term?** Check the [project documentation](https://docs.usewraith.xyz) or ask in the PR comments

## Examples

### Adding German (de)

```bash
# 1. Copy reference file
cp src/i18n/en.json src/i18n/de.json

# 2. Translate all values in de.json

# 3. Update src/i18n/index.ts
# Add: import de from './de.json';
# Add 'de' to SUPPORTED_LOCALES array
# Add de: { translation: de } to resources

# 4. Validate
pnpm run lint:i18n

# 5. Test
pnpm run dev

# 6. Build
pnpm run build

# 7. Submit PR
git checkout -b feat/add-german-locale
git add src/i18n/de.json src/i18n/index.ts
git commit -m "feat(i18n): add German (de) locale"
git push origin feat/add-german-locale
```

### Fixing a Missing Key

If `lint:i18n` reports a missing key in `es.json`:

```bash
# Error: es.json missing key "hero.newFeature"

# 1. Find the key in en.json
# "hero": { "newFeature": "New feature description" }

# 2. Add the translation to es.json
# "hero": { "newFeature": "Nueva descripción de función" }

# 3. Validate
pnpm run lint:i18n

# 4. Submit PR
```

## Technical Details

### File Structure

```
src/i18n/
├── en.json          # Reference locale (English)
├── es.json          # Spanish translation
├── pt.json          # Portuguese translation
├── index.ts         # i18n configuration and locale detection
└── [locale].json    # Additional locales
```

### Locale Detection

The site automatically detects the user's preferred language using this priority:

1. **Saved preference**: `localStorage.getItem('wraith-locale')`
2. **Browser language**: First two characters of `navigator.language`
3. **Fallback**: English (`en`)

Users can manually switch languages using the header's language picker, and their choice persists across sessions.

### Automated Checks

The `scripts/lint-i18n.mjs` script performs two checks:

1. **Locale parity validation**: Compares all locale JSON files against the reference to ensure identical key structures
2. **Hardcoded string detection**: Scans React components for multi-word strings not wrapped in translation calls

Both checks run in CI and will block merging if violations are found.

## License

All translations are part of the Wraith Protocol website and inherit the repository's license. By contributing translations, you agree to license your work under the same terms.

---

**Thank you for contributing to Wraith Protocol's internationalization efforts! 🌍**

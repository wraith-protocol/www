# Wraith Protocol — Landing Page

The landing page for [usewraith.xyz](https://usewraith.xyz). A minimal, dark, developer-focused single-page site that explains what Wraith Protocol is and links to docs, demo, and console.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Deployed to Vercel

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Format

```bash
pnpm format        # write
pnpm format:check  # check only
```

## Lighthouse CI

Pull requests are audited in mobile and desktop modes. Performance, accessibility, best practices, and SEO must each score at least 95. Budget failures are reported in a PR comment and fail CI.

For an intentional budget exception, add the `lighthouse-budget-override` label and include a non-empty line in the PR description in this format:

```text
Lighthouse budget override: <reason>
```

The override applies only to category scores below budget; Lighthouse execution errors still fail CI.

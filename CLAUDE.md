# Wraith Protocol Landing Page

You are building the landing page for Wraith Protocol at `usewraith.xyz`. A single-page site that explains what Wraith is and links to everything else.

## What This Site Is

A minimal, dark, premium landing page. NOT a marketing site with testimonials and pricing tables. Think: Linear's landing page, Turso's landing page, Resend's landing page. One page, clear message, developer-focused.

## Stack

- Vite + React + TypeScript
- Tailwind CSS (dark monochrome design system)
- No routing needed — single page
- Deploy to Vercel

## Design System

Same palette as all Wraith products:

| Token              | Hex       |
| ------------------ | --------- |
| surface            | `#0e0e0e` |
| surface-container  | `#141414` |
| surface-bright     | `#1a1a1a` |
| primary            | `#c6c6c7` |
| on-surface         | `#e6e1e5` |
| on-surface-variant | `#c4c7c5` |
| outline            | `#767575` |
| outline-variant    | `#444444` |
| error              | `#ee7d77` |
| tertiary           | `#22c55e` |

Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (code).
No border radius anywhere. Sharp corners.

## Page Sections

### Hero

- Large heading: "Private payments for every chain" or similar — concise, not hype
- Subtitle: one sentence explaining stealth addresses in plain language
- Two CTAs: "Read the Docs" (primary button → docs.usewraith.xyz) and "Try the Demo" (secondary button → demo.usewraith.xyz)
- Below: a code snippet showing the SDK in action (3-4 lines max):

```typescript
import { buildSendStealth } from '@wraith-protocol/sdk/chains/evm';

const { transaction } = buildSendStealth({
  recipientMetaAddress: 'st:eth:0x...',
  amount: '0.1',
  chain: 'horizen',
});
```

### What It Does (3 cards)

Three feature cards in a row:

1. **Stealth Addresses** — every payment goes to a fresh one-time address. No link between sender and recipient.
2. **Multichain** — one SDK, multiple chains. EVM (Horizen, Ethereum, Polygon) and Stellar today. More coming.
3. **AI Agents** — managed AI agents that handle stealth payments, scanning, and privacy analysis inside TEE hardware.

### How It Works

The architecture diagram (reuse the SVG from docs — copy it here). Show the flow: App → SDK → Gateway → Spectre TEE → Chains.

### For Developers

Show the three ways to use Wraith:

**SDK (npm package)**

```bash
npm install @wraith-protocol/sdk
```

Link to docs.usewraith.xyz/sdk/overview

**Demo App**
See stealth payments in action on Horizen and Stellar.
Link to demo.usewraith.xyz

**Console**
Manage your API keys, agents, and usage.
Link to console.usewraith.xyz

### Supported Chains

Row of chain logos/names: Horizen, Stellar, Ethereum (coming), Polygon (coming), Base (coming), Solana (coming).
Active chains in `primary` color. Coming soon chains in `outline` color.

### Footer

- Logo + "Wraith Protocol"
- Links: Docs, Demo, Console, GitHub, npm
- "Built with stealth" or similar subtle tagline
- No copyright notice needed

## Implementation Steps

### Step 1 — Scaffold

- Vite + React + TypeScript
- Tailwind with design system
- Google Fonts (Inter, Space Grotesk, JetBrains Mono)
- Prettier, commitlint, husky, CI
- index.html with meta tags, OG tags
- README.md
- CLAUDE.md committed

### Step 2 — Hero Section

- Heading, subtitle, CTAs, code snippet
- Full viewport height
- Code snippet with syntax-like styling (font-mono, colored tokens)

### Step 3 — Feature Cards + How It Works

- Three cards in a grid
- Architecture diagram (SVG file, not inline)
- Clean spacing between sections

### Step 4 — For Developers + Chains + Footer

- Developer section with install command and links
- Chain grid
- Footer with links

## Final Structure

```
www/
  package.json
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  index.html
  .prettierrc
  .github/workflows/ci.yml
  README.md
  CLAUDE.md
  src/
    main.tsx
    App.tsx
    index.css
    components/
      Hero.tsx
      Features.tsx
      Architecture.tsx
      ForDevelopers.tsx
      Chains.tsx
      Footer.tsx
  public/
    logo-white.png
    architecture.svg
```

## Rules

- NEVER add Co-Authored-By lines to commits
- NEVER add numbered step comments in code
- All commit messages MUST follow conventional commits format
- Commit and push after each completed step
- Use the exact design system colors — no other colors
- No border radius anywhere
- No gradients, no glows, no neon effects
- Keep it minimal — this is a developer tool landing page, not a SaaS marketing site
- Every link should be a real URL (docs.usewraith.xyz, demo.usewraith.xyz, etc.)

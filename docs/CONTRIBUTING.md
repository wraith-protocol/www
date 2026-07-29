# Contributing to usewraith.xyz

## Analytics

### Provider: Plausible Analytics

We use [Plausible Analytics](https://plausible.io) — **not** Google Analytics or any other
cookie-based tracker.

**Why Plausible?**

| Requirement                                        | Plausible                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| No cookies                                         | ✅ Daily-rotating hash, never persisted                                         |
| No personal data                                   | ✅ IP never stored; no fingerprinting                                           |
| GDPR / ePrivacy compliant without a consent banner | ✅ [Confirmed by Plausible](https://plausible.io/privacy-focused-web-analytics) |
| EU-hosted                                          | ✅ Hetzner Germany/Finland                                                      |
| Open source                                        | ✅ [AGPL-3.0](https://github.com/plausible/analytics)                           |
| Script bundle ≤ 2 KB gzipped                       | ✅ ~1 KB (verified via Network tab)                                             |

### How the script is loaded

`index.html` loads the Plausible extension script from our own domain:

```html
<script defer data-domain="usewraith.xyz" src="/js/script.js"></script>
<script>
  window.plausible =
    window.plausible ||
    function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
</script>
```

- `script.scroll` — automatically tracks scroll depth at every percentage.
  No setup needed; Plausible shows scroll depth in the dashboard.
- `script.tagged-events` — enables the `window.plausible()` JS function for
  custom goal events (see below).
- The queue shim lets goal events fire before the script fully loads.

**Proxied through our own domain.** `/js/script.js` and `/api/event` are never
requested directly from `plausible.io` in the browser. `vercel.json` rewrites
both paths to Plausible's servers server-side:

```json
[
  {
    "source": "/js/script.js",
    "destination": "https://plausible.io/js/script.scroll.tagged-events.js"
  },
  { "source": "/api/event", "destination": "https://plausible.io/api/event" }
]
```

Plausible's tracker derives its event endpoint from the script's own origin,
so once the script is served from `usewraith.xyz` it automatically posts
events to `usewraith.xyz/api/event` too — no separate config needed. This
means every request a visitor's browser makes stays on our domain: no
cross-origin request to `plausible.io`, and the script isn't blocked by
ad/content blockers that filter third-party analytics domains. See
[Plausible's proxy docs](https://plausible.io/docs/proxy/introduction) for the
underlying technique. Note this proxies Plausible's *cloud* service — the
Plausible app itself (Postgres/ClickHouse) is not self-hosted.

### Custom goals

All goal tracking goes through the typed helper in `src/analytics.ts`:

```ts
import { trackEvent } from '../analytics';

trackEvent('Read the Docs');
trackEvent('Code Tab Change', { props: { tab: 'scan.ts' } });
```

#### Goals currently configured

| Goal name         | Where it fires                      | Notes                                                       |
| ----------------- | ----------------------------------- | ----------------------------------------------------------- |
| `Read the Docs`   | Hero CTA, CtaStrip secondary button | Fires on click                                              |
| `Try the Demo`    | Hero secondary CTA                  | Fires on click                                              |
| `Get API Key`     | CtaStrip primary button             | Fires on click                                              |
| `Code Tab Change` | Hero code snippet tabs              | Includes `tab` prop (`send.ts` / `scan.ts` / `withdraw.ts`) |
| Scroll depth      | Automatic — all pages               | Provided by `script.scroll` extension, no code needed       |

To add a new goal:

1. Call `trackEvent('Your Goal Name')` where appropriate.
2. Go to **usewraith.xyz → Plausible dashboard → Goals → Add Goal** and add
   a matching Custom Event entry.

### Privacy page

`src/pages/Privacy.tsx` is the canonical "What we collect" page linked from
the footer. It documents Plausible's data practices in plain language and
explains the no-cookie guarantee. Keep it up to date whenever the analytics
setup changes.

Route: `/privacy` (served by React Router, no server-side config needed for
Vite SPA — just ensure your hosting platform redirects all paths to
`index.html`).

### No consent banner

Because Plausible sets no cookies and stores no personal data, **no cookie
consent banner is required** under GDPR, PECR, or the ePrivacy Directive. Do
not add one. See [Plausible's data policy](https://plausible.io/data-policy)
for the legal basis.

### Dashboard access

The Plausible dashboard for `usewraith.xyz` is **internal-only**, not public.
Traffic volume, referrers, and goal completion (Careers CTA clicks, demo
clicks, etc.) are useful to competitors and not something visitors need to
see. Access is by team invite in Plausible's team settings — ask an existing
member to add your account if you need it. Revisit this if there's ever a
concrete reason to publish a subset of metrics (e.g. an open-source-style
transparency page); that would be a separate, deliberate decision, not a
config flip.

---

## Development setup

```bash
pnpm install
pnpm dev        # starts Vite dev server
pnpm build      # TypeScript check + Vite production build
pnpm format     # Prettier
```

## Status page

We keep a public service status page at `status.usewraith.xyz` so support and users can verify
system health without asking in chat first.

### Provider

Use either BetterUptime or Instatus. The footer badge polls a JSON status endpoint and changes
between green, yellow, and red based on the latest incident state.

### Monitors to configure

- `usewraith.xyz`
- `demo.usewraith.xyz`
- `docs.usewraith.xyz`
- npm registry HEAD request for `@wraith-protocol/sdk`
- Gateway health endpoint once public
- Spectre health endpoint once public

### DNS + environment

Create a public status page and point `status.usewraith.xyz` to the provider via CNAME. Then set:

```bash
VITE_STATUS_PAGE_URL=https://status.usewraith.xyz
VITE_STATUS_API_URL=https://status.usewraith.xyz/api/v2/status.json
```

The footer badge reads those values at build time and will automatically reflect the latest status.

### Verification checklist

- Confirm `status.usewraith.xyz` resolves over DNS.
- Trigger a manual incident or synthetic failure in the provider to verify the badge flips to yellow/red.
- Confirm the badge links back to the public incident history and subscribe flow.

## Commit conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
enforced via `commitlint` + `husky`. Examples:

```
feat: add privacy page
fix: correct plausible script extension url
docs: update contributing analytics section
```

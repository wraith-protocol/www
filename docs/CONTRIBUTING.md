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

`index.html` loads the combined Plausible extension script:

```html
<script
  defer
  data-domain="usewraith.xyz"
  src="https://plausible.io/js/script.scroll.tagged-events.js"
></script>
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

**Note on `integrity` attribute:** Plausible does not currently publish SRI
hashes for their CDN script because they ship frequent minor updates. If your
CSP requires SRI, proxy the script through your own infrastructure (see
[Plausible proxy docs](https://plausible.io/docs/proxy/introduction)).

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

---

## Development setup

```bash
pnpm install
pnpm dev        # starts Vite dev server
pnpm build      # TypeScript check + Vite production build
pnpm format     # Prettier
```

## Commit conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
enforced via `commitlint` + `husky`. Examples:

```
feat: add privacy page
fix: correct plausible script extension url
docs: update contributing analytics section
```

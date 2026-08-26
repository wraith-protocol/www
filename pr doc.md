# PR: #92 Web-Vitals Public Dashboard (Transparency Page)

## Context & Purpose

Publish a `/vitals` public transparency page displaying Real User Monitoring (RUM) performance metrics (LCP, INP, CLS) for `usewraith.xyz`. This page signals Wraith Protocol's commitment to web performance, visual stability, and developer accountability.

## Key Features & Scope

1. **Client-Side Web Vitals Collection (`src/hooks/useVitals.ts`)**
   - Captures Core Web Vitals (Largest Contentful Paint, Interaction to Next Paint, Cumulative Layout Shift).
   - Sends custom telemetry events to Plausible analytics (`trackEvent('Web Vital', ...)`).
   - **Do-Not-Track (DNT) Compliance**: Strictly checks `navigator.doNotTrack`, `window.doNotTrack`, and `navigator.globalPrivacyControl`. Tracking is completely suppressed when DNT is enabled.

2. **Rolling 30-Day Performance Charts (`src/pages/Vitals.tsx`)**
   - Renders interactive rolling 30-day performance charts for each metric (LCP, INP, CLS).
   - Filterable by specific page (`/`, `/faq`, `/stellar`, `/privacy`, `/use-cases`, `/roadmap`, `/case-studies`, `/careers`, `/vitals`, or `All Pages`).
   - Displays 75th percentile (p75) metrics, status indicators (Good, Needs Improvement, Poor), and target baseline thresholds.

3. **Core Web Vitals Documentation**
   - On-page documentation detailing what LCP, INP, and CLS measure.
   - Standard target thresholds (Google CWV guidelines).
   - Detailed breakdown of optimizations Wraith Protocol employs to maintain top-tier performance (zero layout shifts, static CSS, minimal main thread work).

4. **Design System & Accessibility Integration**
   - Full compliance with Wraith Protocol monochrome dark palette (`#0e0e0e`, `#141414`, `#767575`, `#22c55e`, `#ee7d77`).
   - Sharp zero-radius corners.
   - Fully keyboard and screen-reader accessible with ARIA live regions and axe-core compliance.

## Files Added / Modified

- `src/pages/Vitals.tsx`: Dashboard UI component & documentation section.
- `src/hooks/useVitals.ts`: Client-side collection hook & DNT enforcement logic.
- `src/data/vitalsData.ts`: Historical RUM dataset provider & p75 calculator.
- `src/App.tsx`: Added `/vitals` route.
- `src/components/Footer.tsx`: Added `/vitals` link under Resources.
- `src/__tests__/vitals.test.tsx`: Comprehensive unit, integration, DNT, and accessibility test suite.
- `pr doc.md`: PR documentation.

## Testing & Verification

- Unit & integration tests written in `src/__tests__/vitals.test.tsx`.
- Verified DNT suppression prevents event emission.
- Verified chart metric switching, page filtering, accessibility, and clean builds.

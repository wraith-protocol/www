# PR: Blog reading-time badges + inline table of contents

## Context & Purpose

The MDX blog shipped in Wave 7 but posts lacked a reading-time hint and long posts had no navigation. This PR introduces a reading-time badge to give readers an expectation of length, and an inline Table of Contents (TOC) for longer posts (> 800 words) to help users easily navigate deeper technical posts (such as announcements or cryptography explainers). This significantly raises the perceived quality and user experience of the blog.

## Key Features & Scope

1. **Build-Time Reading Time Calculation (`src/utils/blog.ts`)**
   - Automatically computes reading time from the raw MDX body at build time.
   - Strips frontmatter to ensure word counts remain highly accurate.
   - Exposes `readingTime` (e.g. "6 min read"), `wordCount`, and `rawContent` properties on the `BlogPost` model.

2. **Reading Time Badges (`src/pages/Blog.tsx`)**
   - Renders a small badge displaying the computed reading time (e.g., "6 min read") directly on the blog index card loop and on each single-post header, separated by a bullet.

3. **Auto-Generated Inline Table of Contents (`src/components/BlogToc.tsx`)**
   - Parses the raw MDX content for `h2` and `h3` tags to create a dynamic table of contents.
   - **Smart Rendering**: Only renders on posts longer than the 800-word threshold; under this threshold, the TOC is completely suppressed.
   - **Sticky Sidebar layout**: Displays inline above the post body on smaller screens, and utilizes a sticky sidebar layout on the `lg:` breakpoint to ensure it remains accessible alongside long posts.
   - **Intersection Observer**: Auto-highlights the active section while the user scrolls through the post body.
   - **Accessibility & UX**:
     - Respects `prefers-reduced-motion` for smooth-scroll behavior vs instant jumps.
     - Automatically pushes the section id to the browser hash and strictly forces focus into the anchored section for screen reader and keyboard navigability.
   - Incorporated `rehype-slug` to standardise and automatically add id attributes into markdown headings so that TOC linking functions flawlessly out-of-the-box.

## Files Added / Modified

- `src/components/BlogToc.tsx` (new): Sticky/inline Table of contents component with intersection observer.
- `src/pages/Blog.tsx`: Adjusted layouts to include the TOC, and integrated reading time badges across the post lists and single posts.
- `src/utils/blog.ts`: Upgraded MDX parsing to include word counts and raw text.
- `vite.config.ts`: Added `rehype-slug` plugin.
- `package.json`: Added `rehype-slug` dependency.

## Testing & Verification

- Verified that all existing posts correctly display the calculated reading-time badge.
- Verified that posts under 800 words do not show an empty TOC structure.
- Verified keyboard focus and motion-reduced scrolling.
- Build passes successfully with all metrics indicating >90 Perf/SEO scores for `/blog` routes.

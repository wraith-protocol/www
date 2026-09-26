import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import {
  getAllPosts,
  getPostBySlug,
  getPostsByTag,
  getRelatedPosts,
  getTagFromSlug,
  slugifyTag,
} from '../utils/blog';

describe('Blog utility & page', () => {
  it('loads blog posts correctly', () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0]).toBeDefined();
    expect(posts.some((p) => p.slug === 'wave-7-kickoff')).toBe(true);
    const dates = posts.map((p) => new Date(p.date).getTime());
    const sortedDesc = dates.every((d, i) => i === 0 || (dates[i - 1] ?? 0) >= d);
    expect(sortedDesc).toBe(true);
  });

  it('retrieves post by slug', () => {
    const post = getPostBySlug('wave-7-kickoff');
    expect(post).toBeDefined();
    expect(post?.title).toContain('Wave 7 Kick-off');
  });

  it('resolves tags to slugs and back', () => {
    expect(slugifyTag('Stealth Payments')).toBe('stealth-payments');
    expect(getTagFromSlug('stealth-payments')).toBeDefined();
  });

  it('returns related posts by tag overlap and excludes self', () => {
    const related = getRelatedPosts('wave-7-kickoff', 3);
    expect(related.every((post) => post.slug !== 'wave-7-kickoff')).toBe(true);
    expect(related.length).toBeGreaterThan(0);
  });

  it('lists posts for a tag archive', () => {
    const tag = getTagFromSlug('stealth-payments')!;
    const posts = getPostsByTag(tag);
    expect(posts.length).toBeGreaterThanOrEqual(2);
  });

  it('renders blog index page', async () => {
    window.history.replaceState({}, '', '/blog');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /wraith protocol blog/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/wave 7 kick-off/i)).toBeInTheDocument();
  });

  it('renders blog single post page', async () => {
    window.history.replaceState({}, '', '/blog/wave-7-kickoff');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /wave 7 kick-off/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/welcome to/i)).toBeInTheDocument();
  });

  it('collapses opted-out author to "Wraith Team" in byline', async () => {
    window.history.replaceState({}, '', '/blog');
    render(<App />);

    expect(await screen.findByText(/wraith team/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /wraith team/i })).not.toBeInTheDocument();
  });

  it('links opted-in author byline to the author page', async () => {
    window.history.replaceState({}, '', '/blog');
    render(<App />);

    const byline = await screen.findByRole('link', { name: /lena vogt/i });
    expect(byline).toHaveAttribute('href', '/blog/author/lena-vogt');
  });

  it('renders a public author page for an opted-in author', async () => {
    window.history.replaceState({}, '', '/blog/author/lena-vogt');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /lena vogt/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/how stealth addresses keep payments private/i)).toBeInTheDocument();
  });

  it('falls back gracefully for an unknown author id', async () => {
    window.history.replaceState({}, '', '/blog/author/does-not-exist');
    render(<App />);

    expect(await screen.findByText(/author not found/i)).toBeInTheDocument();
    expect(screen.getByText(/back to blog/i)).toBeInTheDocument();
  });

  it('renders a tag archive page', async () => {
    window.history.replaceState({}, '', '/blog/tag/stealth-payments');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /#stealth-payments/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/subscribe via rss/i)).toBeInTheDocument();
  });
});

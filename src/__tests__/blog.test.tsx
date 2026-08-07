import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { getAllPosts, getPostBySlug } from '../utils/blog';

describe('Blog utility & page', () => {
  it('loads blog posts correctly', () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0]).toBeDefined();
    expect(posts[0]?.slug).toBe('wave-7-kickoff');
  });

  it('retrieves post by slug', () => {
    const post = getPostBySlug('wave-7-kickoff');
    expect(post).toBeDefined();
    expect(post?.title).toContain('Wave 7 Kick-off');
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
});

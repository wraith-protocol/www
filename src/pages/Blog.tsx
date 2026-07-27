import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getAllPosts, getAllTags, getPostBySlug, BlogPost } from '../utils/blog';

function SinglePost({ post }: { post: BlogPost }) {
  const formattedDate = post.date
    ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(post.date))
    : '';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: {
      '@type': 'Organization',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Wraith Protocol',
      logo: {
        '@type': 'ImageObject',
        url: 'https://usewraith.xyz/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://usewraith.xyz/blog/${post.slug}`,
    },
  };

  const PostComponent = post.Component;

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <article className="mx-auto max-w-3xl px-6 py-12 md:px-12 md:py-16">
        <Link
          to="/blog"
          className="mb-8 inline-flex items-center gap-2 font-body text-[13px] text-outline transition-colors hover:text-on-surface"
        >
          ← Back to Blog
        </Link>

        {/* Post Header */}
        <header className="mb-10 border-b border-outline-variant-30 pb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                to={`/blog?tag=${encodeURIComponent(tag)}`}
                className="border border-outline-variant-30 bg-surface-container px-2.5 py-1 font-mono text-[11px] text-outline transition-colors hover:border-outline hover:text-on-surface"
              >
                #{tag}
              </Link>
            ))}
          </div>

          <h1 className="mb-4 font-heading text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 font-mono text-[12px] text-outline">
            <span>{post.author}</span>
            <span>•</span>
            <time dateTime={post.date}>{formattedDate}</time>
          </div>
        </header>

        {/* Post Content */}
        <div className="blog-content font-body text-[15px] leading-relaxed text-on-surface-variant space-y-6">
          <PostComponent />
        </div>

        {/* Post Footer */}
        <footer className="mt-16 border-t border-outline-variant-30 pt-8">
          <div className="flex items-center justify-between">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 font-body text-[13px] text-outline transition-colors hover:text-on-surface"
            >
              ← Back to all posts
            </Link>
          </div>
        </footer>
      </article>
    </Layout>
  );
}

function BlogIndex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get('tag') || 'all';

  const allPosts = useMemo(() => getAllPosts(), []);
  const allTags = useMemo(() => getAllTags(), []);

  const filteredPosts = useMemo(() => {
    if (activeTag === 'all') return allPosts;
    return allPosts.filter((post) => post.tags.includes(activeTag));
  }, [allPosts, activeTag]);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Wraith Protocol Blog',
    description: 'Updates, technical insights, and announcements from Wraith Protocol.',
    url: 'https://usewraith.xyz/blog',
    blogPost: filteredPosts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      datePublished: post.date,
      url: `https://usewraith.xyz/blog/${post.slug}`,
    })),
  };

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-12 md:py-16">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-4 border-b border-outline-variant-30 pb-8">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-outline">
            Blog & Announcements
          </span>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            Wraith Protocol Blog
          </h1>
          <p className="max-w-2xl font-body text-[15px] text-on-surface-variant">
            Technical deep dives, protocol updates, and ecosystem news from the Wraith team.
          </p>
        </div>

        {/* Tag Filters */}
        <div className="mb-10 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSearchParams({})}
            className={`border px-3 py-1.5 font-mono text-[12px] transition-colors ${
              activeTag === 'all'
                ? 'border-primary bg-primary text-surface font-semibold'
                : 'border-outline-variant-30 bg-surface-container text-outline hover:border-outline hover:text-on-surface'
            }`}
          >
            All Posts ({allPosts.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchParams({ tag })}
              className={`border px-3 py-1.5 font-mono text-[12px] transition-colors ${
                activeTag === tag
                  ? 'border-primary bg-primary text-surface font-semibold'
                  : 'border-outline-variant-30 bg-surface-container text-outline hover:border-outline hover:text-on-surface'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Post Grid / List */}
        {filteredPosts.length === 0 ? (
          <div className="border border-outline-variant-30 bg-surface-container px-8 py-16 text-center">
            <p className="font-body text-[15px] text-outline">
              No posts found under #{activeTag}.
            </p>
            <button
              onClick={() => setSearchParams({})}
              className="mt-4 font-mono text-[12px] text-primary underline"
            >
              Show all posts
            </button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant-30 border-t border-b border-outline-variant-30">
            {filteredPosts.map((post) => {
              const formattedDate = post.date
                ? new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(new Date(post.date))
                : '';

              return (
                <article
                  key={post.slug}
                  className="group flex flex-col gap-4 py-8 transition-colors hover:bg-surface-container/30 px-2 sm:px-4"
                >
                  <div className="flex items-center gap-3 font-mono text-[11px] text-outline">
                    <time dateTime={post.date}>{formattedDate}</time>
                    <span>•</span>
                    <span>{post.author}</span>
                  </div>

                  <Link to={`/blog/${post.slug}`} className="block">
                    <h2 className="font-heading text-xl font-bold tracking-tight text-on-surface group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                  </Link>

                  <p className="font-body text-[14px] leading-relaxed text-on-surface-variant">
                    {post.excerpt}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {post.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => {
                            e.preventDefault();
                            setSearchParams({ tag });
                          }}
                          className="border border-outline-variant-30 bg-surface-container px-2 py-0.5 font-mono text-[10px] text-outline transition-colors hover:border-outline hover:text-on-surface"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>

                    <Link
                      to={`/blog/${post.slug}`}
                      className="font-mono text-[12px] font-semibold text-primary group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                    >
                      Read post →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function Blog() {
  const { slug } = useParams<{ slug?: string }>();

  if (slug) {
    const post = getPostBySlug(slug);
    if (!post) {
      return (
        <Layout>
          <div className="mx-auto max-w-3xl px-6 py-24 text-center">
            <h1 className="font-heading text-3xl font-bold text-on-surface mb-4">
              Post Not Found
            </h1>
            <p className="font-body text-[15px] text-outline mb-8">
              The blog post &quot;{slug}&quot; could not be found.
            </p>
            <Link
              to="/blog"
              className="inline-flex h-10 items-center justify-center bg-primary px-6 font-heading text-[12px] font-semibold uppercase tracking-[1.5px] text-surface transition-[filter] hover:brightness-110"
            >
              Return to Blog
            </Link>
          </div>
        </Layout>
      );
    }
    return <SinglePost post={post} />;
  }

  return <BlogIndex />;
}

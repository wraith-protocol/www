import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { getAllPosts, getPostBySlug } from '../utils/blog';
import BlogToc from '../components/BlogToc';

function BlogList() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12 md:px-12">
      <Helmet>
        <title>Blog – Wraith Protocol</title>
        <meta
          name="description"
          content="Updates from Wraith Protocol on privacy-preserving payments and stealth infrastructure."
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          href="/feed.xml"
          title="Wraith Protocol Blog"
        />
      </Helmet>

      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[2px] text-outline">Blog</p>
        <h1 className="font-heading text-[32px] font-semibold leading-tight text-on-surface sm:text-[40px]">
          Wraith Protocol Blog
        </h1>
        <p className="max-w-2xl text-[17px] leading-7 text-on-surface-variant">
          Building private payments for the modern web. Subscribe to the RSS feed for new posts.
        </p>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="flex flex-col gap-2 border border-outline-variant-30 p-6 transition-colors hover:border-outline-variant"
          >
            <div className="flex items-center gap-4 font-mono text-[12px] text-outline">
              <time dateTime={post.date}>{post.date}</time>
              {post.author && (
                <>
                  <span>•</span>
                  <span>{post.author}</span>
                </>
              )}
              <span>•</span>
              <span>{post.readingTimeMin} min read</span>
            </div>
            <h2 className="font-heading text-[22px] font-semibold text-on-surface hover:text-primary">
              <Link to={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            {post.excerpt && (
              <p className="font-body text-[15px] leading-relaxed text-on-surface-variant">
                {post.excerpt}
              </p>
            )}
            {post.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-surface-container px-2 py-0.5 font-mono text-[11px] text-outline"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function BlogPostDetail({ slug }: { slug: string }) {
  const post = getPostBySlug(slug);

  if (!post) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-12 md:px-12">
        <Helmet>
          <title>Post Not Found – Wraith Protocol</title>
        </Helmet>
        <h1 className="font-heading text-[28px] font-bold text-on-surface">Post Not Found</h1>
        <p className="text-on-surface-variant">The requested blog post could not be found.</p>
        <Link to="/blog" className="font-mono text-[13px] text-primary hover:underline">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  const { Component } = post;

  return (
    <article className="mx-auto max-w-5xl px-6 py-12 md:px-12">
      <Helmet>
        <title>{post.title} – Wraith Protocol</title>
        {post.excerpt && <meta name="description" content={post.excerpt} />}
      </Helmet>

      <div className="mb-8 flex flex-col gap-3">
        <Link
          to="/blog"
          className="mb-2 font-mono text-[12px] text-outline transition-colors hover:text-on-surface"
        >
          ← Back to Blog
        </Link>
        <div className="flex items-center gap-4 font-mono text-[12px] text-outline">
          <time dateTime={post.date}>{post.date}</time>
          {post.author && (
            <>
              <span>•</span>
              <span>{post.author}</span>
            </>
          )}
          <span>•</span>
          <span>{post.readingTimeMin} min read</span>
        </div>
        <h1 className="font-heading text-[32px] font-semibold leading-tight text-on-surface sm:text-[40px]">
          {post.title}
        </h1>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="bg-surface-container px-2 py-0.5 font-mono text-[11px] text-outline"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:gap-12">
        <BlogToc toc={post.toc} wordCount={post.wordCount} />

        <div className="prose prose-invert min-w-0 max-w-none flex-1 text-on-surface-variant">
          <Component />
        </div>
      </div>
    </article>
  );
}

export default function Blog() {
  const { slug } = useParams<{ slug?: string }>();

  if (slug) {
    return <BlogPostDetail slug={slug} />;
  }

  return <BlogList />;
}

import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import posts from "../data/content/blog-posts.json"
import { PageFrame } from "./PageFrame"

const textLink = "inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ocean hover:underline dark:text-blue-300"

export default function BlogPage() {
  const { slug } = useParams<{ slug: string }>()
  const post = posts.find((item) => item.slug === slug)

  if (slug && !post) {
    return (
      <PageFrame title="Article not found" description="This article is unavailable. You can find the latest Sciencebouk stories on the blog.">
        <Link to="/blog" className={textLink}><ArrowLeft className="h-4 w-4" /> Back to the blog</Link>
      </PageFrame>
    )
  }

  if (!post) {
    return (
      <PageFrame title="The Sciencebouk blog" description="Notes on making science easier to explore. The ideas, decisions, and details behind the product.">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]">
          <div className="space-y-6">
            {posts.map((item) => (
              <article key={item.slug} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <time dateTime={item.date}>{item.displayDate}</time>
                  <span>Product update · v{item.release}</span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  <Link to={`/blog/${item.slug}`} className="hover:text-ocean dark:hover:text-blue-300">{item.title}</Link>
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
                <Link to={`/blog/${item.slug}`} className={`${textLink} mt-4`}>Read the story <ArrowRight className="h-4 w-4" /></Link>
              </article>
            ))}
          </div>
          <aside className="self-start rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
            <BookOpen className="h-6 w-6 text-ocean dark:text-blue-300" aria-hidden="true" />
            <h2 className="mt-4 font-display text-xl font-bold">Try the idea for yourself</h2>
            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">Every update leads back to the same thing: an equation you can explore.</p>
            <Link to="/equation/1" className={`${textLink} mt-3`}>Open an experiment <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/changelog" className={`${textLink} mt-1`}>See the full changelog <ArrowRight className="h-4 w-4" /></Link>
          </aside>
        </div>
      </PageFrame>
    )
  }

  return (
    <PageFrame>
      <article className="mx-auto max-w-3xl">
        <Link to="/blog" className={textLink}><ArrowLeft className="h-4 w-4" /> All stories</Link>
        <header className="mt-5 border-b border-slate-200 pb-8 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <time dateTime={post.date}>{post.displayDate}</time>
            <span>Product update · v{post.release}</span>
            <span>{post.readingMinutes} min read</span>
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{post.title}</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{post.introduction}</p>
        </header>
        <div className="mt-9 space-y-10">
          {post.sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl font-bold tracking-tight">{section.title}</h2>
              <div className="mt-4 space-y-5 text-base leading-8 text-slate-700 dark:text-slate-300 sm:text-lg">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>
        <footer className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/equation/1" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ocean px-5 py-3 text-base font-semibold text-white transition hover:bg-ocean/90">Explore an equation <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/changelog" className={textLink}>Read the release notes <ArrowRight className="h-4 w-4" /></Link>
        </footer>
      </article>
    </PageFrame>
  )
}

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const pages = read('src/seo/pages.json')
const equations = read('src/seo/equations.json')
const lessons = read('src/data/equations.json')
const posts = read('src/data/content/blog-posts.json')
const shell = readFileSync(resolve(root, 'dist/index.html'), 'utf8')
const origin = 'https://sciencebo.uk'
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
for (const equation of equations) {
  pages[`/equation/${equation.id}`] = {
    title: `${equation.title} — interactive visualization`, description: equation.description,
    equation, lesson: lessons.find(item => item.id === equation.id),
  }
}
const links = equations.map(e => `<li><a href="/equation/${e.id}">${escape(e.title)}</a> — ${escape(e.description)}</li>`).join('\n')
for (const [path, page] of Object.entries(pages)) {
  const title = `${page.title} · Sciencebouk`
  let html = shell.replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
  for (const [name, value] of [['description', page.description], ['og:title', title], ['og:description', page.description], ['og:url', origin + path]]) {
    html = html.replace(new RegExp(`<meta (?:name|property)="${name}"[^>]*>`), `<meta ${name.startsWith('og:') ? 'property' : 'name'}="${name}" content="${escape(value)}" />`)
  }
  html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${origin + path}" />`)
  const post = posts.find(item => path === `/blog/${item.slug}`)
  let details = page.equation ? `<p>${escape(page.equation.formula)}</p><p>${escape(page.lesson?.hook || '')}</p><p>${escape(page.lesson?.hookAction || '')}</p>${(page.lesson?.lessons || []).map(step => `<section><h2>${escape(step.instruction)}</h2><p>${escape(step.insight)}</p></section>`).join('')}` : ''
  if (post) details = `<article><time datetime="${escape(post.date)}">${escape(post.displayDate)}</time><p>${escape(post.introduction)}</p>${post.sections.map(section => `<section><h2>${escape(section.title)}</h2>${section.paragraphs.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</section>`).join('')}</article>`
  if (path === '/blog') details = posts.map(item => `<article><time datetime="${escape(item.date)}">${escape(item.displayDate)}</time><h2><a href="/blog/${escape(item.slug)}">${escape(item.title)}</a></h2><p>${escape(item.description)}</p></article>`).join('')
  const navigation = path.startsWith('/blog') ? '<nav aria-label="Continue exploring"><a href="/blog">All stories</a> · <a href="/changelog">Changelog</a> · <a href="/equation/1">Explore an equation</a></nav>' : `<nav aria-label="Explore equations"><h2>Explore equations</h2><ul>${links}</ul></nav>`
  const body = `<main style="max-width:72rem;margin:2rem auto;padding:1rem"><a href="/">Sciencebouk</a><h1>${escape(page.title)}</h1><p>${escape(page.description)}</p>${details}${navigation}</main>`
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
  const target = resolve(root, 'dist', path === '/' ? 'index.html' : path.slice(1) + '/index.html')
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, html)
}
writeFileSync(resolve(root, 'dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(pages).map(path => `  <url><loc>${origin + path}</loc></url>`).join('\n')}\n</urlset>\n`)
console.log(`SEO: ${Object.keys(pages).length} public pages with unique metadata and initial HTML`)

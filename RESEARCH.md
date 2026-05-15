# Template Research and Recommendation

Research date: 2026-05-03

## Shortlist

1. Astro + MDX portfolio/blog direction
   - Best fit for a content-led professional site.
   - Astro themes such as Persona emphasize a clean professional resume layout, MDX blog support, fast performance, responsive layouts, and SEO.
   - Bravodemy/Astro Nano-style themes add Markdown + MDX, projects, RSS, sitemap, light/dark modes, and Pagefind search.

2. Next.js portfolio/blog direction
   - Best fit if the site later becomes a richer React application.
   - Vercel's Portfolio Blog Starter includes MDX/Markdown, SEO, RSS, dynamic Open Graph images, syntax highlighting, Tailwind, and analytics hooks.
   - Nextfolio is a lightweight open-source portfolio with SEO, MDX, feeds, analytics, embeds, and deploy-to-Vercel ergonomics.

3. Framer Step
   - Best no-code option if visual editing is more important than code ownership.
   - Includes CMS collections for projects and blog, forms, analytics, responsive layouts, and light/dark themes.

4. Namu / Bootstrap HTML templates
   - Best for a classic services/portfolio layout.
   - Includes one-page and multi-page demos, contact form, portfolio filtering, light/dark versions, and broad browser compatibility.

## Recommendation

Use a code-first static portfolio with the content model of Astro/Next templates: professional home page, experience, services direction, articles, demos, search, and contact.

I implemented a dependency-free starter in this workspace instead of cloning a heavy template. It keeps the important template qualities:

- Markdown articles and demos
- Build-generated pages
- Search index generated from content
- Contact form with email fallback and endpoint hook
- Service-ready positioning blocks
- Fast static output that can deploy almost anywhere

## Sources

- Astro Persona theme: https://astro.build/themes/details/persona-personal-portfolio-website-template/
- Vercel Next.js Portfolio with Blog: https://vercel.com/templates/next.js/nextjs-portfolio
- Bravodemy / Astro Nano-style theme: https://bravodemy.com/
- Pagefind static search: https://pagefind.app/
- Framer Step portfolio template: https://www.framer.com/marketplace/templates/step/
- Namu Bootstrap portfolio template: https://harnishdesign.net/namu-personal-portfolio-html-template.html
- Nextfolio: https://www.erdry.com/

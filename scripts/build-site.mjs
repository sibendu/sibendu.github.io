import { mkdir, readFile, readdir, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");
const config = JSON.parse(await readFile(path.join(root, "site.config.json"), "utf8"));

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean);
  }
  return trimmed;
}

function parseMarkdownFile(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: source };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    data[line.slice(0, index).trim()] = parseValue(line.slice(index + 1));
  }
  return { data, body: match[2].trim() };
}

function inlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let list = [];
  let code = [];
  let inCode = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  const flushCode = () => {
    if (code.length) {
      blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      code = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        inCode = false;
        flushCode();
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCode();
  return blocks.join("\n");
}

function slugFromFile(file) {
  return file.replace(/\.md$/, "");
}

function slugFromTitle(value) {
  return String(value || "demo")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "demo";
}

async function loadCollection(type) {
  const dir = path.join(root, "content", type);
  const files = (await readdir(dir)).filter((file) => file.endsWith(".md"));
  const items = [];
  for (const file of files) {
    const source = await readFile(path.join(dir, file), "utf8");
    const { data, body } = parseMarkdownFile(source);
    const slug = slugFromFile(file);
    items.push({
      ...data,
      body,
      html: markdownToHtml(body),
      slug,
      type: type === "articles" ? "Article" : "Demo",
      url: `/${type}/${slug}/`,
      tags: Array.isArray(data.tags) ? data.tags : [],
      date: data.date || "Draft"
    });
  }
  return items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function loadConfiguredDemos() {
  const demos = Array.isArray(config.demos) ? config.demos : [];
  return demos.map((demo) => {
    const slug = demo.slug || slugFromTitle(demo.title);
    const body = demo.body || "";
    return {
      ...demo,
      body,
      html: markdownToHtml(body),
      slug,
      type: "Demo",
      url: `/demos/${slug}/`,
      tags: Array.isArray(demo.tags) ? demo.tags : [],
      date: demo.date || "Draft"
    };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function tags(items) {
  return items.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function mediaUrl(item, field) {
  const media = item[field];
  if (!media || item.type !== "Demo") return "";
  return `/demos/${item.slug}/${encodeURIComponent(path.basename(media))}`;
}

function youtubeEmbedUrl(item) {
  if (!item.youtube || item.type !== "Demo") return "";
  try {
    const url = new URL(item.youtube);
    let id = "";
    if (url.hostname === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (url.hostname.endsWith("youtube.com")) {
      id = url.searchParams.get("v") || "";
      if (!id && url.pathname.startsWith("/embed/")) {
        id = url.pathname.split("/").filter(Boolean)[1] || "";
      }
      if (!id && url.pathname.startsWith("/shorts/")) {
        id = url.pathname.split("/").filter(Boolean)[1] || "";
      }
    }
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : "";
  } catch {
    return "";
  }
}

function demoMedia(item) {
  const youtubeUrl = youtubeEmbedUrl(item);
  if (youtubeUrl) {
    return `<figure class="demo-media">
    <iframe src="${escapeHtml(youtubeUrl)}" title="${escapeHtml(item.title)} demo video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
  </figure>`;
  }
  const videoUrl = mediaUrl(item, "video");
  if (!videoUrl) return "";
  return `<figure class="demo-media">
    <video controls preload="metadata" src="${escapeHtml(videoUrl)}"></video>
  </figure>`;
}

function heroParagraphs() {
  const paragraphs = Array.isArray(config.heroParagraphs) ? config.heroParagraphs : [config.summary];
  return paragraphs.filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

function recommendationsSection() {
  const recommendations = config.recommendations || {};
  const items = Array.isArray(recommendations.items) ? recommendations.items : [];
  const recommendationCards = items.length
    ? `<div class="recommendation-grid">
        ${items.map((item) => `
          <article class="recommendation-card">
            <p>${escapeHtml(item.text)}</p>
            <span>${escapeHtml(item.person)}</span>
          </article>
        `).join("")}
      </div>`
    : "";

  return `<section class="band recommendation-band" id="recommendations">
    <div class="section">
      <div class="section-head">
        <h2>${escapeHtml(recommendations.title || "What colleagues and leaders have said")}</h2>
        <p>${escapeHtml(recommendations.intro || "")}</p>
      </div>
      <div class="recommendation-panel">
        ${recommendationCards}
        <div class="section-actions">
          <a class="button secondary" href="${escapeHtml(recommendations.linkedinUrl || config.linkedin)}">View LinkedIn recommendations</a>
        </div>
      </div>
    </div>
  </section>`;
}

function layout({ title, description, body, active = "" }) {
  const pageTitle = title === config.name ? title : `${title} | ${config.name}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(description || config.tagline)}">
    <title>${escapeHtml(pageTitle)}</title>
    <link rel="stylesheet" href="/assets/styles.css">
  </head>
  <body>
    <header class="site-header">
      <nav class="nav" aria-label="Main navigation">
        <a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span><span>${escapeHtml(config.name)}</span></a>
        <div class="nav-links">
          <a href="/#experience"${active === "experience" ? " aria-current=\"page\"" : ""}>Experience</a>
          <a href="/#capabilities">Capabilities</a>
          <a href="/articles/"${active === "articles" ? " aria-current=\"page\"" : ""}>Articles</a>
          <a href="/demos/"${active === "demos" ? " aria-current=\"page\"" : ""}>Demos</a>
          <a href="/search/"${active === "search" ? " aria-current=\"page\"" : ""}>Search</a>
          <a class="button secondary" href="/#links">Links</a>
        </div>
      </nav>
    </header>
    <main>${body}</main>
    <footer class="footer">
      <div class="footer-inner">
        <span>© ${new Date().getFullYear()} ${escapeHtml(config.name)}</span>
        <span>${escapeHtml(config.location)}</span>
      </div>
    </footer>
    <script src="/assets/main.js"></script>
  </body>
</html>`;
}

function card(item) {
  return `<a class="card" href="${item.url}">
    <div class="content-meta">${item.type} / ${escapeHtml(item.date)}</div>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div class="tag-list">${tags(item.tags)}</div>
  </a>`;
}

function row(item) {
  return `<a class="content-row" href="${item.url}">
    <div>
      <div class="content-meta">${item.type} / ${escapeHtml(item.date)}</div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <div class="tag-list">${tags(item.tags)}</div>
    </div>
    <span aria-hidden="true">View</span>
  </a>`;
}

function homePage(articles, demos) {
  const featured = [...articles, ...demos].filter((item) => item.featured).slice(0, 6);
  return layout({
    title: config.name,
    description: config.tagline,
    body: `
      <section class="hero">
        <div>
          <p class="eyebrow">${escapeHtml(config.availability)}</p>
          <h1>${escapeHtml(config.name)}</h1>
          <p class="lede">${escapeHtml(config.tagline)}</p>
          <div class="hero-summary">${heroParagraphs()}</div>
          <div class="hero-actions">
            <a class="button" href="/articles/">Read articles</a>
            <a class="button secondary" href="/demos/">View demos</a>
          </div>
        </div>
        <div class="hero-visual" aria-label="Abstract professional brand signal map">
          <div class="signal-board">
            <span class="signal-line a"></span>
            <span class="signal-line b"></span>
            <span class="signal-node one"></span>
            <span class="signal-node two"></span>
            <span class="signal-node three"></span>
            <div class="visual-caption">
              <strong>${escapeHtml(config.role)}</strong>
              <span>${escapeHtml(config.location)}</span>
            </div>
          </div>
        </div>
      </section>
      <section class="band">
        <div class="section">
          <div class="metric-grid">
            ${config.metrics.map((metric) => `<div class="metric"><strong>${escapeHtml(metric.value)}</strong><span>${escapeHtml(metric.label)}</span></div>`).join("")}
          </div>
          <div class="highlight-list">
            ${config.highlights.map((highlight) => `<p>${escapeHtml(highlight)}</p>`).join("")}
          </div>
        </div>
      </section>
      <section class="band dark" id="how-i-work">
        <div class="section">
          <div class="section-head">
            <h2>How I Work</h2>
            <p>${escapeHtml(config.howIWork.intro)}</p>
          </div>
          <div class="work-grid">
            ${config.howIWork.principles.map((principle) => `
              <article class="work-item">
                <span class="work-index" aria-hidden="true"></span>
                <h3>${escapeHtml(principle.title)}</h3>
                <p>${escapeHtml(principle.description)}</p>
              </article>
            `).join("")}
          </div>
        </div>
      </section>
      <section class="band" id="experience">
        <div class="section">
          <div class="section-head">
            <h2>Experience</h2>
            <p></p>
          </div>
          <div class="timeline">
            ${config.experience.map((item) => `
              <article class="timeline-item">
                <div class="timeline-period">${escapeHtml(item.period)}</div>
                <div>
                  <h3>${escapeHtml(item.title)} · ${escapeHtml(item.company)}</h3>
                  <p>${escapeHtml(item.description)}</p>
                </div>
              </article>
            `).join("")}
          </div>
        </div>
      </section>
      <section class="band dark" id="focus-areas">
        <div class="section">
          <div class="section-head">
            <h2>Focus Areas</h2>
            <p>Themes that define my work across enterprise architecture, AI transformation, cloud platforms, and technology leadership.</p>
          </div>
          <div class="card-grid">
            ${config.focusAreas.map((focusArea) => `<article class="card"><h3>${escapeHtml(focusArea.title)}</h3><p>${escapeHtml(focusArea.description)}</p></article>`).join("")}
          </div>
        </div>
      </section>
      <section class="band" id="capabilities">
        <div class="section">
          <div class="section-head">
            <h2>Capabilities</h2>
            <p>Hands-on depth across Agentic AI, cloud platforms, solution architecture, enterprise integration, data, DevSecOps, and architecture leadership.</p>
          </div>
          <div class="capability-grid">
            ${config.capabilities.map((capability) => `
              <article class="capability-block">
                <h3>${escapeHtml(capability.group)}</h3>
                <div class="tag-list">${tags(capability.items)}</div>
              </article>
            `).join("")}
          </div>
        </div>
      </section>
      <section class="band">
        <div class="section">
          <div class="section-head">
            <h2>Articles and Demos</h2>
            <p>Articles that reflect my thinking, few demos I built.</p>
          </div>
          <div class="card-grid">${featured.map(card).join("")}</div>
          <div class="section-actions">
            <a class="button secondary" href="/articles/">All articles</a>
            <a class="button secondary" href="/demos/">All demos</a>
            <a class="button secondary" href="/search/">Search everything</a>
          </div>
        </div>
      </section>
      ${recommendationsSection()}
      <section class="band" id="links">
        <div class="section">
          <div>
            <p class="eyebrow">Links</p>
            <h2>Public profiles and references.</h2>
            <p class="lede">For architecture, AI transformation, engineering leadership conversations, or speaking, connect with me on LinkedIn.</p>
            <div class="public-links">
              <a href="${escapeHtml(config.linkedin)}">LinkedIn</a>
              <a href="${escapeHtml(config.github)}">GitHub</a>
            </div>
            <div class="education-note">
              ${config.education.map((item) => `<p><strong>${escapeHtml(item.degree)}</strong><br>${escapeHtml(item.institution)} · ${escapeHtml(item.period)}</p>`).join("")}
            </div>
          </div>
        </div>
      </section>
    `
  });
}

function listingPage(title, description, items, active) {
  return layout({
    title,
    description,
    active,
    body: `<section class="article-layout">
      <p class="eyebrow">${items.length} published</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lede">${escapeHtml(description)}</p>
      <div class="content-list">${items.map(row).join("")}</div>
    </section>`
  });
}

function detailPage(item) {
  const articleBody = item.html ? `<div class="article-body">${item.html}</div>` : "";
  return layout({
    title: item.title,
    description: item.description,
    active: item.type === "Article" ? "articles" : "demos",
    body: `<article class="article-layout">
      <div class="content-meta">${item.type} / ${escapeHtml(item.date)}</div>
      <h1>${escapeHtml(item.title)}</h1>
      <p class="lede">${escapeHtml(item.description)}</p>
      <div class="tag-list">${tags(item.tags)}</div>
      ${demoMedia(item)}
      ${articleBody}
    </article>`
  });
}

async function copyDemoMedia(items) {
  for (const item of items) {
    if (!item.video || item.youtube) continue;
    const filename = path.basename(item.video);
    const source = path.join(root, "content", "demos", filename);
    const targetDir = path.join(dist, "demos", item.slug);
    await mkdir(targetDir, { recursive: true });
    await copyFile(source, path.join(targetDir, filename));
  }
}

function searchPage() {
  return layout({
    title: "Search",
    description: "Search articles, demos, focus areas, and experience.",
    active: "search",
    body: `<section class="article-layout">
      <p class="eyebrow">Search</p>
      <h1>Find articles, demos, and proof points.</h1>
      <div class="search-panel">
        <input class="search-input" data-search-input placeholder="Search agentic AI, cloud, architecture, RAG..." aria-label="Search site content">
        <div class="content-list" data-search-results></div>
      </div>
    </section>`
  });
}

async function writePage(urlPath, html) {
  const dir = path.join(dist, urlPath);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html);
}

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "assets"), { recursive: true });
await copyFile(path.join(root, "src", "styles.css"), path.join(dist, "assets", "styles.css"));
await copyFile(path.join(root, "src", "main.js"), path.join(dist, "assets", "main.js"));

const articles = await loadCollection("articles");
const demos = loadConfiguredDemos();

await writePage("", homePage(articles, demos));
await writePage("articles", listingPage("Articles", "Ideas, essays, and working notes that demonstrate my point of views.", articles, "articles"));
await writePage("demos", listingPage("Demos", "Builds, prototypes, experiments, and case-study style walkthroughs.", demos, "demos"));
await writePage("search", searchPage());

for (const item of [...articles, ...demos]) {
  await writePage(item.url.replace(/^\//, ""), detailPage(item));
}

await copyDemoMedia(demos);

const searchIndex = [...articles, ...demos, ...config.focusAreas.map((focusArea, index) => ({
  title: focusArea.title,
  description: focusArea.description,
  date: "Profile",
  type: "Focus Area",
  tags: ["Focus Areas"],
  body: focusArea.description,
  url: "/#focus-areas",
  slug: `focus-area-${index}`
})), ...config.capabilities.map((capability, index) => ({
  title: capability.group,
  description: capability.items.join(", "),
  date: "Capability",
  type: "Capability",
  tags: ["Skills", "Capabilities"],
  body: capability.items.join(" "),
  url: "/#capabilities",
  slug: `capability-${index}`
})), ...(config.howIWork?.principles || []).map((principle, index) => ({
  title: principle.title,
  description: principle.description,
  date: "Profile",
  type: "How I Work",
  tags: ["How I Work"],
  body: `${config.howIWork.intro} ${principle.description}`,
  url: "/#how-i-work",
  slug: `how-i-work-${index}`
})), ...(config.recommendations?.items || []).map((recommendation, index) => ({
  title: config.recommendations.title,
  description: recommendation.text,
  date: "Profile",
  type: "Recommendation",
  tags: ["Recommendations"],
  body: `${recommendation.text} ${recommendation.person}`,
  url: "/#recommendations",
  slug: `recommendation-${index}`
})), ...config.experience.map((experience, index) => ({
  title: `${experience.title} - ${experience.company}`,
  description: experience.description,
  date: experience.period,
  type: "Experience",
  tags: ["Experience"],
  body: `${experience.title} ${experience.company} ${experience.description}`,
  url: "/#experience",
  slug: `experience-${index}`
}))].map((item) => ({
  title: item.title,
  description: item.description,
  date: item.date,
  type: item.type,
  tags: item.tags || [],
  body: item.body || item.description,
  url: item.url
}));

await writeFile(path.join(dist, "assets", "search-index.json"), JSON.stringify(searchIndex, null, 2));
console.log(`Built ${articles.length} articles and ${demos.length} demos into ${dist}`);

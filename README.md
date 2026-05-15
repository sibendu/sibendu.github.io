# Personal Website Starter

This is a professional personal website starter with editable profile content, articles, demos, and search.

## Edit your profile

Update `site.config.json` with your name, role, links, focus areas, demos, metrics, and experience.

## Add articles

Create a Markdown file in `content/articles`:

```md
---
title: My article title
description: One sentence summary.
date: 2026-05-03
tags: [AI, Product]
featured: true
---

Write your article here.
```

## Add demos

Add a new object to the `demos` array in `site.config.json`:

```json
{
  "slug": "my-demo-slug",
  "title": "My Demo Title",
  "description": "One sentence description.",
  "date": "2026-05-15",
  "tags": ["Agentic AI", "Demo"],
  "featured": true,
  "youtube": "https://youtu.be/YOUTUBE_VIDEO_ID"
}
```

All demo pages use the same HTML template. After editing `site.config.json`, rebuild the site.

## Build and run

```powershell
node scripts/build-site.mjs
node scripts/serve.mjs
```

Open `http://localhost:4173`.

## Running Security check with gitleaks

docker run -v  /mnt/c/..<path>.../mysite:/path   zricethezav/gitleaks:latest  dir -f csv  -r /path/out.csv  /path

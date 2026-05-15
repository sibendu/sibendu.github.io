async function loadSearchIndex() {
  const response = await fetch("/assets/search-index.json");
  if (!response.ok) {
    throw new Error("Search index could not be loaded.");
  }
  return response.json();
}

function normalize(value) {
  return String(value || "").toLowerCase();
}

function renderResults(target, items, query) {
  const q = normalize(query).trim();
  const filtered = q
    ? items.filter((item) => {
        const haystack = normalize([
          item.title,
          item.description,
          item.type,
          item.tags.join(" "),
          item.body
        ].join(" "));
        return q.split(/\s+/).every((word) => haystack.includes(word));
      })
    : items;

  target.innerHTML = filtered.length
    ? filtered.map((item) => `
      <a class="search-result" href="${item.url}">
        <div class="content-meta">${item.type} / ${item.date}</div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <div class="tag-list">${item.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      </a>
    `).join("")
    : `<p>No results yet. Try a different keyword, focus area, topic, or demo name.</p>`;
}

async function initSearch() {
  const input = document.querySelector("[data-search-input]");
  const results = document.querySelector("[data-search-results]");
  if (!input || !results) return;

  try {
    const items = await loadSearchIndex();
    renderResults(results, items, input.value);
    input.addEventListener("input", () => renderResults(results, items, input.value));
  } catch (error) {
    results.innerHTML = `<p>${error.message}</p>`;
  }
}

initSearch();

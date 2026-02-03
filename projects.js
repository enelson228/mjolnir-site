// Sanitize HTML to prevent XSS attacks
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Sanitize URL to prevent javascript: and data: URLs
function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('javascript:') ||
      trimmed.toLowerCase().startsWith('data:')) {
    return '';
  }
  return escapeHtml(trimmed);
}

async function loadProjects(){
  const grid = document.querySelector('[data-project-grid]');
  const err = document.querySelector('[data-project-error]');
  if (!grid) return;

  try{
    if (err) err.textContent = '';
    const res = await fetch('/projects.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const cards = (data.projects || []).map(p => {
      const tags = (p.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('');
      const safeUrl = sanitizeUrl(p.url);
      const href = safeUrl ? `href="${safeUrl}"` : '';
      const link = safeUrl ? `<a class="btn" style="margin-top:12px" ${href} target="_blank" rel="noreferrer">OPEN</a>` : '';
      const desc = escapeHtml(p.description || '');
      const title = escapeHtml(p.title || 'PROJECT');
      return `
        <article class="card">
          <h3>${title}</h3>
          <p>${desc}</p>
          <div class="kv">${tags}</div>
          ${link}
        </article>
      `;
    }).join('');

    grid.innerHTML = cards || '<div class="card" style="grid-column: span 12"><h3>NO PROJECTS</h3><p>Add entries to <code>/projects.json</code>.</p></div>';
  }catch(e){
    if (err) err.textContent = `Projects feed offline (${e.message}).`;
  }
}

loadProjects();

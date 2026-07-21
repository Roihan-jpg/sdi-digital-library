(function () {
  const script = document.currentScript;
  const targetId = script?.dataset.target || 'sdi-digital-library-widget';
  const target = document.getElementById(targetId);
  const api = script?.dataset.api;
  const catalogUrl = script?.dataset.catalogUrl || '/koleksi-digital';
  if (!target || !api) return;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  target.textContent = 'Memuat koleksi digital terbaru…';
  fetch(`${api.replace(/\/$/, '')}/digital-library?limit=6&sort=latest`)
    .then((response) => { if (!response.ok) throw new Error('request failed'); return response.json(); })
    .then(({ data }) => {
      if (!data.length) { target.textContent = 'Belum ada koleksi digital terbaru.'; return; }
      target.innerHTML = `<div class="sdi-digital-grid">${data.map((item) => `<article><small>${escape(item.media_type)}</small><h3><a href="${escape(catalogUrl)}/${encodeURIComponent(item.slug)}">${escape(item.title)}</a></h3><p>${escape(item.author_text || 'SDI Digital Library')}</p></article>`).join('')}</div><p><a href="${escape(catalogUrl)}">Lihat semua koleksi digital</a></p>`;
    })
    .catch(() => { target.textContent = 'Koleksi digital sedang tidak dapat dimuat.'; });
})();

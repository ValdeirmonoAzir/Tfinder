pronto(() => iniciarCrud({
  rota: "locais",
  id: "id_local",
  singular: "local",
  abrir: (r) => `local.html?id=${r.id_local}`,
  colunas: [
    ["nome", (v) => `<strong><i class="bi bi-geo-alt-fill text-primary me-1"></i>${esc(v)}</strong>`],
    ["tipo", (v) => `<span class="badge badge-soft-primary">${esc(v)}</span>`],
    ["pai", (v) => (v ? `<i class="bi bi-arrow-return-right text-secondary me-1"></i>${esc(v)}` : "—")],
    ["bloco", (v) => esc(v || "–")],
    ["n_recursos", (v) => `<span class="badge badge-soft-info"><i class="bi bi-pc-display"></i> ${v} equipamento(s)</span>`],
    ["n_sublocais", (v) => `<span class="badge badge-soft-secondary"><i class="bi bi-diagram-2"></i> ${v} interno(s)</span>`],
  ],
}));

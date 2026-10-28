pronto(() => iniciarCrud({
  rota: "locais", id: "id_local", singular: "local",
  abrir: (r) => `local.html?id=${r.id_local}`,
  colunas: [["nome", (v) => `<strong>${esc(v)}</strong>`], ["tipo", (v) => `<span class="badge bg-primary">${esc(v)}</span>`],
    ["pai"], ["bloco"], ["n_recursos"], ["n_sublocais"]],
}));

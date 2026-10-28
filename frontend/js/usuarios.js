pronto(() => iniciarCrud({
  rota: "usuarios", id: "id_usuario", singular: "usuário",
  colunas: [["nome"], ["email"], ["matricula"],
    ["perfil", (v) => `<span class="badge bg-primary">${esc(v)}</span>`],
    ["ativo", (v) => (v ? '<span class="badge bg-success">Ativo</span>' : '<span class="badge bg-secondary">Inativo</span>')]],
}));

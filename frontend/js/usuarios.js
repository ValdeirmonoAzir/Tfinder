pronto(() => iniciarCrud({
  rota: "usuarios",
  id: "id_usuario",
  singular: "usuário",
  colunas: [
    ["nome", (v) => `<strong><i class="bi bi-person-fill text-primary me-1"></i>${esc(v)}</strong>`],
    ["email", (v) => `<a href="mailto:${esc(v)}" class="text-body">${esc(v)}</a>`],
    ["matricula", (v) => `<code>${esc(v)}</code>`],
    ["telefone", (v) => esc(v || "–")],
    ["perfil", (v) => {
      const cor = v === "Administrador" ? "danger" : (v === "Professor" ? "primary" : "info");
      return `<span class="badge badge-soft-${cor}">${esc(v)}</span>`;
    }],
    ["ativo", (v) => (v
      ? '<span class="badge badge-soft-success"><i class="bi bi-check-circle"></i> Ativo</span>'
      : '<span class="badge badge-soft-secondary"><i class="bi bi-pause-circle"></i> Inativo</span>')]
  ],
}));

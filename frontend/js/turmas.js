pronto(() => iniciarCrud({
  rota: "turmas",
  id: "id_turma",
  singular: "turma",
  colunas: [
    ["nome", (v) => `<strong><i class="bi bi-mortarboard-fill text-primary me-2"></i>${esc(v)}</strong>`],
    ["turno", (v) => {
      const cor = v === "Manhã" ? "warning" : (v === "Tarde" ? "primary" : "info");
      return `<span class="badge badge-soft-${cor}"><i class="bi bi-sun"></i> ${esc(v || "–")}</span>`;
    }],
    ["ano_letivo", (v) => `<span class="badge badge-soft-secondary"><i class="bi bi-calendar"></i> ${esc(v || "–")}</span>`],
  ],
}));

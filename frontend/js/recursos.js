pronto(async () => {
  await iniciarCrud({
    rota: "recursos",
    id: "id_recurso",
    singular: "equipamento",
    abrir: (r) => (r.status === "Em manutenção" ? null : `reservas.html?recurso=${r.id_recurso}`),
    colunas: [
      ["nome", (v, r) => `
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-${r.tipo === 'Computador' ? 'pc-display' : 'tv'} fs-5 text-primary"></i>
          <div>
            <strong>${esc(v)}</strong>
            ${r.descricao ? `<div class="small text-secondary">${esc(r.descricao)}</div>` : ""}
          </div>
        </div>`],
      ["tipo", (v) => `<span class="badge badge-soft-primary"><i class="bi bi-tag"></i> ${esc(v)}</span>`],
      ["patrimonio", (v) => `<code class="text-body">${esc(v ?? "–")}</code>`],
      ["local", (v) => (v ? `<i class="bi bi-geo-alt text-secondary me-1"></i>${esc(v)}` : "–")],
      ["status", selo]
    ],
  });

  const local = new URLSearchParams(location.search).get("local");
  if (local && ehAdmin()) {
    const selLocal = $("f-crud").elements.id_local;
    if (selLocal) selLocal.value = local;
    $("f-crud").scrollIntoView({ behavior: "smooth" });
  }

  // Configura os botões de filtro rápido
  document.querySelectorAll("#filtro-recursos .filtro-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filtro-recursos .filtro-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filtro = btn.dataset.filtro;
      
      document.querySelectorAll("#linhas tr").forEach((tr) => {
        if (tr.querySelector(".estado-vazio")) return;
        if (filtro === "todos") {
          tr.hidden = false;
        } else {
          tr.hidden = !tr.textContent.includes(filtro);
        }
      });
    });
  });

  const btnLimpar = $("btn-limpar-busca");
  const campoBusca = $("busca");
  if (btnLimpar && campoBusca) {
    btnLimpar.addEventListener("click", () => {
      campoBusca.value = "";
      campoBusca.dispatchEvent(new Event("input"));
      campoBusca.focus();
    });
  }
});

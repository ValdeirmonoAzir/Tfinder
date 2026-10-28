pronto(async () => {
  const f = $("f-rel");
  const hoje = new Date();

  function aplicarPreset(tipo) {
    const dHoje = new Date();
    let dInicio = new Date();

    if (tipo === "30") {
      dInicio.setDate(dHoje.getDate() - 30);
      f.elements.inicio.value = dInicio.toLocaleDateString("sv-SE");
      f.elements.fim.value = dHoje.toLocaleDateString("sv-SE");
    } else if (tipo === "mes") {
      f.elements.inicio.value = `${dHoje.getFullYear()}-${String(dHoje.getMonth() + 1).padStart(2, "0")}-01`;
      f.elements.fim.value = dHoje.toLocaleDateString("sv-SE");
    } else if (tipo === "ano") {
      f.elements.inicio.value = `${dHoje.getFullYear()}-01-01`;
      f.elements.fim.value = `${dHoje.getFullYear()}-12-31`;
    } else if (tipo === "tudo") {
      f.elements.inicio.value = "";
      f.elements.fim.value = "";
    }
  }

  aplicarPreset("30");

  const linhas = (itens, iconePadrao = "tag") => {
    if (!itens.length) {
      return `
        <tr>
          <td colspan="4" class="text-center text-secondary py-4">
            <i class="bi bi-inbox fs-4 d-block mb-1 opacity-50"></i>
            Sem dados registrados no período selecionado.
          </td>
        </tr>`;
    }
    return itens.map((x) => `
      <tr>
        <td><strong>${esc(x.nome)}</strong></td>
        <td><span class="badge badge-soft-primary"><i class="bi bi-${iconePadrao}"></i> ${esc(x.detalhe)}</span></td>
        <td><span class="badge badge-soft-info">${x.reservas} reserva(s)</span></td>
        <td><strong>${Number(x.horas || 0).toFixed(1)} h</strong></td>
      </tr>`).join("");
  };

  const gerar = tentar(async () => {
    const btn = $("btn-gerar");
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Gerando dados...';

    try {
      const ini = f.elements.inicio.value;
      const fim = f.elements.fim.value;
      const d = await api(`/relatorios?inicio=${ini}&fim=${fim}`);

      const resumoEl = $("resumo");
      if (!d.resumo.length) {
        resumoEl.innerHTML = `
          <div class="col-12">
            <div class="card p-3 text-center text-secondary">
              Nenhuma movimentação de reserva encontrada no intervalo de datas selecionado.
            </div>
          </div>`;
      } else {
        resumoEl.innerHTML = d.resumo.map((s) => `
          <div class="col-6 col-md-3">
            <div class="card stat">
              <div>
                <div class="num">${s.total}</div>
                <div class="rot">${selo(s.status)}</div>
              </div>
            </div>
          </div>`).join("");
      }

      $("por-recurso").innerHTML = linhas(d.por_recurso, "pc-display");
      $("por-usuario").innerHTML = linhas(d.por_usuario, "person");
      rotular($("por-recurso"));
      rotular($("por-usuario"));
    } finally {
      btn.disabled = false;
      btn.innerHTML = textoOriginal;
    }
  });

  document.querySelectorAll("#presets-datas .filtro-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#presets-datas .filtro-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      aplicarPreset(btn.dataset.dias);
      gerar();
    });
  });

  f.addEventListener("submit", (e) => {
    e.preventDefault();
    document.querySelectorAll("#presets-datas .filtro-pill").forEach((b) => b.classList.remove("active"));
    gerar();
  });

  await gerar();
});

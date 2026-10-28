pronto(async () => {
  const f = $("f-reserva");
  let reservas = [];
  let filtroAtual = "todos";
  f.elements.data_reserva.min = hojeISO();

  const [recursos, turmas] = await Promise.all([api("/recursos"), api("/turmas")]);
  
  f.elements.id_recurso.innerHTML = '<option value="">Selecione um equipamento...</option>';
  recursos
    .filter((r) => r.status !== "Em manutenção")
    .forEach((r) => f.elements.id_recurso.add(new Option(`${r.nome} (${r.tipo})${r.local ? " · " + r.local : ""}`, r.id_recurso)));

  turmas.forEach((t) => f.elements.id_turma.add(new Option(t.nome, t.id_turma)));

  const escolhido = new URLSearchParams(location.search).get("recurso");
  if (escolhido) f.elements.id_recurso.value = escolhido;

  const acoes = (r, i) => {
    const ativa = ["Pendente", "Confirmada"].includes(r.status);
    const b = (acao, classe, icone, texto) => `
      <button class="btn ${classe} btn-sm" data-acao="${acao}" data-i="${i}">
        <i class="bi bi-${icone}"></i> ${texto}
      </button> `;
    return (ehAdmin() && r.status === "Pendente"
      ? b("aprovar", "btn-success", "check-lg", "Aprovar") + b("recusar", "btn-outline-danger", "x-lg", "Recusar")
      : "") +
      (ativa ? b("editar", "btn-outline-primary", "pencil", "Editar") + b("cancelar", "btn-outline-secondary", "slash-circle", "Cancelar") : "");
  };

  function renderizarTabela() {
    const termo = ($("busca") ? $("busca").value : "").toLowerCase().trim();
    let filtradas = reservas.filter((r) => {
      if (filtroAtual === "encerradas") {
        if (!["Cancelada", "Recusada"].includes(r.status)) return false;
      } else if (filtroAtual !== "todos" && r.status !== filtroAtual) {
        return false;
      }
      if (termo) {
        const texto = `${r.recurso} ${r.usuario} ${r.turma || ""} ${r.data_reserva} ${r.finalidade || ""}`.toLowerCase();
        if (!texto.includes(termo)) return false;
      }
      return true;
    });

    const tbody = $("linhas");
    if (!filtradas.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="estado-vazio">
              <i class="bi bi-calendar-x ic-vazio"></i>
              <h3>Nenhuma reserva encontrada</h3>
              <p>Não há reservas correspondentes aos filtros aplicados.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = filtradas.map((r) => {
      const iOriginal = reservas.indexOf(r);
      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-${r.tipo === 'Computador' ? 'pc-display' : 'tv'} text-primary"></i>
              <strong>${esc(r.recurso)}</strong>
            </div>
            ${r.finalidade ? `<div class="small text-secondary mt-1"><i class="bi bi-card-text"></i> ${esc(r.finalidade)}</div>` : ""}
          </td>
          <td><i class="bi bi-calendar3 text-secondary me-1"></i> ${fmtData(r.data_reserva)}</td>
          <td><i class="bi bi-clock text-secondary me-1"></i> ${r.hora_inicio} – ${r.hora_fim}</td>
          <td><i class="bi bi-person text-secondary me-1"></i> ${esc(r.usuario)}</td>
          <td>${esc(r.turma || "–")}</td>
          <td>
            ${selo(r.status)}
            ${r.motivo_recusa ? `<div class="small text-danger mt-1"><i class="bi bi-info-circle"></i> Motivo: ${esc(r.motivo_recusa)}</div>` : ""}
          </td>
          <td class="acoes text-end text-nowrap">${acoes(r, iOriginal)}</td>
        </tr>`;
    }).join("");

    rotular(tbody);
  }

  async function carregar() {
    reservas = await api("/reservas");
    renderizarTabela();
  }

  function limpar() {
    f.reset();
    $("res-titulo").innerHTML = '<i class="bi bi-calendar-plus text-success"></i> Nova reserva';
    $("res-salvar").innerHTML = '<i class="bi bi-check-lg"></i> Confirmar Reserva';
    $("res-cancelar").classList.add("d-none");
    $("ocupadas").classList.add("d-none");
    if (escolhido) f.elements.id_recurso.value = escolhido;
  }

  const mostrarOcupadas = tentar(async () => {
    const { id_recurso, data_reserva } = f.elements;
    if (!id_recurso.value || !data_reserva.value) {
      $("ocupadas").classList.add("d-none");
      return;
    }
    const ocupadas = await api(`/disponibilidade?id_recurso=${id_recurso.value}&data=${data_reserva.value}`);
    const box = $("ocupadas");
    box.classList.remove("d-none");

    if (ocupadas.length) {
      box.innerHTML = `
        <div class="d-flex align-items-center gap-2 mb-1 w-100">
          <i class="bi bi-exclamation-circle text-warning fs-5"></i>
          <strong>Horários já ocupados neste dia:</strong>
        </div>
        <div class="d-flex flex-wrap gap-2">
          ${ocupadas.map((o) => `<span class="chip-horario-ocupado"><i class="bi bi-clock"></i> ${o.hora_inicio} – ${o.hora_fim} (${esc(o.usuario)})</span>`).join("")}
        </div>`;
    } else {
      box.innerHTML = `
        <i class="bi bi-check-circle-fill text-success fs-5"></i>
        <span><strong>Totalmente disponível:</strong> Nenhuma reserva confirmada para este equipamento na data selecionada.</span>`;
    }
  });

  ["id_recurso", "data_reserva"].forEach((n) => f.elements[n].addEventListener("change", mostrarOcupadas));
  $("res-cancelar").addEventListener("click", limpar);

  f.addEventListener("submit", tentar(async (e) => {
    e.preventDefault();
    const btn = $("res-salvar");
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Salvando...';

    try {
      const d = Object.fromEntries(new FormData(f)), id = d.__id;
      delete d.__id;
      await api(`/reservas${id ? "/" + id : ""}`, id ? "PUT" : "POST", d);
      aviso(id
        ? (ehAdmin() ? "Reserva atualizada com sucesso." : "Reserva atualizada e enviada para nova aprovação.")
        : (ehAdmin() ? "Reserva confirmada com sucesso!" : "Solicitação enviada com sucesso! Aguarde a aprovação do administrador."));
      limpar();
      await carregar();
    } finally {
      btn.disabled = false;
      btn.innerHTML = textoOriginal;
    }
  }));

  $("linhas").addEventListener("click", tentar(async (e) => {
    const botao = e.target.closest("button[data-acao]");
    if (!botao) return;
    const r = reservas[botao.dataset.i], acao = botao.dataset.acao;

    if (acao === "editar") {
      for (const n of ["id_recurso", "data_reserva", "hora_inicio", "hora_fim", "finalidade"]) {
        f.elements[n].value = r[n] ?? "";
      }
      f.elements.id_turma.value = r.id_turma ?? "";
      f.elements.__id.value = r.id_reserva;
      $("res-titulo").innerHTML = '<i class="bi bi-pencil-square text-primary"></i> Editar reserva';
      $("res-salvar").innerHTML = '<i class="bi bi-check-lg"></i> Salvar alterações';
      $("res-cancelar").classList.remove("d-none");
      f.scrollIntoView({ behavior: "smooth" });
      return mostrarOcupadas();
    }

    if (acao === "cancelar") {
      const confirmou = await confirmarModal({
        titulo: "Cancelar Reserva",
        mensagem: `Deseja realmente cancelar a reserva de "${r.recurso}" agendada para ${fmtData(r.data_reserva)} (${r.hora_inicio}–${r.hora_fim})?`,
        textoConfirmar: "Sim, Cancelar Reserva",
        corBotao: "warning",
        icone: "slash-circle"
      });
      if (!confirmou) return;

      await api(`/reservas/${r.id_reserva}/cancelar`, "POST");
      aviso("Reserva cancelada com sucesso.");
    } else if (acao === "aprovar") {
      await api(`/reservas/${r.id_reserva}/aprovar`, "POST");
      aviso(`Reserva de ${r.usuario} aprovada com sucesso!`);
    } else if (acao === "recusar") {
      const motivo = await promptModal({
        titulo: "Recusar Reserva",
        mensagem: `Informe o motivo da recusa para a solicitação de ${r.usuario} (${r.recurso}):`,
        placeholder: "Ex.: Conflito de cronograma, manutenção agendada...",
        textoConfirmar: "Confirmar Recusa"
      });
      if (motivo === null) return;

      await api(`/reservas/${r.id_reserva}/recusar`, "POST", { motivo });
      aviso("Reserva recusada com sucesso.");
    }
    await carregar();
  }));

  // Filtros pills de status
  document.querySelectorAll("#filtro-status .filtro-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filtro-status .filtro-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filtroAtual = btn.dataset.filtro;
      renderizarTabela();
    });
  });

  // Busca instantânea com botão limpar
  const campoBusca = $("busca");
  const btnLimpar = $("btn-limpar-busca");
  if (campoBusca) {
    campoBusca.addEventListener("input", renderizarTabela);
    if (btnLimpar) {
      btnLimpar.addEventListener("click", () => {
        campoBusca.value = "";
        renderizarTabela();
        campoBusca.focus();
      });
    }
  }

  await carregar();
});

pronto(async () => {
  let itens = [];

  const quando = (s) => {
    try {
      const d = new Date(s.replace(" ", "T") + "Z");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return s;
    }
  };

  async function carregar() {
    itens = await api("/notificacoes");
    const container = $("lista");
    const acoes = $("acoes-notif");

    if (!itens.length) {
      if (acoes) acoes.classList.add("d-none");
      container.innerHTML = `
        <div class="estado-vazio py-5">
          <i class="bi bi-bell-slash ic-vazio"></i>
          <h3>Tudo em dia!</h3>
          <p class="text-secondary small">Você não possui avisos ou notificações no momento.</p>
        </div>`;
      return;
    }

    if (acoes) acoes.classList.remove("d-none");

    container.innerHTML = itens.map((n) => `
      <div class="list-group-item d-flex justify-content-between align-items-start gap-3 p-3 ${n.lida ? '' : 'bg-body-tertiary border-start border-4 border-success'}">
        <div class="d-flex align-items-start gap-3 flex-grow-1">
          <div class="stat-ic rounded-circle p-2 ${n.lida ? 'bg-secondary-subtle text-secondary' : 'bg-success-subtle text-success'} fs-5 flex-shrink-0">
            <i class="bi bi-${n.lida ? 'bell' : 'bell-fill'}"></i>
          </div>
          <div>
            <div class="${n.lida ? 'text-body' : 'fw-bold text-body'}">${esc(n.mensagem)}</div>
            <div class="small text-secondary mt-1">
              <i class="bi bi-clock me-1"></i> ${quando(n.data_criacao)}
              ${!n.lida ? '<span class="badge bg-success ms-2">Nova</span>' : ''}
            </div>
          </div>
        </div>
        <div class="d-flex align-items-center gap-1 flex-shrink-0">
          ${!n.lida ? `<button class="btn btn-outline-secondary btn-sm" data-acao="ler" data-id="${n.id_notificacao}" title="Marcar como lida"><i class="bi bi-check2"></i></button>` : ''}
          <button class="btn btn-outline-danger btn-sm" data-acao="excluir" data-id="${n.id_notificacao}" title="Remover aviso"><i class="bi bi-trash"></i></button>
        </div>
      </div>`).join("");
  }

  $("lista").addEventListener("click", tentar(async (e) => {
    const btn = e.target.closest("button[data-acao]");
    if (!btn) return;
    const acao = btn.dataset.acao;
    const id = btn.dataset.id;

    if (acao === "ler") {
      await api(`/notificacoes/${id}/ler`, "POST");
      await carregar();
      atualizarBadge();
    } else if (acao === "excluir") {
      await api(`/notificacoes/${id}`, "DELETE");
      aviso("Aviso removido.");
      await carregar();
      atualizarBadge();
    }
  }));

  const btnMarcar = $("btn-marcar-lidas");
  if (btnMarcar) {
    btnMarcar.addEventListener("click", tentar(async () => {
      await api("/notificacoes/ler-todas", "POST");
      aviso("Todas as notificações foram marcadas como lidas.");
      await carregar();
      atualizarBadge();
    }));
  }

  const btnLimpar = $("btn-limpar-todas");
  if (btnLimpar) {
    btnLimpar.addEventListener("click", tentar(async () => {
      const confirmou = await confirmarModal({
        titulo: "Limpar todos os avisos",
        mensagem: "Tem certeza que deseja apagar todas as notificações da sua caixa de entrada?",
        textoConfirmar: "Sim, Limpar Tudo",
        corBotao: "danger",
        icone: "trash"
      });
      if (!confirmou) return;

      await api("/notificacoes", "DELETE");
      aviso("Todas as notificações foram apagadas.");
      await carregar();
      atualizarBadge();
    }));
  }

  await carregar();
});

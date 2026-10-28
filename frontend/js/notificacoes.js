pronto(async () => {
  const itens = await api("/notificacoes");
  const quando = (s) => new Date(s.replace(" ", "T") + "Z").toLocaleString("pt-BR");
  $("lista").innerHTML = itens.map((n) => `<div class="list-group-item ${n.lida ? "" : "list-group-item-success fw-semibold"}">
    ${esc(n.mensagem)}<div class="small text-secondary fw-normal">${quando(n.data_criacao)}</div></div>`).join("")
    || '<div class="list-group-item text-center text-secondary py-4">Nenhuma notificação.</div>';
  if (itens.some((n) => !n.lida)) {   // destaca as novas agora e marca como lidas em seguida
    await api("/notificacoes/ler-todas", "POST");
    atualizarBadge();
  }
});

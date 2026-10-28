pronto(async () => {
  const f = $("f-rel");
  const linhas = (itens) => itens.map((x) => `<tr><td>${esc(x.nome)}</td><td>${esc(x.detalhe)}</td>
    <td>${x.reservas}</td><td>${x.horas}</td></tr>`).join("")
    || '<tr><td colspan="4" class="text-center text-secondary py-3">Sem dados no período.</td></tr>';

  const gerar = tentar(async () => {
    const d = await api(`/relatorios?inicio=${f.elements.inicio.value}&fim=${f.elements.fim.value}`);
    $("resumo").innerHTML = d.resumo.map((s) => `<div class="col-6 col-md-3"><div class="card stat">
      <div class="num">${s.total}</div>${selo(s.status)}</div></div>`).join("");
    $("por-recurso").innerHTML = linhas(d.por_recurso);
    $("por-usuario").innerHTML = linhas(d.por_usuario);
    rotular($("por-recurso"));
    rotular($("por-usuario"));
  });

  f.addEventListener("submit", (e) => { e.preventDefault(); gerar(); });
  await gerar();
});

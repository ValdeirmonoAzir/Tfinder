// Tela de um local: mostra os locais internos (ex.: laboratórios da Coordenação) e os equipamentos dele.
pronto(async () => {
  const id = new URLSearchParams(location.search).get("id");
  let d;
  try {
    d = await api(`/locais/${id}/detalhe`);
  } catch (e) {
    aviso(e.message, "danger");
    return setTimeout(() => (location.href = "locais.html"), 1500);
  }
  const { local: l, sublocais, recursos } = d;
  const computadores = recursos.filter((r) => r.tipo === "Computador").length;
  const tvs = recursos.filter((r) => r.tipo === "Televisor").length;

  document.title = `${l.nome} – TFinder`;
  $("l-nome").textContent = l.nome;
  $("bc-nome").textContent = l.nome;
  $("l-info").innerHTML = `<span class="badge bg-primary">${esc(l.tipo)}</span> ` + [
    l.bloco, l.capacidade ? `${l.capacidade} lugares` : null,
    computadores ? `${computadores} computador(es)` : null, tvs ? `${tvs} TV(s)` : null,
    sublocais.length ? `${sublocais.length} local(is) interno(s)` : null].filter(Boolean).map(esc).join(" · ");
  $("add-equip").href = `recursos.html?local=${l.id_local}`;

  if (l.id_local_pai) {
    $("bc-pai").classList.remove("d-none");
    $("bc-pai").innerHTML = `<a href="local.html?id=${l.id_local_pai}">${esc(l.pai)}</a>`;
  }

  if (sublocais.length) {
    $("sec-sub").classList.remove("d-none");
    $("sub-titulo").textContent = `Dentro de ${l.nome}`;
    $("sublocais").innerHTML = sublocais.map((s) => `<div class="col-md-6 col-lg-4">
      <a class="card local-card" href="local.html?id=${s.id_local}">
        <div class="d-flex justify-content-between align-items-start gap-2"><strong>${esc(s.nome)}</strong>
          <span class="badge bg-primary">${esc(s.tipo)}</span></div>
        <div class="small text-secondary mt-2"><i class="bi bi-pc-display"></i> ${s.n_recursos} equipamento(s)</div></a></div>`).join("");
  }

  $("equip-titulo").textContent = l.tipo === "Laboratório móvel" ? "Computadores" : "Equipamentos neste local";
  $("equip").innerHTML = recursos.map((r) => `<tr><td><strong>${esc(r.nome)}</strong></td>
    <td><i class="bi bi-${r.tipo === "Computador" ? "pc-display" : "tv"}"></i> ${esc(r.tipo)}</td>
    <td>${esc(r.patrimonio ?? "–")}</td><td>${selo(r.status)}</td>
    <td class="acoes text-end">${r.status === "Em manutenção" ? "" : `<a class="btn btn-success btn-sm" href="reservas.html?recurso=${r.id_recurso}">Reservar</a>`}</td></tr>`).join("")
    || '<tr><td colspan="5" class="text-center text-secondary py-4">Nenhum equipamento diretamente neste local.</td></tr>';
  rotular($("equip"));
});

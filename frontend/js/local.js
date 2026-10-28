// Tela de um local: mostra os locais internos (ex.: laboratórios da Coordenação) e os equipamentos dele.
pronto(async () => {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    location.href = "locais.html";
    return;
  }

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
  $("l-nome").innerHTML = `<i class="bi bi-geo-alt-fill text-primary"></i> ${esc(l.nome)}`;
  $("bc-nome").textContent = l.nome;

  const infoPills = [
    `<span class="badge badge-soft-primary">${esc(l.tipo)}</span>`,
    l.bloco ? `<span class="badge badge-soft-secondary"><i class="bi bi-building"></i> ${esc(l.bloco)}</span>` : null,
    l.capacidade ? `<span class="badge badge-soft-secondary"><i class="bi bi-people"></i> ${l.capacidade} lugares</span>` : null,
    computadores ? `<span class="badge badge-soft-info"><i class="bi bi-pc-display"></i> ${computadores} computador(es)</span>` : null,
    tvs ? `<span class="badge badge-soft-info"><i class="bi bi-tv"></i> ${tvs} TV(s)</span>` : null,
    sublocais.length ? `<span class="badge badge-soft-warning"><i class="bi bi-diagram-2"></i> ${sublocais.length} sublocal(is)</span>` : null
  ].filter(Boolean);

  $("l-info").innerHTML = infoPills.join(" ");
  if ($("add-equip")) $("add-equip").href = `recursos.html?local=${l.id_local}`;

  if (l.id_local_pai) {
    $("bc-pai").classList.remove("d-none");
    $("bc-pai").innerHTML = `<a href="local.html?id=${l.id_local_pai}"><i class="bi bi-chevron-right me-1"></i>${esc(l.pai)}</a>`;
  }

  if (sublocais.length) {
    $("sec-sub").classList.remove("d-none");
    $("sub-titulo").innerHTML = `<i class="bi bi-diagram-2 text-primary me-1"></i> Espaços dentro de ${esc(l.nome)}`;
    $("sublocais").innerHTML = sublocais.map((s) => `
      <div class="col-md-6 col-lg-4">
        <a class="card local-card h-100" href="local.html?id=${s.id_local}">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <strong><i class="bi bi-folder2-open text-primary me-1"></i> ${esc(s.nome)}</strong>
            <span class="badge badge-soft-primary">${esc(s.tipo)}</span>
          </div>
          <div class="small text-secondary mt-3 d-flex justify-content-between align-items-center">
            <span><i class="bi bi-pc-display"></i> ${s.n_recursos} equipamento(s)</span>
            <span class="text-primary fw-semibold">Abrir <i class="bi bi-arrow-right"></i></span>
          </div>
        </a>
      </div>`).join("");
  }

  $("equip-titulo").innerHTML = `<i class="bi bi-${l.tipo === "Laboratório móvel" ? "pc-display" : "grid"} text-primary me-1"></i> ` +
    (l.tipo === "Laboratório móvel" ? "Computadores deste laboratório" : "Equipamentos neste local");

  const tbody = $("equip");
  if (!recursos.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="estado-vazio py-4">
            <i class="bi bi-pc-display ic-vazio"></i>
            <h3>Nenhum equipamento neste local</h3>
            <p class="text-secondary small mb-3">Nenhum equipamento está alocado diretamente neste espaço no momento.</p>
            <a href="recursos.html?local=${l.id_local}" class="btn btn-primary btn-sm so-admin"><i class="bi bi-plus-lg"></i> Adicionar equipamento</a>
          </div>
        </td>
      </tr>`;
  } else {
    tbody.innerHTML = recursos.map((r) => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-${r.tipo === 'Computador' ? 'pc-display' : 'tv'} text-primary fs-5"></i>
            <strong>${esc(r.nome)}</strong>
          </div>
        </td>
        <td><span class="badge badge-soft-primary">${esc(r.tipo)}</span></td>
        <td><code>${esc(r.patrimonio ?? "–")}</code></td>
        <td>${selo(r.status)}</td>
        <td class="acoes text-end">
          ${r.status === "Em manutenção"
            ? '<span class="text-secondary small fst-italic">Indisponível</span>'
            : `<a class="btn btn-success btn-sm" href="reservas.html?recurso=${r.id_recurso}"><i class="bi bi-calendar-plus"></i> Reservar</a>`}
        </td>
      </tr>`).join("");
  }

  rotular(tbody);
});

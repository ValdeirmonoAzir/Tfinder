pronto(async () => {
  $("nome").textContent = usuario.nome;

  if (!ehAdmin()) {
    const rot = $("rot-pendentes");
    if (rot) rot.textContent = "Minhas pendentes";
  }

  const [rec, res, usr] = await Promise.all([
    api("/recursos"),
    api("/reservas"),
    ehAdmin() ? api("/usuarios") : Promise.resolve([])
  ]);

  const proximas = res
    .filter((r) => r.status === "Confirmada" && r.data_reserva >= hojeISO())
    .sort((a, b) => (a.data_reserva + a.hora_inicio).localeCompare(b.data_reserva + b.hora_inicio));

  $("n-recursos").textContent = rec.length;
  $("n-disponiveis").textContent = rec.filter((r) => r.status === "Disponível").length;
  $("n-futuras").textContent = proximas.length;
  $("n-pendentes").textContent = res.filter((r) => r.status === "Pendente").length;
  if ($("n-usuarios")) $("n-usuarios").textContent = usr.length;

  const tbody = $("proximas");
  if (!proximas.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="estado-vazio py-4">
            <i class="bi bi-calendar-x ic-vazio fs-2"></i>
            <h3 class="fs-6 mt-2">Nenhuma reserva futura confirmada</h3>
            <p class="small text-secondary mb-3">Reserve um computador ou televisor para suas atividades escolares.</p>
            <a href="reservas.html" class="btn btn-success btn-sm"><i class="bi bi-plus-lg"></i> Fazer reserva</a>
          </div>
        </td>
      </tr>`;
  } else {
    tbody.innerHTML = proximas.slice(0, 6).map((r) => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-${r.tipo === 'Computador' ? 'pc-display' : 'tv'} text-primary"></i>
            <strong>${esc(r.recurso)}</strong>
          </div>
        </td>
        <td><i class="bi bi-calendar3 text-secondary me-1"></i> ${fmtData(r.data_reserva)}</td>
        <td><i class="bi bi-clock text-secondary me-1"></i> ${r.hora_inicio} – ${r.hora_fim}</td>
        <td>${esc(r.usuario)}</td>
        <td>${esc(r.turma || "–")}</td>
        <td>${selo(r.status)}</td>
      </tr>`).join("");
  }

  rotular(tbody);
});

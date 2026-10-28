pronto(async () => {
  $("nome").textContent = usuario.nome;
  const [rec, res, usr] = await Promise.all([api("/recursos"), api("/reservas"), ehAdmin() ? api("/usuarios") : []]);
  const proximas = res.filter((r) => r.status === "Confirmada" && r.data_reserva >= hojeISO())
    .sort((a, b) => (a.data_reserva + a.hora_inicio).localeCompare(b.data_reserva + b.hora_inicio));

  $("n-recursos").textContent = rec.length;
  $("n-disponiveis").textContent = rec.filter((r) => r.status === "Disponível").length;
  $("n-futuras").textContent = proximas.length;
  $("n-pendentes").textContent = res.filter((r) => r.status === "Pendente").length;
  $("n-usuarios").textContent = usr.length;

  $("proximas").innerHTML = proximas.slice(0, 5).map((r) => `<tr><td>${esc(r.recurso)}</td><td>${fmtData(r.data_reserva)}</td>
    <td>${r.hora_inicio} – ${r.hora_fim}</td><td>${esc(r.usuario)}</td></tr>`).join("")
    || '<tr><td colspan="4" class="text-center text-secondary py-4">Nenhuma reserva futura.</td></tr>';
  rotular($("proximas"));
});

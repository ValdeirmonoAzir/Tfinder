pronto(async () => {
  const f = $("f-reserva");
  let reservas = [];
  f.elements.data_reserva.min = hojeISO();

  const [recursos, turmas] = await Promise.all([api("/recursos"), api("/turmas")]);
  recursos.filter((r) => r.status !== "Em manutenção")
    .forEach((r) => f.elements.id_recurso.add(new Option(`${r.nome} (${r.tipo})${r.local ? " · " + r.local : ""}`, r.id_recurso)));
  turmas.forEach((t) => f.elements.id_turma.add(new Option(t.nome, t.id_turma)));
  const escolhido = new URLSearchParams(location.search).get("recurso");   // vindo da tela de um local
  if (escolhido) f.elements.id_recurso.value = escolhido;

  const acoes = (r, i) => {
    const ativa = ["Pendente", "Confirmada"].includes(r.status);
    const b = (acao, classe, texto) => `<button class="btn ${classe} btn-sm" data-acao="${acao}" data-i="${i}">${texto}</button> `;
    return (ehAdmin() && r.status === "Pendente" ? b("aprovar", "btn-success", "Aprovar") + b("recusar", "btn-outline-danger", "Recusar") : "")
      + (ativa ? b("editar", "btn-outline-primary", "Editar") + b("cancelar", "btn-outline-secondary", "Cancelar") : "");
  };

  async function carregar() {
    reservas = await api("/reservas");
    $("linhas").innerHTML = reservas.map((r, i) => `<tr><td>${esc(r.recurso)}</td><td>${fmtData(r.data_reserva)}</td>
      <td>${r.hora_inicio} – ${r.hora_fim}</td><td>${esc(r.usuario)}</td><td>${esc(r.turma || "–")}</td>
      <td>${selo(r.status)}${r.motivo_recusa ? `<div class="small text-secondary">${esc(r.motivo_recusa)}</div>` : ""}</td>
      <td class="acoes text-end text-nowrap">${acoes(r, i)}</td></tr>`).join("")
      || '<tr><td colspan="7" class="text-center text-secondary py-4">Nenhuma reserva registrada.</td></tr>';
    rotular($("linhas"));
  }

  function limpar() {
    f.reset();
    $("res-titulo").textContent = "Nova reserva";
    $("res-salvar").textContent = "Reservar";
    $("res-cancelar").classList.add("d-none");
    $("ocupadas").classList.add("d-none");
  }

  const mostrarOcupadas = tentar(async () => {
    const { id_recurso, data_reserva } = f.elements;
    if (!id_recurso.value || !data_reserva.value) return;
    const ocupadas = await api(`/disponibilidade?id_recurso=${id_recurso.value}&data=${data_reserva.value}`);
    $("ocupadas").classList.remove("d-none");
    $("ocupadas").innerHTML = ocupadas.length
      ? '<i class="bi bi-clock"></i> <strong>Horários já ocupados neste dia:</strong> ' + ocupadas.map((o) => `${o.hora_inicio}–${o.hora_fim}`).join(", ")
      : '<i class="bi bi-check-circle"></i> Nenhuma reserva confirmada neste dia: todos os horários estão livres.';
  });
  ["id_recurso", "data_reserva"].forEach((n) => f.elements[n].addEventListener("change", mostrarOcupadas));
  $("res-cancelar").addEventListener("click", limpar);

  f.addEventListener("submit", tentar(async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f)), id = d.__id;
    delete d.__id;
    await api(`/reservas${id ? "/" + id : ""}`, id ? "PUT" : "POST", d);
    aviso(id ? (ehAdmin() ? "Reserva atualizada." : "Reserva atualizada e enviada para nova aprovação.")
             : (ehAdmin() ? "Reserva registrada com sucesso." : "Solicitação enviada! Aguarde a aprovação do administrador."));
    limpar();
    await carregar();
  }));

  $("linhas").addEventListener("click", tentar(async (e) => {
    const botao = e.target.closest("button[data-acao]");
    if (!botao) return;
    const r = reservas[botao.dataset.i], acao = botao.dataset.acao;
    if (acao === "editar") {
      for (const n of ["id_recurso", "data_reserva", "hora_inicio", "hora_fim", "finalidade"]) f.elements[n].value = r[n] ?? "";
      f.elements.id_turma.value = r.id_turma ?? "";
      f.elements.__id.value = r.id_reserva;
      $("res-titulo").textContent = "Editar reserva";
      $("res-salvar").textContent = "Salvar alterações";
      $("res-cancelar").classList.remove("d-none");
      f.scrollIntoView({ behavior: "smooth" });
      return mostrarOcupadas();
    }
    if (acao === "cancelar") {
      if (!confirm("Cancelar esta reserva?")) return;
      await api(`/reservas/${r.id_reserva}/cancelar`, "POST");
      aviso("Reserva cancelada.");
    } else if (acao === "aprovar") {
      await api(`/reservas/${r.id_reserva}/aprovar`, "POST");
      aviso("Reserva aprovada.");
    } else if (acao === "recusar") {
      const motivo = prompt("Motivo da recusa (opcional):");
      if (motivo === null) return;
      await api(`/reservas/${r.id_reserva}/recusar`, "POST", { motivo });
      aviso("Reserva recusada.");
    }
    await carregar();
  }));

  await carregar();
});

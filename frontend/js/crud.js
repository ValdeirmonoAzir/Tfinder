// Lógica comum das telas de cadastro (equipamentos, locais, usuários e turmas).
// O formulário e a tabela ficam no HTML de cada tela; aqui só carregamos e tratamos os dados.
async function iniciarCrud(cfg) {
  const form = $("f-crud");
  const tituloInicial = $("crud-titulo").textContent;
  let lista = [];

  // selects com data-fonte="rota:campo_valor:campo_rotulo" são preenchidos pela API
  for (const sel of document.querySelectorAll("select[data-fonte]")) {
    const [rota, valor, rotulo] = sel.dataset.fonte.split(":");
    (await api("/" + rota)).forEach((o) => sel.add(new Option(o[rotulo], o[valor])));
  }

  async function carregar() {
    lista = await api("/" + cfg.rota);
    $("linhas").innerHTML = lista.map((r, i) => `<tr>
      ${cfg.colunas.map(([k, fmt]) => `<td>${fmt ? fmt(r[k], r) : esc(r[k] ?? "–")}</td>`).join("")}
      <td class="acoes ${cfg.abrir ? "" : "so-admin"} text-end text-nowrap">
        ${cfg.abrir ? `<a class="btn btn-success btn-sm" href="${cfg.abrir(r)}">Abrir</a>` : ""}
        <button class="btn btn-outline-primary btn-sm so-admin" data-acao="editar" data-i="${i}">Editar</button>
        <button class="btn btn-outline-danger btn-sm so-admin" data-acao="excluir" data-i="${i}">Excluir</button></td></tr>`).join("")
      || '<tr><td colspan="9" class="text-center text-secondary py-4">Nenhum registro.</td></tr>';
    rotular($("linhas"));
  }

  function limpar() {
    form.reset();
    $("crud-titulo").textContent = tituloInicial;
    $("crud-salvar").textContent = "Cadastrar";
    $("crud-cancelar").classList.add("d-none");
  }

  form.addEventListener("submit", tentar(async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form)), id = d.__id;
    delete d.__id;
    form.querySelectorAll("[data-num]").forEach((el) => (d[el.name] = Number(d[el.name])));
    await api(`/${cfg.rota}${id ? "/" + id : ""}`, id ? "PUT" : "POST", d);
    aviso(id ? "Alterações salvas." : "Cadastrado com sucesso.");
    limpar();
    await carregar();
  }));

  $("crud-cancelar").addEventListener("click", limpar);

  $("linhas").addEventListener("click", tentar(async (e) => {
    const botao = e.target.closest("button[data-acao]");
    if (!botao) return;
    const r = lista[botao.dataset.i];
    if (botao.dataset.acao === "editar") {
      for (const el of form.elements) if (el.name) el.value = el.type === "password" ? "" : r[el.name] ?? "";
      form.elements.__id.value = r[cfg.id];
      $("crud-titulo").textContent = `Editar ${cfg.singular}`;
      $("crud-salvar").textContent = "Salvar alterações";
      $("crud-cancelar").classList.remove("d-none");
      form.scrollIntoView({ behavior: "smooth" });
    } else if (confirm(`Excluir este ${cfg.singular}?`)) {
      await api(`/${cfg.rota}/${r[cfg.id]}`, "DELETE");
      aviso("Excluído com sucesso.");
      limpar();
      await carregar();
    }
  }));

  $("busca").addEventListener("input", (e) => document.querySelectorAll("#linhas tr").forEach(
    (tr) => (tr.hidden = !tr.textContent.toLowerCase().includes(e.target.value.toLowerCase()))));

  await carregar();
}

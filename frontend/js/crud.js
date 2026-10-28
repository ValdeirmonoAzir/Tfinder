// Lógica comum das telas de cadastro (equipamentos, locais, usuários e turmas).
// O formulário e a tabela ficam no HTML de cada tela; aqui gerenciamos dados, busca e edição.
async function iniciarCrud(cfg) {
  const form = $("f-crud");
  const tituloInicial = $("crud-titulo") ? $("crud-titulo").textContent : "";
  let lista = [];

  // selects com data-fonte="rota:campo_valor:campo_rotulo" são preenchidos pela API
  for (const sel of document.querySelectorAll("select[data-fonte]")) {
    const [rota, valor, rotulo] = sel.dataset.fonte.split(":");
    try {
      const itens = await api("/" + rota);
      itens.forEach((o) => sel.add(new Option(o[rotulo], o[valor])));
    } catch { /* continua mesmo se o select falhar */ }
  }

  async function carregar() {
    lista = await api("/" + cfg.rota);
    renderizar(lista);
  }

  function renderizar(dados) {
    const linhas = $("linhas");
    if (!linhas) return;

    if (!dados.length) {
      linhas.innerHTML = `
        <tr>
          <td colspan="12">
            <div class="estado-vazio">
              <i class="bi bi-inbox ic-vazio"></i>
              <h3>Nenhum registro encontrado</h3>
              <p>Cadastre um novo item pelo formulário acima.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    linhas.innerHTML = dados.map((r, i) => `
      <tr>
        ${cfg.colunas.map(([k, fmt]) => `<td>${fmt ? fmt(r[k], r) : esc(r[k] ?? "–")}</td>`).join("")}
        <td class="acoes ${cfg.abrir ? "" : "so-admin"} text-end text-nowrap">
          ${cfg.abrir ? `<a class="btn btn-success btn-sm" href="${cfg.abrir(r)}"><i class="bi bi-box-arrow-in-right"></i> Abrir</a>` : ""}
          <button class="btn btn-outline-primary btn-sm so-admin" data-acao="editar" data-i="${i}"><i class="bi bi-pencil"></i> Editar</button>
          <button class="btn btn-outline-danger btn-sm so-admin" data-acao="excluir" data-i="${i}"><i class="bi bi-trash"></i> Excluir</button>
        </td>
      </tr>`).join("");

    rotular(linhas);
  }

  function limpar() {
    if (!form) return;
    form.reset();
    if ($("crud-titulo")) $("crud-titulo").textContent = tituloInicial;
    if ($("crud-salvar")) $("crud-salvar").textContent = "Cadastrar";
    if ($("crud-cancelar")) $("crud-cancelar").classList.add("d-none");
  }

  if (form) {
    form.addEventListener("submit", tentar(async (e) => {
      e.preventDefault();
      const btn = $("crud-salvar");
      const textoOriginal = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Salvando...';
      }

      try {
        const d = Object.fromEntries(new FormData(form)), id = d.__id;
        delete d.__id;
        form.querySelectorAll("[data-num]").forEach((el) => (d[el.name] = Number(d[el.name])));
        await api(`/${cfg.rota}${id ? "/" + id : ""}`, id ? "PUT" : "POST", d);
        aviso(id ? "Alterações salvas com sucesso." : "Cadastrado com sucesso.");
        limpar();
        await carregar();
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = textoOriginal;
        }
      }
    }));
  }

  if ($("crud-cancelar")) {
    $("crud-cancelar").addEventListener("click", limpar);
  }

  if ($("linhas")) {
    $("linhas").addEventListener("click", tentar(async (e) => {
      const botao = e.target.closest("button[data-acao]");
      if (!botao) return;
      const r = lista[botao.dataset.i];
      if (botao.dataset.acao === "editar") {
        for (const el of form.elements) if (el.name) el.value = el.type === "password" ? "" : r[el.name] ?? "";
        form.elements.__id.value = r[cfg.id];
        if ($("crud-titulo")) $("crud-titulo").textContent = `Editar ${cfg.singular}`;
        if ($("crud-salvar")) $("crud-salvar").textContent = "Salvar alterações";
        if ($("crud-cancelar")) $("crud-cancelar").classList.remove("d-none");
        form.scrollIntoView({ behavior: "smooth" });
      } else if (botao.dataset.acao === "excluir") {
        const confirmou = await confirmarModal({
          titulo: `Excluir ${cfg.singular}`,
          mensagem: `Tem certeza que deseja excluir "${r.nome || 'este registro'}"? Essa ação não pode ser desfeita.`,
          textoConfirmar: "Excluir Registro",
          corBotao: "danger",
          icone: "trash"
        });
        if (!confirmou) return;

        await api(`/${cfg.rota}/${r[cfg.id]}`, "DELETE");
        aviso("Excluído com sucesso.");
        limpar();
        await carregar();
      }
    }));
  }

  const campoBusca = $("busca");
  if (campoBusca) {
    campoBusca.addEventListener("input", (e) => {
      const termo = e.target.value.toLowerCase().trim();
      let visiveis = 0;
      document.querySelectorAll("#linhas tr").forEach((tr) => {
        if (tr.querySelector(".estado-vazio")) return;
        const bate = tr.textContent.toLowerCase().includes(termo);
        tr.hidden = !bate;
        if (bate) visiveis++;
      });
      
      const avisoVazio = $("busca-sem-resultados");
      if (!visiveis && termo) {
        if (!avisoVazio) {
          const trVazio = document.createElement("tr");
          trVazio.id = "busca-sem-resultados";
          trVazio.innerHTML = `<td colspan="12" class="text-center text-secondary py-4">Nenhum resultado para "${esc(termo)}".</td>`;
          $("linhas").appendChild(trVazio);
        }
      } else if (avisoVazio) {
        avisoVazio.remove();
      }
    });
  }

  await carregar();
}

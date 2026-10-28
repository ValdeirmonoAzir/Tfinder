// Código compartilhado por todas as telas: API, sessão, tema, avisos, modais e proteção de acesso.
const API = location.protocol.startsWith("http") ? location.origin + "/api" : "http://127.0.0.1:5000/api";
let token = localStorage.getItem("tf_token");
let usuario = JSON.parse(localStorage.getItem("tf_usuario") || "null");
const $ = (id) => document.getElementById(id);
const ehAdmin = () => !!usuario && usuario.perfil === "Administrador";
const hojeISO = () => new Date().toLocaleDateString("sv-SE");
const fmtData = (d) => (d ? d.split("-").reverse().join("/") : "–");
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STATUS_INFO = {
  "Disponível": { bg: "success", ic: "check-circle" },
  "Confirmada": { bg: "success", ic: "calendar-check" },
  "Concluída": { bg: "primary", ic: "check2-all" },
  "Reservado": { bg: "info", ic: "bookmark-fill" },
  "Pendente": { bg: "warning", ic: "hourglass-split" },
  "Recusada": { bg: "danger", ic: "x-circle" },
  "Cancelada": { bg: "secondary", ic: "slash-circle" },
  "Em manutenção": { bg: "danger", ic: "tools" }
};

const selo = (v) => {
  const s = STATUS_INFO[v] || { bg: "secondary", ic: "tag" };
  return `<span class="badge badge-soft-${s.bg} d-inline-flex align-items-center gap-1"><i class="bi bi-${s.ic}"></i> ${esc(v)}</span>`;
};

function aviso(msg, tipo = "success") {
  const box = $("avisos");
  if (!box) return;
  const icones = {
    success: "check-circle-fill",
    danger: "exclamation-triangle-fill",
    warning: "exclamation-circle-fill",
    info: "info-circle-fill"
  };
  const el = document.createElement("div");
  el.className = `alert alert-${tipo} alert-dismissible fade show shadow d-flex align-items-center gap-2 mb-2 py-2 px-3 border-0 toast-animado`;
  el.setAttribute("role", "alert");
  el.innerHTML = `
    <i class="bi bi-${icones[tipo] || "info-circle-fill"} flex-shrink-0 fs-5"></i>
    <div class="flex-grow-1 small fw-semibold">${esc(msg)}</div>
    <button type="button" class="btn-close btn-close-sm" aria-label="Fechar"></button>
  `;
  el.querySelector(".btn-close").onclick = () => el.remove();
  box.append(el);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, 4500);
}

async function api(rota, metodo = "GET", corpo) {
  let r;
  try {
    r = await fetch(API + rota, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error("Não foi possível conectar à API. O servidor (python app.py) está rodando?");
  }
  const dados = await r.json().catch(() => ({}));
  if (r.status === 401 && token) sair();
  if (!r.ok) throw new Error(dados.erro || "Erro inesperado.");
  return dados;
}

const tentar = (fn) => async (...args) => {
  try {
    await fn(...args);
  } catch (e) {
    aviso(e.message, "danger");
  }
};

// Copia o título de cada coluna para as células (as tabelas viram cartões no celular).
function rotular(tbody) {
  if (!tbody) return;
  const tabela = tbody.closest("table");
  if (!tabela) return;
  const rotulos = [...tabela.querySelectorAll("thead th")].map((th) => th.textContent.trim());
  tbody.querySelectorAll("tr").forEach((tr) => [...tr.children].forEach((td, i) => (td.dataset.rotulo = rotulos[i] || "")));
}

function alternarTema() {
  const novo = document.documentElement.dataset.bsTheme === "dark" ? "light" : "dark";
  document.documentElement.dataset.bsTheme = novo;
  localStorage.setItem("tf_tema", novo);
  rotuloTema();
}

function rotuloTema() {
  const escuro = document.documentElement.dataset.bsTheme === "dark";
  document.querySelectorAll(".tema-flutuante, #btn-tema").forEach((b) => {
    b.innerHTML = escuro ? '<i class="bi bi-sun"></i> Modo claro' : '<i class="bi bi-moon-stars"></i> Modo escuro';
  });
}

function sair() {
  localStorage.removeItem("tf_token");
  localStorage.removeItem("tf_usuario");
  location.href = "login.html";
}

function enviarForm(idForm, rota, aoSucesso) {
  const f = $(idForm);
  if (!f) return;
  f.addEventListener("submit", tentar(async (e) => {
    e.preventDefault();
    const btn = f.querySelector("button[type=submit]");
    const textoOriginal = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Salvando...';
    }
    try {
      const res = await api(rota, "POST", Object.fromEntries(new FormData(f)));
      aoSucesso(res, f);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
      }
    }
  }));
}

async function atualizarBadge() {
  try {
    const itens = await api("/notificacoes");
    const nao = itens.filter((n) => !n.lida).length;
    const b = $("badge");
    if (b) {
      b.textContent = nao;
      b.classList.toggle("d-none", !nao);
    }
  } catch { /* sem conexão: tenta de novo no próximo ciclo */ }
}

// Configura botões de alternar visualização de senha
function configurarToggleSenhas() {
  document.querySelectorAll(".btn-toggle-senha").forEach((btn) => {
    if (btn.dataset.toggleConfigurado) return;
    btn.dataset.toggleConfigurado = "1";
    btn.addEventListener("click", () => {
      const grupo = btn.closest(".input-group");
      if (!grupo) return;
      const input = grupo.querySelector("input");
      if (!input) return;
      const ehSenha = input.type === "password";
      input.type = ehSenha ? "text" : "password";
      btn.innerHTML = `<i class="bi bi-${ehSenha ? "eye-slash" : "eye"}"></i>`;
    });
  });
}

// Modal moderno de confirmação (substitui confirm() do navegador)
function confirmarModal({ titulo = "Confirmação", mensagem = "Deseja continuar?", textoConfirmar = "Confirmar", corBotao = "danger", icone = "exclamation-triangle" }) {
  return new Promise((resolve) => {
    let modalEl = $("modal-confirmacao-dinamico");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "modal-confirmacao-dinamico";
      modalEl.className = "modal fade";
      modalEl.setAttribute("tabindex", "-1");
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg rounded-4">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="mc-titulo"></h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body py-3" id="mc-mensagem"></div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn" id="mc-botao-confirmar"></button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modalEl);
    }

    $("mc-titulo").innerHTML = `<i class="bi bi-${icone} text-${corBotao}"></i> ${esc(titulo)}`;
    $("mc-mensagem").textContent = mensagem;
    const btnConf = $("mc-botao-confirmar");
    btnConf.className = `btn btn-${corBotao}`;
    btnConf.textContent = textoConfirmar;

    const bsModal = new bootstrap.Modal(modalEl);
    let confirmado = false;

    const aoConfirmar = () => {
      confirmado = true;
      bsModal.hide();
    };

    btnConf.onclick = aoConfirmar;
    modalEl.addEventListener("hidden.bs.modal", () => {
      btnConf.onclick = null;
      resolve(confirmado);
    }, { once: true });

    bsModal.show();
  });
}

// Modal moderno de entrada de texto (substitui prompt() do navegador)
function promptModal({ titulo = "Informação", mensagem = "", placeholder = "", valorInicial = "", textoConfirmar = "Confirmar" }) {
  return new Promise((resolve) => {
    let modalEl = $("modal-prompt-dinamico");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "modal-prompt-dinamico";
      modalEl.className = "modal fade";
      modalEl.setAttribute("tabindex", "-1");
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg rounded-4">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title fw-bold" id="mp-titulo"></h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body py-3">
              <p class="text-secondary mb-2" id="mp-mensagem"></p>
              <textarea class="form-control" id="mp-input" rows="3"></textarea>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="mp-botao-confirmar">${esc(textoConfirmar)}</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modalEl);
    }

    $("mp-titulo").textContent = titulo;
    $("mp-mensagem").textContent = mensagem;
    const input = $("mp-input");
    input.placeholder = placeholder;
    input.value = valorInicial;

    const bsModal = new bootstrap.Modal(modalEl);
    let valorFinal = null;

    const aoConfirmar = () => {
      valorFinal = input.value;
      bsModal.hide();
    };

    $("mp-botao-confirmar").onclick = aoConfirmar;
    modalEl.addEventListener("hidden.bs.modal", () => {
      $("mp-botao-confirmar").onclick = null;
      resolve(valorFinal);
    }, { once: true });

    bsModal.show();
    setTimeout(() => input.focus(), 300);
  });
}

// Modal Meu Perfil
function injetarModalPerfil() {
  if ($("modal-perfil")) return;
  const div = document.createElement("div");
  div.id = "modal-perfil";
  div.className = "modal fade";
  div.setAttribute("tabindex", "-1");
  div.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg rounded-4">
        <div class="modal-header border-bottom">
          <h5 class="modal-title fw-bold"><i class="bi bi-person-circle text-primary me-2"></i> Meu Perfil</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
        </div>
        <form id="f-perfil-modal">
          <div class="modal-body">
            <div class="p-3 mb-3 rounded-3 bg-body-tertiary border">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="small text-secondary fw-semibold">MATRÍCULA</span>
                <span class="badge bg-primary" id="perfil-tag-role"></span>
              </div>
              <div class="fw-bold" id="perfil-matricula">–</div>
              <div class="small text-secondary mt-2">E-mail: <span id="perfil-email" class="text-body fw-semibold"></span></div>
            </div>
            <div class="mb-3">
              <label class="form-label">Nome Completo</label>
              <input class="form-control" name="nome" id="perfil-nome" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Telefone</label>
              <input class="form-control" name="telefone" id="perfil-telefone" placeholder="(00) 00000-0000">
            </div>
            <hr class="my-3 text-secondary opacity-25">
            <h6 class="fw-bold mb-2 small text-uppercase text-secondary">Alterar Senha (opcional)</h6>
            <div class="mb-2">
              <label class="form-label">Senha Atual</label>
              <div class="input-group">
                <input class="form-control" type="password" name="senha_atual" id="perfil-senha-atual" placeholder="Necessária para trocar a senha">
                <button class="btn btn-outline-secondary btn-toggle-senha" type="button"><i class="bi bi-eye"></i></button>
              </div>
            </div>
            <div class="mb-2">
              <label class="form-label">Nova Senha</label>
              <div class="input-group">
                <input class="form-control" type="password" name="nova_senha" id="perfil-nova-senha" placeholder="Mínimo 6 caracteres">
                <button class="btn btn-outline-secondary btn-toggle-senha" type="button"><i class="bi bi-eye"></i></button>
              </div>
            </div>
          </div>
          <div class="modal-footer border-top">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-success" id="btn-salvar-perfil">Salvar Alterações</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.appendChild(div);
  configurarToggleSenhas();

  const form = $("f-perfil-modal");
  form.addEventListener("submit", tentar(async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const btn = $("btn-salvar-perfil");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Salvando...';
    try {
      const res = await api("/me", "PUT", d);
      usuario.nome = res.usuario.nome;
      localStorage.setItem("tf_usuario", JSON.stringify(usuario));
      renderizarNavbarUsuario();
      const elNome = $("nome");
      if (elNome) elNome.textContent = usuario.nome;
      aviso("Perfil atualizado com sucesso!");
      bootstrap.Modal.getInstance(div).hide();
      form.reset();
    } finally {
      btn.disabled = false;
      btn.innerHTML = "Salvar Alterações";
    }
  }));
}

function abrirModalPerfil() {
  injetarModalPerfil();
  $("perfil-nome").value = usuario.nome || "";
  $("perfil-tag-role").textContent = usuario.perfil || "";
  api("/me").then((u) => {
    $("perfil-matricula").textContent = u.matricula || "–";
    $("perfil-email").textContent = u.email || "–";
    $("perfil-telefone").value = u.telefone || "";
  }).catch(() => {});
  new bootstrap.Modal($("modal-perfil")).show();
}

function renderizarNavbarUsuario() {
  const quem = $("quem");
  if (!quem) return;
  quem.innerHTML = `
    <button class="btn-usuario-perfil" type="button" onclick="abrirModalPerfil()" title="Clique para ver ou editar seu perfil">
      <i class="bi bi-person-circle fs-6"></i>
      <span>${esc(usuario.nome)}</span>
      <span class="tag-perfil">${esc(usuario.perfil)}</span>
    </button>
  `;
}

/* ---- Proteção de acesso e inicialização de tela ---- */
const pagina = document.body.dataset;
let liberado = true;

if (pagina.publica) {
  if (token && usuario) {
    liberado = false;
    location.replace("dashboard.html");
  }
} else if (!token || !usuario) {
  liberado = false;
  location.replace("login.html");
} else if (pagina.admin && !ehAdmin()) {
  liberado = false;
  location.replace("dashboard.html");
} else {
  document.body.classList.toggle("nao-admin", !ehAdmin());
  renderizarNavbarUsuario();
  atualizarBadge();
  setInterval(atualizarBadge, 30000);
}

rotuloTema();
document.addEventListener("DOMContentLoaded", configurarToggleSenhas);

function pronto(fn) {
  if (liberado) {
    document.addEventListener("DOMContentLoaded", () => {
      configurarToggleSenhas();
      tentar(fn)();
    });
  }
}

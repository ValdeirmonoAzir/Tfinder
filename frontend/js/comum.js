// Código compartilhado por todas as telas: API, sessão, tema, avisos e proteção de acesso.
// Aberto pelo servidor (computador ou celular) usa o mesmo endereço; aberto direto do arquivo usa o computador local.
const API = location.protocol.startsWith("http") ? location.origin + "/api" : "http://127.0.0.1:5000/api";
let token = localStorage.getItem("tf_token");
let usuario = JSON.parse(localStorage.getItem("tf_usuario") || "null");
const $ = (id) => document.getElementById(id);
const ehAdmin = () => !!usuario && usuario.perfil === "Administrador";
const hojeISO = () => new Date().toLocaleDateString("sv-SE");
const fmtData = (d) => d.split("-").reverse().join("/");
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CORES = { "Disponível": "success", "Confirmada": "success", "Reservado": "primary", "Concluída": "primary",
                "Pendente": "warning", "Recusada": "danger", "Cancelada": "secondary", "Em manutenção": "secondary" };
const selo = (v) => `<span class="badge bg-${CORES[v] || "secondary"}">${esc(v)}</span>`;

function aviso(msg, tipo = "success") {
  const el = document.createElement("div");
  el.className = `alert alert-${tipo} shadow-sm`;
  el.textContent = msg;
  $("avisos").append(el);
  setTimeout(() => el.remove(), 4500);
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

const tentar = (fn) => async (...args) => { try { await fn(...args); } catch (e) { aviso(e.message, "danger"); } };

// Copia o título de cada coluna para as células (as tabelas viram cartões no celular).
function rotular(tbody) {
  const rotulos = [...tbody.closest("table").querySelectorAll("thead th")].map((th) => th.textContent.trim());
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
  document.querySelectorAll(".tema-flutuante, #btn-tema").forEach((b) => (b.textContent = escuro ? "Modo claro" : "Modo escuro"));
}

function sair() {
  localStorage.removeItem("tf_token");
  localStorage.removeItem("tf_usuario");
  location.href = "login.html";
}

// Envia um formulário (por id) para a API e chama aoSucesso com a resposta.
function enviarForm(idForm, rota, aoSucesso) {
  $(idForm).addEventListener("submit", tentar(async (e) => {
    e.preventDefault();
    aoSucesso(await api(rota, "POST", Object.fromEntries(new FormData(e.target))), e.target);
  }));
}

async function atualizarBadge() {
  try {
    const nao = (await api("/notificacoes")).filter((n) => !n.lida).length, b = $("badge");
    if (b) { b.textContent = nao; b.classList.toggle("d-none", !nao); }
  } catch { /* sem conexão: tenta de novo no próximo ciclo */ }
}

/* ---- proteção de acesso (roda em toda tela) ---- */
const pagina = document.body.dataset;
let liberado = true;
if (pagina.publica) {                       // login, cadastro e "esqueci a senha"
  if (token && usuario) { liberado = false; location.replace("dashboard.html"); }
} else if (!token || !usuario) {            // telas do sistema exigem login
  liberado = false; location.replace("login.html");
} else if (pagina.admin && !ehAdmin()) {    // telas só do administrador
  liberado = false; location.replace("dashboard.html");
} else {
  document.body.classList.toggle("nao-admin", !ehAdmin());
  $("quem").textContent = `${usuario.nome} · ${usuario.perfil}`;
  atualizarBadge();
  setInterval(atualizarBadge, 30000);
}
rotuloTema();

// Cada tela chama pronto(...) para só rodar se o acesso foi liberado.
function pronto(fn) { if (liberado) tentar(fn)(); }

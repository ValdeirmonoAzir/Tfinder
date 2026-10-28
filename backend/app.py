import os
import re
import socket
import sqlite3
from datetime import date
from functools import wraps

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from itsdangerous import URLSafeTimedSerializer, BadSignature
from werkzeug.security import check_password_hash, generate_password_hash

from database import iniciar_banco, consultar, executar
from models.entidades import perfil, usuario, turma, local, recurso, reserva, notificacao

PASTA_FRONTEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
app = Flask(__name__, static_folder=PASTA_FRONTEND, static_url_path="")  # também serve as telas (acesso pelo celular)
CORS(app)  # permite o frontend (aberto direto no navegador) chamar esta API
SEGREDO = os.environ.get("TFINDER_SECRET")
if not SEGREDO:
    if os.environ.get("RENDER"):  # variável criada automaticamente pelo Render
        raise RuntimeError("Defina a variável de ambiente TFINDER_SECRET no Render.")
    SEGREDO = "chave-de-desenvolvimento"
assinador = URLSafeTimedSerializer(SEGREDO)
iniciar_banco()


EMAIL_RE = re.compile(r"^[A-Za-z0-9]+([._%+-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*\.[A-Za-z]{2,}$")


def email_valido(email):
    return len(email) <= 120 and bool(EMAIL_RE.match(email))


def erro(mensagem, codigo=400):
    return jsonify({"erro": mensagem}), codigo


def dados_json():
    return request.get_json(silent=True) or {}


def auth(admin=False):
    """Exige token válido (e perfil Administrador, se admin=True)."""
    def decorador(rota):
        @wraps(rota)
        def protegida(*args, **kwargs):
            token = request.headers.get("Authorization", "").removeprefix("Bearer ")
            try:
                id_usuario = assinador.loads(token, max_age=8 * 3600)["id"]
            except BadSignature:
                return erro("Sessão expirada. Entre novamente.", 401)
            u = usuario.buscar(id_usuario)
            if not u or not u["ativo"]:
                return erro("Usuário inativo ou removido.", 401)
            if admin and u["perfil"] != "Administrador":
                return erro("Acesso restrito ao administrador.", 403)
            g.usuario = u
            return rota(*args, **kwargs)
        return protegida
    return decorador


def publico(u):
    return {"id": u["id_usuario"], "nome": u["nome"], "perfil": u["perfil"]}


def eh_admin():
    return g.usuario["perfil"] == "Administrador"


# ---------------- acesso ----------------
@app.post("/api/login")
def login():
    d = dados_json()
    u = usuario.por_email(str(d.get("email") or "").strip().lower())
    if not u or not u["ativo"] or not check_password_hash(u["senha"], str(d.get("senha") or "")):
        return erro("E-mail ou senha incorretos.", 401)
    return {"token": assinador.dumps({"id": u["id_usuario"]}), "usuario": publico(u)}


@app.post("/api/cadastro")
def cadastro():
    d = dados_json()
    ids = {p["nome"]: p["id_perfil"] for p in perfil.listar()}
    if d.get("tipo") not in ("Aluno", "Professor"):
        return erro("Escolha entre Aluno e Professor.")
    d["id_perfil"] = ids[d["tipo"]]
    if str(d.get("email") or "").strip().lower() != str(d.get("email2") or "").strip().lower():
        return erro("Os e-mails informados não conferem.")
    return salvar_usuario(d, None)


@app.post("/api/esqueci-senha")
def esqueci_senha():
    d = dados_json()
    u = usuario.por_email(str(d.get("email") or "").strip().lower())
    nova = str(d.get("nova_senha") or "")
    if len(nova) < 6:
        return erro("A nova senha deve ter pelo menos 6 caracteres.")
    if not u or u["matricula"] != str(d.get("matricula") or "").strip():
        return erro("E-mail e matrícula não conferem.")
    usuario.atualizar(u["id_usuario"], {"senha": generate_password_hash(nova)})
    return {"mensagem": "Senha redefinida. Já pode entrar."}


@app.get("/api/me")
@auth()
def me():
    return publico(g.usuario)


# ---------------- usuários ----------------
def salvar_usuario(d, id_usuario):
    """Cria (id_usuario=None) ou atualiza um usuário, com validação e senha criptografada."""
    d = {**d, "email": str(d.get("email") or "").strip().lower()}
    limpo, msg = usuario.validar(d)
    if msg:
        return erro(msg)
    if not email_valido(d["email"]):
        return erro("Informe um e-mail válido (ex.: nome@dominio.com).")
    limpo.pop("senha", None)
    senha = str(d.get("senha") or "")
    if senha or not id_usuario:  # na edição, senha em branco mantém a atual
        if len(senha) < 6:
            return erro("A senha deve ter pelo menos 6 caracteres.")
        limpo["senha"] = generate_password_hash(senha)
    try:
        if id_usuario:
            usuario.atualizar(id_usuario, limpo)
            return usuario.buscar(id_usuario)
        novo = usuario.criar(limpo)
    except sqlite3.IntegrityError:
        return erro("E-mail ou matrícula já cadastrado.", 409)
    return jsonify(usuario.buscar(novo)), 201


@app.get("/api/perfis")
@auth()
def listar_perfis():
    return jsonify(perfil.listar())


@app.get("/api/usuarios")
@auth(admin=True)
def listar_usuarios():
    return jsonify(usuario.listar())


@app.post("/api/usuarios")
@auth(admin=True)
def criar_usuario():
    return salvar_usuario(dados_json(), None)


@app.put("/api/usuarios/<int:id>")
@auth(admin=True)
def editar_usuario(id):
    if not usuario.buscar(id):
        return erro("Usuário não encontrado.", 404)
    d = dados_json()
    if id == g.usuario["id_usuario"] and str(d.get("ativo")) == "0":
        return erro("Você não pode inativar a própria conta.")
    return salvar_usuario(d, id)


@app.delete("/api/usuarios/<int:id>")
@auth(admin=True)
def excluir_usuario(id):
    return excluir_registro(usuario, id, proprio=id == g.usuario["id_usuario"])


# ---------------- recursos, locais e turmas ----------------
def excluir_registro(modelo, id, proprio=False):
    if proprio:
        return erro("Você não pode excluir a própria conta.")
    if not modelo.buscar(id):
        return erro("Registro não encontrado.", 404)
    try:
        modelo.excluir(id)
    except sqlite3.IntegrityError:
        return erro("Registro em uso (há vínculos) e não pode ser excluído. Tente inativá-lo.", 409)
    return {"mensagem": "Excluído com sucesso."}


def registrar(rota, modelo, extra=None):
    def listar():
        return jsonify(modelo.listar())

    def criar():
        limpo, msg = modelo.validar(dados_json())
        if msg:
            return erro(msg)
        try:
            novo = modelo.criar(limpo)
        except sqlite3.IntegrityError:
            return erro("Já existe um registro com esse nome/patrimônio.", 409)
        return jsonify(modelo.buscar(novo)), 201

    def editar(id):
        if not modelo.buscar(id):
            return erro("Registro não encontrado.", 404)
        limpo, msg = modelo.validar(dados_json())
        msg = msg or (extra(id, limpo) if extra else None)
        if msg:
            return erro(msg)
        try:
            modelo.atualizar(id, limpo)
        except sqlite3.IntegrityError:
            return erro("Já existe um registro com esse nome/patrimônio.", 409)
        return jsonify(modelo.buscar(id))

    def excluir(id):
        return excluir_registro(modelo, id)

    app.add_url_rule(f"/api/{rota}", f"{rota}_listar", auth()(listar))
    app.add_url_rule(f"/api/{rota}", f"{rota}_criar", auth(True)(criar), methods=["POST"])
    app.add_url_rule(f"/api/{rota}/<int:id>", f"{rota}_editar", auth(True)(editar), methods=["PUT"])
    app.add_url_rule(f"/api/{rota}/<int:id>", f"{rota}_excluir", auth(True)(excluir), methods=["DELETE"])


def local_valido(id, dados):
    if str(dados.get("id_local_pai") or "") == str(id):
        return "Um local não pode estar dentro dele mesmo."


registrar("recursos", recurso)
registrar("locais", local, local_valido)
registrar("turmas", turma)


@app.get("/api/locais/<int:id>/detalhe")
@auth()
def detalhe_local(id):
    """Abre um local: seus locais internos (ex.: laboratórios da Coordenação) e seus equipamentos."""
    l = local.buscar(id)
    if not l:
        return erro("Local não encontrado.", 404)
    return jsonify({"local": l,
                    "sublocais": local.listar("WHERE t.id_local_pai = ?", (id,)),
                    "recursos": recurso.listar("WHERE t.id_local = ?", (id,))})


# ---------------- reservas ----------------
def checar_reserva(d, ignorar=None):
    r = recurso.buscar(d.get("id_recurso"))
    data, inicio, fim = d["data_reserva"], d["hora_inicio"], d["hora_fim"]
    if r is None:
        return "Recurso não encontrado."
    if data < date.today().isoformat():
        return "Não é possível reservar em data passada."
    if inicio >= fim:
        return "O horário de término deve ser depois do início."
    if r["status"] == "Em manutenção":
        return "Este recurso está em manutenção."
    if g.usuario["perfil"] == "Aluno" and r["tipo"] != "Computador":
        return "Alunos podem reservar apenas computadores."
    if reserva.conflito(r["id_recurso"], data, inicio, fim, ignorar):
        return "Recurso indisponível: já existe reserva nesse horário."
    return None


@app.get("/api/reservas")
@auth()
def listar_reservas():
    if eh_admin():
        return jsonify(reserva.listar())
    return jsonify(reserva.listar("WHERE t.id_usuario = ?", (g.usuario["id_usuario"],)))


def descricao(r):
    ano, mes, dia = r["data_reserva"].split("-")
    return f"{r['recurso']} em {dia}/{mes}/{ano}, das {r['hora_inicio']} às {r['hora_fim']}"


def notificar(id_usuario, mensagem, id_reserva=None):
    notificacao.criar({"id_usuario": id_usuario, "mensagem": mensagem, "id_reserva": id_reserva})


def notificar_admins(mensagem, id_reserva=None):
    for adm in usuario.listar("WHERE p.nome = 'Administrador' AND t.ativo = 1"):
        notificar(adm["id_usuario"], mensagem, id_reserva)


@app.post("/api/reservas")
@auth()
def criar_reserva():
    limpo, msg = reserva.validar(dados_json())
    msg = msg or checar_reserva(limpo)
    if msg:
        return erro(msg, 409 if "indisponível" in msg else 400)
    limpo.pop("motivo_recusa", None)
    # administrador reserva direto; os demais perfis dependem de aprovação
    limpo.update(id_usuario=g.usuario["id_usuario"], status="Confirmada" if eh_admin() else "Pendente")
    nova = reserva.buscar(reserva.criar(limpo))
    if nova["status"] == "Pendente":
        notificar_admins(f"Nova solicitação de {g.usuario['nome']}: {descricao(nova)}.", nova["id_reserva"])
    return jsonify(nova), 201


def reserva_do_usuario(id):
    r = reserva.buscar(id)
    return r if r and (eh_admin() or r["id_usuario"] == g.usuario["id_usuario"]) else None


@app.put("/api/reservas/<int:id>")
@auth()
def editar_reserva(id):
    atual = reserva_do_usuario(id)
    if not atual:
        return erro("Reserva não encontrada.", 404)
    if atual["status"] not in ("Pendente", "Confirmada"):
        return erro("Só é possível editar reservas pendentes ou confirmadas.")
    limpo, msg = reserva.validar(dados_json())
    msg = msg or checar_reserva(limpo, ignorar=id)
    if msg:
        return erro(msg, 409 if "indisponível" in msg else 400)
    for campo in ("status", "id_usuario", "motivo_recusa"):
        limpo.pop(campo, None)
    if not eh_admin():  # alteração feita por não-admin volta para aprovação
        limpo["status"] = "Pendente"
    reserva.atualizar(id, limpo)
    nova = reserva.buscar(id)
    if not eh_admin():
        notificar_admins(f"{g.usuario['nome']} alterou a solicitação: {descricao(nova)}.", id)
    return jsonify(nova)


@app.post("/api/reservas/<int:id>/cancelar")
@auth()
def cancelar_reserva(id):
    r = reserva_do_usuario(id)
    if not r:
        return erro("Reserva não encontrada.", 404)
    if r["status"] not in ("Pendente", "Confirmada"):
        return erro("Esta reserva já foi encerrada.")
    reserva.atualizar(id, {"status": "Cancelada"})
    if r["id_usuario"] != g.usuario["id_usuario"]:
        notificar(r["id_usuario"], f"Sua reserva de {descricao(r)} foi cancelada pelo administrador.", id)
    return {"mensagem": "Reserva cancelada."}


@app.post("/api/reservas/<int:id>/aprovar")
@auth(admin=True)
def aprovar_reserva(id):
    r = reserva.buscar(id)
    if not r:
        return erro("Reserva não encontrada.", 404)
    if r["status"] != "Pendente":
        return erro("Só é possível aprovar reservas pendentes.")
    if reserva.conflito(r["id_recurso"], r["data_reserva"], r["hora_inicio"], r["hora_fim"], id):
        return erro("Recurso indisponível: já existe reserva confirmada nesse horário. Recuse esta solicitação.", 409)
    reserva.atualizar(id, {"status": "Confirmada", "motivo_recusa": None})
    notificar(r["id_usuario"], f"Sua reserva de {descricao(r)} foi aprovada.", id)
    return {"mensagem": "Reserva aprovada."}


@app.post("/api/reservas/<int:id>/recusar")
@auth(admin=True)
def recusar_reserva(id):
    r = reserva.buscar(id)
    if not r:
        return erro("Reserva não encontrada.", 404)
    if r["status"] != "Pendente":
        return erro("Só é possível recusar reservas pendentes.")
    motivo = str(dados_json().get("motivo") or "").strip() or None
    reserva.atualizar(id, {"status": "Recusada", "motivo_recusa": motivo})
    texto = f"Sua reserva de {descricao(r)} foi recusada."
    notificar(r["id_usuario"], texto + (f" Motivo: {motivo}" if motivo else ""), id)
    return {"mensagem": "Reserva recusada."}


# ---------------- notificações ----------------
@app.get("/api/notificacoes")
@auth()
def listar_notificacoes():
    return jsonify(notificacao.listar("WHERE t.id_usuario = ?", (g.usuario["id_usuario"],))[:30])


@app.post("/api/notificacoes/ler-todas")
@auth()
def ler_todas():
    executar("UPDATE notificacao SET lida = 1 WHERE id_usuario = ?", (g.usuario["id_usuario"],))
    return {"mensagem": "Notificações marcadas como lidas."}


# ---------------- relatórios ----------------
@app.get("/api/relatorios")
@auth(admin=True)
def relatorios():
    periodo = (request.args.get("inicio") or "0000-01-01", request.args.get("fim") or "9999-12-31")
    horas = "ROUND(SUM((julianday('2000-01-01 ' || t.hora_fim) - julianday('2000-01-01 ' || t.hora_inicio)) * 24), 1)"
    usadas = "t.data_reserva BETWEEN ? AND ? AND t.status IN ('Confirmada', 'Concluída')"
    return jsonify({
        "resumo": consultar("SELECT t.status AS status, COUNT(*) AS total FROM reserva t "
                            "WHERE t.data_reserva BETWEEN ? AND ? GROUP BY t.status", periodo),
        "por_recurso": consultar(
            f"""SELECT r.nome AS nome, r.tipo AS detalhe, COUNT(*) AS reservas, {horas} AS horas
                FROM reserva t JOIN recurso r ON r.id_recurso = t.id_recurso
                WHERE {usadas} GROUP BY r.id_recurso ORDER BY reservas DESC""", periodo),
        "por_usuario": consultar(
            f"""SELECT u.nome AS nome, p.nome AS detalhe, COUNT(*) AS reservas, {horas} AS horas
                FROM reserva t JOIN usuario u ON u.id_usuario = t.id_usuario
                JOIN perfil p ON p.id_perfil = u.id_perfil
                WHERE {usadas} GROUP BY u.id_usuario ORDER BY reservas DESC""", periodo),
    })


@app.get("/api/disponibilidade")
@auth()
def disponibilidade():
    ocupadas = reserva.ocupadas(request.args.get("id_recurso"), request.args.get("data", ""))
    return jsonify([{"hora_inicio": o["hora_inicio"], "hora_fim": o["hora_fim"],
                     "usuario": o["usuario"]} for o in ocupadas])


@app.get("/saude")
def saude():
    return "ok"  # usado pelo Render para saber se o site está no ar


@app.get("/")
def inicio():
    return app.send_static_file("login.html")


def ip_local():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  # não envia nada; só descobre o IP da rede
        return s.getsockname()[0]
    except OSError:
        return "SEU-IP"
    finally:
        s.close()


if __name__ == "__main__":
    print(f"\n TFinder neste computador: http://127.0.0.1:5000"
          f"\n TFinder no celular (mesmo Wi-Fi): http://{ip_local()}:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=os.environ.get("TFINDER_DEBUG") == "1")

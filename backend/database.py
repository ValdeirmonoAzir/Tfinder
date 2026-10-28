import os
import sqlite3
from werkzeug.security import generate_password_hash

# No Render com disco persistente, aponte TFINDER_DB para o disco (ex.: /var/data/tfinder.db)
CAMINHO_BANCO = os.environ.get("TFINDER_DB") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "tfinder_dados.db")
os.makedirs(os.path.dirname(CAMINHO_BANCO), exist_ok=True)


def conectar():
    conexao = sqlite3.connect(CAMINHO_BANCO, timeout=15.0)
    conexao.row_factory = sqlite3.Row
    conexao.execute("PRAGMA foreign_keys = ON")
    try:
        conexao.execute("PRAGMA journal_mode = WAL")
        conexao.execute("PRAGMA synchronous = NORMAL")
    except sqlite3.DatabaseError:
        pass
    return conexao


def consultar(sql, params=()):
    conexao = conectar()
    linhas = conexao.execute(sql, params).fetchall()
    conexao.close()
    return [dict(linha) for linha in linhas]


def executar(sql, params=()):
    conexao = conectar()
    try:
        cursor = conexao.execute(sql, params)
        conexao.commit()
        return cursor.lastrowid
    finally:
        conexao.close()


TABELAS = """
CREATE TABLE IF NOT EXISTS perfil(
    id_perfil INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT);
CREATE TABLE IF NOT EXISTS usuario(
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    matricula TEXT NOT NULL UNIQUE,
    telefone TEXT,
    ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    id_perfil INTEGER NOT NULL REFERENCES perfil(id_perfil));
CREATE TABLE IF NOT EXISTS turma(
    id_turma INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    turno TEXT,
    ano_letivo INTEGER);
CREATE TABLE IF NOT EXISTS local(
    id_local INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL DEFAULT 'Sala'
        CHECK (tipo IN ('Coordenação', 'Laboratório móvel', 'Sala', 'Outro')),
    bloco TEXT,
    capacidade INTEGER,
    id_local_pai INTEGER REFERENCES local(id_local));
CREATE TABLE IF NOT EXISTS recurso(
    id_recurso INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('Computador', 'Televisor')),
    patrimonio TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'Disponível'
        CHECK (status IN ('Disponível', 'Reservado', 'Em manutenção')),
    descricao TEXT,
    id_local INTEGER REFERENCES local(id_local));
CREATE TABLE IF NOT EXISTS reserva(
    id_reserva INTEGER PRIMARY KEY AUTOINCREMENT,
    data_reserva TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    finalidade TEXT,
    status TEXT NOT NULL DEFAULT 'Confirmada'
        CHECK (status IN ('Pendente', 'Confirmada', 'Recusada', 'Cancelada', 'Concluída')),
    data_solicitacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
    id_recurso INTEGER NOT NULL REFERENCES recurso(id_recurso),
    id_turma INTEGER REFERENCES turma(id_turma),
    motivo_recusa TEXT);
CREATE TABLE IF NOT EXISTS notificacao(
    id_notificacao INTEGER PRIMARY KEY AUTOINCREMENT,
    mensagem TEXT NOT NULL,
    lida INTEGER NOT NULL DEFAULT 0 CHECK (lida IN (0, 1)),
    data_criacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
    id_reserva INTEGER REFERENCES reserva(id_reserva) ON DELETE SET NULL);
"""


def iniciar_banco():
    conexao = conectar()
    colunas_local = {c[1] for c in conexao.execute("PRAGMA table_info(local)")}
    if colunas_local and "id_local_pai" not in colunas_local:  # banco da versão anterior
        conexao.execute("ALTER TABLE local ADD COLUMN tipo TEXT NOT NULL DEFAULT 'Sala'")
        conexao.execute("ALTER TABLE local ADD COLUMN id_local_pai INTEGER REFERENCES local(id_local)")
        conexao.commit()
    antiga = conexao.execute("SELECT sql FROM sqlite_master WHERE name = 'reserva'").fetchone()
    migrar = antiga is not None and "Recusada" not in antiga[0]  # banco da versão anterior
    if migrar:
        conexao.execute("ALTER TABLE reserva RENAME TO reserva_antiga")
    conexao.executescript(TABELAS)
    if migrar:
        colunas = ("id_reserva, data_reserva, hora_inicio, hora_fim, finalidade, status, "
                   "data_solicitacao, id_usuario, id_recurso, id_turma")
        conexao.execute(f"INSERT INTO reserva ({colunas}) SELECT {colunas} FROM reserva_antiga")
        conexao.execute("DROP TABLE reserva_antiga")
        conexao.commit()
    if conexao.execute("SELECT COUNT(*) FROM perfil").fetchone()[0] == 0:
        conexao.executemany("INSERT INTO perfil (nome, descricao) VALUES (?, ?)", [
            ("Administrador", "Gerencia usuários, recursos e reservas."),
            ("Professor", "Reserva TVs, laboratórios e computadores."),
            ("Aluno", "Reserva computadores para atividades escolares.")])
        conexao.executemany(
            "INSERT INTO usuario (nome, email, senha, matricula, id_perfil) VALUES (?, ?, ?, ?, ?)",
            [(n, e, generate_password_hash(s), m, p) for n, e, s, m, p in [
                ("Administrador", "admin@tfinder.com", os.environ.get("TFINDER_ADMIN_SENHA") or "admin123", "ADM001", 1),
                ("Professor Demo", "professor@tfinder.com", "prof123", "PRO001", 2),
                ("Aluno Demo", "aluno@tfinder.com", "aluno123", "ALU001", 3)]])
        # Coordenação guarda as TVs e os laboratórios móveis; cada laboratório móvel guarda seus computadores
        conexao.executemany(
            "INSERT INTO local (nome, tipo, bloco, capacidade, id_local_pai) VALUES (?, ?, ?, ?, ?)", [
                ("Coordenação", "Coordenação", "Bloco A", None, None),
                ("Laboratório de Informática Móvel 1", "Laboratório móvel", "Bloco A", 30, 1),
                ("Laboratório de Informática Móvel 2", "Laboratório móvel", "Bloco A", 30, 1),
                ("Sala 101", "Sala", "Bloco B", 40, None)])
        conexao.executemany("INSERT INTO turma (nome, turno, ano_letivo) VALUES (?, ?, ?)", [
            ("3º ano A", "Manhã", 2026), ("2º ano B", "Tarde", 2026)])
        conexao.executemany(
            "INSERT INTO recurso (nome, tipo, patrimonio, id_local) VALUES (?, ?, ?, ?)", [
                ("Computador 01", "Computador", "PAT-0001", 2), ("Computador 02", "Computador", "PAT-0002", 2),
                ("Computador 03", "Computador", "PAT-0003", 2), ("Computador 04", "Computador", "PAT-0004", 3),
                ("Computador 05", "Computador", "PAT-0005", 3), ("TV 01", "Televisor", "PAT-0006", 1),
                ("TV 02", "Televisor", "PAT-0007", 1)])
    INDICES = """
    CREATE INDEX IF NOT EXISTS idx_reserva_conflito ON reserva(id_recurso, data_reserva, status, hora_inicio, hora_fim);
    CREATE INDEX IF NOT EXISTS idx_reserva_usuario ON reserva(id_usuario, status);
    CREATE INDEX IF NOT EXISTS idx_notificacao_usr ON notificacao(id_usuario, lida);
    CREATE INDEX IF NOT EXISTS idx_recurso_local ON recurso(id_local);
    CREATE INDEX IF NOT EXISTS idx_local_pai ON local(id_local_pai);
    """
    conexao.executescript(INDICES)
    conexao.commit()
    conexao.close()

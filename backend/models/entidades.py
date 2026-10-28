from database import consultar
from models.base import Modelo

perfil = Modelo("perfil", "id_perfil", ["nome", "descricao"], obrigatorios=["nome"])
turma = Modelo("turma", "id_turma", ["nome", "turno", "ano_letivo"],
               obrigatorios=["nome"], ordem="t.nome")
local = Modelo(
    "local", "id_local", ["nome", "tipo", "bloco", "capacidade", "id_local_pai"],
    obrigatorios=["nome", "tipo"],
    dominios={"tipo": ["Coordenação", "Laboratório móvel", "Sala", "Outro"]},
    select="""SELECT t.*, p.nome AS pai,
                     (SELECT COUNT(*) FROM recurso r WHERE r.id_local = t.id_local) AS n_recursos,
                     (SELECT COUNT(*) FROM local s WHERE s.id_local_pai = t.id_local) AS n_sublocais
              FROM local t LEFT JOIN local p ON p.id_local = t.id_local_pai""",
    ordem="t.nome")

recurso = Modelo(
    "recurso", "id_recurso",
    ["nome", "tipo", "patrimonio", "status", "descricao", "id_local"],
    obrigatorios=["nome", "tipo"],
    dominios={"tipo": ["Computador", "Televisor"],
              "status": ["Disponível", "Reservado", "Em manutenção"]},
    select="SELECT t.*, l.nome AS local FROM recurso t LEFT JOIN local l ON l.id_local = t.id_local",
    ordem="t.nome")


class ModeloUsuario(Modelo):
    def por_email(self, email):
        """Única consulta que traz a senha (hash), usada só no login e na redefinição."""
        linhas = consultar(
            """SELECT t.*, p.nome AS perfil FROM usuario t
               JOIN perfil p ON p.id_perfil = t.id_perfil WHERE t.email = ?""", (email,))
        return linhas[0] if linhas else None


usuario = ModeloUsuario(
    "usuario", "id_usuario",
    ["nome", "email", "senha", "matricula", "telefone", "ativo", "id_perfil"],
    obrigatorios=["nome", "email", "matricula", "id_perfil"],
    dominios={"ativo": [0, 1]},
    select="""SELECT t.id_usuario, t.nome, t.email, t.matricula, t.telefone, t.ativo,
                     t.id_perfil, p.nome AS perfil
              FROM usuario t JOIN perfil p ON p.id_perfil = t.id_perfil""",
    ordem="t.nome")


class ModeloReserva(Modelo):
    def conflito(self, id_recurso, data, inicio, fim, ignorar=None):
        """Há reserva confirmada do mesmo recurso com horário sobreposto?"""
        return bool(consultar(
            """SELECT 1 FROM reserva WHERE id_recurso = ? AND data_reserva = ?
               AND status = 'Confirmada' AND hora_inicio < ? AND hora_fim > ?
               AND id_reserva != ?""",
            (id_recurso, data, fim, inicio, ignorar or 0)))

    def ocupadas(self, id_recurso, data):
        return self.listar("WHERE t.id_recurso = ? AND t.data_reserva = ? AND t.status = 'Confirmada'",
                           (id_recurso, data))


reserva = ModeloReserva(
    "reserva", "id_reserva",
    ["data_reserva", "hora_inicio", "hora_fim", "finalidade", "status",
     "id_usuario", "id_recurso", "id_turma", "motivo_recusa"],
    obrigatorios=["data_reserva", "hora_inicio", "hora_fim", "id_recurso"],
    select="""SELECT t.*, r.nome AS recurso, r.tipo, u.nome AS usuario, tu.nome AS turma
              FROM reserva t JOIN recurso r ON r.id_recurso = t.id_recurso
              JOIN usuario u ON u.id_usuario = t.id_usuario
              LEFT JOIN turma tu ON tu.id_turma = t.id_turma""",
    ordem="t.data_reserva DESC, t.hora_inicio")

notificacao = Modelo("notificacao", "id_notificacao",
                     ["mensagem", "lida", "id_usuario", "id_reserva"],
                     obrigatorios=["mensagem", "id_usuario"], ordem="t.id_notificacao DESC")

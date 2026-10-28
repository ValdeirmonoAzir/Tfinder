from database import consultar, executar


class Modelo:
    """Representa uma tabela: consulta, inserção, alteração e exclusão."""

    def __init__(self, tabela, pk, campos, obrigatorios=(), dominios=None, select=None, ordem=None):
        self.tabela, self.pk, self.campos = tabela, pk, campos
        self.obrigatorios, self.dominios = obrigatorios, dominios or {}
        self.select = select or f"SELECT t.* FROM {tabela} t"
        self.ordem = ordem or f"t.{pk}"

    def listar(self, onde="", params=()):
        return consultar(f"{self.select} {onde} ORDER BY {self.ordem}", params)

    def buscar(self, id):
        linhas = consultar(f"{self.select} WHERE t.{self.pk} = ?", (id,))
        return linhas[0] if linhas else None

    def validar(self, dados):
        limpo = {}
        for campo in self.campos:
            if campo in dados:
                valor = dados[campo]
                valor = valor.strip() if isinstance(valor, str) else valor
                limpo[campo] = None if valor == "" else valor
        for campo in self.obrigatorios:
            if limpo.get(campo) is None:
                return None, f"Preencha o campo: {campo.replace('_', ' ')}."
        for campo, validos in self.dominios.items():
            if limpo.get(campo) is not None and limpo[campo] not in validos:
                return None, f"Valor inválido em: {campo}."
        return limpo, None

    def criar(self, dados):
        cols = [c for c in self.campos if c in dados]
        sql = f"INSERT INTO {self.tabela} ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})"
        return executar(sql, [dados[c] for c in cols])

    def atualizar(self, id, dados):
        cols = [c for c in self.campos if c in dados]
        sql = f"UPDATE {self.tabela} SET {', '.join(c + ' = ?' for c in cols)} WHERE {self.pk} = ?"
        executar(sql, [dados[c] for c in cols] + [id])

    def excluir(self, id):
        executar(f"DELETE FROM {self.tabela} WHERE {self.pk} = ?", (id,))

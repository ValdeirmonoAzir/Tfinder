pronto(() => iniciarCrud({
  rota: "turmas", id: "id_turma", singular: "turma",
  colunas: [["nome"], ["turno"], ["ano_letivo"]],
}));

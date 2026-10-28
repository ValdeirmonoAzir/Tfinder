pronto(async () => {
  await iniciarCrud({
  rota: "recursos", id: "id_recurso", singular: "recurso",
  colunas: [["nome"], ["tipo"], ["patrimonio"], ["local"], ["status", selo]],
  });
  const local = new URLSearchParams(location.search).get("local");   // vindo da tela de um local
  if (local && ehAdmin()) { $("f-crud").elements.id_local.value = local; $("f-crud").scrollIntoView(); }
});

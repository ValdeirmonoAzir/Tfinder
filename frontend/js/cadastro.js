enviarForm("f-cadastro", "/cadastro", () => {
  aviso("Conta criada! Redirecionando para o login...");
  setTimeout(() => (location.href = "login.html"), 1500);
});

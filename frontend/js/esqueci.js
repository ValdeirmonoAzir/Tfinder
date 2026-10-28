enviarForm("f-esqueci", "/esqueci-senha", (d) => {
  aviso(d.mensagem);
  setTimeout(() => (location.href = "login.html"), 1500);
});

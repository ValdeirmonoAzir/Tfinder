enviarForm("f-login", "/login", (d) => {
  localStorage.setItem("tf_token", d.token);
  localStorage.setItem("tf_usuario", JSON.stringify(d.usuario));
  location.href = "dashboard.html";
});

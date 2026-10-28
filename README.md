# TFinder – Reserva de recursos tecnológicos

## Como rodar
1. `cd backend`
2. `pip install -r requirements.txt`
3. `python app.py` (deixe o terminal aberto)

O terminal mostra dois endereços:
- **Computador:** http://127.0.0.1:5000 (também dá para abrir `frontend/login.html` direto no navegador)
- **Celular (mesmo Wi-Fi):** `http://IP-DO-COMPUTADOR:5000`, o endereço aparece no terminal. Se o Windows perguntar sobre o firewall, permita o acesso em rede privada.

O banco (`backend/tfinder_dados.db`) é criado e populado sozinho na primeira execução. Para recomeçar com os dados de exemplo, apague esse arquivo e rode de novo.

## Usuários de teste
| Perfil        | E-mail                | Senha    | Matrícula |
|---------------|-----------------------|----------|-----------|
| Administrador | admin@tfinder.com     | admin123 | ADM001    |
| Professor     | professor@tfinder.com | prof123  | PRO001    |
| Aluno         | aluno@tfinder.com     | aluno123 | ALU001    |

## Locais e equipamentos
- **Coordenação** guarda as **TVs** e os **laboratórios de informática móvel**.
- Cada **laboratório móvel** guarda seus **computadores**.
- Em *Locais* → **Abrir**, vê-se o que há dentro do local e dá para reservar o equipamento direto dali.

## Fluxo de reservas
- Administrador reserva direto (já confirmada). Professor e aluno enviam a solicitação (**Pendente**); o administrador **aprova ou recusa** (com motivo) e o solicitante recebe um aviso.
- Alterar uma reserva volta para aprovação. Só reservas confirmadas bloqueiam o horário. Aluno reserva apenas computadores.
- Telas de **Avisos** e **Relatórios** de uso (relatórios só para o administrador).

## Hospedagem (Render)
O projeto já vem com `render.yaml`. Resumo: suba a pasta para o GitHub, no Render use **New → Blueprint**, escolha o repositório e informe a senha do administrador.
No plano gratuito o site "dorme" após 15 min sem acesso (a volta leva cerca de 1 min) e o banco SQLite é recriado a cada reinício, voltando com os dados de exemplo.

## E-mail
O e-mail é validado no formulário e no servidor (formato `nome@dominio.com`); no cadastro é preciso digitar duas vezes. Não há envio de e-mail de confirmação. "Esqueceu a senha" confere e-mail + matrícula.

## Estrutura
- `backend/app.py` – API, login por token, permissões por perfil, CORS e entrega das telas
- `backend/database.py` – conexão, tabelas do DER e dados iniciais
- `backend/models/` – `base.py` (consulta, inserção, alteração, exclusão) e `entidades.py` (um modelo por entidade)
- `frontend/` – uma página HTML por tela e um JavaScript por tela
  - acesso: `login`, `cadastro`, `esqueci-senha`
  - sistema: `dashboard`, `reservas`, `locais`, `local`, `recursos`, `notificacoes`
  - só administrador: `usuarios`, `turmas`, `relatorios`
  - `css/style.css` (tema claro/escuro e versão para celular) e `js/` (`comum.js`, `crud.js` e um arquivo por tela)

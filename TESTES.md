# Checklist de testes

## A) Automático (sem internet, sem Supabase)
```
npm test
```
Deve terminar com `RESULTADO: 67 ok, 0 falhas`. Cobre: login/logout, onboarding, CRUD de clientes,
agendamentos, entradas e saídas, Realtime entre dois aparelhos, edições simultâneas, conflito no
mesmo registro, offline, RLS (isolamento entre estúdios e tentativas de escalar privilégio),
importação dos dados antigos e preferências locais.
> Roda contra um banco **emulado**. Não substitui o teste B.

## B) Manual no Supabase real (obrigatório antes de usar)
Pré-requisitos: migrations 001→003 executadas, `config.js` preenchido, 2 usuários criados
(dono e colega, colega vinculado pelo SQL do README §7), site aberto no celular e no iPad.

```
[ ] Abrir o site sem estar logado → aparece a tela de login (nenhum dado visível)
[ ] Senha errada → "E-mail ou senha incorretos."
[ ] Login do dono (primeiro acesso) → "Criar o estúdio" → entra no sistema
[ ] Criar cliente no celular
[ ] Ver o cliente no iPad SEM recarregar (até ~2 s)
[ ] Editar o telefone do cliente no iPad
[ ] Ver a alteração no celular SEM recarregar
[ ] Criar agendamento (com sinal) no celular
[ ] Ver agendamento e a entrada do sinal no iPad
[ ] Alterar o horário no iPad
[ ] Ver o novo horário no celular
[ ] Marcar como Concluído com pagamento no iPad → Dashboard do celular atualiza
[ ] Criar entrada (cartão parcelado 3x) → ver em outro dispositivo, com "(3x)"
[ ] Criar saída com categoria nova → ver em outro dispositivo
[ ] Simultâneo: celular edita o Cliente A e iPad edita o Agendamento B ao mesmo tempo → as duas alterações ficam
[ ] Conflito: nos dois aparelhos abra o MESMO cliente; salve no iPad; salve no celular → aviso "alterado em outro aparelho"
[ ] Excluir cliente no celular → some no iPad; o agendamento dele continua (sem vínculo)
[ ] Modo avião no celular → tentar salvar → "Sem conexão... Nada foi salvo"; desligar o modo avião → "Sincronizado"
[ ] Indicador no topo mostra "Salvando…" → "Sincronizado"
[ ] Logout (⚙ → Sair da conta) → volta ao login; entrar de novo → dados continuam
[ ] Usuário SEM permissão: criar usuário no painel sem perfil → entra, cai em "Criar o estúdio"; NÃO enxerga dados do estúdio principal
[ ] RLS direta: Supabase → SQL Editor → `select * from clientes;` como anon (via API REST com a anon key, sem login) → lista vazia
[ ] "Esqueci minha senha" → e-mail chega e o link volta ao site (Site URL/Redirect URL configurados)
[ ] Importar dados antigos (se houver) → conferir contagens
[ ] Publicar na Vercel → abrir o endereço .vercel.app no celular e no iPad
[ ] Domínio ferreiratattoo.com.br respondendo com HTTPS
[ ] Responsividade: Dashboard, Agenda, Clientes e Financeiro no celular (menu inferior rola até "Fechamento")
```

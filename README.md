# Ferreira Tattoo — Agenda + Financeiro (v2: Supabase)

Sistema web do estúdio. Todos os dados vivem no **Supabase (PostgreSQL)** e aparecem em
tempo real em todos os aparelhos autorizados (celular, iPad, PC). Hospedagem na **Vercel**.

```
 celular ─┐
 iPad ────┼──►  Vercel (HTML estático)  ──►  Supabase: Auth + PostgreSQL (RLS) + Realtime
 PC ──────┘
```

## 1. Estrutura de pastas

```
ferreira-tattoo/
├── index.html                  ← aplicação inteira (telas, lógica, estilos)
├── config.js                   ← URL e chave pública do Supabase (você preenche)
├── vercel.json                 ← cabeçalhos de segurança / cache
├── package.json                ← só scripts (npm test); sem dependências
├── .env.example                ← documentação dos nomes de configuração
├── .gitignore
├── supabase/migrations/
│   ├── 001_initial_schema.sql  ← tabelas, FKs, índices, constraints, triggers
│   ├── 002_rls.sql             ← Row Level Security + policies
│   └── 003_realtime.sql        ← liga o Realtime nas tabelas
├── tests/
│   ├── harness.js              ← "banco" emulado (RLS/FK/Realtime) + aparelhos simulados
│   └── e2e.js                  ← 67 verificações automáticas
├── README.md
└── TESTES.md                   ← checklist manual (celular × iPad)
```

## 2. Decisão de arquitetura (e por quê)

Mantive **HTML/CSS/JS puro** (sem Vite/React). O visual, as telas e todas as regras
financeiras ficaram exatamente como estavam; mudei só a camada de dados. Motivos: zero risco de
quebrar o que já funciona, deploy trivial na Vercel (sem etapa de build) e nada de `node_modules`.

Consequência honesta: como não há build, **não existe leitura de `.env`**. O equivalente é o
`config.js` (os mesmos dois valores: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`). A chave
**anon public** foi feita para ficar no navegador — quem protege os dados é a RLS, não o
sigilo da chave. A chave `service_role` **nunca** entra no projeto.

## 3. O que mudou

**Criados:** `config.js`, `vercel.json`, `package.json`, `.env.example`, `.gitignore`,
`supabase/migrations/*`, `tests/*`, este README e `TESTES.md`.

**Modificado:** `index.html` — só a camada de dados:
- ❌ removido: Firebase/Firestore, a sincronização antiga "documento único + código do estúdio",
  e o `localStorage` como banco de clientes/agendamentos/entradas/saídas.
- ✅ novo: login (Supabase Auth), onboarding do estúdio, carga inicial por tabela, **CRUD por
  registro**, **Realtime por linha**, controle de concorrência, indicador de sincronização,
  tratamento de offline, importação dos dados antigos, tela "Conta & dados" (com logout).
- Telas, cálculos, gráficos, agenda, parcelamento, "pagamento ao concluir", CSV: **inalterados**.

O `localStorage` agora guarda **somente preferências de tela** (tema, filtros, aba atual).
(O supabase-js guarda também o token de sessão dele — é do login, não são dados do estúdio.)

## 4. Como o Supabase está integrado

| Operação | O que acontece |
|---|---|
| Criar cliente | `INSERT` de **uma linha** em `clientes` |
| Editar cliente | `UPDATE` **só dessa linha** (e atualiza o nome copiado nos agendamentos/entradas dele) |
| Excluir | `DELETE` da linha; FKs `on delete set null` preservam agendamentos e entradas |
| Agendamento + sinal | `INSERT` em `agendamentos` e depois `INSERT` em `entradas` ligada por FK |
| Concluir + pagamento | `UPDATE` do agendamento + `INSERT` da entrada |

A tela só muda **depois** que o banco confirma — se falhar, nada aparece como salvo e o
formulário continua aberto. Nunca é enviado "o sistema inteiro".

## 5. Realtime

Uma assinatura (`postgres_changes`) por tabela: `clientes`, `agendamentos`, `entradas`, `saidas`.
Cada evento `INSERT/UPDATE/DELETE` altera **apenas aquela linha** na memória do aparelho e redesenha
a tela. Não há `setInterval`/polling. Ao voltar a internet o sistema recarrega os dados e
re-assina. Obs.: o Supabase não entrega `DELETE` em assinaturas com filtro de coluna, por isso a
assinatura é sem filtro; o isolamento vem da RLS (INSERT/UPDATE) e o sistema ainda confere o
`studio_id` no cliente. Eventos de DELETE só carregam o `id`.

**Concorrência:** cada edição envia `UPDATE ... WHERE id = ? AND updated_at = <versão que o aparelho
viu>`. Registros diferentes nunca se sobrescrevem. Se **o mesmo registro** foi alterado em outro
aparelho nesse meio-tempo, o salvamento é recusado, o usuário é avisado e a tela é atualizada
(em vez de apagar silenciosamente a alteração do colega).

## 6. Como a RLS protege os dados

- Todas as tabelas têm RLS ligada; o papel `anon` (sem login) não tem acesso a nada.
- `clientes/agendamentos/entradas/saidas/categorias`: só linhas com `studio_id = current_studio_id()`
  (descoberto pelo `profiles` do usuário logado) — tanto para ler quanto para gravar.
- `profiles`: só dá para criar o **próprio** perfil, como `owner`, em um studio que **ainda não tem
  membros**; `role` e `studio_id` não podem ser alterados pelo usuário (só `nome`). Ninguém entra em
  estúdio alheio.
- `studios`: só quem ainda não tem estúdio cria um; só `owner/admin` renomeia.

## 7. Primeiro estúdio e primeiros usuários

1. Supabase → **Authentication → Users → Add user → Create new user** (marque *Auto Confirm User*).
   Crie o usuário do dono (e-mail + senha).
2. Abra o sistema e entre com ele. Como é o primeiro acesso, aparece **"Criar o estúdio"** →
   digite o nome. Isso cria o estúdio, o perfil `owner` e as 16 categorias padrão.
3. **Colega/outro tatuador** (mesmo estúdio): crie o usuário dele no passo 1, copie o **UID** que
   aparece na lista e rode no **SQL Editor**:
   ```sql
   insert into profiles (user_id, studio_id, nome, email, role)
   values ('UID_DO_COLEGA',
           (select studio_id from profiles where email = 'EMAIL_DO_DONO' limit 1),
           'Nome do Colega', 'EMAIL_DO_COLEGA', 'tatuador');   -- ou 'admin'
   ```
   (Isso é feito no painel de propósito: criar usuários exige a chave `service_role`, que não pode
   ficar no site.)
4. **Recomendado:** desative o cadastro público (Authentication → *Sign In / Providers* →
   desligar *Allow new users to sign up*; o nome exato pode variar). Assim só quem você criar entra.

## 8. Configuração (`config.js`)

- **Project URL:** no painel do projeto, botão **Connect** (ou Settings → API).
- **Chave pública:** **Settings → API Keys** → copie a **Publishable key** (`sb_publishable_...`).
  Se não existir, clique em *Create new API Keys*. A chave legada `anon public` (aba *Legacy API Keys*)
  também funciona, mas o Supabase está descontinuando-a até o fim de 2026 — prefira a Publishable.

```js
window.FERREIRA_CONFIG = { SUPABASE_URL: 'https://xxxx.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_...' };
```
(O nome do campo continua `SUPABASE_ANON_KEY`, mas aceita a Publishable key.)
**Nunca** use a *Secret key* (`sb_secret_...`) nem a `service_role`: elas ignoram toda a segurança.
Sem esses valores o sistema mostra "Configuração pendente".

## 9. Banco de dados (uma vez)

Supabase → **SQL Editor** → rode, **nesta ordem**: `001_initial_schema.sql`, `002_rls.sql`,
`003_realtime.sql` (todos podem ser repetidos sem erro).

## 10. Rodar localmente

Não há nada para instalar. Sirva a pasta e abra no navegador:
```bash
cd ferreira-tattoo
npx serve .          # ou: python3 -m http.server 8080
```
(Abrir o `index.html` direto com duplo clique também funciona, mas servir por http é o ideal.)
Testes automáticos: `npm test` (Node 18+, sem dependências).

## 11. Build

`npm install` e `npm run build` funcionam (não há dependências nem build: o script só informa isso).
O resultado "compilado" é a própria pasta.

## 12. Publicar na Vercel

**Recomendado (atualiza o mesmo link a cada mudança):** suba a pasta para um repositório no GitHub →
vercel.com → *Add New → Project* → importe o repositório → **Framework Preset: Other**, deixe
*Build Command* e *Output Directory* em branco → **Deploy**.

**Rápido (sem Git):** vercel.com/drop e arraste a pasta/zip. Cada "drop" cria um projeto novo.

Depois do deploy, em **Supabase → Authentication → URL Configuration**, ponha em *Site URL* o seu
endereço (`https://ferreiratattoo.com.br` quando o domínio estiver ativo; antes disso, o `.vercel.app`)
e adicione-o também em *Redirect URLs* — necessário para o "Esqueci minha senha".

## 13. Domínio ferreiratattoo.com.br

Vercel → seu projeto → **Settings → Domains → Add** `ferreiratattoo.com.br` (e `www`). A Vercel mostra
os registros DNS exatos (normalmente um `A` para o domínio raiz e um `CNAME` para `www`). Cadastre-os
no painel onde o domínio foi registrado (ex.: Registro.br). Use os valores que a Vercel exibir.
O HTTPS é emitido automaticamente. Nenhuma mudança de código é necessária. O sistema não altera DNS.

## 14. Importar os dados antigos

Se algum navegador tem dados da versão anterior, ao entrar aparece em **⚙ Conta & dados** o aviso
"Dados antigos encontrados". **Importar** envia tudo para as tabelas (reconstruindo os vínculos
cliente → agendamento → entrada), ignora registros inválidos informando quantos, **não apaga**
nada do navegador e não se oferece de novo. Faça uma única vez, no aparelho que tem os dados.

## 15. Limitações (leia)

- **Verificação:** o código usa o `supabase-js` real, mas eu não tenho acesso ao seu projeto
  Supabase nem à Vercel. Os testes automáticos rodam contra um **banco emulado** que reproduz RLS,
  FKs, constraints e Realtime; **o SQL não foi executado em um PostgreSQL real**. Por isso o
  `TESTES.md` é obrigatório antes de usar de verdade.
- **Offline:** sem fila offline (de propósito). Sem internet o sistema avisa, **não** finge que
  salvou e mantém o formulário aberto; ao reconectar recarrega tudo.
- **Operações em vários passos** (ex.: agendamento + sinal) são inserts sequenciais, não uma única
  transação. Se o 2º falhar, o 1º já existe — o usuário é avisado do erro e pode corrigir pela tela.
- A biblioteca é carregada de `cdn.jsdelivr.net` (`@supabase/supabase-js@2`). Para travar a versão,
  troque `@2` por uma versão exata. Projetos gratuitos do Supabase podem ser pausados por inatividade.
- Papéis `admin/tatuador` já existem no banco, mas a interface ainda não restringe telas por papel.

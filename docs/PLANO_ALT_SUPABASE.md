# Plano B — Supabase (Postgres gerenciado + Auth + Hosting)

**Objetivo:** transformar o projeto num **produto** de verdade: PWA instalável,
**login**, **multiusuário** (ex.: casal), banco **Postgres** com segurança por linha
(RLS) e API pronta — sem manter servidor.

**Ideal para:** quem quer sair das limitações do Sheets (auth, escala, latência) e ter
uma base sólida para crescer, aceitando um esforço maior de migração.

## Por que Supabase

- **Postgres gerenciado** (o modelo relacional que o [PGlite plan](PLANO_MIGRACAO_PGLITE.md)
  usaria, mas na nuvem e multiusuário).
- **Auth nativa** (e-mail/senha, Google, magic link) — resolve o multiusuário.
- **Row Level Security (RLS):** cada usuário só enxerga suas linhas — segurança de
  verdade, no banco.
- **API auto-gerada** (REST + client JS) e **Realtime** opcional.
- **Plano grátis** generoso; escala pago se precisar.
- **Storage** para anexos (comprovantes), se quiser (item 4.3).

## Arquitetura

```
PWA (seu domínio)  ──supabase-js──>  Supabase
  UI + service worker                 ├─ Auth (login)
                                      ├─ Postgres + RLS
                                      └─ Storage (anexos)
```

- **Front:** o `index.html`/JS atual vira um **PWA hospedado** (Vercel/Netlify/Pages)
  com `manifest` + `sw.js`. Chamadas trocam `google.script.run` por `supabase.from('...')`.
- **Backend:** **não há servidor próprio** — o Supabase é o backend. Regras de negócio
  simples ficam em SQL (views/`rpc`), e as mais ricas (rateio, categorização) podem
  ficar no front ou em **Edge Functions** (Deno).

## Modelo de dados (esboço SQL)

```sql
create table contas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users default auth.uid(),
  nome text not null, saldo numeric default 0
);
create table transacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users default auth.uid(),
  data date not null, conta text, meio text, descricao text,
  tipo text, natureza text, categoria text,
  compartilhado boolean default false, rateio int default 0,
  parcela_atual int, parcela_total int, valor numeric not null,
  observacao text, criado_em timestamptz default now()
);
-- idem: orcamentos, lembretes, config

alter table transacoes enable row level security;
create policy "dono" on transacoes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Views para o resumo/categoria substituem parte do `getResumo`/`getPorCategoria`.

## Passo a passo

1. **Isolar a camada de dados** no front (mesmo passo 1 do [Plano A](PLANO_ALT_FRONT_SEPARADO.md)):
   um `repo` único que hoje fala com GAS e amanhã fala com `supabase-js`.
2. **Criar o projeto Supabase** e rodar o SQL das tabelas + RLS.
3. **Migrar os dados:** exportar o **backup CSV/XML** atual e importar no Postgres
   (script único `node` ou `COPY`/`insert`), setando `user_id`.
4. **Auth:** tela de login (Google ou magic link). Sem login → sem dados (RLS garante).
5. **Portar as regras de negócio:** rateio/reembolso, auto-categorização e projeção de
   parcelas viram funções no front (ou Edge Functions) — **trazer os testes junto**.
6. **PWA + deploy:** manifest, service worker, publicar. Instalar no celular ✅.
7. **Extras opcionais:** Realtime (atualiza entre dispositivos), Storage (comprovantes),
   push (Web Push) para os lembretes — melhor que e-mail.

## Prós

- **Multiusuário e auth de verdade** (o casal usa o mesmo app, cada um com seus dados,
  mais visão conjunta via policy/relacionamento).
- **PWA instalável + offline** (com cache/local + sync).
- **Banco relacional** com SQL, índices, integridade — escala tranquilo.
- Base para **push notifications**, anexos e relatórios ricos.

## Contras / riscos

- **Maior esforço** de migração (auth, RLS, portar regras, mover dados).
- **Dependência de um terceiro** (Supabase) — os dados saem do seu Google. (Mitigável:
  Supabase é open-source e self-hostável; e mantém-se o backup CSV/XML.)
- Curva de RLS/SQL para quem não conhece.
- Custo pode aparecer se crescer muito (mas o grátis cobre uso pessoal com folga).

## Esforço estimado

🔨🔨🔨 (alto). Compensa se o alvo é multiusuário / produto de longo prazo.

## Alternativa equivalente

**Firebase (Firestore + Auth + Hosting + FCM)** entrega quase o mesmo (auth, hosting,
push nativo forte), porém com banco **NoSQL** — menos natural para os relatórios/somatórios
deste app. Se **push notification** for prioridade máxima, considere; caso contrário, o
Postgres do Supabase casa melhor com o modelo atual.

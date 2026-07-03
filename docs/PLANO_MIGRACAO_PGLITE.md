# Plano de Migração — Google Sheets → PGlite (Postgres em WASM no navegador)

Objetivo: substituir o Google Sheets como banco por **PGlite** (Postgres compilado em WebAssembly) rodando **dentro do navegador**, com persistência local. O app deixa de ter backend Apps Script e vira um **app client-side** (e, de brinde, um **PWA de verdade**, instalável e offline).

> ⚠️ **Leia primeiro a seção "Trade-off crítico".** Migrar para PGlite muda *onde os seus dados financeiros vivem* — isso tem consequências sérias que precisam de uma estratégia de backup antes de qualquer código.

---

## 0. Trade-off crítico: onde os dados passam a viver

Hoje (Sheets): os dados ficam na **nuvem do Google**, acessíveis de qualquer dispositivo, com backup/histórico automático da planilha.

Com PGlite local: os dados ficam **apenas no navegador daquele dispositivo** (IndexedDB ou OPFS).

Consequências:
- ❌ **Sem sincronização entre dispositivos** — o que você lançar no celular não aparece no PC (e vice-versa), a menos que se adicione uma camada de sync.
- ❌ **Limpar dados do navegador / desinstalar o PWA / trocar de celular = perda total** dos dados.
- ❌ Navegação anônima ou storage "efêmero" pode ser apagado pelo SO sob pressão de espaço.
- ✅ Muito rápido, funciona 100% offline, sem cota/limite do Sheets, SQL completo.

**Conclusão:** para dados financeiros, **backup/exportação é obrigatório e prioritário**, não opcional (ver seção 6). Se sincronização multi-dispositivo for importante, considerar uma camada de sync (seção 9) — senão, assuma "um dispositivo é a fonte da verdade" + exportações regulares.

---

## 1. O que é o PGlite e como persiste

- `@electric-sql/pglite` — Postgres real (~3 MB gzip) em WASM, roda no browser ou Node.
- Modos de persistência:
  - **`memory://`** — some ao recarregar (só para testes).
  - **`idb://nome`** — **IndexedDB**, roda na thread principal, mais simples. Bom para começar.
  - **OPFS** (Origin Private File System) — via Web Worker, mais rápido e robusto para escrita. Recomendado para produção. Não exige `SharedArrayBuffer` no modo AccessHandlePool.
- Backup/restore nativo: `db.dumpDataDir()` gera um tarball do banco; `new PGlite({ loadDataDir })` restaura. É a base da estratégia de backup.

---

## 2. Arquitetura alvo

```
┌─────────────────────────────────────────────┐
│  Navegador (PWA instalável, offline)         │
│                                              │
│   UI (HTML/CSS/JS)                           │
│        │                                     │
│   Camada de dados (repositório SQL)          │
│        │                                     │
│   PGlite (Postgres WASM)  ──►  IndexedDB/OPFS│
└─────────────────────────────────────────────┘
        │ (opcional, futuro)
        ▼  export/backup manual ou sync
   Arquivo .tar / Google Drive / servidor de sync
```

- **Sem Apps Script no caminho de dados.** O backend `Código.js` deixa de ser usado (pode ser aposentado ou mantido só como export inicial dos dados).
- **Hospedagem:** como PGlite não roda bem no iframe-sandbox do Apps Script, o front vai para **hospedagem estática** (GitHub Pages, Netlify, Firebase Hosting, Cloudflare Pages — todas com HTTPS grátis). Isso também habilita Service Worker → **PWA real** (resolve a limitação do plano de código D1).

---

## 3. Modelo de dados (schema Postgres)

Mapeando as abas atuais para tabelas com tipos corretos:

```sql
create table if not exists transacoes (
  id            uuid primary key default gen_random_uuid(),
  data          date not null,
  conta         text not null,
  meio          text not null default 'Conta',
  descricao     text not null,
  tipo          text not null default 'Único',
  categoria     text,
  parcela_atual int,
  parcela_total int,
  valor         numeric(12,2) not null,
  obs           text,
  criado_em     timestamptz not null default now()
);
create index if not exists idx_transacoes_data on transacoes (data);

create table if not exists servicos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  compartilhado boolean not null default false,
  rateio        numeric(4,3) not null default 0.5
);

create table if not exists config (
  chave  text primary key,
  valor  text not null
); -- ex.: ('salario','0'), ('rateio_padrao','0.5')

create table if not exists saldos (
  conta  text primary key,
  saldo  numeric(12,2) not null default 0
);
```

Ganhos vs. Sheets: tipos reais (dinheiro como `numeric`, não string), `id` para editar/excluir, índices, e todo o resumo vira **uma query SQL** em vez de laços em JS.

Exemplo — o resumo do mês em SQL (substitui `getResumo`):
```sql
select
  coalesce(sum(valor) filter (where lower(conta) like '%inter%'), 0) as total_inter,
  coalesce(sum(valor) filter (where lower(conta) like '%ita%'),   0) as total_itau,
  coalesce(sum(valor), 0) as total_geral
from transacoes
where date_trunc('month', data) = date_trunc('month', $1::date);
```

---

## 4. Camada de acesso a dados (substitui `google.script.run`)

```js
import { PGlite } from 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js';

let db;
export async function initDb() {
  db = new PGlite('idb://financeiro');   // trocar por OPFS em produção
  await db.exec(SCHEMA_SQL);             // cria tabelas se não existirem
  return db;
}

export async function addTransacao(t) {
  await db.query(
    `insert into transacoes (data, conta, meio, descricao, tipo, categoria,
       parcela_atual, parcela_total, valor, obs)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [t.data, t.conta, t.meio, t.descricao, t.tipo, t.categoria,
     t.parcelaAtual || null, t.parcelaTotal || null, t.valor, t.obs || null]
  );
}

export async function listTransacoes(mesISO) {
  const { rows } = await db.query(
    `select * from transacoes
      where date_trunc('month', data) = date_trunc('month', $1::date)
      order by data desc`, [mesISO]);
  return rows;
}
```
A UI atual muda pouco: em vez de `google.script.run.withSuccessHandler(...)`, chama funções `async` que retornam Promises (já sugerido no plano de código C2).

---

## 5. Migração dos dados atuais (Sheets → PGlite)

Migração única, sem perder o histórico:
1. No Apps Script atual, criar um `exportarJSON()` que lê as abas e devolve JSON (ou exportar as abas como CSV pela própria planilha).
2. No app novo, uma tela/rotina de **importação** que insere esse JSON/CSV nas tabelas (`insert`).
3. Conferir totais (soma dos valores) antes e depois para validar.
4. Manter a planilha como backup histórico por um tempo.

---

## 6. Backup e exportação (OBRIGATÓRIO — faça junto do MVP)

Como os dados ficam locais, sem backup **não há rede de segurança**.
- **Export completo (recomendado):**
  ```js
  const blob = await db.dumpDataDir();      // tarball do banco
  // salvar como download .tgz, ou enviar para Google Drive
  ```
  Restaurar: `new PGlite({ loadDataDir: arquivo })`.
- **Export legível:** também oferecer exportação em **CSV/JSON** por mês (fácil de auditar/reimportar).
- **Automação:** lembrete/rotina para exportar semanalmente; opcional: subir o `.tgz` para o Google Drive via API.
- **Persistência durável:** chamar `navigator.storage.persist()` para pedir ao navegador que **não** apague o storage sob pressão de espaço.

---

## 7. PWA de verdade (bônus da saída do Apps Script)

Fora do sandbox do GAS, agora é possível:
- **`manifest.webmanifest`** próprio (reaproveitar o que já existe no `doGet`).
- **Service Worker** para cache do app shell + do WASM do PGlite → abre offline e instala de verdade (pop-up "Instalar", ícone, tela cheia).
- Hospedar com HTTPS (qualquer host estático).

---

## 8. Fases de implementação

| Fase | Entrega | Detalhe |
|------|---------|---------|
| 0 | Prova de conceito | PGlite via CDN numa página em branco: criar schema, inserir e ler 1 transação (IndexedDB). |
| 1 | Camada de dados | Portar `addTransacao`, `listTransacoes`, `getResumo` para SQL; testes de soma. |
| 2 | UI | Ligar o `index.html` atual à nova camada (trocar `google.script.run` por Promises). |
| 3 | Backup | `dumpDataDir` + export CSV + `storage.persist()`. **Não pular.** |
| 4 | Migração | Importar dados reais do Sheets e validar totais. |
| 5 | Hospedagem + PWA | Publicar em host estático, adicionar Service Worker e manifest. |
| 6 | OPFS | Migrar persistência de IndexedDB → OPFS (worker) para robustez. |
| 7 (opcional) | Sync | Camada de sincronização multi-dispositivo (seção 9). |

---

## 9. Se precisar de multi-dispositivo (futuro)

PGlite local sozinho é single-device. Opções para sincronizar:
- **ElectricSQL** (mesmos autores do PGlite): sync Postgres↔PGlite. Requer um Postgres central (servidor).
- **Supabase / Neon** como Postgres na nuvem + sync manual ou via Electric.
- **Backup/restore manual** via `dumpDataDir` compartilhado no Drive (rústico, mas sem servidor).
> Se multi-dispositivo for requisito forte, avaliar se vale manter uma arquitetura com servidor desde o início (aí o PGlite vira só cache offline).

---

## 10. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Perda de dados (limpar navegador, trocar aparelho) | Backup obrigatório (seção 6) + `storage.persist()` |
| Sem sync entre dispositivos | Definir 1 dispositivo como fonte; ou sync (seção 9) |
| Tamanho do WASM (~3 MB) no 1º carregamento | Cache via Service Worker; carregar sob demanda |
| OPFS exige Web Worker / cuidado com headers | Começar com IndexedDB; migrar a OPFS depois |
| Compatibilidade de navegador antigo | IndexedDB é amplamente suportado; testar no alvo |

## 11. Stack / dependências
- `@electric-sql/pglite` (via CDN ESM ou npm).
- Host estático com HTTPS (GitHub Pages / Netlify / Firebase / Cloudflare Pages).
- (Opcional) ElectricSQL/Supabase se houver sync.
- O Apps Script pode ser **aposentado** após a migração (ou mantido só para o export inicial).

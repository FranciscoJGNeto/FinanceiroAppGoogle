# Planos alternativos de arquitetura

Além do [PLANO_MIGRACAO_PGLITE.md](PLANO_MIGRACAO_PGLITE.md) (banco Postgres **dentro do
navegador**, via WASM), aqui estão caminhos alternativos para evoluir o projeto —
cada um resolve dores diferentes. A ideia é que **você ou outra pessoa** possa pegar um
plano e executar sem depender do resto.

> **Por que considerar sair (ou complementar) o Apps Script?**
> A stack atual (Apps Script + Google Sheets) é ótima para custo zero e dono único dos
> dados, mas tem limites conhecidos:
> - **Não dá para ter um PWA instalável de verdade** (offline/standalone) pela URL `/exec`
>   — o app roda num iframe sandbox (ver [PLANO_ALTERACOES.md](../planos/PLANO_ALTERACOES.md)).
> - **Multiusuário/auth** é frágil (acesso `MYSELF` ou "qualquer um com o link").
> - **Latência**: cada `google.script.run` vai à nuvem e lê a planilha inteira.
> - **Planilha como banco** não escala bem com milhares de linhas.
>
> Nenhuma migração é obrigatória — o app **funciona hoje**. Estes planos são opções.

## Comparativo rápido

| Plano | Resolve PWA instalável? | Multiusuário/Auth | Offline | Custo | Esforço | Dados ficam onde |
|-------|:---:|:---:|:---:|-------|:---:|---|
| **Atual** (GAS + Sheets) | ❌ | fraco | ❌ | grátis | — | Google Sheets (seu) |
| **[A. Front separado + GAS API](PLANO_ALT_FRONT_SEPARADO.md)** | ✅ | fraco (herda GAS) | parcial | grátis | 🔨🔨 | Google Sheets (seu) |
| **[B. Supabase](PLANO_ALT_SUPABASE.md)** | ✅ | forte (nativo) | via cache | grátis→$ | 🔨🔨🔨 | Postgres (Supabase) |
| **[C. Local-first PWA](PLANO_ALT_LOCALFIRST.md)** | ✅ | 1 usuário/dispositivo | ✅ total | grátis | 🔨🔨🔨 | Navegador (IndexedDB) |
| **[PGlite/WASM](PLANO_MIGRACAO_PGLITE.md)** | ✅ | 1 usuário/dispositivo | ✅ total | grátis | 🔨🔨🔨🔨 | Navegador (Postgres WASM) |

## Como escolher

- **Quero só resolver o "app no celular" com o mínimo de mudança** → **Plano A**.
  Mantém todo o backend atual (Sheets + funções) e coloca um front real (PWA instalável)
  por cima, chamando o Apps Script como API.
- **Quero multiusuário (casal), login e um banco de verdade** → **Plano B (Supabase)**.
  É o mais "produto", com auth, RLS (segurança por linha) e Postgres gerenciado.
- **Quero funcionar 100% offline, sem servidor, dados só no aparelho** → **Plano C**
  (local-first) ou o **PGlite** (se quiser SQL de verdade no navegador).

## Princípios comuns a todos os planos

1. **Preservar o modelo de dados** já maduro (Transacoes, Saldos/Contas, Orcamentos,
   Lembretes, Config) — a migração é de *camada*, não de *conceito*.
2. **Camada de acesso a dados isolada** (`repo`/`api`) para trocar o backend sem
   reescrever a UI. Hoje isso está espalhado em `google.script.run` — o primeiro passo
   de qualquer migração é centralizar essas chamadas.
3. **Import/Export como ponte de migração**: os backups **CSV/XML** e o import **OFX/CSV**
   já existentes servem para levar os dados de uma arquitetura para outra sem perda.
4. **Manter a suíte de testes** — a lógica de negócio (resumo, rateio, categorização)
   deve ser portada com os testes junto.

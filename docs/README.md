# 📚 Documentação — Financeiro

Índice da documentação do projeto. O código-fonte fica em [`../src/`](../src) e o
guia de uso geral no [README principal](../README.md).

## Referência

| Documento | O que é |
|-----------|---------|
| [ANALISE_PROJETO.md](ANALISE_PROJETO.md) | O que o projeto é, objetivo e visão geral. |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de versões publicadas (v4 → atual). |
| [GUIA_CLASP.md](GUIA_CLASP.md) | Como publicar/atualizar com o `clasp`. |
| [GUIA_TELEGRAM.md](GUIA_TELEGRAM.md) | Como configurar o bot do Telegram (lançar por mensagem). |

## Planos — produto e código ([`planos/`](planos))

Roadmap e melhorias que cabem na arquitetura atual (Apps Script + Google Sheets).

| Documento | O que é |
|-----------|---------|
| [PLANO_FUNCIONALIDADES.md](planos/PLANO_FUNCIONALIDADES.md) | Roadmap de recursos (Ondas 1–7, **concluídas**). |
| [PLANO_FEATURES_FINANCEIRAS.md](planos/PLANO_FEATURES_FINANCEIRAS.md) | **Próximas ondas (8+)** — features financeiras na arquitetura atual. |
| [PLANO_ALTERACOES.md](planos/PLANO_ALTERACOES.md) | Último lote de mudanças, item a item. |
| [PLANO_MELHORIA_CODIGO.md](planos/PLANO_MELHORIA_CODIGO.md) | Evolução da arquitetura de código. |
| [PLANO_MELHORIA_VISUAL.md](planos/PLANO_MELHORIA_VISUAL.md) | Evolução de UI/UX. |
| [PLANO_CORRECOES.md](planos/PLANO_CORRECOES.md) | Registro de bugs corrigidos. |

## Arquitetura — caminhos alternativos ([`arquitetura/`](arquitetura))

Opções para evoluir a **arquitetura** (PWA instalável de verdade, multiusuário, offline).
Nenhuma é obrigatória — o app funciona hoje. Comece pelo índice comparativo.

| Documento | O que é |
|-----------|---------|
| [PLANOS_ALTERNATIVOS.md](arquitetura/PLANOS_ALTERNATIVOS.md) | **Índice + comparativo** — como escolher. |
| [PLANO_ALT_FRONT_SEPARADO.md](arquitetura/PLANO_ALT_FRONT_SEPARADO.md) | Alt. A — PWA real + Apps Script como API (menor reescrita). |
| [PLANO_ALT_SUPABASE.md](arquitetura/PLANO_ALT_SUPABASE.md) | Alt. B — Postgres + Auth + multiusuário. |
| [PLANO_ALT_LOCALFIRST.md](arquitetura/PLANO_ALT_LOCALFIRST.md) | Alt. C — PWA offline (IndexedDB/Dexie). |
| [PLANO_MIGRACAO_PGLITE.md](arquitetura/PLANO_MIGRACAO_PGLITE.md) | Alt. D — Postgres WASM no navegador. |

---

> **Convenção:** cada plano começa com um bloco **Status** dizendo o que já foi feito e o
> que falta. O que já saiu está no [CHANGELOG.md](CHANGELOG.md).

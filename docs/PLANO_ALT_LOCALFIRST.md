# Plano C — Local-first PWA (IndexedDB / Dexie), sem servidor

**Objetivo:** um app que funciona **100% offline**, **instalável**, **rápido** (sem ida
à nuvem a cada ação) e com os dados **só no aparelho** — máxima privacidade e custo zero.

**Ideal para:** uso pessoal num dispositivo, quem prioriza privacidade/offline e não
precisa de multiusuário nem sincronização automática entre aparelhos.

## Conceito

Todo o app roda no navegador. Os dados vivem em **IndexedDB** (via **[Dexie.js](https://dexie.org)**,
uma camada leve e agradável sobre o IndexedDB). Não há backend: nenhuma requisição de rede
para ler/gravar. Sincronização entre dispositivos é **opcional e manual** (export/import) ou
via um add-on de sync depois.

```
PWA instalável (seu domínio ou local)
  ├─ UI + service worker (App Shell offline)
  └─ Dexie ──> IndexedDB (dados no dispositivo)
        ▲
        └── export/import CSV/XML  ⇄  cópia de segurança (Drive/arquivo)
```

## Diferença para o PGlite

Mesma filosofia ("banco no navegador, offline"), mas:
- **Local-first (Dexie/IndexedDB):** API de objetos, **leve**, sem WASM, ótimo para este
  volume de dados. Menos "SQL", mais direto.
- **[PGlite](PLANO_MIGRACAO_PGLITE.md):** Postgres real via WASM — **SQL completo**, porém
  bundle maior e mais complexidade. Escolha PGlite se quiser consultas SQL avançadas.

## Modelo de dados (Dexie)

```js
const db = new Dexie('financeiro');
db.version(1).stores({
  transacoes: 'id, data, conta, categoria, natureza, tipo',
  contas: 'nome',
  orcamentos: 'categoria',
  lembretes: 'id, dia',
  config: 'chave'
});
```

As funções de negócio (`getResumo`, rateio, categorização, projeção) já estão prontas em
JS — aqui elas passam a **ler do Dexie** em vez do Sheets, rodando **no cliente**.

## Passo a passo

1. **Isolar a camada de dados** (mesmo primeiro passo dos outros planos): um `repo` que
   hoje chama `google.script.run` e amanhã chama `db.transacoes...`.
2. **Portar as funções de negócio** para rodar no cliente sobre o Dexie (reaproveita a
   lógica e **os testes** — que já rodam em Node com dados em memória).
3. **PWA:** `manifest` + `sw.js` (App Shell + assets cacheados) → instala e abre offline.
4. **Migração de dados:** importar o **backup CSV/XML** atual para dentro do IndexedDB
   (o parser de import já existe).
5. **Backup/segurança:** como os dados ficam no aparelho, **backup é essencial**. Botão
   "Exportar" (CSV/XML) e "Importar" — que já existem — viram a rede de segurança. Opção
   de salvar o backup no Google Drive via File System Access API/Drive picker.
6. **(Opcional) Sync depois:** se um dia quiser sincronizar entre aparelhos, dá para
   plugar Dexie Cloud, ou um backend leve (inclusive o **Plano B**) sem reescrever a UI.

## Prós

- **Offline total** e **instantâneo** (sem latência de rede).
- **Privacidade máxima:** dados não saem do dispositivo.
- **Custo zero** e **sem servidor** para manter.
- PWA instalável de verdade.
- Reaproveita a lógica de negócio e os testes.

## Contras / riscos

- **Dados presos a um dispositivo/navegador.** Limpar dados do site **apaga tudo** →
  backup regular é obrigatório (mitigado pelo export CSV/XML + lembrete de backup).
- **Sem multiusuário/sync** nativo (é o preço do local-first puro).
- IndexedDB pode ser evacuado pelo navegador sob pressão de armazenamento (raro para este
  volume, mas por isso o backup importa).

## Esforço estimado

🔨🔨🔨 (alto no port inicial, baixo para manter). O grosso é portar a camada de dados e
as funções para o cliente; depois, evoluir é simples.

## Resumo de escolha

- Quer **offline e privacidade** sem SQL avançado → **este plano (Dexie)**.
- Quer o mesmo, mas com **SQL/Postgres** no navegador → **[PGlite](PLANO_MIGRACAO_PGLITE.md)**.
- Quer **multiusuário/sync** → **[Supabase](PLANO_ALT_SUPABASE.md)**.
- Quer **mudar o mínimo** e só resolver o app no celular → **[Front separado](PLANO_ALT_FRONT_SEPARADO.md)**.

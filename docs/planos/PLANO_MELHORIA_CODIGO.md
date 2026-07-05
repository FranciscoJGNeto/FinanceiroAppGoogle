# Plano de Melhoria e Atualização de Código — Financeiro

> **Status (onde entrou no [CHANGELOG.md](../CHANGELOG.md)):**
> ✅ **A1** mapeamento por cabeçalho → **v5** · ✅ **A2** ID+CriadoEm por transação → **v5** ·
> ✅ **A3** coluna Categoria → **v11** · ✅ **A4** valor sempre número → **v4/v5** ·
> ✅ **B1** validação server-side → **v5** · ✅ **B2** CRUD (editar/excluir) → **v6** ·
> ✅ **B6** logging/erro (Stackdriver) → ligado no `appsscript.json` · ✅ **B7** testes (suíte Node) → **v17** (ampliada até **v28**) ·
> ✅ **E2** Git/GitHub → reorg inicial · ✅ **C1** separar HTML/CSS/JS → **v33**.
> ⏳ Pendentes — **B3** cache · **B4** split do backend em módulos · **B5** enums pelo backend · **C2** camada `api` com Promise · **D1** PWA real/migração (ver [planos alternativos](../arquitetura/PLANOS_ALTERNATIVOS.md)) · **E3** script de deploy.

Foca em robustez, manutenibilidade e evolução da arquitetura. Complementa o `PLANO_CORRECOES.md` (que trata dos bugs). Prioridade: 🟢 Alto/baixo esforço · 🟡 Médio · 🔵 Estratégico.

---

## A. Robustez do modelo de dados

### A1. 🟢 Mapear colunas por cabeçalho, não por índice fixo
Hoje o código usa `r[0]..r[8]` e células mágicas (`B3`, `B5`). Se alguém inserir/mover uma coluna, tudo quebra.
- Ler a linha 1 (cabeçalhos) e montar um mapa `{ Data:0, Conta:1, ... }`.
- Ler config por **nome da chave** (coluna A) em vez de posição (`B3`), procurando a linha cuja coluna A == "Salário líquido".

### A2. 🟢 Coluna de ID único por transação
Sem ID não dá para editar/excluir com segurança. Adicionar coluna `ID` (UUID via `Utilities.getUuid()`) e `CriadoEm` (timestamp).

### A3. 🟡 Coluna de Categoria
Adicionar `Categoria` para habilitar relatórios e orçamentos (ver plano de funcionalidades).

### A4. 🟡 Padronizar valores como número puro
Garantir que a coluna Valor seja sempre `Number` (o bug do parser já foi corrigido; adicionar validação server-side para nunca gravar string).

---

## B. Backend (Apps Script)

### B1. 🟢 Validação server-side
Validar `addTransacao` no servidor (descrição não vazia, valor > 0, tipo válido, parcelas coerentes) e retornar erros estruturados. Nunca confiar só no HTML.

### B2. 🟢 CRUD completo (editar/excluir)
Com o ID (A2): `updateTransacao(id, dados)` e `deleteTransacao(id)`. UI ganha editar/excluir por transação.

### B3. 🟡 Cache de leitura
`getResumo`/`listTransacoes` leem a planilha inteira a cada chamada. Usar `CacheService` (TTL curto, ex.: 60s) com chave por mês; invalidar ao gravar.

### B4. 🟡 Organização em múltiplos arquivos
Separar `Codigo.js` em: `Web.gs` (doGet/manifest), `Transacoes.gs`, `Resumo.gs`, `Config.gs`, `Utils.gs` (parseLocalDate_, round2_). Adicionar **JSDoc** nas funções públicas.

### B5. 🟡 Constantes/enums centralizados
Contas (`Inter/Itaú/Conta Simples`), tipos (`Único/Recorrente/Parcelado/Anual`), meios — hoje duplicados entre HTML e backend. Servir a lista pelo backend (`getOpcoes()`) para uma única fonte de verdade.

### B6. 🟢 Logging e tratamento de erro
Padronizar `try/catch` com `console.error` + Stackdriver (já ligado em `appsscript.json`). Retornar mensagens amigáveis ao front.

### B7. 🔵 Testes
Criar `Testes.gs` com funções de teste (dados fixos numa aba temporária) para `toNum`, `parseLocalDate_`, `getResumo`. Rodáveis manualmente no editor ou via `clasp run`.

---

## C. Frontend

### C1. ✅ Separar HTML/CSS/JS (v33)
**Feito.** `index.html` (estrutura) + `styles.html` (CSS) + `js.html` (JS), servidos juntos
via `createTemplateFromFile('index').evaluate()` + `include()`. Página final idêntica.

### C2. 🟡 Camada de acesso ao backend
Encapsular os `google.script.run` numa mini-API com Promises:
```js
const api = (fn, ...args) => new Promise((res, rej) =>
  google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...args));
// uso: const r = await api('getResumo', mesISO);
```
Elimina callback aninhado e centraliza tratamento de erro.

### C3. 🟢 Debounce/estado de carregando
Evitar cliques duplos no "Atualizar"/"Salvar" (parcialmente feito em `disableSave`). Generalizar.

---

## D. PWA / Hospedagem (o "instalável de verdade")

### D1. 🔵 Migrar frontend para hospedagem estática + GAS como API
**Por quê:** Service Worker (offline + instalação PWA real) **não funciona** dentro do Apps Script, porque o app roda num iframe sandbox `googleusercontent.com` (origem/scopo que não permitem registrar SW).

**Arquitetura alvo:**
```
Frontend estático (Firebase Hosting / GitHub Pages / Netlify)
   │  fetch() → JSON
   ▼
Apps Script Web App (doGet/doPost) como API  ──► Google Sheets
```
- Frontend vira PWA de verdade (manifest + Service Worker + HTTPS próprio) → instalável e com cache offline.
- GAS expõe endpoints JSON (`?action=resumo`, `?action=add`...). Atenção a **CORS**: `doPost` do GAS tem limitações; padrão comum é usar `Content-Type: text/plain` no fetch e tratar no servidor, ou `doGet` com querystring para leituras.
- **Autenticação:** ao sair do sandbox logado do Google, é preciso um esquema próprio (token/segredo compartilhado, ou Google Identity Services). Ponto sensível — planejar.

### D2. 🟡 Alternativa sem migrar: manter "Adicionar à tela inicial"
Se não quiser migrar agora, o manifest já corrigido dá experiência standalone via "Adicionar à tela inicial" (sem offline). Documentar como limitação aceita.

---

## E. Processo / DevOps

### E1. 🟢 `.claspignore`
Adicionar `.claspignore` para nunca enviar `*.md`, `.git`, etc. (hoje o clasp já ignora `.md`, mas explicitar é mais seguro).

### E2. 🟢 Versionamento
Colocar a pasta sob **Git** e commitar cada mudança antes do `clasp push`. Histórico + rollback.

### E3. 🟡 Script de deploy
Um `deploy.ps1` que faz `push` → `create-version` → `redeploy` no deployment fixo, evitando erro manual.

---

## Sequência sugerida
1. B1 (validação) + A4 + E1/E2 (Git) — fundação segura.
2. A2/A1 (ID + mapeamento por cabeçalho) → habilita B2 (CRUD).
3. B3 (cache) + B4/C1 (organização) + C2 (api Promise).
4. B5, B6, B7 — qualidade.
5. D1 — só se PWA real (offline/instalação) virar requisito.

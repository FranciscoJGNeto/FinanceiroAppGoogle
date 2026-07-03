# Plano de Correções — Financeiro (Francisco)

> ✅ **Status: CONCLUÍDO (v4–v5).** Todos os bugs abaixo foram corrigidos, testados e publicados. Documento mantido como registro. Ver [CHANGELOG.md](CHANGELOG.md).

Erros encontrados em `Código.js` e `index.html`, ordenados por severidade, com plano de correção.

Legenda: 🔴 Crítico (quebra funcionalidade) · 🟠 Importante (resultado errado) · 🟡 Melhoria/robustez

---

## 🔴 1. `setHeaders` não existe em `TextOutput` — manifest sempre quebra
**Arquivo:** `Código.js`, `doGet`, linhas 39–44.

```js
return ContentService
  .createTextOutput(JSON.stringify(manifest))
  .setMimeType(ContentService.MimeType.JSON)
  .setHeaders({ 'Cache-Control': 'public, max-age=86400' }); // ❌ método inexistente
```

`ContentService.TextOutput` **não possui** o método `setHeaders`. Toda requisição a `?asset=manifest` lança `TypeError`, e o manifest PWA nunca é entregue.

**Correção:** remover a chamada `.setHeaders(...)`. O Apps Script não permite headers customizados nesse retorno.

```js
return ContentService
  .createTextOutput(JSON.stringify(manifest))
  .setMimeType(ContentService.MimeType.JSON);
```

---

## 🔴 2. Conversão de valor monetária corrompe casas decimais
**Arquivo:** `Código.js`, `addTransacao`, `toNum`, linhas 62–66.

```js
const toNum = (v) => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0; // ❌
};
```

O campo de valor no HTML é `<input type="number">` (linha 627). Pela especificação, `.value` retorna sempre com **ponto** como separador decimal (ex.: `"50.5"`). A função `toNum` foi escrita para texto pt-BR (`"1.234,56"`) e **remove todos os pontos**, então `"50.5"` vira `"505"` → **R$ 50,50 é salvo como R$ 505,00**. Todos os valores com centavos ficam multiplicados por 10/100.

**Correção:** como a entrada já é `type="number"`, converter diretamente. Manter suporte a texto pt-BR só se o valor tiver vírgula.

```js
const toNum = (v) => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).trim();
  // Se veio como texto pt-BR (com vírgula), normaliza; senão usa direto.
  const normalized = s.includes(',')
    ? s.replace(/\./g, '').replace(',', '.')
    : s;
  return parseFloat(normalized) || 0;
};
```

---

## 🟠 3. Bug de fuso horário: data pode ser salva/filtrada um dia antes
**Arquivo:** `Código.js` — `addTransacao` (linha 61) e `getResumo`/`listTransacoes` (linhas 97, 139).

```js
const parseDate = (v) => (v ? new Date(v) : new Date());
// ...
const d = mesISO ? new Date(mesISO) : new Date();
```

`new Date("2026-07-01")` interpreta a string **como UTC meia-noite**. Em fuso do Brasil (UTC−3) isso vira `30/06 21:00`, então:
- A data salva pode retroceder um dia.
- `getMonth()` pode apontar o **mês anterior**, quebrando o filtro do resumo.

**Correção:** parsear datas "YYYY-MM-DD" como data local, componente a componente.

```js
const parseLocalDate = (v) => {
  if (!v) return new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(v);
};
```
Usar `parseLocalDate` em `addTransacao`, `listTransacoes` e `getResumo`.

---

## 🟠 4. Match de "compartilhado" com descrição vazia gera falso positivo
**Arquivo:** `Código.js`, `getResumo`, linhas 180–186.

```js
if (compartilhados.some(comp => desc.includes(comp) || comp.includes(desc))) { ... }
```

Se `desc` for `''` (transação sem descrição), `comp.includes('')` é **sempre `true`**, então a transação é indevidamente contada como compartilhada. Além disso, `comp.includes(desc)` provoca casamentos reversos frouxos (ex.: descrição "Go" casa com serviço "Google").

**Correção:** ignorar descrição vazia e usar apenas correspondência direcional razoável.

```js
const totalCompart = rows.reduce((acc, r) => {
  const desc = String(r[3] || '').trim().toLowerCase();
  if (!desc) return acc; // ignora vazios
  if (compartilhados.some(comp => comp && desc.includes(comp))) {
    return acc + (Number(r[7]) || 0);
  }
  return acc;
}, 0);
```

---

## 🟠 5. Reembolso arredondado para reais inteiros (perde centavos)
**Arquivo:** `Código.js`, `getResumo`, linha 221.

```js
const reembolso = Math.round(totalCompart * rateio); // ❌ perde centavos
```

`Math.round` joga para o real cheiro; `R$ 45,50` de reembolso vira `R$ 46`. Isso propaga erro para `totalAjustado` e `prevFinal`.

**Correção:** arredondar para 2 casas decimais.

```js
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const reembolso = round2(totalCompart * rateio);
```
(Recomendado aplicar `round2` também em `totalAjustado` e `prevFinal`.)

---

## 🟡 6. PWA sem Service Worker — instalação/offline não funcionam
**Arquivo:** `index.html`, linhas 774–806 (prompt de instalação).

O `beforeinstallprompt` só dispara quando há **manifest válido + Service Worker + HTTPS**. Não há registro de Service Worker, então o prompt de instalação é, na prática, código morto. (Além disso, com o bug #1, o próprio manifest não carregava.)

**Correção (escolher o escopo):**
- **Mínimo:** corrigir o manifest (bug #1) e assumir que a instalação usará o fluxo nativo "Adicionar à tela inicial" do navegador (sem prompt customizado). Documentar essa limitação.
- **Completo:** o Apps Script **não serve arquivos `.js` estáticos com escopo de raiz**, o que dificulta registrar um Service Worker próprio de forma confiável. Se offline for requisito, considerar hospedar o PWA fora do GAS (ex.: GitHub Pages/Firebase Hosting) consumindo o backend via API. Caso contrário, remover o UI de instalação para não confundir.

---

## 🟡 7. Escape de HTML inconsistente na tabela desktop
**Arquivo:** `index.html`, `fillTransacoes`, linhas 866–875.

```js
<td>${r.conta}</td>   // não escapado
<td>${r.meio}</td>    // não escapado
<td>${r.tipo}</td>    // não escapado
```

`descricao` e `obs` são escapados via `escapeHtml`, mas `conta`, `meio`, `tipo` e `data` não. Hoje o risco é baixo (vêm de `<select>`), mas é inconsistente e frágil.

**Correção:** aplicar `escapeHtml` a todos os campos de texto renderizados.

```js
<td>${escapeHtml(r.conta)}</td>
<td>${escapeHtml(r.meio)}</td>
<td>${escapeHtml(r.tipo)}</td>
```

---

## 🟡 8. Sem `LockService` em escrita concorrente
**Arquivo:** `Código.js`, `addTransacao`, linha 83 (`sh.appendRow(row)`).

Duas gravações simultâneas podem competir. Para uso pessoal o risco é baixo, mas é boa prática.

**Correção:**
```js
const lock = LockService.getScriptLock();
lock.waitLock(10000);
try {
  sh.appendRow(row);
} finally {
  lock.releaseLock();
}
```

---

## 🟡 9. Código redundante em `getResumo`
**Arquivo:** `Código.js`, linhas 149–168.

`rows` já filtra o mês, mas `totalInter/totalItau/totalContaSimples` reprocessam `vals.slice(1)` reaplicando `toYM(...) === ymTarget`. Funciona, mas percorre a planilha 3× a mais.

**Correção:** somar a partir de `rows` (já filtrado):
```js
const sumRows = (pred) => rows.reduce((a, r) => a + (pred(r) ? (Number(r[7]) || 0) : 0), 0);
const totalInter = sumRows(r => String(r[1]).toLowerCase().includes('inter'));
const totalItau  = sumRows(r => /ita[uú]/.test(String(r[1]).toLowerCase()));
const totalContaSimples = sumRows(r => String(r[1]).toLowerCase().includes('conta simples'));
```

---

## Ordem sugerida de implementação

1. **#1** (manifest quebrando) e **#2** (valores corrompidos) — impacto imediato e alto.
2. **#3** (fuso) e **#4/#5** (cálculos errados) — corrigem números incorretos.
3. **#7, #8, #9** — robustez e limpeza.
4. **#6** — decisão de escopo do PWA (mínimo vs. completo).

## Como testar após corrigir

1. No editor do Apps Script, rodar `criarEstruturaPlanilha()` (se necessário) e `testarEstrutura()`.
2. Lançar uma transação com centavos (ex.: `50,50`) e confirmar que a planilha grava `50.5`, não `505`.
3. Conferir se a data lançada bate com o dia escolhido (teste do fuso).
4. Abrir `?asset=manifest` na URL do Web App e verificar JSON válido (sem erro).
5. Validar o resumo com um gasto compartilhado conhecido e conferir reembolso com centavos.

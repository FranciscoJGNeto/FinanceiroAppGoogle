# Plano A — Front-end separado (PWA real) + Apps Script como API

**Objetivo:** resolver o "app no celular" (PWA **instalável de verdade**, com ícone,
splash e offline) com o **mínimo de reescrita**, mantendo todo o backend atual
(Google Sheets + funções do `Codigo.js`).

**Ideal para:** quem gosta da stack atual e do "dados no meu Google", mas quer a
experiência de app no celular que o `/exec` não entrega.

## Por que funciona (o que muda)

Hoje o HTML é servido **dentro de um iframe** do Apps Script → o navegador ignora o
manifest e não deixa instalar. Neste plano, o front passa a ser um **site próprio**
(domínio seu, ex.: GitHub Pages / Vercel / Netlify) — aí o **manifest e o service
worker funcionam** e o app instala como PWA. O Apps Script deixa de servir HTML e vira
só **API** (JSON via `doGet`/`doPost`).

```
ANTES:  navegador ──> /exec (HTML no iframe)  ──> Sheets
DEPOIS: PWA (seu domínio) ──fetch JSON──> /exec (API GAS) ──> Sheets
```

## Arquitetura

- **Front:** `index.html` + JS (pode ser o atual, adaptado) hospedado em
  **GitHub Pages** (grátis, combina com o repo). Adiciona:
  - `manifest.webmanifest` real (mesmo conteúdo do que hoje é gerado pelo GAS);
  - **service worker** (`sw.js`) para cache/offline (App Shell);
  - troca `google.script.run.X(args)` por `fetch()` para a API.
- **Backend (GAS como API):** `doGet(e)`/`doPost(e)` roteiam por `e.parameter.action`
  (ex.: `?action=getResumo&mes=2026-07-01`) e retornam `ContentService` JSON. As funções
  de negócio (`getResumo`, `addTransacao`, …) **não mudam**.
- **Autenticação:** este é o ponto sensível (ver "Riscos").

## Passo a passo

1. **Isolar a camada de dados no front.** Criar `api.js` com um objeto `api` que hoje
   chama `google.script.run` e amanhã chama `fetch`. Trocar todas as chamadas diretas por
   `api.getResumo(...)` etc. (refactor sem mudar comportamento).
2. **Expor a API no GAS.** Um roteador:
   ```js
   function doGet(e){ return route_(e); }
   function doPost(e){ return route_(e); }
   function route_(e){
     const p = e.parameter, action = p.action;
     const body = e.postData ? JSON.parse(e.postData.contents) : {};
     const map = { getResumo:()=>getResumo(p.mes), addTransacao:()=>addTransacao(body), /* ... */ };
     const out = map[action] ? map[action]() : { erro:'ação inválida' };
     return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
   }
   ```
3. **Publicar o front** no GitHub Pages (branch `gh-pages` ou pasta `/docs`), com
   `manifest.webmanifest` + `sw.js` + ícones. Testar "Instalar app".
4. **CORS/JSONP.** O `/exec` responde `Access-Control-Allow-Origin: *`? O `ContentService`
   **não permite setar headers** → chamadas `fetch` cross-origin sofrem com CORS.
   Contornos: **(a)** JSONP (`?callback=`) para leituras; **(b)** `mode:'no-cors'` só serve
   para "fire-and-forget"; **(c)** o mais robusto: um **proxy fino** (Cloudflare Worker
   grátis) que adiciona os headers CORS na frente do `/exec`.
5. **Service worker:** cache do App Shell (HTML/CSS/JS) para abrir offline; dados via
   rede com fallback "última resposta em cache".
6. **Migrar os testes** de front, se houver; os testes de backend continuam iguais.

## Prós

- **Reaproveita ~90% do backend** e a lógica de negócio (e os testes).
- **PWA instalável de verdade**, com offline do App Shell.
- Dados continuam **na sua planilha** (nada de migrar banco).
- Custo **zero** (GitHub Pages + GAS; Cloudflare Worker no plano grátis, se preciso).

## Contras / riscos

- **CORS do Apps Script** é a maior dor — provavelmente exige o proxy (Worker).
- **Auth fraca herdada do GAS:** com o app fora do domínio Google, garantir que só *você*
  acesse a API fica mais difícil. Opções: um **token secreto** compartilhado (simples,
  porém frágil se o front é público) ou publicar o Web App como "somente eu" e usar
  `google.script.run` só quando logado — o que conflita com o front externo. Para
  multiusuário de verdade, o Plano B (Supabase) é melhor.
- Dois lugares para publicar (front + GAS).

## Esforço estimado

🔨🔨 (médio). O grosso é: refactor da camada de dados no front, roteador no GAS e
resolver CORS. Sem migração de dados.

## Quando **não** escolher

Se você quer **login/multiusuário** ou um **banco de verdade**, pule direto para o
**[Plano B — Supabase](PLANO_ALT_SUPABASE.md)**.

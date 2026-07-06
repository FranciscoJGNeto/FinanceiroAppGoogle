<div align="center">

# 💰 Financeiro

### Controle financeiro pessoal — simples, rápido e no seu bolso

Um app web de finanças pessoais que roda **de graça** sobre uma planilha do Google,
funciona como aplicativo no celular (tela cheia) e no computador, e mantém **você**
como único dono dos seus dados.

`Google Apps Script` · `Google Sheets` · `HTML/CSS/JS` · `PWA`

</div>

---

## ✨ Por que existe

Planilha de finanças é poderosa, mas chata de preencher — principalmente no celular.
Este projeto coloca uma **interface bonita e rápida** por cima da sua planilha: você
lança um gasto em segundos, vê o resumo do mês e gráficos, e os dados continuam vivendo
na **sua** conta Google (nada de servidor de terceiros, nada de mensalidade).

## 🎯 O que ele faz

| Área | Recursos |
|------|----------|
| **Lançar** | Despesas **e** receitas · máscara de moeda · categorias · parcelas · **compartilhado com % próprio** · observações · **marcar receita como salário** |
| **Gerenciar** | Editar em **janela (modal)** · excluir · **trocar categoria e recorrência direto na lista** · busca/filtro instantâneo · **contas dinâmicas** (crie/edite as suas) |
| **Entender** | Resumo do mês (totais por conta, gasto compartilhado, reembolso, previsão de saldo, **% do salário** — baseado no salário recebido no mês) |
| **Visualizar** | Dashboard: rosca por conta · evolução de 6 meses · barras por categoria · **relatório anual** (receita × despesa por mês, top gastos) |
| **Planejar** | Orçamento por categoria (sugestões + alerta de estouro) · projeção de parcelas · **recorrentes automáticos** (lançados **no dia** em que caem) · **regra 50/30/20** (Essencial/Desejo/Poupança) |
| **Categorias** | Lista de categorias editável (criar/renomear/juntar/remover) · **regras** termo→categoria (aplicadas na hora aos existentes) · recategorizar em lote |
| **Metas** | Metas de economia **mensais** ("guardar R$ X/mês") e **totais** ("juntar R$ Y até um prazo") com barra de progresso |
| **Cartão** | **Fatura prevista por cartão** (ciclo de fechamento/vencimento), não por competência |
| **Lembretes** | Contas com vencimento → **e-mail** automático alguns dias antes (gatilho diário) |
| **Dividir** | Acerto de contas de gastos compartilhados (quanto a outra pessoa te reembolsa) |
| **Importar** | Extrato **OFX** (Nubank, Itaú, Bradesco, Inter, C6…), **QIF** ou **CSV** (colunas Débito/Crédito por banco) · **nome limpo** (extrai o estabelecimento) · **categoria por tipo** (Aplicação/Resgate→Investimentos, Pix→Transferências) · dedup |
| **Telegram** | **Lançar por mensagem** ao seu bot (ex.: "Mercado 85,90 Inter") — mantém o app privado (polling, sem webhook público) |
| **Backup** | Exportação para o Google Drive em **CSV** (Excel/Sheets) ou **XML** (estruturado) |
| **Experiência** | **App com telas** — navegação por barra inferior (celular) / menu lateral (desktop), sem recarregar · **temas claro e escuro** (neumórfico, com alternância 🌙/☀️) · troca de mês no cabeçalho com botão **"Hoje"** · atalho na tela inicial (Android/iOS) |

> 💡 **Gasto compartilhado:** marque um lançamento como compartilhado e informe o **% que a outra
> pessoa paga** — o app calcula o **reembolso** e o seu gasto real ajustado. Na importação de extrato,
> os lançamentos são **categorizados automaticamente** (por regras suas, tipo da transação, histórico e palavras-chave).

## 📸 Telas

> _(Adicione aqui prints do app — ex.: `docs/img/resumo.png`, `docs/img/dashboard.png`.)_

> 📱 **No celular:** toque em **📱** no topo do app para ver o passo a passo de
> "Adicionar à tela inicial" (cria um ícone de acesso rápido). Observação: como o app
> é servido dentro de um iframe do Apps Script, um PWA 100% instalável (offline/standalone)
> não é possível pela URL `/exec` — o atalho na tela inicial é o caminho suportado.

## 🧠 Como funciona (arquitetura)

```
┌──────────────────────────┐   google.script.run    ┌───────────────────────┐
│   frontend (navegador)   │ ─────────────────────► │  Codigo.js (servidor) │
│  index + styles + js     │ ◄───────────────────── │  regras de negócio     │
└──────────────────────────┘     (assíncrono)        └──────────┬────────────┘
                                                                 │ SpreadsheetApp
                                                                 ▼
                                                      ┌───────────────────────┐
                                                      │     Google Sheets      │
                                                      │ Transacoes · Servicos  │
                                                      │ Config · Saldos ·      │
                                                      │ Orcamentos · Lembretes │
                                                      │ Metas · Classificacao  │
                                                      └───────────────────────┘
```

- **App com telas (SPA):** os painéis são agrupados em telas trocadas por JavaScript
  (barra inferior no celular / menu lateral no desktop), **sem recarregar**. O código do
  frontend é dividido em `index.html` (estrutura), `styles.html` (CSS) e `js.html` (JS),
  unidos no servidor via `include()`.
- **Sem build, sem dependências externas** — os gráficos são SVG feitos à mão e o **tema
  escuro neumórfico** (fundo preto + textura + cifrão em relevo) é 100% inline, então
  funciona dentro do sandbox do Apps Script.
- **Robusto a mudanças na planilha:** as colunas são lidas por **nome do cabeçalho**,
  não por posição fixa. Cada transação tem um **ID** único (permite editar/excluir).
- **Privacidade:** publicado com acesso `MYSELF` — só a conta dona abre o app.

## 🗂️ Estrutura do projeto

```
FinanceiroAppGoogle/
├── README.md              # este arquivo
├── .clasp.json            # vínculo com o projeto Apps Script (rootDir: src)
├── src/                   # o que é enviado à nuvem (via clasp)
│   ├── appsscript.json    # manifesto (timezone America/Sao_Paulo, V8)
│   ├── Codigo.js          # backend
│   ├── index.html         # estrutura do frontend (inclui os parciais)
│   ├── styles.html        # CSS (via include())
│   └── js.html            # JS do frontend (via include())
├── tests/                 # suíte de testes em Node (mock do Apps Script)
│   ├── mock-sheets.js     # mock da API do Sheets + carregador do Codigo.js
│   └── run.js             # casos de teste (node tests/run.js)
└── docs/                  # documentação (não vai para a nuvem)
    ├── README.md                  # índice/mapa da documentação
    ├── CHANGELOG.md               # histórico de versões
    ├── ANALISE_PROJETO.md         # o que é o projeto
    ├── GUIA_CLASP.md              # como publicar com clasp
    ├── GUIA_TELEGRAM.md           # como configurar o bot do Telegram
    ├── planos/                    # roadmap e melhorias do produto/código
    │   ├── PLANO_FUNCIONALIDADES.md   # roadmap de recursos (Ondas 1–7, concluídas)
    │   ├── PLANO_FEATURES_FINANCEIRAS.md # próximas ondas (8+): features financeiras
    │   ├── PLANO_ALTERACOES.md        # último lote de mudanças (em ordem)
    │   ├── PLANO_MELHORIA_CODIGO.md   # evolução de arquitetura de código
    │   ├── PLANO_MELHORIA_VISUAL.md   # evolução de UI/UX
    │   └── PLANO_CORRECOES.md         # bugs corrigidos (registro)
    └── arquitetura/               # caminhos de arquitetura alternativos
        ├── PLANOS_ALTERNATIVOS.md     # índice + comparativo
        ├── PLANO_ALT_FRONT_SEPARADO.md# alt. A: PWA real + GAS como API
        ├── PLANO_ALT_SUPABASE.md      # alt. B: Postgres + Auth + multiusuário
        ├── PLANO_ALT_LOCALFIRST.md    # alt. C: PWA offline (IndexedDB/Dexie)
        └── PLANO_MIGRACAO_PGLITE.md   # alt. D: Postgres WASM no navegador
```

Um índice navegável de toda a documentação está em [docs/README.md](docs/README.md).

## 🚀 Rodar / publicar

Pré-requisitos: **Node.js** e o **[clasp](https://github.com/google/clasp)** (`npm i -g @google/clasp`),
autenticado com `clasp login`. Passo a passo completo em [docs/GUIA_CLASP.md](docs/GUIA_CLASP.md).

```powershell
clasp push                                   # envia src/ para o Apps Script
clasp create-version "descrição da mudança"  # cria uma versão imutável
clasp redeploy <DEPLOYMENT_ID> -V <n> -d "descrição"  # publica na mesma URL
```

Primeira vez? Rode a função **`criarEstruturaPlanilha`** no editor do Apps Script para
criar as abas automaticamente. Já tem uma planilha? Rode **`migrarEstrutura`** uma vez
para adicionar as colunas novas (ID, categorias etc.) sem perder dados.

## 🧪 Testes

O backend tem uma suíte de testes que roda em **Node**, com a API do Google Apps
Script **mockada** — ou seja, valida a lógica **sem tocar em nenhuma planilha real**.

```bash
node tests/run.js
```

São **187 checagens** cobrindo parsing de valores, mapeamento por cabeçalho, resumo,
CRUD, categorias, evolução, **relatório anual**, orçamentos (com sugestões), projeção de
parcelas, **recorrentes (só materializam quando o dia chega)**, **metas**, **fatura de cartão**,
**regra 50/30/20**, acerto de contas, importação (nome limpo/categoria por tipo/dedup),
**regras e gerenciamento de categorias** (aplicar/renomear/juntar), **salário derivado**,
lembretes e backup (CSV/XML). Sai com código ≠ 0 se algo falhar (pronto para CI).

## 🛠️ Stack

- **Google Apps Script (V8)** — backend serverless e Web App
- **Google Sheets** — banco de dados
- **HTML + CSS + JavaScript puro** — frontend (sem framework, sem build)
- **SVG inline** — gráficos, com paleta acessível (validada para daltônicos)
- **clasp + Git/GitHub** — versionamento e deploy

## 🧭 Roadmap

- ✅ **Onda 1** — editar/excluir, receitas, busca
- ✅ **Onda 2** — categorias e dashboard com gráficos
- ✅ **Onda 3** — orçamentos (com sugestões/alerta), projeção de parcelas, recorrentes
- ✅ **Onda 4–5** — acerto de contas · contas dinâmicas · backup CSV/XML · importar OFX/CSV · lembretes (e-mail)
- ✅ **Onda 6** — instalar na tela inicial · **app com telas (navegação)** · **tema escuro neumórfico** · troca de mês com botão "Hoje"
- ✅ **Onda 7 (completa)** — recorrentes automáticos · metas de economia · relatório anual · fatura de cartão · regra 50/30/20 · importar QIF/CSV por banco · backup agendado · **bot do Telegram** (lançar por mensagem)
- ✅ **Polimento (v40–v49)** — toasts/skeleton/a11y · **design tokens** · **tema claro** (🌙/☀️) · importação OFX com **nome limpo + categoria por tipo** · **regras e gerenciador de categorias** (criar/renomear/juntar; regra aplica na hora) · **editar categoria/recorrência na lista** · **modal de edição** · **recorrentes lançados no dia** · **receita marcada como salário**
- 🔮 **Onda 8+ (planejado)** — patrimônio líquido, dívidas, reserva de emergência, comparativos, alertas de gasto incomum, radar de assinaturas… em [docs/planos/PLANO_FEATURES_FINANCEIRAS.md](docs/planos/PLANO_FEATURES_FINANCEIRAS.md)
- 🧭 **Arquitetura** — caminhos para PWA instalável de verdade, multiusuário e offline em [docs/arquitetura/](docs/arquitetura/)

Roadmap detalhado (com a versão de cada entrega) em [docs/planos/PLANO_FUNCIONALIDADES.md](docs/planos/PLANO_FUNCIONALIDADES.md).
Histórico do que já foi entregue em [docs/CHANGELOG.md](docs/CHANGELOG.md).

## 📄 Licença / uso

Projeto pessoal. Sinta-se à vontade para se inspirar. Os dados financeiros ficam na
planilha do Google do usuário — **este repositório contém apenas o código.**

<div align="center">
<sub>Feito com ☕ e planilha — porque controle financeiro não precisa ser chato.</sub>
</div>

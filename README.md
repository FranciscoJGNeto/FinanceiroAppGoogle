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
| **Lançar** | Despesas **e** receitas · máscara de moeda (é só digitar números) · categorias com sugestões · parcelas · observações |
| **Gerenciar** | Editar e excluir qualquer lançamento · busca/filtro instantâneo por descrição, conta, categoria… |
| **Entender** | Resumo do mês (totais por conta, gasto compartilhado, reembolso, previsão de saldo, % do salário) |
| **Visualizar** | Dashboard com gráficos: rosca por conta · evolução de 6 meses · barras por categoria |
| **Planejar** | Orçamento por categoria, com barra de progresso (verde / âmbar / vermelho) |
| **Experiência** | Painéis em acordeão que lembram o estado · atualização automática · instalável na tela inicial (Android/iOS) |

> 💡 **Gasto compartilhado:** marque serviços que você divide com alguém (ex.: streamings)
> e o app calcula automaticamente o **reembolso** e o seu gasto real ajustado.

## 📸 Telas

> _(Adicione aqui prints do app — ex.: `docs/img/resumo.png`, `docs/img/dashboard.png`.
> No celular: menu do navegador → "Adicionar à tela inicial" para virar um app.)_

## 🧠 Como funciona (arquitetura)

```
┌──────────────────────────┐   google.script.run    ┌───────────────────────┐
│  index.html (navegador)  │ ─────────────────────► │  Código.js (servidor) │
│  UI + gráficos SVG       │ ◄───────────────────── │  regras de negócio     │
└──────────────────────────┘     (assíncrono)        └──────────┬────────────┘
                                                                 │ SpreadsheetApp
                                                                 ▼
                                                      ┌───────────────────────┐
                                                      │     Google Sheets      │
                                                      │ Transacoes · Servicos  │
                                                      │ Config · Saldos ·      │
                                                      │ Orcamentos             │
                                                      └───────────────────────┘
```

- **Sem build, sem dependências externas** — os gráficos são SVG feitos à mão, então
  funciona dentro do sandbox do Apps Script e offline (na tela inicial).
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
│   ├── Código.js          # backend
│   └── index.html         # frontend (UI + JS)
└── docs/                  # documentação (não vai para a nuvem)
    ├── CHANGELOG.md               # histórico de versões
    ├── ANALISE_PROJETO.md         # o que é o projeto
    ├── PLANO_FUNCIONALIDADES.md   # roadmap de recursos
    ├── PLANO_MELHORIA_CODIGO.md   # evolução de arquitetura
    ├── PLANO_MELHORIA_VISUAL.md   # evolução de UI/UX
    ├── PLANO_CORRECOES.md         # bugs corrigidos (registro)
    ├── PLANO_MIGRACAO_PGLITE.md   # estudo: sair do Sheets p/ Postgres WASM
    └── GUIA_CLASP.md              # como publicar com clasp
```

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

## 🛠️ Stack

- **Google Apps Script (V8)** — backend serverless e Web App
- **Google Sheets** — banco de dados
- **HTML + CSS + JavaScript puro** — frontend (sem framework, sem build)
- **SVG inline** — gráficos, com paleta acessível (validada para daltônicos)
- **clasp + Git/GitHub** — versionamento e deploy

## 🧭 Roadmap

- ✅ **Onda 1** — editar/excluir, receitas, busca
- ✅ **Onda 2** — categorias e dashboard com gráficos
- 🔜 **Onda 3** — orçamentos (feito) · lançamentos recorrentes automáticos · projeção de parcelas
- 🔮 **Futuro** — acerto de contas compartilhadas, lembretes, importar extrato, bot de lançamento

Detalhes e ideias em [docs/PLANO_FUNCIONALIDADES.md](docs/PLANO_FUNCIONALIDADES.md).
Histórico do que já foi entregue em [docs/CHANGELOG.md](docs/CHANGELOG.md).

## 📄 Licença / uso

Projeto pessoal. Sinta-se à vontade para se inspirar. Os dados financeiros ficam na
planilha do Google do usuário — **este repositório contém apenas o código.**

<div align="center">
<sub>Feito com ☕ e planilha — porque controle financeiro não precisa ser chato.</sub>
</div>

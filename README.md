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
| **Lançar** | Despesas **e** receitas · máscara de moeda · categorias · parcelas · **compartilhado com % próprio** · observações |
| **Gerenciar** | Editar e excluir qualquer lançamento · busca/filtro instantâneo · **contas dinâmicas** (crie/edite as suas) |
| **Entender** | Resumo do mês (totais por conta, gasto compartilhado, reembolso, previsão de saldo, % do salário) |
| **Visualizar** | Dashboard com gráficos: rosca por conta · evolução de 6 meses · barras por categoria |
| **Planejar** | Orçamento por categoria (com sugestões e alerta de estouro) · projeção de parcelas · **recorrentes automáticos** (gatilho mensal) |
| **Metas** | Metas de economia **mensais** ("guardar R$ X/mês") e **totais** ("juntar R$ Y até um prazo") com barra de progresso |
| **Cartão** | **Fatura prevista por cartão** (ciclo de fechamento/vencimento), não por competência |
| **Lembretes** | Contas com vencimento → **e-mail** automático alguns dias antes (gatilho diário) |
| **Dividir** | Acerto de contas de gastos compartilhados (quanto a outra pessoa te reembolsa) |
| **Importar** | Extrato **OFX** (padrão dos apps de banco — Nubank, Itaú, Bradesco, Inter, C6…) **ou CSV** · detecção automática do formato · dedup · auto-categorização |
| **Backup** | Exportação para o Google Drive em **CSV** (Excel/Sheets) ou **XML** (estruturado) |
| **Experiência** | **App com telas** — navegação por barra inferior (celular) / menu lateral (desktop), sem recarregar · atualização automática · atalho na tela inicial (Android/iOS) |

> 💡 **Gasto compartilhado:** marque um lançamento como compartilhado e informe o **% que a outra
> pessoa paga** — o app calcula o **reembolso** e o seu gasto real ajustado. Na importação de extrato,
> os lançamentos são **categorizados automaticamente** (pelo histórico e por palavras-chave).

## 📸 Telas

> _(Adicione aqui prints do app — ex.: `docs/img/resumo.png`, `docs/img/dashboard.png`.)_

> 📱 **No celular:** toque em **📱** no topo do app para ver o passo a passo de
> "Adicionar à tela inicial" (cria um ícone de acesso rápido). Observação: como o app
> é servido dentro de um iframe do Apps Script, um PWA 100% instalável (offline/standalone)
> não é possível pela URL `/exec` — o atalho na tela inicial é o caminho suportado.

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
│   ├── index.html         # estrutura do frontend (inclui os parciais)
│   ├── styles.html        # CSS (via include())
│   └── js.html            # JS do frontend (via include())
├── tests/                 # suíte de testes em Node (mock do Apps Script)
│   ├── mock-sheets.js     # mock da API do Sheets + carregador do Código.js
│   └── run.js             # casos de teste (node tests/run.js)
└── docs/                  # documentação (não vai para a nuvem)
    ├── README.md                  # índice/mapa da documentação
    ├── CHANGELOG.md               # histórico de versões
    ├── ANALISE_PROJETO.md         # o que é o projeto
    ├── GUIA_CLASP.md              # como publicar com clasp
    ├── planos/                    # roadmap e melhorias do produto/código
    │   ├── PLANO_FUNCIONALIDADES.md   # roadmap de recursos (Ondas 1–7)
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

São **68 checagens** cobrindo parsing de valores, mapeamento por cabeçalho, resumo,
CRUD, categorias, evolução, orçamentos (com sugestões), projeção de parcelas,
recorrentes, acerto de contas, importação (dedup/auto-categoria), lembretes e
backup (CSV/XML). Sai com código ≠ 0 se algo falhar (pronto para CI).

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
- ✅ **Onda 6** — instalar na tela inicial · recolher/expandir tudo · **app com telas (navegação)**
- 🔄 **Onda 7 (em andamento)** — ✅ recorrentes automáticos · ✅ metas de economia · ✅ relatório anual · ✅ fatura de cartão · ⏳ 50/30/20 · QIF/CSV por banco · backup agendado · bot Telegram
- 🧭 **Arquitetura** — caminhos para PWA instalável de verdade, multiusuário e offline em [docs/arquitetura/](docs/arquitetura/)

Roadmap detalhado (com a versão de cada entrega) em [docs/planos/PLANO_FUNCIONALIDADES.md](docs/planos/PLANO_FUNCIONALIDADES.md).
Histórico do que já foi entregue em [docs/CHANGELOG.md](docs/CHANGELOG.md).

## 📄 Licença / uso

Projeto pessoal. Sinta-se à vontade para se inspirar. Os dados financeiros ficam na
planilha do Google do usuário — **este repositório contém apenas o código.**

<div align="center">
<sub>Feito com ☕ e planilha — porque controle financeiro não precisa ser chato.</sub>
</div>

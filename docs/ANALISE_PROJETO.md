# Análise do Projeto — Financeiro

> **Atualizado para a v49.** A evolução versão a versão está no [CHANGELOG.md](CHANGELOG.md);
> o roadmap com a versão de cada entrega em [planos/PLANO_FUNCIONALIDADES.md](planos/PLANO_FUNCIONALIDADES.md).

## O que é o projeto

Um **aplicativo web de controle financeiro pessoal** sobre **Google Apps Script (GAS)**,
com uma **Google Sheets** como banco de dados. É publicado como Web App (`doGet`) e serve
um app de página única, responsivo (celular e desktop), com **navegação por telas** (barra
inferior no celular / menu lateral no desktop) e **temas claro e escuro** neumórficos (fundo
com textura de papel e um cifrão em relevo ao fundo; alternância 🌙/☀️ com persistência). Tem
atalho de "adicionar à tela inicial". Acesso `MYSELF` (só a conta dona abre).

## Arquitetura

```
┌────────────────────────┐        google.script.run        ┌─────────────────────┐
│  frontend (3 arquivos) │  ─────────────────────────────► │  Codigo.js (backend)│
│  index + styles + js    │  ◄───────────────────────────── │  regras de negócio   │
└────────────────────────┘        (callbacks async)         └──────────┬──────────┘
                                                                        │ SpreadsheetApp
                                                                        ▼
                                  Transacoes · Servicos · Config · Saldos · Orcamentos ·
                                  Lembretes · Metas · Classificacao   (Google Sheets)
```

O frontend é dividido em **`index.html`** (estrutura), **`styles.html`** (CSS) e
**`js.html`** (JS), servidos juntos via `HtmlService.createTemplateFromFile('index')`
+ `include()` — o usuário recebe um único HTML.

### Backend — `Codigo.js`
Colunas lidas por **nome de cabeçalho** (não por índice) e config por **chave** (não célula
fixa). Principais grupos de funções:

| Grupo | Funções |
|-------|---------|
| Web | `doGet` (serve HTML + manifest) |
| Transações | `addTransacao`, `updateTransacao`, `deleteTransacao`, `listTransacoes`, `setCategoriaTransacao`, `setTipoTransacao` (edição rápida por ID) |
| Resumo/visão | `getResumo`, `getEvolucao`, `getPorCategoria`, `getRelatorioAnual`, `getCompartilhados`, `getProjecaoParcelas` |
| Recorrentes | `gerarRecorrentes` (só materializa data ≤ hoje) + gatilho **diário** (`verificarRecorrentes`, `instalar/remover/statusGatilhoRecorrentes`) |
| Orçamentos | `getOrcamentos`, `setOrcamento`, `deleteOrcamento`, `getSugestoesOrcamento` |
| Metas | `getMetas`, `setMeta`, `deleteMeta` |
| Contas / Cartão | `getContas`, `setConta`, `deleteConta`, `getFaturaCartao` |
| 50/30/20 | `getRegra503020`, `getClassificacao`, `setClasseCategoria` |
| Lembretes | `getLembretes`, `setLembrete`, `deleteLembrete`, `verificarLembretes` + gatilho diário |
| Import/Backup | `importarTransacoes`, `exportarBackup` (CSV), `exportarBackupXML` + **backup agendado** (`backupAgendado` + gatilho semanal/mensal) |
| Categorização | `categorizarAuto_` (regras → tipo → histórico → keywords), `getRegras`/`setRegra` (aplica às existentes)/`deleteRegra`, `recategorizar`, `getCategorias`/`setCategoria`/`deleteCategoria` (aba Categorias), `renomearCategoria` |
| Telegram | `parseLancamentoMsg_`, `get/setConfigTelegram`, `verificarTelegram` + gatilho de 1 min (polling via `UrlFetchApp`) |
| Setup | `criarEstruturaPlanilha`, `migrarEstrutura`, `testarEstrutura`, `include` |

### Frontend — `index.html` + `styles.html` + `js.html`
**Navegação por telas** (SPA): os painéis são agrupados em 5 telas trocadas por JavaScript,
**sem recarregar** — barra inferior no celular, menu lateral (sidebar) no desktop. O estado
(tela ativa) é lembrado.

| Tela | Painéis |
|------|---------|
| 🏠 Início | Resumo do mês + saldos por conta |
| ➕ Lançar | Novo lançamento (+ "é salário" nas receitas) + Transações do mês (categoria/recorrência editáveis na lista; **editar em modal**) |
| 📊 Análise | Gráficos, Relatório anual, Parcelas futuras, Fatura de cartão, Compartilhado |
| 🎯 Planejar | Orçamentos, Metas, Regra 50/30/20, Lembretes |
| ⚙️ Config | Contas, Backup (+ agendado), Bot do Telegram, Importar extrato, Categorias & Regras (gerenciar/renomear/juntar) |

No **cabeçalho** (visível em qualquer tela): navegação de mês (‹ › + rótulo) com botão
**"Hoje"** para voltar ao mês atual, botão de instalar e alternância de **tema 🌙/☀️**. Recursos
de UI: **temas claro e escuro** neumórficos (textura + cifrão em relevo, superfícies
translúcidas, design tokens), toasts, skeleton loading, `:focus-visible`, responsividade
(breakpoint 900px), barra de "Salvar" fixa na tela Lançar (mobile), máscara de moeda, atalho
`Ctrl+Enter`, gráficos SVG com paleta acessível e escape de HTML.

## Modelo de dados (abas da planilha)

- **Transacoes** — `ID | Data | Conta | Meio | Descrição | Tipo | Natureza | Categoria | Compartilhado | Rateio | ParcelaAtual | ParcelaTotal | Valor | Observação | CriadoEm`
- **Servicos** — `Nome | Compartilhado | Rateio` (compartilhamento por nome — legado).
- **Config** — pares chave/valor (salário, % reembolso padrão) lidos **por chave**.
- **Saldos** — `Conta | Saldo | Fechamento | Vencimento | DataSaldo` (contas dinâmicas; `Saldo` = **saldo inicial** na `DataSaldo`; fechamento/vencimento opcionais para a fatura).
- **Orcamentos** — `Categoria | Limite`.
- **Lembretes** — `Descrição | Dia | Valor | Antecedencia | Ativo | UltimoAviso`.
- **Metas** — `ID | Descrição | Tipo | Alvo | Prazo | CriadoEm`.
- **Classificacao** — `Categoria | Classe` (Essencial/Desejo/Poupança, para a regra 50/30/20).
- **Regras** — `Termo | Categoria` (auto-categorização: descrição contém o termo → categoria).
- **Categorias** — `Nome` (categorias custom criadas pelo usuário; somam-se às embutidas/usadas).

## Regras de negócio embutidas

- **Gasto compartilhado:** por **flag + % rateio do próprio lançamento** (v22), com
  compatibilidade para o compartilhado por nome de serviço (aba `Servicos`).
- **Reembolso:** soma do rateio de cada item compartilhado — o que a outra pessoa devolve.
- **Total ajustado:** `totalGeral − reembolso` (gasto real).
- **% do salário:** `totalAjustado / salário`.
- **Saldo (derivado):** por conta, `saldoInicial + (receitas − despesas até a data) − (líquido até a DataSaldo)`. **Saldo Atual** = hoje; **Previsão Final** = fim do mês visto (encadeia entre meses). Sem `DataSaldo`, o valor é o saldo de hoje.
- **Recorrentes:** materializados **no dia em que caem** (data ≤ hoje) — gatilho diário + ao abrir o app, idempotente. Os do futuro não são antecipados.
- **Salário:** se houver receitas com categoria **Salário** no mês, a soma delas é a base do `% do salário`; senão, usa o valor da Config.
- **Economia (metas):** `receitas − despesas` (do mês ou acumulada até um prazo).

## Público / uso

Ferramenta pessoal (single-user), pensada primariamente para o **celular**, com desktop
como visão secundária.

## Limitações estruturais (por design)

- **Sem PWA instalável de verdade / offline:** o app roda num iframe sandbox do Apps
  Script, então não há Service Worker — só "adicionar à tela inicial". Caminhos para
  resolver em [arquitetura/PLANOS_ALTERNATIVOS.md](arquitetura/PLANOS_ALTERNATIVOS.md).
- **Sem multiusuário/auth própria:** depende do acesso do Web App do GAS (`MYSELF`).
- **Planilha como banco:** simples e sem custo, mas não escala para volumes grandes.

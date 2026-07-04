# Análise do Projeto — Financeiro

> **Atualizado para a v28.** A evolução versão a versão está no [CHANGELOG.md](CHANGELOG.md);
> o roadmap com a versão de cada entrega em [planos/PLANO_FUNCIONALIDADES.md](planos/PLANO_FUNCIONALIDADES.md).

## O que é o projeto

Um **aplicativo web de controle financeiro pessoal** sobre **Google Apps Script (GAS)**,
com uma **Google Sheets** como banco de dados. É publicado como Web App (`doGet`) e serve
uma interface única em HTML, responsiva (celular e desktop), com atalho de "adicionar à
tela inicial". Acesso `MYSELF` (só a conta dona abre).

## Arquitetura

```
┌────────────────────────┐        google.script.run        ┌─────────────────────┐
│  index.html (frontend) │  ─────────────────────────────► │  Código.js (backend)│
│  UI + gráficos SVG      │  ◄───────────────────────────── │  regras de negócio   │
└────────────────────────┘        (callbacks async)         └──────────┬──────────┘
                                                                        │ SpreadsheetApp
                                                                        ▼
                                            Transacoes · Servicos · Config · Saldos ·
                                            Orcamentos · Lembretes · Metas  (Google Sheets)
```

### Backend — `Código.js`
Colunas lidas por **nome de cabeçalho** (não por índice) e config por **chave** (não célula
fixa). Principais grupos de funções:

| Grupo | Funções |
|-------|---------|
| Web | `doGet` (serve HTML + manifest) |
| Transações | `addTransacao`, `updateTransacao`, `deleteTransacao`, `listTransacoes` |
| Resumo/visão | `getResumo`, `getEvolucao`, `getPorCategoria`, `getRelatorioAnual`, `getCompartilhados`, `getProjecaoParcelas` |
| Recorrentes | `gerarRecorrentes` + gatilho mensal (`verificarRecorrentes`, `instalar/remover/statusGatilhoRecorrentes`) |
| Orçamentos | `getOrcamentos`, `setOrcamento`, `deleteOrcamento`, `getSugestoesOrcamento` |
| Metas | `getMetas`, `setMeta`, `deleteMeta` |
| Contas | `getContas`, `setConta`, `deleteConta` |
| Lembretes | `getLembretes`, `setLembrete`, `deleteLembrete`, `verificarLembretes` + gatilho diário |
| Import/Backup | `importarTransacoes`, `exportarBackup` (CSV), `exportarBackupXML` |
| Setup | `criarEstruturaPlanilha`, `migrarEstrutura`, `testarEstrutura` |

### Frontend — `index.html`
Página única em painéis **acordeão** (estado lembrado; botão de recolher/expandir tudo):
Resumo, Análise (gráficos SVG), Relatório anual, Parcelas futuras, Compartilhado, Contas,
Backup, Importar extrato, Lembretes, Metas, Novo lançamento, Transações e Orçamentos.
Recursos de UI: tema escuro, responsividade (breakpoint 900px), barra de ação fixa no
mobile, máscara de moeda, atalho `Ctrl+Enter`, gráficos SVG com paleta acessível e escape
de HTML nos dados de texto.

## Modelo de dados (abas da planilha)

- **Transacoes** — `ID | Data | Conta | Meio | Descrição | Tipo | Natureza | Categoria | Compartilhado | Rateio | ParcelaAtual | ParcelaTotal | Valor | Observação | CriadoEm`
- **Servicos** — `Nome | Compartilhado | Rateio` (compartilhamento por nome — legado).
- **Config** — pares chave/valor (salário, % reembolso padrão) lidos **por chave**.
- **Saldos** — `Conta | Saldo` (contas dinâmicas + saldo por conta).
- **Orcamentos** — `Categoria | Limite`.
- **Lembretes** — `Descrição | Dia | Valor | Antecedencia | Ativo | UltimoAviso`.
- **Metas** — `ID | Descrição | Tipo | Alvo | Prazo | CriadoEm`.

## Regras de negócio embutidas

- **Gasto compartilhado:** por **flag + % rateio do próprio lançamento** (v22), com
  compatibilidade para o compartilhado por nome de serviço (aba `Servicos`).
- **Reembolso:** soma do rateio de cada item compartilhado — o que a outra pessoa devolve.
- **Total ajustado:** `totalGeral − reembolso` (gasto real).
- **% do salário:** `totalAjustado / salário`.
- **Previsão final:** `saldoAtual + salário − totalAjustado`.
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

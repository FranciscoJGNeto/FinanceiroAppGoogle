# Análise do Projeto — Financeiro (Francisco)

## O que é o projeto

É um **aplicativo web de controle financeiro pessoal** construído sobre **Google Apps Script (GAS)**, usando uma **Google Sheets** (planilha) como banco de dados. Ele é publicado como Web App (`doGet`) e serve uma interface única em HTML que se comporta como PWA (Progressive Web App), com layout responsivo (celular e desktop).

- **Link do projeto:** https://script.google.com/home/projects/1uQRTmDmcLXq5Bk-tq98u7ZpBQJYCh2mknHR-r9b4SgKIvlEj8j4kFqR1/edit

## Arquitetura

```
┌────────────────────────┐        google.script.run        ┌─────────────────────┐
│  index.html (frontend) │  ─────────────────────────────► │  Código.js (backend)│
│  UI + JS no navegador   │  ◄───────────────────────────── │  funções server-side│
└────────────────────────┘        (callbacks async)         └──────────┬──────────┘
                                                                        │ SpreadsheetApp
                                                                        ▼
                                                              ┌─────────────────────┐
                                                              │   Google Sheets     │
                                                              │  Transacoes/Servicos│
                                                              │  Config/Saldos      │
                                                              └─────────────────────┘
```

### Backend — `Código.js`
Funções principais:

| Função | Papel |
|--------|-------|
| `doGet(e)` | Ponto de entrada do Web App. Serve o `index.html` e, se `?asset=manifest`, devolve o manifest PWA em JSON. |
| `addTransacao(t)` | Insere uma nova transação (linha) na aba `Transacoes`. |
| `listTransacoes(mesISO)` | Lista as transações de um mês específico. |
| `getResumo(mesISO)` | Calcula o resumo do mês: totais por conta, gastos compartilhados, reembolso, % do salário, saldo atual e previsão de saldo final. |
| `testarEstrutura()` | Utilitário de debug — confere se as abas existem. |
| `criarEstruturaPlanilha()` | Cria as abas e cabeçalhos padrão caso não existam (setup inicial). |

### Frontend — `index.html`
Página única com três seções:
1. **Resumo do mês** — KPIs (Total Inter, Itaú, Geral, Compartilhado, Reembolso, Ajustado, Saldo, Previsão, Salário).
2. **Novo lançamento** — formulário de entrada de transação.
3. **Transações do mês** — lista em cartões (mobile) e tabela (desktop).

Recursos de UI: tema escuro, responsividade (breakpoint 900px), barra de ação fixa no mobile, atalho `Ctrl+Enter` para salvar, prompt de instalação PWA e escape de HTML para dados de texto.

## Modelo de dados (abas da planilha)

- **Transacoes** — `Data | Conta | Meio | Descrição | Tipo | ParcelaAtual | ParcelaTotal | Valor | Observação`
- **Servicos** — `Nome | Compartilhado | Rateio` (define quais gastos são divididos).
- **Config** — pares chave/valor; `B3` = salário líquido, `B5` = % de reembolso padrão (rateio).
- **Saldos** — `Conta | Saldo` (somados para o saldo atual).

## Regras de negócio embutidas

- **Gasto compartilhado:** transação cuja descrição casa com um serviço marcado como "Compartilhado" na aba `Servicos`.
- **Reembolso:** `totalCompartilhado × rateio` (metade, por padrão) — o que a outra pessoa devolve.
- **Total ajustado:** `totalGeral − reembolso` (o gasto real do Francisco).
- **% do salário:** `totalAjustado / salário`.
- **Previsão final:** `saldoAtual + salário − totalAjustado`.

## Público / uso

Ferramenta pessoal (single-user), pensada primariamente para uso no celular como app instalável, com desktop como visão secundária.

## Limitações estruturais (por design)

- Depende inteiramente da estrutura fixa da planilha (posições de célula como `B3`/`B5` são "mágicas").
- Sem autenticação própria — depende da configuração de acesso do Web App do GAS.
- Sem edição/exclusão de transações — apenas inserção e leitura.
- PWA incompleto: não há Service Worker, então não há funcionamento offline nem instalação real confiável (ver plano de correções).

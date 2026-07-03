# Histórico de mudanças

Versões referem-se às implantações publicadas no Apps Script (`clasp` → `redeploy`).
O código está versionado no GitHub (privado) e sincronizado com o Apps Script.

## v16 — Recorrentes (modo manual) — Onda 3 concluída
- Botão **Gerar recorrentes deste mês**: replica os lançamentos "Recorrente" de meses anteriores no mês atual.
- **Anti-duplicação e idempotente:** não recria itens que já existem no mês (pode clicar várias vezes).
- Usa a ocorrência mais recente de cada recorrente; ajusta o dia ao mês (clamp).
- Backend: `gerarRecorrentes(mesISO)`. (Modo automático por gatilho fica como opção futura.)

## v15 — Projeção de parcelas (Onda 3)
- Painel **Parcelas futuras**: mostra parcelas em aberto (Parcelado com parcela atual < total).
- Total ainda a pagar + gráfico do valor **comprometido nos próximos 6 meses**.
- Backend: `getProjecaoParcelas(mesISO, meses)` (só leitura/cálculo).

## v14 — Sanitização para repositório público
- Removidos dados pessoais dos valores-semente: salário e saldos zerados em `criarEstruturaPlanilha` (só afetam a criação de planilha nova).
- Removido e-mail pessoal e valor de salário de exemplo na documentação.

## v13 — Orçamento intuitivo: sugestões e alerta
- **Sugestões de orçamento** por categoria (média dos últimos 3 meses), com **Aplicar** ou **Rejeitar** (rejeição lembrada por dispositivo).
- **Alerta ao estourar:** ao salvar um gasto que passa do limite da categoria, o app pergunta — **aplicar mesmo assim** ou **rejeitar** o lançamento.
- Backend: `getSugestoesOrcamento(mesISO, meses)`.

## v12 — Orçamento por categoria (Onda 3)
- Nova aba **Orcamentos** (auto-criada).
- Painel **Orçamentos**: definir limite mensal por categoria (máscara de moeda).
- Barra **gasto / limite** colorida (verde < 80%, âmbar ≤ 100%, vermelho > 100%).
- Editar/remover orçamento; usa o gasto real do mês.
- Backend: `getOrcamentos`, `setOrcamento` (upsert), `deleteOrcamento`.

## v11 — Categorias (Onda 2 concluída)
- Coluna **Categoria** (auto-criada); gravada ao adicionar/editar.
- Campo Categoria no formulário com sugestões (datalist).
- Gráfico **Despesas por categoria** (barras horizontais, top 6 + "Outros").
- Pill de categoria nos cards e na tabela; busca considera categoria.
- Backend: `getPorCategoria(mesISO)`.

## v10 — Correção dos gráficos
- Bug: `fill="var(--…)"` não resolve em atributo SVG → barras e número central ficavam invisíveis. Trocado por cores literais.

## v9 — Auto-update + Dashboard (Onda 2)
- Troca de mês atualiza automaticamente (sem botão).
- Painel **Análise** (acordeão) com rosca (despesas por conta) e barras (evolução 6 meses).
- Paleta categórica validada para daltônicos (skill dataviz).
- Backend: `getEvolucao(mesISO, meses)`.

## v8 — Acordeões
- Painéis Resumo, Lançamento e Transações recolhíveis (clique/teclado), com estado lembrado por painel (localStorage).

## v7 — UX do formulário
- Máscara de moeda (digita números → formata R$).
- Toggle Despesa/Receita; parcelas só aparecem quando Tipo = Parcelado.
- Teclados/atributos adequados no mobile.

## v6 — Editar/excluir, receitas e busca (Onda 1)
- `updateTransacao` / `deleteTransacao` por ID; botões editar/excluir na lista.
- Lançamento de **receitas** (não só despesas); separação despesa/receita no resumo.
- Busca/filtro client-side; KPI de Receitas; barra de progresso do % do salário.

## v5 — Fundação
- Mapeamento de colunas por **cabeçalho** (não por índice fixo).
- Coluna **ID** (UUID) + **CriadoEm**; `migrarEstrutura()` para planilhas existentes.
- Validação server-side; leitura de Config por **chave** (não célula fixa).

## v4 — Correções de bugs
- Valor decimal corrompido (`50,50` virava `505`).
- Off-by-one de fuso na data; `setHeaders` inválido no manifest.
- Reembolso perdendo centavos; falso positivo de compartilhado com descrição vazia.
- `LockService` no append; escape de HTML consistente.

## Antes (estado inicial)
- App original em Apps Script + Google Sheets: lançar despesas, resumo por conta, compartilhados/reembolso, previsão de saldo.
- Reorganização em `src/` + `docs/`, vínculo `clasp`, Git e GitHub.

# Plano de Funcionalidades — Soluções para um App de Finanças Pessoais

> **Status (jul/2026, v27):** ✅ Ondas 1–6 concluídas + Onda 7 em andamento (7.1 e 7.2 prontas).
> Cada item concluído abaixo traz a **versão** entre parênteses — ex.: `✅ (v6)`. Essa versão é a
> seção correspondente no **[CHANGELOG.md](../CHANGELOG.md)** (organizado por `## vNN`), onde está
> descrito o que mudou. Itens pendentes trazem o número do item da **Onda 7** (ex.: `⏳ (7.4)`).
>
> **Próximos passos em ordem:** ver **[Onda 7 — sequência de execução](#onda-7--próximos-passos-em-ordem-de-execução)** no fim deste documento.
> Para mudanças de arquitetura (PWA instalável de verdade, multiusuário, offline), ver os
> **[planos alternativos](../arquitetura/PLANOS_ALTERNATIVOS.md)** além do [PLANO_MIGRACAO_PGLITE.md](../arquitetura/PLANO_MIGRACAO_PGLITE.md).

Ideias de recursos que fazem sentido para o processo financeiro pessoal, considerando o que o app já faz (lançar gastos, resumo por conta, gastos compartilhados com reembolso, previsão de saldo). Priorizadas por **valor × esforço**.

Legenda: ⭐ valor · 🔨 esforço (mais martelos = mais trabalho)

---

## Nível 1 — Fundamentos que faltam (alto valor, baixo esforço)

### 1.1 Editar e excluir lançamentos ✅ (v6)
Hoje só dá para inserir. Errou o valor? Não tem como corrigir sem abrir a planilha. Depende de ID por linha (ver plano de código A2/B2). — **Feito na v6** (`updateTransacao`/`deleteTransacao` por ID).

### 1.2 Registrar entradas (receitas), não só gastos ✅ (v6)
Atualmente só despesas. Adicionar tipo "Entrada" (salário, extras, reembolsos recebidos) para um fluxo de caixa real, não só a soma de gastos. — **Feito na v6** (natureza Despesa/Receita).

### 1.3 Categorias ✅ (v11; auto-categorização v22)
Campo Categoria (Moradia, Alimentação, Transporte, Assinaturas, Lazer...). Base para orçamento e gráficos. Sugerir categoria automaticamente pela descrição (memória do que já foi categorizado). — **v11** coluna Categoria + gráfico; **v22** auto-categorização na importação.

### 1.4 Busca e filtros na lista ✅ (v6)
Filtrar por conta, categoria, texto, faixa de valor. Essencial quando o mês tem muitos lançamentos. — **Feito na v6** (busca/filtro client-side).

---

## Nível 2 — Automação do processo financeiro (alto valor, médio esforço)

### 2.1 Lançamentos recorrentes ✅ (v16 manual; v26 automático)
Hoje "Recorrente"/"Anual" são só rótulos. Criar um **gatilho de tempo** que gera automaticamente as recorrências do mês (assinaturas, aluguel, etc.). Elimina digitação repetida. — **v16** botão manual; **v26** gatilho mensal automático (Onda 7.1).

### 2.2 Projeção de parcelas futuras ✅ (v15)
Ao lançar um "Parcelado 3/12", projetar as 9 parcelas restantes nos próximos meses (ou calcular o comprometimento futuro). Mostra quanto do orçamento já está "preso". — **Feito na v15** (`getProjecaoParcelas`).

### 2.3 Orçamento por categoria (envelopes) ✅ (v12; sugestões/alerta v13)
Definir limite mensal por categoria e acompanhar consumo (barra: gasto/limite). Alerta ao estourar. Casa com o `% do salário` já existente. — **v12** orçamento; **v13** sugestões e alerta de estouro.

### 2.4 Lembretes de vencimento ✅ (v23)
Contas com data de vencimento → e-mail/notificação (trigger GAS + `MailApp`, ou bot Telegram) alguns dias antes. — **Feito na v23** (e-mail + gatilho diário).

---

## Nível 3 — Visão e inteligência (alto valor, esforço variável)

### 3.1 Dashboard com gráficos e tendências ✅ (v9; fix v10)
Evolução mensal de gastos, gasto por categoria (rosca), receita vs. despesa, saldo/patrimônio ao longo do tempo. (Ver plano visual #6.) — **v9** painel Análise (rosca + barras); **v10** correção das cores dos gráficos SVG.

### 3.2 Acerto de contas compartilhadas ("quem deve quem") ✅ (v17; rateio por lançamento v22)
Evoluir o "compartilhado + reembolso" atual para uma tela de acerto: total que a outra pessoa deve no mês. — **v17** painel Compartilhado (`getCompartilhados`); **v22** rateio próprio por lançamento. (Histórico de acertos/"marcar pago" ainda em aberto.)

### 3.3 Metas de economia ✅ (v27) · Regra 50/30/20 ✅ (v32)
Metas: definir e acompanhar economia. Regra 50/30/20: classificar gastos em Essencial/Desejo/Poupança. — **Metas na v27** (Onda 7.2); **50/30/20 na v32** (Onda 7.5).

### 3.4 Fatura de cartão (ciclo de fechamento) ✅ (v29)
Agrupar lançamentos de "Cartão" por ciclo de fechamento/vencimento, mostrando a fatura prevista de cada cartão — diferente do gasto por competência. — **Feito na v29** (Onda 7.4).

---

## Nível 4 — Entrada de dados sem fricção

### 4.1 Lançamento rápido por Telegram/WhatsApp bot ⏳ (7.8)
Bot que recebe "Mercado 85,90 Inter" e grava na planilha via webhook (GAS `doPost`). Lançar gasto na hora, sem abrir o app. — **Pendente** (Onda 7.8).

### 4.2 Importar extrato bancário (CSV/OFX) ✅ (v21 CSV; v24 OFX)
Upload do extrato do Inter/Itaú → parse → conciliação com o que já foi lançado (evita duplicar). — **v21** importar CSV (dedup); **v24** importar OFX (padrão dos apps de banco) + auto-categorização. Mais formatos (QIF/por banco) em **7.6**.

### 4.3 Anexar comprovante ⏳ (futuro)
Foto do recibo salva no Google Drive, link na transação. — **Pendente** (baixa prioridade).

---

## Nível 5 — Estrutura e confiança

### 5.1 Backup/exportação ✅ (v19 CSV; v24 XML; agendado v37)
Exportar todos os lançamentos; cópia automática periódica (trigger). — **v19** CSV no Drive; **v24** XML; **v37** backup **agendado** (gatilho semanal/mensal).

### 5.2 Multiusuário (casal) ⏳ (arquitetura)
Cada pessoa lança; visão individual e conjunta; integra com o acerto de contas (3.2). Depende do modelo de acesso/auth. — **Não cabe no Apps Script atual**; ver [planos alternativos](../arquitetura/PLANOS_ALTERNATIVOS.md) (Supabase).

### 5.3 Multi-moeda / conversão ⏳ (provavelmente desnecessário)
Só se houver gastos em outra moeda (ex.: assinaturas em USD). Provavelmente desnecessário hoje.

---

## Roadmap sugerido (por ondas)

| Onda | Entrega | Itens | Status |
|------|---------|-------|--------|
| 1 | Controle completo do básico | 1.1 editar/excluir, 1.2 receitas, 1.4 busca | ✅ |
| 2 | Categorização e visão | 1.3 categorias, 3.1 dashboard/gráficos | ✅ |
| 3 | Automação | 2.1 recorrentes (manual), 2.2 parcelas, 2.3 orçamento | ✅ |
| 4 | Compartilhado & lembretes | 3.2 acerto de contas, 2.4 lembretes | ✅ |
| 5 | Fricção zero | 4.2 importar extrato (OFX/CSV), 5.1 backup (CSV/XML) | ✅ |
| 6 | Mobile & UX | instalar na tela inicial (v24), recolher/expandir tudo (v24) | ✅ |
| **7** | **Próximos passos** | 7.1 recorrentes auto (v26) ✅ · 7.2 metas (v27) ✅ · 7.3 relatório anual (v28) ✅ · 7.4 fatura de cartão (v29) ✅ · 7.5 regra 50/30/20 (v32) ✅ · 7.6 QIF/CSV por banco (v35) ✅ · 7.7 backup agendado (v37) ✅ · 7.8 bot Telegram → em seguida | ⏳ |

## Onda 7 — próximos passos (em ordem de execução)

Ideias de futuro priorizadas para serem feitas **na sequência**. Cada item cabe na
arquitetura atual (Apps Script + Sheets), sem migração.

### 7.1 Recorrentes automáticos (gatilho) ✅ (v26)
**Feito.** Botão **⏰ Gerar automático** no painel Transações cria um gatilho mensal
(dia 1º, ~06h) que roda `gerarRecorrentes` no mês atual, idempotente (não duplica).
Backend: `verificarRecorrentes` + `instalar/remover/statusGatilhoRecorrentes`.
**Próximo da fila: 7.2 Metas de economia.**

### 7.2 Metas de economia ✅ (v27)
**Feito.** Painel **🏆 Metas de economia** com metas **mensais** ("guardar R$ X/mês")
e **totais** ("juntar R$ Y até MM/AAAA", com meses restantes). Progresso = receitas −
despesas (do mês ou acumulado desde a criação). Aba `Metas` + `getMetas`/`setMeta`/`deleteMeta`.
**Próximo da fila: 7.3 Relatório anual.**

### 7.3 Relatório anual ✅ (v28)
**Feito.** Painel **📅 Relatório anual** com seletor de ano: KPIs (receitas/despesas/saldo/média),
gráfico receitas × despesas por mês, despesas por categoria e maiores gastos do ano.
Backend: `getRelatorioAnual(ano)`. **Próximo da fila: 7.4 Fatura de cartão.**

### 7.4 Fatura de cartão (ciclo de fechamento) ✅ (v29)
**Feito.** Painel **💳 Fatura de cartão**: agrupa lançamentos "Cartão" pelo ciclo que fecha
no mês (janela fechamento anterior→atual), com data de vencimento por ciclo. Contas ganharam
dia de fechamento/vencimento. Backend: `getFaturaCartao`. **Próximo da fila: 7.5 Regra 50/30/20.**

### 7.5 Regra 50/30/20 ✅ (v32)
**Feito.** Painel **⚖️ Regra 50/30/20**: classificar categorias em Essencial/Desejo/Poupança
e comparar o mês com a meta (3 barras real × alvo). Aba `Classificacao` +
`getRegra503020`/`getClassificacao`/`setClasseCategoria`. **Próximo da fila: 7.6 QIF/CSV por banco.**

### 7.6 Importar mais formatos (QIF + CSV por banco) ✅ (v35)
**Feito.** Parser **QIF** + reconhecimento de **colunas por banco** no CSV (Data/Descrição/Valor
ou **Débito/Crédito** separados), com detecção automática. Reaproveita prévia → importar.
**Próximo da fila: 7.7 Backup agendado.**

### 7.7 Backup agendado ✅ (v37)
**Feito.** Gatilho **semanal/mensal** (`backupAgendado`) que roda o backup CSV no Drive.
Ativar/desativar + escolher a frequência no painel Backup; a frequência fica em
`PropertiesService`. **Próximo da fila: 7.8 Bot Telegram (lançar por mensagem).**

### 7.8 Lançamento rápido por bot (Telegram) ⭐⭐⭐ 🔨🔨🔨
Bot que recebe "Mercado 85,90 Inter" e grava via `doPost` (webhook). Fricção zero para
lançar na hora. É o item que mais melhora o uso no dia a dia sem abrir o app.

> **Ordem recomendada:** 7.1 → 7.2 → 7.3 (mais valor/menor risco), depois 7.4–7.8
> conforme necessidade. Itens que exigem **multiusuário/auth de verdade** ou **PWA
> instalável/offline** não cabem bem no Apps Script — para esses, ver os
> **[planos alternativos](../arquitetura/PLANOS_ALTERNATIVOS.md)**.

## Observações de viabilidade no Apps Script
- **Gatilhos de tempo** (2.1, 2.4, 5.1, 7.1, 7.7): nativos e gratuitos no GAS (`ScriptApp.newTrigger`).
- **E-mail** (2.4, 5.1, 7.7): `MailApp`/`GmailApp` prontos.
- **Bot/webhook** (4.1, 7.8): `doPost` do GAS funciona como webhook do Telegram.
- **Gráficos** (3.1, 7.3): via SVG inline no front, sem custo.
- **Multiusuário/auth robusta** (5.2) e **PWA instalável/offline**: é o que mais pressiona
  por migrar de arquitetura — ver [PLANOS_ALTERNATIVOS.md](../arquitetura/PLANOS_ALTERNATIVOS.md).

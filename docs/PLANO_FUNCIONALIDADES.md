# Plano de Funcionalidades — Soluções para um App de Finanças Pessoais

> **Status (jul/2026, v24):** ✅ Ondas 1–4 concluídas e boa parte da 5. Entregues:
> editar/excluir (1.1), receitas (1.2), categorias + auto-categorização (1.3), busca (1.4),
> recorrentes **manuais** (2.1), projeção de parcelas (2.2), orçamento com sugestões (2.3),
> lembretes de vencimento por e-mail (2.4), dashboard/gráficos (3.1), acerto de contas (3.2),
> importar extrato **OFX/CSV** (4.2), backup **CSV/XML** (5.1). Detalhes em [CHANGELOG.md](CHANGELOG.md).
>
> **Próximos passos em ordem:** ver **[Onda 7 — sequência de execução](#onda-7--próximos-passos-em-ordem-de-execução)** no fim deste documento.
> Para mudanças de arquitetura (PWA instalável de verdade, multiusuário, offline), ver os
> **[planos alternativos](PLANOS_ALTERNATIVOS.md)** além do [PLANO_MIGRACAO_PGLITE.md](PLANO_MIGRACAO_PGLITE.md).

Ideias de recursos que fazem sentido para o processo financeiro pessoal, considerando o que o app já faz (lançar gastos, resumo por conta, gastos compartilhados com reembolso, previsão de saldo). Priorizadas por **valor × esforço**.

Legenda: ⭐ valor · 🔨 esforço (mais martelos = mais trabalho)

---

## Nível 1 — Fundamentos que faltam (alto valor, baixo esforço)

### 1.1 Editar e excluir lançamentos ⭐⭐⭐ 🔨
Hoje só dá para inserir. Errou o valor? Não tem como corrigir sem abrir a planilha. Depende de ID por linha (ver plano de código A2/B2).

### 1.2 Registrar entradas (receitas), não só gastos ⭐⭐⭐ 🔨
Atualmente só despesas. Adicionar tipo "Entrada" (salário, extras, reembolsos recebidos) para um fluxo de caixa real, não só a soma de gastos.

### 1.3 Categorias ⭐⭐⭐ 🔨🔨
Campo Categoria (Moradia, Alimentação, Transporte, Assinaturas, Lazer...). Base para orçamento e gráficos. Sugerir categoria automaticamente pela descrição (memória do que já foi categorizado).

### 1.4 Busca e filtros na lista ⭐⭐ 🔨
Filtrar por conta, categoria, texto, faixa de valor. Essencial quando o mês tem muitos lançamentos.

---

## Nível 2 — Automação do processo financeiro (alto valor, médio esforço)

### 2.1 Lançamentos recorrentes automáticos ⭐⭐⭐ 🔨🔨
Hoje "Recorrente"/"Anual" são só rótulos. Criar um **gatilho de tempo** (trigger diário no GAS) que gera automaticamente as recorrências do mês (assinaturas, aluguel, etc.). Elimina digitação repetida.

### 2.2 Projeção de parcelas futuras ⭐⭐⭐ 🔨🔨
Ao lançar um "Parcelado 3/12", projetar as 9 parcelas restantes nos próximos meses (ou calcular o comprometimento futuro). Mostra quanto do orçamento já está "preso".

### 2.3 Orçamento por categoria (envelopes) ⭐⭐⭐ 🔨🔨
Definir limite mensal por categoria e acompanhar consumo (barra: gasto/limite). Alerta ao estourar. Casa com o `% do salário` já existente.

### 2.4 Lembretes de vencimento ⭐⭐ 🔨🔨
Contas com data de vencimento → e-mail/notificação (trigger GAS + `MailApp`, ou bot Telegram) alguns dias antes.

---

## Nível 3 — Visão e inteligência (alto valor, esforço variável)

### 3.1 Dashboard com gráficos e tendências ⭐⭐⭐ 🔨🔨
Evolução mensal de gastos, gasto por categoria (rosca), receita vs. despesa, saldo/patrimônio ao longo do tempo. (Ver plano visual #6.)

### 3.2 Acerto de contas compartilhadas ("quem deve quem") ⭐⭐⭐ 🔨🔨
Evoluir o "compartilhado + reembolso" atual para uma tela de acerto: total que a outra pessoa deve no mês, histórico de acertos, marcar como "pago". Muito útil para casal/divisão.

### 3.3 Regra 50/30/20 e metas ⭐⭐ 🔨🔨
Classificar gastos em Essencial/Desejo/Poupança e comparar com metas. Definir metas de economia e acompanhar progresso.

### 3.4 Fatura de cartão (ciclo de fechamento) ⭐⭐⭐ 🔨🔨🔨
Agrupar lançamentos de "Cartão" por ciclo de fechamento/vencimento, mostrando a fatura prevista de cada cartão — diferente do gasto por competência.

---

## Nível 4 — Entrada de dados sem fricção

### 4.1 Lançamento rápido por Telegram/WhatsApp bot ⭐⭐⭐ 🔨🔨🔨
Bot que recebe "Mercado 85,90 Inter" e grava na planilha via webhook (GAS `doPost`). Lançar gasto na hora, sem abrir o app.

### 4.2 Importar extrato bancário (CSV/OFX) ⭐⭐ 🔨🔨🔨
Upload do extrato do Inter/Itaú → parse → conciliação com o que já foi lançado (evita duplicar). Grande economia de tempo.

### 4.3 Anexar comprovante ⭐ 🔨🔨
Foto do recibo salva no Google Drive, link na transação.

---

## Nível 5 — Estrutura e confiança

### 5.1 Backup/exportação ⭐⭐ 🔨
Exportar mês/ano em CSV/PDF; cópia automática periódica da planilha (trigger).

### 5.2 Multiusuário (casal) ⭐⭐ 🔨🔨🔨
Cada pessoa lança; visão individual e conjunta; integra com o acerto de contas (3.2). Depende do modelo de acesso/auth (ver plano de código D1).

### 5.3 Multi-moeda / conversão ⭐ 🔨🔨
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
| 6 | Mobile & UX | instalar na tela inicial, recolher/expandir tudo | ✅ |
| **7** | **Próximos passos** | ver seção abaixo (em ordem) | ⏳ |

## Onda 7 — próximos passos (em ordem de execução)

Ideias de futuro priorizadas para serem feitas **na sequência**. Cada item cabe na
arquitetura atual (Apps Script + Sheets), sem migração.

### 7.1 Recorrentes automáticos (gatilho) ⭐⭐⭐ 🔨🔨
Hoje os recorrentes são gerados por um botão (manual). Criar um **gatilho de tempo**
mensal (`ScriptApp.newTrigger`) que roda `gerarRecorrentes` no dia 1º de cada mês,
com o mesmo painel de ativar/desativar dos lembretes. Idempotente (não duplica).
*Reaproveita:* `gerarRecorrentes`, a UI de gatilho dos Lembretes.

### 7.2 Metas de economia ⭐⭐⭐ 🔨🔨
Definir metas (ex.: "guardar R$ 500/mês" ou "juntar R$ 6.000 até dez"). Acompanhar o
progresso com barra e projeção (usa receitas − despesas do mês). Nova aba `Metas`
(`getMetas`/`setMeta`/`deleteMeta`) e um painel com barra de progresso.

### 7.3 Relatório anual ⭐⭐⭐ 🔨🔨
Visão do ano: total por mês, por categoria, receita × despesa, maiores gastos, média
mensal. Reaproveita `getEvolucao`/`getPorCategoria` estendidos para 12 meses; renderiza
com os gráficos SVG existentes. Opção de exportar o resumo (CSV/XML) via backup.

### 7.4 Fatura de cartão (ciclo de fechamento) ⭐⭐⭐ 🔨🔨🔨
Agrupar lançamentos de "Cartão" por ciclo de fechamento/vencimento e mostrar a fatura
prevista de cada cartão (por vencimento, não por competência). Precisa guardar
fechamento/vencimento por conta-cartão.

### 7.5 Regra 50/30/20 ⭐⭐ 🔨🔨
Classificar cada categoria em Essencial / Desejo / Poupança e comparar o mês com a
meta 50/30/20. Um mapa categoria→classe + um painel de barras.

### 7.6 Importar mais formatos (QIF + CSV por banco) ⭐⭐ 🔨🔨
Complementar o OFX/CSV atuais: parser **QIF** e **mapas de colunas por banco** (cada
banco nomeia as colunas diferente) com detecção automática. Reaproveita o fluxo de
prévia → importar já existente.

### 7.7 Backup agendado ⭐⭐ 🔨
Gatilho semanal/mensal que roda `exportarBackup`/`exportarBackupXML` e guarda no Drive
(ou envia por e-mail). Reaproveita as funções de backup e a UI de gatilho.

### 7.8 Lançamento rápido por bot (Telegram) ⭐⭐⭐ 🔨🔨🔨
Bot que recebe "Mercado 85,90 Inter" e grava via `doPost` (webhook). Fricção zero para
lançar na hora. É o item que mais melhora o uso no dia a dia sem abrir o app.

> **Ordem recomendada:** 7.1 → 7.2 → 7.3 (mais valor/menor risco), depois 7.4–7.8
> conforme necessidade. Itens que exigem **multiusuário/auth de verdade** ou **PWA
> instalável/offline** não cabem bem no Apps Script — para esses, ver os
> **[planos alternativos](PLANOS_ALTERNATIVOS.md)**.

## Observações de viabilidade no Apps Script
- **Gatilhos de tempo** (2.1, 2.4, 5.1, 7.1, 7.7): nativos e gratuitos no GAS (`ScriptApp.newTrigger`).
- **E-mail** (2.4, 5.1, 7.7): `MailApp`/`GmailApp` prontos.
- **Bot/webhook** (4.1, 7.8): `doPost` do GAS funciona como webhook do Telegram.
- **Gráficos** (3.1, 7.3): via SVG inline no front, sem custo.
- **Multiusuário/auth robusta** (5.2) e **PWA instalável/offline**: é o que mais pressiona
  por migrar de arquitetura — ver [PLANOS_ALTERNATIVOS.md](PLANOS_ALTERNATIVOS.md).

# Plano de Features Financeiras — próximas ondas (arquitetura atual)

> Recursos voltados a **finanças pessoais** que cabem no que já existe: **Google Apps
> Script + Google Sheets**, sem serviços externos além do que a plataforma oferece
> (`ScriptApp` gatilhos, `MailApp`, `UrlFetchApp`, `DriveApp`, SVG inline). Continuação do
> [PLANO_FUNCIONALIDADES.md](PLANO_FUNCIONALIDADES.md) (Ondas 1–7 concluídas).

Legenda: ⭐ valor · 🔨 esforço · 🔁 reaproveita algo que já existe.

---

## Nível A — Patrimônio, dívidas e reserva

### A1. Patrimônio líquido (net worth) ⭐⭐⭐ 🔨🔨
Aba `Patrimonio` (Ativos e Passivos: nome, tipo, valor, mês). Tela com **patrimônio =
ativos − passivos** e **evolução mês a mês** (gráfico de linha SVG). Complementa o saldo
por conta com uma visão de riqueza total.

### A2. Dívidas e financiamentos ⭐⭐⭐ 🔨🔨🔨
Aba `Dividas` (descrição, saldo devedor, taxa % a.m., parcela, dia). Mostra **quanto falta**,
**juros já pagos/estimados** e um **cronograma de amortização** (tabela + gráfico do saldo
caindo). Pode gerar a parcela como recorrente. 🔁 usa a infra de recorrentes.

### A3. Reserva de emergência ⭐⭐⭐ 🔨 🔁
Meta especial = **N meses de despesa média** (usa a média mensal já calculada). Barra de
progresso + "faltam X meses". 🔁 estende o painel de Metas.

### A4. Envelopes / caixinhas para gastos anuais ⭐⭐ 🔨🔨
Guardar todo mês uma fração de gastos anuais (IPVA, seguro, presentes) — "sinking funds".
Aba `Caixinhas` com meta anual e aporte mensal sugerido. 🔁 parecido com Metas.

---

## Nível B — Análise e inteligência (só leitura, baixo risco)

### B1. Comparativo mês a mês / ano anterior ⭐⭐⭐ 🔨🔨 🔁
Variação por categoria vs. mês anterior e vs. **mesmo mês do ano passado** (↑/↓ %).
🔁 estende `getRelatorioAnual`/`getPorCategoria`.

### B2. Alertas de gasto incomum ⭐⭐⭐ 🔨🔨 🔁
Ao fechar/rodar, detecta categorias **muito acima da média** dos últimos meses e avisa
(no app e/ou por e-mail). 🔁 usa a infra de e-mail dos Lembretes + a média já calculada.

### B3. Radar de assinaturas / recorrências ⭐⭐⭐ 🔨🔨
Detecta cobranças que se repetem mês a mês (mesma descrição/valor) e mostra o **total de
assinaturas** e "quanto some por ano". Ajuda a cortar gasto invisível.

### B4. Previsão de fluxo de caixa ⭐⭐⭐ 🔨🔨 🔁
Projeta o **saldo dos próximos meses** somando recorrentes + parcelas futuras + salário −
médias. 🔁 usa `getProjecaoParcelas` + recorrentes + salário.

### B5. Ritmo de gasto do mês (burn rate) ⭐⭐ 🔨 🔁
"Você gastou R$ X em N dias — no ritmo atual, fecha o mês em R$ Y" vs. orçamento. Média
diária e projeção linear do mês corrente.

### B6. Relatório mensal por e-mail ⭐⭐ 🔨 🔁
Gatilho no fim do mês manda um **resumo por e-mail** (totais, top categorias, % do salário).
🔁 usa `MailApp` + gatilho, como os Lembretes.

---

## Nível C — Entrada de dados sem fricção

### C1. Regras de auto-categorização personalizáveis ⭐⭐⭐ 🔨🔨
Aba `Regras` (contém "X" → categoria "Y", conta, compartilhado). O usuário cria as suas,
usadas na importação e no bot. 🔁 amplia a auto-categorização atual (hoje é fixa no código).

### C2. Dividir um lançamento em várias categorias ⭐⭐ 🔨🔨
Ex.: 1 compra de mercado → parte "Alimentação", parte "Limpeza". Split que soma o total.

### C3. Etiquetas (tags) além da categoria ⭐⭐ 🔨🔨
Campo `Tags` (#viagem, #trabalho) para cortes transversais (um relatório por tag). Coluna
nova auto-criada.

### C4. Lançamento em lote ⭐ 🔨
Colar/adicionar várias linhas de uma vez no formulário (além do import de extrato).

---

## Nível D — Planejamento e cartão

### D1. Limite do cartão + alerta ⭐⭐⭐ 🔨🔨 🔁
Guardar o **limite** de cada cartão (na aba Saldos) e mostrar **% usado** da fatura;
alertar ao se aproximar. 🔁 usa a Fatura de cartão já existente.

### D2. Orçamento anual por categoria ⭐⭐ 🔨🔨 🔁
Além do limite mensal, um teto **anual** (para categorias sazonais). 🔁 estende Orçamentos.

### D3. Simulador "e se" ⭐⭐ 🔨🔨
"Se eu cortar X% de Lazer, sobra Y por mês / Z no ano." Cálculo no cliente sobre os dados
do mês. Ajuda a decidir cortes.

### D4. Multi-moeda (cotação) ⭐ 🔨🔨
Para gastos em outra moeda (assinaturas em USD): buscar cotação por `UrlFetchApp` (API
pública) e converter. Só se houver essa necessidade.

---

## Ordem sugerida (Onda 8+)

| Onda | Tema | Itens |
|------|------|-------|
| **8** | Inteligência (só leitura, rápido) | B5 burn rate → B1 comparativo → B3 assinaturas → B2 alertas |
| **9** | Patrimônio & reserva | A3 reserva → A1 patrimônio → A2 dívidas |
| **10** | Entrada flexível | C1 regras de categoria → C3 tags → C2 split |
| **11** | Planejamento & cartão | D1 limite do cartão → B4 fluxo de caixa → D3 simulador |
| — | Conforme necessidade | A4 caixinhas · B6 relatório por e-mail · C4 lote · D2 anual · D4 multi-moeda |

**Por que essa ordem:** a Onda 8 é **puro cálculo/leitura** sobre dados que já existem
(valor alto, risco baixo, sem novas abas). Depois, patrimônio/dívidas trazem a visão que
mais falta hoje. As regras de categoria (C1) melhoram tudo que envolve importação/bot.

## Viabilidade no Apps Script (tudo cabe)
- **Cálculos/gráficos**: SVG inline + funções de leitura, como o resto do app.
- **Novas abas** (`Patrimonio`, `Dividas`, `Regras`, `Caixinhas`): mesmo padrão de CRUD +
  `criarEstruturaPlanilha`.
- **Alertas/relatórios por e-mail** (B2, B6): `MailApp` + gatilho, como os Lembretes.
- **Cotação** (D4): `UrlFetchApp`, como o bot do Telegram.
- **Fora do escopo atual** (exigem migração — ver [arquitetura/](../arquitetura/)):
  multiusuário/casal com login, PWA instalável offline, sincronização entre dispositivos.
